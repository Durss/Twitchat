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
					if(/websocket server.*/i.test(event.data)) return;//Ignore connection message
					const json = JSON.parse(event.data);
					switch(json.type) {
						case "PROFILE_MAPPINGS":{
							this.mappingList = json.data.mappings;
							console.log(this.mappingList)
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
			console.log("EXEC", this.connected, socket)
			if(!socket || !this.connected) return;
			type outputTypeProps = {[K in NonNullable<TriggerActionPlayabilityData["playabilityData"]>["outputs"][number]["type"]]:string};
			const data:{events:({
				type:NonNullable<TriggerActionPlayabilityData["playabilityData"]>["outputs"][number]["type"],
				state?:boolean,
				value?:number,
				button?:string,
				key?:string,
				axis?:string,
				trigger?:string,
			})[]} = {events:[]}
			// } & Partial<outputTypeProps>)[]} = {events:[]}
			outputs.forEach((output) => {
				const event:(typeof data.events)[number] = {
					type: output.type,
				};
				// event[output.type] = output.code;
				if(["mouseButton", "button"].includes(output.type)) {
					event.state = output.value as boolean;
					event.button = output.code;
				}else{
					event.value = output.value as number;
					if(output.type === "keyboard") event.key = output.code;
					else if(output.type === "axis") event.axis = output.code;
					else if(output.type === "trigger") event.trigger = output.code;
				}
				data.events.push(event);
			});
			socket.send(JSON.stringify(data));
			console.log(data)
		},
		
		saveConfigs():void {
			const data:IStoreData = {
				ip:this.ip,
				port:parseInt(this.port.toString()),//Seems stupid but it enforces the type. Some browser still return strings from "number" fields.
			};
			DataStore.set(DataStore.PLAYABILITY_CONFIGS, data);
		},

		async listCommands():Promise<void> {
		}
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