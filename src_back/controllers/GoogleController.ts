import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController";
import Config from "../utils/Config";
import {Auth, translate_v2} from "googleapis";
import { readFileSync } from "fs";
import Logger from "../utils/Logger";

/**
* Created : 21/11/2023 
*/
export default class GoogleController extends AbstractController {

	private _translater!:translate_v2.Translate;

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
		this.server.post('/api/google/translate', async (request, response) => await this.getTranslation(request, response));

		const auth: Auth.GoogleAuth = new Auth.GoogleAuth({
			keyFilename: Config.CREDENTIALS_ROOT + Config.credentials.google_key,
			scopes:["https://www.googleapis.com/auth/cloud-platform"],
		});
		const json = JSON.parse(readFileSync(Config.CREDENTIALS_ROOT + Config.credentials.google_key, "utf-8"));
		auth.jsonContent = json;
		this._translater = new translate_v2.Translate({auth});

		// this._translater.translations.translate({
		// 	requestBody:{
		// 		format:"text",
		// 		source:"en",
		// 		target:"fr",
		// 		q: ["Dr. Watson, please discard your trash."],
		// 	}
		// }).then(res => {
		// 	//Google typing is wrong. Fix that mistake with this dirty typing
		// 	const data = res.data as {data:translate_v2.Schema$TranslationsListResponse};
		// 	if(data.data.translations) {
		// 		console.log(data.data.translations[0].translatedText);
		// 	}
		// });
	}




	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Request for a text translation
	 * @param request 
	 * @param response 
	 */
	private async getTranslation(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const params:any = request.body;

		try {

			const res = await this._translater.translations.translate({
				requestBody:{
					format:"text",
					source:params.langSource,
					target:params.langTarget,
					q: [params.text],
				}
			});
			//Google typing is wrong. Fix that mistake with this dirty typing
			const data = res.data as {data:translate_v2.Schema$TranslationsListResponse};
			if(data.data.translations) {
				const translation = data.data.translations[0].translatedText
				Logger.success("Translate success:", translation);
				response.header('Content-Type', 'application/json');
				response.status(200);
				response.send(JSON.stringify({success:true, data:{translation:data.data.translations[0].translatedText}}));
			}else{
				Logger.error("Translate failed");
				response.header('Content-Type', 'application/json');
				response.status(404);
				response.send(JSON.stringify({success:false, error:"translation failed", errorCode:"TRANSLATE_FAIL"}));
			}
			
		}catch(error) {
			Logger.error("Translate failed");
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send(JSON.stringify({success:false, error:"translation failed", errorCode:"TRANSLATE_FAIL"}));
		};
	}
}