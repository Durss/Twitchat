import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import Utils from "../utils/Utils.js";
import AbstractController from "./AbstractController.js";
import Logger from "../utils/Logger.js";

interface SSERegisterToken {
	uid: string;
	jti: string;
	iat?: number;
	exp?: number;
}

// Type augmentation for FastifyReply to include 'sse' method
declare module "fastify" {
	interface FastifyReply {
		sse(payload: { id: string; data: string }): void;
	}
}

/**
 * Created : 23/02/2024
 */
export default class SSEController extends AbstractController {
	private static uidToResponse: {
		[uid: string]: {
			pingTimeout?: NodeJS.Timeout;
			connection: FastifyReply;
			isMainApp: boolean;
		}[];
	} = {};

	// Single-use JTIs minted by /api/sse/auth and consumed by /api/sse/register.
	// Each entry self-expires when the JWT does (60s after mint).
	private static usedSseJtis: Map<string, NodeJS.Timeout> = new Map();
	private static readonly SSE_TOKEN_TTL_SECONDS = 60;

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
		this.server.post(
			"/api/sse/auth",
			async (request, response) => await this.postSseAuth(request, response),
		);
		this.server.get(
			"/api/sse/register",
			async (request, response) => await this.postRegisterSSE(request, response),
		);

		// Broadcast an event to all connected peers before server restarts.
		// This tells clients not to reconnect right away
		async function exitHandler(
			options: { cleanup?: boolean; exit?: boolean },
			exitCode?: number,
		) {
			let i = 0;
			const keys = Object.keys(SSEController.uidToResponse);
			keys.forEach((uid) => {
				const entry = SSEController.uidToResponse[uid];
				if (!entry || entry.length === 0) return;

				console.log("Sending SERVER_UPDATE to", uid);
				SSEController.sendToUser(uid, "SERVER_UPDATE", { delay: 5000 + i * 50 });
			});
			Logger.info("Sent SERVER_UPDATE to", keys.length.toString(), "users");

			await Utils.promisedTimeout(3000);
			if (options.cleanup) console.log("clean");
			if (exitCode || exitCode === 0) console.log(exitCode);
			if (options.exit) process.exit();
		}

		// do something when app is closing
		process.on("exit", exitHandler.bind(null, { cleanup: true }));

		// catches ctrl+c event
		process.on("SIGINT", exitHandler.bind(null, { exit: true }));

