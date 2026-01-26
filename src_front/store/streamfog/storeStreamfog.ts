import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IStreamfogActions, IStreamfogGetters, IStreamfogState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

const apiKey = "98723ce97e2788a8e2f4639302ee969f80ad4838998ab899cb34c9155bdb1c48";

export const storeStreamfog = defineStore('streamfog', {
	state: () => ({
		connected:false,
		invalidID:false,
		connecting:false,
		userId:"",
		lensesList:[],
		userLensesList:[],
		videoList:[],
	} as IStreamfogState),



	getters: {
	} as IStreamfogGetters
	& ThisType<UnwrapRef<IStreamfogState> & _StoreWithGetters<IStreamfogGetters> & PiniaCustomProperties>
	& _GettersTree<IStreamfogState>,



	actions: {
		populateData():void {
			const data = DataStore.get(DataStore.STREAMFOG_CONFIGS);
			if(data) {
				const json = JSON.parse(data) as StreamfogStoreData;
				this.userId = json.userId;
				if(this.userId){
					this.connect(this.userId).then(success=>{
						if(!success) {
							StoreProxy.common.alert(StoreProxy.i18n.t("error.streamfog_connect_failed"));
						}
					});
				}
			}
		},

		async connect(userId:string, isReconnect:boolean = false):Promise<true|string> {

			if(isReconnect && userId != this.userId) return Promise.resolve("INVALID_ID");

			this.connecting = true;
			this.connected = false;
			this.invalidID = false;

			if(!isReconnect) {
				this.userId = userId;
				this.saveData();
			}

			const res = await this.listUserLenses();
			if(res) {
				const res = await this.listAllLenses();
				this.connected = res !== false;
			}
			return this.connected === true ? true : "INVALID_ID";
		},

		async listAllLenses():Promise<Lense[]|false> {
			try {
				const res = await fetch("https://api.streamfog.com/api/v2/camerakit-lenses/external", {
					headers:{
						"Content-Type": "application/json",
						"X-API-Key": apiKey,
					},
				});
				if(res.status > 204) throw new Error("Invalid response");
				const json = await res.json() as InventoryResult;
				this.lensesList = json.data;
				return this.lensesList;
			}catch(_error) {
			};
			return false;
		},

		async listUserLenses():Promise<boolean> {
			try {
				const res = await fetch("https://api.streamfog.com/api/v2/user-content/inventory/"+encodeURIComponent(this.userId), {
					headers:{
						"Content-Type": "application/json",
						"X-API-Key": apiKey,
					},
				});
				if(res.status > 204) throw new Error("Invalid response");
				const json = await res.json() as UserInventoryResult;
				const lenseIds = json.data.snapLenses.map(lense=>lense.id);
				this.userLensesList = this.lensesList.filter(lense=>lenseIds.includes(lense.id));
				this.videoList = json.data.animations;
				return true;
			}catch(_error) {
			};
			return false;
		},

		async activateLense(lenseId:string, duration_ms?:number):Promise<boolean> {
			try {
				const res = await fetch("https://api.streamfog.com/api/v2/camControl/activateLens", {
					method: "POST",
					headers:{
						"Content-Type": "application/json",
						"X-API-Key": apiKey,
					},
					body: JSON.stringify({
						"userMongoId": this.userId,
						"lensId": lenseId,
						"duration": duration_ms ?? 0
					})
				});
				return res.status <= 204;
			}catch(_error) {
			};
			return false;
		},

		async deactivateLense():Promise<boolean> {
			try {
				const res = await fetch("https://api.streamfog.com/api/v2/camControl/disableLens", {
					method: "POST",
					headers:{
						"Content-Type": "application/json",
						"X-API-Key": apiKey,
					},
					body: JSON.stringify({
						"userMongoId": this.userId,
					})
				});
				return res.status <= 204;
			}catch(_error) {
			};
			return false;
		},

		async playVideoAnimation(videoId:string):Promise<boolean> {
			try {
				const res = await fetch("https://api.streamfog.com/api/v2/camControl/playVideoAnim", {
					method: "POST",
					headers:{
						"Content-Type": "application/json",
						"X-API-Key": apiKey,
					},
					body: JSON.stringify({
						"userMongoId": this.userId,
						"animId": videoId,
					})
				});
				return res.status <= 204;
			}catch(_error) {
			};
			return false;
		},

		saveData():void {
			const data:StreamfogStoreData = {
				userId: this.userId,
			}
			DataStore.set(DataStore.STREAMFOG_CONFIGS, data);
		}
	} as IStreamfogActions
	& ThisType<IStreamfogActions
		& UnwrapRef<IStreamfogState>
		& _StoreWithState<"streamfog", IStreamfogState, IStreamfogGetters, IStreamfogActions>
		& _StoreWithGetters<IStreamfogGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeStreamfog, import.meta.hot))
}

export interface StreamfogStoreData {
	userId:string;
}

export type Lense = {
    _id: string;
    groupId: string;
    id: string;
    __v: number;
    checksum: string;
    createdAt: string;
    iconUrl: string;
    lastSyncedAt: string;
    name: string;
    previewImageUrl: string;
    updatedAt: string;
    isDeleted: boolean;
    deletedAt?: string;
}

export type Video = {
	title: string;
	rootPath: string;
	duration: number;
	config: {
		background: boolean;
		foreground: boolean;
	};
	isAdded: boolean;
	origin: string;
	_id: string;
	createdAt: string;
	updatedAt: string;
}

type InventoryResult = {
  success: boolean;
  data: Lense[];
  count: number;
}

type UserInventoryResult = {
  success: boolean;
  data: {
    _id: string;
    userMongoId: string;
    animations: Video[];
    snapLenses: Array<{
      id: string;
      _id: string;
      createdAt: string;
      updatedAt: string;
    }>;
    vtubeConfigs: Array<any>;
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
}