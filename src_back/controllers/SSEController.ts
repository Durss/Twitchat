import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import TwitchUtils from "../utils/TwitchUtils.js";
import Utils from "../utils/Utils.js";
import AbstractController from "./AbstractController.js";

/**
* Created : 23/02/2024 
*/
export default class SSEController extends AbstractController {

	private static uidToResponse:{[key:string]:FastifyReply[]} = {};

	
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
		responses.forEach(response => {
			response.sse({id:Utils.getUUID(), data:JSON.stringify({success:true, code, data})})
		})
		return true;
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
		SSEController.uidToResponse[userInfo.user_id].push(response);
		response.sse({id:"connect", data:JSON.stringify({success:true, code:SSECode.CONNECTED})});

		request.socket.on('close', ()=>{
			const connexions = SSEController.uidToResponse[userInfo.user_id];
			if(!connexions) return;
			for (let i = 0; i < connexions.length; i++) {
				const c = connexions[i];
				if(c == response) {
					connexions.splice(i, 1);
					i--;
				}
			}
		});
	}
}

export const SSECode = {
	CONNECTED:"CONNECTED" as const,
	CONNECTING:"CONNECTING" as const,
	KO_FI_EVENT:"KO_FI_EVENT" as const,
	NOTIFICATION:"NOTIFICATION" as const,
	TRIGGER_SLASH_COMMAND:"TRIGGER_SLASH_COMMAND" as const,
	AUTHENTICATION_FAILED:"AUTHENTICATION_FAILED" as const,
	BINGO_GRID_CELL_STATES:"BINGO_GRID_CELL_STATES" as const,
	BINGO_GRID_BINGO_COUNT:"BINGO_GRID_BINGO_COUNT" as const,
	BINGO_GRID_UPDATE:"BINGO_GRID_UPDATE" as const,
	BINGO_GRID_UNTICK_ALL:"BINGO_GRID_UNTICK_ALL" as const,
	BINGO_GRID_MODERATOR_TICK:"BINGO_GRID_MODERATOR_TICK" as const,
}