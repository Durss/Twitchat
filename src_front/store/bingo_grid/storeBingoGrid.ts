import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IBingoGridActions, type IBingoGridGetters, type IBingoGridState, type IStore } from '../StoreProxy';
import Utils from '@/utils/Utils';
import DataStore from '../DataStore';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import type { JsonObject } from 'type-fest';

export const storeBingoGrid = defineStore('bingoGrid', {
	state: () => ({
		gridList: [] as TwitchatDataTypes.BingoGridConfig[],
	} as IBingoGridState),



	getters: {
	} as IBingoGridGetters
	& ThisType<UnwrapRef<IBingoGridState> & _StoreWithGetters<IBingoGridGetters> & PiniaCustomProperties>
	& _GettersTree<IBingoGridState>,



	actions: {
		/**
		 * Populates store from DataStorage
		 */
		populateData():void {
			const json = DataStore.get(DataStore.BINGO_GRIDS);
			if(json) {
				const data = JSON.parse(json) as IStoreData;
				this.gridList = data.gridList || [];
			}
		},

		addGrid():TwitchatDataTypes.BingoGridConfig {
			const data:TwitchatDataTypes.BingoGridConfig = {
				id:Utils.getUUID(),
				title:"",
				enabled:true,
				cols:5,
				rows:5,
				entries:[],
			}
			const len = data.cols*data.rows;
			for (let i = 0; i < len; i++) {
				data.entries.push({
					id:Utils.getUUID(),
					label:"",
					lock:Math.floor(len/2) == i,
					check:false,
				})
			}
			this.gridList.push(data);
			this.saveData(data.id);
			return data;
		},

		removeGrid(id:string):void {
			const t = StoreProxy.i18n.t;
			StoreProxy.main.confirm(t("bingo_grid.form.delete_confirm.title"), t("bingo_grid.form.delete_confirm.description"))
			.then(()=>{
				this.gridList = this.gridList.filter(g => g.id !== id);
			}).catch(()=>{})
		},

		duplicateGrid(id:string):void {
			const [source] = this.gridList.filter(g => g.id === id);
			const target = this.addGrid();
			target.title = source.title;
			target.cols = source.cols;
			target.rows = source.rows;
			target.entries = source.entries.map(item => {
				return {
					id:Utils.getUUID(),
					label:item.label,
					lock:item.lock,
					check:false,
				}
			});
			this.saveData(id);
		},

		saveData(gridId:string):void {
			const data:IStoreData = {
				gridList:this.gridList,
			};
			DataStore.set(DataStore.BINGO_GRIDS, data);

			const [grid] = this.gridList.filter(g => g.id === gridId);
			const count = grid.cols*grid.rows;
			//Remove useless items
			grid.entries = grid.entries.splice(0, count);
			//Add missing items
			while(grid.entries.length < count) {
				grid.entries.push({
					id:Utils.getUUID(),
					label:"",
					lock:false,
					check:false,
				})
			}
			PublicAPI.instance.broadcast(TwitchatEvent.BINGO_GRID_PARAMETERS, {bingo:grid} as unknown as JsonObject);
		},
	} as IBingoGridActions
	& ThisType<IBingoGridActions
		& UnwrapRef<IBingoGridState>
		& _StoreWithState<"bingoGrid", IBingoGridState, IBingoGridGetters, IBingoGridActions>
		& _StoreWithGetters<IBingoGridGetters>
		& PiniaCustomProperties
	>,
})

interface IStoreData {
	gridList:TwitchatDataTypes.BingoGridConfig[];
}
