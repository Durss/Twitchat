import ApiHelper from '@/utils/ApiHelper';
import Config from '@/utils/Config';
import SetIntervalWorker from '@/utils/SetIntervalWorker';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IStreamelementsActions, IStreamelementsGetters, IStreamelementsState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { rebuildPlaceholdersCache } from '@/types/TriggerActionDataTypes';


let socket:WebSocket|undefined = undefined;
let pingInterval:string = "";
let reconnectTimeout:number = -1;
let reconnectAttempts:number = 0;
let isAutoInit:boolean = false;
let autoReconnect:boolean = false;

export const storeStreamelements = defineStore('streamelements', {
	state: () => ({
		accessToken:"",
		refreshToken:"",
		connected:false,
		authResult:{code:"", csrf:""},
		tipLatest:{
			amount:0,
			message:"",
			username:"",
		},
		tipSession:0,
		tipTotal:0,
		tipCount:0,
		tipWeek:0,
		tipMonth:0,
		tipGoal:0,
		tipSessionTopDonation:{
			amount:0,
			username:"",
		},
		tipSessionTopDonator:{
			amount:0,
			username:"",
		},
		tipWeeklyTopDonation:{
			amount:0,
			username:"",
		},
		tipWeeklyTopDonator:{
			amount:0,
			username:"",
		},
		tipMonthlyTopDonation:{
			amount:0,
			username:"",
		},
		tipMonthlyTopDonator:{
			amount:0,
			username:"",
		},
		tipAlltimeTopDonation:{
			amount:0,
			username:"",
		},
		tipAlltimeTopDonator:{
			amount:0,
			username:"",
		},
	} as IStreamelementsState),



	getters: {
		
	} as IStreamelementsGetters
	& ThisType<UnwrapRef<IStreamelementsState> & _StoreWithGetters<IStreamelementsGetters> & PiniaCustomProperties>
	& _GettersTree<IStreamelementsState>,



	actions: {
		async populateData():Promise<void> {
			const data = DataStore.get(DataStore.STREAMELEMENTS);
			if(data) {
				const json = JSON.parse(data) as StreamelementsStoreData;
				this.accessToken = json.accessToken;
				this.refreshToken = json.refreshToken;
				if(this.accessToken) {
					isAutoInit = true;
					this.connect(this.accessToken);
				}
			}
		},

		async getOAuthURL():Promise<string> {
			const csrfToken = await ApiHelper.call("auth/CSRFToken", "GET");
			const redirectURI = "https://twitchat.fr" + StoreProxy.router.resolve({name:"streamelements/auth"}).href;

			//To understand that prefix reason, please check the "streamelements/auth" route definition
			let statePrefix = "";
			if(/^localhost|127\.0\.0\.1/gi.test(document.location.host)) statePrefix = "local-";
			if(/^beta/gi.test(document.location.host)) statePrefix = "beta-";

			const url = new URL("https://api.streamelements.com/oauth2/authorize");
			url.searchParams.set("client_id",Config.instance.STREAMELEMENTS_CLIENT_ID);
			url.searchParams.set("redirect_uri",redirectURI);
			url.searchParams.set("scope","tips:read activities:read channel:read loyalty:read");
			url.searchParams.set("response_type","code");
			url.searchParams.set("state", statePrefix + csrfToken.json.token);
			return url.href;
		},
		
		setAuthResult(code:string, csrf:string):void {
			this.authResult.code = code;
			this.authResult.csrf = csrf;
		},
		
		async getAccessToken():Promise<boolean> {
			try {
				const csrfResult = await ApiHelper.call("auth/CSRFToken", "POST", {token:this.authResult.csrf});
				if(!csrfResult.json.success) return false;
				const result = await ApiHelper.call("streamelements/auth", "POST", this.authResult, false)
				if(result.json.success) {
					this.accessToken = result.json.accessToken!;
					this.refreshToken = result.json.refreshToken!;
					return await this.connect(result.json.accessToken!);
				}
				return false;
			}catch(error){
				return false;
			}
		},

		async connect(token:string, isReconnect:boolean = false):Promise<boolean> {
			if(!StoreProxy.auth.isPremium) return Promise.resolve(false);

			//Token changed
			if(isReconnect && token != this.accessToken) {
				// console.log("STREAMELEMENTS: do not reconnect because token changed",token, this.accessToken)
				return Promise.resolve(false);
			}
			
			if(!this.connected && !isReconnect) this.disconnect();

			if(!isReconnect) {
				this.accessToken = token;
				this.saveData();
			}

			autoReconnect = true;
			let tokenValid = false;
			try {
				let opts = {
					headers: { "Authorization":"OAuth "+token },
					method:"GET",
				}
				// console.log("STREAMELEMENTS: checking token validity...")
				let validateResult = await fetch("https://api.streamelements.com/oauth2/validate", opts);
				if(validateResult.status == 200) {
					const json = (await validateResult.json()) as StreamelementsTokenValidate;
					//If token expires in more than a day (default 30days) accept it
					if(json.expires_in > 24*60*60) {
						tokenValid = true;
					}
				}
				//Streamelements API returns random 520 errors.
				//In this case, just consider the token is valid is it will most probably be the case
				if(validateResult.status == 520) tokenValid = true;
				// console.log("STREAMELEMENTS: checking token valid? ", tokenValid);
			}catch(error) {}

			//Token expired or will expire soon?
			//Refresh it
			if(!tokenValid) {
				if(!this.refreshToken) return false;
				try {
					// console.log("STREAMELEMENTS: token not valid, get fresh new one");
					const result = await ApiHelper.call("streamelements/token/refresh", "POST", {refreshToken:this.refreshToken}, false)
					if(result.json.success) {
						this.accessToken = result.json.accessToken!;
						this.refreshToken = result.json.refreshToken!;
						this.saveData();
						// console.log("STREAMELEMENTS: got new token", this.accessToken);
					}else{
						// console.log("STREAMELEMENTS: failed getting a new token");
						return false;
					}
				}catch(error){
					return false;
				}
			}
			
			//Connect to websocket
			return new Promise<boolean>((resolve, reject)=> {
	
				socket = new WebSocket(`wss://realtime.streamelements.com/socket.io/?EIO=3&transport=websocket`);
	
				socket.onopen = async () => {
					reconnectAttempts = 0;
					clearTimeout(reconnectTimeout);
					socket!.send("42[\"authenticate\","+JSON.stringify( {method:"oauth2", token:token})+"]");
				};
				
				socket.onmessage = (event:MessageEvent<string>) => {
					try {
						let codeLength = 0;
						for (; codeLength < event.data.length; codeLength++) {
							if(!/[0-9]/.test(event.data[codeLength])) break;
						}
						const code = event.data.substring(0, codeLength);
						//Welcome message
						if(code == "0") {
							const json = JSON.parse(event.data.replace(new RegExp("^"+code, ""), ""));
							const message = json as StreamelementsWelcomeData;
							//Send PING command regularly
							if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
							pingInterval = SetIntervalWorker.instance.create(()=>{
								if(socket?.readyState == socket?.CLOSING || socket?.readyState == socket?.CLOSED) {
									// console.log("SOCKET STATE", socket?.readyState);
								}else{
									socket?.send("2");
								}
							}, message.pingInterval || 10000);
						}
						
						//PONG messages
						else if(code == "3") return;

						//Connection acknowledgment
						else if(code == "40") return;

						//All other messages
						else if(code == "42") {
							const json = JSON.parse(event.data.replace(new RegExp("^"+code, ""), ""));
							const values = (json as any[]);
							const action = values.shift();
							Utils.sha256(StoreProxy.auth.twitch.user.id).then((hash) => {
								if(hash === "2a08ed3165c25849d65504d4f49042560bf2a62bef318cbc5627aee94aebe0fc") {
									ApiHelper.call("log", "POST", {cat:"random", log:{type:"STREAMELEMENTS_EVENT", data:json}});
								}
							});
							switch(action) {
								case "unauthorized": {
									//Show error on top of page
									if(isAutoInit) {
										StoreProxy.common.alert(StoreProxy.i18n.t("error.Streamelements_connect_failed"));
									}
									this.disconnect();
									resolve(false);
									break;
								}

								case "authenticated": {
									this.connected = true;
									rebuildPlaceholdersCache();
									resolve(true);
									break;
								}

								case "event": {
									values.forEach((value:EventTypes) => {
										switch(value.type) {
											case "tip": {
												const chunks = TwitchUtils.parseMessageToChunks(value.data.message, undefined, true, "twitch");
												const message:TwitchatDataTypes.StreamelementsDonationData = {
													id:Utils.getUUID(),
													date:Date.now(),
													eventType:"donation",
													type:TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS,
													amount:value.data.amount,
													amountFormatted:value.data.amount+(value.data.currency || ""),
													channel_id:StoreProxy.auth.twitch.user.id,
													currency:(value.data.currency || ""),
													message:value.data.message,
													message_chunks:chunks,
													message_html:TwitchUtils.messageChunksToHTML(chunks),
													platform:"twitch",
													userName:value.data.username,
												}
												StoreProxy.chat.addMessage(message);
												break;
											}
										}
									})
									break;
								}

								case "event:update": {
									values.forEach((value:UpdateEventTypes) => {
										switch(value.name) {
											//All tips for current session
											case "tip-session":{
												//console.log(value.name, value.data.amount)
												this.tipSession = value.data.amount;
												break;
											}
											//Latest tip received
											case "tip-latest":{
												//console.log(value.name, value.data.name, value.data.message, value.data.amount)
												this.tipLatest = {
													amount:value.data.amount,
													message:value.data.message,
													username:value.data.name,
												}
												break;
											}
											//Sum amount of all time tips received
											case "tip-total":{
												//console.log(value.name, value.data.amount)
												this.tipTotal = value.data.amount;
												break;
											}
											//Number of tips received
											case "tip-count":{
												//console.log(value.name, value.data.count)
												this.tipCount = value.data.count;
												break;
											}
											//Sum amount of tips rreceived this week
											case "tip-week":{
												//console.log(value.name, value.data.amount)
												this.tipWeek = value.data.amount;
												break;
											}
											//Sum amount of tips rreceived this month
											case "tip-month":{
												//console.log(value.name, value.data.amount)
												this.tipMonth = value.data.amount;
												break;
											}
											//Donation goal(?!)
											case "tip-goal":{
												//console.log(value.name, value.data.amount)
												this.tipGoal = value.data.amount;
												break;
											}
											//Top donation this session
											case "tip-session-top-donation":{
												//console.log(value.name, value.data.name, value.data.amount)
												this.tipSessionTopDonation = {
													amount:value.data.amount,
													username:value.data.name,
												}
												break;
											}
											//Top donator this session
											case "tip-session-top-donator":{
												//console.log(value.name, value.data.name, value.data.amount)
												//Ignore, kinda the same as previous event
												break;
											}
											//Top donation this week
											case "tip-weekly-top-donation":{
												//console.log(value.name, value.data.name, value.data.amount)
												this.tipWeeklyTopDonation = {
													amount:value.data.amount,
													username:value.data.name,
												}
												break;
											}
											//Top donator this week
											case "tip-weekly-top-donator":{
												//console.log(value.name, value.data.name, value.data.amount)
												//Ignore, kinda the same as previous event
												break;
											}
											//Top donation this month
											case "tip-monthly-top-donation":{
												//console.log(value.name, value.data.name, value.data.amount)
												this.tipMonthlyTopDonation = {
													amount:value.data.amount,
													username:value.data.name,
												}
												break;
											}
											//Top donator this month
											case "tip-monthly-top-donator":{
												//console.log(value.name, value.data.name, value.data.amount)
												//Ignore, kinda the same as previous event
												break;
											}
											//Top donation all time
											case "tip-alltime-top-donation":{
												//console.log(value.name, value.data.name, value.data.amount)
												this.tipAlltimeTopDonation = {
													amount:value.data.amount,
													username:value.data.name,
												}
												break;
											}
											//Top donator all time
											case "tip-alltime-top-donator":{
												//console.log(value.name, value.data.name, value.data.amount)
												//Ignore, kinda the same as previous event
												break;
											}
										}
									})
									break;
								}
							}
						}
					}catch(error){
						console.log("Failed parsing Streamelements JSON data");
						console.log(event.data);
						console.error(error);
					}
					isAutoInit = false;
				};
			
				socket.onclose = (event) => {
					// console.log("STREAMELEMENTS: onclose:");
					// console.log(token, this.accessToken);
					// console.log(autoReconnect);
					// console.log(event);
					//Do not reconnect if token changed
					if(token != this.accessToken) return;
					if(!autoReconnect) return;
	
					this.connected = false;
					rebuildPlaceholdersCache();
					if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
					pingInterval = "";
					clearTimeout(reconnectTimeout);
					reconnectAttempts ++;
					reconnectTimeout = window.setTimeout(()=> {
						socket = undefined;
						this.connect(token, true);
					}, 500 * reconnectAttempts);
					// console.log("STREAMELEMENTS: reconnect in",500 * reconnectAttempts)
				};
				
				socket.onerror = (error) => {
					// console.log("STREAMELEMENTS: onerror:", error);
					resolve(false);
					this.connected = false;
					rebuildPlaceholdersCache();
					if(!autoReconnect) return;
					reconnectAttempts ++;
					if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
					pingInterval = "";
					clearTimeout(reconnectTimeout);
					reconnectTimeout = window.setTimeout(()=> {
						socket = undefined;
						this.connect(token, true);
					}, 500 * reconnectAttempts);
				};
			});
		},

		disconnect():void {
			autoReconnect = false;
			this.connected = false;
			this.accessToken = "";
			this.saveData();
			if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
			pingInterval = "";
			clearTimeout(reconnectTimeout);
			if(socket && !this.connected) socket.close();
		},

		saveData():void {
			const data:StreamelementsStoreData = {
				accessToken:this.accessToken,
				refreshToken:this.refreshToken,
			}
			DataStore.set(DataStore.STREAMELEMENTS, data);
		}
	
	} as IStreamelementsActions
	& ThisType<IStreamelementsActions
		& UnwrapRef<IStreamelementsState>
		& _StoreWithState<"raffle", IStreamelementsState, IStreamelementsGetters, IStreamelementsActions>
		& _StoreWithGetters<IStreamelementsGetters>
		& PiniaCustomProperties
	>,
})


