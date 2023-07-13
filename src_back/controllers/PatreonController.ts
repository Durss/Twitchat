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
		this.server.post('/api/patreon/authenticate', async (request, response) => await this.postAuthenticate(request, response));
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

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify(json));
	}
}