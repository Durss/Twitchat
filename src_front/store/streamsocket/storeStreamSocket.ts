import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { UnwrapRef } from 'vue'
import type { IStreamSocketActions, IStreamSocketGetters, IStreamSocketState } from '../StoreProxy'
import StoreProxy from '../StoreProxy';
import DataStore from '../DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';

let socket:WebSocket|undefined = undefined;
let reconnectTimeout:number = -1;
let reconnectAttempts:number = 0;
let autoReconnect:boolean = false;

export const storeStreamSocket = defineStore('streamSocket', {
	state: () => ({
		connected:false,
		invalidSecret:false,
		connecting:false,
		socketSecret:"",
	} as IStreamSocketState),



	getters: {
	} as IStreamSocketGetters
	& ThisType<UnwrapRef<IStreamSocketState> & _StoreWithGetters<IStreamSocketGetters> & PiniaCustomProperties>
	& _GettersTree<IStreamSocketState>,



	actions: {
		populateData():void {
			const data = DataStore.get(DataStore.STREAM_SOCKET_SECRET);
			if(data) {
				// const json = JSON.parse(data) as StreamSocketStoreData;
				this.socketSecret = data;
				if(this.socketSecret){
					this.connect(this.socketSecret).then(success=>{
						if(!success) {
							StoreProxy.common.alert(StoreProxy.i18n.t("error.streamSocket_connect_failed"));
						}
					});
				}
			}
		},

		async connect(secret:string, isReconnect:boolean = false):Promise<boolean> {

			if(isReconnect && secret != this.socketSecret) return Promise.resolve(false);

			this.disconnect();

			this.connecting = true;
			this.invalidSecret = false;

			if(!isReconnect) {
				this.socketSecret = secret;
				this.saveData();
			}

			autoReconnect = true;

			return new Promise<boolean>((resolve, reject)=> {
				const chanId = StoreProxy.auth.twitch.user.id;
				socket = new WebSocket(`wss://streamsocket.kadokta.com/api/v1/streamer/twitchat/channel/${chanId}`);
				socket.onopen = (e) => {
					resolve(true);
					socket!.send(JSON.stringify({
						"type": "request_secret_check",
						"data": {
							"secret": this.socketSecret,
						}
					}));
					this.saveData();
				}

				socket.onclose = (event) => {
					if(!autoReconnect) return;

					this.connected = false;
					this.connecting = false;
					clearTimeout(reconnectTimeout);
					reconnectAttempts ++;
					reconnectTimeout = window.setTimeout(()=> {
						socket = undefined;
						this.connect(this.socketSecret, true);
					}, 500 * reconnectAttempts);
				};

				socket.onerror = (error) => {
					resolve(false);
					this.connected = false;
					this.connecting = false;
					if(!autoReconnect) return;
					reconnectAttempts ++;
					clearTimeout(reconnectTimeout);
					reconnectTimeout = window.setTimeout(()=> {
						socket = undefined;
						this.connect(this.socketSecret, true);
					}, 500 * reconnectAttempts);
				};

				socket.onmessage = (event) => {
					const json = JSON.parse(event.data) as StreamSocketIncomingMessage;
					switch(json.type) {
						case "request_connection_check": {
							socket!.send(JSON.stringify({
								"type": "response_connection_check",
								"data": {
									"secret": this.socketSecret,
									"active": true
								}
							}));
							break;
						}

						case "notification_error": {
							if(json.data.error_name === "invalid_secret") {
								this.disconnect();
								this.invalidSecret = true;
							}
							break;
						}

						case "notification_event": {
							const channel_id = StoreProxy.auth.twitch.user.id;
							const message:TwitchatDataTypes.MessageStreamSocketActionData = {
								id: Utils.getUUID(),
								date: Date.now(),
								channel_id,
								platform: "twitch",
								type:TwitchatDataTypes.TwitchatMessageType.STREAMSOCKET_ACTION,
								actionId: json.data.event_id,
								actionName: json.data.event_display_name,
								sku: json.data.product_sku,
								bits: json.data.product_bits,
								user: json.data.user_id?
										StoreProxy.users.getUserFrom("twitch", channel_id, json.data.user_id, undefined, json.data.user_display_name)
										: StoreProxy.auth.twitch.user,
							}
							StoreProxy.chat.addMessage(message);
							break;
						}

						case "notification_config_update": {
							break;
						}

						case "response_secret_check": {
							this.connected = json.data.valid === true;
							if(!this.connected) {
								this.disconnect();
								this.invalidSecret = true;
							}
							this.connecting = false;
							break;
						}
					}
				};
			});
		},

		disconnect(clearStore:boolean = false):void {
			autoReconnect = false;
			if(socket) {
				socket.onopen = (event) => { };
				socket.onclose = (event) => { };
				socket.onerror = (event) => { };
				socket.onmessage = (event) => { };
				socket.close();
			}
			this.connected = false;
			this.connecting = false;
			this.invalidSecret = false;
			if(clearStore) {
				this.socketSecret = "";
				this.saveData();
			}
			clearTimeout(reconnectTimeout);
		},

		saveData():void {
			// const data:StreamSocketStoreData = {
			// }
			DataStore.set(DataStore.STREAM_SOCKET_SECRET, this.socketSecret);
		}
	} as IStreamSocketActions
	& ThisType<IStreamSocketActions
		& UnwrapRef<IStreamSocketState>
		& _StoreWithState<"streamSocket", IStreamSocketState, IStreamSocketGetters, IStreamSocketActions>
		& _StoreWithGetters<IStreamSocketGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeStreamSocket, import.meta.hot))
}

// export interface StreamSocketStoreData {

// }


export type StreamSocketIncomingMessage = ConnectionCheck | ActionUsed | ActionUpdate | EventError | RequestCheckAnswer;

interface ConnectionCheck {
	type:"request_connection_check";
}

interface ActionUsed {
	type:"notification_event";
    data: {
        event_id: string;
        event_display_name: string;
        product_sku: string;
        product_bits: number;
        user_id: string;
        user_display_name:string;
    }
}

interface EventError {
	type:"notification_error";
    data: {
        error_name: "invalid_secret"|string;
        error_message: string;
    }
}

interface RequestCheckAnswer {
	type:"response_secret_check";
    data: {
        valid: boolean;
    }
}

interface ActionUpdate {
	type:"notification_config_update";
    data: {
		event_id: string;
        event_display_name: string;
        product_sku: string;
    }
}