if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeStreamelements, import.meta.hot))
}

export interface StreamelementsStoreData {
	accessToken:string;
	refreshToken:string;
}

type EventTypes = StreamelementsTipData;
type UpdateEventTypes = StreamelementsTipSessionData
				| StreamelementsTipLatestData
				| StreamelementsTipTotalData
				| StreamelementsTipCountData
				| StreamelementsTipMonthData
				| StreamelementsTipWeekData
				| StreamelementsTipGoalData
				| StreamelementsTipSessionTopDonationData
				| StreamelementsTipSessionTopDonatorData
				| StreamelementsTipWeeklyTopDonationData
				| StreamelementsTipWeeklyTopDonatorData
				| StreamelementsTipMonthlyTopDonationData
				| StreamelementsTipMonthlyTopDonatorData
				| StreamelementsTipAllTimeTopDonationData
				| StreamelementsTipAllTimeTopDonatorData;

interface StreamelementsTokenValidate {
	channel_id: string;
	client_id: string;
	expires_in: number;
	scopes: string[];
}

interface StreamelementsWelcomeData {
    sid:string;
    upgrades:unknown[];
    pingInterval: number;
    pingTimeout: number;
    maxPayload: number;
}

interface StreamelementsTipData {
	type: "tip";
	provider: string;
	channel: string;
	createdAt: string;
	data: {
		amount: number;
		currency: string;
		username: string;
		tipId: string;
		message: string;
		avatar: string;
	};
	_id: string;
	updatedAt: string;
	activityId: string;
	sessionEventsCount: number;
}

