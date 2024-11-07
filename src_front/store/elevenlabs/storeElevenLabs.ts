import DataStore from '@/store/DataStore';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IElevenLabsActions, IElevenLabsGetters, IElevenLabsState } from '../StoreProxy';
import { ElevenLabsClient, play } from "elevenlabs";


let client:ElevenLabsClient | undefined = undefined;

export const storeElevenLabs = defineStore('elevenlabs', {
	state: () => ({
		apiKey: "",
		connected: false,
		voiceList: [],
	} as IElevenLabsState),



	getters: {
	} as IElevenLabsGetters
	& ThisType<UnwrapRef<IElevenLabsState> & _StoreWithGetters<IElevenLabsGetters> & PiniaCustomProperties>
	& _GettersTree<IElevenLabsState>,



	actions: {
		async populateData():Promise<void> {
			const apiKey = DataStore.get(DataStore.ELEVENLABS_API_KEY);
			if(apiKey) {
				this.apiKey = apiKey;
				this.connect();
			}
		},

		async connect():Promise<boolean> {
			this.connected = false;
			return new Promise<boolean>(async (resolve)=>{
				try {
					client = new ElevenLabsClient({
						apiKey:this.apiKey
					})
					const success = await this.loadVoiceList();
					this.connected = success;
					resolve(this.connected);
					if(this.connected) {
						this.saveConfigs()
					}
				}catch(error) {
					resolve(false);
				}
			});
		},

		disconnect():void {
			this.connected = false;
			DataStore.remove(DataStore.ELEVENLABS_API_KEY);
		},


		async tts(message:string, modelId:string, lang:string, settings?:unknown):Promise<void> {
		},

		async loadVoiceList():Promise<boolean> {
			const res = await client?.voices.getAll();
			if(!res) return false;
			this.voiceList = res?.voices;
			console.log(this.voiceList)
			return true;
		},

		saveConfigs():void {
			DataStore.set(DataStore.ELEVENLABS_API_KEY, this.apiKey);
		},
	} as IElevenLabsActions
	& ThisType<IElevenLabsActions
		& UnwrapRef<IElevenLabsState>
		& _StoreWithState<"elevenlabs", IElevenLabsState, IElevenLabsGetters, IElevenLabsActions>
		& _StoreWithGetters<IElevenLabsGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeElevenLabs, import.meta.hot))
}

interface IStoreData {
}