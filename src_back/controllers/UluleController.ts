import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fetch from "node-fetch";
import Logger from "../utils/Logger.js";
import AbstractController from "./AbstractController.js";

/**
 * Created : 10/06/2023
 */
export default class UluleController extends AbstractController {
	constructor(public server: FastifyInstance) {
		super();
	}

	/********************
	 * GETTER / SETTERS *
	 ********************/

	/******************
	 * PUBLIC METHODS *
	 ******************/
	public async initialize(): Promise<void> {
		this.server.get(
			"/api/ulule/project",
			async (request, response) => await this.getProjectDetails(request, response),
		);
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/

	public async getProjectDetails(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const params = request.query as any;
		const project = params.project;

		// make sure the ID looks legit
		if (typeof project !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(project)) {
			response.header("Content-Type", "application/json");
			response.status(400);
			response.send(
				JSON.stringify({
					message: "Invalid project ID",
					errorCode: "INVALID_PROJECT",
					success: false,
				}),
			);
			return;
		}

		const options = {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		};

		const abort = new AbortController();
		const timeout = setTimeout(() => abort.abort(), 10000);

		let json;
		try {
			const res = await fetch("https://api.ulule.com/v1/projects/" + project, {
				...options,
				signal: abort.signal,
			});
			json = await res.json();
		} catch (error) {
			Logger.error("Ulule project loading failed => " + project);
			console.log(error);

			response.header("Content-Type", "application/json");
			response.status(500);
			response.send(JSON.stringify({ message: "error", success: false }));
			return;
		} finally {
			clearTimeout(timeout);
		}

		response.header("Content-Type", "application/json");
		response.status(200);
		response.send(JSON.stringify(json));
	}
}
