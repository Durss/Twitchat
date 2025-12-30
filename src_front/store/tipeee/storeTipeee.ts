import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { ITipeeeActions, ITipeeeGetters, ITipeeeState } from '../StoreProxy';
import ApiHelper from '@/utils/ApiHelper';
import StoreProxy from '../StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Config from '@/utils/Config';
import SetIntervalWorker from '@/utils/SetIntervalWorker';

let socket:WebSocket|undefined = undefined;
let pingInterval:string = "";
let reconnectTimeout:number = -1;
let reconnectAttempts:number = 0;
let isAutoInit:boolean = false;
let autoReconnect:boolean = false;

export const storeTipeee = defineStore('tipeee', {
	state: () => ({
		accessToken:"",
		refreshToken:"",
		connected:false,
		authResult:{code:"", csrf:""},
	} as ITipeeeState),



	getters: {
		
	} as ITipeeeGetters
	& ThisType<UnwrapRef<ITipeeeState> & _StoreWithGetters<ITipeeeGetters> & PiniaCustomProperties>
	& _GettersTree<ITipeeeState>,



	actions: {
		async populateData():Promise<void> {
			const data = DataStore.get(DataStore.TIPEEE);
			if(data) {
				const json = JSON.parse(data) as TipeeStoreData;
				this.accessToken = json.accessToken;
				this.refreshToken = json.refreshToken;
				if(this.refreshToken) {
					isAutoInit = true;
					await this.doRefreshToken();
				}
			}
		},

		async doRefreshToken():Promise<void> {
			const result = await ApiHelper.call("tipeee/refreshToken", "POST", {refreshToken:this.refreshToken}, false);
			if(result.json.success) {
				this.accessToken = result.json.accessToken!;
				this.refreshToken = result.json.refreshToken!;
				this.saveData();
				window.setTimeout(() => {
					this.doRefreshToken();
				}, 3600 * 1000);
				//Tipeee do not returns expireas at for refresh token. Refresh every hour :/
				this.connect(this.accessToken, false);
			}else{
				StoreProxy.common.alert(StoreProxy.i18n.t("error.tipeee_connect_failed"));
			}
		},

		async getOAuthURL():Promise<string> {
			const csrfToken = await ApiHelper.call("auth/CSRFToken", "GET");
			const origin = Config.instance.IS_PROD?  document.location.origin : "https://twitchat.fr";
			const redirectURI = origin + StoreProxy.router.resolve({name:"tipeee/auth"}).href;
			const url = new URL("https://api.tipeeestream.com/oauth/v2/auth");
			url.searchParams.set("client_id",Config.instance.TIPEEE_CLIENT_ID);
			url.searchParams.set("redirect_uri",redirectURI);
			url.searchParams.set("response_type","code");
			url.searchParams.set("state", csrfToken.json.token);
			return url.href;
		},
		
		setAuthResult(code:string, csrf:string):void {
			this.authResult.code = code;
			this.authResult.csrf = csrf;
		},
		
		async completeOAuthProcess():Promise<boolean> {
			try {
				const csrfResult = await ApiHelper.call("auth/CSRFToken", "POST", {token:this.authResult.csrf});
				if(!csrfResult.json.success) return false;
				const result = await ApiHelper.call("tipeee/auth", "POST", this.authResult, false)
				if(result.json.success) {
					this.accessToken = result.json.accessToken!;
					this.refreshToken = result.json.refreshToken!;
					this.saveData();
					this.authResult = {code:"", csrf:""};
					return await this.connect(this.accessToken);
				}
				return false;
			}catch(error){
				return false;
			}
		},

		async connect(token:string, isReconnect:boolean = false):Promise<boolean> {
			if(!StoreProxy.auth.isPremium) return Promise.resolve(false);

			//Token changed
			if(isReconnect && token != this.accessToken) return Promise.resolve(false);
			
			this.disconnect(false);

			autoReconnect = true;

			return new Promise<boolean>(async (resolve, reject)=> {
				//Get user's details
				//This query is probably unnecessary as the username can apparently be anything on "join-room" event
				const meUrl = new URL("https://api.tipeeestream.com/v1.0/me.json");
				meUrl.searchParams.set("access_token", this.accessToken);
				const meQuery = await fetch(meUrl, {method:"GET"});
				const meJSON = await meQuery.json() as {username:string};

				//Get user's API key
				const accessTokenUrl = new URL("https://api.tipeeestream.com/v1.0/me/api.json");
				accessTokenUrl.searchParams.set("access_token", this.accessToken);
				const accessTokenQuery = await fetch(accessTokenUrl, {method:"GET"});
				const accessTokenJSON = await accessTokenQuery.json() as {apiKey:string};

				//Get socket path
				const socketPropsQuery = await fetch("https://api.tipeeestream.com/v2.0/site/socket", {method:"GET"});
				const socketProps = await socketPropsQuery.json() as {code:number, datas:{port:string, host:string}};

				let socketPath = socketProps.datas.host.replace(/https?:\/\//, "");
				if(socketProps.datas.port && socketProps.datas.port != "443") socketPath += ":"+socketProps.datas.port;

				socket = new WebSocket(`wss://${socketPath}/socket.io/?EIO=3&transport=websocket&access_token=${accessTokenJSON.apiKey}`);
	
				socket.onopen = async () => {
					reconnectAttempts = 0;
					clearTimeout(reconnectTimeout);
				};
				
				socket.onmessage = (event:MessageEvent<string>) => {
					//PONG messages
					if(event.data == "3") return;
					//Connection acknwoledgment
					if(event.data == "5") {
						resolve(true);

						if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
						pingInterval = SetIntervalWorker.instance.create(()=>{
							socket?.send("2");
						}, 25000);

						return;
					}
					try {
						let codeLength = 0;
						for (; codeLength < event.data.length; codeLength++) {
							if(!/[0-9]/.test(event.data[codeLength]!)) break;
						}
						const code = event.data.substring(0, codeLength);
						const json = JSON.parse(event.data.replace(new RegExp("^"+code, ""), "") || "{}");
						//Welcome message
						if(code == "0") {
							//Join room to get events
							socket?.send(`42["join-room",{"room":"${accessTokenJSON.apiKey}","username":"${meJSON.username}"}]`);

							const json = JSON.parse(event.data.replace(new RegExp("^"+code, ""), ""));
							const message = json as TipeeeWelcomeData;
							//Send PING command regularly
							if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
							pingInterval = SetIntervalWorker.instance.create(()=>{
								if(socket?.readyState == socket?.CLOSING || socket?.readyState == socket?.CLOSED) {
									// console.log("SOCKET STATE", socket?.readyState);
								}else{
									socket?.send("2");
								}
							}, message.pingInterval || 10000);
							this.connected = true;
							resolve(true);
						}

						//Connection acknowledgment
						else if(code == "40") return;

						//Authentication failed
						else if(code == "44") {
							//Show error on top of page
							if(isAutoInit) {
								StoreProxy.common.alert(StoreProxy.i18n.t("error.tipeee_connect_failed"));
							}
							this.disconnect(false);
							resolve(false);

						}else{
							if(Array.isArray(json)) {
								const me = StoreProxy.auth.twitch.user;
								json.forEach(entry=>{
									if(typeof entry == "string") return;
									const message = (entry as TipeeeEventData).event;
									switch(message.type) {
										case "donation": {
											const chunks = TwitchUtils.parseMessageToChunks(message.parameters.message, undefined, true);
											const data:TwitchatDataTypes.MessageTipeeeDonationData = {
												id:Utils.getUUID(),
												eventType:"donation",
												platform:"twitch",
												channel_id:me.id,
												type:TwitchatDataTypes.TwitchatMessageType.TIPEEE,
												date:Date.now(),
												amount:message.parameters.amount,
												amountFormatted:message.parameters.amount+message.parameters.currency,
												currency:message.parameters.currency,
												message:message.parameters.message,
												message_chunks:chunks,
												message_html:TwitchUtils.messageChunksToHTML(chunks),
												userName:message.parameters.username,
												recurring:message.parameters.recurring == 1,
												recurringCount:message.parameters.recurring_counter || 0,
											};
											StoreProxy.chat.addMessage(data);
											break;
										}
									}
								})
							}
						}
					}catch(error){
						console.log("Failed parsing Tipeee JSON data");
						console.log(event.data);
						console.error(error);
					}
					isAutoInit = false;
				};
			
				socket.onclose = (event) => {
					//Do not reconnect if token changed
					if(token != this.accessToken) return;
					if(!autoReconnect) return;
	
					this.connected = false;
					if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
					clearTimeout(reconnectTimeout);
					reconnectAttempts ++;
					reconnectTimeout = window.setTimeout(()=> {
						socket = undefined;
						this.connect(token, true);
					}, 500 * reconnectAttempts);
				};
				
				socket.onerror = (error) => {
					console.log("ON_ERROR", error);
					resolve(false);
					this.connected = false;
					if(!autoReconnect) return;
					reconnectAttempts ++;
					if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
					clearTimeout(reconnectTimeout);
					reconnectTimeout = window.setTimeout(()=> {
						socket = undefined;
						this.connect(token, true);
					}, 500 * reconnectAttempts);
				};
			});
		},

		disconnect(resetToken:boolean = true):void {
			autoReconnect = false;
			this.connected = false;
			if(resetToken) {
				this.accessToken = "";
				this.refreshToken = "";
				this.saveData();
			}
			if(pingInterval) SetIntervalWorker.instance.delete(pingInterval);
			clearTimeout(reconnectTimeout);
			if(socket && !this.connected) socket.close();
		},

		saveData():void {
			const data:TipeeStoreData = {
				accessToken:this.accessToken,
				refreshToken:this.refreshToken,
			};
			DataStore.set(DataStore.TIPEEE, data);
		},

	
	} as ITipeeeActions
	& ThisType<ITipeeeActions
		& UnwrapRef<ITipeeeState>
		& _StoreWithState<"raffle", ITipeeeState, ITipeeeGetters, ITipeeeActions>
		& _StoreWithGetters<ITipeeeGetters>
		& PiniaCustomProperties
	>,
});

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeTipeee, import.meta.hot))
}

