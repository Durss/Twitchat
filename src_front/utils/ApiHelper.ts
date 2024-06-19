import StoreProxy from "@/store/StoreProxy";
import type { TenorGif } from "@/types/TenorDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { UluleTypes } from "@/types/UluleTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { YoutubeAuthToken } from "@/types/youtube/YoutubeDataTypes";
import type { ServerConfig } from "./Config";
import Config from "./Config";
import Utils from "./Utils";

/**
* Created : 13/07/2023
*/
export default class ApiHelper {

	private static _accessToken:string = "";
	private static _refreshTokenCallback:()=>Promise<false | TwitchDataTypes.AuthTokenResult>;

	constructor() {
	}

	/********************
	* GETTER / SETTERS *
	********************/

	public static set refreshTokenCallback(value:typeof this._refreshTokenCallback) { this._refreshTokenCallback = value; }
	public static set accessToken(value:string) { this._accessToken = value; }
	public static get accessToken():string { return this._accessToken; }



	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Call a twitchat api endpoint
	 * @param endpoint
	 * @param data
	 * @param method
	 */
	public static async call<
		U extends keyof ApiEndpoints,
		M extends AvailableMethods<U>,
		P extends ApiDefinition<ApiEndpoints, U, M>["parameters"]>
		(endpoint:U, method:M, data?:P, retryOnFail:boolean = true, attemptIndex:number = 0, headers:{[key:string]:string} = {})
		:Promise<{status:number; json:ApiDefinition<ApiEndpoints, U, M>["response"]}> {
			
		const url = new URL(Config.instance.API_PATH+"/"+endpoint);
		if(!headers["Content-Type"] && !(data instanceof FormData)) {
			headers["Content-Type"] = "application/json";
		}
		headers["App-Version"] = import.meta.env.PACKAGE_VERSION;
		if(this._accessToken) {
			headers["Authorization"] = "Bearer "+this._accessToken;
		}
		const options:RequestInit = {
			method: method || "GET",
			headers,
		}
		if(data) {
			if(data instanceof FormData) {
				options.body = data;
			}else
			if(method === "POST" || method === "PUT") {
				options.body = JSON.stringify(data);
			}else{
				for (const key in data) {
					url.searchParams.append(key, data[key] + "");
				}
			}
		}
		let json:any = {};
		let res!:Response;
		try {
			res = await fetch(url, options);
			json = await res.json();
		}catch(error) { }

		const status = res? res.status : 500;
		if(status == 429) {
			if(json.errorCode == "RATE_LIMIT_BAN") {
				StoreProxy.common.alert( StoreProxy.i18n.t("error.rate_limit_ban", {MAIL:Config.instance.CONTACT_MAIL}), true );
			}else{
				if(endpoint == "google/translate") {
					StoreProxy.common.alert( StoreProxy.i18n.t("error.quota_translation") );
				}else{
					StoreProxy.common.alert( StoreProxy.i18n.t("error.rate_limit") );
				}
			}
		}else
		if(retryOnFail && status != 200 && status != 204 && status != 401 && attemptIndex < 5) {
			await Utils.promisedTimeout(1000 * Math.pow(attemptIndex+1,1.5));
			return this.call(endpoint, method, data, retryOnFail, attemptIndex+1);
		}else
		if(status == 401 && attemptIndex < 2) {
			//If it's a twitch endpoint, try to refresh session and try again
			if(endpoint.indexOf(Config.instance.TWITCH_API_PATH) > -1) {
				await this.refreshTokenCallback();
				return this.call(endpoint, method, data, retryOnFail, attemptIndex+1);
			}
		}
		return {status, json};
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
}


type ApiDefinition<Endpoints, U extends keyof Endpoints, M extends HttpMethod> =
	U extends keyof Endpoints
    ? M extends keyof Endpoints[U]
		? Endpoints[U][M]
		: never
    : never;

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type AvailableMethods<E extends keyof ApiEndpoints> = Extract<keyof ApiEndpoints[E], HttpMethod>;


type ApiEndpoints =  {
	"auth/twitch": {
		GET: {
			parameters: {
				code:string;
			},
			response: {
				access_token: string;
				expires_in: number;
				refresh_token: string;
				scope: string[];
				token_type: string;
				expires_at: number;
			}
		};
	};
	"auth/CSRFToken": {
		GET: {
			parameters: void;
			response: {
				token:string;
			}
		};
		POST: {
			parameters: {
				token:string;
			},
			response: {
				success:boolean;
				message?:string;
			}
		};
	};
	"auth/twitch/refreshtoken": {
		GET: {
			parameters: {
				token:string;
			},
			response: {
				access_token: string;
				expires_in: number;
				refresh_token: string;
				scope: string[];
				token_type: string;
				expires_at: number;
			}
		};
	};
	"beta/user": {
		GET: {
			parameters: {
				uid:string;
			},
			response: {
				success:true;
				data:{beta:boolean};
			}
		};
	};
	"beta/user/hasData": {
		GET: {
			parameters: void;
			response: {
				success:boolean;
				message?:string;
				data?:{
					betaDate?: number;
					prodDate?: number;
					betaVersion?: number;
					prodVersion?: number;
				}
			}
		}
	};
	"beta/user/migrateToProduction": {
		POST: {
			parameters: void;
			response: {
				success:boolean
			};
		};
	};
	"admin/beta/user": {
		POST: {
			parameters: {
				uid:string;
			},
			response: {
				success:true;
				userList:string[];
			};
		};
		DELETE: {
			parameters: {
				uid:string;
			},
			response: {
				success:true;
				userList:string[];
			};
		};
	};
	"admin/beta/user/migrateToProduction": {
		POST: {
			parameters: {
				uid:string;
			},
			response: {
				success:boolean
			};
		};
	};
	"admin/beta/user/all": {
		DELETE: {
			parameters: void;
			response: {
				success:true;
				userList:string[];
			};
		};
	};
	"user/donor/all": {
		GET: {
			parameters: void;
			response: {
				success:true;
				data:{
					list:{
						uid: string;
						v: number;
					}[]
				};
			};
		};
	};
	"user/donor/anon": {
		GET: {
			parameters: void;
			response: {
				success:true;
				data:{
					public:boolean
				};
			};
		};
		POST: {
			parameters: {
				public:boolean;
			},
			response: {
				success:true;
				message?:string;
			};
		};
	};
	"script": {
		GET: {
			parameters: void;
			response: string;
		};
	};
	"configs": {
		GET: {
			parameters: void;
			response: ServerConfig;
		};
	};
	"spotify/auth": {
		GET: {
			parameters: void;
			response:void;
		};
	};
	"spotify/refresh_token": {
		GET: {
			parameters: void;
			response:void;
		};
	};
	"ulule/project" : {
		GET: {
			parameters: {
				project:string;
			};
			response:UluleTypes.Project;
		};
	};
	"user": {
		GET: {
			parameters: void;
			response: {
				success:boolean;
				data:{
					isAdmin:boolean;
					isDonor:boolean;
					isEarlyDonor:boolean;
					isPremiumDonor:boolean;
					isPatreonMember:boolean;
					discordLinked:boolean;
					level:number;
					lifetimePercent:number;
				}
			}
		};
		POST: {
			parameters: {

			};
			response: void;
		};
	};
	"user/all": {
		GET: {
			parameters: void;
			response: {
				success:boolean;
				message:string;
				users:{
					id:string;
					date:number;
					user:TwitchDataTypes.UserInfo
				}[];
			};
		};
	};
	"user/data": {
		GET: {
			parameters: {
				uid?:string;
			}
			response: {
				success:boolean;
				data:any;
			};
		};
		POST: {
			parameters: unknown;
			response: {
				success:boolean;
				message?:string;
			};
		};
		DELETE: {
			parameters: void;
			response: {
				success:boolean;
			};
		};
	};
	"user/data/backup": {
		POST: {
			parameters: void;
			response: {
				success:boolean;
				message?:string;
			};
		};
	};
	"patreon/authenticate": {
		POST: {
			parameters: {
				code:string;
				redirect_uri:string;
			},
			response: {
				success:boolean;
				message?:string;
				data: {
					access_token: string;
					expires_in: number;
					token_type: string;
					scope: string;
					refresh_token: string;
					version: string;
					expires_at: number;
				}
			}
		}
	};
	"patreon/refresh_token": {
		POST: {
			parameters: {
				token:string;
			},
			response: {
				success:boolean;
				message?:string;
				data: {
					access_token: string;
					refresh_token: string;
					expires_in: number;
					scope: string;
					token_type: string;
					expires_at: number;
				}
			}
		}
	};
	"patreon/isMember": {
		GET: {
			parameters: {
				token:string;
			},
			response: {
				success:boolean;
				message?:string;
				data: {isMember:boolean};
			}
		}
	};
	"patreon/isApiDown": {
		GET: {
			parameters: void;
			response: {
				success:boolean;
				message?:string;
				data: {isDown:boolean};
			}
		}
	};
	"tenor/search": {
		GET: {
			parameters: {
				search:string;
			},
			response: {
				success:boolean;
				message?:string;
				data: TenorGif[];
			}
		}
	};
	"paypal/create_order": {
		POST: {
			parameters: {
				intent:string;
				amount:number;
				currency:string;
			},
			response: {
				success:boolean;
				error?:string;
				data: {orderId:string};
			}
		}
	};
	"paypal/complete_order": {
		POST: {
			parameters: typeof PAYPAL_ORDER;
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
				data: {orderId:string};
			}
		}
	};
	"google/translate": {
		GET: {
			parameters: {
				langSource:string;
				langTarget:string;
				text:string;
			},
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
				data:{translation?:string};
			}
		}
	};
	"youtube/oauthURL": {
		GET: {
			parameters: {
				redirectURI:string;
				grantModerate:boolean;
			},
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
				data:{url?:string};
			}
		}
	};
	"youtube/authenticate": {
		POST: {
			parameters: {
				code:string;
				redirectURI:string;
			},
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
				data:{token?:YoutubeAuthToken};
			}
		}
	};
	"youtube/refreshtoken": {
		POST: {
			parameters: {
				accessToken:string;
				expiryDate:number;
				refreshToken:string;
				tokenType:string;
				scope:string;
				redirectURI:string;
			},
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
				data:{token?:YoutubeAuthToken};
			}
		}
	};
	"admin/labels": {
		POST: {
			parameters: {
				section:string;
				lang:string;
				labels:unknown;
			};
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"sse/register": {
		GET: {
			parameters: {
				token:string;
			};
			response: void
		}
	};
	"discord/code": {
		GET: {
			parameters: {
				code:string;
			},
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
				guildName?:string;
			},
		},
		POST: {
			parameters: {
				code:string;
			},
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
				guildName?:string;
				channelName?:string;
			}
		}
	};
	"discord/image": {
		POST: {
			parameters: FormData;
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
				channelName?:string;
			}
		}
	};
	"discord/link": {
		GET: {
			parameters: void;
			response: {
				success:boolean;
				linked:boolean;
				guildName:string;
				logChannel:string;
				answerChannel:string;
				error?:string;
				errorCode?:string;
			};
		};
		DELETE: {
			parameters: void;
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"discord/answer": {
		POST: {
			parameters: {
				message:string;
				data?:{
					messageId:string;
					channelId:string;
					reaction?:string;
				}
			},
			response: {
				success:boolean;
			}
		}
	};
	"discord/channels": {
		GET: {
			parameters: void;
			response: {
				success:boolean;
				channelList:{id:string, name:string}[];
			}
		}
	};
	"discord/message": {
		POST: {
			parameters: {
				message:string;
				channelId:string;
			};
			response: {
				success:boolean;
				messageId:string;
				error?:string;
				errorCode?:string;
				channelName?:string;
			}
		}
	};
	"discord/thread": {
		POST: {
			parameters: {
				message:string;
				channelId:string;
				threadName:string;
				history:string[];
			};
			response: {
				success:boolean;
				messageId:string;
				error?:string;
				errorCode?:string;
				channelName?:string;
			}
		}
	};
	"discord/commands": {
		POST: {
			parameters: {
				commands:{
					name: string;
					params: {
						name: string;
					}[];
				}[]
			},
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"discord/ticket": {
		POST: {
			parameters: {
				message:string;
				channelId:string;
				threadName:string;
			},
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
				messageLink?:string;
				channelName?:string;
			}
		}
	};
	"streamlabs/auth": {
		POST: {
			parameters: {
				code: string;
				csrf: string;
			};
			response: {
				success:boolean;
				accessToken?:string;
				socketToken?:string;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"streamlabs/socketToken": {
		GET: {
			parameters: {
				accessToken:string;
			},
			response: {
				success:boolean;
				socketToken?:string;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"streamelements/auth": {
		POST: {
			parameters: {
				code: string;
				csrf: string;
			};
			response: {
				success:boolean;
				accessToken?:string;
				refreshToken?:string;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"streamelements/token/refresh": {
		POST: {
			parameters: {
				refreshToken:string;
			},
			response: {
				success:boolean;
				accessToken?:string;
				refreshToken?:string;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"kofi/token": {
		GET: {
			parameters: void;
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
				token?:string;
			},
		},
		POST: {
			parameters: {
				token:string;
			},
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
			},
		},
		DELETE: {
			parameters: void;
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"tipeee/auth": {
		POST: {
			parameters: {
				code: string;
				csrf: string;
			};
			response: {
				success:boolean;
				accessToken?:string;
				refreshToken?:string;
				expiresIn?:number;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"tipeee/refreshToken": {
		POST: {
			parameters: {
				refreshToken:string;
			},
			response: {
				success:boolean;
				accessToken?:string;
				refreshToken?:string;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"bingogrid": {
		GET: {
			parameters: {
				uid:string;
				gridid:string;
			};
			response: {
				success:boolean;
				owner:string;
				data?:{
					enabled:boolean;
					title:string;
					cols:number;
					rows:number;
					entries:TwitchatDataTypes.BingoGridConfig["entries"];
					additionalEntries?: {
						id: string;
						label: string;
						lock: boolean;
						check: boolean;
					}[];
				};
				error?:string;
				errorCode?:string;
			}
		}
		POST: {
			parameters: {
				uid:string;
				gridid:string;
				grid:{
					cols: number;
					rows: number;
					title: string;
					entries: {
						id: string;
						label: string;
						lock: boolean;
						check: boolean;
					}[];
				};
			};
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		},
		PUT: {
			parameters: {
				gridid:string;
				grid:{
					cols: number;
					rows: number;
					title: string;
					enabled: boolean;
					entries: {
						id: string;
						label: string;
						lock: boolean;
						check: boolean;
					}[];
					additionalEntries?: {
						id: string;
						label: string;
						lock: boolean;
						check: boolean;
					}[];
				};
			};
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"bingogrid/tickStates": {
		POST: {
			parameters: {
				gridid:string;
				states:{[cellId:string]:boolean};
			};
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"bingogrid/bingo": {
		POST: {
			parameters: {
				uid:string;
				gridid:string;
				count:number;
			};
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"bingogrid/shuffle": {
		POST: {
			parameters: {
				uid:string;
				gridid:string;
				grid:{
					cols: number;
					rows: number;
					title: string;
					entries: {
						id: string;
						label: string;
						lock: boolean;
						check: boolean;
					}[];
					additionalEntries?: {
						id: string;
						label: string;
						lock: boolean;
						check: boolean;
					}[];
				};
			};
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"bingogrid/moderate": {
		POST: {
			parameters: {
				uid:string;
				gridid:string;
				states:{[cellId:string]:boolean};
			};
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"t4p": {
		GET: {
			parameters: void;
			response:{
				data?:{
					raisedAmount: number
					goalAmount: number
					percentage: number
					campaignName: string
					campaignNameFr: string
					url: string
					completed: boolean
					raisedCurrency: string
					goalCurrency: string
					code: string
					qrCodeUrl: string
					totalCampaigns: number
					completedCampaigns: number
				};
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"log": {
		POST: {
			parameters: {
				log:unknown;
				cat:string;
			};
			response:{
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		}
	}
}