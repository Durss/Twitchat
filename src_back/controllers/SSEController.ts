import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import TwitchUtils from "../utils/TwitchUtils";
import Utils from "../utils/Utils";
import AbstractController from "./AbstractController";

/**
* Created : 23/02/2024 
*/
export default class SSEController extends AbstractController {

	private static uidToRequest:{[key:string]:FastifyReply} = {};

	
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
	public static sendToUser(uid:string, code:keyof typeof SSECode, data:unknown):boolean {
		const request = this.uidToRequest[uid];
		if(!request) return false;
		request.sse({id:Utils.getUUID(), data:JSON.stringify({success:true, code, data})})
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
		response.sse({id:"connecting", data:JSON.stringify({"success":true, code:SSECode.CONNECTING})});
		const queryParams = request.query as any;
		const userInfo = await TwitchUtils.getUserFromToken(queryParams.token);
		if(!userInfo) {
			response.sse({id:"error", data:JSON.stringify({"success":true, code:SSECode.AUTHENTICATION_FAILED})});
			return;
		}

		SSEController.uidToRequest[userInfo.user_id] = response;

		response.sse({id:"connect", data:JSON.stringify({"success":true, code:SSECode.CONNECTED})});
	}
}

export const SSECode = {
	MESSAGE:"MESSAGE" as const,
	AUTHENTICATION_FAILED:"AUTHENTICATION_FAILED" as const,
	CONNECTED:"CONNECTED" as const,
	CONNECTING:"CONNECTING" as const,
}