import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController.js";
import Config from "../utils/Config.js";
import Logger from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import * as mime from "mime-types";
import cors from '@fastify/cors'
import fastifyStatic from "@fastify/static";
import fastifyRateLimit from "@fastify/rate-limit";

/**
* Created : 22/02/2023
*/
export default class MiddlewareController extends AbstractController {

	private customRateLimit:{[key:string]:number} = {};
	private customRateLimitAttempts:{[key:string]:number} = {};
	private customRateLimitTimeouts:{[key:string]:NodeJS.Timeout} = {};

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
		//FIXME something's off with the libs typing for ESM project or somehting.
		// Following line crashes at build time since I moved from CJS to ESM.
		//Code executes properly tho
		//@ts-ignore 
		await this.server.register(fastifyRateLimit, {
			max: 100,
			ban: 5,
			global: true,
			timeWindow: 1000,
			addHeaders:{
				'x-ratelimit-limit': false,
				'x-ratelimit-remaining': false,
				'x-ratelimit-reset': true,
				'retry-after': false
			},
			allowList: (request, key) => {
				//Apply rate limit only to API endpoints except config and SSE
				return !/\/api\//.test(request.url)
					|| request.url == "/api/configs"
					|| request.url == "/api/configs";
			},
			onBanReach: (request, key) => {
				this.expandCustomRateLimitDuration(request);
			},
			errorResponseBuilder: (request, context) => {
				return {
					code: 429,
					error: 'Too Many Requests',
					errorCode: 'RATE_LIMIT'
				}
			}
		});

		//CORS headers
		await this.server.register(cors, {
			origin:[/localhost/i, /twitchat\.fr/i, /192\.168\.1\.10/, /127\.0\.0\.1/],
			methods:['GET', 'PUT', 'POST', 'DELETE'],
			// decorateReply: true,
			exposedHeaders:["x-ratelimit-reset"],
		});

		//Static files
		await this.server.register(fastifyStatic, {
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

		//Hook called on every request to refuse any request from a banned user
		//A banned user rate limit duration is expanded as long as they keep
		//trying to call any endpoint
		this.server.addHook('onRequest', (request, response, done) => {
			const ip = this.getIp(request);

			let staticFile = "";

			//Redirect /overlay/label/ route to extra light dedicated overlay's html page
			if(/^\/overlay\/label/gi.test(request.url)) {
				staticFile = path.join(Config.PUBLIC_ROOT, "overlayLabel.html");
			}else

			if(/^\/overlay\/sfxr/gi.test(request.url)) {
				staticFile = path.join(Config.PUBLIC_ROOT, "overlaySfxr.html");
			}else

			//Redirect /overlay/ route to overlay's html page
			if(/^\/overlay\//gi.test(request.url)) {
				staticFile = path.join(Config.PUBLIC_ROOT, "overlay.html");
			}else

			//Redirect /popup/oauth/ route to overlay's html page
			if(/^\/popup\/oauth/gi.test(request.url)) {
				staticFile = path.join(Config.PUBLIC_ROOT, "popupAuthResult.html");
			}else

			//Redirect /public/ route to overlay's html page
			if(/^\/public\//gi.test(request.url)) {
				staticFile = path.join(Config.PUBLIC_ROOT, "public.html");
			}

			if(staticFile) {
				const stream = fs.createReadStream(staticFile, 'utf8' );
				const mimetype = mime.lookup(staticFile);
				if(mimetype == "text/html") {
					response.header('Content-Type', mimetype+"; charset=utf-8");
				}else{
					response.header('Content-Type', mimetype);
				}

				response.send(stream);
				return;
			}

			//Apply rate limits
			/*
			if(/^\/api/gi.test(request.url) && request.url != "/api/configs") {
				//Check if user has a custom rate limit duration
				if(Date.now() < this.customRateLimit[ip]) {
					clearTimeout(this.customRateLimitTimeouts[ip]);
					const date = this.expandCustomRateLimitDuration(request);
					this.customRateLimitTimeouts[ip] = setTimeout(()=> {
						Logger.warn("IP "+ip+" banned after x"+this.customRateLimitAttempts[ip]+" 404 calls until "+new Date(date).toISOString()+" for calling "+request.url);
					}, 5000)
					response.status(429);
					response.send({success:false, errorCode:"RATE_LIMIT_BAN", error:"Banned until "+new Date(date).toISOString()+" after suspicious activity"});
					return;
				}else{
					if(this.customRateLimit[ip]) {
						//Reset custom rate limit
						delete this.customRateLimit[ip];
						delete this.customRateLimitAttempts[ip];
					}
				}
			}
			*/
			done();
		})

		await this.server.setNotFoundHandler({
		}, (request:FastifyRequest, response:FastifyReply) => {
			this.notFound(request, response);
		});
	}



	/*******************
	* PRIVATE METHODS *
	*******************/

	private notFound(request:FastifyRequest, response:FastifyReply):void {
		//Return 404 only for /api and /assets paths
		if(/^\/api/gi.test(request.url) || /^\/assets/gi.test(request.url)) {
			if(!/^(\/assets|.*\.js\.map)/gi.test(request.url)) {
				const ip = this.getIp(request);
				Logger.warn("404: ("+request.method+")"+ request.url+" - From IP: "+ip);
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

		const mimetype = mime.lookup(file);
		//patch for firefox that refuses to execute script if it doesn't have this mime type -_-...
		// if(/\.js$/.test(file)) mimetype = "application/javascript";

		if(mimetype == "text/html") {
			response.header('Content-Type', mimetype+"; charset=utf-8");
		}else{
			response.header('Content-Type', mimetype);
		}

		response.send(stream);
	}

	/**
	 * Get user IP from request
	 * @param request
	 */
	private getIp(request:FastifyRequest):string {
		return request.headers['x-real-ip'] as string // nginx
		|| request.headers['x-client-ip'] as string // apache
		|| request.headers['x-forwarded-for'] as string // use this only if you trust the header
		|| request.ip; // fallback to default
	}

	/**
	 * Set or expand the custom rate limiting duration
	 * After user exceeded their quota, this function is called to define a custom
	 * rate limit duration. As long as the user keeps hitting 404 their ban
	 * duration will be expanded.
	 *
	 * @param request
	 */
	private expandCustomRateLimitDuration(request:FastifyRequest):number {
		if(!this.customRateLimit[this.getIp(request)]) {
			this.customRateLimit[this.getIp(request)] = Date.now() + 5000;
			this.customRateLimitAttempts[this.getIp(request)] = 0;
		}
		const attempts = ++this.customRateLimitAttempts[this.getIp(request)];

		//Make custom rate limit duration exponential if user keeps trying
		this.customRateLimit[this.getIp(request)] += Math.pow(attempts,3) * 1000;
		return this.customRateLimit[this.getIp(request)];
	}
}
