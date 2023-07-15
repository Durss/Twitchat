import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController";
import Logger from "../utils/Logger";
import * as fetch from "node-fetch";
import Config from "../utils/Config";

/**
* Created : 15/07/2023 
*/
export default class TenorController extends AbstractController {

	private lastDate:number = 0;
	private timeout:NodeJS.Timeout|number = -1;
	private rateLimit:number = 1100;//Actual limit is 1s, adding 100ms for security
	private queue:{request:FastifyRequest, response:FastifyReply}[] = [];
	
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
		this.server.get('/api/tenor/search', async (request, response) => await this.getSearchGif(request, response));
	}
	
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	public async getSearchGif(request:FastifyRequest, response:FastifyReply):Promise<void> {
		//If a query has been executed less than the "rateLimit" duration ago, add the
		//request to queue.
		if(Date.now() - this.lastDate < this.rateLimit) {
			this.queue.push({request, response});

			clearTimeout(this.timeout);
			this.timeout = setTimeout(()=> {
				let entry = this.queue.shift();
				this.getSearchGif(entry.request, entry.response);
			}, this.rateLimit - (Date.now() - this.lastDate));

			return;
		}
		const params = request.query as any;
		const search = params.search;

		let json;
		try {
			const url = new URL("https://tenor.googleapis.com/v2/search");
			url.searchParams.append("q", search);
			url.searchParams.append("key", Config.credentials.tenor_secret);
			url.searchParams.append("client_key", "twitchat");
			url.searchParams.append("limit", "20");
			url.searchParams.append("contentfilter", "high");
			url.searchParams.append("random", "true");
			const res = await fetch(url, {method:"GET"});
			json = await res.json();
		}catch(error) {
			Logger.error("Tenor loading failed => "+search);
			console.log(error);

			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:'error', success:false}));
			return;
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:json.results}));

		//Execute any pending queries
		if(this.queue.length > 0) {
			clearTimeout(this.timeout);
			this.timeout = setTimeout(()=> {
				let entry = this.queue.shift();
				this.getSearchGif(entry.request, entry.response);
			}, this.rateLimit);
		}
	}
}