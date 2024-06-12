import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Config from "../utils/Config.js";
import Logger from "../utils/Logger.js";
import fetch from "node-fetch";
import AbstractController from "./AbstractController.js";

/**
* Created : 17/10/2022 
*/
export default class SpotifyController extends AbstractController {
	
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
		this.server.get('/api/spotify/auth', async (request, response) => await this.spotifyAuthenticate(request, response));
		this.server.get('/api/spotify/refresh_token', async (request, response) => await this.spotifyRefreshToken(request, response));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Authenticate a spotify user from its auth_code
	 */
	private async spotifyAuthenticate(request:FastifyRequest, response:FastifyReply) {
		const params = request.query as any;
		const clientId = params.clientId? params.clientId : Config.credentials.spotify_client_id;
		const clientSecret = params.clientSecret? params.clientSecret : Config.credentials.spotify_client_secret;

		const options = {
			method:"POST",
			headers: {
				"Authorization": "Basic "+Buffer.from(clientId+":"+clientSecret).toString('base64'),
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				'grant_type': 'authorization_code',
				'code': params.code,
				'redirect_uri': Config.credentials.spotify_redirect_uri,
			})
		}
		
		let json;
		try {
			const res = await fetch("https://accounts.spotify.com/api/token", options);
			json = await res.json();
		}catch(error) {
			Logger.error("Spotify authentication failed");
			console.log(error);

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
	 * Refreshes a spotify access token
	 */
	private async spotifyRefreshToken(request:FastifyRequest, response:FastifyReply) {
		const params = request.query as any;
		const clientId = params.clientId? params.clientId : Config.credentials.spotify_client_id;
		const clientSecret = params.clientSecret? params.clientSecret : Config.credentials.spotify_client_secret;
	
		const options = {
			method:"POST",
			headers: {
				"Authorization": "Basic "+Buffer.from(clientId+":"+clientSecret).toString('base64'),
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				'grant_type': 'refresh_token',
				'refresh_token': params.token,
			})
		}
		
		let json;
		try {
			const res = await fetch("https://accounts.spotify.com/api/token", options);
			json = await res.json();
		}catch(error) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:'error', success:false}));

			Logger.error("Spotify token refresh failed");
			console.log(error);
			return;
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify(json));
	}
}