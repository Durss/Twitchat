import fastify, { FastifyReply, FastifyRequest } from "fastify";
import { PassThrough } from "stream";
import Config from '../utils/Config';

/**
* Created : 14/12/2022 
*/
export default class AbstractController {
	
	constructor() {
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Returns true if it passes the admin check
	 * @param request 
	 * @param response 
	 */
	protected async adminGuard(request:FastifyRequest, response:FastifyReply):Promise<boolean> {
		//Missing auth token
		if(!request.headers.authorization) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false}));
			return false;
		}
		
		const userInfo = await Config.getUserFromToken(request.headers.authorization);
		if(!userInfo) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:"Invalid access token", success:false}));
			return false;
		}
	
		//Only allow admins
		if(Config.credentials.admin_ids.indexOf(userInfo.user_id) == -1) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:"You're not allowed to call this endpoint", success:false}));
			return false;
		}
		return true;
	}
	
	/**
	 * Add headers to disable cache on a query response
	 * @param response 
	 */
	protected disableCache(response:FastifyReply | {setHeader:(key:string, value:string)=>void}):void {
		if("header" in response) {
			response.header("Cache-Control", "no-store, max-age=0, must-revalidate");
			response.header("Expires", "0");
			response.header("Pragma", "no-cache");
			response.header("Surrogate-Control", "no-store");
		}else{
			//Fastify-static returns a wraper of the response that proxies "setHeader()"
			//calls to the response "header()"
			response.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
			response.setHeader("Expires", "0");
			response.setHeader("Pragma", "no-cache");
			response.setHeader("Surrogate-Control", "no-store");
		}
	}
}