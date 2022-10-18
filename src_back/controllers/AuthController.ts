import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Logger from '../utils/Logger';
import * as URL from "url";
import Config from '../utils/Config';
import * as jwt from 'jsonwebtoken';

/**
* Created : 13/03/2022 
*/
export default class AuthController {

	
	constructor(public server:FastifyInstance) {
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	public async initialize():Promise<void> {
		this.server.get('/api/auth/twitch', async (request, response) => await this.twitchAuth(request, response));
		this.server.get('/api/auth/CSRFToken', async (request, response) => await this.getCSRFToken(request, response));
		this.server.post('/api/auth/CSRFToken', async (request, response) => await this.setCSRFToken(request, response));
		this.server.get('/api/auth/twitch/refreshtoken', async (request, response) => await this.refreshToken(request, response));
	}

	/**
	 * Generates an access token from an auth code for a Twitch session
	 * 
	 * @param {*} request 
	 * @param {*} response 
	 */
	async twitchAuth(request:FastifyRequest, response:FastifyReply) {
		let params = URL.parse(request.url, true).query;
		
		let url = "https://id.twitch.tv/oauth2/token";
		url += "?client_id="+Config.credentials.twitch_client_id;
		url += "&client_secret="+Config.credentials.twitch_client_secret;
		url += "&code="+params.code;
		url += "&grant_type=authorization_code";
		url += "&redirect_uri="+Config.credentials.twitch_redirect_uri;
		
		let json;
		try {
			let res = await fetch(url, {method:"POST"});
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
	private async setCSRFToken(request:FastifyRequest, response:FastifyReply) {
		//Verifies a CSRF token
		const params = URL.parse(request.url, true).query;
		const result = jwt.verify(params.token, Config.credentials.csrf_key);
		if(result) {
			//Token valid only for 5 minutes
			if(result.date > Date.now() - 5*60*1000) {
				response.header('Content-Type', 'application/json');
				response.status(200);
				response.send(JSON.stringify({success:true}));
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
	}

	/**
	 * Generates a CSRF token to secure twitch authentication
	 * 
	 * @param {*} request 
	 * @param {*} response 
	 */
	private async getCSRFToken(request:FastifyRequest, response:FastifyReply) {
		//Generate a token
		const token = jwt.sign({date:Date.now()}, Config.credentials.csrf_key);
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
	private async refreshToken(request:FastifyRequest, response:FastifyReply) {
		let params = URL.parse(request.url, true).query;
		
		let url = "https://id.twitch.tv/oauth2/token";
		url += "?client_id="+Config.credentials.twitch_client_id;
		url += "&client_secret="+Config.credentials.twitch_client_secret;
		url += "&refresh_token="+params.token;
		url += "&grant_type=refresh_token";
		
		let json;
		try {
			let res = await fetch(url, {method:"POST"});
			json = await res.json();
		}catch(error) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:'error', success:false}));
			return;
		}
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify(json));
	}
}