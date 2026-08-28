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
	private config_cache: string = "";
	private DOWNLOAD_MAX_BYTES: number = 10 * 1024 * 1024;

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
		//Defautl API route
		this.server.get("/api", async (_request: FastifyRequest, _response: FastifyReply) => {
			return { success: true };
		});

		//Get latest script.js file for cache bypass
		this.server.get("/api/script", async (request: FastifyRequest, response: FastifyReply) =>
			this.getScript(request, response),
		);

		//Get latest app configs
		this.server.get("/api/configs", async (request: FastifyRequest, response: FastifyReply) =>
			this.getConfigs(request, response),
		);

		//Starts download of the given file
		this.server.get("/api/download", async (request: FastifyRequest, response: FastifyReply) =>
			this.getDownload(request, response),
		);

		//Get latest announcements
		this.server.get(
			"/api/announcements",
			async (request: FastifyRequest, response: FastifyReply) =>
				this.getAnnouncements(request, response),
		);

		//Updates labels
		this.server.post("/api/log", async (request: FastifyRequest, response: FastifyReply) =>
			this.postLog(request, response),
		);
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/

	private getScript(_request: FastifyRequest, response: FastifyReply): void {
		Logger.info("Serving script for cache bypass");
		const assets = path.join(Config.PUBLIC_ROOT, "assets");
		const files = fs.readdirSync(assets).filter((v) => /main-.*\.js$/gi.test(v));

		let mostRecent = 0;
		let indexPath = "";
		files.forEach((v) => {
			const file = path.join(Config.PUBLIC_ROOT, "assets", path.sep + v);
			const stats = fs.statSync(file);
			const d = new Date(stats.ctime).getTime();
			if (d > mostRecent) {
				indexPath = file;
				mostRecent = Math.max(mostRecent, d);
			}
		});

		if (indexPath) {
			const txt = fs.readFileSync(indexPath, { encoding: "utf8" });
			response.header("Content-Type", "application/javascript");
			response.status(200);
			response.send(txt);
		} else {
			response.status(404);
		}
	}

	private getConfigs(_request: FastifyRequest, response: FastifyReply): void {
		let config = this.config_cache;
		if (!config) {
			const json = {
				twitch_client_id: Config.credentials.twitch_client_id,
				twitch_scopes: Config.credentials.twitch_scopes,

				spotify_scopes: Config.credentials.spotify_scopes,
				spotify_client_id: Config.credentials.spotify_client_id,

				patreon_client_id: Config.credentials.patreon_client_id,
				patreon_scopes: Config.credentials.patreon_scopes,

				paypal_client_id: Config.credentials.paypal_client_id,

				contact_mail: Config.credentials.contact_mail,

				youtube_client_id: "",
				youtube_scopes: [] as string[],

				discord_client_id: Config.credentials.discord_client_id,

				streamlabs_client_id: Config.credentials.streamlabs_client_id,
				streamlabs_redirect_uri: Config.credentials.streamlabs_redirect_uri,

				streamelements_client_id: Config.credentials.streamelements_client_id,
				streamelements_redirect_uri: Config.credentials.streamelements_redirect_uri,

				tipeee_client_id: Config.credentials.tipeee_client_id,
				tipeee_redirect_uri: Config.credentials.tipeee_redirect_uri,

				tiltify_client_id: Config.credentials.tiltify_client_id,
				tiltify_scopes: Config.credentials.tiltify_scopes,

				twitchExtension_client_id: Config.credentials.twitchExtension_client_id,
			};

			const youtubeCredentials = Config.YOUTUBE_CREDENTIALS;
			if (youtubeCredentials) {
				json.youtube_client_id = youtubeCredentials.client_id;
				json.youtube_scopes = Config.credentials.youtube_scopes;
			}

			this.config_cache = config = JSON.stringify(json);
		}
		response.header("Content-Type", "application/json");
		response.status(200);
		response.send(config);
	}

	private getAnnouncements(_request: FastifyRequest, response: FastifyReply): void {
		response.header("Content-Type", "application/json");
		response.status(200);
		response.send(AdminController.announcements_cache);
	}

	private async postLog(request: FastifyRequest, response: FastifyReply): Promise<void> {
		if (!(await super.twitchUserGuard(request, response))) return;

		const body: any = request.body;
		type logsCategories = Parameters<typeof Config.LOGS_PATH>[0];
		const logType: logsCategories = (
			(body.cat as string) || ""
		).toLowerCase() as logsCategories;
		const logData: string = JSON.stringify(body.log) || "";

		if (!logData || !Utils.logToFile(logType, logData)) {
			response.header("Content-Type", "application/json");
			response.status(404);
			response.send(
				JSON.stringify({
					success: false,
					error: "invalid category",
					errorCode: "INVALID_CATEGORY",
				}),
			);
			return;
		}

		response.header("Content-Type", "application/json");
		response.status(200);
		response.send({ success: true });
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
	public async getDownload(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const image = (request.query as any).image;
		const abort = new AbortController();
		const timeout = setTimeout(() => abort.abort(), 10000);
		try {
			const url = new URL(image);
			// Refuse any non-cloudfront URLs to reduce abuse possibilities
			const isCloudfront =
				url.hostname === "cloudfront.net" || url.hostname.endsWith(".cloudfront.net");
			if (url.protocol !== "https:" || !isCloudfront) {
				response.header("Content-Type", "application/json");
				response.status(400);
				response.send(JSON.stringify({ success: false, message: "Invalid source URL" }));
				return;
			}

			// don't follow redirects
			const res = await fetch(url, { signal: abort.signal, redirect: "error" });

			//Content-Length cannot be trusted but if it's already too big.. jsut give up!
			const announcedSize = parseInt(res.headers.get("Content-Length") || "0");
			const buffer =
				announcedSize > this.DOWNLOAD_MAX_BYTES
					? null
					: await this.readCappedBody(res, this.DOWNLOAD_MAX_BYTES);

			if (!buffer) {
				response.header("Content-Type", "application/json");
				response.status(413);
				response.send(JSON.stringify({ success: false, message: "Image too large" }));
				return;
			}

			//Never reflect the upstream Content-Type: anyone can host a cloudfront
			//distribution, and "text/html" served from here would run on the
			//twitchat.fr origin with access to the tokens in localStorage
			const mimeType = Utils.getImageMimeType(buffer);
			if (!mimeType) {
				Logger.warn("Refused non-image download from " + url.href);
				response.header("Content-Type", "application/json");
				response.status(400);
				response.send(JSON.stringify({ success: false, message: "Not an image" }));
				return;
			}

			response.header("Content-Type", mimeType);
			response.header("Content-Length", buffer.length);
			response.header("X-Content-Type-Options", "nosniff");
			response.send(buffer);
		} catch (_error) {
			response.header("Content-Type", "application/json");
			response.status(500);
			response.send(
				JSON.stringify({ success: false, message: "an unknown error has occured" }),
			);
		} finally {
			clearTimeout(timeout);
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
	 * Reads a response body, giving up as soon as it goes over "max" bytes.
	 */
	private async readCappedBody(
		res: Awaited<ReturnType<typeof fetch>>,
		max: number,
	): Promise<Buffer | null> {
		const reader = res.body?.getReader();
		if (!reader) return Buffer.alloc(0);

		const chunks: Buffer[] = [];
		let total = 0;
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > max) {
				await reader.cancel();
				return null;
			}
			chunks.push(Buffer.from(value));
		}
		return Buffer.concat(chunks);
	}
}
