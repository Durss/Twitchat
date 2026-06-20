import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Utils from "../utils/Utils.js";
import AbstractController from "./AbstractController.js";
import SSEController from "./SSEController.js";
import Logger from "../utils/Logger.js";
import { createHash } from "node:crypto";
import Config from "../utils/Config.js";
import BingoGridController from "./BingoGridController.js";
import QuizController from "./QuizController.js";
import fetch from "node-fetch";
import UserController from "./UserController.js";

/**
 * The extension code itself isn't part of this repository.
 * At this time, the extension code is part of a dedicated private repository.
 * Not sure yet if it will be made public later.
 *
 * This controller handles API requests made by the "Twichat Companion" Twitch Extension.
 *
 * Created : 10/06/2023
 */
export default class TwitchExtensionController extends AbstractController {
	private _bingoController!: BingoGridController;
	private _quizController!: QuizController;
	private _userController!: UserController;

	constructor(public server: FastifyInstance) {
		super();
	}

	/********************
	 * GETTER / SETTERS *
	 ********************/

	/******************
	 * PUBLIC METHODS *
	 ******************/
	public initialize(
		bingoController: BingoGridController,
		quizController: QuizController,
		userController: UserController,
	): TwitchExtensionController {
		this._bingoController = bingoController;
		this._quizController = quizController;
		this._userController = userController;
		this.server.decorateRequest("twitchExtensionUser", null);
		this.server.get(
			"/api/twitch/extension/streamerstate",
			{ preHandler: this.authHook.bind(this) },
			async (request, response) => await this.getStreamerState(request, response),
		);
		this.server.post(
			"/api/twitch/extension/click",
			{ preHandler: this.authHook.bind(this) },
			async (request, response) => await this.postClickEvent(request, response),
		);
		this.server.post(
			"/api/twitch/extension/keys",
			{ preHandler: this.authHook.bind(this) },
			async (request, response) => await this.postKeysEvent(request, response),
		);
		this.server.post(
			"/api/twitch/extension/bingo/count",
			{ preHandler: this.authHook.bind(this) },
			async (request, response) => await this.postBingoCount(request, response),
		);
		this.server.post(
			"/api/twitch/extension/bingo/states",
			{ preHandler: this.authHook.bind(this) },
			async (request, response) => await this.postBingoStates(request, response),
		);
		this.server.post(
			"/api/twitch/extension/quiz/answer",
			{ preHandler: this.authHook.bind(this) },
			async (request, response) => await this.postQuizAnswer(request, response),
		);
		this.server.get(
			"/api/twitch/extension/config",
			async (request, response) => await this.getEBSConfig(request, response),
		);
		this.server.post(
			"/api/twitch/extension/config",
			async (request, response) => await this.setEBSConfig(request, response),
		);
		return this;
	}

