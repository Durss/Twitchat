import TwitchatEvent from '@/events/TwitchatEvent';
import { LabelItemPlaceholderList, type LabelItemData } from '@/types/ILabelOverlayData';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { ILabelsActions, ILabelsGetters, ILabelsState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

let ready = false;
let readyResolver:() => void;
let readyPromise = new Promise<void>((resolve) => readyResolver = resolve);
let broadcastCount:number = 0;
let broadcastDebounce:number = -1;

export const storeLabels = defineStore('labels', {
	state: () => ({
		labelList:[],
		placeholders:{},
	} as ILabelsState),



	getters: {
		
	} as ILabelsGetters
	& ThisType<UnwrapRef<ILabelsState> & _StoreWithGetters<ILabelsGetters> & PiniaCustomProperties>
	& _GettersTree<ILabelsState>,



	actions: {
		async populateData():Promise<void> {
			LabelItemPlaceholderList.forEach(p => {
				this.placeholders[p.tag] = {
					value: p.type == "number"? 0 : "",
					placeholder:p,
				}
			})
			const json = DataStore.get(DataStore.OVERLAY_LABELS);
			if(json) {
				const data = JSON.parse(json) as IStoreData;
				this.labelList = data.labelList;
			}

			PublicAPI.instance.addEventListener(TwitchatEvent.GET_LABEL_OVERLAY_PLACEHOLDERS, ()=>{
				PublicAPI.instance.broadcast(TwitchatEvent.LABEL_OVERLAY_PLACEHOLDERS, this.placeholders as unknown as JsonObject);
			});

			PublicAPI.instance.addEventListener(TwitchatEvent.GET_LABEL_OVERLAY_PARAMS, (e:TwitchatEvent<{id:string}>)=> {
				PublicAPI.instance.broadcast(TwitchatEvent.LABEL_OVERLAY_PARAMS, this.labelList.find(v=>v.id == e.data?.id));
			});

			ready = true;
			readyResolver();

			//TODO Init placeholders values
			this.broadcastPlaceholders();
		},
		
		addLabel():void {
			this.labelList.push({
				id:Utils.getUUID(),
				enabled:true,
				title:"",
				value:"",
				mode:"placeholder"
			});
			this.saveData();
		},
		
		removeLabel(labelId:string):void {
			const t = StoreProxy.i18n.t;
			StoreProxy.main.confirm(t("overlay.labels.delete_confirm.title"), t("overlay.labels.delete_confirm.description"))
			.then(()=>{
				this.labelList = this.labelList.filter(v => v.id !== labelId);
				this.saveData();
			}).catch(()=>{})
		},

		saveData(labelId?:string):void {
			if(labelId) {
				PublicAPI.instance.broadcast(TwitchatEvent.LABEL_OVERLAY_PARAMS, this.labelList.find(v=>v.id == labelId));
			}
			const data:IStoreData = {
				labelList:this.labelList,
			}
			DataStore.set(DataStore.OVERLAY_LABELS, data);
		},

		async updateLabelValue(key:typeof LabelItemPlaceholderList[number]["tag"], value:string|number):Promise<void> {
			if(!ready) {
				//Store not yet ready, wiat for it to be ready
				await readyPromise;
			}
			this.placeholders[key]!.value = value;
			this.broadcastPlaceholders();
		},

		async incrementLabelValue(key:typeof LabelItemPlaceholderList[number]["tag"], value:number):Promise<void> {
			if(!ready) {
				//Store not yet ready, wiat for it to be ready
				await readyPromise;
			}
			const prevValue = this.placeholders[key]!.value as number || 0;
			this.placeholders[key]!.value = prevValue + value;
			this.broadcastPlaceholders();
		},
		
		broadcastPlaceholders():void {
			//This condition makes sure that even if some part of the code
			//ends up spamming "broadcastPlaceholders()" calls, at least
			//every few events get actually fired without clogging the
			//communication channel
			if(++broadcastCount != 50) clearTimeout(broadcastDebounce);
			broadcastDebounce = setTimeout(() => {
				broadcastCount = 0;
				PublicAPI.instance.broadcast(TwitchatEvent.LABEL_OVERLAY_PLACEHOLDERS, this.placeholders as unknown as JsonObject);
			}, 100);
		}

	} as ILabelsActions
	& ThisType<ILabelsActions
		& UnwrapRef<ILabelsState>
		& _StoreWithState<"raffle", ILabelsState, ILabelsGetters, ILabelsActions>
		& _StoreWithGetters<ILabelsGetters>
		& PiniaCustomProperties
	>,
})

interface IStoreData {
	labelList:LabelItemData[];
}
