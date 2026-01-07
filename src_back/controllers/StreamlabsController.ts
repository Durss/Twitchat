import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fetch from "node-fetch";
import Config from "../utils/Config.js";
import AbstractController from "./AbstractController.js";

/**
* Created : 01/03/2024 
*/
export default class StreamlabsController extends AbstractController {
	
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
		this.server.get('/api/streamlabs/socketToken', async (request, response) => await this.getSocketToken(request, response));
		this.server.post('/api/streamlabs/auth', async (request, response) => await this.postAuth(request, response));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Get socket token from access token
	 */
	private async getSocketToken(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const params = request.query as any;
		const headers = {
			"accept": "application/json",
			"Content-Type": "application/json",
			"Authorization":"Bearer "+params.accessToken,
		};
		try {
			const socketRes = await fetch("https://streamlabs.com/api/v2.0/socket/token", {method:"GET", headers});
			const socketJson = await socketRes.json() as {socket_token:string};

			response.header('Content-Type', 'application/json')
			.status(200)
			.send(JSON.stringify({success:!!socketJson.socket_token, socketToken:socketJson.socket_token}));
		}catch(error) {
			console.log(error)
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
	private async postAuth(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const result = await super.twitchUserGuard(request, response);
		if(result == false) return;

		const headers = {
			"Content-Type": "application/json",
			"X-Requested-With":"XMLHttpRequest",
		};
		const body = {
			grant_type:		'authorization_code',
			client_id:		Config.credentials.streamlabs_client_id,
			client_secret:	Config.credentials.streamlabs_client_secret,
			redirect_uri:	Config.credentials.streamlabs_redirect_uri,
			code:			(request.body as any).code,
		};

		const slRes = await fetch("https://streamlabs.com/api/v2.0/token", {method:"POST", headers, body:JSON.stringify(body)});
		try {
			const json = await slRes.json() as {access_token:string, refresh_token:string, expires_in:number};
			const accessToken = json.access_token;
			const headers = {
				"accept": "application/json",
				"Content-Type": "application/json",
				"Authorization":"Bearer "+accessToken,
			};
			const socketRes = await fetch("https://streamlabs.com/api/v2.0/socket/token", {method:"GET", headers});
			const socketJson = await socketRes.json() as {socket_token:string};

			response.header('Content-Type', 'application/json')
			.status(200)
			.send(JSON.stringify({success:json.access_token !== undefined, accessToken:json.access_token, socketToken:socketJson.socket_token}));
		}catch(error) {
			console.log(error)
			response.header('Content-Type', 'application/json')
			.status(500)
			.send(JSON.stringify({success:false, errorCode:"JSON_PARSING_FAILED", error:"json parsing failed"}));
		}

	}
}