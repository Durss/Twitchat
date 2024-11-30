import DataStore from '@/store/DataStore';
import { setTriggerEventPlaceholderValues, TriggerTypes, type TriggerActionPlayabilityData } from '@/types/TriggerActionDataTypes';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IPlayabilityActions, IPlayabilityGetters, IPlayabilityState } from '../StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import StoreProxy from '../StoreProxy';
import Utils from '@/utils/Utils';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';


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
			
			this.disconnect();

			autoReconnect = true;
			return new Promise<boolean>((resolve, reject)=> {
				initResolver = resolve;
		
				socket = new WebSocket(`ws://${this.ip}:${this.port}`);
				
				socket.onmessage = (event) => {
					const json = JSON.parse(event.data);
					switch(json.type) {
						case "CONNECT":{
							this.connected = true;
							resolve(true);
							this.saveConfigs();
							this.loadProfile();
							break;
						}

						case "PROFILE_UPDATE":{
							this.loadProfile();
							break;
						}

						case "PROFILE_MAPPINGS":{
							this.mappingList = json.data.mappings;
							//Update trigger actions list
							const inputNames:TwitchatDataTypes.ParameterDataListValue<string>[] = this.mappingList.map(v=> {
								return {
									value: v.output.code,
									label: v.output.code,
								}
							})
							setTriggerEventPlaceholderValues(TriggerTypes.PLAYABILITY_INPUT, "INPUT_NAME", inputNames);
							
							//Define input types on triggers
							const inputTypes:TwitchatDataTypes.ParameterDataListValue<NonNullable<TriggerActionPlayabilityData["playabilityData"]>["outputs"][number]["type"]>[] = [];
							inputTypes.push({labelKey:"triggers.placeholders.playability_inputType_axis", value:"axis"});
							inputTypes.push({labelKey:"triggers.placeholders.playability_inputType_button", value:"button"});
							inputTypes.push({labelKey:"triggers.placeholders.playability_inputType_keyboard", value:"keyboard"});
							inputTypes.push({labelKey:"triggers.placeholders.playability_inputType_mouseButton", value:"mouseButton"});
							inputTypes.push({labelKey:"triggers.placeholders.playability_inputType_trigger", value:"trigger"});
							setTriggerEventPlaceholderValues(TriggerTypes.PLAYABILITY_INPUT, "INPUT_TYPE", inputTypes);
							break;
						}

						case "EVENTS":{
							let events:{
								source: "output",
								type: NonNullable<TriggerActionPlayabilityData["playabilityData"]>["outputs"][number]["type"],
								code: string,
								value: boolean|number
							}[] = json.events;
							events.forEach((event) => {
								let message:TwitchatDataTypes.MessagePlayabilityInputData = {
									channel_id: StoreProxy.auth.twitch.user.id,
									date: Date.now(),
									id: Utils.getUUID(),
									platform: "twitchat",
									type: TwitchatDataTypes.TwitchatMessageType.PLAYABILITY_INPUT,
									inputCode: event.code,
									inputType: event.type,
									inputValue: event.value,
								};
								TriggerActionHandler.instance.execute(message);
							});
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
			})[]} = {events:[]};
			const scheduledRelease:{events:({
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
					scheduledRelease.events.push(release);
				}else{
					let o:typeof data.events[0] = {
						type: output.type,
						code: output.code,
						value: output.value,
					}
					data.events.push(o);
				}
			});
			
			socket.send(JSON.stringify(data));
			
			//If releases are scheduled, wait a little and release.
			//This is necessary for gamepads
			if(scheduledRelease.events.length > 0) {
				setTimeout(()=>{
					socket!.send(JSON.stringify(scheduledRelease));
				}, 50);
			}
		},
		
		saveConfigs():void {
			const data:IStoreData = {
				ip:this.ip,
				port:parseInt(this.port.toString()),//Seems stupid but it enforces the type. Some browser still return strings from "number" fields.
			};
			DataStore.set(DataStore.PLAYABILITY_CONFIGS, data);
		},

		loadProfile():void {
			socket!.send(JSON.stringify({type: "GET_PROFILE_MAPPINGS", profile: "Twitchat"}));
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