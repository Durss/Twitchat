import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController.js";
import Config from "../utils/Config.js";
import * as crypto from "crypto";
import Logger from "../utils/Logger.js";
import * as fs from "fs";
import SSEController, { SSECode } from "./SSEController.js";
import fetch from "node-fetch";
import Utils from "../utils/Utils.js";

/**
* Created : 06/09/2024 
*/
export default class TiltifyController extends AbstractController {

	private credentialToken:AuthToken | null = null;
	private fact2UidMap:FactIdToUsers = {};
	private parsedEvents:{[id:string]:boolean} = {};
	private apiPath:string = ""
	
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

		this.apiPath = Config.credentials.tiltify_api_path;

		if(Config.credentials.tiltify_client_id && Config.credentials.tiltify_client_secret && this.apiPath) {
			await this.generateCredentialToken();
			await this.enableWebhook();
	
			if(fs.existsSync(Config.TILTIFY_FACT_2_UID_MAP)) {
				this.fact2UidMap = JSON.parse(fs.readFileSync(Config.TILTIFY_FACT_2_UID_MAP, "utf-8") || "{}");
			}
		}
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
		const body = request.body as WebhookDonationEvent|WebhookCampaignEvent;
		
		//If that event has already been parsed, ignore it
		if(this.parsedEvents[body.meta.id] === true) {
			response.status(200);
			response.send("OK");
			return;
		}

		//Verify signature
		const signature = request.headers["x-tiltify-signature"];
		const timestamp = request.headers["x-tiltify-timestamp"];
		const key = timestamp+"."+JSON.stringify(request.body);
		const hash = crypto.createHmac('sha256', Config.credentials.tiltify_webhook_verify)
		.update(key)
		.digest('base64');

		if(hash !== signature) {
			Logger.warn("[TILTIFY] Invalid webhook signature");
			response.status(401);
			response.send("Unauthorized");
			return;
		}

		if(body.meta.event_type != "public:direct:fact_updated" || (body.meta.event_type == "public:direct:fact_updated"
		&& (body as WebhookCampaignEvent).data.livestream)) {
			Utils.logToFile("tiltify", JSON.stringify({type:body.meta.event_type, data:body}));
		}

		try{

			if(body.meta.event_type == "public:direct:donation_updated") {
				const typedBody = body as WebhookDonationEvent;
				const data:SSETiltifyDonationEventData = {
					type: "donation",
					amount: parseFloat(typedBody.data.amount.value),
					currency: typedBody.data.amount.currency,
					message: typedBody.data.donor_comment,
					username: typedBody.data.donor_name,
					campaignId:typedBody.data.campaign_id,
				};

				if(typedBody.meta.subscription_source_type == "test") {
					//Force existing campaign ID if testing so it actually
					//does something on Twitchat
					for (const id in this.fact2UidMap) {
						if(this.fact2UidMap[id]!.type != "campaign") continue;
						data.campaignId = id;
						break;
					}
				}
	
				//Send info to connected users
				const fact = this.fact2UidMap[data.campaignId];
				if(fact) {
					(fact.users || []).forEach(uid=>{
						SSEController.sendToUser(uid, SSECode.TILTIFY_EVENT, data);
					})
				}else{
					Logger.warn("[TILTIFY] Campaign not found:", data.campaignId);
				}
	
			}else
			if(body.meta.event_type == "public:direct:fact_updated") {
				const typedBody = body as WebhookCampaignEvent;
				const data:SSETiltifyCauseEventData = {
					type: "cause_update",
					amount_goal: parseFloat(typedBody.data.goal.value),
					currency: typedBody.data.goal.currency,
					amount_raised: parseFloat(typedBody.data.amount_raised.value),
					total_amount_raised: parseFloat(typedBody.data.total_amount_raised.value),
					title: typedBody.data.name,
					description: typedBody.data.description,
					donateUrl: typedBody.data.donate_url,
					causeId: typedBody.data.cause_id,
					campaignId: typedBody.data.id,
				};

				if(typedBody.meta.subscription_source_type == "test") {
					//Force existing cause ID if testing so it actually
					//does something on Twitchat
					for (const id in this.fact2UidMap) {
						if(this.fact2UidMap[id]!.type != "cause") continue;
						data.causeId = id;
						break;
					}
				}

				//Send info to connected users
				const fact = this.fact2UidMap[data.causeId]!;
				(fact.users || []).forEach(uid=>{
					SSEController.sendToUser(uid, SSECode.TILTIFY_EVENT, data);
				});
			}
	
		}catch(error) {
			Logger.error("[TILTIFY] Webhook pasring error");
			console.log(error);
		}
		this.parsedEvents[body.meta.id] = true;

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
		const twitchUser = await super.twitchUserGuard(request, response);
		if(twitchUser == false) return;

