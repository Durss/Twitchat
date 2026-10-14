import { FastifyInstance, FastifyReply, FastifyRequest, RouteShorthandOptions } from "fastify";
import * as fs from "fs";
import AbstractController from "./AbstractController.js";
import SSEController from "./SSEController.js";
import { APP_VERSION } from "../utils/AppVersion.js";
import Config from "../utils/Config.js";
import Logger from "../utils/Logger.js";
import TwitchUtils from "../utils/TwitchUtils.js";
import Utils from "../utils/Utils.js";

declare module "fastify" {
	interface FastifyContextConfig {
		/**
		 * set on routes that should be allowed during maintenance
		 */
		maintenance?: "allow";
	}
}

/**
 * Created : 13/10/2026
 */
export default class MaintenanceController extends AbstractController {
	/**
	 * options to set on route that must be allowed during maintenance
	 */
	public static readonly ROUTE_ALLOWED: RouteShorthandOptions = {
		config: { maintenance: "allow" },
	};
	/**
	 * Cookie set for admins during maintenance so they can reach the app
	 */
	public static readonly ADMIN_COOKIE = "twitchat_maintenance_admin";
	private static readonly ADMIN_COOKIE_MAX_AGE = 30 * 24 * 3600;
	private static readonly SERVER_MAJOR = MaintenanceController.parseMajor(APP_VERSION);

	private static _maintenanceState: MaintenanceData = { state: "off", lockAt: 0, message: {} };
	private static _lockTimeout: NodeJS.Timeout | undefined;

	constructor(public server: FastifyInstance) {
		super();
	}

	/********************
	 * GETTER / SETTERS *
	 ********************/
	/**
	 * Get current maintenance status
	 */
	public static get maintenanceStatus(): MaintenanceClientData {
		const data = this._maintenanceState;
		return {
			state: data.state,
			lockAt: data.lockAt,
			lockIn: Math.max(0, data.lockAt - Date.now()),
			message: data.message,
		};
	}

	/**
	 * trueif clients must be redirected to maintenance
	 */
	public static get isClientLocked(): boolean {
		const data = this._maintenanceState;
		return data.state != "off" && Date.now() >= data.lockAt;
	}

	/**
	 * true once the server refuses API calls
	 */
	public static get isServerLocked(): boolean {
		return this._maintenanceState.state == "locked";
	}

	/******************
	 * PUBLIC METHODS *
	 ******************/
	public initialize(): void {
		this.server.get(
			"/api/maintenance/status",
			{ config: { ...MaintenanceController.ROUTE_ALLOWED.config, rateLimit: false } },
			async (request: FastifyRequest, response: FastifyReply) =>
				this.getStatus(request, response),
		);
		this.server.get(
			"/api/admin/maintenance",
			async (request: FastifyRequest, response: FastifyReply) =>
				await this.getAdminStatus(request, response),
		);
		this.server.post(
			"/api/admin/maintenance",
			async (request: FastifyRequest, response: FastifyReply) =>
				await this.postMaintenance(request, response),
		);

		if (fs.existsSync(Config.MAINTENANCE_PATH)) {
			try {
				MaintenanceController._maintenanceState = JSON.parse(
					fs.readFileSync(Config.MAINTENANCE_PATH, "utf-8"),
				);
			} catch (_error) {
				Logger.error("[MAINTENANCE] Failed parsing maintenance file");
			}
		}

		//Resume lock schedule after a restart
		if (MaintenanceController._maintenanceState.state == "announced") {
			this.scheduleLock();
		}
		if (MaintenanceController._maintenanceState.state != "off") {
			Logger.warn(
				"[MAINTENANCE] Maintenance mode is " +
					MaintenanceController._maintenanceState.state.toUpperCase(),
			);
		}
	}

	/**
	 * gets if given api call is allowed
	 */
	public static async isApiCallAllowed(request: FastifyRequest): Promise<boolean> {
		if (request.routeOptions.config.maintenance == "allow") return true;
		return MaintenanceController.isAdminRequest(request);
	}

	/**
	 * gets if given request is made by an admin user
	 */
	public static async isAdminRequest(request: FastifyRequest): Promise<boolean> {
		const user = await TwitchUtils.getUserFromToken(request.headers.authorization);
		return user != null && Config.credentials.admin_ids.includes(user.user_id);
	}

	/**
	 * gets if client has the temporary admin cookie
	 */
	public static hasAdminCookie(request: FastifyRequest): boolean {
		const key = MaintenanceController._maintenanceState.adminKey;
		if (!key) return false;
		const expected = MaintenanceController.ADMIN_COOKIE + "=" + key;
		return (request.headers.cookie ?? "")
			.split(";")
			.some((cookie) => cookie.trim() == expected);
	}

	/**
	 * Rejects given request with maintenance status
	 */
	public static refuse(response: FastifyReply, error: string): void {
		response
			.header("Content-Type", "application/json")
			.header("Retry-After", "60")
			.status(503)
			.send(JSON.stringify({ success: false, errorCode: "MAINTENANCE", error }));
	}

