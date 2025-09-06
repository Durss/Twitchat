import StoreProxy from "@/store/StoreProxy";
import type { TiltifyCampaign, TiltifyToken, TiltifyUser } from "@/store/tiltify/storeTiltify";
import type { TenorGif } from "@/types/TenorDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { UluleTypes } from "@/types/UluleTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { YoutubeAuthToken } from "@/types/youtube/YoutubeDataTypes";
import type { ServerConfig } from "./Config";
import Config from "./Config";
import Utils from "./Utils";
import type { IPatreonMember, IPatreonTier } from "@/store/patreon/storePatreon";
import type { TriggerData, TriggerExportData, TriggerImportData } from "@/types/TriggerActionDataTypes";

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
		(endpoint:U, method:M, data?:P, retryOnFail:boolean = true, attemptIndex:number = 0, headers:{[key:string]:string} = {}, abortSignal?:AbortSignal)
		:Promise<{status:number; json:ApiDefinition<ApiEndpoints, U, M>["response"]}> {

		const url = new URL(Config.instance.API_PATH+"/"+endpoint);
		headers["App-Version"] = import.meta.env.PACKAGE_VERSION;
		if(this._accessToken) {
			headers["Authorization"] = "Bearer "+this._accessToken;
		}
		const options:RequestInit = {
			method: method || "GET",
			headers,
		}
		if(abortSignal) {
			options.signal = abortSignal;
		}
		if(data) {
			if(data instanceof FormData) {
				options.body = data;
			}else
			if(method === "POST" || method === "PUT") {
				if(!headers["Content-Type"]) {
					headers["Content-Type"] = "application/json";
				}
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
				// StoreProxy.common.alert( StoreProxy.i18n.t("error.rate_limit_ban", {MAIL:Config.instance.CONTACT_MAIL}), true );
			}else{
				if(endpoint == "google/translate") {
					StoreProxy.common.alert( StoreProxy.i18n.t("error.quota_translation") );
				}else{
					//TODO enable back once i know why it's spamming some calls
					// StoreProxy.common.alert( StoreProxy.i18n.t("error.rate_limit") );
				}
			}
		}else
		if(retryOnFail && status != 200 && status != 204 && status != 401 && status != 409 && attemptIndex < 5) {
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
			parameters: {
				withRef?:true;
			};
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
				uidShare?:string;
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
	"auth/validateDataShare": {
		POST: {
			parameters: {
				token:string;
			},
			response: {
				sharer: string;
				success:boolean;
				error:string;
				errorCode:string;
			}
		};
	};
	"auth/dataShare": {
		DELETE: {
			parameters: {
				uid:string;
			},
			response: {
				success:boolean;
				users:string[];
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
	"admin/premium": {
		POST: {
			parameters: {
				uid:string;
			};
			response:{
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		},

		DELETE: {
			parameters: {
				uid:string;
			};
			response:{
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"admin/triggersPreset": {
		POST: {
			parameters: {
				name:string;
				data?:Omit<TriggerExportData, "authorId">;
				encrypted?:string
			};
			response:{
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		},
	};
	"triggersPreset": {
		GET: {
			parameters: {
				name:string;
			};
			response:{
				success:boolean;
				error?:string;
				errorCode?:string;
				data:TriggerImportData;
			}
		},
	}
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
	"user/gift_premium": {
		POST: {
			parameters: {
				code:string;
			},
			response: {
				success:boolean;
				result: "success" | "invalid_code" | "empty_credits";
				alreadyPremium:boolean;
			}
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
					premiumType:"earlyDonor"|"patreon"|"lifetime"|"gifted"|"",
					donorLevel:number;
					lifetimePercent:number;
					discordLinked:boolean;
					patreonLinked:string;
					dataSharing:string[];
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
				error?:string;
				errorCode?:string;
				version?:number;
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
		GET: {
			parameters: void;
			response: {
				success: boolean;
				data: any;
			};
		};
		POST: {
			parameters: void;
			response: {
				success:boolean;
				message?:string;
			};
		};
	};
	"patreon/user/authenticate": {
		POST: {
			parameters: {
				code:string;
				redirect_uri:string;
			},
			response: {
				success:boolean;
				message?:string;
			}
		}
	};
	"patreon/user/disconnect": {
		POST: {
			parameters: {
			},
			response: {
				success:boolean;
				message?:string;
			}
		}
	};
	"patreon/user/isMember": {
		GET: {
			parameters: {
			},
			response: {
				success:boolean;
				message?:string;
				data?: {isMember:boolean};
				errorCode?:string;
			}
		}
	};
	"patreon/user/memberList": {
		GET: {
			parameters: void;
			response: {
				success:boolean;
				message?:string;
				data: {
					memberList:IPatreonMember[];
					tierList:IPatreonTier[];
				};
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
			parameters: Partial<typeof PAYPAL_ORDER>;
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
				data: {orderId:string, donorLevel:number};
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
				errorCode?:"POST_FAILED"|"MISSING_ACCESS"|"UNKNOWN_CHANNEL";
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
				multiplayerMode:boolean;
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
				grid?:{
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
	"log": {
		POST: {
			parameters: {
				log:unknown;
					cat:"streamlabs"|"hypetrain"|"tiltify"|"kofi"|"patreon"|"random"|"eventsub"|"youtube";
			};
			response:{
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"mod/request": {
		GET: {
			parameters: void;
			response:{
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		},
	};
	"mod/qna": {
		POST: {
			parameters: {
				sessions:TwitchatDataTypes.QnaSession[];
			};
			response:{
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		},
	};
	"mod/privateMessage": {
		POST: {
			parameters: {
				to_uid:string;
				message:TwitchatDataTypes.ParseMessageChunk[];
				action:TwitchatDataTypes.MessagePrivateModeratorData["action"];
				messageId:string;
				messageParentId?:string;
				messageParentFallback?: {
					uid:string;
					login:string;
					platform:string;
					message:TwitchatDataTypes.ParseMessageChunk[];
				}
			};
			response:{
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		},
		PUT: {
			parameters: {
				messageId:string;
				answer:boolean;
			};
			response:{
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		},
	};
	"mod/qna/message": {
		PUT: {
			parameters: {
				ownerId:string;
				sessionId:string;
				entry:TwitchatDataTypes.QnaSession["messages"][number];
			};
			response:{
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		},
		DELETE: {
			parameters: {
				ownerId:string;
				sessionId:string;
				messageId:string;
			};
			response:{
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		},
	};
	"mod/spoil/message": {
		PUT: {
			parameters: {
				ownerId:string;
				messageId:string;
			};
			response:{
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		},
	};
	"tiltify/info": {
		GET: {
			parameters: {
				token:string;
			};
			response: {
				success:boolean;
				user:TiltifyUser;
				campaigns:TiltifyCampaign[];
				error?:string;
				errorCode?:string;
			}
		},
	};
	"tiltify/auth": {
		POST: {
			parameters: {
				code: string;
				csrf: string;
			};
			response: {
				success:boolean;
				token:TiltifyToken;
				error?:string;
				errorCode?:string;
			}
		},
		DELETE : {
			parameters: {
				token:string;
			};
			response: {
				success:boolean;
				error?:string;
				errorCode?:string;
			}
		}
	};
	"tiltify/token/refresh": {
		POST: {
			parameters: {
				refreshToken:string;
			},
			response: {
				success:boolean;
				token?:TiltifyToken;
				error?:string;
				errorCode?:string;
			}
		}
	};
}