		const params = request.query as any;
		const accessToken = params.token as string;
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

		const userRes = await fetch(this.apiPath+"/api/public/current-user", options);
		if(userRes.status != 200) throw("Failed loading user info with status "+userRes.status);
		const userJSON = (await userRes.json() as {data:any}).data;
		
		const campaignsRes = await fetch(this.apiPath+`/api/public/users/${userJSON.id}/integration_events?limit=100`, options);
		if(campaignsRes.status != 200) throw("Failed loading user's teams and campaigns with status "+userRes.status);
		let campaignsJSON:IntegrationList = [];
		try {
			campaignsJSON = (await campaignsRes.json() as {data:IntegrationList}).data;
		}catch(error) {
			Logger.error("[TILTIFY] Failed loading Tiltify campaigns");
			console.log(error);
			console.log(await campaignsRes.text());
		}

		let mapUpdated = false;
		campaignsJSON.forEach(c => {
			this.subscribeToCampaign(c.id);
			//Register campaign
			if(!this.fact2UidMap[c.id]) this.fact2UidMap[c.id] = {type:"campaign", users:[]};
			if(!this.fact2UidMap[c.id]!.users.includes(twitchUser.user_id)) {
				this.fact2UidMap[c.id]!.users.push(twitchUser.user_id);
				mapUpdated = true;
			}
			//Register cause
			//"public:direct:fact_updated" webhook event only gives a cause ID, not
			//a campaign ID, that's why we need this association
			if(!this.fact2UidMap[c.cause_id]) this.fact2UidMap[c.cause_id] = {type:"cause", users:[]};
			if(!this.fact2UidMap[c.cause_id]!.users.includes(twitchUser.user_id)) {
				this.fact2UidMap[c.cause_id]!.users.push(twitchUser.user_id);
				mapUpdated = true;
			}
		});

		if(mapUpdated) {
			fs.writeFileSync(Config.TILTIFY_FACT_2_UID_MAP, JSON.stringify(this.fact2UidMap), "utf-8");
		}

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

		const url = new URL(this.apiPath+"/oauth/token");
		url.searchParams.set("grant_type", "authorization_code");
		url.searchParams.set("client_id", Config.credentials.tiltify_client_id);
		url.searchParams.set("client_secret", Config.credentials.tiltify_client_secret);
		url.searchParams.set("redirect_uri", Config.credentials.tiltify_redirect_uri);
		url.searchParams.set("code", (request.body as any).code);

