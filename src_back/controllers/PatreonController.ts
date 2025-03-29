import * as crypto from "crypto";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import fetch from "node-fetch";
import Config from "../utils/Config.js";
import Logger from "../utils/Logger.js";
import { TwitchToken } from "../utils/TwitchUtils.js";
import Utils from "../utils/Utils.js";
import AbstractController from "./AbstractController.js";
import SSEController from "./SSEController.js";

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
	private campaignCache:Record<string, Awaited<ReturnType<typeof this.getCampaignID>>> = {};

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
		this.server.get('/api/patreon/serverauth', async (request, response) => await this.getServerAuth(request, response));
		this.server.get('/api/patreon/isApiDown', async (request, response) => await this.getApiDown(request, response));
		this.server.post('/api/patreon/webhook', async (request, response) => await this.postWebhookTrigger(request, response));

		this.server.get('/api/patreon/user/memberList', async (request, response) => await this.getUserMemberList(request, response));
		this.server.get('/api/patreon/user/isMember', async (request, response) => await this.getUserIsMember(request, response));
		this.server.post('/api/patreon/user/webhook/:uid', async (request, response) => await this.postUserWebhookTrigger(request, response));
		this.server.post('/api/patreon/user/authenticate', async (request, response) => await this.postUserAuthenticate(request, response));
		this.server.post('/api/patreon/user/disconnect', async (request, response) => await this.disconnectUser(request, response));

		if(Config.credentials.patreon_client_id_server && Config.credentials.patreon_client_secret_server) {
			const keyUint8 = new Uint8Array(Buffer.from(Config.credentials.patreon_cipherKey, 'hex'));
			if (keyUint8.length !== 32) {
				Logger.error('Credential\'s "patreon_cipherKey" key must be 32 bytes (64 chars hexa string). Got', keyUint8.length, "("+Config.credentials.patreon_cipherKey+"). Please make sure value is an hexadecimal string");
			}
			if (!/https:.*\/api\/patreon\/user\/webhook\/\{ID\}/gi.test(Config.credentials.patreon_webhook_url)) {
				Logger.error('Credential\'s "patreon_webhook_url" must be a valid URL. Must be secured (https) and end with "/api/patreon/user/webhook/{ID}". Got: '+Config.credentials.patreon_webhook_url);
			}
			this.rebuildUserWebhooks();
			this.authenticateLocal();
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
	public async postUserAuthenticate(request:FastifyRequest, response:FastifyReply):Promise<void> {
		try {

			const twitchUser = await this.twitchUserGuard(request, response);
			if(!twitchUser) return;

			const body:any = request.body;
			const url = new URL("https://www.patreon.com/api/oauth2/token");
			url.searchParams.append("grant_type", "authorization_code");
			url.searchParams.append("code", body.code);
			url.searchParams.append("redirect_uri", body.redirect_uri);
			url.searchParams.append("client_id", Config.credentials.patreon_client_id);
			url.searchParams.append("client_secret", Config.credentials.patreon_client_secret);

			const result = await fetch(url, {method:"POST", headers:{"User-Agent":this.userAgent}});
			if(result.status == 200) {
				const token = await result.json() as PatreonToken & { error?: string; };

				if(token.error) {
					response.header('Content-Type', 'application/json');
					response.status(500);
					response.send({success:false, message:token.error});
				}else{
					let json = {};
					if(fs.existsSync(Config.twitch2PatreonToken)) {
						json = JSON.parse(fs.readFileSync(Config.twitch2PatreonToken, "utf-8") || "{}");
					}
					json[twitchUser.user_id] = Utils.encrypt(JSON.stringify(token));
					fs.writeFileSync(Config.twitch2PatreonToken, JSON.stringify(json), "utf-8");

					response.header('Content-Type', 'application/json');
					response.status(200);
					response.send(JSON.stringify({success:true}));
				}
			}else{
				Logger.error("[PATREON][USER] "+twitchUser.login+" failed authenticating with Patreon with status:", result.status);
				console.log(await result.text());
				throw new Error("auth failed")
			}
		}catch(error) {
			console.log(error)
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send({success:false, message:"Authentication failed"});
		}
	}

	/**
	 * Disconnects a user.
	 * Removes their webhook and cleanup their token/secret from file system
	 * @param request
	 * @param response
	 */
	public async disconnectUser(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const patreonAuth = await this.getPatreonTokenFromTwitchToken(request, response);
		if(!patreonAuth) return;

		//Delete auth token
		let jsonAuth = {};
		if(fs.existsSync(Config.twitch2PatreonToken)) {
			jsonAuth = JSON.parse(fs.readFileSync(Config.twitch2PatreonToken, "utf-8") || "{}");
		}
		delete jsonAuth[patreonAuth.twitchUser.user_id];
		fs.writeFileSync(Config.twitch2PatreonToken, JSON.stringify(jsonAuth), "utf-8");

		//Search if a webhook exists
		const webhookRes = await this.getUserWebhook(request, response, patreonAuth);
		if(!webhookRes || !webhookRes.webhookID) return;

		if(patreonAuth.token.scope.includes("w:campaigns.webhook")) {
			//Delete webhook
			const webhook = webhookRes;
			const headers = {
				'Content-Type': 'application/json',
				"Authorization":"Bearer "+patreonAuth.token.access_token,
				"User-Agent":this.userAgent,
			};
			const result = await fetch("https://www.patreon.com/api/oauth2/v2/webhooks/"+webhook.webhookID, {method:"DELETE", headers});
			if(result.status == 429) {
				Logger.warn("[PATREON][USER] Rate limited disconnectUser for user "+patreonAuth.twitchUser.login+", retrying in a few seconds");
				const json:{errors:{retry_after_seconds:number}[]} = await result.json();
				let delay = (json.errors ||[{retry_after_seconds:Math.random()*3 + 1}])[0].retry_after_seconds * 1000;
				await Utils.promisedTimeout(delay);
				return this.disconnectUser(request, response);
			}else if(result.status != 204) {
				Logger.error("[PATREON][USER] Webhook deletion failed for user "+patreonAuth.twitchUser.login);
				console.log(await result.text());
			}else{
				//Delete webhook secret ref
				const filePath = Config.patreonUid2WebhookSecret;
				const json = JSON.parse(fs.existsSync(filePath)? fs.readFileSync(filePath, "utf8") : "{}") as {[id:string]:{twitchId:string, secret:string}};
				Logger.info("[PATREON][USER] Delete user webhook for", json[webhook.campaignID].twitchId);
				delete json[webhook.campaignID];
				fs.writeFileSync(filePath, JSON.stringify(json), "utf8");
			}
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));

	}

	/**
	 * Get current user's info
	 * Creates webhooks if necessary.
	 * @param request
	 * @param response
	 */
	public async getUserIsMember(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const patreonAuth = await this.getPatreonTokenFromTwitchToken(request, response);
		if(!patreonAuth) return;

		const url = "https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields%5Buser%5D=about,created,first_name,last_name,image_url,url,vanity&fields%5Bcampaign%5D=summary,is_monthly";
		const options = {
			method:"GET",
			headers: {
				"Authorization":"Bearer "+patreonAuth.token.access_token,
				"User-Agent":this.userAgent,
			}
		}

		const result = await fetch(url, options);
		if(result.status == 429) {
			Logger.warn("[PATREON][USER] Rate limited getUserIsMember for user "+patreonAuth.twitchUser.login+", retrying in a few seconds");
			const json:{errors:{retry_after_seconds:number}[]} = await result.json();
			let delay = (json.errors ||[{retry_after_seconds:Math.random()*3 + 1}])[0].retry_after_seconds * 1000;
			await Utils.promisedTimeout(delay);
			return this.getUserIsMember(request, response);
		}else{
			const json = await result.json();

			if(json.error) {
				response.header('Content-Type', 'application/json');
				response.status(500);
				response.send({success:false, message:json.error});
			}else{
				const localMemberList:PatreonMember[] = JSON.parse(fs.readFileSync(Config.patreonMembers, "utf-8"));
				const remoteMembershipList = json.data.relationships.memberships.data as {id:string, type:string}[];

				//Check if remote patreon user is registered as a member locally
				let isMember = Config.credentials.admin_ids.includes(patreonAuth.twitchUser.user_id);
				let memberID = "";
				for (let i = 0; i < remoteMembershipList.length; i++) {
					const m = remoteMembershipList[i];
					if(localMemberList.findIndex(v=>v.id === m.id) > -1) {
						isMember = true;
						memberID = m.id;
						break;
					}
				}

				//User is premium?
				if(isMember || this.isUserPremium(patreonAuth.twitchUser.user_id)) {
					//MemberID is empty if user got premium granted and isn't part of patreon donors
					//Ignore this case
					if(memberID) {
						let linkedCount = 0;
						let twitch2Patreon = {};
						if(fs.existsSync(Config.twitch2Patreon)) {
							twitch2Patreon = JSON.parse(fs.readFileSync(Config.twitch2Patreon, "utf-8") || "{}");
						}

						// Count linked accounts
						for (const twitchId in twitch2Patreon) {
							if(twitch2Patreon[twitchId] == memberID) {
								linkedCount ++;
							}
						}
						twitch2Patreon[patreonAuth.twitchUser.user_id] = memberID;
						fs.writeFileSync(Config.twitch2Patreon, JSON.stringify(twitch2Patreon), "utf-8");

						//Check if user has already linked 2 accounts or more
						if(linkedCount >= 2) {
							response.header('Content-Type', 'application/json');
							response.status(401);
							response.send(JSON.stringify({success:false, errorCode:"MAX_LINKED_ACCOUNTS"}));
							return;
						}
					}

					if(patreonAuth.token.scope.includes("w:campaigns.webhook")) {
						await this.createUserWebhook(request, response, patreonAuth, false);
					}else{
						Logger.warn("[PATREON][USER] User "+patreonAuth.twitchUser.login+" doesn't have the required scope to create webhooks. User only granted "+patreonAuth.token.scope);
					}
				}

				response.header('Content-Type', 'application/json');
				response.status(200);
				response.send(JSON.stringify({success:true, data:{isMember}}));
			}
		}
	}

	/**
	 * Get user's member list
	 * @param request
	 * @param response
	 */
	public async getUserMemberList(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const patreonAuth = await this.getPatreonTokenFromTwitchToken(request, response);
		if(!patreonAuth) return;

		let memberList:PatreonMemberships["data"][0][] = [];
		let campaign:Awaited<ReturnType<typeof this.getCampaignID>> = false;
		try {
			campaign = await this.getCampaignID(patreonAuth.token.access_token);
		}catch(error) {
			//Couldn't load campaign
			Logger.error("[PATREON] campaigns loading failed for ", patreonAuth.twitchUser.login);
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send({success:false, message:"couldn't load campaigns", errorCode:"CAMPAIGN_LOAD_FAILED"});
		}
		if(!campaign) {
			campaign = {
				id:"",
				tiers:[],
			}
		}else{
			const campaignMembers = await this.loadCampaignMembers(patreonAuth.token.access_token, campaign.id);
			if(campaignMembers.members) {
				campaignMembers.members = campaignMembers.members.filter(v=>v.attributes.patron_status === "active_patron");
				memberList = campaignMembers.members;
			}else{
				Logger.error("Something went wrong loading campaign members");
			}
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:{memberList, tierList:campaign.tiers}}));
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
				Logger.error("[PATREON][SERVICE] authentication failed [invalid refresh token]");
				console.log(json.error);
				this.logout();
				return false;
			}else{
				token = json as PatreonToken;
				// if(this.isFirstAuth){
					Logger.success("[PATREON][SERVICE] API ready");
				// }
				fs.writeFileSync(Config.patreonToken, JSON.stringify(token), "utf-8");
				try {
					const token = JSON.parse(fs.readFileSync(Config.patreonToken, "utf-8")) as PatreonToken;
					const campaignId = await this.getCampaignID(token.access_token);
					if(campaignId === false) {
						this.logout();
						return false;
					}
					this.campaignId = campaignId.id;
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

				//Node has a upper limit of 2147483647 seconds for timeouts
				}, Math.max(0, Math.min(2147483647, token.expires_in*1000 - 60000)));

				return true;
			}

		}

		if(!token){
			Logger.warn("[PATREON][SERVICE] Please connect to patreon !", this.authURL);
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
			Logger.error("[PATREON][SERVICE] Server auth failed: "+result.status);
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
				Logger.success("[PATREON][SERVICE] Server auth complete");
			}else{
				response.header('Content-Type', 'text/html; charset=UTF-8');
				response.status(500);
				response.send("Patreon authentication failed. <a href=\""+this.authURL+"\">Try again</a>");
				response.send({success:false, message:"Authentication failed"});
				Logger.success("[PATREON][SERVICE] Server auth failed");
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
			Logger.warn("[PATREON][SERVICE] Invalid webhook signature");
			response.status(401);
			response.send("Unauthorized");
			this.patreonApiDown = true;
			this.sendSMSAlert("Patreon Webhook failed, invalid signature "+signature);
			return;
		}

		Logger.success("[PATREON][SERVICE] received webhook event \""+event+"\"");
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
	 * Called by patreon when there's a patron update on user's campaign
	 * NOT used for my own updates, for this: @see postWebhookTrigger()
	 * @param request
	 * @param response
	 */
	public async postUserWebhookTrigger(request:FastifyRequest, response:FastifyReply):Promise<void> {
		//Retreive user ID from query path
		const { uid } = request.params as any;
		const event = request.headers["x-patreon-event"];

		//Get webhook secret and twitch user ID
		const filePath = Config.patreonUid2WebhookSecret;
		const json = JSON.parse(fs.existsSync(filePath)? fs.readFileSync(filePath, "utf8") : "{}");
		const {twitchId, secret} = json[uid];

		//If user isn't premium, ignore event
		if(!this.isUserPremium(twitchId)) {
			Logger.warn("[PATREON][USER] received webhook event \""+event+"\" for user ", uid, "(twitch:"+twitchId+") but user is not premium, ignore it");
			response.status(200);
			response.send("OK");
			return;
		}

		try {

			//Verify signature
			const signature = request.headers["x-patreon-signature"];
			const hash = crypto.createHmac('md5', secret)
			//@ts-ignore no typings for "rowBody" that is added by fastify-raw-body
			.update(request.rawBody)
			.digest('hex');

			Logger.success("[PATREON][USER] received webhook event \""+event+"\" for user", uid, "(twitch:"+twitchId+")");

			if(signature != hash) {
				Logger.warn("[PATREON][USER] Invalid webhook signature for user", uid, "(twitch:"+twitchId+")");
				response.status(401);
				response.send("Unauthorized");
				return;
			}

			Utils.logToFile("patreon", JSON.stringify({type:event, data:request.body}));

			if(event === "members:create") {
				const message = request.body as WebhookMemberCreateEvent;
				this.uidToFirstPayment[message.data.relationships.user.data.id] = true;
			}else
			if(event === "members:update") {
				const message = request.body as WebhookMemberUpdateEvent;
				//Only accept "paid" status
				if(message.data.attributes.last_charge_status?.toLowerCase() == "paid"
				&& message.data.attributes.patron_status == "active_patron") {
					const membershipDuration = Math.abs(new Date(message.data.attributes.pledge_relationship_start).getTime() - new Date(message.data.attributes.last_charge_date).getTime());
					if(this.uidToFirstPayment[message.data.relationships.user.data.id] === true
					|| (
						membershipDuration < 20*24*60*60*1000
						&& this.uidToFirstPayment[message.data.relationships.user.data.id] !== false
					)) {
						this.uidToFirstPayment[message.data.relationships.user.data.id] = false;
						const user = message.included.find(v=>v.type == "user");
						const tier = message.included.find(v=>v.type == "tier");
						const username = user?.attributes.full_name || message.data.attributes.full_name;
						Logger.info("[PATREON] User "+uid+" subscribed with tier \""+tier?.attributes.title+"\" on channel #"+twitchId);
						//Broadcast to client
						SSEController.sendToUser(twitchId, "PATREON_MEMBER_CREATE", {
							uid,
							user: {
								username,
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
		}catch(error) {
			Logger.error("[PATREON][USER] Error while processing webhook event "+event+" for user "+uid);
			console.log(error);
		}

		response.status(200);
		response.send("OK");
	}




	/******************
	* UTILITY METHODS *
	******************/

	/**
	 * Refreshes the patrons list
	 * @param request
	 * @param response
	 */
	public async refreshPatrons(campaignId:string, verbose:boolean = true):Promise<void> {
		const token = JSON.parse(fs.readFileSync(Config.patreonToken, "utf-8")) as PatreonToken;
		const {members, success, error} = await this.loadCampaignMembers(token.access_token, campaignId);
		if(success === false) {
			if(verbose) {
				Logger.error("[PATREON][SERVICE] Refreshing member list failed");
				if(error) console.log(error);
			}
			this.logout();
			throw("Error");
		}

		if(members) {
			if(verbose) Logger.info("[PATREON][SERVICE] "+members.length+" members loaded");

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

			if(verbose) Logger.info("[PATREON][SERVICE] "+filteredMembers.length+" active members");
			// fs.writeFileSync(Config.patreonMembers.replace(".json", "_src.json"), JSON.stringify(json.data), "utf-8");
			fs.writeFileSync(Config.patreonMembers, JSON.stringify(filteredMembers), "utf-8");
		}
	}

	/**
	 * Get user's campaign
	 * @param request
	 * @param response
	 */
	private async getCampaignID(accessToken:string):Promise<{id:string, tiers:{
		attributes: {
			amount_cents: number,
			description: string,
			image_url: null|string,
			published: true,
			published_at: string,
			title: string,
		},
		id: string,
		type: string,
	}[]}|false> {
		if(this.campaignCache[accessToken]) return this.campaignCache[accessToken];
		const url = new URL("https://www.patreon.com/api/oauth2/v2/campaigns");
		url.searchParams.append("include", "tiers");
		url.searchParams.append("fields[campaign]", "creation_name,patron_count,image_small_url");
		url.searchParams.append("fields[tier]", "amount_cents,description,title,image_url,published,published_at");
		const options = {
			method:"GET",
			headers: {
				"Authorization":"Bearer "+accessToken,
				"User-Agent":this.userAgent,
			}
		};

		const result = await fetch(url, options);
		if(result.status != 200) {
			if(result.status == 429) {
				Logger.warn("[PATREON] Rate limited getCampaignID");
			}
			Logger.error("[PATREON] campaign list failed");
			console.log(await result.text());
			throw("Error");

		}else{
			const json = await result.json();
			if(json.errors) {
				Logger.error("[PATREON] campaign list failed");
				console.log(json.errors[0].detail);
			}else if(json.data?.length > 0) {
				const res = {id:json.data[0].id, tiers:json.included.filter(v=>v.type == "tier")};
				this.campaignCache[accessToken] = res;
				return res;
			}
		}
		return false;
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
	private async loadCampaignMembers(accessToken:string, campaignId:string, offset?:string, memberList:any[] = []):Promise<{success:boolean, error?:string[], members?:PatreonMemberships["data"][0][]}> {
		const url = new URL("https://www.patreon.com/api/oauth2/v2/campaigns/"+campaignId+"/members");
		url.searchParams.append("include", "currently_entitled_tiers,pledge_history");
		url.searchParams.append("fields[member]", "full_name,lifetime_support_cents,currently_entitled_amount_cents,patron_status");
		url.searchParams.append("fields[tier]", "amount_cents,description,patron_count,published,title,url");
		url.searchParams.append("page[size]", "1000");

		if(offset) url.searchParams.append("page[cursor]", offset);

		const options = {
			method:"GET",
			headers:{
				authorization:"Bearer "+accessToken,
				"User-Agent":this.userAgent,
			}
		};

		const result = await fetch(url, options);
		if(result.status != 200) {
			if(result.status == 429) {
				Logger.warn("[PATREON] Rate limited loadCampaignMembers for campaign "+campaignId+", retrying in a few seconds");
				const json:{errors:{retry_after_seconds:number}[]} = await result.json();
				let delay = (json.errors ||[{retry_after_seconds:Math.random()*3 + 1}])[0].retry_after_seconds * 1000;
				await Utils.promisedTimeout(delay);
				return this.loadCampaignMembers(accessToken, campaignId, offset, memberList);
			}else{
				Logger.warn("[PATREON] Failed loadCampaignMembers for campaign "+campaignId+"");
				console.log(await result.text());
			}
			return {success:false, error:["Status "+result.status.toString()]};
		}else{
			const json:PatreonMemberships = await result.json();
			if(json.errors) {
				return {success:false, error:json.errors.map(v=>v.detail)};
			}else{
				memberList.push(...json.data);

				const next = json.meta.pagination?.cursors?.next;
				if(next) {
					//load next page
					return this.loadCampaignMembers(accessToken, campaignId, next, memberList);
				}else {
					return {success:true, members:memberList};
				}
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
	private async loadCampaign(campaignId:string):Promise<{success:boolean, error?:string[], campaign?:unknown}> {
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
	}

	/**
	 * Get a Patreon token from a twitch user ID
	 * @param twitchId
	 * @returns
	 */
	private async getPatreonTokenFromTwitchToken(request:FastifyRequest, response:FastifyReply):Promise<false|{twitchUser:TwitchToken, token:PatreonToken}> {
		const twitchUser = await this.twitchUserGuard(request, response);
		if(!twitchUser) return false;

		let json = {};
		let errorMessage = "";
		let errorCode = "";
		if(fs.existsSync(Config.twitch2PatreonToken)) {
			json = JSON.parse(fs.readFileSync(Config.twitch2PatreonToken, "utf-8") || "{}");
		}

		if(!json[twitchUser.user_id]) {
			errorCode = "NOT_CONNECTED";
			errorMessage = "user isn't connected to Patreon";
		}else{
			try {
				const token = JSON.parse(Utils.decrypt(json[twitchUser.user_id])) as PatreonToken;
				//Refresh token if necessary (give it 1 minute of margin)
				if(token.expires_at > Date.now() - 60000) {
					const newToken = await this.refreshUserToken(token, twitchUser.user_id);
					if(newToken) {
						return  { twitchUser, token:newToken };
					}else{
						errorCode = "INVALID_TOKEN";
						errorMessage = "could not refresh token";
					}
				}else{
					return {twitchUser, token};
				}
			}catch(error) {
				errorCode = "INVALID_TOKEN";
				errorMessage = "could not decrypt token";
			}
		}
		response.header('Content-Type', 'application/json');
		response.status(401);
		response.send({success:false, message:errorMessage, errorCode});
		return false;
	}

	/**
	 * Create a webhook on the user's account to get notified about donations
	 * @param request
	 * @param response
	 */
	private async createUserWebhook(request, response, patreonAuth:Awaited<ReturnType<typeof this.getPatreonTokenFromTwitchToken>>, resolveQuery:boolean = true):Promise<boolean> {
		try {
			const webhookRes = await this.getUserWebhook(request, response, patreonAuth, resolveQuery);
			if(!webhookRes) return false;

			//Webhook already exists, no need to create it, stop there
			if(webhookRes.webhookExists) return true;
			if(!patreonAuth) return false;
			const headers = {
				'Content-Type': 'application/json',
				"Authorization":"Bearer "+patreonAuth.token.access_token,
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
			if(resultWebhook.status == 429) {
				Logger.warn("[PATREON][USER] Rate limited createUserWebhook for user "+patreonAuth.twitchUser.login+", retrying in a few seconds");
				const json:{errors:{retry_after_seconds:number}[]} = await resultWebhook.json();
				let delay = (json.errors ||[{retry_after_seconds:Math.random()*3 + 1}])[0].retry_after_seconds * 1000;
				await Utils.promisedTimeout(delay);
				return this.createUserWebhook(request, response, patreonAuth);
			}else{
				const jsonWebhook = await resultWebhook.json() as {data:WebhookEntry, errors?:unknown[]};
				if(jsonWebhook.errors) {
					Logger.error("[PATREON][USER] creating webhook failed");
					console.log(jsonWebhook);
					if(resolveQuery) {
						response.header('Content-Type', 'application/json');
						response.status(500);
						response.send({success:false, message:jsonWebhook.errors});
					}
					return false;
				}else{
					Logger.info("[PATREON][USER] Create user webhook for", webhookRes.user.login);
					//Save webhook secret
					const filePath = Config.patreonUid2WebhookSecret;
					const json = JSON.parse(fs.existsSync(filePath)? fs.readFileSync(filePath, "utf8") : "{}");
					json[webhookRes.campaignID] = {twitchId:webhookRes.user.user_id, secret:jsonWebhook.data.attributes.secret};
					fs.writeFileSync(filePath, JSON.stringify(json), "utf8");

					return true;
				}
			}
		}catch(error) {
			console.log(error)
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send({success:false, message:"Something went wrong", errorCode:"UNKNOWN"});
			return false;
		}
	}

	/**
	 * Get if user has created the webhook
	 * @param request
	 * @param response
	 */
	private async getUserWebhook(request:FastifyRequest, response:FastifyReply, patreonAuth:Awaited<ReturnType<typeof this.getPatreonTokenFromTwitchToken>>, resolveQuery:boolean = true):Promise<{webhookURL:string, campaignID:string, user:TwitchToken, webhookID:string, webhookExists:boolean}|false|void> {
		if(!patreonAuth) return false;

		let campaign:Awaited<ReturnType<typeof this.getCampaignID>> = false;
		try {
			campaign = await this.getCampaignID(patreonAuth.token.access_token);
		}catch(error) { }
		if(!campaign) {
			//Couldn't load campaign
			if(resolveQuery) {
				Logger.error("[PATREON][USER] campaigns loading failed for ", patreonAuth.twitchUser.login);
				response.header('Content-Type', 'application/json');
				response.status(500);
				response.send({success:false, message:"couldn't load campaigns", errorCode:"CAMPAIGN_LOAD_FAILED"});
			}
			return false;
		}

		let webhookExists = false;
		let webhookURL:string = "";
		let webhookID:string = "";
		//Campaigns is an array but, to date, Patreon only allows one campaign per account
		//no need to check for other entries but the first
		webhookURL = Config.credentials.patreon_webhook_url.replace("{ID}", campaign.id);

		//Check if webhook already exists and cleanup any duplicate
		const headers = {
			'Content-Type': 'application/json',
			"Authorization":"Bearer "+patreonAuth.token.access_token,
			"User-Agent":this.userAgent,
		};
		const resultWebhook = await fetch("https://www.patreon.com/api/oauth2/v2/webhooks", {method:"GET", headers});
		if(resultWebhook.status == 429) {
			Logger.warn("[PATREON][USER] Rate limited getUserWebhook for user "+patreonAuth.twitchUser.login+", retrying in a few seconds");
			const json:{errors:{retry_after_seconds:number}[]} = await resultWebhook.json();
			let delay = (json.errors ||[{retry_after_seconds:Math.random()*3 + 1}])[0].retry_after_seconds * 1000;
			await Utils.promisedTimeout(delay);
			return this.getUserWebhook(request, response, patreonAuth);
		}else{
			const json = await resultWebhook.json() as {data?:WebhookEntry[]};
			(json.data || []).forEach(entry => {
				if(entry.attributes.uri == webhookURL) {
					if(webhookExists) {
						//If exist flag is already raised, delete the webhook as it's most probably a duplicate
						fetch("https://www.patreon.com/api/oauth2/v2/webhooks/"+entry.id, {method:"DELETE", headers});
					}else{
						webhookExists = true;
						webhookID = entry.id;

						const filePath = Config.patreonUid2WebhookSecret;
						const json = JSON.parse(fs.existsSync(filePath)? fs.readFileSync(filePath, "utf8") : "{}");
						json[campaign.id] = {twitchId:patreonAuth.twitchUser.user_id, secret:entry.attributes.secret};
						fs.writeFileSync(filePath, JSON.stringify(json), "utf8");
					}
				}
			});
			return {campaignID: campaign.id, webhookURL, user:patreonAuth.twitchUser, webhookExists, webhookID};
		}
	}

	/**
	 * Refreshes user's token
	 * @param request
	 * @param response
	 */
	private async refreshUserToken(token:PatreonToken, twitchUserId:string):Promise<false|PatreonToken> {
		const url = new URL("https://www.patreon.com/api/oauth2/token");
		url.searchParams.append("grant_type", "refresh_token");
		url.searchParams.append("refresh_token", token.refresh_token);
		url.searchParams.append("client_id", Config.credentials.patreon_client_id);
		url.searchParams.append("client_secret", Config.credentials.patreon_client_secret);
		const result = await fetch(url, {method:"POST", headers:{"User-Agent":this.userAgent}});
		const json = await result.json();

		let success = true;
		let jsonTokens = {};
		if(fs.existsSync(Config.twitch2PatreonToken)) {
			jsonTokens = JSON.parse(fs.readFileSync(Config.twitch2PatreonToken, "utf-8") || "{}");
		}

		if(json.error) {
			success = false;
			Logger.error("[PATREON][USER] refresh token failed for "+twitchUserId+". Disconnecting them.");
			console.log(json);
			delete jsonTokens[twitchUserId];
		}else{
			jsonTokens[twitchUserId] = Utils.encrypt(JSON.stringify(json));
		}

		fs.writeFileSync(Config.twitch2PatreonToken, JSON.stringify(jsonTokens), "utf-8");

		return success? json : false;
	}

	/**
	 * Make sure user webhooks are still active
	 */
	private async rebuildUserWebhooks():Promise<void> {
		const secretsFile = Config.patreonUid2WebhookSecret;
		const tokensFile = Config.twitch2PatreonToken;
		const tokens = JSON.parse(fs.existsSync(tokensFile)? fs.readFileSync(tokensFile, "utf8") : "{}");

		for (const twitchId in tokens) {
			const oldToken = JSON.parse(Utils.decrypt(tokens[twitchId])) as PatreonToken;
			const token = await this.refreshUserToken(oldToken, twitchId);
			if(!token) {
				Logger.warn("[PATREON][USER] Couldn't refresh token for user "+twitchId);
				continue;
			}
			let campaign:Awaited<ReturnType<typeof this.getCampaignID>> = false;
			try {
				campaign = await this.getCampaignID(token.access_token);
			}catch(error) { }
			if(!campaign) {
				Logger.warn("[PATREON][USER] Couldn't get campaign for user "+twitchId);
				continue;
			};

			let webhookExists = false;
			let webhookURL:string = "";
			//Campaigns is an array but, to date, Patreon only allows one campaign per account
			//no need to check for other entries but the first
			webhookURL = Config.credentials.patreon_webhook_url.replace("{ID}", campaign.id);

			const headers = {
				'Content-Type': 'application/json',
				"Authorization":"Bearer "+token.access_token,
				"User-Agent":this.userAgent,
			};
			const resultWebhook = await fetch("https://www.patreon.com/api/oauth2/v2/webhooks", {method:"GET", headers});
			const json = await resultWebhook.json() as {data?:WebhookEntry[]};
			if(resultWebhook.status == 200) {
				(json.data || []).forEach(entry => {
					if(entry.attributes.uri == webhookURL) {
						if(webhookExists) {
							//If exist flag is already raised, delete the webhook as it's most probably a duplicate
							fetch("https://www.patreon.com/api/oauth2/v2/webhooks/"+entry.id, {method:"DELETE", headers});
						}else{
							webhookExists = true;
							Logger.info("[PATREON][USER] Webhook found for user "+twitchId);

							const filePath = Config.patreonUid2WebhookSecret;
							const json = JSON.parse(fs.existsSync(filePath)? fs.readFileSync(filePath, "utf8") : "{}");
							json[campaign.id] = {twitchId, secret:entry.attributes.secret};
							fs.writeFileSync(filePath, JSON.stringify(json), "utf8");

							if(entry.attributes.paused) {
								this.resumeWebhook(token, campaign.id, entry.id);
							}
						}
					}else if(entry.attributes.uri.indexOf("ngrok") > -1) {
						//Delete any invalid ngrok webhooks
						fetch("https://www.patreon.com/api/oauth2/v2/webhooks/"+entry.id, {method:"DELETE", headers});
					}
				});
				if(!webhookExists) {
					Logger.warn("[PATREON][USER] Couldn't find webhook for user "+twitchId+". Attempt to create it");
					//Create new webhook
					const options = {
						method:"POST",
						headers,
						body:JSON.stringify({
							"data": {
								"type": "webhook",
								"attributes": {
									"triggers": ["members:create", "members:update", "members:delete", "members:pledge:create", "members:pledge:update", "members:pledge:delete"],
									"uri": webhookURL,
								},
								"relationships": {
									"campaign": {
										"data": {"type": "campaign", "id": campaign.id},
									},
								},
							},
						})
					}
					const resultWebhook = await fetch("https://www.patreon.com/api/oauth2/v2/webhooks", options);
					if(resultWebhook.status == 429) {
						Logger.warn("[PATREON][USER] Rate limited when creating user webhook for user "+twitchId+" :(");
					}else{
						const jsonWebhook = await resultWebhook.json() as {data:WebhookEntry, errors?:unknown[]};
						if(jsonWebhook.errors) {
							Logger.error("[PATREON][USER] creating webhook failed");
							console.log(jsonWebhook);
						}else{
							Logger.info("[PATREON][USER] Create user webhook for", twitchId);
							//Save webhook secret
							const filePath = Config.patreonUid2WebhookSecret;
							const json = JSON.parse(fs.existsSync(filePath)? fs.readFileSync(filePath, "utf8") : "{}");
							json[campaign.id] = {twitchId, secret:jsonWebhook.data.attributes.secret};
							fs.writeFileSync(filePath, JSON.stringify(json), "utf8");
						}
					}
				}
			}
		}
	}

	private async resumeWebhook(accessToken:PatreonToken, campaignID:string, webhookID:string):Promise<void> {
		Logger.info("[PATREON][USER] Resuming webhook for campaign", campaignID);
		const headers = {
			'Content-Type': 'application/json',
			"Authorization":"Bearer "+accessToken.access_token,
			"User-Agent":this.userAgent,
		};

		const options = {
			method:"PATCH",
			headers,
			body:JSON.stringify({
				"data": {
					"id": webhookID,
					"type": "webhook",
					"attributes": {
						"triggers": ["members:create", "members:update", "members:delete", "members:pledge:create", "members:pledge:update", "members:pledge:delete"],
						"uri": Config.credentials.patreon_webhook_url.replace("{ID}", campaignID),
						"paused": false,
					},
				},
			})
		}
		const resultWebhook = await fetch("https://www.patreon.com/api/oauth2/v2/webhooks/"+webhookID, options);
		if(resultWebhook.status == 200) {
			Logger.success("[PATREON][USER] Successfully resumed webhook for campaign", campaignID);
		}else{
			Logger.error("[PATREON][USER] Failed to resume webhook for campaign", campaignID);
			console.log(await resultWebhook.json());
		}

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


interface WebhookMemberUpdateEvent {
	data: {
		attributes: {
			campaign_lifetime_support_cents: number
			currently_entitled_amount_cents: number
			email: string
			full_name: string
			is_follower: boolean
			is_free_trial: boolean
			last_charge_date: string
			last_charge_status: string
			lifetime_support_cents: number
			next_charge_date: string
			note: string
			patron_status: string
			pledge_cadence: number
			pledge_relationship_start: string
			will_pay_amount_cents: number
		}
		id: string
		relationships: {
			address: {
				data: any
			}
			campaign: {
				data: {
					id: string
					type: string
				}
				links: {
					related: string
				}
			}
			currently_entitled_tiers: {
				data: {
					id: string
					type: string
				}[]
			}
			user: {
				data: {
					id: string
					type: string
				}
				links: {
					related: string
				}
			}
		}
		type: string
	};
	included: {
		attributes: {
			created_at?: string
			creation_name?: string
			discord_server_id?: string
			google_analytics_id: any
			has_rss?: boolean
			has_sent_rss_notify?: boolean
			image_small_url?: string
			image_url: string
			is_charged_immediately?: boolean
			is_monthly?: boolean
			is_nsfw?: boolean
			main_video_embed: any
			main_video_url: any
			one_liner: any
			patron_count?: number
			pay_per_name?: string
			pledge_url?: string
			published_at?: string
			rss_artwork_url: any
			rss_feed_title: any
			summary?: string
			thanks_embed?: string
			thanks_msg?: string
			thanks_video_url: any
			url: string
			vanity?: string
			about: any
			created?: string
			first_name?: string
			full_name?: string
			hide_pledges?: boolean
			is_creator?: boolean
			last_name?: string
			like_count?: number
			social_connections?: {
				discord: any
				facebook: any
				google: any
				instagram: any
				reddit: any
				spotify: any
				spotify_open_access: any
				tiktok: any
				twitch: any
				twitter: any
				twitter2: any
				vimeo: any
				youtube: any
			}
			thumb_url?: string
			amount_cents?: number
			description?: string
			discord_role_ids?: string[]
			edited_at?: string
			post_count?: number
			published?: boolean
			remaining: any
			requires_shipping?: boolean
			title?: string
			unpublished_at: any
			user_limit: any
		}
		id: string
		type: string
	}[];
	links: {
		self: string;
	};
}
