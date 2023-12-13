import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController";
import Config from "../utils/Config";
import {Auth, translate_v2, google} from "googleapis";
import * as jwt from 'jsonwebtoken';
import { readFileSync } from "fs";
import Logger from "../utils/Logger";

/**
* Created : 21/11/2023 
*/
export default class GoogleController extends AbstractController {

	private _translater!:translate_v2.Translate;

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

		this.preloadEarlyDonors();
		
		//Authenticate with foofle API for translation API
		const auth: Auth.GoogleAuth = new Auth.GoogleAuth({
			keyFilename: Config.CREDENTIALS_ROOT + Config.credentials.google_key,
			scopes:["https://www.googleapis.com/auth/cloud-platform"],
		});
		const json = JSON.parse(readFileSync(Config.CREDENTIALS_ROOT + Config.credentials.google_key, "utf-8"));
		auth.jsonContent = json;
		//Create translation instance
		this._translater = new translate_v2.Translate({auth});

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
		const credentials = Config.YOUTUBE_CREDENTIALS;

		if(!credentials) {
			response.header('Content-Type', 'application/json');
			response.status(500);
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
			response.status(500);
			response.send(JSON.stringify({success:false, error:"Given redirect URI is invalid", errorCode:"INVALID_REDIRECT_URI"}));
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

		const {credentials: token} = await oauth2Client.refreshAccessToken();

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

		const params:any = request.query;

		try {

			const res = await this._translater.translations.translate({
				requestBody:{
					format:"text",
					source:params.langSource,
					target:params.langTarget,
					q: [params.text],
				}
			});
			//Google typing is wrong. Fix that mistake with this dirty typing
			const data = res.data as {data:translate_v2.Schema$TranslationsListResponse};
			if(data.data.translations) {
				const translation = data.data.translations[0].translatedText;
				if(translation == params.text) {
					Logger.success("Translate success with no change:", translation);
					response.header('Content-Type', 'application/json');
					response.status(204);
					response.send(JSON.stringify({success:true, data:{translation:""}}));
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
			}

		}catch(error) {
			Logger.error("Translate failed for language "+params.langSource);
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false, error:"translation failed", errorCode:"TRANSLATE_FAIL"}));
		};
	}
}