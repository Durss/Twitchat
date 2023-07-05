import type { HeatScreen } from '@/types/HeatDataTypes';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IHeatActions, IHeatGetters, IHeatState } from '../StoreProxy';

export const storeHeat = defineStore('heat', {
	state: () => ({
		screenList:[],
	} as IHeatState),



	getters: {

	} as IHeatGetters
	& ThisType<UnwrapRef<IHeatState> & _StoreWithGetters<IHeatGetters> & PiniaCustomProperties>
	& _GettersTree<IHeatState>,



	actions: {

		createScreen():void {
			this.screenList.push({
				id:Utils.getUUID(),
				areas:[]
			});

			this.saveScreens();
		},

		duplicateScreen(id:string):void {
			let screen = this.screenList.find(v=>v.id == id);
			if(!screen) return;

			screen = JSON.parse(JSON.stringify(screen));

			this.screenList.push(screen!);

			this.saveScreens();
		},

		deleteScreen(id:string):void {
			let index = this.screenList.findIndex(v=>v.id == id);
			if(index == -1) return;
			this.screenList.splice(index, 1);

			this.saveScreens();
		},
		
		updateScreen(data:HeatScreen):void {
			let index = this.screenList.findIndex(v=>v.id == data.id);
			if(index == -1) {
				this.screenList.push(data);
			}else{
				this.screenList[index] = data;
			}

			this.saveScreens();
		},

		saveScreens():void {
			for (let i = 0; i < this.screenList.length; i++) {
				const screen = this.screenList[i];
				for (let j = 0; j < screen.areas.length; j++) {
					const a = screen.areas[j];
					if(a.points.length == 0) {
						screen.areas.splice(j, 1);
						j--;
					}
				}
			}
			DataStore.set(DataStore.HEAT_SCREENS, this.screenList);
		}

	} as IHeatActions
	& ThisType<IHeatActions
		& UnwrapRef<IHeatState>
		& _StoreWithState<"timer", IHeatState, IHeatGetters, IHeatActions>
		& _StoreWithGetters<IHeatGetters>
		& PiniaCustomProperties
	>,
})