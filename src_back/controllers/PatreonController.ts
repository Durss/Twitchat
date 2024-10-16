import * as crypto from "crypto";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import fetch from "node-fetch";
import Config from "../utils/Config.js";
import Logger from "../utils/Logger.js";
import TwitchUtils, { TwitchToken } from "../utils/TwitchUtils.js";
import AbstractController from "./AbstractController.js";
import SSEController from "./SSEController.js";
import Utils from "../utils/Utils.js";

/**
* Created : 13/07/2023
*/
export default class PatreonController extends AbstractController {

	private localScopes:string = "identity campaigns campaigns.members w:campaigns.webhook";
	private isFirstAuth:boolean = true;
	private campaignId:string = "";
	private tokenRefresh!:NodeJS.Timeout;
	private smsWarned:boolean = false;
	private patreonApiDown:boolean = false;
	private webhookDebounce:NodeJS.Timeout|null = null;
	private userAgent = "Twitchat.fr server service";
	private uidToFirstPayment:{[uid:string]:boolean} = {};

	//If a user chooses to make a "custom pledge", they're not attributed to any
	//actual tier. This represents the minimum amount (in cents) they should give
	//to still be considered a member
	private MIN_AMOUNT:number = 400;
	//This tier is an exception for the "MIN_AMOUT".
	//This tier is lower than the min amount but has a limited number of slots
	private MIN_AMOUNT_TIER_ID_EXCEPTION:string = "10133573";

