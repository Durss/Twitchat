import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import * as path from "path";
import Config from '../utils/Config.js';
import AbstractController from "./AbstractController.js";
import Logger from "../utils/Logger.js";
import Utils from "../utils/Utils.js";
import SSEController, { SSECode } from "./SSEController.js";
import {spawn} from "child_process";

/**
* Created : 14/12/2022 
*/
export default class AdminController extends AbstractController {

	public static announcements_cache:string = "[]";
	private savingLabels:boolean = false;
	private savingPromise:Promise<void>|null = null;
	
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
		this.server.get('/api/beta/user', async (request, response) => await this.getUser(request, response));
		this.server.get('/api/beta/user/hasData', async (request, response) => await this.getUserHasData(request, response));
		this.server.post('/api/beta/user/migrateToProduction', async (request, response) => await this.migrateUser(request, response));
		this.server.post('/api/admin/beta/user', async (request, response) => await this.addUser(request, response));
		this.server.post('/api/admin/beta/user/migrateToProduction', async (request, response) => await this.migrateUserAdmin(request, response));
		this.server.post('/api/admin/premium', async (request, response) => await this.postPremium(request, response));
		this.server.delete('/api/admin/premium', async (request, response) => await this.deletePremium(request, response));
		this.server.delete('/api/admin/beta/user', async (request, response) => await this.delUser(request, response));
		this.server.delete('/api/admin/beta/user/all', async (request, response) => await this.removeAllUsers(request, response));

		//Updates labels
		this.server.post('/api/admin/labels', async (request:FastifyRequest, response:FastifyReply) => this.postLabels(request, response) );
		
		//Forces labels reload from frontend
		this.server.post('/api/admin/labels/reload', async (request:FastifyRequest, response:FastifyReply) => this.postLabelsReload(request, response) );

		//Add an annoucement
		this.server.post('/api/admin/announcements', async (request:FastifyRequest, response:FastifyReply) => this.postAnnouncement(request, response) );

		//Add an annoucement
		this.server.delete('/api/admin/announcements', async (request:FastifyRequest, response:FastifyReply) => this.deleteAnnouncement(request, response) );

