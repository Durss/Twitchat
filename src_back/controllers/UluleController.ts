import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fetch from "node-fetch";;
import Logger from "../utils/Logger.js";
import AbstractController from "./AbstractController.js";

/**
* Created : 10/06/2023 
*/
export default class UluleController extends AbstractController {
	
	constructor(public server:FastifyInstance) {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public async initialize():Promise<void> {
		this.server.get('/api/ulule/project', async (request, response) => await this.getProjectDetails(request, response));
	}
	
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	public async getProjectDetails(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const params = request.query as any;
		const project = params.project;

		const options = {
			method:"GET",
			headers: {
				"Content-Type": "application/json",
			},
		}
		
		let json;
		try {
			const res = await fetch("https://api.ulule.com/v1/projects/"+project, options);
			json = await res.json();
		}catch(error) {
			Logger.error("Ulule project loading failed => "+project);
			console.log(error);

			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:'error', success:false}));
			return;
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify(json));
	}
}