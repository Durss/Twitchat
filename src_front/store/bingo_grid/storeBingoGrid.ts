import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IBingoGridActions, type IBingoGridGetters, type IBingoGridState, type IStore } from '../StoreProxy';
import Utils from '@/utils/Utils';
import DataStore from '../DataStore';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';

let overlayCheckInterval:{[key:string]:number} = {};

export const storeBingoGrid = defineStore('bingoGrid', {
	state: () => ({
		gridList: [] as TwitchatDataTypes.BingoGridConfig[],
		availableOverlayList: [],
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

				this.gridList.forEach(grid => {
					//Adding new prop. Can be removed after beta ends
					if(!grid.chatCmdPermissions) {
						grid.chatCmdPermissions = {
							all:false,
							broadcaster:true,
							follower:false,
							follower_duration_ms:0,
							mods:true,
							subs:false,
							vips:false,
							usersAllowed:[],
							usersRefused:[],
						};
					}
					if(!grid.heatClickPermissions) {
						grid.heatClickPermissions = {
							all:false,
							broadcaster:true,
							follower:false,
							follower_duration_ms:0,
							mods:true,
							subs:false,
							vips:false,
							usersAllowed:[],
							usersRefused:[],
						};
					}
				})
			}

			/**
			 * Get notified when a grid overlay exists
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.BINGO_GRID_OVERLAY_PRESENCE, (event:TwitchatEvent<{bid:string}>)=>{
				const id = event.data!.bid;
				const ref = this.gridList.find(v => v.id == id);
				//Check if bingo exists
				if(!ref) return;

				//Add overlay to the list if not already done
				if(this.availableOverlayList.findIndex(v => v.id == id) === -1) {
					this.availableOverlayList.push(ref);
				}

				//Schedule removal of the overlay.
				//Will be reset before the timeout expires if the overlay
				//still exists
				clearTimeout(overlayCheckInterval[id]);
				overlayCheckInterval[id] = setTimeout(()=>{
					this.availableOverlayList = this.availableOverlayList.filter(v => v.id != id);
				}, 25000);
			});

			/**
			 * Get notified when clicking on a grid via heat
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.BINGO_GRID_HEAT_CLICK, async (event:TwitchatEvent<{gridId:string, entryId:string, click:TwitchatDataTypes.HeatClickData}>)=>{
				if(!event.data) return;
				const data = event.data;
				const grid = this.gridList.find(g => g.id === (data.gridId || ""));
				//Ignore heat click if grid is disabled or heat interaction is disabled
				if(!grid || !grid.enabled || !grid.heatClick) return;

				const user = await StoreProxy.users.getUserFrom("twitch", data.click.channelId, data.click.uid, data.click.login);
				const allowed = await Utils.checkPermissions(grid.heatClickPermissions, user, data.click.channelId);
				if(!allowed) {
					console.log("User not allowed to click !");
				}else{
					const entry = grid.entries.find(e => e.id === (event.data?.entryId || ""));
					if(!entry) return;
					entry.check = !entry.check;
					this.saveData(grid.id);
				}
			});
		},

		addGrid():TwitchatDataTypes.BingoGridConfig {
			const data:TwitchatDataTypes.BingoGridConfig = {
				id:Utils.getUUID(),
				title:"",
				textColor:"#000000",
				enabled:true,
				showGrid:true,
				heatClick:false,
				textSize:20,
				cols:5,
				rows:5,
				entries:[],
				chatCmdPermissions:{
					all:false,
					broadcaster:true,
					follower:false,
					follower_duration_ms:0,
					mods:true,
					subs:false,
					vips:false,
					usersAllowed:[],
					usersRefused:[],
				},
				heatClickPermissions:{
					all:false,
					broadcaster:true,
					follower:false,
					follower_duration_ms:0,
					mods:true,
					subs:false,
					vips:false,
					usersAllowed:[],
					usersRefused:[],
				},
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

		shuffleGrid(id:string):void {
			const grid = this.gridList.find(g => g.id === id);
			if(!grid) return;
			const entries = grid.entries;
			for (let i = entries.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				if(entries[i].lock || entries[j].lock) continue;
				[entries[i], entries[j]] = [entries[j], entries[i]];
			}
			this.saveData(id)
		},

		resetLabels(id:string):void {
			const grid = this.gridList.find(g => g.id === id);
			if(!grid) return;
			const entries = grid.entries;
			for (let i = 0; i < entries.length; i++) {
				if(entries[i].lock) continue;
				entries[i].label = "";
			}
			this.saveData(id)
		},

		resetCheckStates(id:string):void {
			const grid = this.gridList.find(g => g.id === id);
			if(!grid) return;
			grid.entries.forEach(entry => entry.check = false);
			this.saveData(id)
		},

		duplicateGrid(id:string):void {
			const source = this.gridList.find(g => g.id === id);
			if(!source) return;
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

		async saveData(gridId:string):Promise<void> {
			const data:IStoreData = {
				gridList:this.gridList,
			};
			DataStore.set(DataStore.BINGO_GRIDS, data);

			const [grid] = this.gridList.filter(g => g.id === gridId);
			const count = grid.cols*grid.rows;
			//TODO
			// if(count < grid.entries.length) {
			// 	try {
			// 		await StoreProxy.main.confirm("Réduire?", "Vous allez perdre des entrées !");
			// 	}catch(error){
			// 		return;
			// 	}
			// }
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

			//Replace all spaces (but line breaks) with a normal space.
			//Necessary because contenteditable sometimes adds non-breakable
			//spaces in place of normal spaces.
			grid.entries.forEach(entry => {
				entry.label = entry.label.replace(/[^\S\r\n]/g, " ");
			})
			PublicAPI.instance.broadcast(TwitchatEvent.BINGO_GRID_PARAMETERS, {id:gridId, bingo:grid});
		},

		async handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd:string):Promise<void> {
			for (let i = 0; i < this.gridList.length; i++) {
				const grid = this.gridList[i];
				//Check if it's a grid's command
				if(grid.enabled
				&& grid.chatCmd
				&& grid.chatCmd.toLowerCase() == cmd) {
					const allowed = await Utils.checkPermissions(grid.chatCmdPermissions, message.user, message.channel_id);
					console.log("User allowed? ", allowed);
					if(!allowed) continue;

					const [xStrt, yStrt] = (message.message || "").toLowerCase().replace(cmd, "").trim().split(":");
					const x = parseInt(xStrt)-1;
					const y = parseInt(yStrt)-1;
					console.log("Tick", x+1, y+1);
					if(x >= 0 && x < grid.cols
					&& y >= 0 && y < grid.rows){
						const cell = grid.entries[x+y*grid.cols];
						cell.check = !cell.check;
						this.saveData(grid.id);
					}
				}
			}
		}
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