		//Initialize cache
		if(fs.existsSync(Config.ANNOUNCEMENTS_PATH)) {
			AdminController.announcements_cache = fs.readFileSync(Config.ANNOUNCEMENTS_PATH, "utf-8");
		}
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Check if a user is part of beta testers
	 */
	private async getUser(request:FastifyRequest, response:FastifyReply) {
		const params = request.query as any;
		let userList:string[] = [];
		if(fs.existsSync(Config.BETA_USER_LIST)) {
			userList = JSON.parse(fs.readFileSync(Config.BETA_USER_LIST, "utf8"));
		}

		const isBetaTester = userList.includes(params.uid) || Config.credentials.admin_ids.includes(params.uid);
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:{beta:isBetaTester}}));
	}

	/**
	 * Check if a user has data on the beta server
	 */
	private async getUserHasData(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;

		const prodFile = path.join(Config.PRODUCTION_USER_DATA_PATH_FROM_BETA, userInfo.user_id+".json");
		const betaFile = path.join(Config.USER_DATA_PATH, userInfo.user_id+".json");
		const result:{betaDate?:number, prodDate?:number, betaVersion?:number, prodVersion?:number} = {};

		if(fs.existsSync(betaFile)) {
			result.betaDate = fs.statSync(betaFile).mtime.getTime();
			try {
				result.betaVersion = JSON.parse(fs.readFileSync(betaFile, "utf-8")).v || 0;
			}catch(error){/*ignore*/}
		}
		
		if(fs.existsSync(prodFile)) {
			result.prodDate = fs.statSync(prodFile).mtime.getTime();
			try {
				result.prodVersion = JSON.parse(fs.readFileSync(prodFile, "utf-8")).v || 0;
			}catch(error){/*ignore*/}
		}
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:result}));
	}

	/**
	 * Add a user to the beta list
	 */
	private async addUser(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;
		
		const params = request.body as any;
		let userList:string[] = [];
		if(fs.existsSync(Config.BETA_USER_LIST)) {
			userList = JSON.parse(fs.readFileSync(Config.BETA_USER_LIST, "utf8"));
		}
		if(!userList.includes(params.uid)) userList.push(params.uid);

		fs.writeFileSync(Config.BETA_USER_LIST, JSON.stringify(userList));

		const prodFile = path.join(Config.PRODUCTION_USER_DATA_PATH_FROM_BETA, params.uid+".json");
		const betaFile = path.join(Config.USER_DATA_PATH, +params.uid+".json");

		if(fs.existsSync(prodFile)) {
			fs.copyFileSync(prodFile, betaFile);
		}
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, userList}));
	}

	/**
	 * Migrate a user's data from beta to production
	 */
	private async migrateUser(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;
		
		Logger.info("Migrate",userInfo.login,"data from beta to production.");

		const prodFile = path.join(Config.PRODUCTION_USER_DATA_PATH_FROM_BETA, userInfo.user_id+".json");
		const betaFile = path.join(Config.USER_DATA_PATH, userInfo.user_id+".json");
		
		console.log("Source:", betaFile);
		console.log("  Dest:", prodFile);
		if(fs.existsSync(betaFile)) {
			fs.copyFileSync(betaFile, prodFile);
		}
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Migrate a user's data from beta to production (Admin mode)
	 */
	private async migrateUserAdmin(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;
		
		const params:any = request.body;

		const prodFile = path.join(Config.PRODUCTION_USER_DATA_PATH_FROM_BETA, params.uid+".json");
		const betaFile = path.join(Config.USER_DATA_PATH, params.uid+".json");
		
		if(fs.existsSync(betaFile)) {
			fs.copyFileSync(betaFile, prodFile);
		}
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Removes a user from the beta list
	 */
	private async delUser(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;
		
		const params = request.query as any;
		let userList:string[] = [];
		if(fs.existsSync(Config.BETA_USER_LIST)) {
			userList = JSON.parse(fs.readFileSync(Config.BETA_USER_LIST, "utf8"));
		}
		const index = userList.indexOf(params.uid);
		if(index > -1) {
			userList.splice(index, 1);
		}

		fs.writeFileSync(Config.BETA_USER_LIST, JSON.stringify(userList));
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, userList}));
	}

	/**
	 * Removes all users from the beta list
	 */
	private async removeAllUsers(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;
		
		fs.writeFileSync(Config.BETA_USER_LIST, JSON.stringify([]));
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, userList:[]}));
	}

	/**
	 * Gifts premium to a user
	 */
	private async postPremium(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;
		
		let uids:string[] = [];
		if(fs.existsSync(Config.giftedPremium)) {
			uids = JSON.parse(fs.readFileSync(Config.giftedPremium, "utf-8"));
		}
		const params:any = request.body;
		if(!uids.includes(params.uid)) {
			uids.push(params.uid);
			AbstractController._giftedPremium[params.uid] = true;
		}
		fs.writeFileSync(Config.giftedPremium, JSON.stringify(uids), "utf-8");
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, uids}));
	}

	/**
	 * Remove premium gift from a user
	 */
	private async deletePremium(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;
		
		let uids:string[] = [];
		if(fs.existsSync(Config.giftedPremium)) {
			uids = JSON.parse(fs.readFileSync(Config.giftedPremium, "utf-8"));
		}
		const params = request.query as any;
		uids = uids.filter(uid => uid != params.uid);
		delete AbstractController._giftedPremium[params.uid];
		fs.writeFileSync(Config.giftedPremium, JSON.stringify(uids), "utf-8");
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, uids}));
	}

	/**
	 * Adds an announcement
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	private postAnnouncement(request:FastifyRequest, response:FastifyReply):void {
		if(!super.adminGuard(request, response)) return;

		const body:any = request.body;
		const dateStart:number = body.dateStart || Date.now();
		const dateEnd:number = body.dateEnd;
		const important:boolean = body.important === true;
		const title:{[key:string]:string} = body.title;
		const text:{[key:string]:string} = body.text;
		const versionMax:string = body.versionMax || "";
		const donorsOnly:boolean = body.donorsOnly === true;
		const premiumOnly:boolean = body.premiumOnly === true;
		const patreonOnly:boolean = body.patreonOnly === true;
		const heatOnly:boolean = body.heatOnly === true;

		let list:AnnouncementData[] = [];
		if(fs.existsSync(Config.ANNOUNCEMENTS_PATH)) {
			list = JSON.parse(fs.readFileSync(Config.ANNOUNCEMENTS_PATH, "utf-8")) as AnnouncementData[];
		}

		const announce:AnnouncementData ={
			id:Utils.getUUID(),
			dateStart,
			title,
			text,
			important,
			donorsOnly,
			premiumOnly,
			patreonOnly,
			heatOnly,
		};
		if(dateEnd) announce.dateEnd = dateEnd;
		if(versionMax.length >= 2) announce.versionMax = versionMax;
		list.push(announce);

		AdminController.announcements_cache = JSON.stringify(list);
		fs.writeFileSync(Config.ANNOUNCEMENTS_PATH, AdminController.announcements_cache, "utf-8");

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:list}));
	}

	/**
	 * Deletes an announcement
	 */
	private deleteAnnouncement(request:FastifyRequest, response:FastifyReply):void {
		if(!super.adminGuard(request, response)) return;

		const body:any = request.body;
		const id:string = body.id;

		let list:AnnouncementData[] = [];
		if(fs.existsSync(Config.ANNOUNCEMENTS_PATH)) {
			list = JSON.parse(fs.readFileSync(Config.ANNOUNCEMENTS_PATH, "utf-8")) as AnnouncementData[];
		}

		const index = list.findIndex(v=>v.id === id);
		if(index > -1) {
			list.splice(index, 1);
		}

		AdminController.announcements_cache = JSON.stringify(list);
		fs.writeFileSync(Config.ANNOUNCEMENTS_PATH, AdminController.announcements_cache, "utf-8");

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:list}));
	}

	/**
	 * Forces labels reload from frontend
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	public async postLabelsReload(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const body:any = request.body;
		if(body.key != Config.credentials.csrf_key) {
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send(JSON.stringify({success:false}));
			return;
		}
		
		Config.credentials.admin_ids.forEach(uid => {
			SSEController.sendToUser(uid, SSECode.LABELS_UPDATE);
		})
		
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Updates a labels section
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	public async postLabels(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const user = await this.adminGuard(request, response);
		if(!user) return;
		
		const body:any = request.body;
		const lang:string = body.lang;
		const json:any = {};
		const section:string = body.section;
		json[section] = body.labels;

		if(this.savingLabels) {
			Logger.warn("A label update is already in progress, wait for it complete before updateing section",section);
			await this.savingPromise;
			return await this.postLabels(request, response);
		}

		this.savingLabels = true;

		let globalResolver!:()=>void;
		this.savingPromise = new Promise((resolve) => {
			globalResolver = resolve;
		});
		
		Logger.info("Updating labels section \""+section+"\"");

		try {
			await new Promise<void>(resolve => {
				fs.writeFileSync(path.join(Config.LABELS_ROOT, lang+"/"+section+".json"), JSON.stringify(json, null, "\t"), "utf-8");
				const script = path.join(Config.LABELS_ROOT, "../src_labels/index.mjs");
				// exec(`start /B node ${script}`, (error, stdout, stderr) => {
				let errored = false;
				const child = spawn('node', [script], {shell: false, windowsHide:true});
				
				child.stdout.on('data', data => {
					console.log(data.toString());
				});
				
				child.stderr.on('data', data => {
					console.error(data.toString());
					errored = true;
				});
	
				child.on('error', (error) => {
					console.error(error.message);
					errored = true;
				});
				
				child.on('close', (code) => {
					if (errored) {
						Logger.error("Failed compiling labels");
						response.header('Content-Type', 'application/json');
						response.status(500);
						response.send(JSON.stringify({success:false, message:"failed executing script to compile labels", errorCode:"EXEC_SCRIPT_ERROR"}));
						resolve();
						return;
					}
					Logger.success("Labels compiled successfuly");
					response.header('Content-Type', 'application/json');
					response.status(200);
					response.send(JSON.stringify({success:true}));
					this.savingLabels = false;
					resolve();
					SSEController.sendToUser(user.user_id, SSECode.LABELS_UPDATE);
				});
			});

		}catch(error) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false, message:"an unknown error has occured", errorCode:"UNKNOWN_ERROR"}));
		}
		this.savingLabels = false;
		globalResolver();
	}

}

interface AnnouncementData{
	id:string;
	dateStart:number;
	important:boolean;
	donorsOnly:boolean;
	premiumOnly:boolean;
	patreonOnly:boolean;
	heatOnly:boolean;
	title:{[key:string]:string};
	text:{[key:string]:string};
	dateEnd?:number;
	versionMax?:string;
}