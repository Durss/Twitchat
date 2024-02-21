import { FastifyReply, FastifyRequest } from "fastify";
import Config from '../utils/Config';
import * as fs from "fs";
import type{PatreonMember} from "./PatreonController";

/**
* Created : 14/12/2022 
*/
export default class AbstractController {

	protected earlyDonors:{[key:string]:boolean} = {};
	
	/**
	 * Twitch user ID to cache expiration date.
	 * An entry exists only if user is part of premium members
	 */
	private premiumState_cache:{[key:string]:number} = {};
	
	constructor() {
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Preloads the early donors on a local cache
	 */
	protected preloadEarlyDonors():void {
		if(fs.existsSync(Config.earlyDonors)) {
			const uids:string[] = JSON.parse(fs.readFileSync(Config.earlyDonors, "utf-8"));
			for (let i = 0; i < uids.length; i++) {
				this.earlyDonors[uids[i]] = true;
			}
		}
	}

	/**
	 * Returns true if it passes the admin check
	 * @param request 
	 * @param response 
	 */
	protected async adminGuard(request:FastifyRequest, response:FastifyReply):Promise<boolean> {
		//Missing auth token
		if(!request.headers.authorization) {
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send(JSON.stringify({success:false}));
			return false;
		}
		
		const userInfo = await Config.getUserFromToken(request.headers.authorization);
		if(!userInfo) {
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send(JSON.stringify({message:"Invalid access token", success:false}));
			return false;
		}
	
		//Only allow admins
		if(Config.credentials.admin_ids.indexOf(userInfo.user_id) == -1) {
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send(JSON.stringify({message:"You're not allowed to call this endpoint", success:false}));
			return false;
		}
		return true;
	}
	/**
	 * Returns true if it passes the admin check
	 * @param request 
	 * @param response 
	 */
	protected async premiumGuard(request:FastifyRequest, response:FastifyReply):Promise<boolean> {
		if(!request.headers.authorization) {
			//Missing auth token
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send(JSON.stringify({success:false}));
			return false;
		}
		
		const userInfo = await Config.getUserFromToken(request.headers.authorization);
		if(!userInfo) {
			//Invalid token
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send(JSON.stringify({message:"Invalid access token", success:false}));
			return false;
		}
	
		const cache = this.premiumState_cache[userInfo.user_id];
		let isPremium = cache != undefined && cache < Date.now();

		//Check if user is part of early donors with offered premium
		if(!isPremium && this.earlyDonors[userInfo.user_id] === true) {
			isPremium = true;
		}

		//Check if user is part of active patreon members
		if(!isPremium && fs.existsSync(Config.patreon2Twitch)) {
			//Get patreon member ID from twitch user ID
			const jsonMap = JSON.parse(fs.readFileSync(Config.patreon2Twitch, "utf-8"));
			const memberID = jsonMap[userInfo.user_id];
			//Get if user is part of the active patreon members
			const members = JSON.parse(fs.readFileSync(Config.patreonMembers, "utf-8")) as PatreonMember[];
			isPremium = members.findIndex(v=>v.id === memberID) > -1 || memberID == Config.credentials.patreon_my_uid;
		}

		//Check if user donated for more than the lifetime premium amount
		if(!isPremium && fs.existsSync(Config.patreon2Twitch)) {
			let donorAmount = -1;
			if(fs.existsSync( Config.donorsList )) {
				const json:{[key:string]:number} = JSON.parse(fs.readFileSync(Config.donorsList, "utf8"));
				const isDonor = json.hasOwnProperty(userInfo.user_id);
				if(isDonor) {
					donorAmount = json[userInfo.user_id];
				}
			}
			isPremium = donorAmount >= Config.lifetimeDonorStep;
		}

		if(!isPremium) {
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send(JSON.stringify({message:"You're not allowed to call this premium-only endpoint", errorCode:"NOT_PREMIUM", success:false}));
			return false;
		}
		this.premiumState_cache[userInfo.user_id] = Date.now() + 6 * 60 * 1000;
		return true;
	}
	
	/**
	 * Add headers to disable cache on a query response
	 * @param response 
	 */
	protected disableCache(response:FastifyReply | {setHeader:(key:string, value:string)=>void}):void {
		if("header" in response) {
			response.header("Cache-Control", "no-store, max-age=0, must-revalidate");
			response.header("Expires", "0");
			response.header("Pragma", "no-cache");
			response.header("Surrogate-Control", "no-store");
		}else{
			//Fastify-static returns a wraper of the response that proxies "setHeader()"
			//calls to the response "header()"
			response.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
			response.setHeader("Expires", "0");
			response.setHeader("Pragma", "no-cache");
			response.setHeader("Surrogate-Control", "no-store");
		}
	}
}