		// catches "kill pid" (for example: nodemon restart)
		process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));

		process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));

		// catches PM2 stop/restart events
		process.on("SIGTERM", exitHandler.bind(null, { exit: true }));

		// catches uncaught exceptions
		process.on("uncaughtException", exitHandler.bind(null, { exit: true }));

		// PM2 on windows sends a message before shutdown
		process.on("message", function (msg) {
			if (msg == "shutdown") {
				void exitHandler({}, 0);
			}
		});
	}

	/**
	 * Push an event to the given user with the given data
	 * @param uid
	 * @param data
	 * @returns
	 */
	public static sendToUser(uid: string, code: keyof typeof SSECode, data?: unknown): boolean {
		const responses = this.uidToResponse[uid];
		if (!responses) return false;
		responses.forEach((params) => {
			this.schedulePing(params);
			params.connection.sse({
				id: Utils.getUUID(),
				data: JSON.stringify({ success: true, code, data }),
			});
		});
		return true;
	}

	/**
	 * Get the number of active SSE connections for given user ID
	 * @param uid
	 * @returns
	 */
	public static countUserConnexions(uid: string): number {
		return this.uidToResponse[uid]
			? this.uidToResponse[uid].filter((v) => v.isMainApp).length
			: 0;
	}

	/**
	 * Get connected user IDs
	 * @returns
	 */
	public static connectedUserIDs(): string[] {
		return Object.keys(this.uidToResponse);
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/
	/**
	 * Exchange a Twitch token (sent via Authorization header) for a short-lived
	 * single-use JWT that can be put in the EventSource URL.
	 * This avoids sending twitch's access_token as URL parameter which would
	 * leak it.
	 */
	private async postSseAuth(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const userInfo = await super.twitchUserGuard(request, response);
		if (userInfo === false) return;

		const jti = Utils.getUUID();
		const token = jwt.sign(
			{ uid: userInfo.user_id, jti } satisfies SSERegisterToken,
			Utils.derivedSecret("sse_register"),
			{ algorithm: "HS256", expiresIn: SSEController.SSE_TOKEN_TTL_SECONDS },
		);

		response
			.header("Content-Type", "application/json")
			.status(200)
			.send(JSON.stringify({ success: true, token }));
	}

	/**
	 * Init an SSE connection
	 *
	 * @param request
	 * @param response
	 * @returns
	 */
	private async postRegisterSSE(request: FastifyRequest, response: FastifyReply): Promise<void> {
		response.sse({
			id: "connecting",
			data: JSON.stringify({ success: true, code: SSECode.CONNECTING }),
		});
		const queryParams = request.query as { token: string; mainApp?: string };

		let payload: SSERegisterToken | null = null;
		try {
			payload = jwt.verify(queryParams.token, Utils.derivedSecret("sse_register"), {
				algorithms: ["HS256"],
			}) as SSERegisterToken;
		} catch {
			response.sse({
				id: "error",
				data: JSON.stringify({ success: true, code: SSECode.AUTHENTICATION_FAILED }),
			});
			return;
		}

		if (
			!payload ||
			!payload.uid ||
			!payload.jti ||
			SSEController.usedSseJtis.has(payload.jti)
		) {
			response.sse({
				id: "error",
				data: JSON.stringify({ success: true, code: SSECode.AUTHENTICATION_FAILED }),
			});
			return;
		}

		// Burn the JTI so the same token can't be reused. Auto-cleanup once the
		// JWT would have expired anyway.
		const cleanup = setTimeout(
			() => SSEController.usedSseJtis.delete(payload!.jti),
			SSEController.SSE_TOKEN_TTL_SECONDS * 1000,
		);
		SSEController.usedSseJtis.set(payload.jti, cleanup);

		const uid = payload.uid;
		if (!SSEController.uidToResponse[uid]) SSEController.uidToResponse[uid] = [];
		const params: (typeof SSEController.uidToResponse)["string"][number] = {
			connection: response,
			isMainApp: !!queryParams.mainApp,
		};
		SSEController.uidToResponse[uid]!.push(params);
		SSEController.schedulePing(params);

		request.socket.on("close", () => this.closeConnection(uid, response));
		request.socket.on("connectionAttemptFailed", () => this.closeConnection(uid, response));
		request.socket.on("connectionAttemptTimeout", () => this.closeConnection(uid, response));
		request.socket.on("timeout", () => this.closeConnection(uid, response));
		request.socket.on("end", () => this.closeConnection(uid, response));

		response.sse({
			id: "connect",
			data: JSON.stringify({ success: true, code: SSECode.CONNECTED }),
		});
	}

	private closeConnection(uid: string, response: FastifyReply): void {
		const connexions = SSEController.uidToResponse[uid];
		if (!connexions) return;
		for (let i = 0; i < connexions.length; i++) {
			const params = connexions[i]!;
			if (params.connection == response) {
				//Stop ping
				clearTimeout(params.pingTimeout);
				connexions.splice(i, 1);
				i--;
			}
		}
		if (connexions.length === 0) {
			delete SSEController.uidToResponse[uid];
		}
	}

	/**
	 * Schedules a ping 90s after last event.
	 * This is necessary if app is behind cloudflare as CF kills innactive
	 * connections after 100s.
	 * Sending a ping tells them connection is still active
	 * @param params
	 */
	private static schedulePing(
		params: (typeof SSEController.uidToResponse)["string"][number],
	): void {
		if (params.pingTimeout) {
			clearTimeout(params.pingTimeout);
		}
		params.pingTimeout = setTimeout(() => {
			params.connection.sse({
				id: "ping",
				data: JSON.stringify({ success: true, code: SSECode.PING }),
			});
			// Reschedule for next ping
			SSEController.schedulePing(params);
		}, 90000);
	}
}

export const SSECode = {
	PING: "PING",
	CONNECTED: "CONNECTED",
	CONNECTING: "CONNECTING",
	KO_FI_EVENT: "KO_FI_EVENT",
	KO_FI_DELETE_WEBHOOK: "KO_FI_DELETE_WEBHOOK",
	KO_FI_FAILED_WEBHOOK: "KO_FI_FAILED_WEBHOOK",
	NOTIFICATION: "NOTIFICATION",
	TRIGGER_SLASH_COMMAND: "TRIGGER_SLASH_COMMAND",
	AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
	BINGO_GRID_CELL_STATES: "BINGO_GRID_CELL_STATES",
	BINGO_GRID_BINGO_COUNT: "BINGO_GRID_BINGO_COUNT",
	BINGO_GRID_UPDATE: "BINGO_GRID_UPDATE",
	BINGO_GRID_UNTICK_ALL: "BINGO_GRID_UNTICK_ALL",
	BINGO_GRID_MODERATOR_TICK: "BINGO_GRID_MODERATOR_TICK",
	SHARED_MOD_INFO_REQUEST: "SHARED_MOD_INFO_REQUEST",
	QNA_STATE: "QNA_STATE",
	QNA_ACTION: "QNA_ACTION",
	LABELS_UPDATE: "LABELS_UPDATE",
	SPOIL_MESSAGE: "SPOIL_MESSAGE",
	TILTIFY_EVENT: "TILTIFY_EVENT",
	PATREON_MEMBER_CREATE: "PATREON_MEMBER_CREATE",
	PRIVATE_MOD_MESSAGE: "PRIVATE_MOD_MESSAGE",
	SERVER_UPDATE: "SERVER_UPDATE",
	PRIVATE_MOD_MESSAGE_ANSWER: "PRIVATE_MOD_MESSAGE_ANSWER",
	TWITCHEXT_CLICK: "TWITCHEXT_CLICK",
	TWITCHEXT_QUIZ_ANSWER: "TWITCHEXT_QUIZ_ANSWER",
	REMOTE_ACTION: "REMOTE_ACTION",
	FEATURE_FLAGS_UPDATE: "FEATURE_FLAGS_UPDATE",
} as const;
