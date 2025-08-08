import JsonPatch from 'fast-json-patch';
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import Config from '../utils/Config.js';
import { schemaValidator } from '../utils/DataSchema.js';
import Logger from '../utils/Logger.js';
import AbstractController from "./AbstractController.js";
import DiscordController from './DiscordController.js';
import { PatreonMember } from './PatreonController.js';
import SSEController from './SSEController.js';
import Utils from '../utils/Utils.js';
import path from 'path';

/**
* Created : 13/03/2022
*/
export default class UserController extends AbstractController {

	private _lastUserDataVersion:{[uid:string]:number} = {};

	constructor(public server:FastifyInstance, private discordController:DiscordController) {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/



	/******************
	* PUBLIC METHODS *
	******************/
	public async initialize():Promise<void> {
		this.server.get('/api/user', async (request, response) => await this.getUserState(request, response));
		this.server.get('/api/user/all', async (request, response) => await this.getAllUsers(request, response));
		this.server.get('/api/user/data', async (request, response) => await this.getUserData(request, response));
		this.server.get('/api/user/data/backup', async (request, response) => await this.getUserData(request, response, true));
		this.server.post('/api/user/data', async (request, response) => await this.postUserData(request, response));
		this.server.post('/api/user/data/backup', async (request, response) => await this.postUserDataBackup(request, response));
		this.server.post('/api/user/gift_premium', async (request, response) => await this.postGiftPremium(request, response));
		this.server.delete('/api/user/data', async (request, response) => await this.deleteUserData(request, response));
		this.server.delete('/api/auth/dataShare', async (request, response) => await this.deleteDataShare(request, response));

		super.preloadData();
	}



	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Get a user's donor/admin state
	 */
	private async getUserState(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;

		const uid = userInfo.user_id;
		type PremiumStates = "earlyDonor"|"patreon"|"lifetime"|"gifted"|"";
		let premiumType:PremiumStates = "";
		let donorLevel:number = -1
		let amount:number = -1;
		let lifetimePercent:number = 0;
		if(fs.existsSync( Config.donorsList )) {
			let json:{[key:string]:number} = {};
			try {
				json = JSON.parse(fs.readFileSync(Config.donorsList, "utf8"));
			}catch(error){
				response.header('Content-Type', 'application/json');
				response.status(404);
				response.send(JSON.stringify({success:false, message:"Unable to load donors data file"}));
				return;
			}
			if(json.hasOwnProperty(uid)) {
				amount = json[uid];
				donorLevel = Config.donorsLevels.findIndex(v=> v >= amount) - 1;
				lifetimePercent = amount / Config.lifetimeDonorThreshold;
			}
		}

		//Update user's storage file to get a little idea on how many people use twitchat
		const userFilePath = Config.USER_DATA_PATH + uid+".json";
		if(!fs.existsSync(userFilePath)) {
			fs.writeFileSync(userFilePath, JSON.stringify({}), "utf8");
		}else{
			fs.utimes(userFilePath, new Date(), new Date(), ()=>{/*don't care*/});
		}

		//Is got gifted premium?
		if(premiumType == "" && AbstractController._giftedPremium[uid] === true) {
			premiumType = "gifted";
		}

		//Is user an early donor of twitchat?
		if(premiumType == "" && AbstractController._earlyDonors[uid] === true) {
			premiumType = "earlyDonor";
		}

		//Has user donated enough to be lifetime premium?
		if(premiumType == "" && amount >= Config.lifetimeDonorThreshold) {
			premiumType = "lifetime";
		}

		//Check if user has a patreon webhook secret. If so, condisder they're connected
		const filePath = Config.patreonUid2WebhookSecret;
		let patreonLinked = false;
		if(filePath && fs.existsSync(filePath)) {
			const json = JSON.parse(fs.existsSync(filePath)? fs.readFileSync(filePath, "utf8") : "{}") as {[key:string]:{twitchId:string, secret:string}};
			for (const key in json) {
				if(json[key].twitchId === uid) {
					patreonLinked = true;
					break;
				}
			}
		}

		//Is user part of Patreon donors?
		if(premiumType == "") {
			if(fs.existsSync(Config.twitch2Patreon)) {
				const jsonP2T = JSON.parse(fs.readFileSync(Config.twitch2Patreon, "utf-8") || "{}");
				const patreonID = jsonP2T[uid];
				if(patreonID && fs.existsSync(Config.patreonMembers)) {
					const jsonPMembers = JSON.parse(fs.readFileSync(Config.patreonMembers, "utf-8") || "{}") as PatreonMember[];
					if(jsonPMembers.findIndex(v=>v.id === patreonID) > -1) {
						premiumType = "patreon";
					}
				}
			}
		}

		const data:{dataSharing:string[],
					donorLevel:number,
					isAdmin?:true,
					premiumType:PremiumStates,
					lifetimePercent:number
					patreonLinked?:true,
					discordLinked?:true
				} = {
				donorLevel,
				lifetimePercent,
				premiumType,
				dataSharing: super.getDataSharingList(uid)
			};
		if(Config.credentials.admin_ids.includes(uid)) {
			data.isAdmin = true;
		}

		if(DiscordController.isDiscordLinked(uid) === true) {
			data.discordLinked = true;
		}

		if(Config.FORCE_NON_PREMIUM && Config.LOCAL_TESTING) {
			data.premiumType = "";
		}

		if(patreonLinked) {
			data.patreonLinked = true;
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data}));
	}

	/**
	 * Get/set a user's data
	 */
	private async getUserData(request:FastifyRequest, response:FastifyReply, backup = false) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;

		const uid:string = super.getSharedUID((request.query as any).uid ?? userInfo.user_id);

		//Get users' data
		let userFilePath = path.join(Config.USER_DATA_PATH, `${uid}.json`);
		if(backup == true) {
			userFilePath = path.join(Config.USER_DATA_BACKUP_PATH, `${uid}.json`);
		}
		if(!fs.existsSync(userFilePath)) {
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send(JSON.stringify({success:false}));
		}else{
			const data = fs.readFileSync(userFilePath, {encoding:"utf8"});
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, data:JSON.parse(data)}));
		}
	}

	/**
	 * Saves an emergency backup after a massive fail of mine...
	 */
	private async postUserDataBackup(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;

		if (request.headers["force"]) Logger.info("FORCE BACKUP", userInfo.login);

		//Get users' data
		const userFilePath = Config.USER_DATA_BACKUP_PATH + userInfo.user_id+".json";
		if(!fs.existsSync(userFilePath) || request.headers["force"] == "true") {
			const body:any = request.body;
			fs.writeFileSync(userFilePath, JSON.stringify(body), "utf8");
		}
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Get/set a user's data
	 */
	private async postUserData(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;
		const body:any = (request.body as any);
		const data:any = body.data;
		const forcedUpload = body.forced === true;

		//Get users' data
		const uid = super.getSharedUID(userInfo.user_id);
		const userFilePath = Config.USER_DATA_PATH + uid+".json";
		const version = request.headers["app-version"];

		//avoid saving private data to server
		delete data.obsPass;
		delete data.oAuthToken;

		// body.data["p:slowMode"] = true;//Uncomment to test JSON diff

		//Test data format
		try {
			const dataClone = JSON.parse(JSON.stringify(data));

			//Initialize local data version for this user
			if(!this._lastUserDataVersion.hasOwnProperty(userInfo.user_id) && fs.existsSync(userFilePath)) {
				let version = 0;
				try {
					const refJson = fs.readFileSync(userFilePath, "utf-8");
					version = JSON.parse(refJson).saveVersion;
				}catch(error){}
				this._lastUserDataVersion[userInfo.user_id] = version || 0;
				Logger.info("[DATA] Init local cache:",userInfo.login, dataClone.saveVersion, this._lastUserDataVersion[userInfo.user_id]);
			}

			//If forcing data upload, make its version above the minimum expected one
			if(forcedUpload && this._lastUserDataVersion[userInfo.user_id] != undefined) {
				Logger.info("[DATA] Force data upload:",userInfo.login, dataClone.saveVersion, this._lastUserDataVersion[userInfo.user_id]);
				data.saveVersion = dataClone.saveVersion = this._lastUserDataVersion[userInfo.user_id] + 1;
				Logger.info("                 :", dataClone.saveVersion, this._lastUserDataVersion[userInfo.user_id]);

			}

			//Data outdated?
			if(dataClone.saveVersion <= this._lastUserDataVersion[userInfo.user_id]) {
				Logger.warn("[DATA]",userInfo.login+" has outdated data version. Got " + dataClone.saveVersion + " but expected > " + this._lastUserDataVersion[userInfo.user_id]+". Has "+SSEController.countUserConnexions(userInfo.user_id)+" active connexions")
				if(SSEController.countUserConnexions(userInfo.user_id) > 1) {
					//Stop saving if there are more than 1 active connections until I figure out why
					//someone got warned with only 1 active connection
					response.header('Content-Type', 'application/json');
					response.status(409);
					response.send(JSON.stringify({success:false, error:"outdated data version. Got " + dataClone.saveVersion + " but expected > " + this._lastUserDataVersion[userInfo.user_id], errorCode:"OUTDATED_DATA_VERSION"}));
					return;
				}
			}

			this._lastUserDataVersion[userInfo.user_id] = dataClone.saveVersion;

			const success = schemaValidator(data);
			const errorsFilePath = Config.USER_DATA_PATH + uid+"_errors.json";
			if(!success) {
				Logger.error(schemaValidator.errors?.length+" validation error(s) for user "+userInfo.login+"'s data (v"+version+")");
				//Save schema errors if any
				fs.writeFileSync(errorsFilePath, JSON.stringify(schemaValidator.errors), "utf-8")
			}else if(fs.existsSync(errorsFilePath)) {
				fs.unlinkSync(errorsFilePath);
			}

			//schemaValidator() is supposed to tell if the format is valid or not.
			//Because we enabled "removeAdditional" option, no error will be thrown
			//if a field is not in the schema. Instead it will simply remove it.
			//V9+ of the lib is supposed to allow us to retrieve the removed props,
			//but it doesn't yet. As a workaround we use JSONPatch that compares
			//the JSON before and after validation.
			//This is not the most efficient way to do this, but I found no better
			//way to log these errors for now
			const diff = JsonPatch.compare(dataClone, data as any, false);
			const cleanupFilePath = Config.USER_DATA_PATH + uid+"_cleanup.json";
			if(diff?.length > 0) {
				Logger.error("Invalid format, some data have been removed from "+userInfo.login+"'s data (v"+version+")");
				console.log(diff);
				fs.writeFileSync(cleanupFilePath, JSON.stringify(diff), "utf-8");
			}else if(fs.existsSync(cleanupFilePath)) {
				fs.unlinkSync(cleanupFilePath);
			}
			fs.writeFileSync(userFilePath, JSON.stringify(data), "utf8");

			if(data.discordParams) {
				this.discordController.updateParams(uid, data.discordParams);
			}

			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, version:this._lastUserDataVersion[userInfo.user_id]}));
		}catch(error){
			Logger.error("User data save failed for "+userInfo.login);
			console.log(error);
			const message = schemaValidator.errors;
			Logger.log(message);
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false, error:message, errorCode:"INVALID_DATA_FORMAT"}));
		}
	}

	/**
	 * Allows users to get premium gift from code
	 */
	private async postGiftPremium(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;

		let codeValid:boolean|null = false;
		let premiumState = super.getUserPremiumState(userInfo.user_id);
		let alreadyLifetimePremium = premiumState == "lifetime" || premiumState == "early_gift" || premiumState == "gift";
		// If user isn't lifetime premium already, check if code is valid
		if(!alreadyLifetimePremium) {
			const body:any = (request.body as {code:string});
			codeValid = Config.USE_PREMIUM_CREDITS(body.code);
			if(codeValid) {
				super.giftPremium(userInfo.user_id);
				try {
					Utils.sendSMSAlert("[TWITCHAT] "+userInfo.login+" got premium membership with code "+body.code);
				}catch(_){
					Logger.error("Unable to send SMS alert for premium code usage.");
				}
			}
		}

		const result = codeValid === true? "success" : codeValid === false? "empty_credits" : "invalid_code";
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, result, alreadyPremium: alreadyLifetimePremium}));
	}

	/**
	 * Delete a user's data
	 */
	private async deleteUserData(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;

		//Delete user's data
		const userFilePath = Config.USER_DATA_PATH + userInfo.user_id+".json";
		fs.rmSync(userFilePath);
		Logger.info("❌ User "+userInfo.login+" requested to delete their personal data.");

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Get users list
	 */
	private async getAllUsers(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;

		const files = fs.readdirSync(Config.USER_DATA_PATH);
		const list = files.filter(v => v.indexOf("_cleanup") == -1 && v != ".git" && v.indexOf("_errors") == -1);
		const users:{id:string, date:number}[] = []
		list.forEach(v => {
			users.push({
				id: v.replace(".json", ""),
				date:fs.statSync(Config.USER_DATA_PATH + v).mtime.getTime()
			})
		} );

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, users}));
	}

	/**
	 * Unlinks a user data sharing
	 *
	 * @param {*} request
	 * @param {*} response
	 */
	private async deleteDataShare(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response);
		if(!user) return;

		const params:any = request.query;
		const uid = params.uid;
		super.disableUserDataSharing(uid, user.user_id);
		super.disableUserDataSharing(user.user_id, uid);

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, users:this.getDataSharingList(user.user_id)}));
	}
}
