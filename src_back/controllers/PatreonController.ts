import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fetch from "node-fetch";
import * as fs from "fs";
import * as crypto from "crypto";
import Config from "../utils/Config";
import AbstractController from "./AbstractController";
import Logger from "../utils/Logger";

/**
* Created : 13/07/2023 
*/
export default class PatreonController extends AbstractController {

	private localScopes:string = "w:campaigns.webhook campaigns.members";
	private campaignId:string = "";
	private members:string[] = [];
	private tokenRefresh!:NodeJS.Timeout;
	
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
		this.server.get('/api/patreon/serverauth', async (request, response) => await this.getServerAuth(request, response));
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
		const url = "https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields%5Buser%5D=about,created,first_name,last_name,image_url,url,vanity&fields%5Bcampaign%5D=summary,is_monthly";
		const options = {
			method:"GET",
			headers: {
				"Authorization":"Bearer "+token,
			}
		}

		const result = await fetch(url, options);
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
	 * Reset authentication
	 */
	public logout():void{
		clearTimeout(this.tokenRefresh);
		fs.rmSync(Config.PATREON_TOKEN_PATH);
		this.authenticateLocal();//This will log the URI to call to authenticate the user
	}

	/**
	 * Refreshes the patrons list
	 * @param request 
	 * @param response 
	 */
	public async authenticateLocal():Promise<void> {
		let token:PatreonToken|null = null;
		if(fs.existsSync(Config.PATREON_TOKEN_PATH)) {
			token = JSON.parse(fs.readFileSync(Config.PATREON_TOKEN_PATH, "utf-8"));
		}
		if(token) {
			const url = new URL("https://www.patreon.com/api/oauth2/token");
			url.searchParams.append("grant_type", "refresh_token");
			url.searchParams.append("refresh_token", token.refresh_token);
			url.searchParams.append("client_id", Config.credentials.patreon_client_id);
			url.searchParams.append("client_secret", Config.credentials.patreon_client_secret);
	
			const result = await fetch(url, {method:"POST"});
			const json = await result.json();
	
			if(json.error) {
				Logger.error("Patreon: authentication failed [invalid refresh token]");
				console.log(json.error);
				this.logout();
			}else{
				const token:PatreonToken = json;
				Logger.success("Patreon: API ready");
				fs.writeFileSync(Config.PATREON_TOKEN_PATH, JSON.stringify(token), "utf-8");
				await this.getCampaignID();
				await this.refreshPatrons();
				clearTimeout(this.tokenRefresh);
				this.tokenRefresh = setTimeout(()=>{
					this.authenticateLocal();
				}, token.expires_in - 60000);
			}

		}else{
			const url = new URL("https://www.patreon.com/oauth2/authorize");
			url.searchParams.append("response_type", "code");
			url.searchParams.append("client_id", Config.credentials.patreon_client_id);
			url.searchParams.append("redirect_uri", Config.credentials.patreon_redirect_uri_server);
			url.searchParams.append("scope", this.localScopes);
			url.searchParams.append("state", "");
			Logger.warn("Please connect to patreon !", url.href);
		}

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
			response.send("Patreon: connection OK ! You can close this page");
			
			const token:PatreonToken = json;
			json.expires_at = Date.now() + token.expires_in;
			//Save token
			fs.writeFileSync(Config.PATREON_TOKEN_PATH, JSON.stringify(json), "utf-8");
			this.authenticateLocal();
		}
	}

	/**
	 * Called by patreon when a there's a patron update
	 * @param request 
	 * @param response 
	 */
	public async postWebhookTrigger(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const body:any = request.body;
		Logger.success("Patreon: webhook called");
		const event = request.headers["x-patreon-event"];
		const signature = request.headers["x-patreon-signature"];
		
		const hash = crypto.createHmac('md5', Config.credentials.patreon_webhook_secret)
		.update(request.rawBody)
		.digest('hex');
		
		if(signature != hash) {
			response.status(401);
			response.send("Unauthorized");
			return;
		}

		response.status(200);
		response.send("OK");
		this.refreshPatrons();
	}

	/**
	 * Refreshes the patrons list
	 * @param request 
	 * @param response 
	 */
	public async refreshPatrons(offset?:string):Promise<void> {
		if(!offset) this.members = [];

		const url = new URL("https://www.patreon.com/api/oauth2/v2/campaigns/"+this.campaignId+"/members");
		url.searchParams.append("fields[member]", "full_name,is_follower,last_charge_date,last_charge_status,lifetime_support_cents,currently_entitled_amount_cents,patron_status");
		url.searchParams.append("fields[tier]", "amount_cents,created_at,description,discord_role_ids,edited_at,patron_count,published,published_at,requires_shipping,title,url");
		url.searchParams.append("fields[address]", "addressee,city,line_1,line_2,phone_number,postal_code,state");
		url.searchParams.append("page[size]", "1000");
		if(offset) url.searchParams.append("page[cursor]", offset);

		const token = JSON.parse(fs.readFileSync(Config.PATREON_TOKEN_PATH, "utf-8")) as PatreonToken;
		const options = {
			method:"GET",
			headers:{
				authorization:"Bearer "+token.access_token
			}
		}
		const result = await fetch(url, options);
		const json = await result.json();
		if(json.errors) {
			Logger.error("Patreon: members list failed");
			console.log(json.errors[0].detail);
			console.log(json);
			this.logout();
		}else{
			Logger.info("Patreon: "+json.data.length+" members loaded");
			// console.log(json);
			const next = json.meta.pagination?.cursors?.next;
			const members = json.data.filter(v=>v.attributes.patron_status === "active_patron")
			.map(v =>{
				return {
					id:v.id,
					name:v.attributes.full_name,
					total:parseFloat(v.attributes.lifetime_support_cents)/100,
				}
			});
			this.members = this.members.concat(members);
			fs.writeFileSync(Config.PATREON_MEMBERS_PATH, JSON.stringify(this.members), "utf-8");
			if(next) {
				this.refreshPatrons(next);
			}else{
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
		const token = JSON.parse(fs.readFileSync(Config.PATREON_TOKEN_PATH, "utf-8")) as PatreonToken;
		const options = {
			method:"GET",
			headers: {
				"Authorization":"Bearer "+token.access_token,
			}
		};

		const result = await fetch(url, options);
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

interface PatreonToken {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	scope: string;
	token_type: string;
	expires_at: number;
}