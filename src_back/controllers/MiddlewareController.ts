import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController.js";
import Config from "../utils/Config.js";
import Logger from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import * as mime from "mime-types";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastifyRateLimit, { errorResponseBuilderContext } from "@fastify/rate-limit";
import { LRUCache } from "lru-cache";

/**
 * Created : 22/02/2023
 */
export default class MiddlewareController extends AbstractController {
	// Bounded so a flood of distinct IPs (e.g. spoofed during an attack on
	// the rate limiter itself) can't exhaust memory. Entries auto-expire
	// after 1h of inactivity, more than the longest realistic ban window.
	private customRateLimit = new LRUCache<string, number>({
		max: 100_000,
		ttl: 60 * 60 * 1000,
	});
	private customRateLimitAttempts = new LRUCache<string, number>({
		max: 100_000,
		ttl: 60 * 60 * 1000,
	});
	private customRateLimitTimeouts = new LRUCache<string, NodeJS.Timeout>({
		max: 100_000,
		ttl: 60 * 60 * 1000,
		dispose: (timeout) => clearTimeout(timeout),
	});

	constructor(public server: FastifyInstance) {
		super();
	}

	/********************
	 * GETTER / SETTERS *
	 ********************/

	/******************
	 * PUBLIC METHODS *
	 ******************/
	public async initialize(): Promise<void> {
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
			addHeaders: {
				"x-ratelimit-limit": false,
				"x-ratelimit-remaining": false,
				"x-ratelimit-reset": true,
				"retry-after": false,
			},
			allowList: (request: FastifyRequest, _key: string) => {
				//Apply stricter rate limit to auth endpoints
				if (/\/api\/auth\/*/.test(request.url)) {
					return false; //Force rate limiting on auth endpoints
				}
				// Apply rate limit only to API endpoints except /api/configs which
				// actually only returns a static JSON
				return !/\/api\//.test(request.url) || request.url == "/api/configs";
			},
			onBanReach: (request: FastifyRequest, _key: string) => {
				this.expandCustomRateLimitDuration(request);
			},
			errorResponseBuilder: (
				_request: FastifyRequest,
				_context: errorResponseBuilderContext,
			) => {
				return {
					code: 429,
					error: "Too Many Requests",
					errorCode: "RATE_LIMIT",
				};
			},
		});

		//CORS headers: only allow local origins in dev/local-testing.
		//Previously these were also accepted in prod, which let any browser
		//on the same machine as the server make CORS requests against the
		//public API.
		const corsOrigins: (string | RegExp)[] = [/^https?:\/\/([a-z0-9-]+\.)?twitchat\.fr$/i];
		if (Config.LOCAL_TESTING) {
			corsOrigins.push(/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.1\.10)(:\d+)?$/i);
		}
		await this.server.register(cors, {
			origin: corsOrigins,
			methods: ["GET", "PUT", "POST", "DELETE"],
			// decorateReply: true,
			exposedHeaders: ["x-ratelimit-reset"],
		});

		//Security headers
		//Note: X-Frame-Options not set to allow overlay embedding in OBS/StreamElements
		this.server.addHook("onSend", async (request, response) => {
			response.header("X-Content-Type-Options", "nosniff");
			response.header("Referrer-Policy", "strict-origin-when-cross-origin");
			response.header("Permissions-Policy", "geolocation=(), camera=()");
		});

		//Static files
		await this.server.register(fastifyStatic, {
			root: Config.PUBLIC_ROOT,
			prefix: "/",
			setHeaders: (response, path) => {
				if (/index\.html/gi.test(path)) {
					this.disableCache(response);
					// res.setHeader("content-type", "application/javascript; charset=UTF-8");
				}
				// res.setHeader("Set-Cookie", "cross-site-cookie=*; SameSite=None; Secure");
			},
		});

		//Hook called on every request to refuse any request from a banned user
		//A banned user rate limit duration is expanded as long as they keep
		//trying to call any endpoint
		this.server.addHook("onRequest", (request, response, done) => {
			let staticFile = "";

			//Redirect /overlay/label/ route to extra light dedicated overlay's html page
			if (/^\/overlay\/label/gi.test(request.url)) {
				staticFile = path.join(Config.PUBLIC_ROOT, "overlayLabel.html");
			} else if (/^\/overlay\/sfxr/gi.test(request.url)) {
				staticFile = path.join(Config.PUBLIC_ROOT, "overlaySfxr.html");
			} else //Redirect /overlay/ route to overlay's html page
			if (/^\/overlay\//gi.test(request.url)) {
				staticFile = path.join(Config.PUBLIC_ROOT, "overlay.html");
			} else //Redirect /popup/oauth/ route to overlay's html page
			if (/^\/popup\/oauth/gi.test(request.url)) {
				staticFile = path.join(Config.PUBLIC_ROOT, "popupAuthResult.html");
			} else //Redirect /public/ route to overlay's html page
			if (/^\/public\//gi.test(request.url)) {
				staticFile = path.join(Config.PUBLIC_ROOT, "public.html");
			}

			if (staticFile) {
				const stream = fs.createReadStream(staticFile, "utf8");
				const mimetype = mime.lookup(staticFile);
				if (mimetype == "text/html") {
					response.header("Content-Type", mimetype + "; charset=utf-8");
				} else {
					response.header("Content-Type", mimetype);
				}

				response.send(stream);
				return;
			}

			//Apply rate limits
			/*
			const ip = this.getIp(request);
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
		});

		this.server.setNotFoundHandler({}, (request: FastifyRequest, response: FastifyReply) => {
			this.notFound(request, response);
		});
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/

	private notFound(request: FastifyRequest, response: FastifyReply): void {
		//Return 404 only for /api and /assets paths
		if (/^\/api/gi.test(request.url) || /^\/assets/gi.test(request.url)) {
			if (!/^(\/assets|.*\.js\.map)/gi.test(request.url)) {
				const ip = this.getIp(request);
				Logger.warn("404: (" + request.method + ")" + request.url + " - From IP: " + ip);
			}
			response.code(404).send({ success: false, error: "Not found" });
			return;
		}

		let file = path.join(Config.PUBLIC_ROOT, request.url);

		//Prevent directory traversal - ensure file is within PUBLIC_ROOT
		const normalizedFile = path.normalize(file);
		const normalizedRoot = path.normalize(Config.PUBLIC_ROOT);
		if (!normalizedFile.startsWith(normalizedRoot)) {
			response.code(403).send({ success: false, error: "Forbidden" });
			return;
		}

		//No file exists at specified path, send index file
		if (!fs.existsSync(normalizedFile)) {
			file = path.join(Config.PUBLIC_ROOT, "index.html");
			this.disableCache(response);
		} else {
			file = normalizedFile;
		}
		const stream = fs.createReadStream(file, "utf8");

		const mimetype = mime.lookup(file);
		//patch for firefox that refuses to execute script if it doesn't have this mime type -_-...
		// if(/\.js$/.test(file)) mimetype = "application/javascript";

		if (mimetype == "text/html") {
			response.header("Content-Type", mimetype + "; charset=utf-8");
		} else {
			response.header("Content-Type", mimetype);
		}

		response.send(stream);
	}

	/**
	 * Get user IP from request.
	 *
	 * Fastify is configured with `trustProxy: 1` in bootstrap.ts so request.ip
	 * already resolves X-Forwarded-For from the closest trusted proxy. Reading
	 * the raw `x-*-ip` headers ourselves would let any client spoof their IP
	 * (and thus bypass rate-limit bans / forge IPs in 404 logs).
	 */
	private getIp(request: FastifyRequest): string {
		return request.ip;
	}

	/**
	 * Set or expand the custom rate limiting duration
	 * After user exceeded their quota, this function is called to define a custom
	 * rate limit duration. As long as the user keeps hitting 404 their ban
	 * duration will be expanded.
	 *
	 * @param request
	 */
	private expandCustomRateLimitDuration(request: FastifyRequest): number {
		const ip = this.getIp(request);
		let banUntil = this.customRateLimit.get(ip);
		if (!banUntil) {
			banUntil = Date.now() + 5000;
			this.customRateLimitAttempts.set(ip, 0);
		}
		const attempts = (this.customRateLimitAttempts.get(ip) ?? 0) + 1;
		this.customRateLimitAttempts.set(ip, attempts);

		//Make custom rate limit duration exponential if user keeps trying
		banUntil += Math.pow(attempts, 3) * 1000;
		this.customRateLimit.set(ip, banUntil);
		return banUntil;
	}
}