	/**
	 * Checks request's app version and refuse it if major is lower than current's server
	 * major version
	 *
	 * @returns true if the request has been refused
	 */
	public static refuseOutdatedApp(request: FastifyRequest, response: FastifyReply): boolean {
		const version = String(request.headers["app-version"] ?? "");
		const major = MaintenanceController.parseMajor(version);
		if (isNaN(major) || major >= MaintenanceController.SERVER_MAJOR) return false;

		Logger.info(
			"[MAINTENANCE] Refused " + request.method + " " + request.url + " from app v" + version,
		);
		MaintenanceController.refuse(response, "Outdated app version, please reload the page");
		return true;
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/
	/**
	 * Get major version number of given version number
	 */
	private static parseMajor(version: string): number {
		return parseInt(version.split(".")[0] ?? "");
	}

	/**
	 * Public maintenance status, polled by the maintenance page
	 */
	private getStatus(_request: FastifyRequest, response: FastifyReply): void {
		this.disableCache(response);
		this.sendStatus(response);
	}

	/**
	 * Status endpoint for the admin.
	 * Called by the maintenance page.
	 */
	private async getAdminStatus(request: FastifyRequest, response: FastifyReply): Promise<void> {
		if (!(await MaintenanceController.isAdminRequest(request))) {
			response
				.header("Content-Type", "application/json")
				.status(401)
				.send(
					JSON.stringify({
						success: false,
						errorCode: "MISSING_ADMIN_PERMISSION",
						error: "You're not allowed to call this endpoint",
					}),
				);
			return;
		}
		const user = await super.adminGuard(request, response);
		if (user === false) return;
		this.setAdminCookie(response);
		this.sendStatus(response);
	}

	/**
	 * Updates maintenance state
	 */
	private async postMaintenance(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const user = await super.adminGuard(request, response);
		if (user === false) return;

		const body = request.body as {
			state: MaintenanceData["state"];
			lockInMinutes?: number;
			message?: MaintenanceData["message"];
		};
		const data = MaintenanceController._maintenanceState;
		const message = body.message ?? {};

		switch (body.state) {
			case "announced": {
				const minutes = Math.min(7 * 24 * 60, Math.max(0, Number(body.lockInMinutes) || 0));
				data.state = "announced";
				data.lockAt = Date.now() + minutes * 60 * 1000;
				data.message = message;
				break;
			}
			case "locked": {
				data.state = "announced";
				data.lockAt = Date.now();
				// keep current message if none is given
				if (Object.values(message).some((v) => v.trim())) data.message = message;
				break;
			}
			case "off": {
				data.state = "off";
				data.lockAt = 0;
				data.message = {};
				break;
			}
			default: {
				response
					.header("Content-Type", "application/json")
					.status(400)
					.send(
						JSON.stringify({
							success: false,
							errorCode: "INVALID_STATE",
							error: "Invalid maintenance state",
						}),
					);
				return;
			}
		}

		if (data.state == "off") delete data.adminKey;
		else if (!data.adminKey) data.adminKey = Utils.getUUID();

		Logger.warn(
			"[MAINTENANCE] " +
				user.login +
				" set maintenance to " +
				body.state.toUpperCase() +
				(data.state == "announced"
					? " (lock at " + new Date(data.lockAt).toISOString() + ")"
					: ""),
		);
		this.scheduleLock();
		await this.saveAndBroadcast();
		this.setAdminCookie(response);
		this.sendStatus(response);
	}

	/**
	 * Sends current maintenance status to given response
	 */
	private sendStatus(response: FastifyReply): void {
		response
			.header("Content-Type", "application/json")
			.status(200)
			.send(JSON.stringify({ success: true, data: MaintenanceController.maintenanceStatus }));
	}

	/**
	 * Declare cookie on admin's browser to let them acces app during maintenance
	 */
	private setAdminCookie(response: FastifyReply): void {
		const key = MaintenanceController._maintenanceState.adminKey;
		if (!key) return;
		let cookie =
			MaintenanceController.ADMIN_COOKIE +
			"=" +
			key +
			"; Path=/; HttpOnly; SameSite=Lax; Max-Age=" +
			MaintenanceController.ADMIN_COOKIE_MAX_AGE;
		if (!Config.LOCAL_TESTING) cookie += "; Secure";
		response.header("Set-Cookie", cookie);
	}

	/**
	 * Schedules the server lock 30s after lockAt
	 */
	private scheduleLock(): void {
		clearTimeout(MaintenanceController._lockTimeout);
		const data = MaintenanceController._maintenanceState;
		if (data.state != "announced") return;

		const delay = Math.max(0, data.lockAt + 30_000 - Date.now());
		MaintenanceController._lockTimeout = setTimeout(() => {
			data.state = "locked";
			Logger.warn("[MAINTENANCE] Server is now LOCKED");
			this.saveAndBroadcast().catch((error) => {
				Logger.error("[MAINTENANCE] Failed saving maintenance state");
				console.log(error);
			});
		}, delay);
	}

	/**
	 * Saves maintenance state and sends it to every connected client
	 */
	private async saveAndBroadcast(): Promise<void> {
		await Utils.writeFileAtomic(
			Config.MAINTENANCE_PATH,
			JSON.stringify(MaintenanceController._maintenanceState),
		);
		const status = MaintenanceController.maintenanceStatus;
		SSEController.broadcast("MAINTENANCE", () => status);
	}
}

interface MaintenanceData {
	state: "off" | "announced" | "locked";
	/**
	 * Timestamp at which clients must leave the app
	 */
	lockAt: number;
	/**
	 * Optional message per language displayed on the banner and the maintenance page
	 * ex: {en:"...", fr:"..."}
	 */
	message: { [lang: string]: string };
	/**
	 * Secret expected in ADMIN_COOKIE. Only exists while maintenance is
	 * announced or locked, never sent to clients.
	 */
	adminKey?: string;
}

export interface MaintenanceClientData extends Omit<MaintenanceData, "adminKey"> {
	/**
	 * Remaining time before lockAt (in milliseconds)
	 */
	lockIn: number;
}
