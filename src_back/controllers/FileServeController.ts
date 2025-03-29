import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController.js";
import Config from "../utils/Config.js";
import * as fs from "fs";
import * as path from "path";
import Logger from "../utils/Logger.js";
import Utils from "../utils/Utils.js";
import AdminController from "./AdminController.js";

/**
* Created : 22/02/2023
*/
export default class FileServeController extends AbstractController {
	private config_cache:string = "";
	
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

		//Updates labels
		this.server.post('/api/log', async (request:FastifyRequest, response:FastifyReply) => this.postLog(request, response) );
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

				tiltify_client_id:Config.credentials.tiltify_client_id,
				tiltify_scopes:Config.credentials.tiltify_scopes,
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
		response.send(AdminController.announcements_cache);
	}

	private postLog(request:FastifyRequest, response:FastifyReply):void {
		if(!super.twitchUserGuard(request, response)) return;

		const body:any = request.body;
		type logsCategories = Parameters<typeof Config.LOGS_PATH>[0];
		const logType:logsCategories = (body.cat as string || "").toLowerCase() as logsCategories;
		const logData:string = JSON.stringify(body.log) || "";

		if(!Utils.logToFile(logType, logData)) {
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send(JSON.stringify({success:false, error:"invalid category", errorCode:"INVALID_CATEGORY"}));
			return;
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send({success:true});
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
}