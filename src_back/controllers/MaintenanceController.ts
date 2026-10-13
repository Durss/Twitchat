import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController.js";

/**
 * Created : 13/10/2026
 */
export default class MaintenanceController extends AbstractController {
	public static readonly STATUS_PATH = "/api/maintenance/status";

	constructor(public server: FastifyInstance) {
		super();
	}

	/********************
	 * GETTER / SETTERS *
	 ********************/

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

	/*******************
	 * PRIVATE METHODS *
	 *******************/

	/**
	 * Public maintenance status
	 */
	private getStatus(_request: FastifyRequest, response: FastifyReply): void {
		const data: MaintenanceClientData = { state: "off", lockAt: 0, lockIn: 0, message: "" };
		this.disableCache(response);
		response
			.header("Content-Type", "application/json")
			.status(200)
			.send(JSON.stringify({ success: true, data }));
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
