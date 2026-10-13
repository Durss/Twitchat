import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController.js";
import { APP_VERSION } from "../utils/AppVersion.js";
import Logger from "../utils/Logger.js";

/**
 * Created : 13/10/2026
 */
export default class MaintenanceController extends AbstractController {
	public static readonly STATUS_PATH = "/api/maintenance/status";
	/**
	 * Current Major app version
	 */
	private static readonly SERVER_MAJOR = parseInt(APP_VERSION.split(".")[0] ?? "");

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
		return { state: "off", lockAt: 0, lockIn: 0, message: "" };
	}

	/******************
	 * PUBLIC METHODS *
	 ******************/
	public initialize(): void {
		this.server.get(
			MaintenanceController.STATUS_PATH,
			async (request: FastifyRequest, response: FastifyReply) =>
				this.getStatus(request, response),
		);
	}

	/**
	 * Checks request's app version and refuse it if major is lower than current's server
	 * major version
	 *
	 * @returns true if the request has been refused
	 */
	public static refuseOutdatedApp(request: FastifyRequest, response: FastifyReply): boolean {
		const version = String(request.headers["app-version"] ?? "");
		const major = parseInt(version.split(".")[0] ?? "");
		if (isNaN(major) || major >= MaintenanceController.SERVER_MAJOR) return false;

		Logger.info(
			"[MAINTENANCE] Refused " + request.method + " " + request.url + " from app v" + version,
		);
		response
			.header("Content-Type", "application/json")
			.status(503)
			.send(
				JSON.stringify({
					success: false,
					errorCode: "MAINTENANCE",
					error: "Outdated app version, please reload the page",
				}),
			);
		return true;
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/

	/**
	 * Public maintenance status
	 */
	private getStatus(_request: FastifyRequest, response: FastifyReply): void {
		this.disableCache(response);
		response
			.header("Content-Type", "application/json")
			.status(200)
			.send(JSON.stringify({ success: true, data: MaintenanceController.maintenanceStatus }));
	}
}

export interface MaintenanceClientData {
	state: "off" | "announced" | "locked";
	/**
	 * Timestamp at which clients must leave the app
	 */
	lockAt: number;
	/**
	 * Remaining time before lockAt (in milliseconds)
	 */
	lockIn: number;
	/**
	 * Optional message displayed on the maintenance page
	 */
	message: string;
}
