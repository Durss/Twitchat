import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fetch from "node-fetch";
import { URLSearchParams } from "url";
import Config from "../utils/Config.js";
import Logger from "../utils/Logger.js";
import AbstractController from "./AbstractController.js";

/**
* Created : 01/03/2024 
*/
export default class StreamelementsController extends AbstractController {
	
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
		this.server.post('/api/streamelements/auth', async (request, response) => await this.postAuth(request, response));
		this.server.post('/api/streamelements/token/refresh', async (request, response) => await this.postRefreshToken(request, response));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Authenticate user to complete oAuth flow
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	private async postAuth(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const result = await super.twitchUserGuard(request, response);
		if(result == false) return;

		const headers = {
			"Content-Type": "application/x-www-form-urlencoded",
		};

		const url = new URL("https://api.streamelements.com/oauth2/token");
		url.searchParams.set("grant_type", "authorization_code");
		url.searchParams.set("client_id", Config.credentials.streamelements_client_id);
		url.searchParams.set("client_secret", Config.credentials.streamelements_client_secret);
		url.searchParams.set("redirect_uri", Config.credentials.streamelements_redirect_uri);
		url.searchParams.set("code", (request.body as any).code);

		try {
			const slRes = await fetch(url, {method:"POST", headers});
			const json = await slRes.json() as {access_token:string, refresh_token:string};

			response.header('Content-Type', 'application/json')
			.status(200)
			.send(JSON.stringify({success:json.access_token !== undefined, accessToken:json.access_token, refreshToken:json.refresh_token}));
		}catch(error) {
			response.header('Content-Type', 'application/json')
			.status(500)
			.send(JSON.stringify({success:false, errorCode:"JSON_PARSING_FAILED", error:"json parsing failed"}));
		}

	}

	/**
	 * Refresh a user token
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	private async postRefreshToken(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const result = await super.twitchUserGuard(request, response);
		if(result == false) return;

		const headers = {
			"Content-Type": "application/x-www-form-urlencoded",
		};
		const body = {
			grant_type:		"refresh_token",
			client_id:		Config.credentials.streamelements_client_id,
			client_secret:	Config.credentials.streamelements_client_secret,
			refresh_token:	(request.body as any).refreshToken,
		};

		const params = new URLSearchParams(body);

		let text = "";
		try {
			const slRes = await fetch("https://api.streamelements.com/oauth2/token?"+params, {method:"POST", headers});
			text = await slRes.text();
			const json = JSON.parse(text);

			if(!json.access_token) {
				Logger.error("Unable to refresh streamelements token");
				console.log(text);
				response.header('Content-Type', 'application/json')
				.status(500)
				.send(JSON.stringify({success:false, errorCode:"UNNKOWN", error:json.error_description || "unknown error"}));
			}else{
				response.header('Content-Type', 'application/json')
				.status(200)
				.send(JSON.stringify({success:true, accessToken:json.access_token, refreshToken:json.refresh_token}));
			}

		}catch(error) {
			Logger.error("Unable to refresh streamelements token");
			console.log(error);
			response.header('Content-Type', 'application/json')
			.status(500)
			.send(JSON.stringify({success:false, errorCode:"JSON_PARSING_FAILED", error:"json parsing failed"}));
		}

	}
}