	constructor(public server:FastifyInstance) {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/
	public get authURL():string {
		const authUrl = new URL("https://www.patreon.com/oauth2/authorize");
		authUrl.searchParams.append("response_type", "code");
		authUrl.searchParams.append("client_id", Config.credentials.patreon_client_id_server);
		authUrl.searchParams.append("redirect_uri", Config.credentials.patreon_redirect_uri_server);
		authUrl.searchParams.append("scope", this.localScopes);
		authUrl.searchParams.append("state", "");
		return authUrl.href;
	}



	/******************
	* PUBLIC METHODS *
	******************/
	public async initialize():Promise<void> {
		this.server.get('/api/patreon/isMember', async (request, response) => await this.getIsMember(request, response));
		this.server.get('/api/patreon/serverauth', async (request, response) => await this.getServerAuth(request, response));
		this.server.get('/api/patreon/isApiDown', async (request, response) => await this.getApiDown(request, response));
		this.server.get('/api/patreon/user/webhook', async (request, response) => await this.getUserWebhook(request, response));
		this.server.post('/api/patreon/webhook', async (request, response) => await this.postWebhookTrigger(request, response));
		this.server.post('/api/patreon/user/webhook/:uid', async (request, response) => await this.postWebhookUserTrigger(request, response));
		this.server.post('/api/patreon/authenticate', async (request, response) => await this.postAuthenticate(request, response));
		this.server.post('/api/patreon/refresh_token', async (request, response) => await this.postRefreshToken(request, response));
		this.server.post('/api/patreon/user/webhook', async (request, response) => await this.postUserWebhook(request, response));
		this.server.delete('/api/patreon/user/webhook', async (request, response) => await this.deleteUserWebhook(request, response));

		if(Config.credentials.patreon_client_id_server && Config.credentials.patreon_client_secret_server) {
			await this.authenticateLocal();
		}

		// const res = await this.loadCampaign("9093199");
		// console.log(JSON.stringify(res))
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

		const result = await fetch(url, {method:"POST", headers:{"User-Agent":this.userAgent}});
		if(result.status == 200) {
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
		}else{
			Logger.error("Failed authenticating with Patreon with status:", result.status);
			console.log(await result.text());
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send({success:false, message:"Authentication failed"});
		}
	}

	/**
	 * Refreshes user's token
	 * @param request
	 * @param response
	 */
	public async postRefreshToken(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const user = await this.twitchUserGuard(request, response);
		if(!user) return;

		const body:any = request.body;
		const url = new URL("https://www.patreon.com/api/oauth2/token");
		url.searchParams.append("grant_type", "refresh_token");
		url.searchParams.append("refresh_token", body.token);
		url.searchParams.append("client_id", Config.credentials.patreon_client_id);
		url.searchParams.append("client_secret", Config.credentials.patreon_client_secret);

		const result = await fetch(url, {method:"POST", headers:{"User-Agent":this.userAgent}});
		const json = await result.json();

		if(json.error) {
			Logger.error("[PATREON] refresh token failed for "+user.user_id);
			console.log(json);
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
	 * Create a webhook on the user's account to get notified about donations
	 * @param request
	 * @param response
	 */
	public async postUserWebhook(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const webhookRes = await this.getUserWebhook(request, response, false);
		if(!webhookRes) return;
		
		//Webhook already exists, no need to create it, stop there
		if(webhookRes.webhookExists) {
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, message:"webhook already exists"}));
			return;
		}
		const token:string = (request.body as any).token;
		const headers = {
			'Content-Type': 'application/json',
			"Authorization":"Bearer "+token,
			"User-Agent":this.userAgent,
		};

		//Create new webhook
		const options = {
			method:"POST",
			headers,
			body:JSON.stringify({
				"data": {
					"type": "webhook",
					"attributes": {
						"triggers": ["members:create", "members:update", "members:delete", "members:pledge:create", "members:pledge:update", "members:pledge:delete"],
						"uri": webhookRes.webhookURL,
					},
					"relationships": {
						"campaign": {
							"data": {"type": "campaign", "id": webhookRes.campaignID},
						},
					},
				},
			})
		}
		const resultWebhook = await fetch("https://www.patreon.com/api/oauth2/v2/webhooks", options);
		const jsonWebhook = await resultWebhook.json() as {data:WebhookEntry, errors?:unknown[]};
		if(jsonWebhook.errors) {
			Logger.error("[PATREON] creating webhook failed");
			console.log(jsonWebhook);
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send({success:false, message:jsonWebhook.errors});
		}else{
			//Save webhook secret
			const filePath = Config.patreonUid2WebhookSecret;
			const json = JSON.parse(fs.existsSync(filePath)? fs.readFileSync(filePath, "utf8") : "{}");
			json[webhookRes.campaignID] = {twitchId:webhookRes.user.user_id, secret:jsonWebhook.data.attributes.secret};
			fs.writeFileSync(filePath, JSON.stringify(json), "utf8");
			
			Logger.info("[PATREON] Create user webhook for", webhookRes.user.login);

			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true}));
		}
	}

	/**
	 * Get if user has created the webhook
	 * @param request
	 * @param response
	 */
	public async getUserWebhook(request:FastifyRequest, response:FastifyReply, answerToQuery:boolean = true):Promise<{webhookURL:string, campaignID:string, user:TwitchToken, webhookID:string, webhookExists:boolean}|false|void> {
		const user = await this.twitchUserGuard(request, response);
		if(!user) return false;

		const token:string = (request.body || request.query as any).token;
		const headers = {
			'Content-Type': 'application/json',
			"Authorization":"Bearer "+token,
			"User-Agent":this.userAgent,
		};

		//Get campaign details
		const url = new URL("https://www.patreon.com/api/oauth2/v2/campaigns");
		url.searchParams.append("fields[campaign]", "created_at,summary,image_url,creation_name,patron_count,pledge_url");
		const campaignRes = await fetch(url, {method:"GET", headers});
		if(campaignRes.status < 200 || campaignRes.status > 204) {
			//Couldn't load campaign
			Logger.error("[PATREON] campaigns loading failed for ", user.login);
			console.log(await campaignRes.text());
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send({success:false, message:"couldn't load campaigns"});
			return false;
		}
		
		let webhookExists = false;
		let campaignID:string = "";
		let webhookURL:string = "";
		let webhookID:string = "";
		const campaigns = await campaignRes.json();
		if(campaigns.data && campaigns.data.length > 0) {
			//Campaigns is an array but, to date, Patreon only allows one campaign per account
			//no need to check for other entries but the first
			campaignID = campaigns.data[0].id;
			webhookURL = Config.credentials.patreon_webhook_url.replace("{ID}", campaignID);
			
			//Check if webhook already exists and cleanup any duplicate
			const result = await fetch("https://www.patreon.com/api/oauth2/v2/webhooks", {method:"GET", headers});
			const json = await result.json() as {data?:WebhookEntry[]};
			(json.data || []).forEach(entry => {
				if(entry.attributes.uri == webhookURL) {
					if(webhookExists) {
						//If exist flag is already raised, delete the webhook as it's most probably a duplicate
						fetch("https://www.patreon.com/api/oauth2/v2/webhooks/"+entry.id, {method:"DELETE", headers});
					}else{
						webhookExists = true;
						webhookID = entry.id;
					}
				}
			});
		}

		if(answerToQuery) {
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, webhookExists}));
		}
		return {campaignID, webhookURL, user, webhookExists, webhookID};
	}

	/**
	 * Delete a user's webhook
	 * @param request
	 * @param response
	 */
	public async deleteUserWebhook(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const webhookRes = await this.getUserWebhook(request, response, false);
		if(!webhookRes) return;

		const token:string = (request.body || request.query as any).token;
		const headers = {
			'Content-Type': 'application/json',
			"Authorization":"Bearer "+token,
			"User-Agent":this.userAgent,
		};

		Logger.info("[PATREON] Delete user webhook for", webhookRes.user.login);
		
		await fetch("https://www.patreon.com/api/oauth2/v2/webhooks/"+webhookRes.webhookID, {method:"DELETE", headers});

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Get current user's info
	 * @param request
	 * @param response
	 */
	public async getIsMember(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const token:string = (request.query as any).token;
		const url = "https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields%5Buser%5D=about,created,first_name,last_name,image_url,url,vanity&fields%5Bcampaign%5D=summary,is_monthly";
		const options = {
			method:"GET",
			headers: {
				"Authorization":"Bearer "+token,
				"User-Agent":this.userAgent,
			}
		}

		const result = await fetch(url, options);
		const json = await result.json();

		if(json.error) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send({success:false, message:json.error});
		}else{
			const members:PatreonMember[] = JSON.parse(fs.readFileSync(Config.patreonMembers, "utf-8"));
			const memberships = json.data.relationships.memberships.data as {id:string, type:string}[];

			//Flag myself as donor from my ID as the campaign holder isn't flag as
			//a donor of himself on patreon's data
			let isMember = false;
			let memberID = "";
			for (let i = 0; i < memberships.length; i++) {
				const m = memberships[i];
				if(members.findIndex(v=>v.id === m.id) > -1) {
					isMember = true;
					memberID = m.id;
					break;
				}
			}
			if(isMember) {
				//Get twitch user
				const userInfo = await TwitchUtils.getUserFromToken(request.headers.authorization || "");
				if(userInfo) {
					let json = {};
					if(fs.existsSync(Config.patreon2Twitch)) {
						json = JSON.parse(fs.readFileSync(Config.patreon2Twitch, "utf-8") || "{}");
					}

					let linkedCount = 0;
					// Count linked account
					for (const twitchId in json) {
						if(json[twitchId] == memberID) {
							linkedCount ++;
						}
					}

					if(linkedCount >= 2) {
						response.header('Content-Type', 'application/json');
						response.status(401);
						response.send(JSON.stringify({success:false, errorCode:"MAX_LINKED_ACCOUNTS"}));
						return;
					}

					json[userInfo.user_id] = memberID;
					fs.writeFileSync(Config.patreon2Twitch, JSON.stringify(json), "utf-8");
				}
			}

			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, data:{isMember}}));
		}
	}

	/**
	 * Reset authentication
	 */
	public logout():void{
		clearTimeout(this.tokenRefresh);
		fs.rmSync(Config.patreonToken);
		this.authenticateLocal();//This will log the URI to call to authenticate the user
	}

	/**
	 * Refreshes the patrons list
	 * @param request
	 * @param response
	 * @returns success of request
	 */
	public async authenticateLocal():Promise<boolean> {
		let token:PatreonToken|null = null;
		if(fs.existsSync(Config.patreonToken)) {
			token = JSON.parse(fs.readFileSync(Config.patreonToken, "utf-8"));
		}
		if(token) {
			const url = new URL("https://www.patreon.com/api/oauth2/token");
			url.searchParams.append("grant_type", "refresh_token");
			url.searchParams.append("refresh_token", token.refresh_token);
			url.searchParams.append("client_id", Config.credentials.patreon_client_id_server);
			url.searchParams.append("client_secret", Config.credentials.patreon_client_secret_server);

			const result = await fetch(url, {method:"POST", headers:{"User-Agent":this.userAgent}});
			const json = await result.json();

			if(json.error) {
				Logger.error("[PATREON] authentication failed [invalid refresh token]");
				console.log(json.error);
				this.logout();
				return false;
			}else{
				token = json as PatreonToken;
				if(this.isFirstAuth){
					Logger.success("[PATREON] API ready");
				}
				fs.writeFileSync(Config.patreonToken, JSON.stringify(token), "utf-8");
				try {
					await this.getCampaignID();
					await this.refreshPatrons(this.campaignId, this.isFirstAuth);
					this.patreonApiDown = false;
				}catch(error) {
					this.patreonApiDown = true;
				}
				this.smsWarned = false;
				this.isFirstAuth = false;

				//Schedule token refresh
				clearTimeout(this.tokenRefresh);
				this.tokenRefresh = setTimeout(()=>{
					this.authenticateLocal();
				}, token.expires_in - 60000);

				return true;
			}

		}

		if(!token){
			Logger.warn("[PATREON] Please connect to patreon !", this.authURL);
			this.sendSMSAlert("Patreon authentication is down server-side! Click to auth "+this.authURL);
		}

		return false;
	}

	/**
	 * Gets if the patreon API is down
	 * @param request
	 * @param response
	 */
	public async getApiDown(request:FastifyRequest, response:FastifyReply):Promise<void> {
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:{isDown:this.patreonApiDown}}));
	}

	/**
	 * Called when redirecting from patreon to authenticate server
	 * @param request
	 * @param response
	 */
	public async getServerAuth(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const code:string = (request.query as any).code;
		const url = new URL("https://www.patreon.com/api/oauth2/token");
		url.searchParams.append("grant_type", "authorization_code");
		url.searchParams.append("code", code);
		url.searchParams.append("redirect_uri", Config.credentials.patreon_redirect_uri_server);
		url.searchParams.append("client_id", Config.credentials.patreon_client_id_server);
		url.searchParams.append("client_secret", Config.credentials.patreon_client_secret_server);

		const result = await fetch(url, {method:"POST", headers:{"User-Agent":this.userAgent}});

		if(result.status != 200) {
			Logger.error("[PATREON] Server auth failed: "+result.status);
			const reason = await result.text();
			response.status(500);
			response.header('Content-Type', 'text/html; charset=UTF-8');
			response.send("Patreon authentication failed. <a href=\""+this.authURL+"\">Try again</a><br>"+reason);
			response.send({success:false, message:"Authentication failed"});
			this.patreonApiDown = true;
			return;
		}

		const json = await result.json();

		if(json.error) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send({success:false, message:json.error});
		}else{
			const token:PatreonToken = json;
			json.expires_at = Date.now() + token.expires_in;
			//Save token
			fs.writeFileSync(Config.patreonToken, JSON.stringify(json), "utf-8");
			if(await this.authenticateLocal()) {
				response.header('Content-Type', 'text/html; charset=UTF-8');
				response.status(200);
				response.send("<div style=\"text-align:center; font-size:3em; width:100%;\">Patreon connection Done!<br>You can close this page.</div>");
				Logger.success("[PATREON] Server auth complete");
			}else{
				response.header('Content-Type', 'text/html; charset=UTF-8');
				response.status(500);
				response.send("Patreon authentication failed. <a href=\""+this.authURL+"\">Try again</a>");
				response.send({success:false, message:"Authentication failed"});
				Logger.success("[PATREON] Server auth failed");
			}
		}
	}

	/**
	 * Called by patreon when a there's a patron update
	 * @param request
	 * @param response
	 */
	public async postWebhookTrigger(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const event = request.headers["x-patreon-event"];
		const signature = request.headers["x-patreon-signature"];

		const hash = crypto.createHmac('md5', Config.credentials.patreon_webhook_secret)
		//@ts-ignore no typings for "rowBody" that is added by fastify-raw-body
		.update(request.rawBody)
		.digest('hex');

		if(signature != hash) {
			Logger.warn("[PATREON] Invalid webhook signature");
			response.status(401);
			response.send("Unauthorized");
			this.patreonApiDown = true;
			this.sendSMSAlert("Patreon Webhook failed, invalid signature "+signature);
			return;
		}

		Logger.success("[PATREON] received webhook event \""+event+"\"");
		response.status(200);
		response.send("OK");

		//Patreon sometimes sends double create webhook events.
		//Debounce it to avoid concurrent patrons updates
		if(this.webhookDebounce)clearTimeout(this.webhookDebounce);
		this.webhookDebounce = setTimeout(() => {
			this.refreshPatrons(this.campaignId, event != "members:create");

			if(event == "members:create") {
				//Force a second refresh 10s after an account creation
				//I've had a case of user not being counted as member right after donating, I'm suspecting
				//that's because I requested too quick but I'm not sure at all.
				//Although new members are not yet approved as patreon members, they usually have the
				//given amount returned. That time it apparently didn't.
				//This second call is here in case I called Patreon too early after member's creation.
				setTimeout(()=>{
					this.refreshPatrons(this.campaignId, true);
				}, 10000);
			}
		}, 2000);
		this.patreonApiDown = false;
	}

	/**
	 * Called by patreon when a there's a patron update on user's campaign
	 * NOT used for my own updates, fors this: @see postWebhookTrigger()
	 * @param request
	 * @param response
	 */
	public async postWebhookUserTrigger(request:FastifyRequest, response:FastifyReply):Promise<void> {
		//Retreive user ID from query path
		const { uid } = request.params as any;

		//Get webhook secret
		const filePath = Config.patreonUid2WebhookSecret;
		const json = JSON.parse(fs.existsSync(filePath)? fs.readFileSync(filePath, "utf8") : "{}");
		const {twitchId, secret} = json[uid];

		//Verify signature
		const event = request.headers["x-patreon-event"];
		const signature = request.headers["x-patreon-signature"];
		const hash = crypto.createHmac('md5', secret)
		//@ts-ignore no typings for "rowBody" that is added by fastify-raw-body
		.update(request.rawBody)
		.digest('hex');
		
		Logger.success("[PATREON] received webhook event \""+event+"\" for user ", uid, "(twitch:"+twitchId+")");

		if(signature != hash) {
			Logger.warn("[PATREON] Invalid webhook signature for user", uid, "(twitch:"+twitchId+")");
			response.status(401);
			response.send("Unauthorized");
			return;
		}

		Utils.logToFile("patreon", JSON.stringify({type:event, data:request.body}));

		if(event === "members:create") {
			this.uidToFirstPayment[uid] = true;
		}else
		if(event === "members:update") {
			const message = request.body as WebhookMemberCreateEvent;
			//Only accept "paid" status
			if(message.data.attributes.last_charge_status.toLowerCase() == "paid") {
				const membershipDuration = Math.abs(new Date(message.data.attributes.pledge_relationship_start).getTime() - new Date(message.data.attributes.last_charge_date).getTime());
				if((membershipDuration < 20*24*60*60*1000 && this.uidToFirstPayment[uid] !== false) || this.uidToFirstPayment[uid] === true) {
					this.uidToFirstPayment[uid] = false;
					const user = message.included.find(v=>v.type == "user");
					const tier = message.included.find(v=>v.type == "tier");
					//Broadcast to client
					SSEController.sendToUser(twitchId, "PATREON_MEMBER_CREATE", {
						uid,
						user: {
							username: user?.attributes.full_name || message.data.attributes.full_name,
							avatar: user?.attributes.image_small_url || user?.attributes.image_url || user?.attributes.thumb_url,
							url: user?.attributes.url,
						},
						tier: {
							amount:(tier?.attributes.amount_cents || message.data.attributes.currently_entitled_amount_cents || 0)/100,
							title:tier?.attributes.title || "",
							description:tier?.attributes.description || "",
						}
					});
				}
			}
		}

		response.status(200);
		response.send("OK");
	}

	/**
	 * Refreshes the patrons list
	 * @param request
	 * @param response
	 */
	public async refreshPatrons(campaignId:string, verbose:boolean = true):Promise<void> {
		const {members, success, error} = await this.loadCampaignMembers(campaignId);
		if(success === false) {
			if(verbose) {
				Logger.error("[PATREON] Refreshing member list failed");
				if(error) console.log(error);
			}
			this.logout();
			throw("Error");
		}

		if(members) {
			if(verbose) Logger.info("[PATREON] "+members.length+" members loaded");
	
			//Only keep active patrons
			const filteredMembers = members.filter(v=>v.attributes.patron_status === "active_patron")
			.filter(v=>v.relationships.currently_entitled_tiers.data.length > 0
				//If current tier value is greater than the minimum (to refuse custom amounts lower than that)
				|| v.attributes.currently_entitled_amount_cents > this.MIN_AMOUNT
				//Specific tier exception
				|| v.relationships.currently_entitled_tiers.data.find(v=>v.id == this.MIN_AMOUNT_TIER_ID_EXCEPTION))
			.map(v =>{
				const member:PatreonMember = {
					id:v.id,
					name:v.attributes.full_name,
					total:Math.max(v.attributes.lifetime_support_cents, v.attributes.currently_entitled_amount_cents)/100,
				};
				return member;
			});
	
			if(verbose) Logger.info("Patreon: "+filteredMembers.length+" active members");
			// fs.writeFileSync(Config.patreonMembers.replace(".json", "_src.json"), JSON.stringify(json.data), "utf-8");
			fs.writeFileSync(Config.patreonMembers, JSON.stringify(filteredMembers), "utf-8");
		}
	}

	/**
	 * Get user's campaign
	 * @param request
	 * @param response
	 */
	private async getCampaignID():Promise<void> {
		const url = new URL("https://www.patreon.com/api/oauth2/v2/campaigns");
		const token = JSON.parse(fs.readFileSync(Config.patreonToken, "utf-8")) as PatreonToken;
		const options = {
			method:"GET",
			headers: {
				"Authorization":"Bearer "+token.access_token,
				"User-Agent":this.userAgent,
			}
		};

		const result = await fetch(url, options);
		if(result.status != 200) {
			Logger.error("[PATREON] campaign list failed");
			console.log(await result.text());
			throw("Error");

		}else{
			const json = await result.json();
			if(json.errors) {
				Logger.error("[PATREON] campaign list failed");
				console.log(json.errors[0].detail);
				this.logout();
			}else{
				if(json.data?.length === 0) {
					Logger.error("[PATREON] no campaign found");
				}else{
					this.campaignId = json.data[0].id;
				}
			}
		}
	}

	/**
	 * Send myself an SMS if something went wrong
	 */
	private sendSMSAlert(message:string):void {
		if(!this.smsWarned && Config.SMS_WARN_PATREON_AUTH
		&& Config.credentials.sms_uid && Config.credentials.sms_token) {
			const urlSms = new URL("https://smsapi.free-mobile.fr/sendmsg");
			urlSms.searchParams.append("user", Config.credentials.sms_uid);
			urlSms.searchParams.append("pass", Config.credentials.sms_token);
			urlSms.searchParams.append("msg", message);
			fetch(urlSms, {method:"GET"});
			this.smsWarned = true;
			this.patreonApiDown = true;
		}
	}

	/**
	 * Load all users for given campaign ID
	 * @param campaignId 
	 * @param offset 
	 * @param memberList 
	 * @returns 
	 */
	private async loadCampaignMembers(campaignId:string, offset?:string, memberList:any[] = []):Promise<{success:boolean, error?:string[], members?:PatreonMemberships["data"][0][]}> {
		const url = new URL("https://www.patreon.com/api/oauth2/v2/campaigns/"+campaignId+"/members");
		url.searchParams.append("include", "currently_entitled_tiers");
		url.searchParams.append("fields[member]", "full_name,is_follower,last_charge_date,last_charge_status,lifetime_support_cents,currently_entitled_amount_cents,patron_status");
		url.searchParams.append("fields[tier]", "amount_cents,created_at,description,discord_role_ids,edited_at,patron_count,published,published_at,requires_shipping,title,url");
		url.searchParams.append("fields[address]", "addressee,city,line_1,line_2,phone_number,postal_code,state");
		url.searchParams.append("page[size]", "1000");

		if(offset) url.searchParams.append("page[cursor]", offset);

		const token = JSON.parse(fs.readFileSync(Config.patreonToken, "utf-8")) as PatreonToken;
		const options = {
			method:"GET",
			headers:{
				authorization:"Bearer "+token.access_token,
				"User-Agent":this.userAgent,
			}
		};

		const result = await fetch(url, options);
		if(result.status != 200) {
			return {success:false};
		}
		const json:PatreonMemberships = await result.json();
		if(json.errors) {
			return {success:false, error:json.errors.map(v=>v.detail)};
		}else{
			memberList.push(...json.data);

			const next = json.meta.pagination?.cursors?.next;
			if(next) {
				//load next page
				this.loadCampaignMembers(campaignId, next, memberList);
			}else {
				return {success:true, members:memberList};
			}
		}
		return {success:false};
	}

	/**
	 * Load campaign ID details
	 * @param campaignId 
	 * @param offset 
	 * @param memberList 
	 * @returns 
	 */
	private async loadCampaign(campaignId:string,):Promise<{success:boolean, error?:string[], campaign?:unknown}> {
		const url = new URL("https://www.patreon.com/api/oauth2/v2/campaigns/"+campaignId);
		url.searchParams.append("fields[campaign]", "created_at,creation_name,discord_server_id,image_small_url,image_url,is_charged_immediately,is_monthly,main_video_embed,main_video_url,one_liner,one_liner,patron_count,pay_per_name,pledge_url,published_at,summary,thanks_embed,thanks_msg,thanks_video_url");

		const token = JSON.parse(fs.readFileSync(Config.patreonToken, "utf-8")) as PatreonToken;
		const options = {
			method:"GET",
			headers:{
				authorization:"Bearer "+token.access_token,
				"User-Agent":this.userAgent,
			}
		};

		const result = await fetch(url, options);
		if(result.status != 200) {
			return {success:false};
		}
		const json:PatreonMemberships = await result.json();
		if(json.errors) {
			return {success:false, error:json.errors.map(v=>v.detail)};
		}else{
			return {success:true, campaign:json};
		}
		return {success:false};
	}

}

