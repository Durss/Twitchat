import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import TwitchUtils from "../utils/TwitchUtils.js";
import Utils from "../utils/Utils.js";
import AbstractController from "./AbstractController.js";

/**
* Created : 23/02/2024
*/
export default class SSEController extends AbstractController {

	private static uidToResponse:{[key:string]:{pingTimeout?:NodeJS.Timeout, connection:FastifyReply}[]} = {};

	constructor(public server:FastifyInstance) {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/



	/******************
	* PUBLIC METHODS *
	******************/
	public initialize():void {
		this.server.get('/api/sse/register', async (request, response) => await this.postRegisterSSE(request, response));

		// Broadcast an event to all connected peers before server restarts.
		// This tells clients not to reconnect right away
		async function exitHandler(options, exitCode) {
			let i = 0;
			Object.keys(SSEController.uidToResponse).forEach(uid => {
				console.log("Sending SERVER_UPDATE to", uid);
				SSEController.sendToUser(uid, "SERVER_UPDATE", {delay: 5000 + i * 50});
			});

			await Utils.promisedTimeout(3000);
			if (options.cleanup) console.log('clean');
			if (exitCode || exitCode === 0) console.log(exitCode);
			if (options.exit) process.exit();
		}

		// do something when app is closing
		process.on('exit', exitHandler.bind(null,{cleanup:true}));

		// catches ctrl+c event
		process.on('SIGINT', exitHandler.bind(null, {exit:true}));

		// catches "kill pid" (for example: nodemon restart)
		process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));

		process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

		// catches PM2 stop/restart events
		process.on('SIGTERM', exitHandler.bind(null, {exit:true}));

		// catches uncaught exceptions
		process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

		// PM2 on windows sends a message before shutdown
		process.on('message', function(msg) {
			if (msg == 'shutdown') {
				exitHandler({}, 0);
			}
		});

	}

	/**
	 * Push an event to the given user with the given data
	 * @param uid
	 * @param data
	 * @returns
	 */
	public static sendToUser(uid:string, code:keyof typeof SSECode, data?:unknown):boolean {
		const responses = this.uidToResponse[uid];
		if(!responses) return false;
		responses.forEach(params => {
			this.schedulePing(params);
			params.connection.sse({id:Utils.getUUID(), data:JSON.stringify({success:true, code, data})})
		})
		return true;
	}

	public static countUserConnexions(uid:string):number {
		return this.uidToResponse[uid]? this.uidToResponse[uid].length : 0;
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Init an SSE connection
	 *
	 * @param request
	 * @param response
	 * @returns
	 */
	private async postRegisterSSE(request:FastifyRequest, response:FastifyReply):Promise<void> {
		response.sse({id:"connecting", data:JSON.stringify({success:true, code:SSECode.CONNECTING})});
		const queryParams = request.query as any;
		const userInfo = await TwitchUtils.getUserFromToken(queryParams.token);
		if(!userInfo) {
			response.sse({id:"error", data:JSON.stringify({success:true, code:SSECode.AUTHENTICATION_FAILED})});
			return;
		}

		if(!SSEController.uidToResponse[userInfo.user_id]) SSEController.uidToResponse[userInfo.user_id] = [];
		const params:typeof SSEController.uidToResponse["string"][number] = {connection:response};
		SSEController.uidToResponse[userInfo.user_id].push(params);
		SSEController.schedulePing(params);

		response.sse({id:"connect", data:JSON.stringify({success:true, code:SSECode.CONNECTED})});

		request.socket.on('close', ()=>{
			const connexions = SSEController.uidToResponse[userInfo.user_id];
			if(!connexions) return;
			for (let i = 0; i < connexions.length; i++) {
				const params = connexions[i];
				if(params.connection == response) {
					//Stop ping
					clearInterval(params.pingTimeout)
					connexions.splice(i, 1);
					i--;
				}
			}
		});
	}

	/**
	 * Schedules a ping 90s after last event.
	 * This is necessary if app is behind cloudflare as CF kills innactive
	 * connections after 100s.
	 * Sending a ping tells them connection is still active
	 * @param params
	 */
	private static schedulePing(params:typeof SSEController.uidToResponse["string"][number]):void {
		if(params.pingTimeout) {
			clearTimeout(params.pingTimeout);
		}
		params.pingTimeout = setInterval(()=> {
			params.connection.sse({id:"ping", data:JSON.stringify({success:true, code:SSECode.PING})});
		}, 90000);
	}
}

export const SSECode = {
	PING:"PING" as const,
	CONNECTED:"CONNECTED" as const,
	CONNECTING:"CONNECTING" as const,
	KO_FI_EVENT:"KO_FI_EVENT" as const,
	KO_FI_DELETE_WEBHOOK:"KO_FI_DELETE_WEBHOOK" as const,
	NOTIFICATION:"NOTIFICATION" as const,
	TRIGGER_SLASH_COMMAND:"TRIGGER_SLASH_COMMAND" as const,
	AUTHENTICATION_FAILED:"AUTHENTICATION_FAILED" as const,
	BINGO_GRID_CELL_STATES:"BINGO_GRID_CELL_STATES" as const,
	BINGO_GRID_BINGO_COUNT:"BINGO_GRID_BINGO_COUNT" as const,
	BINGO_GRID_UPDATE:"BINGO_GRID_UPDATE" as const,
	BINGO_GRID_UNTICK_ALL:"BINGO_GRID_UNTICK_ALL" as const,
	BINGO_GRID_MODERATOR_TICK:"BINGO_GRID_MODERATOR_TICK" as const,
	SHARED_MOD_INFO_REQUEST:"SHARED_MOD_INFO_REQUEST" as const,
	QNA_STATE:"QNA_STATE" as const,
	QNA_ACTION:"QNA_ACTION" as const,
	LABELS_UPDATE:"LABELS_UPDATE" as const,
	SPOIL_MESSAGE:"SPOIL_MESSAGE" as const,
	TILTIFY_EVENT:"TILTIFY_EVENT" as const,
	PATREON_MEMBER_CREATE:"PATREON_MEMBER_CREATE" as const,
	PRIVATE_MOD_MESSAGE:"PRIVATE_MOD_MESSAGE" as const,
	SERVER_UPDATE:"SERVER_UPDATE" as const,
	PRIVATE_MOD_MESSAGE_ANSWER:"PRIVATE_MOD_MESSAGE_ANSWER" as const,
}
