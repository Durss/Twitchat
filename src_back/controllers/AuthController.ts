import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Logger from '../utils/Logger.js';
import * as URL from "url";
import Config from '../utils/Config.js';
import jwt, { JwtPayload } from 'jsonwebtoken';
import fetch from "node-fetch";
import AbstractController from "./AbstractController.js";

/**
* Created : 13/03/2022 
*/
export default class AuthController extends AbstractController {

	private pendingDataSharingAuth:{[jwt:string]:boolean} = {}
	private usedCSRFTokens:{[jwt:string]:boolean} = {}
	
	constructor(public server:FastifyInstance) {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public async initialize():Promise<void> {
		this.server.get('/api/auth/twitch', async (request, response) => await this.twitchAuth(request, response));
		this.server.get('/api/auth/twitch/refreshtoken', async (request, response) => await this.refreshToken(request, response));
		this.server.get('/api/auth/CSRFToken', async (request, response) => await this.getCSRFToken(request, response));
		this.server.post('/api/auth/CSRFToken', async (request, response) => await this.validateCSRFToken(request, response));
		this.server.post('/api/auth/validateDataShare', async (request, response) => await this.validateDataShare(request, response));
		this.preloadData();
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Generates an access token from an auth code for a Twitch session
	 * 
	 * @param {*} request 
	 * @param {*} response 
	 */
	private async twitchAuth(request:FastifyRequest, response:FastifyReply) {
		const params = URL.parse(request.url, true).query;
		
		let url = "https://id.twitch.tv/oauth2/token";
		url += "?client_id="+Config.credentials.twitch_client_id;
		url += "&client_secret="+Config.credentials.twitch_client_secret;
		url += "&code="+params.code;
		url += "&grant_type=authorization_code";
		url += "&redirect_uri="+Config.credentials.twitch_redirect_uri;
		
		let json;
		try {
			const res = await fetch(url, {method:"POST"});
			json = await res.json();
		}catch(error) {
			Logger.error("Token generation failed");
			Logger.error(error);

			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:'error', success:false}));
			return;
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify(json));
	}

	/**
	 * Verifies a CSRF token to secure twitch authentication
	 * 
	 * @param {*} request 
	 * @param {*} response 
	 */
	private async validateCSRFToken(request:FastifyRequest, response:FastifyReply, respondOnSuccess:boolean = true):Promise<false|CSRFToken> {
		//Verifies a CSRF token
		const params:any = request.body;
		const token = params.token;
		
		//Check if token was already used
		if(this.usedCSRFTokens[token]) {
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send(JSON.stringify({success:false, message:"CSRF token already used", errorCode:"TOKEN_ALREADY_USED"}));
			return false;
		}
		
		const result = jwt.verify(token, Config.credentials.csrf_key) as CSRFToken;
		if(result) {
			//Token valid only for 5 minutes
			if(result.date > Date.now() - 5*60*1000) {
				//Mark token as used immediately
				this.usedCSRFTokens[token] = true;
				//Cleanup used token after expiration
				setTimeout(() => {
					delete this.usedCSRFTokens[token];
					delete this.pendingDataSharingAuth[token];
				}, 5*60*1000);
				
				const jsonRes:{success:boolean, uidShare?:string} = {success:true};
				//If in the process of linking two accounts together, return ref account ID
				if(result.uidShare && this.pendingDataSharingAuth[token]) {
					jsonRes.uidShare = result.uidShare;
				}
				if(!respondOnSuccess) return result;
				response.header('Content-Type', 'application/json');
				response.status(200);
				response.send(JSON.stringify(jsonRes));
			}else{
				//Token expired
				response.header('Content-Type', 'application/json');
				response.status(200);
				response.send(JSON.stringify({success:false, message:"CSRF token expired, please try again"}));
			}
		}else{
			//Invalid token
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:false, message:"Invalid CSRF token"}));
		}

		return false;
	}

	/**
	 * Generates a CSRF token to secure twitch authentication
	 * 
	 * @param {*} request 
	 * @param {*} response 
	 */
	private async getCSRFToken(request:FastifyRequest, response:FastifyReply) {
		const params = URL.parse(request.url, true).query;
		const tokenData:CSRFToken = {date:Date.now()};

		//If asking to share data with another account, store ref account to token
		if(params.withRef) {
			const user = await super.twitchUserGuard(request, response);
			if(!user) return;
			tokenData.uidShare = user.user_id;
		}

		//Generate a token
		const token = jwt.sign(tokenData, Config.credentials.csrf_key);

		//remember there's a data share flow initialized
		if(params.withRef) {
			this.pendingDataSharingAuth[token] = true;
		}
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({token}));
	}

	/**
	 * Frefresh a twitch access token
	 * 
	 * @param {*} request 
	 * @param {*} response 
	 */
	private async refreshToken(request:FastifyRequest, response:FastifyReply, logUser:boolean = false) {
		const params = URL.parse(request.url, true).query;
		//Someone's spamming endpoint with "undefined" token.
		//I suspect them messing up with my API.
		if(params.token === "undefined") {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:'error', success:false}));
			return;
		}
		
		let url = "https://id.twitch.tv/oauth2/token";
		url += "?client_id="+Config.credentials.twitch_client_id;
		url += "&client_secret="+Config.credentials.twitch_client_secret;
		url += "&refresh_token="+params.token;
		url += "&grant_type=refresh_token";
		
		let json;
		try {
			const res = await fetch(url, {method:"POST"});
			json = await res.json();
		}catch(error) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:'error', success:false}));
			return;
		}

		if(logUser) {
			Logger.info("User using old endpooint");
			console.log(json.access_token);
		}
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify(json));
	}

	/**
	 * Validate data sharing between 2 users
	 * 
	 * This would be better placed in UserController but i need to call "validateCSRFToken"
	 * which would be annoying to do from the other controller 😬
	 * 
	 * @param {*} request 
	 * @param {*} response 
	 */
	private async validateDataShare(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response);
		if(!user) return;

		//Verifies a CSRF token
		const params:any = request.body;
		const csrf = params.token;
		if(this.pendingDataSharingAuth[csrf]) {
			const token = await this.validateCSRFToken(request, response, false);
			if(token !== false && token.uidShare && token.uidShare != user.user_id) {
				//Enable data sharing
				const result = super.enableUserDataSharing(token.uidShare, user.user_id);
				if(result === true) {
					response.header('Content-Type', 'application/json');
					response.status(200);
					response.send(JSON.stringify({success:true, sharer:token.uidShare}));
					return;
				}else{
					response.header('Content-Type', 'application/json');
					response.status(409);
					response.send(JSON.stringify({success:false, errorCode:"CROSS_LINK", error:"Cannot cross link 2 accounts"}));
					return;
				}
			}
		}

		//Invalid token or wrong user association
		response.header('Content-Type', 'application/json');
		response.status(404);
		response.send(JSON.stringify({success:false, errorCode:"INVALID_CSRF", error:"Invalid CSRF token"}));
	}
}

interface CSRFToken extends JwtPayload {date:number, uidShare?:string}