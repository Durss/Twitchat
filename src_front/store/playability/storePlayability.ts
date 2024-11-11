import DataStore from '@/store/DataStore';
import type { TriggerActionPlayabilityData } from '@/types/TriggerActionDataTypes';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IPlayabilityActions, IPlayabilityGetters, IPlayabilityState } from '../StoreProxy';


let initResolver!:(value: boolean) => void;
let socket:WebSocket|undefined = undefined;
let reconnectTimeout:number = -1;
let reconnectAttempts:number = 0;
let autoReconnect:boolean = false;

export const storePlayability = defineStore('playability', {
	state: () => ({
		connected:false,
		ip:"127.0.0.1",
		port:13123,
		mappingList:[],
	} as IPlayabilityState),



	getters: {
	} as IPlayabilityGetters
	& ThisType<UnwrapRef<IPlayabilityState> & _StoreWithGetters<IPlayabilityGetters> & PiniaCustomProperties>
	& _GettersTree<IPlayabilityState>,



	actions: {
		async populateData():Promise<void> {
			const json = DataStore.get(DataStore.PLAYABILITY_CONFIGS);
			if(json) {
				const data = JSON.parse(json) as IStoreData;
				this.ip = data.ip || "127.0.0.1";
				this.port = data.port || 8911;
				this.connect();
			}
		},

		async connect(isReconnect:boolean = false):Promise<boolean> {
			this.connected = false;
			//Token changed
			if(isReconnect) return Promise.resolve(false);
			
			this.disconnect();

			autoReconnect = true;
			return new Promise<boolean>((resolve, reject)=> {
				initResolver = resolve;
		
				socket = new WebSocket(`ws://${this.ip}:${this.port}`);
				socket.onopen = (e) => {
					this.connected = true;
					resolve(true);
					this.saveConfigs();
					socket!.send(JSON.stringify({type: "GET_PROFILE_MAPPINGS", profile: "Twitchat"}))
				}
				
				socket.onmessage = (event) => {
					const json = JSON.parse(event.data);
					console.log(json);
					switch(json.type) {
						case "CONNECT": break;
						case "PROFILE_MAPPINGS":{
							this.mappingList = json.data.mappings;
							break;
						}
					}
				}
				
				socket.onclose = (event) => {
					if(!autoReconnect) return;

					this.connected = false;
					clearTimeout(reconnectTimeout);
					reconnectAttempts ++;
					reconnectTimeout = window.setTimeout(()=> {
						socket = undefined;
						this.connect(true);
					}, 500 * reconnectAttempts);
				};
				
				socket.onerror = (error) => {
					resolve(false);
					this.connected = false;
					if(!autoReconnect) return;
					reconnectAttempts ++;
					clearTimeout(reconnectTimeout);
					reconnectTimeout = window.setTimeout(()=> {
						socket = undefined;
						this.connect(true);
					}, 500 * reconnectAttempts);
				};
			});
		},

		disconnect():void {
			autoReconnect = false;
			this.connected = false;
			this.saveConfigs();
			clearTimeout(reconnectTimeout);
			if(socket && this.connected) socket.close();
			DataStore.remove(DataStore.PLAYABILITY_CONFIGS);
		},

		async execOutputs(outputs:NonNullable<TriggerActionPlayabilityData["playabilityData"]>["outputs"]):Promise<void> {
			if(!socket) {
				await this.connect();
			}
			if(!socket || !this.connected) return;
			const data:{events:({
				type:NonNullable<TriggerActionPlayabilityData["playabilityData"]>["outputs"][number]["type"],
				code?:NonNullable<TriggerActionPlayabilityData["playabilityData"]>["outputs"][number]["code"],
				value?:boolean|number,
			})[]} = {events:[]}
			outputs.forEach((output) => {
				if(output.value == "press_release") {
					let press:typeof data.events[0] = {
						type: output.type,
						code: output.code,
						value: true,
					}
					data.events.push(press);
					let release:typeof data.events[0] = {
						type: output.type,
						code: output.code,
						value: false,
					}
					data.events.push(release);
				}else{
					let o:typeof data.events[0] = {
						type: output.type,
						code: output.code,
						value: output.value,
					}
					data.events.push(o);
				}
			});
			console.log(data)
			socket.send(JSON.stringify(data));
		},
		
		saveConfigs():void {
			const data:IStoreData = {
				ip:this.ip,
				port:parseInt(this.port.toString()),//Seems stupid but it enforces the type. Some browser still return strings from "number" fields.
			};
			DataStore.set(DataStore.PLAYABILITY_CONFIGS, data);
		},
	} as IPlayabilityActions
	& ThisType<IPlayabilityActions
		& UnwrapRef<IPlayabilityState>
		& _StoreWithState<"playability", IPlayabilityState, IPlayabilityGetters, IPlayabilityActions>
		& _StoreWithGetters<IPlayabilityGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storePlayability, import.meta.hot))
}

interface IStoreData {
	ip:string;
	port:number;
}