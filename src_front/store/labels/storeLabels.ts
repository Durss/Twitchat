import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { ILabelsActions, ILabelsGetters, ILabelsState } from '../StoreProxy';
import Utils from '@/utils/Utils';
import DataStore from '../DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import StoreProxy from '../StoreProxy';


export const storeLabels = defineStore('labels', {
	state: () => ({
		labelList:[],
		placeholders:[],
	} as ILabelsState),



	getters: {
		
	} as ILabelsGetters
	& ThisType<UnwrapRef<ILabelsState> & _StoreWithGetters<ILabelsGetters> & PiniaCustomProperties>
	& _GettersTree<ILabelsState>,



	actions: {
		async populateData():Promise<void> {
			const json = DataStore.get(DataStore.OVERLAY_LABELS);
			console.log(json);
			if(json) {
				const data = JSON.parse(json) as IStoreData;
				this.labelList = data.labelList;
			}
		},
		
		addLabel():void {
			this.labelList.push({
				id:Utils.getUUID(),
				enabled:true,
				title:"",
				value:"",
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
			const data:IStoreData = {
				labelList:this.labelList,
			}
			DataStore.set(DataStore.OVERLAY_LABELS, data);
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
	labelList:TwitchatDataTypes.LabelItemData[];
}
