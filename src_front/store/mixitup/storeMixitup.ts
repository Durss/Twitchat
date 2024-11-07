import DataStore from '@/store/DataStore';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IMixitupActions, IMixitupGetters, IMixitupState } from '../StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { log } from 'mathjs';


let initResolver!:(value: boolean) => void;

export const storeMixitup = defineStore('mixitup', {
	state: () => ({
		connected:false,
		ip:"127.0.0.1",
		port:8911,
		commandList:[],
	} as IMixitupState),



	getters: {
	} as IMixitupGetters
	& ThisType<UnwrapRef<IMixitupState> & _StoreWithGetters<IMixitupGetters> & PiniaCustomProperties>
	& _GettersTree<IMixitupState>,



	actions: {
		async populateData():Promise<void> {
			const json = DataStore.get(DataStore.MIXITUP_CONFIGS);
			if(json) {
				const data = JSON.parse(json) as IStoreData;
				this.ip = data.ip || "127.0.0.1";
				this.port = data.port || 8911;
				this.connect();
			}
		},

		async connect():Promise<boolean> {
			this.connected = false;
			return new Promise<boolean>(async (resolve)=>{
				initResolver = resolve;
				try {
					await this.listCommands();
					this.connected = true;
					this.saveConfigs();
					resolve(true);
				}catch(error) {
					resolve(false);
				}
			});
		},

		disconnect():void {
			this.connected = false;
			DataStore.remove(DataStore.MIXITUP_CONFIGS);
		},

		async execCommand(id:string, platform:TwitchatDataTypes.ChatPlatform, args?:{[key:string]:string}):Promise<void> {
			if(!args) args = {};
			let map:Partial<{[key in TwitchatDataTypes.ChatPlatform]:string}> = {twitch:"Twitch", youtube:"YouTube"}
			const options = {
				method:"POST",
				headers: {
					"Content-Type": "application/json",
				},
				body:JSON.stringify({
					Platform: map[platform] || "Twitch",
					Arguments: Object.values(args).join("|"),
				}),
			};
			try {
				await fetch("http://"+this.ip+":"+this.port+"/api/v2/commands/"+id, options);
			}catch(error) {
				//Ignore
			}
		},
		
		saveConfigs():void {
			const data:IStoreData = {
				ip:this.ip,
				port:parseInt(this.port.toString()),//Seems stupid but it enforces the type. Some browser still return strings from "number" fields.
			};
			DataStore.set(DataStore.MIXITUP_CONFIGS, data);
		},

		async listCommands():Promise<void> {
			const options = {
				method:"GET",
				headers: { "Content-Type": "application/json" },
			};
			const req = await fetch("http://"+this.ip+":"+this.port+"/api/v2/commands?pageSize=999999999", options);
			if(req.status == 200) {
				const json = await req.json() as {Commands:IMixitupState["commandList"], TotalCount:number};
				this.commandList = json.Commands || [];
			}else{
				throw new Error("Failed to connect to MixItUp");
			}
		}
	} as IMixitupActions
	& ThisType<IMixitupActions
		& UnwrapRef<IMixitupState>
		& _StoreWithState<"mixitup", IMixitupState, IMixitupGetters, IMixitupActions>
		& _StoreWithGetters<IMixitupGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeMixitup, import.meta.hot))
}

interface IStoreData {
	ip:string;
	port:number;
}