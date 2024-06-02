import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IBingoGridActions, type IBingoGridGetters, type IBingoGridState, type IStore } from '../StoreProxy';
import Utils from '@/utils/Utils';
import DataStore from '../DataStore';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import ApiHelper from '@/utils/ApiHelper';
import SSEHelper from '@/utils/SSEHelper';
import SSEEvent from '@/events/SSEEvent';

let overlayCheckInterval:{[key:string]:number} = {};
//Keeps old check stats of gridd to be able to diff on save
let prevGridStates:{[key:string]:boolean[]} = {};

export const storeBingoGrid = defineStore('bingoGrid', {
	state: () => ({
		gridList: [] as TwitchatDataTypes.BingoGridConfig[],
		availableOverlayList: [],
		viewersBingoCount:{},
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

					prevGridStates[grid.id] = grid.entries.map(v=>v.check);
				})
			}

			/**
			 * Get notified when a grid overlay exists
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.BINGO_GRID_OVERLAY_PRESENCE, (event:TwitchatEvent<{bid:string}>)=>{
				const id = event.data!.bid;
				const ref = this.gridList.find(v => v.id == id);
				//Check if bingo exists
				if(!ref || !ref.enabled) return;

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
					this.toggleCell(grid.id, entry.id);
				}
			});

			/**
			 * Called when a user's bingo count changes on a grid
			 */
			SSEHelper.instance.addEventListener(SSEEvent.BINGO_GRID_BINGO_COUNT, async (event:SSEEvent<{gridId:string, uid:string, login:string, count:number}>)=>{
				if(!event.data) return;
				const user = await StoreProxy.users.getUserFrom("twitch", StoreProxy.auth.twitch.user.id, event.data.uid, event.data.login, event.data.login);
				if(!this.viewersBingoCount[event.data.gridId]) this.viewersBingoCount[event.data.gridId] = [];
				const list = this.viewersBingoCount[event.data.gridId];
				let entry = list.find(v=>v.user.id === user.id);
				if(!entry) {
					entry = { count:event.data.count, user };
					this.viewersBingoCount[event.data.gridId].push(entry);
				}

				entry.count = event.data.count;
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
				backgroundAlpha:0,
				backgroundColor:"#000000",
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
			prevGridStates[grid.id] = [];
			this.saveData(id);
		},

		resetLabels(id:string):void {
			const grid = this.gridList.find(g => g.id === id);
			if(!grid) return;
			const entries = grid.entries;
			for (let i = 0; i < entries.length; i++) {
				if(entries[i].lock) continue;
				entries[i].label = "";
			}
			this.saveData(id);
		},

		resetCheckStates(id:string, forcedState?:boolean):void {
			const grid = this.gridList.find(g => g.id === id);
			if(!grid) return;
			prevGridStates[grid.id] = [];
			grid.entries.forEach(entry => entry.check = forcedState == undefined? false : forcedState);
			this.saveData(id);

			const message:TwitchatDataTypes.MessageBingoGridData = {
				id:Utils.getUUID(),
				date:Date.now(),
				type:TwitchatDataTypes.TwitchatMessageType.BINGO_GRID,
				platform:"twitchat",
				bingoGridId:grid.id,
				bingoGridName:grid.title,
				channel_id:StoreProxy.auth.twitch.user.id,
				col:-1,
				row:-1,
				diagonal:-1,
				coords:{x:-1,y:-1},
				complete:false,
				reset:true,
			}
			StoreProxy.chat.addMessage(message);
			ApiHelper.call("bingogrid/untickAll", "POST", {gridid:grid.id});
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

		async saveData(gridId:string, cellId?:string):Promise<void> {
			const grid = this.gridList.find(g => g.id === gridId);
			if(!grid) return;

			grid.cols = Math.min(10, Math.max(2, grid.cols))
			grid.rows = Math.min(10, Math.max(2, grid.rows))

			const count = grid.cols*grid.rows;
			//TODO
			// if(count < grid.entries.length) {
			// 	try {
			// 		await StoreProxy.main.confirm("Reduce?", "You'll lose entries!");
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
			});

			//Check for new bingos
			const newStates = grid.entries.map(v=>v.check);
			const prevStates = prevGridStates[grid.id];
			let newVerticalBingos:number[] = [];
			let newHorizontalBingos:number[] = [];
			let newDiagonalBingos:number[] = [];
			if(prevStates) {
				let prevVerticalBingos:number[] = [];
				let prevHorizontalBingos:number[] = [];
				let prevDiagonalBingos:number[] = [];
				//Checking for vertical bingos
				for (let x = 0; x < grid.cols; x++) {
					let allTicked = true;
					for (let y = 0; y < grid.rows; y++) {
						allTicked &&= newStates[x + y*grid.cols];
					}
					if(allTicked) newVerticalBingos.push(x);
				}
				for (let x = 0; x < grid.cols; x++) {
					let allTicked = true;
					for (let y = 0; y < grid.rows; y++) {
						allTicked &&= prevStates[x + y*grid.cols];
					}
					if(allTicked) prevVerticalBingos.push(x);
				}
				//Checking for horizontal bingos
				for (let y = 0; y < grid.rows; y++) {
					let allTicked = true;
					for (let x = 0; x < grid.cols; x++) {
						allTicked &&= newStates[x + y*grid.cols];
					}
					if(allTicked) newHorizontalBingos.push(y);
				}
				for (let y = 0; y < grid.rows; y++) {
					let allTicked = true;
					for (let x = 0; x < grid.cols; x++) {
						allTicked &&= prevStates[x + y*grid.cols];
					}
					if(allTicked) prevHorizontalBingos.push(y);
				}

				//Checking for diagonal bingos
				if(grid.cols == grid.rows) {
					//Top left to bottom right
					let allTicked = true;
					for (let x = 0; x < grid.cols; x++) {
						allTicked &&= newStates[x + x*grid.cols];
					}
					if(allTicked) newDiagonalBingos.push(0);
					allTicked = true;
					for (let x = 0; x < grid.cols; x++) {
						allTicked &&= newStates[x + (grid.cols - 1 - x)*grid.cols];
					}
					if(allTicked) newDiagonalBingos.push(1);

					//Bottom left to top right
					allTicked = true;
					for (let x = 0; x < grid.cols; x++) {
						allTicked &&= prevStates[x + x*grid.cols];
					}
					if(allTicked) prevDiagonalBingos.push(0);
					allTicked = true;
					for (let x = 0; x < grid.cols; x++) {
						allTicked &&= prevStates[x + (grid.cols - 1 - x)*grid.cols];
					}
					if(allTicked) prevDiagonalBingos.push(1);
				}

				newVerticalBingos = newVerticalBingos.filter(index => prevVerticalBingos.indexOf(index) == -1);
				newHorizontalBingos = newHorizontalBingos.filter(index => prevHorizontalBingos.indexOf(index) == -1);
				newDiagonalBingos = newDiagonalBingos.filter(index => prevDiagonalBingos.indexOf(index) == -1);

				const buildMessage = ():TwitchatDataTypes.MessageBingoGridData => {
					let x = -1;
					let y = -1;
					if(cellId) {
						const index = grid.entries.findIndex(e => e.id == cellId);
						x = index%grid.cols;
						y = Math.floor(index/grid.cols);
					}
					return {
						id:Utils.getUUID(),
						date:Date.now(),
						type:TwitchatDataTypes.TwitchatMessageType.BINGO_GRID,
						platform:"twitchat",
						bingoGridId:grid.id,
						bingoGridName:grid.title,
						channel_id:StoreProxy.auth.twitch.user.id,
						col:-1,
						row:-1,
						diagonal:-1,
						coords:{x,y},
						complete:false,
						reset:false,
					}
				}
				newVerticalBingos.forEach(index => {
					const message = buildMessage();
					message.col = index;
					StoreProxy.chat.addMessage(message);
				});
				newHorizontalBingos.forEach(index => {
					const message = buildMessage();
					message.row = index;
					StoreProxy.chat.addMessage(message);
				});
				newDiagonalBingos.forEach(index => {
					const message = buildMessage();
					message.diagonal = index;
					StoreProxy.chat.addMessage(message);
				});

				//All cells ticked?
				if(grid.entries.filter(v=>v.check === true).length === grid.entries.length) {
					const message = buildMessage();
					message.complete = true;
					StoreProxy.chat.addMessage(message);
				}
				PublicAPI.instance.broadcast(TwitchatEvent.BINGO_GRID_PARAMETERS, {id:gridId, bingo:grid, newVerticalBingos, newHorizontalBingos,  newDiagonalBingos});
			}

			prevGridStates[grid.id] = newStates;

			if(!grid.enabled) {
				this.availableOverlayList = this.availableOverlayList.filter(v => v.id != grid.id);
			}

			const data:IStoreData = {
				gridList:this.gridList,
			};
			DataStore.set(DataStore.BINGO_GRIDS, data);
		},

		toggleCell(gridId:string, cellId:string, forcedState?:boolean):void {
			const grid = this.gridList.find(g => g.id === gridId);
			if(!grid || !grid.enabled) return;
			const cell = grid.entries.find(e => e.id === cellId);
			if(!cell) return;
			let prevState = cell.check;
			cell.check = forcedState == undefined? !cell.check : forcedState;
			if(cell.check != prevState) {
				ApiHelper.call("bingogrid/tickCell", "POST", {cellid:cell.id, state:cell.check, gridid:grid.id});
			}
			if(cell.check) {
				let x = -1;
				let y = -1;
				if(cellId) {
					const index = grid.entries.findIndex(e => e.id == cellId);
					x = index%grid.cols;
					y = Math.floor(index/grid.cols);
				}
				const message:TwitchatDataTypes.MessageBingoGridData = {
					id:Utils.getUUID(),
					date:Date.now(),
					type:TwitchatDataTypes.TwitchatMessageType.BINGO_GRID,
					platform:"twitchat",
					bingoGridId:grid.id,
					bingoGridName:grid.title,
					channel_id:StoreProxy.auth.twitch.user.id,
					col:-1,
					row:-1,
					diagonal:-1,
					coords:{x,y},
					complete:false,
					reset:false,
				}
				StoreProxy.chat.addMessage(message);
			}
			this.saveData(gridId, cellId);
		},

		async handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd:string):Promise<void> {
			for (let i = 0; i < this.gridList.length; i++) {
				const grid = this.gridList[i];
				//Check if it's a grid's command
				if(grid.enabled
				&& grid.chatCmd
				&& grid.chatCmd.toLowerCase() == cmd) {
					const allowed = await Utils.checkPermissions(grid.chatCmdPermissions, message.user, message.channel_id);
					// console.log("User allowed? ", allowed);
					if(!allowed) continue;

					const [xStrt, yStrt] = (message.message || "").toLowerCase().replace(cmd, "").trim().split(":");
					const x = (parseInt(xStrt) || 0)-1;
					const y = (parseInt(yStrt) || 0)-1;
					// console.log("Tick", x+1, y+1);
					if(x >= 0 && x < grid.cols
					&& y >= 0 && y < grid.rows){
						const cell = grid.entries[x+y*grid.cols];
						this.toggleCell(grid.id, cell.id);
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
