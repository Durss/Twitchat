import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController";
import Config from "../utils/Config";
import * as fetch from "node-fetch";

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

		// const headers = {
		// 	"Content-Type": "application/x-www-form-urlencoded",
		// };

		const params = request.body as {code:string};

		const url = new URL("https://api.tipeeestream.com/oauth/v2/token");

		const body = JSON.stringify({
			client_id: Config.credentials.tipeee_client_id,
			client_secret: Config.credentials.tipeee_client_secret,
			code: params.code,
			grant_type: "authorization_code",
			redirect_uri: Config.credentials.tipeee_redirect_uri,
		});

		console.log(body);

		try {
			const slRes = await fetch(url, {method:"POST", headers, body});
			const json = await slRes.json();
			const accessToken = json.access_token;
			const refreshToken = json.refresh_token;
			const expiresIn = json.expires_in;

			console.log(json);

			response.header('Content-Type', 'application/json')
			.status(200)
			.send(JSON.stringify({success:accessToken !== undefined, accessToken, refreshToken, expiresIn}));
		}catch(error) {
			console.log(error);
			response.header('Content-Type', 'application/json')
			.status(500)
			.send(JSON.stringify({success:false, errorCode:"JSON_PARSING_FAILED", error:"json parsing failed"}));
		}
	}
	
	/**
	 * Authenticate user to complete oAuth flow
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

		// const headers = {
		// 	"Content-Type": "application/x-www-form-urlencoded",
		// };

		const params = request.body as {refreshToken:string};

		const url = new URL("https://api.tipeeestream.com/oauth/v2/refresh-token");

		const body = JSON.stringify({
			client_id: Config.credentials.tipeee_client_id,
			client_secret: Config.credentials.tipeee_client_secret,
			refresh_token: params.refreshToken,
		});


		try {
			const slRes = await fetch(url, {method:"POST", headers, body});
			const json = await slRes.json();
			const accessToken = json.access_token;
			const refreshToken = json.refresh_token;
			const expiresIn = json.expires_in;//TODO make sure we actually get this info, it's not documented

			console.log(json);

			response.header('Content-Type', 'application/json')
			.status(200)
			.send(JSON.stringify({success:accessToken !== undefined, accessToken, refreshToken, expiresIn}));
		}catch(error) {
			console.log(error);
			response.header('Content-Type', 'application/json')
			.status(500)
			.send(JSON.stringify({success:false, errorCode:"JSON_PARSING_FAILED", error:"json parsing failed"}));
		}
	}
}