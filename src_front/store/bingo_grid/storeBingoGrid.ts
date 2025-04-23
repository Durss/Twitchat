import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IBingoGridActions, type IBingoGridGetters, type IBingoGridState, type IStore } from '../StoreProxy';
import Utils from '@/utils/Utils';
import DataStore from '../DataStore';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import ApiHelper from '@/utils/ApiHelper';
import SSEHelper from '@/utils/SSEHelper';
import SSEEvent from '@/events/SSEEvent';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import type { JsonObject } from 'type-fest';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import MessengerProxy from '@/messaging/MessengerProxy';

let saveCountPending:number = 0;
let debounceSave:number = -1;
let debounceShuffle:number = -1;
let debounceChatAnnounce:number = -1
let tickDebounce:{[key:string]:number} = {};
let chatAnnounceStack:{user:TwitchatDataTypes.TwitchatUser, count:number}[] = [];
let overlayCheckInterval:{[key:string]:number} = {};
//Keeps old check states of grid to be able to diff on save
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

				//Caching cells states
				this.gridList.forEach(grid => {
					prevGridStates[grid.id] = grid.entries.map(v=>v.check);
				})
			}

			/**
			 * Called when bingo grid overlay request for its configs
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_BINGO_GRID_PARAMETERS, (e:TwitchatEvent<{bid:string}>)=> {
				const bingo = StoreProxy.bingoGrid.gridList.find(v=>v.id == e.data!.bid);
				if(bingo) {
					if(!bingo.enabled) return;
					PublicAPI.instance.broadcast(TwitchatEvent.BINGO_GRID_PARAMETERS, {id:e.data!.bid, bingo:bingo as unknown as JsonObject, newVerticalBingos:[], newHorizontalBingos:[],  newDiagonalBingos:[]});
				}else{
					//Tell the overlay requested bingo couldn't be found
					PublicAPI.instance.broadcast(TwitchatEvent.BINGO_GRID_PARAMETERS, {id:e.data!.bid, bingo:null});
				}
			});

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
				overlayCheckInterval[id] = window.setTimeout(()=>{
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

				const user = await StoreProxy.users.getUserFrom("twitch", data.click.channelId, data.click.uid, data.click.login, undefined, undefined, undefined, false, undefined, false);

				//Ignore banned users (but not timed out ones)
				const chanInfo = user.channelInfo[StoreProxy.auth.twitch.user.id];
				if(chanInfo.is_banned && !chanInfo.banEndDate) return;

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
			SSEHelper.instance.addEventListener(SSEEvent.BINGO_GRID_BINGO_COUNT, async (event)=>{
				if(!event.data) return;
				if(event.data.count <= 0) return;
				const channelId = StoreProxy.auth.twitch.user.id;
				const user = await StoreProxy.users.getUserFrom("twitch", StoreProxy.auth.twitch.user.id, event.data.uid, event.data.login, event.data.login, undefined, undefined, false, undefined, false);

				//Ignore banned users (but not timed out ones)
				const chanInfo = user.channelInfo[channelId];
				if(chanInfo.is_banned && !chanInfo.banEndDate) return;

				//Force avatar loading if not available
				if(!user.avatarPath) {
					const [userDetails] = await TwitchUtils.getUserInfo([user.id]);
					if(userDetails) user.avatarPath = userDetails.profile_image_url;
				}
				if(!this.viewersBingoCount[event.data.gridId]) this.viewersBingoCount[event.data.gridId] = [];
				const list = this.viewersBingoCount[event.data.gridId];
				let entry = list.find(v=>v.user.id === user.id);
				let isNewBingo = false;
				if(!entry) {
					// console.log("No entry for "+user.login+". Create it");
					//User not yet registered, create it
					entry = { count:event.data.count, user };
					list.push(entry);
					isNewBingo = true;
				}else{
					// console.log("Update "+user.login+" from "+entry.count+" to "+event.data.count);
					isNewBingo = event.data.count > entry.count;
					//Keep higher bingo count between received one and local one
					entry.count = Math.max(entry.count, event.data.count);
				}

				//Sort viewers by bingo count
				const prevCount = this.viewersBingoCount[event.data.gridId].length;
				this.viewersBingoCount[event.data.gridId] = list.filter(v=>v.count > 0);
				//Force leaderboard close if there were bingos before and there are none now
				//In this case the "hide leaderboard" button is not accessible anymore on the
				//UI because the "leader board" section is only there when there is at least
				//one person on the leaderboar.
				if(this.viewersBingoCount[event.data.gridId].length == 0 && prevCount > 0) {
					this.hideLeaderboard(event.data.gridId);
				}

				//If there actually is a new bingo
				if(isNewBingo) {
					const grid = this.gridList.find(g => g.id == event.data!.gridId);

					//Execute triggers related this this kidn of event
					if(grid) {
						//Tell the overlay someone got a bingo if allowed to be displayed on overlay
						if(grid.overlayAnnouncement && await Utils.checkPermissions(grid.overlayAnnouncementPermissions, user, channelId)) {
							const data = {
								gridId:event.data.gridId,
								user:{
									name:user.displayNameOriginal,
									id:user.id,
									avatar:user.avatarPath || ""
								},
								count:entry.count
							};
							PublicAPI.instance.broadcast(TwitchatEvent.BINGO_GRID_OVERLAY_VIEWER_EVENT, data);
						}

						//Announce bingos on chat
						if(grid.chatAnnouncementEnabled) {
							chatAnnounceStack.push({
								user,
								count:entry.count,
							})
							//Stack bingos for 5s before announcing them on tchat to avoid spam
							clearTimeout(debounceChatAnnounce);
							debounceChatAnnounce = window.setTimeout(()=> {
								//Dedupe entries, only keep the last registered ones for each user
								//which should be the highest one
								const userDone:{[uid:string]:boolean} = {};
								for (let i = chatAnnounceStack.length-1; i > -1; i--) {
									const entry = chatAnnounceStack[i];
									if(userDone[entry.user.id] === true) {
										chatAnnounceStack.splice(i, 1);
										continue;
									}
									userDone[entry.user.id] = true;
								}

								//Send messages.
								let minLength = grid.chatAnnouncement.replace(/\{WINNERS\}/gi, "").trim().length;
								while(chatAnnounceStack.length > 0) {
									let chunks = [];
									let messageLength = minLength;
									let prefix = "";
									//Make sure to split users so messages are not longer than 500 chars
									for (let i = 0; i < chatAnnounceStack.length; i++) {
										let message = prefix;
										message += chatAnnounceStack[0].user.displayNameOriginal+" (x"+chatAnnounceStack[0].count+")";
										messageLength += message.length;
										if(messageLength < 500) {
											i--;
											chunks.push(message);
											chatAnnounceStack.shift();
										}else{
											break;
										}
										prefix = " ▬ ";
									}
									const message = grid.chatAnnouncement.replace(/\{WINNERS\}/gi, chunks.join(""));
									MessengerProxy.instance.sendMessage(message);
								}
							}, 7000);
						}

						const message:TwitchatDataTypes.MessageBingoGridViewerData = {
							id:Utils.getUUID(),
							date:Date.now(),
							type:TwitchatDataTypes.TwitchatMessageType.BINGO_GRID_VIEWER,
							platform:"twitch",
							channel_id:StoreProxy.auth.twitch.user.id,
							bingoGridId:grid.id,
							bingoGridName:grid.title,
							bingoCount:entry.count,
							user,
						};
						TriggerActionHandler.instance.execute(message);
					}
				}
			});

			/**
			 * Called when a a mod ticks cells
			 */
			SSEHelper.instance.addEventListener(SSEEvent.BINGO_GRID_MODERATOR_TICK, async (event)=>{
				const eventData = event.data;
				if(!eventData) return;
				const grid = this.gridList.find(v=>v.id == eventData.gridId);
				if(!grid) return;

				for (const cellId in eventData.states) {
					let entry = grid.entries.find(v=>v.id==cellId);
					if(!entry && grid.additionalEntries) entry = grid.additionalEntries.find(v=>v.id==cellId);
					if(!entry) continue
					entry.check = eventData.states[cellId];
				}
				this.saveData(grid.id);
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
				winSoundVolume:100,
				textSize:20,
				cols:5,
				rows:5,
				entries:[],
				backgroundAlpha:0,
				backgroundColor:"#000000",
				autoShowHide:false,
				chatAnnouncement:StoreProxy.i18n.t("bingo_grid.form.param_chatAnnouncement_default"),
				overlayAnnouncement:true,
				chatAnnouncementEnabled:true,
				overlayAnnouncementPermissions:Utils.getDefaultPermissions(),
				chatCmdPermissions:Utils.getDefaultPermissions(true, true, false, false, false, false),
				heatClickPermissions:Utils.getDefaultPermissions(true, true, false, false, false, false),
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
				this.saveData();
			}).catch(()=>{})
		},

		shuffleGrid(id:string):void {
			const grid = this.gridList.find(g => g.id === id);
			if(!grid) return;

			this.resetCheckStates(id, undefined, false);

			//Randomly switch main entries with additional entries
			if(grid.additionalEntries && grid.additionalEntries.length > 0) {
				for (let i = 0; i < grid.entries.length; i++) {
					const entry = grid.entries[i];
					//Don't switch locked cells
					if(entry.lock) continue;
					if(Math.random() > .4) {
						const index = Math.floor(Math.random() * grid.additionalEntries.length);
						grid.entries.splice(i, 1, grid.additionalEntries[index]);
						grid.additionalEntries[index] = entry;
					}
				}
			}

			//Shuffle entries
			const entries = grid.entries;
			for (let i = entries.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				if(entries[i].lock || entries[j].lock) continue;
				[entries[i], entries[j]] = [entries[j], entries[i]];
			}

			clearTimeout(debounceShuffle);
			debounceShuffle = window.setTimeout(() => {
				this.saveData(id, undefined, false);
				if(StoreProxy.auth.isPremium) {
					ApiHelper.call("bingogrid/shuffle", "POST", {gridid:grid.id, grid, uid:StoreProxy.auth.twitch.user.id}, true, 2);
				}
			}, 600);
		},

		resetLabels(id:string):void {
			StoreProxy.main.confirm(
				StoreProxy.i18n.t("bingo_grid.form.clear_labels_confirm.title"),
				StoreProxy.i18n.t("bingo_grid.form.clear_labels_confirm.description"),
			).then(()=>{
				const grid = this.gridList.find(g => g.id === id);
				if(!grid) return;
				const entries = grid.entries;
				for (let i = 0; i < entries.length; i++) {
					if(entries[i].lock) continue;
					entries[i].label = "";
				}
				this.saveData(id);
			}).catch(()=>{})
		},

		resetCheckStates(id:string, forcedState?:boolean, callEndpoint:boolean = true):void {
			const grid = this.gridList.find(g => g.id === id);
			if(!grid) return;
			//Reset diff array
			prevGridStates[grid.id] = [];
			//Reset viewers bingo counts
			this.viewersBingoCount[grid.id] = [];
			grid.entries.forEach(entry => entry.check = forcedState == undefined? false : forcedState);
			if(grid.additionalEntries) grid.additionalEntries.forEach(entry => entry.check = forcedState == undefined? false : forcedState);
			this.saveData(id);

			const message:TwitchatDataTypes.MessageBingoGridData = {
				id:Utils.getUUID(),
				date:Date.now(),
				type:TwitchatDataTypes.TwitchatMessageType.BINGO_GRID,
				platform:"twitchat",
				bingoGridId:grid.id,
				bingoGridName:grid.title,
				channel_id:StoreProxy.auth.twitch.user.id,
				user:StoreProxy.auth.twitch.user,
				colIndex:-1,
				rowIndex:-1,
				diagonal:-1,
				coords:{x:-1,y:-1},
				cellLabel:"",
				complete:false,
				reset:true,
			}
			StoreProxy.chat.addMessage(message);
			const states:{[cellId:string]:boolean} = {};
			grid.entries.forEach(v=> states[v.id] = v.check);
			if(grid.additionalEntries) grid.additionalEntries.forEach(v=> states[v.id] = v.check);
			if(StoreProxy.auth.isPremium && callEndpoint) ApiHelper.call("bingogrid/tickStates", "POST", {states, gridid:grid.id});
		},

		duplicateGrid(id:string):void {
			const source = this.gridList.find(g => g.id === id);
			if(!source) return;
			const clone = JSON.parse(JSON.stringify(source)) as typeof source;
			clone.id = Utils.getUUID();
			clone.entries.forEach(v=> {
				v.id = Utils.getUUID();
				v.check = false;
			});
			if(clone.additionalEntries) {
				clone.additionalEntries.forEach(v=> {
					v.id = Utils.getUUID();
					v.check = false;
				});
			}
			this.gridList.push(clone)
			this.saveData(id);
		},

		async saveData(gridId?:string, cellId?:string, broadcastToViewers:boolean = false):Promise<void> {
			if(++saveCountPending != 20) clearTimeout(debounceSave);
			debounceSave = window.setTimeout(() => {
				saveCountPending = 0;
				const grid = this.gridList.find(g => g.id === gridId);
				if(gridId && grid) {
					grid.cols = Math.min(10, Math.max(2, grid.cols))
					grid.rows = Math.min(10, Math.max(2, grid.rows))

					const count = grid.cols*grid.rows;
					//Remove useless items
					const newEntries = grid.entries.splice(0, count);
					const oldEntries = grid.entries.concat().filter(v=>v.label.trim().length > 0);
					grid.entries = newEntries;

					//If entries are gonna get lost, put them in the additional cells
					if(oldEntries.length > 0) {
						if(!grid.additionalEntries) grid.additionalEntries = [];
						grid.additionalEntries.push(...oldEntries);
					}

					//Add missing items
					while(grid.entries.length < count) {
						//Pick from additional cells if any
						if(grid.additionalEntries && grid.additionalEntries.length > 0) {
							grid.entries.push(grid.additionalEntries.shift()!);
						}else{
							grid.entries.push({
								id:Utils.getUUID(),
								label:"",
								lock:false,
								check:false,
							});
						}
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
							let label = "";
							if(cellId) {
								const index = grid.entries.findIndex(e => e.id == cellId);
								x = index%grid.cols;
								y = Math.floor(index/grid.cols);
								label = grid.entries[index].label;
							}
							return {
								id:Utils.getUUID(),
								date:Date.now(),
								type:TwitchatDataTypes.TwitchatMessageType.BINGO_GRID,
								platform:"twitchat",
								bingoGridId:grid.id,
								bingoGridName:grid.title,
								channel_id:StoreProxy.auth.twitch.user.id,
								colIndex:-1,
								rowIndex:-1,
								diagonal:-1,
								coords:{x,y},
								cellLabel:label,
								complete:false,
								reset:false,
								user:StoreProxy.auth.twitch.user,
							}
						}
						newVerticalBingos.forEach(index => {
							const message = buildMessage();
							message.col = index;
							StoreProxy.chat.addMessage(message);
						});
						newHorizontalBingos.forEach(index => {
							const message = buildMessage();
							message.rowIndex = index;
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

					if(StoreProxy.auth.isPremium && broadcastToViewers) {
						//Debounce this call as it will fire an event to every connected viewer
						ApiHelper.call("bingogrid", "PUT", {
							gridid:grid.id,
							grid:{
								cols:grid.cols,
								rows:grid.rows,
								title:grid.title,
								entries:grid.entries,
								enabled:grid.enabled,
								additionalEntries:grid.additionalEntries,
							}
						});
					}
				}

				const data:IStoreData = {
					gridList:this.gridList,
				};
				DataStore.set(DataStore.BINGO_GRIDS, data);
			}, 500);
		},

		toggleCell(gridId:string, cellId:string, forcedState?:boolean):void {
			const grid = this.gridList.find(g => g.id === gridId);
			if(!grid || !grid.enabled) return;
			let cell = grid.entries.find(e => e.id === cellId);
			if(!cell && grid.additionalEntries) cell = grid.additionalEntries.find(e => e.id === cellId);
			if(!cell) return;
			let prevState = cell.check;
			cell.check = forcedState == undefined? !cell.check : forcedState;
			if(cell.check != prevState) {
				//Debounce avoids spamming viewers
				clearTimeout(tickDebounce[gridId]);
				tickDebounce[gridId] = window.setTimeout(() => {
					const states:{[cellId:string]:boolean} = {};
					grid.entries.forEach(v=> states[v.id] = v.check);
					if(grid.additionalEntries) grid.additionalEntries.forEach(v=> states[v.id] = v.check);
					if(StoreProxy.auth.isPremium) ApiHelper.call("bingogrid/tickStates", "POST", {states, gridid:grid.id});
				}, 1000);
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
					colIndex:-1,
					rowIndex:-1,
					diagonal:-1,
					coords:{x,y},
					cellLabel:cell.label,
					complete:false,
					reset:false,
					user:StoreProxy.auth.twitch.user,
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
		},

		addCustomCell(gridId:string):void {
			const grid = this.gridList.find(g => g.id === gridId);
			if(!grid) return;
			if(!grid.additionalEntries) grid.additionalEntries = [];

			grid.additionalEntries.push({
				id:Utils.getUUID(),
				check:false,
				label:"",
				lock:false,
			})
		},

		removeCustomCell(gridId:string, cellId:string):void {
			const grid = this.gridList.find(g => g.id === gridId);
			if(!grid || !grid.additionalEntries) return;
			grid.additionalEntries = grid.additionalEntries.filter(e => e.id != cellId);
		},

		showLeaderboard(gridId:string):void {
			const viewers = this.viewersBingoCount[gridId];
			if(!viewers || !viewers.length) return;
			//Add fake users
			// for (let i = 0; i < 15; i++) {
			// 	viewers.push({
			// 		count:Math.round(Math.random()*10+1),
			// 		user:Utils.pickRand(StoreProxy.users.users),
			// 	});
			// }
			const data = {
				gridId,
				scores:viewers.sort((a,b)=> {
					if(b.count == a.count) {
						return a.user.displayNameOriginal.toLowerCase().localeCompare(b.user.displayNameOriginal.toLowerCase())
					}
					return b.count-a.count;
				}).map(v=>{
					return {
						user_name:v.user.displayNameOriginal,
						user_pic:v.user.avatarPath,
						score:v.count,
						pos:0,
					}
				})
			}
			let pos = -1;
			let virtualPos = -1;
			let prevScore = -1;
			data.scores.forEach(s=>{
				virtualPos ++;
				if(prevScore != s.score) pos = virtualPos;
				s.pos = pos;
				prevScore = s.score;
			})
			PublicAPI.instance.broadcast(TwitchatEvent.BINGO_GRID_OVERLAY_LEADER_BOARD, data as unknown as JsonObject);
		},

		hideLeaderboard(gridId:string):void {
			const data = {gridId};
			PublicAPI.instance.broadcast(TwitchatEvent.BINGO_GRID_OVERLAY_LEADER_BOARD, data as unknown as JsonObject);
		},

	} as IBingoGridActions
	& ThisType<IBingoGridActions
		& UnwrapRef<IBingoGridState>
		& _StoreWithState<"bingoGrid", IBingoGridState, IBingoGridGetters, IBingoGridActions>
		& _StoreWithGetters<IBingoGridGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeBingoGrid, import.meta.hot))
}

interface IStoreData {
	gridList:TwitchatDataTypes.BingoGridConfig[];
}
