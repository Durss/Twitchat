import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController";
import Config from "../utils/Config";
import * as fetch from "node-fetch";
import { URLSearchParams } from "url";

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
		const body = {
			grant_type:		'authorization_code',
			client_id:		Config.credentials.streamelements_client_id,
			client_secret:	Config.credentials.streamelements_client_secret,
			redirect_uri:	Config.credentials.streamelements_redirect_uri,
			code:			(request.body as any).code,
		};

		const params = new URLSearchParams(body)

		try {
			const slRes = await fetch("https://api.streamelements.com/oauth2/token?"+params, {method:"POST", headers});
			const json = await slRes.json();

			console.log(json);

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
			grant_type:		'refresh_token',
			client_id:		Config.credentials.streamlabs_client_id,
			client_secret:	Config.credentials.streamlabs_client_secret,
			refresh_token:	(request.body as any).refreshToken,
		};

		try {
			const slRes = await fetch("https://api.streamelements.com/oauth2/token", {method:"POST", headers, body:JSON.stringify(body)});
			const json = await slRes.json();

			console.log(json);

			response.header('Content-Type', 'application/json')
			.status(200)
			.send(JSON.stringify({success:json.access_token !== undefined, accessToken:json.access_token, refreshToken:json.refresh_token}));
		}catch(error) {
			response.header('Content-Type', 'application/json')
			.status(500)
			.send(JSON.stringify({success:false, errorCode:"JSON_PARSING_FAILED", error:"json parsing failed"}));
		}

	}
}