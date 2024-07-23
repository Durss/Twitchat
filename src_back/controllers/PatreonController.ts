import * as crypto from "crypto";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import fetch from "node-fetch";
import Config from "../utils/Config.js";
import Logger from "../utils/Logger.js";
import TwitchUtils from "../utils/TwitchUtils.js";
import AbstractController from "./AbstractController.js";

/**
* Created : 13/07/2023
*/
export default class PatreonController extends AbstractController {

	private localScopes:string = "w:campaigns.webhook campaigns.members";
	private isFirstAuth:boolean = true;
	private campaignId:string = "";
	private members:PatreonMember[] = [];
	private tokenRefresh!:NodeJS.Timeout;
	private smsWarned:boolean = false;
	private patreonApiDown:boolean = false;
	private webhookDebounce:NodeJS.Timeout|null = null;
	private userAgent = "Twitchat.fr server service";

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
		this.server.post('/api/patreon/webhook', async (request, response) => await this.postWebhookTrigger(request, response));
		this.server.post('/api/patreon/authenticate', async (request, response) => await this.postAuthenticate(request, response));
		this.server.post('/api/patreon/refresh_token', async (request, response) => await this.postRefreshToken(request, response));

		await this.authenticateLocal();
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

		const result = await fetch(url, {method:"POST", headers:{"User-Agent":this.userAgent}});
		const json = await result.json();

		if(json.error) {
			Logger.error("Patreon refresh token failed");
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

					//TODO block association to a new twitch channel to avoid premium sharing?
					if(linkedCount >= 2) {
						response.header('Content-Type', 'application/json');
						response.status(401);
						response.send(JSON.stringify({success:false, errorCode:"MAX_LINKED_ACCOUNTS"}));
						return;
					}

					json[userInfo.user_id] = memberID;
					fs.writeFileSync(Config.patreon2Twitch, JSON.stringify(json), "utf-8")
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
				Logger.error("Patreon: authentication failed [invalid refresh token]");
				console.log(json.error);
				this.logout();
				return false;
			}else{
				token = json as PatreonToken;
				if(this.isFirstAuth){
					Logger.success("Patreon: API ready");
				}
				fs.writeFileSync(Config.patreonToken, JSON.stringify(token), "utf-8");
				try {
					await this.getCampaignID();
					await this.refreshPatrons(this.isFirstAuth);
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
			Logger.warn("Please connect to patreon !", this.authURL);
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
			Logger.error("Patreon: Server auth failed: "+result.status);
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
				response.send("Patreon connection Done! You can close this page.");
				Logger.success("Patreon: Server auth complete");
			}else{
				response.header('Content-Type', 'text/html; charset=UTF-8');
				response.status(500);
				response.send("Patreon authentication failed. <a href=\""+this.authURL+"\">Try again</a>");
				response.send({success:false, message:"Authentication failed"});
				Logger.success("Patreon: Server auth failed");
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
			Logger.warn("Patreon: Invalid webhook signature");
			response.status(401);
			response.send("Unauthorized");
			this.patreonApiDown = true;
			this.sendSMSAlert("Patreon Webhook failed, invalid signature "+signature);
			return;
		}

		Logger.success("Patreon: received webhook event \""+event+"\"");
		response.status(200);
		response.send("OK");
		try {
			//Patreon sometimes sends double create webhook events.
			//Debounce it to avoid concurrent patrons updates
			if(this.webhookDebounce)clearTimeout(this.webhookDebounce);
			this.webhookDebounce = setTimeout(() => {
				this.refreshPatrons(event != "members:create");
			}, 2000);
			this.patreonApiDown = false;
		}catch(error) {
			this.patreonApiDown = true;
		}

		if(event == "members:create") {
			//Force a second refresh 10s after an account creation
			//I've had a case of user not being counted as member right after donating, I'm suspecting
			//that's because I requested too quick but I'm not sure at all.
			//Although new members are not yet approved as patreon members, they usually have the
			//given amount returned. That time it apparently didn't.
			//This second call is here in case I called Patreon too early after member's creation.
			setTimeout(()=>{
				this.refreshPatrons(true);
			}, 10000);
		}
	}

	/**
	 * Refreshes the patrons list
	 * @param request
	 * @param response
	 */
	public async refreshPatrons(verbose:boolean = true, offset?:string):Promise<void> {
		if(!offset) this.members = [];

		const url = new URL("https://www.patreon.com/api/oauth2/v2/campaigns/"+this.campaignId+"/members");
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
			Logger.error("Patreon: Refreshing member list failed");
			console.log(await result.text());
			this.logout();
			throw("Error");
		}
		const json:PatreonMemberships = await result.json();
		// fs.writeFileSync("/patreon_memberships.json", JSON.stringify(json), "utf-8");
		if(json.errors) {
			Logger.error("Patreon: members list failed");
			console.log(json.errors[0].detail);
			console.log(json);
			this.logout();
		}else{
			if(verbose)Logger.info("Patreon: "+json.data.length+" members loaded");
			// console.log(json);
			const next = json.meta.pagination?.cursors?.next;
			// fs.writeFileSync("/patrons.json", JSON.stringify(json), "utf-8");

			//Only keep active patrons
			const members = json.data.filter(v=>v.attributes.patron_status === "active_patron")
			.filter(v=>v.relationships.currently_entitled_tiers.data.length > 0
				//If current tier value is greater than the minimum (to refuse custom amounts lower than that)
				|| v.attributes.currently_entitled_amount_cents > this.MIN_AMOUNT
				//Specific tier exception
				|| v.relationships.currently_entitled_tiers.data.find(v=>v.id == this.MIN_AMOUNT_TIER_ID_EXCEPTION))
			.map(v =>{
				const member:PatreonMember = {
					id:v.id,
					name:v.attributes.full_name,
					total:v.attributes.lifetime_support_cents/100,
				};
				return member;
			});

			this.members = this.members.concat(members);
			if(verbose)Logger.info("Patreon: "+this.members.length+" active members");
			// fs.writeFileSync(Config.patreonMembers.replace(".json", "_src.json"), JSON.stringify(json.data), "utf-8");
			fs.writeFileSync(Config.patreonMembers, JSON.stringify(this.members), "utf-8");
			if(next) {
				//load next page
				this.refreshPatrons(verbose, next);
			}else if(verbose) {
				Logger.success("Patreon: members list loading complete");
			}
		}
	}

	/**
	 * Get user's campaign
	 * @param request
	 * @param response
	 */
	public async getCampaignID():Promise<void> {
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
			Logger.error("Patreon: campaign list failed");
			console.log(await result.text());
			throw("Error");

		}else{
			const json = await result.json();
			if(json.errors) {
				Logger.error("Patreon: campaign list failed");
				console.log(json.errors[0].detail);
				this.logout();
			}else{
				if(json.data?.length === 0) {
					Logger.error("Patreon: no campaign found");
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
