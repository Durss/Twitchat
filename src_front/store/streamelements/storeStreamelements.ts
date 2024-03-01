import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import Config from '@/utils/Config';
import SetIntervalWorker from '@/utils/SetIntervalWorker';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IStreamelementsActions, IStreamelementsGetters, IStreamelementsState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';


let socket:WebSocket|undefined = undefined;
let pingInterval:string = "";
let reconnectTimeout:number = -1;
let reconnectAttempts:number = 0;
let isAutoInit:boolean = false;
let autoReconnect:boolean = false;

export const storeStreamelements = defineStore('streamelements', {
	state: () => ({
		accessToken:"",
		socketToken:"",
		connected:false,
		authResult:{code:"", csrf:""},
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
				if(this.accessToken) {
					isAutoInit = true;
				}
			}
		},

		async getOAuthURL():Promise<string> {
			const csrfToken = await ApiHelper.call("auth/CSRFToken", "GET");
			const redirectURI = document.location.origin + StoreProxy.router.resolve({name:"streamelements/auth"}).href;
			const url = new URL("https://api.streamelements.com/oauth2/authorize");
			url.searchParams.set("client_id",Config.instance.STREAMELEMENTS_CLIENT_ID);
			url.searchParams.set("redirect_uri",redirectURI);
			url.searchParams.set("scope","socket.token");
			url.searchParams.set("response_type","code");
			url.searchParams.set("state", csrfToken.json.token);
			return url.href;
		},
		
		setAuthResult(code:string, csrf:string):void {
			this.authResult.code = code;
			this.authResult.csrf = csrf;
		},
		
		async getAccessToken():Promise<boolean> {
			try {
				const result = await ApiHelper.call("streamelements/auth", "POST", this.authResult, false)
				if(result.json.success) {
					this.accessToken = result.json.accessToken!;
					this.socketToken = "";
					return await this.connect(result.json.socketToken!);
				}
				return false;
			}catch(error){
				return false;
			}
		},

		async connect(token:string, isReconnect:boolean = false):Promise<boolean> {
			if(!StoreProxy.auth.isPremium) return Promise.resolve(false);

			//Token changed
			if(isReconnect && token != this.socketToken) return Promise.resolve(false);
			
			this.disconnect();

			if(!isReconnect) {
				this.socketToken = token;
				this.saveData();
			}

			autoReconnect = true;

			return new Promise<boolean>((resolve, reject)=> {
	
				socket = new WebSocket(`wss://sockets.Streamelements.com/socket.io/?EIO=3&transport=websocket&token=${this.socketToken}`);
	
				socket.onopen = async () => {
					reconnectAttempts = 0;
					clearTimeout(reconnectTimeout);
				};
				
				socket.onmessage = (event:MessageEvent<string>) => {
					//PONG messages
					if(event.data == "3") return;
					//Connection acknwoledgment
					if(event.data == "40") {
						this.connected = true;
						resolve(true);
						return;
					}
					try {
						let codeLength = 0;
						for (; codeLength < event.data.length; codeLength++) {
							if(!/[0-9]/.test(event.data[codeLength])) break;
						}
						const code = event.data.substring(0, codeLength);
						const json = JSON.parse(event.data.replace(new RegExp("^"+code, ""), ""));
						//Welcome message
						if(code == "0") {
							const message = json as StreamelementsWelcomeData;
							//Send PING command regularly
							if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
							pingInterval = SetIntervalWorker.instance.create(()=>{
								socket?.send("2");
							}, message.pingInterval || 10000);
						}else

						//Authentication failed
						if(code == "44") {
							//Show error on top of page
							if(isAutoInit) {
								StoreProxy.main.alert(StoreProxy.i18n.t("error.Streamelements_connect_failed"));
							}
							this.disconnect();
							resolve(false);

						}else{
							if(Array.isArray(json)) {
								const me = StoreProxy.auth.twitch.user;
								json.forEach(entry=>{
									if(typeof entry == "string") return;
									const message = entry as StreamelementsDonationData | StreamelementsYoutubeSponsorData | StreamelementsYoutubeSuperchatData | StreamelementsMerchData | StreamelementsPatreonPledgeData;
									switch(message.type) {
										case "donation": {
											message.message.forEach(message=> {
												const chunks = TwitchUtils.parseMessageToChunks(message.message, undefined, true);
												const data:TwitchatDataTypes.StreamelementsDonationData = {
													id:Utils.getUUID(),
													eventType:"donation",
													platform:"twitchat",
													channel_id:me.id,
													type:TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS,
													date:Date.now(),
													amount:message.amount,
													amountFormatted:message.formatted_amount,
													currency:message.currency,
													message:message.message,
													message_chunks:chunks,
													message_html:TwitchUtils.messageChunksToHTML(chunks),
													userName:message.from,
												}
												StoreProxy.chat.addMessage(data);
												resolve(true);
											});
											break;
										}
										case "merch": {
											message.message.forEach(message=> {
												const chunks = TwitchUtils.parseMessageToChunks(message.message, undefined, true);
												const data:TwitchatDataTypes.StreamelementsMerchData = {
													id:Utils.getUUID(),
													eventType:"merch",
													platform:"twitchat",
													channel_id:me.id,
													type:TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS,
													date:Date.now(),
													product:message.product,
													message:message.message,
													message_chunks:chunks,
													message_html:TwitchUtils.messageChunksToHTML(chunks),
													userName:message.from,
												}
												StoreProxy.chat.addMessage(data);
											});
											break;
										}
										case "pledge": {
											message.message.forEach(message=> {
												const data:TwitchatDataTypes.StreamelementsPatreonPledgeData = {
													id:Utils.getUUID(),
													eventType:"patreon_pledge",
													platform:"twitchat",
													channel_id:me.id,
													type:TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS,
													date:Date.now(),
													userName:message.from,
													amount:message.amount,
													amountFormatted:message.formatted_amount,
													currency:message.currency,
												}
												StoreProxy.chat.addMessage(data);
											});
											break;
										}
									}
								})
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
					//Do not reconnect if token changed
					if(token != this.socketToken) return;
					if(!autoReconnect) return;
	
					this.connected = false;
					if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
					clearTimeout(reconnectTimeout);
					reconnectAttempts ++;
					reconnectTimeout = setTimeout(()=> {
						socket = undefined;
						this.connect(token, true);
					}, 500 * reconnectAttempts);
				};
				
				socket.onerror = (error) => {
					resolve(false);
					this.connected = false;
					if(!autoReconnect) return;
					reconnectAttempts ++;
					if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
					clearTimeout(reconnectTimeout);
					reconnectTimeout = setTimeout(()=> {
						socket = undefined;
						this.connect(token, true);
					}, 500 * reconnectAttempts);
				};
			});
		},

		disconnect():void {
			autoReconnect = false;
			this.connected = false;
			this.socketToken = "";
			this.accessToken = "";
			this.saveData();
			if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
			clearTimeout(reconnectTimeout);
			if(socket && !this.connected) socket.close();
		},

		saveData():void {
			const data:StreamelementsStoreData = {
				accessToken:this.accessToken,
				socketToken:this.socketToken,
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

export interface StreamelementsStoreData {
	accessToken:string;
	socketToken:string;
}

interface StreamelementsWelcomeData {
    sid:string;
    upgrades:unknown[];
    pingInterval: number;
    pingTimeout: number;
    maxPayload: number;
}

interface StreamelementsDonationData {
	type: "donation";
	message:{
		priority: number;
		isTest: boolean;
		name:string;
		amount:number;
		formatted_amount:string;
		message:string;
		currency:string;
		emotes:string;
		iconClassName:string;
		to:{
			name:string;
		};
		from:string;
		from_user_id:string;
		_id:string;
	}[];
	for:"Streamelements";
    event_id: string;
}

interface StreamelementsMerchData {
    type: "merch";
    message: {
		name: string;
		isTest: boolean,
		message: string;
		to: {
			name: string;
		};
		from: string;
		product: string;
		imageHref: string;
		condition: string;
		_id: string;
		priority: 10;
	}[];
	for:"Streamelements";
    event_id: string;
}

interface StreamelementsPatreonPledgeData {
    type: "pledge";
    message: {
		name:string;
		isTest: boolean;
		formatted_amount:string;
		amount: 22;
		currency:string;
		to: {
			name:string;
		},
		from:string;
		_id:string;
		priority:string;
	}[];
	for:"patreon";
    event_id:string;
}

interface StreamelementsYoutubeSponsorData {
	type: "subscription";
	message: {
		sponsorSince:string;
		id:string;
		name:string;
		channelUrl:string;
		months:number;
		_id:string;
    }[];
	for: "youtube_account";
    event_id: string;
}

interface StreamelementsYoutubeSuperchatData {
	type: "superchat";
	message: {
		id:string;
		channelId:string;
		channelUrl:string;
		name:string;
		comment:string;
		amount:string;
		currency:string;
		displayString:string;
		messageType: number,
		createdAt:string;
		_id:string;
	}[];
	for: "youtube_account";
    event_id: string;
}