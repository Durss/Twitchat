import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController.js";
import Config from "../utils/Config.js";
import * as crypto from "crypto";
import Logger from "../utils/Logger.js";

/**
* Created : 06/09/2024 
*/
export default class TiltifyController extends AbstractController {

	private credentialToken:AuthToken | null = null;
	
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
		this.server.get('/api/tiltify/info', async (request, response) => await this.getInfo(request, response));
		this.server.post('/api/tiltify/auth', async (request, response) => await this.postAuth(request, response));
		this.server.delete('/api/tiltify/auth', async (request, response) => await this.deleteAuth(request, response));
		this.server.post('/api/tiltify/token/refresh', async (request, response) => await this.postRefreshToken(request, response));
		this.server.post('/api/tiltify/webhook', async (request, response) => await this.postWebhook(request, response));

		this.generateCredentialToken();
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Called when receiving a webhook event
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	private async postWebhook(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const body = request.body as any;
		const bodyStr = JSON.stringify(body);
		const signature = request.headers["x-tiltify-signature"];
		const timestamp = request.headers["x-tiltify-timestamp"];
		const key = timestamp+"."+bodyStr;
		const hash = crypto.createHmac('sha256', Config.credentials.tiltify_webhook_verify)
		.update(key)
		.digest('base64');

		if(hash !== signature) {
			Logger.warn("Tiltify: Invalid webhook signature");
			response.status(401);
			response.send("Unauthorized");
			return;
		}

		console.log(body);
		
		response.status(200);
		response.send("OK");
	}

	/**
	 * Get all user's info
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	private async getInfo(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const accessToken = request.headers["tiltify-access_token"] as string;
		if(!accessToken) {
			response.header('Content-Type', 'application/json')
			.status(401)
			.send(JSON.stringify({success:false, errorCode:"UNAUTHORIZED", error:"Invalid or missing access token"}));
			return;
		}

		const options = {
			method:"GET",
			headers:{
				"content-type":"application/json",
				"Authorization":"Bearer "+accessToken,
			},
		}

		const userRes = await fetch("https://v5api.tiltify.com/api/public/current-user", options);
		if(userRes.status != 200) throw("Failed loading user info with status "+userRes.status);
		const userJSON = (await userRes.json() as {data:any}).data;
		
		const campaignsRes = await fetch(`https://v5api.tiltify.com/api/public/users/${userJSON.id}/integration_events?limit=100`, options);
		if(campaignsRes.status != 200) throw("Failed loading user's teams and campaigns with status "+userRes.status);
		let campaignsJSON:{id:string}[] = [];
		try {
			campaignsJSON = (await campaignsRes.json() as {data:any}).data;
		}catch(error) {
			Logger.error("Failed loading Tiltify campaigns");
			console.log(error);
			console.log(await campaignsRes.text());
		}

		campaignsJSON.forEach(c => {
			this.subscribeToCampaign(c.id);
		})

		response.header('Content-Type', 'application/json')
		.status(200)
		.send(JSON.stringify({success:true, user:userJSON, campaigns:campaignsJSON}));
	}

	/**
	 * Called when connecting with tiltify
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	private async postAuth(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const result = await super.twitchUserGuard(request, response);
		if(result == false) return;

		const headers = {
			"content-type":"application/json",
		};

		const url = new URL("https://v5api.tiltify.com/oauth/token");
		url.searchParams.set("grant_type", "authorization_code");
		url.searchParams.set("client_id", Config.credentials.tiltify_client_id);
		url.searchParams.set("client_secret", Config.credentials.tiltify_client_secret);
		url.searchParams.set("redirect_uri", Config.credentials.tiltify_redirect_uri);
		url.searchParams.set("code", (request.body as any).code);

		try {
			const slRes = await fetch(url, {method:"POST", headers});
			const token = await slRes.json();

			response.header('Content-Type', 'application/json')
			.status(200)
			.send(JSON.stringify({success:token.access_token !== undefined, token}));
		}catch(error) {
			response.header('Content-Type', 'application/json')
			.status(500)
			.send(JSON.stringify({success:false, errorCode:"JSON_PARSING_FAILED", error:"json parsing failed"}));
		}
	}

	/**
	 * Called when disconnecting from tiltify.
	 * Cleanup webhooks
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	private async deleteAuth(request:FastifyRequest, response:FastifyReply):Promise<void> {
		
		response.status(200);
		response.send("OK");
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
			"content-type":"application/json",
		};
		const body = {
			grant_type:		"refresh_token",
			client_id:		Config.credentials.tiltify_client_id,
			client_secret:	Config.credentials.tiltify_client_secret,
			refresh_token:	(request.body as any).refreshToken,
		};

		let text = "";
		try {
			const slRes = await fetch("https://v5api.tiltify.com/oauth/token", {method:"POST", headers, body:JSON.stringify(body)});
			text = await slRes.text();
			const token = JSON.parse(text);

			if(!token.access_token) {
				Logger.error("Unable to refresh tiltify token");
				console.log(text);
				response.header('Content-Type', 'application/json')
				.status(500)
				.send(JSON.stringify({success:false, errorCode:"UNNKOWN", error:token.error_description || "unknown error"}));
			}else{
				response.header('Content-Type', 'application/json')
				.status(200)
				.send(JSON.stringify({success:true, token:token}));
			}

		}catch(error) {
			Logger.error("Unable to refresh tiltify token");
			console.log(error);
			response.header('Content-Type', 'application/json')
			.status(500)
			.send(JSON.stringify({success:false, errorCode:"JSON_PARSING_FAILED", error:"json parsing failed"}));
		}
	}

	/**
	 * Subscribes to a user's campaign
	 * @returns 
	 */
	private async subscribeToCampaign(campaignId:string):Promise<void> {
		if(!this.credentialToken) {
			Logger.error("[TILTIFY] Cannot create webhook because credential token is missing");
			return;
		}

		const webhookId = "ca592f9c-40c7-48db-9bd5-2d198db32a16";
		const url = `https://v5api.tiltify.com/api/private/webhook_endpoints/${webhookId}/webhook_subscriptions/${campaignId}`;
		const headers = {
			"content-type":"application/json",
			"Authorization": "Bearer "+this.credentialToken.access_token,
		};
		const body = {
			event_types: [
				"public:direct:donation_updated",
				"public:direct:fact_updated",
			]
		};

		const res = await fetch(url, {method:"PUT", headers, body:JSON.stringify(body)});
		if(res.status == 200) {
			const json = await res.json();
			Logger.info("[TILTIFY] Webhook created for \""+campaignId+"\"");
		}else{
			Logger.error("[TILTIFY] Failed subscribing to campaign");
			const text = await res.text();
			console.log(text);
		}
	}

	/**
	 * Generates an app access token
	 */
	private async generateCredentialToken():Promise<void> {
		const headers = {"content-type":"application/json"};
		const body = {
			"grant_type": "client_credentials",
			"client_id": Config.credentials.tiltify_client_id,
			"client_secret": Config.credentials.tiltify_client_secret,
			"scope": "webhooks:write"
		}
		
		const res = await fetch("https://v5api.tiltify.com/oauth/token", {method:"POST", headers, body:JSON.stringify(body)});
		if(res.status == 200) {
			const json = await res.json() as AuthToken;
			this.credentialToken = json;
			setTimeout(()=>{
				this.generateCredentialToken();
			}, (json.expires_in-60) * 1000)
		}else{
			const text = await res.text();
			Logger.error("[TILTIFY] Failed generating credential token!");
			console.log(text);
		}
	}
}

interface AuthToken {
	access_token: string;
	created_at: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
	token_type: string;
}