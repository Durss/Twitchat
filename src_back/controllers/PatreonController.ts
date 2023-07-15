import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController";
import Logger from "../utils/Logger";
import * as fetch from "node-fetch";
import Config from "../utils/Config";

/**
* Created : 13/07/2023 
*/
export default class PatreonController extends AbstractController {
	
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
		this.server.get('/api/patreon/user', async (request, response) => await this.getUser(request, response));
		this.server.post('/api/patreon/authenticate', async (request, response) => await this.postAuthenticate(request, response));
		this.server.post('/api/patreon/refresh_token', async (request, response) => await this.postRefreshToken(request, response));
	}
	
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Authenticate a patreon user with their oAuth token
	 * @param request 
	 * @param response 
	 */
	public async postAuthenticate(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const body:any = request.body;
		const url = new URL("https://www.patreon.com/api/oauth2/token");
		url.searchParams.append("grant_type", "authorization_code");
		url.searchParams.append("code", body.code);
		url.searchParams.append("redirect_uri", body.redirect_uri);
		url.searchParams.append("client_id", Config.credentials.patreon_client_id);
		url.searchParams.append("client_secret", Config.credentials.patreon_client_secret);

		const result = await fetch(url, {method:"POST"});
		const json = await result.json();

		if(json.error) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send({success:false, message:json.error});
		}else{
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, data:json}));
		}
	}

	/**
	 * Refreshes user's token
	 * @param request 
	 * @param response 
	 */
	public async postRefreshToken(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const body:any = request.body;
		const url = new URL("https://www.patreon.com/api/oauth2/token");
		url.searchParams.append("grant_type", "refresh_token");
		url.searchParams.append("refresh_token", body.token);
		url.searchParams.append("client_id", Config.credentials.patreon_client_id);
		url.searchParams.append("client_secret", Config.credentials.patreon_client_secret);

		const result = await fetch(url, {method:"POST"});
		const json = await result.json();

		if(json.error) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send({success:false, message:json.error});
		}else{
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, data:json}));
		}
	}

	/**
	 * Get current user's info
	 * @param request 
	 * @param response 
	 */
	public async getUser(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const token:string = (request.query as any).token;
		const url = "https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields%5Buser%5D=about,created,email,first_name,full_name,image_url,last_name,social_connections,thumb_url,url,vanity&fields%5Bcampaign%5D=summary,is_monthly";
		const options = {
			method:"GET",
			headers: {
				"Authorization":"Bearer "+token,
			}
		}

		const result = await fetch(url, options);
		const json = await result.json();

		console.log(url);
		console.log(token);
		console.log(json);

		if(json.error) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send({success:false, message:json.error});
		}else{
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, data:json}));
		}
	}
}