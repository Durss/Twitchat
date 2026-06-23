import type { StoreActions } from "@/types/pinia-helpers";
import SSEEvent from "@/events/SSEEvent";
import MessengerProxy from "@/messaging/MessengerProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import PublicAPI from "@/utils/PublicAPI";
import SSEHelper from "@/utils/SSEHelper";
import { toast } from "@/utils/toast/toast";
import ToastBingoGridShare from "@/utils/toast/ToastBingoGridShare.vue";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import { acceptHMRUpdate, defineStore } from "pinia";
import DataStore from "../DataStore";
import StoreProxy, {
	type IBingoGridActions,
	type IBingoGridGetters,
	type IBingoGridState,
} from "../StoreProxy";

let saveCountPending: number = 0;
let debounceSave: number = -1;
let debounceShuffle: number = -1;
let debounceBroadcast: number = -1;
let debounceChatAnnounce: number = -1;
let tickDebounce: { [key: string]: number } = {};
let chatAnnounceStack: { user: TwitchatDataTypes.TwitchatUser; count: number }[] = [];
//Keeps old check states of grid to be able to diff on save
let prevGridStates: { [key: string]: boolean[] } = {};

/**
 * Applies an owner-sourced grid snapshot onto a local (remote/linked) grid,
 * preserving the ephemeral remote* fields.
 */
function applyRemoteSnapshot(
	grid: TwitchatDataTypes.BingoGridConfig,
	snap: {
		enabled: boolean;
		title: string;
		cols: number;
		rows: number;
		entries: TwitchatDataTypes.BingoGridConfig["entries"];
		additionalEntries?: TwitchatDataTypes.BingoGridConfig["entries"];
	},
): void {
	grid.title = snap.title;
	grid.cols = snap.cols;
	grid.rows = snap.rows;
	grid.entries = snap.entries;
	grid.additionalEntries = snap.additionalEntries;
	grid.enabled = snap.enabled;
}