		try {
			const slRes = await fetch(url, {method:"POST", headers});
			const token = await slRes.json() as AuthToken;

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
		const twitchUser = await super.twitchUserGuard(request, response);
		if(twitchUser == false) return;

		const params = request.query as any;
		const accessToken = params.token as string;
		const options = {
			method:"GET",
			headers:{
				"content-type":"application/json",
				"Authorization":"Bearer "+accessToken,
			},
		}

		try {
			const userRes = await fetch(this.apiPath+"/api/public/current-user", options);
			if(userRes.status != 200) throw("Failed loading user info with status "+userRes.status);
			const userJSON = (await userRes.json() as {data:any}).data;
			
			const campaignsRes = await fetch(this.apiPath+`/api/public/users/${userJSON.id}/integration_events?limit=100`, options);
			if(campaignsRes.status != 200) throw("Failed loading user's teams and campaigns with status "+userRes.status);
			let campaignsJSON:IntegrationList = [];
			try {
				campaignsJSON = (await campaignsRes.json() as {data:IntegrationList}).data;
			}catch(error) {
				Logger.error("[TILTIFY][DISCONNECT] Failed loading Tiltify campaigns");
				console.log(error);
				console.log(await campaignsRes.text());
			}
	
			let mapUpdated = false;
			campaignsJSON.forEach(c => {
				this.unsubscribeFromCampaign(c.id);
				//Register campaign
				if(!this.fact2UidMap[c.id]) this.fact2UidMap[c.id] = {type:"campaign", users:[]};
				const factIndex = this.fact2UidMap[c.id]!.users.findIndex(v=>v === twitchUser.user_id);
				if(factIndex > -1) {
					this.fact2UidMap[c.id]!.users.splice(factIndex, 1);
					mapUpdated = true;
				}
				//Unregister cause
				//"public:direct:fact_updated" webhook event only gives a cause ID, not
				//a campaign ID, that's why we need this association
				if(!this.fact2UidMap[c.cause_id]) this.fact2UidMap[c.cause_id] = {type:"cause", users:[]};
				const causeIndex = this.fact2UidMap[c.cause_id]!.users.findIndex(v=>v === twitchUser.user_id);
				if(causeIndex > -1) {
					this.fact2UidMap[c.cause_id]!.users.splice(causeIndex, 1);
					mapUpdated = true;
				}
			});
	
			if(mapUpdated) {
				fs.writeFileSync(Config.TILTIFY_FACT_2_UID_MAP, JSON.stringify(this.fact2UidMap), "utf-8");
			}
			Logger.success("[TILTIFY][DISCONNECT] Disconnected "+twitchUser.user_id+"'s webhooks");
		}catch(error) {
			console.log(error);
		}
		
		response.header('Content-Type', 'application/json')
		.status(200)
		.send(JSON.stringify({success:true}));
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
			const slRes = await fetch(this.apiPath+"/oauth/token", {method:"POST", headers, body:JSON.stringify(body)});
			text = await slRes.text();
			const token = JSON.parse(text);

			if(!token.access_token) {
				Logger.error("[TILTIFY] Unable to refresh tiltify token");
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
			Logger.error("[TILTIFY] Unable to refresh tiltify token");
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

		const webhookId = Config.credentials.tiltify_webhook_id;
		const url = this.apiPath+`/api/private/webhook_endpoints/${webhookId}/webhook_subscriptions/${campaignId}`;
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
			// const json = await res.json();
			Logger.info("[TILTIFY] Webhook created for \""+campaignId+"\"");
		}else{
			// Logger.error("[TILTIFY] Failed subscribing to campaign");
			// const text = await res.text();
			// console.log(text);
		}
	}

	/**
	 * Unsubscribes from a user's campaign
	 * @returns 
	 */
	private async unsubscribeFromCampaign(campaignId:string):Promise<void> {
		if(!this.credentialToken) {
			Logger.error("[TILTIFY] Cannot delete webhook because credential token is missing");
			return;
		}

		const webhookId = Config.credentials.tiltify_webhook_id;
		const url = this.apiPath+`/api/private/webhook_endpoints/${webhookId}/webhook_subscriptions/${campaignId}`;
		const headers = {
			"content-type":"application/json",
			"Authorization": "Bearer "+this.credentialToken.access_token,
		};

		const res = await fetch(url, {method:"DELETE", headers});
		if(res.status == 200) {
			// const json = await res.json();
			Logger.info("[TILTIFY] Webhook deleted for \""+campaignId+"\"");
		}else{
			Logger.error("[TILTIFY] Failed unsubscribing from campaign \""+campaignId+"\"");
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
		
		const res = await fetch(this.apiPath+"/oauth/token", {method:"POST", headers, body:JSON.stringify(body)});
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
			setTimeout(()=>{
				this.generateCredentialToken();
			}, 5000);
		}
	}

