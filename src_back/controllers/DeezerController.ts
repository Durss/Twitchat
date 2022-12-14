import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Config from "../utils/Config";
import Logger from "../utils/Logger";
import * as fetch from "node-fetch";

/**
* Created : 17/10/2022 
* Not actually used as deezer API is terrible shit... using iframe "api" instead
* Keeping it just in case ¯\_(ツ)_/¯
*/
export default class DeezerController {
	
	constructor(public server:FastifyInstance) {
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public async initialize():Promise<void> {
		this.server.get('/api/deezer/auth', async (request, response) => await this.deezerAuthenticate(request, response));
		this.server.get('/api/deezer/search', async (request, response) => await this.deezerSearch(request, response));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Authenticate a deezer user from its auth_code
	 */
	private async deezerAuthenticate(request:FastifyRequest, response:FastifyReply) {
		const params = request.query as any;

		const options = { method:"GET" }
		let json;
		try {
			const appId = params.isProd=="1"? Config.credentials.deezer_client_id : Config.credentials.deezer_dev_client_id;
			const secret = params.isProd=="1"? Config.credentials.deezer_client_secret : Config.credentials.deezer_dev_client_secret;
			let url = "https://connect.deezer.com/oauth/access_token.php";
			url += "?code="+params.code;
			url += "&secret="+secret;
			url += "&app_id="+appId;
			url += "&output=json";
			const res = await fetch(url, options);
			json = await res.json();

			if(!json.access_token) throw(json);
		}catch(error) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:'error', success:false}));
			Logger.error("Deezer authentication failed");
			console.log(error);
			return;
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({
			refresh_token: json.access_token,
			expires_in: json.expires,
		}));
	}

	/**
	 * Search for content on Deezer
	 */
	private async deezerSearch(request:FastifyRequest, response:FastifyReply) {
		const res = await fetch("https://api.deezer.com/search?q=prout", {
			"headers": {
				"accept": "*/*",
			},
			"body": null,
			"method": "GET",
		});
		const json = await res.json();
		Logger.log(json)

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify(json));
	}
}