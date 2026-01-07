import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController.js";
import Config from "../utils/Config.js";
import fetch from "node-fetch";
import Logger from "../utils/Logger.js";

/**
* Created : 18/03/2024 
*/
export default class TipeeeController extends AbstractController {
	
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
		this.server.post('/api/tipeee/auth', async (request, response) => await this.postAuth(request, response));
		this.server.post('/api/tipeee/refreshToken', async (request, response) => await this.postRefreshToken(request, response));
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
			"Content-Type": "application/json",
		};

		const params = request.body as {code:string};
		const body = JSON.stringify({
			client_id: Config.credentials.tipeee_client_id,
			client_secret: Config.credentials.tipeee_client_secret,
			code: params.code,
			grant_type: "authorization_code",
			redirect_uri: Config.credentials.tipeee_redirect_uri,
		});

		try {
			const query = await fetch("https://api.tipeeestream.com/oauth/v2/token", {method:"POST", headers, body});
			const json = await query.json() as {access_token:string, refresh_token:string, expires_in:number};
			const accessToken = json.access_token;
			const refreshToken = json.refresh_token;
			const expiresIn = json.expires_in;

			response.header('Content-Type', 'application/json')
			.status(200)
			.send(JSON.stringify({success:accessToken !== undefined, accessToken, refreshToken, expiresIn}));
		}catch(error) {
			Logger.error("Tipeee: oauth failed")
			console.log(error);
			response.header('Content-Type', 'application/json')
			.status(500)
			.send(JSON.stringify({success:false, errorCode:"JSON_PARSING_FAILED", error:"json parsing failed"}));
		}
	}
	
	/**
	 * Refresh access token
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	private async postRefreshToken(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const result = await super.twitchUserGuard(request, response);
		if(result == false) return;

		const headers = {
			"Content-Type": "application/json",
		};

		const params = request.body as {refreshToken:string};
		const url = new URL("https://api.tipeeestream.com/oauth/v2/refresh-token");

		const body = JSON.stringify({
			client_id: Config.credentials.tipeee_client_id,
			client_secret: Config.credentials.tipeee_client_secret,
			refresh_token: params.refreshToken,
		});


		try {
			const query = await fetch(url, {method:"POST", headers, body});
			const json = await query.json() as {access_token:string, refresh_token:string};
			const accessToken = json.access_token;
			const refreshToken = json.refresh_token;

			response.header('Content-Type', 'application/json')
			.status(200)
			.send(JSON.stringify({success:accessToken !== undefined, accessToken, refreshToken}));
		}catch(error) {
			Logger.error("Tipeee: refreshing token failed")
			console.log(error);
			response.header('Content-Type', 'application/json')
			.status(500)
			.send(JSON.stringify({success:false, errorCode:"JSON_PARSING_FAILED", error:"json parsing failed"}));
		}
	}
}