interface TipeeStoreData {
	accessToken:string;
	refreshToken:string;
}

interface TipeeeWelcomeData {
	pingInterval:number;
	pingTimeout:number;
	sid:string;
}

interface TipeeeEventData {
	event: {
		type: "donation";
		created_at: string;
		deleted_at: string;
		display: number;
		origin?: any;
		formattedAmount: number;
		parameters: {
			username: string;
			amount: number;
			message: string;
			formattedMessage: string;
			currency: string;
			recurring?: number;
			recurring_counter?: number;
		};
		'parameters.amount': number;
		ref: number;
		user: {
			locked: boolean;
			hash_id: number;
			hash: string;
			avatar: {
				id: number;
				path: string;
				code: string;
				is_converted: boolean;
				original_path: string;
			};
			hasPayment: boolean;
			currency: {
				code: string;
				symbol: string;
				label: string;
				available: boolean;
			};
			country: string;
			campaignActivation: number;
			id: number;
			providers: {
				connectedAt: string;
				code: string;
				id: string;
				username: string;
				master: boolean;
				followers: number;
				created_at: string;
				channel: string;
				expiration_at: string;
			}[];
			username: string;
			pseudo: string;
			email_confirmation_at: string;
			created_at: string;
			session_at: string;
			parameters: any[];
		};
	}
}