interface PatreonToken {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	scope: string;
	token_type: string;
	expires_at: number;
}

export interface PatreonMember {
	id: string;
	name: string;
	total: number;
}

interface PatreonMemberships {
	errors?:{
		detail:string;
	}[];
	data: {
		attributes: {
			currently_entitled_amount_cents: number
			full_name: string
			is_follower: boolean
			last_charge_date?: string
			last_charge_status?: string
			lifetime_support_cents: number
			patron_status?: string
		}
		id: string
		relationships: {
			currently_entitled_tiers: {
				data: {
					id: string
					type: string
				}[]
			}
			type: string
		}
	}[]
	included: {
		attributes: {
			amount_cents: number
			created_at: string
			description: string
			discord_role_ids: string[]
			edited_at: string
			patron_count: number
			published: boolean
			published_at?: string
			requires_shipping: boolean
			title: string
			url: string
		}
		id: string
		type: string
	}[]
	meta: {
		pagination?: {
			cursors?: {
				next?: string;
			};
			total: number
		}
	}
}

interface WebhookEntry {
	attributes: {
		last_attempted_at: any
		num_consecutive_times_failed: number
		paused: boolean
		secret: string
		triggers: string[]
		uri: string
	}
	id: string
	type: string
}

interface WebhookMemberCreateEvent {
	data: {
		attributes: {
			campaign_lifetime_support_cents: number;
			currently_entitled_amount_cents: number;
			email: string;
			full_name: string;
			is_follower: boolean;
			is_free_trial: boolean;
			last_charge_date: string;
			last_charge_status: string;
			lifetime_support_cents: number;
			next_charge_date: string;
			note: string;
			patron_status: string;
			pledge_cadence: number;
			pledge_relationship_start: string;
			will_pay_amount_cents: number;
		};
		id: string;
		relationships: {
			address: {
				data: any;
			};
			campaign: {
				data: {
					id: string;
					type: string;
				};
				links: {
					related: string;
				};
			};
			currently_entitled_tiers: {
				data: any[];
			};
			user: {
				data: {
					id: string;
					type: string;
				};
				links: {
					related: string;
				};
			};
		};
		type: string;
	};
	included: {
		attributes: {
			created_at?: string;
			creation_name?: string;
			discord_server_id?: string;
			google_analytics_id: any;
			has_rss?: boolean;
			has_sent_rss_notify?: boolean;
			image_small_url?: string;
			image_url: string;
			is_charged_immediately?: boolean;
			is_monthly?: boolean;
			is_nsfw?: boolean;
			main_video_embed: any;
			main_video_url: any;
			one_liner: any;
			patron_count?: number;
			pay_per_name?: string;
			pledge_url?: string;
			published_at?: string;
			rss_artwork_url: any;
			rss_feed_title: any;
			summary?: string;
			thanks_embed?: string;
			thanks_msg?: string;
			thanks_video_url: any;
			url: string;
			vanity?: string;
			about?: string;
			created?: string;
			first_name?: string;
			full_name?: string;
			hide_pledges?: boolean;
			is_creator?: boolean;
			last_name?: string;
			like_count?: number;
			title?: string;
			amount_cents?: number;
			description?: string;
			discord_role_ids?: unknown[]
			edited_at?: string;
			post_count?: number;
			published?: true;
			remaining?: null;
			requires_shipping?: false;
			unpublished_at?: null;
			user_limit?: unknown;
			social_connections?: {
				discord: {
					user_id: string;
				};
				facebook: any;
				google: any;
				instagram: any;
				reddit: any;
				spotify: any;
				spotify_open_access: any;
				tiktok: any;
				twitch: any;
				twitter: any;
				twitter2: any;
				vimeo: any;
				youtube: any;
			};
			thumb_url?: string;
		};
		id: string;
		type: "campaign" | "user" | "tier";
	}[];
	links: {
		self: string;
	};
}