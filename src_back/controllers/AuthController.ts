import { FastifyInstance } from 'fastify';
import Logger from '../utils/Logger';

/**
* Created : 13/03/2022 
*/
export default class AuthController {

	
	constructor(public server:FastifyInstance) {
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
	public async initialize():Promise<void> {
		this.server.post('/api/auth/twitch', async (request, reply) => {
			return await this.contact(request.body);
		});
	}

	/**
	 * Authenticate via twitch
	 * @param body 
	 * @returns 
	 */
	private async contact(body:any):Promise<any> {
		let name:string = body.name as string;
		
		return new Promise(async (resolve, reject) => {
			const err = null;
			if(err) {
				Logger.error("Sheet update failed");
				console.log(err);
				reject({success:false, error_code:"XXX", message:"An error occured..."});
				return;
			}else{
				Logger.success("Sheet updated successfully")
				resolve({
					success:true,
				});
			}
		});
	}
}