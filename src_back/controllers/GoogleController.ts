import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { readFileSync } from "fs";
import { Auth, google, translate_v2 } from "googleapis";
import jwt from 'jsonwebtoken';
import Config from "../utils/Config.js";
import Logger from "../utils/Logger.js";
import TwitchUtils from "../utils/TwitchUtils.js";
import AbstractController from "./AbstractController.js";

/**
* Created : 21/11/2023
*/
export default class GoogleController extends AbstractController {

	private _translater!:translate_v2.Translate;
	private _translationCache = new Map<string, string>()
	private _userTotranslations:{[key:string]:{date:number, count:number}} = {}
	private _allowedLanguages:string[] = ["af", "sq", "am", "ar", "hy", "as", "ay", "az", "bm", "eu", "be", "bn", "bho", "bs", "bg", "ca", "ceb", "zh-CN", "zh", "zh-TW", "co", "hr", "cs", "da", "dv", "doi", "nl", "en", "eo", "et", "ee", "fil", "fi", "fr", "fy", "gl", "ka", "de", "el", "gn", "gu", "ht", "ha", "haw", "he", "iw", "hi", "hmn", "hu", "is", "ig", "ilo", "id", "ga", "it", "ja", "jv", "jw", "kn", "kk", "km", "rw", "gom", "ko", "kri", "ku", "ckb", "ky", "lo", "la", "lv", "ln", "lt", "lg", "lb", "mk", "mai", "mg", "ms", "ml", "mt", "mi", "mr", "mni-Mtei", "lus", "mn", "my", "ne", "no", "ny", "or", "om", "ps", "fa", "pl", "pt", "pa", "qu", "ro", "ru", "sm", "sa", "gd", "nso", "sr", "st", "sn", "sd", "si", "sk", "sl", "so", "es", "su", "sw", "sv", "tl", "tg", "ta", "tt", "te", "th", "ti", "ts", "tr", "tk", "ak", "uk", "ur", "ug", "uz", "vi", "cy", "xh", "yi", "yo", "zu"];
	private _allowedLanguagesMap:{[key:string]:boolean} = {};


