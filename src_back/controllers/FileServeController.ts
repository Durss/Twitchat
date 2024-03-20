import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController";
import Config from "../utils/Config";
import * as fs from "fs";
import * as path from "path";
import Logger from "../utils/Logger";
import Utils from "../utils/Utils";
import {spawn} from "child_process";

/**
* Created : 22/02/2023
*/
export default class FileServeController extends AbstractController {

	private announcements_cache:string = "[]";
	private config_cache:string = "";
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
		
		//Defautl API route
		this.server.get('/api', async (request:FastifyRequest, response:FastifyReply) => { return { success: true }; });
		
		//Get latest script.js file for cache bypass
		this.server.get('/api/script', async (request:FastifyRequest, response:FastifyReply) => this.getScript(request, response) );
		
		//Get latest app configs
		this.server.get('/api/configs', async (request:FastifyRequest, response:FastifyReply) => this.getConfigs(request, response) );

		//Starts download of the given file
		this.server.get('/api/download', async (request:FastifyRequest, response:FastifyReply) => this.getDownload(request, response) );
		
		//Get latest announcements
		this.server.get('/api/announcements', async (request:FastifyRequest, response:FastifyReply) => this.getAnnouncements(request, response) );

		//Add an annoucement
		this.server.post('/api/admin/announcements', async (request:FastifyRequest, response:FastifyReply) => this.postAnnouncement(request, response) );

		//Updates labels
		this.server.post('/api/admin/labels', async (request:FastifyRequest, response:FastifyReply) => this.postLabels(request, response) );

		//Add an annoucement
		this.server.delete('/api/admin/announcements', async (request:FastifyRequest, response:FastifyReply) => this.deleteAnnouncement(request, response) );

		//Initialize cache
		if(fs.existsSync(Config.ANNOUNCEMENTS_PATH)) {
			this.announcements_cache = fs.readFileSync(Config.ANNOUNCEMENTS_PATH, "utf-8");
		}
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	private getScript(request:FastifyRequest, response:FastifyReply):void {
		Logger.info("Serving script for cache bypass")
		const assets = path.join(Config.PUBLIC_ROOT, "assets");
		const files = fs.readdirSync(assets).filter(v => /index-.*\.js$/gi.test(v));
		
		let mostRecent = 0;
		let indexPath = "";
		files.forEach(v=> {
			const file = path.join(Config.PUBLIC_ROOT, "assets", path.sep+files[1]);
			const stats = fs.statSync(file);
			const d = new Date(stats.ctime).getTime();
			if(d > mostRecent) {
				indexPath = file;
				mostRecent = Math.max(mostRecent, d);
			}
		})
		if(indexPath) {
			const txt = fs.readFileSync(indexPath, {encoding:"utf8"});
			response.header('Content-Type', 'application/javascript');
			response.status(200);
			response.send(txt);
		}else{
			response.status(404);
		}
	}

	private getConfigs(request:FastifyRequest, response:FastifyReply):void {
		let config = this.config_cache;
		if(!config) {
			const json = {
				twitch_client_id:Config.credentials.twitch_client_id,
				twitch_scopes:Config.credentials.twitch_scopes,
		
				spotify_scopes:Config.credentials.spotify_scopes,
				spotify_client_id:Config.credentials.spotify_client_id,
				
				patreon_client_id:Config.credentials.patreon_client_id,
				patreon_scopes:Config.credentials.patreon_scopes,
				
				paypal_client_id:Config.credentials.paypal_client_id,
				
				contact_mail:Config.credentials.contact_mail,

				youtube_client_id:"",
				youtube_scopes:[] as string[],
				
				discord_client_id:Config.credentials.discord_client_id,

				streamlabs_client_id:Config.credentials.streamlabs_client_id,
				streamlabs_redirect_uri:Config.credentials.streamlabs_redirect_uri,

				streamelements_client_id:Config.credentials.streamelements_client_id,
				streamelements_redirect_uri:Config.credentials.streamelements_redirect_uri,

				tipeee_client_id:Config.credentials.tipeee_client_id,
				tipeee_redirect_uri:Config.credentials.tipeee_redirect_uri,
			};
				
			const youtubeCredentials = Config.YOUTUBE_CREDENTIALS;
			if(youtubeCredentials) {
				json.youtube_client_id = youtubeCredentials.client_id;
				json.youtube_scopes = Config.credentials.youtube_scopes;
			}
			
			this.config_cache = config = JSON.stringify(json);
		}
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(config);
	}

	private getAnnouncements(request:FastifyRequest, response:FastifyReply):void {
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(this.announcements_cache);
	}

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

		this.announcements_cache = JSON.stringify(list);
		fs.writeFileSync(Config.ANNOUNCEMENTS_PATH, this.announcements_cache, "utf-8");

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:list}));
	}

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

		this.announcements_cache = JSON.stringify(list);
		fs.writeFileSync(Config.ANNOUNCEMENTS_PATH, this.announcements_cache, "utf-8");

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:list}));
	}

	/**
	 * Only used to bypass cloudfront CORS issues.
	 * Cheermotes cannot be drawn to canvas because they refused it from CORS.
	 * This is necessary for the right=>click=>export message feature
	 * 
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	public async getDownload(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const image = (request.query as any).image;
		try {
			const url = new URL(image);
			if(!/.*cloudfront.net$/.test(url.hostname)) {
				response.header('Content-Type', 'application/json');
				response.status(500);
				response.send(JSON.stringify({success:false, message:"Invalid source URL"}));
				return;
			}
			const res = await fetch(url);
			const buffer = Buffer.from(await res.arrayBuffer());
	
			response.header('Content-Type', res.headers.get('Content-Type'));
			response.header('Content-Length', res.headers.get('Content-Length'));
			response.send(buffer);
		}catch(error) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false, message:"an unknown error has occured"}));
		}

		// const b64:string = (request.query as any).img.trim();
		
		// const imgBuffer = Buffer.from(b64.split(",")[1], 'base64');
		// var s = new Readable()
		// s.push(imgBuffer)   
		// s.push(null) 
		// s.pipe(fs.createWriteStream("image.png"));

		// response.header('Content-Disposition','attachment; filename=test.png');
		// response.header('Content-Type','image/png');
		// response.send(s).type('image/png').code(200);
	}

	/**
	 * Updates a labels section
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	public async postLabels(request:FastifyRequest, response:FastifyReply):Promise<void> {
		if(!this.adminGuard(request, response)) return;
		
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
				const script = path.join(Config.LABELS_ROOT, "../src_labels/index.js");
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