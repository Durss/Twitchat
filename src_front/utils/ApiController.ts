import StoreProxy from "@/store/StoreProxy";
import type { UluleTypes } from "@/types/UluleTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { ServerConfig } from "./Config";
import Config from "./Config";
import type { PatreonData } from "./patreon/PatreonDataTypes";
import type { TenorGif } from "@/types/TenorDataTypes";
import Utils from "./Utils";

/**
* Created : 13/07/2023 
*/
export default class ApiController {
	
	constructor() {
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Calle a twitchat api endpoint
	 * @param endpoint 
	 * @param data 
	 * @param method 
	 */
	public static async call<U extends keyof ApiEndpoints, M extends HttpMethod = "GET">(endpoint:U, method?:M, data?:any, attemptIndex:number = 0):Promise<{status:number, json:ApiResponse<ApiEndpoints, U, M>}> {
		const url = new URL(Config.instance.API_PATH+"/"+endpoint);
		const headers:{[key:string]:string} = {
			"Content-Type": "application/json",
			'App-Version': import.meta.env.PACKAGE_VERSION,
		};
		if(StoreProxy.auth.twitch.access_token) {
			headers.Authorization = "Bearer "+StoreProxy.auth.twitch.access_token;
		}
		const options:RequestInit = {
			method: method || "GET",
			headers,
		}
		if(data) {
			if(method === "POST") {
				options.body = JSON.stringify(data);
			}else{
				for (const key in data) {
					url.searchParams.append(key, data[key]);
				}
			}
		}
		const res = await fetch(url, options);
		if(res.status != 200 && attemptIndex < 5) {
			await Utils.promisedTimeout(1000);
			return this.call(endpoint, method, data, attemptIndex+1);
		}
		let json:any = {};
		try {
			json = await res.json();
		}catch(error) {}
		return {status:res.status, json};
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}


type ApiResponse<Endpoints, U extends keyof Endpoints, M extends HttpMethod> =
  U extends keyof Endpoints
    ? M extends keyof Endpoints[U]
      ? Endpoints[U][M]
      : never
    : never;

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type ApiEndpoints =  {
	"auth/twitch": {
		GET: {
			access_token: string;
			expires_in: number;
			refresh_token: string;
			scope: string[];
			token_type: string;
			expires_at: number;
		},
	},
	"auth/CSRFToken": {
		GET: {
			token:string,
		},
		POST: {
			success:boolean,
			message?:string,
		},
	},
	"auth/twitch/refreshtoken": {
		GET: {
			access_token: string;
			expires_in: number;
			refresh_token: string;
			scope: string[];
			token_type: string;
			expires_at: number;
		},
	},
	"beta/user": {
		GET: {
			success:true,
			data:{beta:boolean},
		},
	},
	"beta/user/hasData": {
		GET: {
			success:boolean,
			message?:string,
			data?:{
				betaDate?: number;
				prodDate?: number;
				betaVersion?: number;
				prodVersion?: number;
			}
		}
	},
	"beta/user/migrateToProduction": {
		POST: { success:boolean },
	},
	"admin/beta/user": {
		POST: {
			success:true,
			userList:string[],
		},
		DELETE: {
			success:true,
			userList:string[],
		},
	},
	"admin/beta/user/migrateToProduction": {
		POST: { success:boolean },
	},
	"admin/beta/user/all": {
		DELETE: {
			success:true,
			userList:string[],
		},
	},
	"user/donor/all": {
		GET: {
			success:true,
			data:{
				list:{
					uid: string;
					v: number;
				}[]
			},
		},
	},
	"user/donor/anon": {
		GET: {
			success:true,
			data:{
				public:boolean
			},
		},
		POST: {
			success:true,
			message?:string,
		},
	},
	"script": {
		GET: string,
	},
	"configs": {
		GET: ServerConfig,
	},
	"spotify/auth": {
		GET: {},
	},
	"spotify/refresh_token": {
		GET: {},
	},
	"ulule/project" : {
		GET: UluleTypes.Project,
	},
	"user": {
		GET: {
			success:boolean,
			data:{
				isAdmin:boolean,
				isDonor:boolean,
				isEarlyDonor:boolean,
				level:number,
			}
		},
		POST: {},
	},
	"user/all": {
		GET: {
			success:boolean, 
			message:string, 
			users:{
				id:string, 
				date:number, 
				user:TwitchDataTypes.UserInfo
			}[],
		},
	},
	"user/data": {
		GET: {
			success:boolean,
			data:any,
		},
		POST: {
			success:boolean,
			message?:string,
		},
	},
	"patreon/authenticate": {
		POST: {
			success:boolean,
			message?:string,
			data: {
				access_token: string,
				expires_in: number,
				token_type: string,
				scope: string,
				refresh_token: string,
				version: string,
				expires_at: number,
			}
		}
	},
	"patreon/refresh_token": {
		POST: {
			success:boolean,
			message?:string,
			data: {
				access_token: string,
				refresh_token: string,
				expires_in: number,
				scope: string,
				token_type: string,
				expires_at: number,
			}
		}
	},
	"patreon/isMember": {
		GET: {
			success:boolean,
			message?:string,
			data: {isMember:boolean},
		}
	},
	"tenor/search": {
		GET: {
			success:boolean,
			message?:string,
			data: TenorGif[],
		}
	}
}