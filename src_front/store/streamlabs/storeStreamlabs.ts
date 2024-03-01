import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IStreamlabsActions, IStreamlabsGetters, IStreamlabsState } from '../StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import StoreProxy from '../StoreProxy';
import TwitchUtils from '@/utils/twitch/TwitchUtils';


let socket:WebSocket|undefined = undefined;
let pingInterval:number = -1;
let reconnectTimeout:number = -1;
let reconnectAttempts:number = 0;
let isAutoInit:boolean = true;
let autoReconnect:boolean = false;

export const storeStreamlabs = defineStore('streamlabs', {
	state: () => ({
		token:"",
		connected:false,
	} as IStreamlabsState),



	getters: {

	} as IStreamlabsGetters
	& ThisType<UnwrapRef<IStreamlabsState> & _StoreWithGetters<IStreamlabsGetters> & PiniaCustomProperties>
	& _GettersTree<IStreamlabsState>,



	actions: {
		async populateData():Promise<void> {
			const data = DataStore.get(DataStore.STREAMLABS);
			if(data) {
				const json = JSON.parse(data) as SreamlabsStoreData;
				this.token = json.token;
				this.connect(this.token);
				isAutoInit = false;
			}
		},

		async connect(token:string, isReconnect:boolean = false):Promise<boolean> {
			if(!StoreProxy.auth.isPremium) return Promise.resolve(false);

			//Token changed
			if(isReconnect && token != this.token) return Promise.resolve(false);
			if(!isReconnect) {
				this.token = token;
				this.saveData();
			}
			
			this.disconnect()

			autoReconnect = true;

			return new Promise<boolean>((resolve, reject)=> {
	
				socket = new WebSocket(`wss://sockets.streamlabs.com/socket.io/?EIO=3&transport=websocket&token=${this.token}`);
	
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
							const message = json as StreamlabsWelcomeData;
							//Send PING command regularly
							clearInterval(pingInterval)
							pingInterval = setInterval(()=>{
								socket?.send("2");
							}, message.pingInterval || 10000);
						}else

						//Authentication failed
						if(code == "44") {
							//Show error on top of page
							if(isAutoInit) {
								StoreProxy.main.alert(StoreProxy.i18n.t("error.streamlabs_connect_failed"));
							}
							this.disconnect();
							resolve(false);

						}else{
							if(Array.isArray(json)) {
								const me = StoreProxy.auth.twitch.user;
								json.forEach(entry=>{
									if(typeof entry == "string") return;
									const message = entry as StreamlabsDonationData | StreamlabsYoutubeSponsorData | StreamlabsYoutubeSuperchatData | StreamlabsMerchData | StreamlabsPatreonPledgeData;
									switch(message.type) {
										case "donation": {
											message.message.forEach(message=> {
												const chunks = TwitchUtils.parseMessageToChunks(message.message, undefined, true);
												const data:TwitchatDataTypes.StreamlabsDonationData = {
													id:Utils.getUUID(),
													eventType:"donation",
													platform:"twitchat",
													channel_id:me.id,
													type:TwitchatDataTypes.TwitchatMessageType.STREAMLABS,
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
												const data:TwitchatDataTypes.StreamlabsMerchData = {
													id:Utils.getUUID(),
													eventType:"merch",
													platform:"twitchat",
													channel_id:me.id,
													type:TwitchatDataTypes.TwitchatMessageType.STREAMLABS,
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
												const data:TwitchatDataTypes.StreamlabsPatreonPledgeData = {
													id:Utils.getUUID(),
													eventType:"patreon_pledge",
													platform:"twitchat",
													channel_id:me.id,
													type:TwitchatDataTypes.TwitchatMessageType.STREAMLABS,
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
						console.log("Failed parsing Streamlabs JSON data");
						console.log(event.data);
						console.error(error);
					}
				};
			
				socket.onclose = (event) => {
					//Do not reconnect if token changed
					if(token != this.token) return;
					if(!autoReconnect) return;
	
					this.connected = false;
					clearInterval(pingInterval);
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
					clearInterval(pingInterval);
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
			clearInterval(pingInterval);
			clearInterval(reconnectTimeout);
			if(socket && !this.connected) socket.close();
		},

		saveData():void {
			const data:SreamlabsStoreData = {
				token:this.token,
			}
			DataStore.set(DataStore.STREAMLABS, data);
		}
	
	} as IStreamlabsActions
	& ThisType<IStreamlabsActions
		& UnwrapRef<IStreamlabsState>
		& _StoreWithState<"raffle", IStreamlabsState, IStreamlabsGetters, IStreamlabsActions>
		& _StoreWithGetters<IStreamlabsGetters>
		& PiniaCustomProperties
	>,
})

export interface SreamlabsStoreData {
	token:string;
}

interface StreamlabsWelcomeData {
    sid:string;
    upgrades:unknown[];
    pingInterval: number;
    pingTimeout: number;
    maxPayload: number;
}

interface StreamlabsDonationData {
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
	for:"streamlabs";
    event_id: string;
}

interface StreamlabsMerchData {
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
	for:"streamlabs";
    event_id: string;
}

interface StreamlabsPatreonPledgeData {
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

interface StreamlabsYoutubeSponsorData {
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

interface StreamlabsYoutubeSuperchatData {
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