	/**
	 * Notify all clients of a streamer that extension state has been updated
	 * @param channelId
	 */
	public async notifyStateUpdate(channelId: string, notifyUserIds?: string[]): Promise<void> {
		try {
			const res = await fetch(
				Config.credentials.twitchat_extension_api_path + "twitchat/stateUpdate",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-twitchat-verify": getHash(channelId),
						"x-twitchat-channel": channelId,
					},
					body: JSON.stringify({
						channelId,
						notifyUserIds,
					}),
				},
			);
			console.log("Twitchat API response:", res.status, await res.text());
		} catch (_error) {
			Logger.error('Failed calling EBS "stateUpdate" endpoint');
		}
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/
	/**
	 * Verify signature of Twitchat API call
	 * @param request
	 * @param reply
	 * @returns
	 */
	private async authHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
		const headerToken = request.headers.authorization!;
		const headerHash = request.headers["x-twitchat-verify"];
		const hash = createHash("sha512")
			.update(Config.credentials.twitchat_extension_api_secret + ":" + headerToken)
			.digest("hex");

		if (!Utils.safeStringEquals(headerHash, hash)) {
			reply.status(401).send({ success: false, error: "Invalid request signature" });
			return;
		}

		request.twitchExtensionUser = Utils.verifyTwitchExtensionJWT(headerToken);
	}

	/**
	 * Receive a click event from extension
	 * @param request
	 * @param response
	 */
	private async postClickEvent(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const params = request.body as {
			px: number;
			py: number;
			alt: boolean;
			ctrl: boolean;
			shift: boolean;
			areaId?: string;
		};

		try {
			SSEController.sendToUser(request.twitchExtensionUser!.channel_id, "TWITCHEXT_CLICK", {
				...params,
				userId: getUserID(request),
			});
			response.header("Content-Type", "application/json");
			response.status(200);
			response.send(JSON.stringify({ success: true }));
		} catch (error) {
			Logger.error(error);
			response.header("Content-Type", "application/json");
			response.status(401);
			response.send(JSON.stringify({ success: false, message: "unauthorized" }));
		}
	}

	/**
	 * Receive a keys events from extension
	 * @param request
	 * @param response
	 */
	private async postKeysEvent(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const params = request.body as {
			keys: string[];
		};

		try {
			SSEController.sendToUser(request.twitchExtensionUser!.channel_id, "TWITCHEXT_KEYS", {
				keys: params.keys,
				userId: getUserID(request),
			});
			response.header("Content-Type", "application/json");
			response.status(200);
			response.send(JSON.stringify({ success: true }));
		} catch (error) {
			Logger.error(error);
			response.header("Content-Type", "application/json");
			response.status(401);
			response.send(JSON.stringify({ success: false, message: "unauthorized" }));
		}
	}

	/**
	 * Receive a bingo count event from extension
	 * @param request
	 * @param response
	 */
	private async postBingoCount(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const uid = getUserID(request);
		const isAnon = request.twitchExtensionUser!.is_unlinked === true;

		const params = request.body as {
			count: number;
			gridId: string;
		};

		try {
			await this._bingoController.setBingoCount(
				request.twitchExtensionUser!.channel_id,
				uid,
				params.gridId,
				params.count,
				undefined,
				isAnon,
			);
			response.header("Content-Type", "application/json");
			response.status(200);
			response.send(JSON.stringify({ success: true }));
		} catch (error) {
			Logger.error(error);
			response.header("Content-Type", "application/json");
			response.status(401);
			response.send(JSON.stringify({ success: false, message: "unauthorized" }));
		}
	}

	/**
	 * Receive a bingo state from extension
	 * Used when moderators tick cells
	 * @param request
	 * @param response
	 */
	private async postBingoStates(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const uid = getUserID(request);

		//Only allow mods
		const allowedRoles = ["broadcaster", "moderator"];
		if (!allowedRoles.includes(request.twitchExtensionUser!.role)) {
			response.header("Content-Type", "application/json");
			response.status(401);
			response.send(JSON.stringify({ success: false, message: "unauthorized" }));
			return;
		}

		const params = request.body as {
			states: { [cellId: string]: boolean };
			gridId: string;
		};

		try {
			await this._bingoController.moderateEntries(
				request.twitchExtensionUser!.channel_id,
				uid,
				params.gridId,
				params.states,
			);
			response.header("Content-Type", "application/json");
			response.status(200);
			response.send(JSON.stringify({ success: true }));
		} catch (error) {
			Logger.error(error);
			response.header("Content-Type", "application/json");
			response.status(401);
			response.send(JSON.stringify({ success: false, message: "unauthorized" }));
		}
	}

	/**
	 * Receive a quiz answer
	 * @param request
	 * @param response
	 */
	private async postQuizAnswer(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const params = request.body as {
			/**
			 * The ID of the quiz being answered.
			 */
			quizId: string;
			/**
			 * The ID of the question being answered.
			 */
			questionId: string;
			/**
			 * For non-free answer questions, the ID of the selected answer.
			 */
			answerId?: string;
			/**
			 * For free answer questions, the raw text answer provided by the user.
			 */
			answerText?: string;
			/**
			 * Delay with streamer
			 */
			delay_ms: number;
		};

		try {
			SSEController.sendToUser(
				request.twitchExtensionUser!.channel_id,
				"TWITCHEXT_QUIZ_ANSWER",
				{
					quizId: params.quizId,
					questionId: params.questionId,
					answerId: params.answerId,
					answerText: params.answerText,
					delay_ms: params.delay_ms,
					userId: getUserID(request),
					opaqueUserId: request.twitchExtensionUser!.opaque_user_id,
				},
			);
			response.header("Content-Type", "application/json");
			response.status(200);
			response.send(JSON.stringify({ success: true }));
		} catch (error) {
			Logger.error(error);
			response.header("Content-Type", "application/json");
			response.status(401);
			response.send(JSON.stringify({ success: false, message: "unauthorized" }));
		}
	}

	/**
	 * Request a streamer's state
	 * @param request
	 * @param response
	 */
	private async getStreamerState(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const channelId = request.twitchExtensionUser!.channel_id;
		const viewerId = getUserID(request);
		const bingos = await this._bingoController.getViewerGridList(channelId, viewerId);
		const quiz = this._quizController.getStreamerQuiz(channelId);
		const clickableAreas = await this._userController.getActiveHeatScreenAreas(channelId);

		response.header("Content-Type", "application/json");
		response.status(200);
		response.send(JSON.stringify({ success: true, state: { bingos, quiz, clickableAreas } }));
	}

	/**
	 * Get current EBS config for current user
	 */
	public async getEBSConfig(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const user = await super.twitchUserGuard(request, response);
		if (!user) return;
		try {
			const res = await fetch(
				Config.credentials.twitchat_extension_api_path + "extension/config",
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						"x-twitchat-verify": getHash(user.user_id),
						"x-twitchat-channel": user.user_id,
					},
				},
			);
			let config = "";
			let success = false;
			if (res.status === 200) {
				const json = (await res.json()) as { success: boolean; content: string };
				config = json.content;
				success = json.success;
			} else {
				console.log("Failed to get EBS config, Twitchat API response:", res.status);
				console.log(await res.text());
			}
			response.header("Content-Type", "application/json");
			response.status(res.status);
			response.send(JSON.stringify({ success, config }));
		} catch (_error) {
			response.header("Content-Type", "application/json");
			response.status(500);
			response.send(
				JSON.stringify({ success: false, message: "Could not contact EBS server" }),
			);
		}
	}

	/**
	 * Set current EBS config for current user
	 */
	public async setEBSConfig(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const user = await super.twitchUserGuard(request, response);
		if (!user) return;

		const params = request.body as {
			segment?: "broadcaster" | "global" | "developer";
			config: unknown;
		};

		try {
			const res = await fetch(
				Config.credentials.twitchat_extension_api_path + "extension/config",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-twitchat-verify": getHash(user.user_id),
						"x-twitchat-channel": user.user_id,
					},
					body: JSON.stringify({ segment: params.segment, content: params.config }),
				},
			);
			let config = "";
			let success = false;
			if (res.status === 200) {
				const json = (await res.json()) as { success: boolean; content: string };
				config = json.content;
				success = json.success;
			}
			response.header("Content-Type", "application/json");
			response.status(res.status);
			response.send(JSON.stringify({ success, config }));
		} catch (_error) {
			response.header("Content-Type", "application/json");
			response.status(500);
			response.send(JSON.stringify({ success: false, message: "Something went wrong :(" }));
		}
	}
}

function getHash(uid: string): string {
	return createHash("sha512")
		.update(Config.credentials.twitchat_extension_api_secret + ":" + uid)
		.digest("hex");
}

function getUserID(request: FastifyRequest): string {
	return request.twitchExtensionUser!.user_id ?? request.twitchExtensionUser!.opaque_user_id;
}