export const storeBingoGrid = defineStore("bingoGrid", {
	state: (): IBingoGridState => ({
		gridList: [],
		viewersBingoCount: [],
		controlerModeCache: {},
	}),

	actions: {
		/**
		 * Populates store from DataStorage
		 */
		populateData(): void {
			const json = DataStore.get(DataStore.BINGO_GRIDS);
			if (json) {
				const data = JSON.parse(json) as IStoreData;
				this.gridList = data.gridList || [];

				//Caching cells states
				this.gridList.forEach((grid) => {
					prevGridStates[grid.id] = grid.entries.filter((v) => !!v).map((v) => v.check);
					// Deduplicate entries based on their id
					const uniqueEntries = new Map<
						string,
						TwitchatDataTypes.BingoGridConfig["entries"][number]
					>();
					grid.entries.forEach((entry) => {
						if (entry && !uniqueEntries.has(entry.id)) {
							uniqueEntries.set(entry.id, entry);
						} else {
							console.warn("Duplicate entry found in bingo grid", entry);
						}
					});
					grid.entries = Array.from(uniqueEntries.values());
				});
			}

			// Make sure any linked grid is cleared
			try {
				void ApiHelper.call("bingogrid/share/reset", "POST", undefined, false);
			} catch (_error) {
				// ignore
			}

			/**
			 * Called when bingo grid overlay request for its configs
			 */
			PublicAPI.instance.addEventListener("GET_BINGO_GRID_CONFIGS", (_event) => {
				const bingo = StoreProxy.bingoGrid.gridList.find((v) => v.enabled);
				if (bingo) {
					if (!bingo.enabled) return;
					PublicAPI.instance.broadcast("ON_BINGO_GRID_CONFIGS", {
						bingo,
						newVerticalBingos: [],
						newHorizontalBingos: [],
						newDiagonalBingos: [],
					});
				} else {
					//Tell the overlay requested bingo couldn't be found
					PublicAPI.instance.broadcast("ON_BINGO_GRID_CONFIGS", {
						bingo: null,
					});
				}
			});

			/**
			 * Get notified when a grid overlay exists
			 */
			PublicAPI.instance.addEventListener("SET_BINGO_GRID_OVERLAY_PRESENCE", (_event) => {
				// Don't care anymore
			});

			/**
			 * Relay to set grid visibility from Stream Deck socket
			 */
			PublicAPI.instance.addEventListener(
				"SET_BINGO_GRID_VISIBILITY_FROM_SD",
				async (event) => {
					if (!event.data) return;
					PublicAPI.instance.broadcast("SET_BINGO_GRID_VISIBILITY", event.data);
				},
			);

			/**
			 * Called when a user's bingo count changes on a grid
			 */
			SSEHelper.instance.addEventListener(SSEEvent.BINGO_GRID_BINGO_COUNT, async (event) => {
				if (!event.data) return;
				if (event.data.count <= 0) return;
				const channelId = StoreProxy.auth.twitch.user.id;
				const isAnon = event.data.isAnon === true;
				const name = isAnon ? Utils.getNameFromOpaqueId(event.data.uid) : event.data.login;
				const user = StoreProxy.users.getUserFrom(
					isAnon ? "twitchat" : "twitch",
					StoreProxy.auth.twitch.user.id,
					event.data.uid,
					name,
					name,
					undefined,
					undefined,
					false,
					undefined,
					false,
				);
				user.anonymous = event.data.isAnon;

				//Ignore banned users (but not timed out ones)
				const chanInfo = user.channelInfo[channelId]!;
				if (chanInfo.is_banned && !chanInfo.banEndDate) return;

				//Force avatar loading if not available
				if (!user.avatarPath) {
					const [userDetails] = await TwitchUtils.getUserInfo([user.id]);
					if (userDetails) user.avatarPath = userDetails.profile_image_url;
				}
				const list = this.viewersBingoCount!;
				let entry = list.find((v) => v.user.id === user.id);
				let isNewBingo = false;
				if (!entry) {
					// console.log("No entry for "+user.login+". Create it");
					//User not yet registered, create it
					entry = { count: event.data.count, user };
					list.push(entry);
					isNewBingo = true;
				} else {
					// console.log("Update "+user.login+" from "+entry.count+" to "+event.data.count);
					isNewBingo = event.data.count > entry.count;
					//Keep higher bingo count between received one and local one
					entry.count = Math.max(entry.count, event.data.count);
				}

				//Sort viewers by bingo count
				const prevCount = this.viewersBingoCount.length;
				this.viewersBingoCount = list.filter((v) => v.count > 0);
				//Force leaderboard close if there were bingos before and there are none now
				//In this case the "hide leaderboard" button is not accessible anymore on the
				//UI because the "leader board" section is only there when there is at least
				//one person on the leaderboar.
				if (this.viewersBingoCount.length == 0 && prevCount > 0) {
					this.hideLeaderboard();
				}

				//If there actually is a new bingo
				if (isNewBingo) {
					const grid = this.gridList.find((g) => g.id == event.data!.gridId);

					//Execute triggers related this this kidn of event
					if (grid) {
						//Tell the overlay someone got a bingo if allowed to be displayed on overlay
						if (
							grid.overlayAnnouncement &&
							(await Utils.checkPermissions(
								grid.overlayAnnouncementPermissions,
								user,
								channelId,
							))
						) {
							const data = {
								user: {
									name: user.displayNameOriginal,
									id: user.id,
									avatar: user.avatarPath || "",
								},
								count: entry.count,
							};
							PublicAPI.instance.broadcast("ON_BINGO_GRID_VIEWER_EVENT", data);
						}

						//Announce bingos on chat
						if (grid.chatAnnouncementEnabled) {
							chatAnnounceStack.push({
								user,
								count: entry.count,
							});
							//Stack bingos for 5s before announcing them on tchat to avoid spam
							clearTimeout(debounceChatAnnounce);
							debounceChatAnnounce = window.setTimeout(() => {
								//Dedupe entries, only keep the last registered ones for each user
								//which should be the highest one
								const userDone: { [uid: string]: boolean } = {};
								for (let i = chatAnnounceStack.length - 1; i > -1; i--) {
									const entry = chatAnnounceStack[i]!;
									if (userDone[entry.user.id] === true) {
										chatAnnounceStack.splice(i, 1);
										continue;
									}
									userDone[entry.user.id] = true;
								}

								//Send messages.
								let minLength = grid.chatAnnouncement
									.replace(/\{WINNERS\}/gi, "")
									.trim().length;
								while (chatAnnounceStack.length > 0) {
									let chunks = [];
									let messageLength = minLength;
									let prefix = "";
									//Make sure to split users so messages are not longer than 500 chars
									for (let i = 0; i < chatAnnounceStack.length; i++) {
										let message = prefix;
										message +=
											chatAnnounceStack[0]!.user.displayNameOriginal +
											" (x" +
											chatAnnounceStack[0]!.count +
											")";
										messageLength += message.length;
										if (messageLength < 500) {
											i--;
											chunks.push(message);
											chatAnnounceStack.shift();
										} else {
											break;
										}
										prefix = " ▬ ";
									}
									const message = grid.chatAnnouncement.replace(
										/\{WINNERS\}/gi,
										chunks.join(""),
									);
									MessengerProxy.instance.sendMessage(message);
								}
							}, 7000);
						}

						const message: TwitchatDataTypes.MessageBingoGridViewerData = {
							id: Utils.getUUID(),
							date: Date.now(),
							type: TwitchatDataTypes.TwitchatMessageType.BINGO_GRID_VIEWER,
							platform: "twitch",
							channel_id: StoreProxy.auth.twitch.user.id,
							bingoGridId: grid.id,
							bingoGridName: grid.title,
							bingoCount: entry.count,
							user,
						};
						void TriggerActionHandler.instance.execute(message);
					}
				}
			});

			/**
			 * Called when a a mod ticks cells
			 */
			SSEHelper.instance.addEventListener(
				SSEEvent.BINGO_GRID_MODERATOR_TICK,
				async (event) => {
					const eventData = event.data;
					if (!eventData) return;
					const grid = this.gridList.find((v) => v.id == eventData.gridId);
					if (!grid) return;

					for (const cellId in eventData.states) {
						let entry = grid.entries.filter((v) => !!v).find((v) => v.id == cellId);
						if (!entry && grid.additionalEntries)
							entry = grid.additionalEntries.find((v) => v.id == cellId);
						if (!entry) continue;
						entry.check = eventData.states[cellId]!;
					}
					void this.saveData(grid.id);
				},
			);

			/**
			 * Called when another streamer invites us to one of their bingo grids
			 */
			SSEHelper.instance.addEventListener(SSEEvent.BINGO_GRID_SHARE_INVITE, (event) => {
				if (!event.data) return;
				toast(ToastBingoGridShare, {
					autoClose: false,
					closeOnClick: false,
					contentProps: {
						token: event.data.token,
						ownerName: event.data.ownerName,
						gridTitle: event.data.gridTitle,
					},
				});
			});

			/**
			 * Called when a streamer we shared a grid with accepts the invite
			 */
			SSEHelper.instance.addEventListener(SSEEvent.BINGO_GRID_SHARE_ACCEPTED, (event) => {
				if (!event.data) return;
				toast(
					StoreProxy.i18n.t("bingo_grid.share_streamer.accepted", {
						USER: event.data.receiverName,
					}),
					{ type: "success", autoClose: 4000 },
				);
			});

			/**
			 * Called when the owner disabled/deleted a grid we were linked to.
			 * The backend already cleaned up: just drop the grid locally.
			 */
			SSEHelper.instance.addEventListener(SSEEvent.BINGO_GRID_SHARE_REVOKED, (event) => {
				if (!event.data) return;
				const { ownerId, gridId } = event.data;
				const grid = this.gridList.find(
					(g) => g.remoteOwnerId == ownerId && g.id == gridId,
				);
				if (!grid) return;
				this.gridList = this.gridList.filter((g) => g.id != gridId);
				//Clear the overlay if it was showing this grid
				PublicAPI.instance.broadcast("ON_BINGO_GRID_CONFIGS", { bingo: null });
				void this.saveData();
				toast(
					StoreProxy.i18n.t("bingo_grid.share_streamer.revoked", {
						OWNER: grid.remoteOwnerName,
					}),
					{ type: "warning", autoClose: 5000 },
				);
			});

			/**
			 * Re-arm shared-grid live push after an SSE (re)connect, and reconcile
			 * the linked grids with the owner's current state.
			 */
			SSEHelper.instance.addEventListener(SSEEvent.ON_CONNECT, async () => {
				for (const grid of this.gridList) {
					if (!grid.remoteOwnerId || !grid.remoteToken) continue;
					try {
						const res = await ApiHelper.call(
							"bingogrid/share/subscribe",
							"POST",
							{ linkToken: grid.remoteToken },
							false,
						);
						if (res.json.success && res.json.grid) {
							applyRemoteSnapshot(grid, res.json.grid);
							void this.saveData(grid.id);
						}
					} catch (_error) {
						// ignore, will retry on next reconnect
					}
				}
			});

			/**
			 * Owner's structure changes (shuffle/resize/relabel/enable) reach us as
			 * a BINGO_GRID_UPDATE. Only act on our linked (remote) grids.
			 */
			SSEHelper.instance.addEventListener(SSEEvent.BINGO_GRID_UPDATE, async (event) => {
				const data = event.data;
				if (!data) return;
				if (data.force === false) {
					//A card was pushed (e.g. relabel): apply it to the linked grid.
					const incoming = data.grid;
					const grid = this.gridList.find((g) => g.remoteOwnerId && g.id == incoming.id);
					if (!grid) return;
					applyRemoteSnapshot(grid, incoming);
					void this.saveData(grid.id);
				} else {
					//Owner reshuffled/rebuilt the grid: re-fetch our own randomized card.
					for (const grid of this.gridList) {
						if (!grid.remoteOwnerId || !grid.remoteToken) continue;
						try {
							const res = await ApiHelper.call(
								"bingogrid/share/subscribe",
								"POST",
								{ linkToken: grid.remoteToken },
								false,
							);
							if (res.json.success && res.json.grid) {
								applyRemoteSnapshot(grid, res.json.grid);
								void this.saveData(grid.id);
							}
						} catch (_error) {
							// ignore
						}
					}
				}
			});
		},

		addGrid(): TwitchatDataTypes.BingoGridConfig {
			const data: TwitchatDataTypes.BingoGridConfig = {
				id: Utils.getUUID(),
				title: "",
				textColor: "#000000",
				enabled: true,
				showGrid: true,
				winSoundVolume: 100,
				textSize: 20,
				cols: 5,
				rows: 5,
				entries: [],
				backgroundAlpha: 0,
				backgroundColor: "#000000",
				autoShowHide: false,
				chatAnnouncementEnabled: true,
				chatAnnouncement: StoreProxy.i18n.t(
					"bingo_grid.form.param_chatAnnouncement_default",
				),
				overlayAnnouncement: true,
				overlayAnnouncementPermissions: Utils.getDefaultPermissions(),
				chatCmd: undefined,
				chatCmdPermissions: Utils.getDefaultPermissions(
					true,
					true,
					false,
					false,
					false,
					false,
				),
				heatClick: false,
				heatClickPermissions: Utils.getDefaultPermissions(
					true,
					true,
					false,
					false,
					false,
					false,
				),
			};
			const len = data.cols * data.rows;
			for (let i = 0; i < len; i++) {
				data.entries.push({
					id: Utils.getUUID(),
					label: "",
					lock: Math.floor(len / 2) == i,
					check: false,
				});
			}
			this.gridList.push(data);
			void this.saveData(data.id);
			return data;
		},

		removeGrid(id: string): void {
			const t = StoreProxy.i18n.t;
			StoreProxy.main
				.confirm(
					t("bingo_grid.form.delete_confirm.title"),
					t("bingo_grid.form.delete_confirm.description"),
				)
				.then(() => {
					this.gridList = this.gridList.filter((g) => g.id !== id);
					void this.saveData();
					void ApiHelper.call("bingogrid", "DELETE", { gridId: id });
				})
				.catch(() => {});
		},

		async shuffleGrid(id: string): Promise<void> {
			const grid = this.gridList.find((g) => g.id === id);
			if (!grid) return;

			await this.resetCheckStates(id, undefined, false);

			//Randomly switch main entries with additional entries
			if (grid.additionalEntries && grid.additionalEntries.length > 0) {
				for (let i = 0; i < grid.entries.length; i++) {
					const entry = grid.entries[i]!;
					//Don't switch locked cells
					if (entry.lock) continue;
					if (Math.random() > 0.4) {
						const index = Math.floor(Math.random() * grid.additionalEntries.length);
						grid.entries.splice(i, 1, grid.additionalEntries[index]!);
						grid.additionalEntries[index] = entry;
					}
				}
			}

			//Shuffle entries
			const entries = grid.entries.filter((v) => !!v);
			for (let i = entries.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				if (entries[i]!.lock || entries[j]!.lock) continue;
				[entries[i]!, entries[j]!] = [entries[j]!, entries[i]!];
			}
			grid.entries = entries;

			clearTimeout(debounceShuffle);
			return new Promise<void>((resolve) => {
				debounceShuffle = window.setTimeout(async () => {
					void this.saveData(id, undefined, false);
					if (StoreProxy.auth.isPremium) {
						await ApiHelper.call(
							"bingogrid/shuffle",
							"POST",
							{ gridid: grid.id, grid, uid: StoreProxy.auth.twitch.user.id },
							true,
							2,
						);
					}
					resolve();
				}, 600);
			});
		},

		resetLabels(gridId: string): void {
			StoreProxy.main
				.confirm(
					StoreProxy.i18n.t("bingo_grid.form.clear_labels_confirm.title"),
					StoreProxy.i18n.t("bingo_grid.form.clear_labels_confirm.description"),
				)
				.then(() => {
					const grid = this.gridList.find((g) => g.id === gridId);
					if (!grid) return;
					const entries = grid.entries.filter((v) => !!v);
					for (const entry of entries) {
						if (entry.lock) continue;
						entry.label = "";
					}
					void this.saveData(gridId);
				})
				.catch(() => {});
		},

		async resetCheckStates(
			id: string,
			forcedState?: boolean,
			callEndpoint: boolean = true,
			callSaveEndpoint: boolean = true,
		): Promise<void> {
			const grid = this.gridList.find((g) => g.id === id);
			if (!grid) return;
			//Reset diff array
			prevGridStates[grid.id] = [];
			//Reset viewers bingo counts
			this.viewersBingoCount = [];
			grid.entries.forEach(
				(entry) => (entry.check = forcedState == undefined ? false : forcedState),
			);
			if (grid.additionalEntries)
				grid.additionalEntries.forEach(
					(entry) => (entry.check = forcedState == undefined ? false : forcedState),
				);
			if (callSaveEndpoint) void this.saveData(id);

			const message: TwitchatDataTypes.MessageBingoGridData = {
				id: Utils.getUUID(),
				date: Date.now(),
				type: TwitchatDataTypes.TwitchatMessageType.BINGO_GRID,
				platform: "twitchat",
				bingoGridId: grid.id,
				bingoGridName: grid.title,
				channel_id: StoreProxy.auth.twitch.user.id,
				user: StoreProxy.auth.twitch.user,
				colIndex: -1,
				rowIndex: -1,
				diagonal: -1,
				coords: { x: -1, y: -1 },
				cellLabel: "",
				complete: false,
				reset: true,
			};
			void StoreProxy.chat.addMessage(message);
			const states: { [cellId: string]: boolean } = {};
			grid.entries.forEach((v) => (states[v.id] = v.check));
			if (grid.additionalEntries)
				grid.additionalEntries.forEach((v) => (states[v.id] = v.check));
			if (StoreProxy.auth.isPremium && callEndpoint)
				await ApiHelper.call("bingogrid/tickStates", "POST", { states, gridid: grid.id });
		},

		duplicateGrid(id: string): void {
			const source = this.gridList.find((g) => g.id === id);
			if (!source) return;
			const clone = JSON.parse(JSON.stringify(source)) as typeof source;
			clone.id = Utils.getUUID();
			clone.entries.forEach((v) => {
				v.id = Utils.getUUID();
				v.check = false;
			});
			if (clone.additionalEntries) {
				clone.additionalEntries.forEach((v) => {
					v.id = Utils.getUUID();
					v.check = false;
				});
			}
			this.gridList.push(clone);
			void this.saveData(id);
		},

		async saveData(
			gridId?: string,
			cellId?: string,
			broadcastToViewers: boolean = false,
			confirmDisable: boolean = true,
		): Promise<void> {
			const targetGrid = gridId ? this.gridList.find((g) => g.id === gridId) : undefined;

			// Are we saving a specific grid that's enabled?
			if (targetGrid && targetGrid.enabled) {
				// Enabling one of our OWN grids while a shared (remote) grid is
				// active drops the shared link. Warn before proceeding.
				if (!targetGrid.remoteOwnerId) {
					const linkedGrid = this.gridList.find(
						(g) => g.remoteOwnerId && g.enabled && g.id !== gridId,
					);
					if (linkedGrid) {
						const t = StoreProxy.i18n.t;
						try {
							await StoreProxy.main.confirm(
								t("bingo_grid.share_streamer.lose_link.title"),
								t("bingo_grid.share_streamer.lose_link.description", {
									NAME: linkedGrid.remoteOwnerName || "",
								}),
							);
						} catch (_error) {
							// User cancelled, keep the link and disable the grid back
							targetGrid.enabled = false;
							return;
						}
						const linkToken = linkedGrid.remoteToken;
						this.gridList = this.gridList.filter((g) => g.id !== linkedGrid.id);
						if (linkToken) {
							void ApiHelper.call(
								"bingogrid/share/unlink",
								"POST",
								{ linkToken },
								false,
							);
						}
					}
				}

				const otherActiveGrid = this.gridList.filter(
					(g) => g.enabled && g.id !== gridId && g.entries.some((e) => e.check === true),
				)[0];
				// Are we about to lose live grid progress?
				if (otherActiveGrid && confirmDisable) {
					const t = StoreProxy.i18n.t;
					try {
						await StoreProxy.main.confirm(
							t("bingo_grid.form.lost_progress_warning.title"),
							t("bingo_grid.form.lost_progress_warning.description_other", {
								NAME: otherActiveGrid.title,
							}),
						);
					} catch (_error) {
						// User cancelled, disable the grid
						targetGrid.enabled = false;
						return;
					}
					await this.resetCheckStates(otherActiveGrid.id, false, false);
				}

				// Disable all other grids
				this.gridList.forEach((g) => {
					if (g.id !== gridId) {
						g.enabled = false;
					}
				});
				// Force back to true to solve a UI race condition
				targetGrid.enabled = true;
			} else if (
				targetGrid &&
				!targetGrid.enabled &&
				targetGrid.entries.some((e) => e.check === true)
			) {
				const t = StoreProxy.i18n.t;
				try {
					await StoreProxy.main.confirm(
						t("bingo_grid.form.lost_progress_warning.title"),
						t("bingo_grid.form.lost_progress_warning.description_self"),
					);
				} catch (_error) {
					// User cancelled, enable it back
					targetGrid.enabled = true;
					return;
				}
				await this.resetCheckStates(targetGrid.id, false, false);
			}
			if (targetGrid) {
				if (!targetGrid.enabled) {
					PublicAPI.instance.broadcast("ON_BINGO_GRID_CONFIGS", { bingo: null });
				} else {
					PublicAPI.instance.broadcast("ON_BINGO_GRID_CONFIGS", { bingo: targetGrid });
				}
			} else {
				console.log("No target grid");
			}

			if (++saveCountPending != 20) clearTimeout(debounceSave);
			debounceSave = window.setTimeout(() => {
				saveCountPending = 0;
				const grid = this.gridList.find((g) => g.id === gridId);
				if (gridId && grid) {
					grid.cols = Math.min(10, Math.max(2, grid.cols));
					grid.rows = Math.min(10, Math.max(2, grid.rows));

					const count = grid.cols * grid.rows;
					//Remove useless items
					const newEntries = grid.entries.splice(0, count);
					const oldEntries = grid.entries
						.concat()
						.filter((v) => v.label.trim().length > 0);
					grid.entries = newEntries;

					//If entries are gonna get lost, put them in the additional cells
					if (oldEntries.length > 0) {
						if (!grid.additionalEntries) grid.additionalEntries = [];
						grid.additionalEntries.push(...oldEntries);
					}

					//Add missing items
					while (grid.entries.length < count) {
						//Pick from additional cells if any
						if (grid.additionalEntries && grid.additionalEntries.length > 0) {
							grid.entries.push(grid.additionalEntries.shift()!);
						} else {
							grid.entries.push({
								id: Utils.getUUID(),
								label: "",
								lock: false,
								check: false,
							});
						}
					}

					//Replace all spaces (but line breaks) with a normal space.
					//Necessary because contenteditable sometimes adds non-breakable
					//spaces in place of normal spaces.
					grid.entries.forEach((entry) => {
						entry.label = entry.label.replace(/[^\S\r\n]/g, " ");
					});

					//Check for new bingos
					const newStates = grid.entries.map((v) => v.check);
					const prevStates = prevGridStates[grid.id];
					let newVerticalBingos: number[] = [];
					let newHorizontalBingos: number[] = [];
					let newDiagonalBingos: (0 | 1)[] = [];
					if (prevStates) {
						let prevVerticalBingos: number[] = [];
						let prevHorizontalBingos: number[] = [];
						let prevDiagonalBingos: number[] = [];
						//Checking for vertical bingos
						for (let x = 0; x < grid.cols; x++) {
							let allTicked = true;
							for (let y = 0; y < grid.rows; y++) {
								allTicked &&= newStates[x + y * grid.cols]!;
							}
							if (allTicked) newVerticalBingos.push(x);
						}
						for (let x = 0; x < grid.cols; x++) {
							let allTicked = true;
							for (let y = 0; y < grid.rows; y++) {
								allTicked &&= prevStates[x + y * grid.cols]!;
							}
							if (allTicked) prevVerticalBingos.push(x);
						}
						//Checking for horizontal bingos
						for (let y = 0; y < grid.rows; y++) {
							let allTicked = true;
							for (let x = 0; x < grid.cols; x++) {
								allTicked &&= newStates[x + y * grid.cols]!;
							}
							if (allTicked) newHorizontalBingos.push(y);
						}
						for (let y = 0; y < grid.rows; y++) {
							let allTicked = true;
							for (let x = 0; x < grid.cols; x++) {
								allTicked &&= prevStates[x + y * grid.cols]!;
							}
							if (allTicked) prevHorizontalBingos.push(y);
						}

						//Checking for diagonal bingos
						if (grid.cols == grid.rows) {
							//Top left to bottom right
							let allTicked = true;
							for (let x = 0; x < grid.cols; x++) {
								allTicked &&= newStates[x + x * grid.cols]!;
							}
							if (allTicked) newDiagonalBingos.push(0);
							allTicked = true;
							for (let x = 0; x < grid.cols; x++) {
								allTicked &&= newStates[x + (grid.cols - 1 - x) * grid.cols]!;
							}
							if (allTicked) newDiagonalBingos.push(1);

							//Bottom left to top right
							allTicked = true;
							for (let x = 0; x < grid.cols; x++) {
								allTicked &&= prevStates[x + x * grid.cols]!;
							}
							if (allTicked) prevDiagonalBingos.push(0);
							allTicked = true;
							for (let x = 0; x < grid.cols; x++) {
								allTicked &&= prevStates[x + (grid.cols - 1 - x) * grid.cols]!;
							}
							if (allTicked) prevDiagonalBingos.push(1);
						}

						//Total bingo lines currently active on the grid (before filtering
						//newXBingos to deltas). Used to register the streamer in the leaderboard.
						const streamerTotalBingos =
							newVerticalBingos.length +
							newHorizontalBingos.length +
							newDiagonalBingos.length;

						newVerticalBingos = newVerticalBingos.filter(
							(index) => prevVerticalBingos.indexOf(index) == -1,
						);
						newHorizontalBingos = newHorizontalBingos.filter(
							(index) => prevHorizontalBingos.indexOf(index) == -1,
						);
						newDiagonalBingos = newDiagonalBingos.filter(
							(index) => prevDiagonalBingos.indexOf(index) == -1,
						);

						//Register the streamer in the viewer bingo leaderboard. The SSE
						//handler only registers remote viewers, so without this the
						//streamer's own bingos would never appear in the leaderboard.
						const streamer = StoreProxy.auth.twitch.user;
						let streamerEntry = this.viewersBingoCount.find(
							(v) => v.user.id === streamer.id,
						);
						if (streamerEntry) {
							streamerEntry.count = streamerTotalBingos;
						} else if (streamerTotalBingos > 0) {
							this.viewersBingoCount.push({
								count: streamerTotalBingos,
								user: streamer,
							});
						}
						this.viewersBingoCount = this.viewersBingoCount.filter((v) => v.count > 0);

						const buildMessage = (): TwitchatDataTypes.MessageBingoGridData => {
							let x = -1;
							let y = -1;
							let label = "";
							if (cellId) {
								const index = grid.entries.findIndex((e) => e.id == cellId);
								if (grid.entries[index]) {
									x = index % grid.cols;
									y = Math.floor(index / grid.cols);
									label = grid.entries[index]!.label;
								} else if (grid.additionalEntries) {
									const index = grid.additionalEntries.findIndex(
										(e) => e.id == cellId,
									);
									label = grid.additionalEntries[index]!.label;
								}
							}
							return {
								id: Utils.getUUID(),
								date: Date.now(),
								type: TwitchatDataTypes.TwitchatMessageType.BINGO_GRID,
								platform: "twitchat",
								bingoGridId: grid.id,
								bingoGridName: grid.title,
								channel_id: StoreProxy.auth.twitch.user.id,
								colIndex: -1,
								rowIndex: -1,
								diagonal: -1,
								coords: { x, y },
								cellLabel: label,
								complete: false,
								reset: false,
								user: StoreProxy.auth.twitch.user,
							};
						};
						newVerticalBingos.forEach((index) => {
							const message = buildMessage();
							message.col = index;
							void StoreProxy.chat.addMessage(message);
						});
						newHorizontalBingos.forEach((index) => {
							const message = buildMessage();
							message.rowIndex = index;
							void StoreProxy.chat.addMessage(message);
						});
						newDiagonalBingos.forEach((index) => {
							const message = buildMessage();
							message.diagonal = index;
							void StoreProxy.chat.addMessage(message);
						});

						//All cells ticked?
						if (
							grid.entries.filter((v) => v.check === true).length ===
							grid.entries.length
						) {
							const message = buildMessage();
							message.complete = true;
							void StoreProxy.chat.addMessage(message);
						}

						if (grid.enabled) {
							PublicAPI.instance.broadcast("ON_BINGO_GRID_CONFIGS", {
								bingo: grid,
								newVerticalBingos,
								newHorizontalBingos,
								newDiagonalBingos,
							});

							if (
								newVerticalBingos.length > 0 ||
								newHorizontalBingos.length > 0 ||
								newDiagonalBingos.length > 0
							) {
								const data = {
									user: {
										name: streamer.displayNameOriginal,
										id: streamer.id,
										avatar: streamer.avatarPath || "",
									},
									count: streamerTotalBingos,
								};
								PublicAPI.instance.broadcast("ON_BINGO_GRID_VIEWER_EVENT", data);
							}
						}
					}

					prevGridStates[grid.id] = newStates;

					if (broadcastToViewers && !grid.remoteOwnerId) {
						window.clearTimeout(debounceBroadcast);
						debounceBroadcast = window.setTimeout(() => {
							//Debounce this call as it will fire an event to every connected viewer
							void ApiHelper.call("bingogrid", "PUT", {
								gridid: grid.id,
								grid: {
									cols: grid.cols,
									rows: grid.rows,
									title: grid.title,
									entries: grid.entries,
									enabled: grid.enabled,
									additionalEntries: grid.additionalEntries,
								},
							});
						}, 3000);
					}
				}

				const data: IStoreData = {
					//Never persist remote (shared) grids: the link is ephemeral and
					//must be lost on refresh.
					gridList: this.gridList.filter((g) => !g.remoteOwnerId),
				};
				DataStore.set(DataStore.BINGO_GRIDS, data);
				PublicAPI.instance.broadcastGlobalStates();
			}, 500);
		},

		toggleCell(gridId: string, cellId: string, forcedState?: boolean): void {
			const grid = this.gridList.find((g) => g.id === gridId);
			if (!grid || !grid.enabled) return;
			let cell = grid.entries.find((e) => e.id === cellId);
			if (!cell && grid.additionalEntries)
				cell = grid.additionalEntries.find((e) => e.id === cellId);
			if (!cell) return;
			let prevState = cell.check;
			cell.check = forcedState == undefined ? !cell.check : forcedState;
			if (cell.check != prevState) {
				//Debounce avoids spamming viewers
				clearTimeout(tickDebounce[gridId]);
				tickDebounce[gridId] = window.setTimeout(() => {
					const states: { [cellId: string]: boolean } = {};
					grid.entries.forEach((v) => (states[v.id] = v.check));
					if (grid.additionalEntries)
						grid.additionalEntries.forEach((v) => (states[v.id] = v.check));
					if (grid.remoteOwnerId) {
						//Shared grid: route the tick to the owner's master via the
						//share endpoint (authorized by the link token).
						if (grid.remoteToken)
							void ApiHelper.call(
								"bingogrid/share/tick",
								"POST",
								{ linkToken: grid.remoteToken, states },
								false,
							);
					} else if (StoreProxy.auth.isPremium) {
						void ApiHelper.call("bingogrid/tickStates", "POST", {
							states,
							gridid: grid.id,
						});
					}
				}, 1000);
			}
			if (cell.check) {
				let x = -1;
				let y = -1;
				if (cellId) {
					const index = grid.entries.findIndex((e) => e.id == cellId);
					x = index % grid.cols;
					y = Math.floor(index / grid.cols);
				}
				const message: TwitchatDataTypes.MessageBingoGridData = {
					id: Utils.getUUID(),
					date: Date.now(),
					type: TwitchatDataTypes.TwitchatMessageType.BINGO_GRID,
					platform: "twitchat",
					bingoGridId: grid.id,
					bingoGridName: grid.title,
					channel_id: StoreProxy.auth.twitch.user.id,
					colIndex: -1,
					rowIndex: -1,
					diagonal: -1,
					coords: { x, y },
					cellLabel: cell.label,
					complete: false,
					reset: false,
					user: StoreProxy.auth.twitch.user,
				};
				void StoreProxy.chat.addMessage(message);
			}
			void this.saveData(gridId, cellId);
		},

		async handleChatCommand(
			message: TwitchatDataTypes.TranslatableMessage,
			cmd: string,
		): Promise<void> {
			for (const grid of this.gridList) {
				//Check if it's a grid's command
				if (grid.enabled && grid.chatCmd && grid.chatCmd.toLowerCase() == cmd) {
					const allowed = await Utils.checkPermissions(
						grid.chatCmdPermissions,
						message.user,
						message.channel_id,
					);
					if (!allowed) continue;

					const [xStrt, yStrt] = (message.message || "")
						.toLowerCase()
						.replace(cmd, "")
						.trim()
						.split(":");
					const x = (parseInt(xStrt!) || 0) - 1;
					const y = (parseInt(yStrt!) || 0) - 1;
					if (x >= 0 && x < grid.cols && y >= 0 && y < grid.rows) {
						const cell = grid.entries[x + y * grid.cols]!;
						this.toggleCell(grid.id, cell.id);
					}
				}
			}
		},

		addCustomCell(gridId: string): void {
			const grid = this.gridList.find((g) => g.id === gridId);
			if (!grid) return;
			if (!grid.additionalEntries) grid.additionalEntries = [];

			grid.additionalEntries.push({
				id: Utils.getUUID(),
				check: false,
				label: "",
				lock: false,
			});
		},

		removeCustomCell(gridId: string, cellId: string): void {
			const grid = this.gridList.find((g) => g.id === gridId);
			if (!grid || !grid.additionalEntries) return;
			grid.additionalEntries = grid.additionalEntries.filter((e) => e.id != cellId);
		},

		showLeaderboard(): void {
			const grid = this.gridList.find((v) => v.enabled);
			if (!grid) return;
			const gridId = grid.id;
			const viewers = this.viewersBingoCount;
			if (!viewers || !viewers.length) return;
			//Add fake users
			// for (let i = 0; i < 15; i++) {
			// 	viewers.push({
			// 		count:Math.round(Math.random()*10+1),
			// 		user:Utils.pickRand(StoreProxy.users.users),
			// 	});
			// }
			const data = {
				id: gridId,
				scores: viewers
					.sort((a, b) => {
						if (b.count == a.count) {
							return a.user.displayNameOriginal
								.toLowerCase()
								.localeCompare(b.user.displayNameOriginal.toLowerCase());
						}
						return b.count - a.count;
					})
					.map((v) => {
						return {
							user_name: v.user.displayNameOriginal,
							user_pic: v.user.avatarPath,
							isAnon: v.user.anonymous === true,
							score: v.count,
							pos: 0,
						};
					}),
			};
			let pos = -1;
			let virtualPos = -1;
			let prevScore = -1;
			data.scores.forEach((s) => {
				virtualPos++;
				if (prevScore != s.score) pos = virtualPos;
				s.pos = pos;
				prevScore = s.score;
			});
			PublicAPI.instance.broadcast("ON_BINGO_GRID_LEADER_BOARD", data);
		},

		hideLeaderboard(): void {
			PublicAPI.instance.broadcast("ON_BINGO_GRID_LEADER_BOARD", {});
		},

		async shareGrid(gridId: string, user: TwitchDataTypes.UserInfo): Promise<void> {
			const t = StoreProxy.i18n.t;
			try {
				const res = await ApiHelper.call(
					"bingogrid/share",
					"POST",
					{ gridid: gridId, targetId: user.id },
					false,
				);
				if (res.json.success) {
					toast(t("bingo_grid.share_streamer.sent", { USER: user.display_name }), {
						type: "success",
						autoClose: 4000,
					});
				} else if (res.json.errorCode == "USER_OFFLINE") {
					toast(t("bingo_grid.share_streamer.offline", { USER: user.display_name }), {
						type: "warning",
						autoClose: 5000,
					});
				} else {
					toast(t("bingo_grid.share_streamer.error"), { type: "error", autoClose: 5000 });
				}
			} catch (_error) {
				toast(t("bingo_grid.share_streamer.error"), { type: "error", autoClose: 5000 });
			}
		},

		async acceptSharedGrid(inviteToken: string): Promise<void> {
			const t = StoreProxy.i18n.t;
			let res;
			try {
				res = await ApiHelper.call(
					"bingogrid/share/accept",
					"POST",
					{ token: inviteToken },
					false,
				);
			} catch (_error) {
				toast(t("bingo_grid.share_streamer.accept_failed"), {
					type: "error",
					autoClose: 5000,
				});
				return;
			}

			const json = res.json;
			if (!json.success || !json.grid || !json.linkToken || !json.ownerId) {
				toast(t("bingo_grid.share_streamer.accept_failed"), {
					type: "error",
					autoClose: 5000,
				});
				return;
			}

			const snap = json.grid;
			const config: TwitchatDataTypes.BingoGridConfig = {
				id: snap.id,
				title: snap.title,
				enabled: true,
				showGrid: true,
				textColor: "#ffffff",
				winSoundVolume: 100,
				textSize: 20,
				cols: snap.cols,
				rows: snap.rows,
				entries: snap.entries,
				additionalEntries: snap.additionalEntries,
				backgroundAlpha: 45,
				backgroundColor: "#000000",
				autoShowHide: false,
				chatAnnouncementEnabled: false,
				chatAnnouncement: StoreProxy.i18n.t(
					"bingo_grid.form.param_chatAnnouncement_default",
				),
				//Announce viewers' bingos on this streamer's overlay too (shared pool):
				//a bingo by any viewer of either channel shows on every linked overlay.
				overlayAnnouncement: true,
				overlayAnnouncementPermissions: Utils.getDefaultPermissions(),
				chatCmd: undefined,
				chatCmdPermissions: Utils.getDefaultPermissions(
					true,
					true,
					false,
					false,
					false,
					false,
				),
				heatClick: false,
				heatClickPermissions: Utils.getDefaultPermissions(
					true,
					true,
					false,
					false,
					false,
					false,
				),
				remoteOwnerId: json.ownerId,
				remoteOwnerName: json.ownerName,
				remoteToken: json.linkToken,
			};

			// Force disable of any enabled grid
			const otherActiveGrid = this.gridList.filter((g) => g.enabled)[0];
			if (otherActiveGrid) {
			}
			this.gridList.forEach((grid) => {
				if (grid.enabled) {
					grid.enabled = false;
					void this.resetCheckStates(grid.id, false, false, false);
				}
			});

			const index = this.gridList.findIndex((g) => g.id == config.id);
			if (index > -1) this.gridList.splice(index, 1, config);
			else this.gridList.push(config);

			console.log("SAVE", config.title);
			void this.saveData(config.id, undefined, true, false);
		},

		unlinkSharedGrid(gridId: string): void {
			const grid = this.gridList.find((g) => g.id == gridId);
			if (!grid || !grid.remoteOwnerId) return;
			const linkToken = grid.remoteToken;
			this.gridList = this.gridList.filter((g) => g.id != gridId);
			//Clear the overlay if it was showing this grid
			PublicAPI.instance.broadcast("ON_BINGO_GRID_CONFIGS", { bingo: null });
			void this.saveData();
			if (linkToken) {
				void ApiHelper.call("bingogrid/share/unlink", "POST", { linkToken }, false);
			}
		},
	} satisfies StoreActions<"bingoGrid", IBingoGridState, IBingoGridGetters, IBingoGridActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeBingoGrid, import.meta.hot));
}

interface IStoreData {
	gridList: TwitchatDataTypes.BingoGridConfig[];
}