	/**
	 * Enables the webhook
	 */
	private async enableWebhook():Promise<void> {
		const headers = {
			"content-type":"application/json",
			"Authorization": "Bearer "+this.credentialToken!.access_token,
		};
		
		const webhookId = Config.credentials.tiltify_webhook_id;
		const res = await fetch(this.apiPath+`/api/private/webhook_endpoints/${webhookId}/activate`, {method:"POST", headers});
		if(res.status == 200) {
			const json = await res.json() as {data:WebhookEnableResult};
			Logger.info("[TILTIFY] Webhook enabled: "+json.data.description);
		}else{
			const text = await res.text();
			Logger.error("[TILTIFY] Failed enabling webhook!");
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

interface WebhookEnableResult {
	id: string;
	status: string;
	description: string;
	url: string;
	inserted_at: string;
	updated_at: string;
	deactivated_at?: any;
	activated_at: string;
}

interface WebhookDonationEvent {
	data: {
		amount: {
			currency: string;
			value: string;
		};
		campaign_id: string;
		cause_id: string;
		completed_at: string;
		created_at: string;
		donor_comment: string;
		donor_name: string;
		fundraising_event_id: string;
		id: string;
		legacy_id: number;
		poll_id?: any;
		poll_option_id?: any;
		reward_claims?: any;
		reward_id?: any;
		sustained: boolean;
		target_id?: any;
		team_event_id?: any;
	};
	meta: {
		id: string;
		attempted_at: string;
		event_type: "public:direct:donation_updated";
		generated_at: string;
		subscription_source_id: string;
		subscription_source_type: "test" | string;
	};
}

interface WebhookCampaignEvent {
	data: {
		amount_raised: {
			currency: string;
			value: string;
		};
		avatar: {
			alt: string;
			height: number;
			src: string;
			width: number;
		};
		cause_id: string;
		description: string;
		donate_url: string;
		fundraising_event_id?: any;
		goal: {
			currency: string;
			value: string;
		};
		has_schedule: boolean;
		id: string;
		inserted_at: string;
		legacy_id: number;
		livestream?: any;
		name: string;
		original_goal: {
			currency: string;
			value: string;
		};
		published_at: string;
		retired_at?: any;
		slug: string;
		status: string;
		supporting_type: string;
		total_amount_raised: {
			currency: string;
			value: string;
		};
		updated_at: string;
		url: string;
		user: {
			avatar: {
				alt: string;
				height: number;
				src: string;
				width: number;
			};
			description: string;
			id: string;
			legacy_id: number;
			slug: string;
			social: {
				discord: string;
				facebook: string;
				instagram: string;
				snapchat: string;
				tiktok: string;
				twitch: string;
				twitter: string;
				website: string;
				youtube: string;
			};
			total_amount_raised: {
				currency: string;
				value: string;
			};
			url: string;
			username: string;
		};
		user_id: string;
	};
	meta: {
		id: string;
		attempted_at: string;
		event_type: "public:direct:fact_updated";
		generated_at: string;
		subscription_source_id: string;
		subscription_source_type: "test" | string;
	};
}

type IntegrationList = {
	id: string;
	name: string;
	status: string;
	user?: {
		id: string;
		description: string;
		url: string;
		username: string;
		slug: string;
		avatar: {
			width: number;
			alt: string;
			src: string;
			height: number;
		};
		social: {
			twitch?: any;
			twitter?: any;
			facebook?: any;
			discord?: any;
			website?: any;
			snapchat?: any;
			instagram?: any;
			youtube?: any;
			tiktok?: any;
		};
		total_amount_raised: {
			value: string;
			currency: string;
		};
		legacy_id: number;
	};
	description: string;
	url: string;
	cause_id: string;
	slug: string;
	inserted_at: string;
	updated_at: string;
	currency_code?: string;
	user_id?: string;
	fundraising_event_id?: any;
	team?: {
		id: string;
		name: string;
		description: string;
		url: string;
		slug: string;
		avatar: {
			width: number;
			alt: string;
			src: string;
			height: number;
		};
		social: {
			twitch?: any;
			twitter?: any;
			facebook?: any;
			discord?: any;
			website?: any;
			snapchat?: any;
			instagram?: any;
			youtube?: any;
			tiktok?: any;
		};
		total_amount_raised: {
			value: string;
			currency: string;
		};
		legacy_id: number;
	};
	team_id?: string;
	avatar: {
		width: number;
		alt: string;
		src: string;
		height: number;
	};
	amount_raised: {
		value: string;
		currency: string;
	};
	published_at: string;
	retired_at?: any;
	supportable?: string;
	goal: {
		value: string;
		currency: string;
	};
	livestream?: any;
	total_amount_raised: {
		value: string;
		currency: string;
	};
	original_goal: {
		value: string;
		currency: string;
	};
	supporting_amount_raised?: {
		value: string;
		currency: string;
	};
	legacy_id: number;
	donate_url: string;
	has_schedule: boolean;
	supporting_type?: string;
}[]

type FactIdToUsers = {[campaignId:string]:{type:"cause"|"campaign", users:string[]}}

export interface SSETiltifyDonationEventData{
	type:"donation";
	amount:number;
	currency:string;
	message:string;
	username:string;
	campaignId:string;
}

export interface SSETiltifyCauseEventData{
	type:"cause_update";
	amount_raised:number;
	total_amount_raised:number;
	amount_goal:number;
	currency:string;
	donateUrl:string;
	title:string;
	description:string;
	causeId:string;
	campaignId:string;
}