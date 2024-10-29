import DataStore from '@/store/DataStore';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IStreamerbotActions, IStreamerbotGetters, IStreamerbotState } from '../StoreProxy';
import { StreamerbotClient } from '@streamerbot/client';


let initResolver!:(value: boolean) => void;
let socket!:StreamerbotClient;

export const storeStreamerbot = defineStore('streamerbot', {
	state: () => ({
		connected:false,
		ip:"127.0.0.1",
		port:8080,
		password:"",
		actionList:[],
	} as IStreamerbotState),



	getters: {
	} as IStreamerbotGetters
	& ThisType<UnwrapRef<IStreamerbotState> & _StoreWithGetters<IStreamerbotGetters> & PiniaCustomProperties>
	& _GettersTree<IStreamerbotState>,



	actions: {
		async populateData():Promise<void> {
			const json = DataStore.get(DataStore.STREAMERBOT_CONFIGS);
			if(json) {
				const pass = DataStore.get(DataStore.STREAMERBOT_WS_PASSWORD);
				const data = JSON.parse(json) as IStoreData;
				this.ip = data.ip || "127.0.0.1";
				this.port = data.port || 8080;
				this.password = pass || "";
				this.connect();
			}
		},

		async connect():Promise<boolean> {
			return new Promise<boolean>((resolve)=>{
				initResolver = resolve;
				
				if(socket) {
					socket.disconnect();
				}
				console.log({
					port:this.port,
					host:this.ip,
					password:this.password,
				})
				socket = new StreamerbotClient({
					port:this.port,
					host:this.ip,
					immediate:false,
					password:this.password,
					autoReconnect:true,
					onConnect:(res)=>{
						this.connected = true;
						initResolver(true);
						socket.getActions().then(actions=>{
							this.actionList = actions.actions;
						});
						this.saveConfigs();
					},
					onError:(error) =>{
						this.connected = false;
						initResolver(false);
					},
					// onDisconnect:()=>{
					// 	console.log("DISCONNECT??");
					// 	window.setTimeout(() => {
					// 		socket.connect();
					// 	}, 1000);
					// }
				});
				socket.connect().catch(error=>{
					this.connected = false;
					initResolver(false);
				});
			});
		},

		disconnect():void {
			this.connected = false;
			socket.disconnect();
		},
		
		doAction(id:string):void {
			socket.doAction({id});
		},
		
		saveConfigs():void {
			const data:IStoreData = {
				ip:this.ip,
				port:parseInt(this.port.toString()),//Seems stupid but it enforces the type. Some browser still return strings from "number" fields.
			};
			DataStore.set(DataStore.STREAMERBOT_CONFIGS, data);
			DataStore.set(DataStore.STREAMERBOT_WS_PASSWORD, this.password);
		},
	} as IStreamerbotActions
	& ThisType<IStreamerbotActions
		& UnwrapRef<IStreamerbotState>
		& _StoreWithState<"streamerbot", IStreamerbotState, IStreamerbotGetters, IStreamerbotActions>
		& _StoreWithGetters<IStreamerbotGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeStreamerbot, import.meta.hot))
}

interface IStoreData {
	ip:string;
	port:number;
}