interface StreamelementsTipSessionData {
	name: "tip-session";
	data: {
		amount: number;
		activityId:string;
	};
	provider: string;
}

interface StreamelementsTipLatestData {
	name: "tip-latest";
	data: {
		name:string;
		amount: number;
		message:string;
		activityId:string;
	};
	provider: string;
}

interface StreamelementsTipTotalData {
	name: "tip-total";
	data: {
		amount: number;
		activityId:string;
	};
	provider: string;
}

interface StreamelementsTipCountData {
	name: "tip-count";
	data: {
		count: number;
		activityId:string;
	};
	provider: string;
}

interface StreamelementsTipMonthData {
	name: "tip-month";
	data: {
		amount: number;
		activityId:string;
	};
	provider: string;
}

interface StreamelementsTipWeekData {
	name: "tip-week";
	data: {
		amount: number;
		activityId:string;
	};
	provider: string;
}

interface StreamelementsTipGoalData {
	name: "tip-goal";
	data: {
		amount: number;
		activityId:string;
	};
	provider: string;
}

interface StreamelementsTipSessionTopDonationData {
	name: "tip-session-top-donation";
	data: {
		name:string;
		amount: number;
		activityId:string;
	};
	provider: string;
}

interface StreamelementsTipSessionTopDonatorData {
	name: "tip-session-top-donator";
	data: {
		name:string;
		amount: number;
		activityId:string;
	};
	provider: string;
}

interface StreamelementsTipWeeklyTopDonationData {
	name: "tip-weekly-top-donation";
	data: {
		name:string;
		amount: number;
		activityId:string;
	};
	provider: string;
}

interface StreamelementsTipWeeklyTopDonatorData {
	name: "tip-weekly-top-donator";
	data: {
		name:string;
		amount: number;
		activityId:string;
	};
	provider: string;
}

interface StreamelementsTipMonthlyTopDonationData {
	name: "tip-monthly-top-donation";
	data: {
		name:string;
		amount: number;
		activityId:string;
	};
	provider: string;
}

interface StreamelementsTipMonthlyTopDonatorData {
	name: "tip-monthly-top-donator";
	data: {
		name:string;
		amount: number;
		activityId:string;
	};
	provider: string;
}

interface StreamelementsTipAllTimeTopDonationData {
	name: "tip-alltime-top-donation";
	data: {
		name:string;
		amount: number;
		activityId:string;
	};
	provider: string;
}

interface StreamelementsTipAllTimeTopDonatorData {
	name: "tip-alltime-top-donator";
	data: {
		name:string;
		amount: number;
		activityId:string;
	};
	provider: string;
}