	constructor(public server: FastifyInstance) {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/



	/******************
	* PUBLIC METHODS *
	******************/
	public async initialize(): Promise<void> {
		this.server.get('/api/youtube/oauthURL', async (request, response) => await this.getYoutubeOauthURL(request, response));
		this.server.get('/api/google/translate', async (request, response) => await this.getTranslation(request, response));
		this.server.post('/api/youtube/authenticate', async (request, response) => await this.postYoutubeAuthenticate(request, response));
		this.server.post('/api/youtube/refreshtoken', async (request, response) => await this.postYoutubeRefreshToken(request, response));

		this.preloadData();

		if(Config.credentials.google_key) {
			//Authenticate with google API for translation API
			const auth: Auth.GoogleAuth = new Auth.GoogleAuth({
				keyFilename: Config.CREDENTIALS_ROOT + Config.credentials.google_key,
				scopes:["https://www.googleapis.com/auth/cloud-platform"],
			});
			const json = JSON.parse(readFileSync(Config.CREDENTIALS_ROOT + Config.credentials.google_key, "utf-8"));
			auth.jsonContent = json;
			//Create translation instance
			this._translater = new translate_v2.Translate({auth});
		}

		//Build lang hashmap
		this._allowedLanguages.forEach(lang => {
			this._allowedLanguagesMap[lang] = true;
		});

		// this._translater.translations.translate({
		// 	requestBody:{
		// 		format:"text",
		// 		source:"en",
		// 		target:"fr",
		// 		q: ["Dr. Watson, please discard your trash."],
		// 	}
		// }).then(res => {
		// 	//Google typing is wrong. Fix that mistake with this dirty typing
		// 	const data = res.data as {data:translate_v2.Schema$TranslationsListResponse};
		// 	if(data.data.translations) {
		// 		console.log(data.data.translations[0].translatedText);
		// 	}
		// });
	}




	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Get oAuth URL for youtube
	 * @param request
	 * @param response
	 */
	private async getYoutubeOauthURL(request: FastifyRequest, response: FastifyReply): Promise<void> {
		if(!this.premiumGuard(request, response)) return;

		const credentials = Config.YOUTUBE_CREDENTIALS;

		if(!credentials) {
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send(JSON.stringify({success:false, error:"youtube credentials are missing", errorCode:"MISSING_CREDENTIALS"}));
			return;
		}

		const redirectURI = (request.query as any).redirectURI;
		const grantModerate = (request.query as any).grantModerate;
		let scope = Config.credentials.youtube_scopes;

		if(grantModerate != "true") {
			scope = scope.filter(v=>v != "https://www.googleapis.com/auth/youtube.force-ssl");
		}

		if(!credentials.redirect_uris.includes(redirectURI)) {
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send(JSON.stringify({success:false, error:"Given redirect URI is invalid", errorCode:"INVALID_REDIRECT_URI"}));
			return;
		}

		// Generate a url that asks permissions for the Drive activity scope
		const oauth2Client = new google.auth.OAuth2({
			clientId:credentials.client_id,
			clientSecret:credentials.client_secret,
			redirectUri:credentials.redirect_uris[0],
		});
		const authorizationUrl = oauth2Client.generateAuthUrl({
			// 'online' (default) or 'offline' (gets refresh_token)
			access_type: 'offline',
			scope,
			include_granted_scopes: false,
			state:jwt.sign({date:Date.now()}, Config.credentials.csrf_key),
			prompt:"consent",
			redirect_uri:redirectURI,
			client_id:credentials.client_id,
			response_type:"code"
		});

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:{url:authorizationUrl}}));
	}

	/**
	 * Authenticates a youtube user
	 * @param request
	 * @param response
	 */
	private async postYoutubeAuthenticate(request: FastifyRequest, response: FastifyReply): Promise<void> {
		if(!this.premiumGuard(request, response)) return;

		const credentials = Config.YOUTUBE_CREDENTIALS;
		const params:any = request.body;

		if(!credentials) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false, error:"youtube credentials are missing", errorCode:"MISSING_CREDENTIALS"}));
			return;
		}

		const redirectURI = params.redirectURI;

		if(!credentials.redirect_uris.includes(redirectURI)) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false, error:"Given redirect URI is invalid", errorCode:"INVALID_REDIRECT_URI"}));
		}

		// Generate a url that asks permissions for the Drive activity scope
		const oauth2Client = new google.auth.OAuth2({
			clientId:credentials.client_id,
			clientSecret:credentials.client_secret,
			redirectUri:credentials.redirect_uris[0],
		});
		const {tokens: token} = await oauth2Client.getToken({
			code:params.code,
			client_id:credentials.client_id,
			redirect_uri:redirectURI,
		});

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:{token}}));
	}

	/**
	 * Refreshes youtube token
	 * @param request
	 * @param response
	 */
	private async postYoutubeRefreshToken(request: FastifyRequest, response: FastifyReply): Promise<void> {
		if(!this.premiumGuard(request, response)) return;

		const credentials = Config.YOUTUBE_CREDENTIALS;
		const params:any = request.body;

		if(!credentials) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false, error:"youtube credentials are missing", errorCode:"MISSING_CREDENTIALS"}));
			return;
		}

		const redirectURI = params.redirectURI;
		if(!credentials.redirect_uris.includes(redirectURI)) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false, error:"Given redirect URI is invalid", errorCode:"INVALID_REDIRECT_URI"}));
			return;
		}

		const oauth2Client = new google.auth.OAuth2({
			clientId:credentials.client_id,
			clientSecret:credentials.client_secret,
			redirectUri:redirectURI,
		});
		oauth2Client.setCredentials({
			access_token:params.accessToken,
			expiry_date:params.expiryDate,
			refresh_token:params.refreshToken,
			token_type:params.tokenType,
			scope:params.scope,
		})

		let token:any = {};
		try {
			const res = await oauth2Client.refreshAccessToken();
			token = res.credentials;
		}catch(error) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false, error:"invalid credentials", errorCode:"INVALID_CREDENTIALS"}));
			return;
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:{token}}));
	}

	/**
	 * Request for a text translation
	 * @param request
	 * @param response
	 */
	private async getTranslation(request: FastifyRequest, response: FastifyReply): Promise<void> {
		//Check if user is premium
		if(!await this.premiumGuard(request, response)) return;

		const params = request.query as {text:string, langSource:string, langTarget:string};
		const currentDate = new Date();
		currentDate.setHours(0, 0, 0, 0);
		const dateTs = currentDate.getTime();

		const userInfo = (await TwitchUtils.getUserFromToken(request.headers.authorization || ""))!;

		if(this._translationCache.has(params.text)) {
			const translation = this._translationCache.get(params.text)!;
			Logger.info("Load translation from cache:", translation);
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, data:{translation}}));
		}

		if(!this._userTotranslations[userInfo.user_id]) {
			this._userTotranslations[userInfo.user_id] = {
				count:0,
				date:dateTs,
			}
		}

		if(this._userTotranslations[userInfo.user_id]!.date == dateTs
		&& this._userTotranslations[userInfo.user_id]!.count >= Config.maxTranslationsPerDay) {
			Logger.warn("Maximum daily translations reached for "+userInfo.login+" #"+userInfo.user_id+" with "+this._userTotranslations[userInfo.user_id]!.count+" translations");
			response.header('Content-Type', 'application/json');
			response.status(429);
			response.send(JSON.stringify({success:false, error:"translation failed", errorCode:"QUOTA_REACHED"}));
			return;
		}

		if(params.langSource == params.langTarget) {
			Logger.info("Translation impossible because of same language target and source:", params.langSource);
			response.header('Content-Type', 'application/json');
			response.status(204);
			response.send(JSON.stringify({success:true, data:{translation:""}}));
			return;
		}

		//Check if given languages are supported
		if(this._allowedLanguagesMap[params.langSource] !== true
		|| this._allowedLanguagesMap[params.langTarget] !== true) {
			Logger.info("Translation impossible because of unsupported language "+params.langSource+" or "+params.langTarget);
			response.header('Content-Type', 'application/json');
			response.status(204);
			response.send(JSON.stringify({success:true, data:{translation:""}}));
			return;
		}

		this._userTotranslations[userInfo.user_id]!.count ++;

		try {

			const res = await this._translater.translations.translate({
				requestBody:{
					format:"text",
					source:params.langSource,
					target:params.langTarget,
					q: [params.text],
				}
			});
			//Google typing is wrong. Fixing that mistake with this dirty typing
			const data = res.data as {data:translate_v2.Schema$TranslationsListResponse};
			if(data.data.translations) {
				const translation = data.data.translations[0]!.translatedText ?? "";
				if(translation == params.text) {
					Logger.success("Translate success with no change:", translation);
					response.header('Content-Type', 'application/json');
					response.status(204);
					response.send(JSON.stringify({success:true, data:{translation:""}}));
					this._translationCache.set(params.text, translation);
					setTimeout(() => {
						this._translationCache.delete(params.text);
					}, 2147483647 ); //Cache for as much time as node allows (about 24 days)
				}else{
					Logger.success("Translate success:", translation);
					response.header('Content-Type', 'application/json');
					response.status(200);
					response.send(JSON.stringify({success:true, data:{translation}}));
				}
			}else{
				Logger.error("Translate failed");
				response.header('Content-Type', 'application/json');
				response.status(204);
				response.send(JSON.stringify({success:true, data:{translation:""}}));
				this._translationCache.set(params.text, "");
			}

		}catch(error) {
			this._translationCache.set(params.text, "");
			Logger.error("Translate failed for language "+params.langSource);
			console.log(error);
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false, error:"translation failed", errorCode:"TRANSLATE_FAIL"}));
		}
	}
}
