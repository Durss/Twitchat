import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController";
import Config from "../utils/Config";
import Logger from "../utils/Logger";
import * as fs from "fs";
import * as path from "path";
import * as mime from "mime-types";

/**
* Created : 22/02/2023 
*/
export default class MiddlewareController extends AbstractController {
	
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
		//Rate limiter
		this.server.register(require('@fastify/rate-limit'), {
			max: 10,
			ban: 2,
			addHeaders:{
				'x-ratelimit-limit': false,
				'x-ratelimit-remaining': false,
				'x-ratelimit-reset': true,
				'retry-after': false
			},
			timeWindow: '30000',
			allowList: (request, key) => {
				if(!/\/api\//.test(request.url)){
					return true;
				}
				return false;
			}
		});
		
		//CORS headers
		this.server.register(require('@fastify/cors'), { 
			origin:[/localhost/i, /twitchat\.fr/i, /192\.168\.1\.10/],
			methods:['GET', 'PUT', 'POST', 'DELETE'],
			decorateReply: true,
			exposedHeaders:["x-ratelimit-reset"]
		})
		
		//Static files
		this.server.register(require('@fastify/static'), {
			root: Config.PUBLIC_ROOT,
			prefix: '/',
			setHeaders:(response, path)=>{
				if(/index\.html/gi.test(path)) {
					this.disableCache(response);
					// res.setHeader("content-type", "application/javascript; charset=UTF-8");
				}
				// res.setHeader("Set-Cookie", "cross-site-cookie=*; SameSite=None; Secure");
			}
		})
		
		
		this.server.setNotFoundHandler({
			preValidation: (request, response, done) => done(),
			preHandler: (request, response, done) => done(),
		}, (request:FastifyRequest, response:FastifyReply) => {
			this.notFound(request, response);
		});
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	private notFound(request:FastifyRequest, response:FastifyReply):void {
		if(/^\/api/gi.test(request.url) || /^\/assets/gi.test(request.url)) {
			if(!/^(\/assets|.*\.js\.map)/gi.test(request.url)) {
				Logger.warn("404: "+ request.url+" - From IP: "+request.headers["x-forwarded-for"]);
			}
			response.code(404).send({success:false, error:"Not found"});
			return;
		}

		let file = path.join(Config.PUBLIC_ROOT, request.url);
		//No file exists at specified path, send index file
		if(!fs.existsSync(file)) {
			file = path.join(Config.PUBLIC_ROOT, "index.html");
			this.disableCache(response);
		}
		const stream = fs.createReadStream(file, 'utf8' );
	
		let mimetype = mime.lookup(file);
		//patch for firefox that refuses to execute script if it doesn't have this mime type -_-...
		// if(/\.js$/.test(file)) mimetype = "application/javascript";
	
		if(mimetype == "text/html") {
			response.header('Content-Type', mimetype+"; charset=utf-8");
		}else{
			response.header('Content-Type', mimetype);
		}
	
		response.send(stream);
	}
}