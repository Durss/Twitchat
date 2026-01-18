import * as TriggerActionDataTypes from "@/types/TriggerActionDataTypes";
import { TriggerTypes, type TriggerData } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import Config from "@/utils/Config";
import TriggerUtils from "@/utils/TriggerUtils";
import Utils from "@/utils/Utils";
import type { JsonValue } from "type-fest";
import DataStoreCommon from "./DataStoreCommon";
import StoreProxy from "./StoreProxy";
import type { CustomTrainStoreData } from "./customtrain/storeCustomTrain";

/**
 * Fallback to sessionStorage if localStorage isn't available
 * Created : 18/10/2020
 */
export default class DataStore extends DataStoreCommon{

	protected static saveTO:number = -1;
	private static abortQuery:AbortController|null = null;
	private static savePromiseResolver:Function|null = null;
	private static isSaving:boolean = false;
	private static pendingSave:boolean = false;


	/********************
	* GETTER / SETTERS *
	********************/



	/******************
	* PUBLIC METHODS *
	******************/


	/**
	 * Save user's data server side
	 * @returns
	 */
	static override async save(force:boolean = false):Promise<void> {
		if(!force) {
			if(!this.syncToServer) return;//User wants to only save data locally
			if(!this.dataImported) return;//Don't export anything before importing data first
			if(!StoreProxy.auth.twitch.access_token) return;
			if(StoreProxy.main.outdatedDataVersion) return;
			if(StoreProxy.main.offlineMode) return;
		}

		//If a save is currently in progress (API call running), mark that we need
		//another save after it completes, don't try to abort and restart
		if(this.isSaving) {
			this.pendingSave = true;
			return;
		}

		//Clear any pending debounce timeout and resolve its promise
		if(this.saveTO !== -1) {
			clearTimeout(this.saveTO);
			this.saveTO = -1;
		}
		if(this.savePromiseResolver) {
			this.savePromiseResolver();
			this.savePromiseResolver = null;
		}

		return new Promise((resolve) => {
			this.savePromiseResolver = resolve;
			this.saveTO = window.setTimeout(async () => {
				this.saveTO = -1;
				this.isSaving = true;
				this.savePromiseResolver = null;

				const data = JSON.parse(JSON.stringify(this.rawStore));

				//Do not save sensitive and useless data to server
				for (let i = 0; i < this.UNSYNCED_DATA.length; i++) {
					delete data[ this.UNSYNCED_DATA[i]! ];
				}

				//Remove automod items the user asked not to sync to server
				const automod = data.automodParams as TwitchatDataTypes.AutomodParamsData;
				if(automod) {
					for (let i = 0; i < automod.keywordsFilters.length; i++) {
						if(!automod.keywordsFilters[i]!.serverSync) {
							automod.keywordsFilters.splice(i,1);
							i--;
						}
					}
				}

				data.saveVersion = isNaN(data.saveVersion)? 1 : data.saveVersion + 1;
				this.set(this.SAVE_VERSION, data.saveVersion, false);

				this.abortQuery = new AbortController();
				const saveRes = await ApiHelper.call("user/data", "POST", {data, forced:force}, false, undefined, undefined, this.abortQuery!.signal);
				this.abortQuery = null;

				if(saveRes.status == 409) {
					StoreProxy.main.showOutdatedDataVersionAlert();
				}
				if(saveRes.json.success === true && force && saveRes.json.version) {
					this.set(this.SAVE_VERSION, Math.max(data.saveVersion, saveRes.json.version), false);
				}

				//If we forced upload, consider data has been imported as they are
				//the same on local and remote. This will allow later automatic saves
				if(force) this.dataImported = true;

				this.isSaving = false;
				resolve();

				//If another save was requested while we were saving, trigger it now
				if(this.pendingSave) {
					this.pendingSave = false;
					this.save();
				}
			}, force? 0 : 1500);
		});
	}

	/**
	 * Load user's data from the server
	 * @imp
	 * @returns if user has data or not
	 */
	static override async loadRemoteData(importToLS:boolean = true):Promise<boolean> {
		if(!this.store) this.init();

		try {
			const res = await ApiHelper.call("user/data", "GET");
			if(importToLS) {
				// console.log("Import to local storage...");
				//Import data to local storage.
				if(res.json.success === true) {
					await this.loadFromJSON(res.json.data);
					this.save(true);
				}
			}
			return res.status != 404;
		}catch(error) {
			console.error("Remote data loading failed !");
			console.log(error);
			return false;
		}
	}

	/**
	 * Emergency backup
	 */
	public static async emergencyBackupStorage(force:boolean = false):Promise<void> {
		try {
			const data = JSON.parse(JSON.stringify(this.rawStore));

			//Do not save sensitive and useless data to server
			for (let i = 0; i < this.UNSYNCED_DATA.length; i++) {
				delete data[ this.UNSYNCED_DATA[i]! ];
			}

			//Remove automod items the user asked not to sync to server
			const automod = data.automodParams as TwitchatDataTypes.AutomodParamsData;
			if(automod) {
				for (let i = 0; i < automod.keywordsFilters.length; i++) {
					if(!automod.keywordsFilters[i]!.serverSync) {
						automod.keywordsFilters.splice(i,1);
						i--;
					}
				}
			}

			const headers:{ [key: string]: string } = force? { "force": "true" } : {};
			await ApiHelper.call("user/data/backup", "POST", data, true, 0, headers);
		}catch(error) {
			console.error(error);
		}
	}

	/**
	 * Makes asynchronous data migrations after being authenticated
	 */
	static override async migrateData(data:any):Promise<any> {
		let v = parseFloat(data[this.DATA_VERSION]) || 12;
		const latestVersion = 69;

		if(v < 44) {
			const res:{[key:string]:unknown} = {};
			res[this.DATA_VERSION] = latestVersion;
			return res;
		}
		if(v==44) {
			delete data["goxlrEnabled"];
			v = 45;
		}
		if(v==45) {
			delete data["goxlrEnabled"];
			this.addGoXLRReadMarkDefaults(data);
			v = 46;
		}
		if(v==46) {
			this.migrateTriggersDelay(data);
			v = 47;
		}
		if(v==47) {
			this.fixDataTypes(data);
			v = 48;
		}
		if(v==48) {
			//Some users still have an old trigger data format :/
			//THey have an empty(?) object instead of an array
			const triggers:TriggerData[] = data[this.TRIGGERS];
			if(triggers && !Array.isArray(triggers)) {
				data[this.TRIGGERS] = [];
			}
			if(data[this.ENDING_CREDITS_PARAMS]?.scale) {
				data[this.ENDING_CREDITS_PARAMS].scale = 30;
			}
			this.cleanupHeatTriggerActions(data);
			v = 48.1;
		}
		if(v==48.1) {
			this.addSRFilter(data);
			v = 49;
		}
		if(v==49) {
			this.migrateScheduleActionDuration(data);
			v = 50;
		}
		if(v==50) {
			this.setDefaultQueuesToTriggers(data);
			v = 51;
		}
		if(v==51) {
			this.migratePollPredDurations(data);
			v = 52;
		}
		if(v==52) {
			this.dedupeTriggerTree(data);
			v = 53;
		}
		if(v==53) {
			this.fixRaffleTriggerEntry(data);
			v = 54;
		}
		if(v==54) {
			this.cleanPremiumWarningEndingCredits(data);
			v = 55;
		}
		if(v==55) {
			this.fixUserErrors(data);
			v = 56;
		}
		if(v==56) {
			this.clearGhostValueEntry(data);
			v = 57;
		}
		if(v==57) {
			this.migrateHTTPTriggerOutputPlaceholer(data);
			v = 58;
		}
		if(v==58) {
			this.migrateWSTriggerActions(data);
			v = 59;
		}
		if(v==59) {
			this.migratePerUserCountersAndValues(data);
			v = 60;
		}
		if(v==60) {
			this.cleanAndMigrateRunningRaffles(data);
			v = 61;
		}
		if(v==61) {
			this.migrateTimerPlaceholders(data);
			v = 62;
		}
		if(v==62) {
			this.addApproachEventCountToCustomTrain(data);
			v = 63;
		}
		if(v==63) {
			this.limitTriggerActionCount(data);
			v = 64;
		}
		if(v==64) {
			// Same as before but i also blocked the possibility to "ctrl+v" actions which i forgot before
			this.limitTriggerActionCount(data);
			v = 65;
		}
		if(v==65) {
			this.migrateKofiWebhooksData(data);
			v = 66;
		}
		if(v==66) {
			this.migrateHttpToJsonExtract(data);
			v = 67;
		}
		if(v==67) {
			this.cleanupOutputPlaceholderList(data);
			v = 67.1;
		}
		if(v==67.1) {
			this.migrateAutoTranslateKey(data);
			v = 68;
		}
		if(v==68) {
			this.fixCustomHypeTrainRecord(data);
			v = latestVersion;
		}

		delete data["p:hideChat"];//TODO remove in a few months (added 08/08/2024)
		delete data["antifa_hide"];//TODO remove in a few months (added 08/08/2024)
		delete data["t4p_chat_cmd"];//TODO remove in a few months (added 26/10/2024)
		//TODO remove in a few months (added 08/08/2024)
		if(typeof data["p:autoTranslateFirstLang"] == "string") {
			data["p:autoTranslateFirstLang"] = [data["p:autoTranslateFirstLang"]];
		}
		delete data["YOUTUBE_AUTH_TOKEN"];//Probably some old beta data added by mistake that remains on few people
		data[this.DATA_VERSION] = v;
		return data;
	}

	/**
	 * Migrates data on the LocalStorage
	 */
	public static async migrateLocalStorage():Promise<void> {
		//load LocalStorage data and parse values from string to numbers and booleans
		//if necessary then keep it on a local typed stored "rawStore"
		const items = this.getAll();
		for (const key in items) {
			try{
				items[key] = JSON.parse(items[key] as string);
			}catch(error) {
				//parsing failed, that's because it's a simple string, just keep it
			}
		}

		const backup:{[key:string]:JsonValue} = {};
		for (const key of this.UNSYNCED_DATA) {
			if(!items[key]) continue;
			backup[key] = items[key];
		}
		backup[this.DATA_VERSION] = items[this.DATA_VERSION]!;

		const json = await this.migrateData(items);//Migrate remote data if necessary

		//Clear storage to remove potentially old data
		localStorage.clear();

		for (const key in backup) {
			if(backup[key]) {
				json[key] = backup[key];
			}
		}

		//Update localstorage data
		for (const key in json) {
			const value = json[key];
			const str = typeof value == "string"? value : JSON.stringify(value);
			this.store.setItem(this.dataPrefix + key, str);
		}

		this.rawStore = json;
	}




	/*******************
	* PRIVATE METHODS *
	*******************/



	/**********************************
	 **** DATA MIGRATION UTILITIES ****
	 **********************************/

	/**
	 * Add "move read marker" default data to GoXLR params
	 */
	private static addGoXLRReadMarkDefaults(data:any):void {
		const confs:TwitchatDataTypes.GoXLRParams = data[DataStore.GOXLR_CONFIG];
		if(confs && !confs.chatReadMarkSources) {
			confs.chatReadMarkSources = []
			data[DataStore.GOXLR_CONFIG] = confs;
		}
	}

	/**
	 * Minor fixes of useless "delay" that were still injected to every triggers
	 */
	private static migrateTriggersDelay(data:any):void {
		const triggers:TriggerData[] = data[DataStore.TRIGGERS];

		if(triggers && Array.isArray(triggers)) {
			triggers.forEach(t => {
				if(t.rewardId && t.type != TriggerTypes.REWARD_REDEEM) {
					delete t.rewardId;//Compensate for migration mistake. Useless data
				}
				for (const a of t.actions) {
					//Remove old "0 second" delays not properly cleaned up
					if(a.delay != undefined && a.type != "delay") {
						delete a.delay;
					}
				}
			})
			data[DataStore.TRIGGERS] = triggers;
		}
	}

	/**
	 * Fixes lots of data types everywhere
	 */
	private static fixDataTypes(data:any):void {
		const obsPort = data[DataStore.OBS_PORT];
		const botMessages:{[key:string]:TwitchatDataTypes.BotMessageEntry} = data[DataStore.BOT_MESSAGES];
		const chatCols:TwitchatDataTypes.ChatColumnsConfig[] = data[DataStore.CHAT_COLUMNS_CONF];
		const triggers:TriggerData[] = data[DataStore.TRIGGERS];
		const tts:TwitchatDataTypes.TTSParamsData = data[DataStore.TTS_PARAMS];
		const emergency:TwitchatDataTypes.EmergencyParamsData = data[DataStore.EMERGENCY_PARAMS];
		const websocket:TriggerActionDataTypes.SocketParams = data[DataStore.WEBSOCKET_TRIGGER];

		if(obsPort) data[DataStore.OBS_PORT] = parseInt(obsPort) || 4455;

		if(botMessages) {
			for (const key in botMessages) {
				const m = botMessages[key]!;
				if(m.message == null) m.message = StoreProxy.i18n.tm("params.botMessages."+key);
				if(m.enabled != true && m.enabled != false) m.enabled = false;
			}
			data[DataStore.BOT_MESSAGES] = botMessages;
		}

		if(chatCols) {
			chatCols.forEach(c => {
				c.size = Math.min(10, Math.max(0, c.size));
			});
			data[DataStore.CHAT_COLUMNS_CONF] = chatCols;
		}

		if(triggers && Array.isArray(triggers)) {
			triggers.forEach(t => {
				if(t.cooldown) {
					if(!t.cooldown.user) t.cooldown.user = 0;
					if(!t.cooldown.global) t.cooldown.global = 0;
				}
				if(t.rewardId && t.type != TriggerTypes.REWARD_REDEEM) {
					console.log("Clean useless rewardId from", t);
					delete t.rewardId;//Compensate for migration mistake. Useless data
				}
				for (let i = 0; i < t.actions.length; i++) {
					const a = t.actions[i]!;
					//Remove old "0 second" delays not properly cleaned up
					if(a.delay != undefined && a.type != "delay") {
						delete a.delay;
					}
					//Trigger action is missing msot important data, remove action
					if((a.type == "trigger" || a.type == "triggerToggle") && !a.triggerId) {
						console.log("Clean useless trigger action", a);
						t.actions.splice(i, 1);
						i--;
					}
				}
			})
			data[DataStore.TRIGGERS] = triggers;
		}

		if(tts) {
			tts.readMessagePatern			= typeof tts.readMessagePatern == "string"? tts.readMessagePatern : "";
			tts.readWhispersPattern			= typeof tts.readWhispersPattern == "string"? tts.readWhispersPattern : "";
			tts.readNoticesPattern			= typeof tts.readNoticesPattern == "string"? tts.readNoticesPattern : "";
			tts.readRewardsPattern			= typeof tts.readRewardsPattern == "string"? tts.readRewardsPattern : "";
			tts.readSubsPattern				= typeof tts.readSubsPattern == "string"? tts.readSubsPattern : "";
			tts.readSubgiftsPattern			= typeof tts.readSubgiftsPattern == "string"? tts.readSubgiftsPattern : "";
			tts.readBitsPattern				= typeof tts.readBitsPattern == "string"? tts.readBitsPattern : "";
			tts.readRaidsPattern			= typeof tts.readRaidsPattern == "string"? tts.readRaidsPattern : "";
			tts.readFollowPattern			= typeof tts.readFollowPattern == "string"? tts.readFollowPattern : "";
			tts.readPollsPattern			= typeof tts.readPollsPattern == "string"? tts.readPollsPattern : "";
			tts.readBingosPattern			= typeof tts.readBingosPattern == "string"? tts.readBingosPattern : "";
			tts.readRafflePattern			= typeof tts.readRafflePattern == "string"? tts.readRafflePattern : "";
			tts.readPredictionsPattern		= typeof tts.readPredictionsPattern == "string"? tts.readPredictionsPattern : "";
			tts.read1stMessageTodayPattern	= typeof tts.read1stMessageTodayPattern == "string"? tts.read1stMessageTodayPattern : "";
			tts.read1stTimeChattersPattern	= typeof tts.read1stTimeChattersPattern == "string"? tts.read1stTimeChattersPattern : "";
			tts.readAutomodPattern			= typeof tts.readAutomodPattern == "string"? tts.readAutomodPattern : "";
			tts.readTimeoutsPattern			= typeof tts.readTimeoutsPattern == "string"? tts.readTimeoutsPattern : "";
			tts.readBansPattern				= typeof tts.readBansPattern == "string"? tts.readBansPattern : "";
			tts.readUnbansPattern			= typeof tts.readUnbansPattern == "string"? tts.readUnbansPattern : "";
		}

		if(emergency) {
			if(!Array.isArray(emergency.toUsers)) emergency.toUsers = [];
			data[DataStore.EMERGENCY_PARAMS] = emergency;
		}

		if(websocket) {
			websocket.port = parseInt(websocket+"") || 3000;
			data[DataStore.WEBSOCKET_TRIGGER] = websocket;
		}
	}

	/**
	 * Cleans up heat trigger actions from useless data to avoid conflicts on execution
	 */
	private static cleanupHeatTriggerActions(data:any):void {
		const triggers:TriggerData[] = data[DataStore.TRIGGERS];
		if(triggers) {
			for (const trigger of triggers) {
				if(trigger.type == TriggerTypes.HEAT_CLICK) {
					if(trigger.heatClickSource == "obs") {
						delete trigger.heatAreaIds;
					}else if(trigger.heatClickSource == "area") {
						delete trigger.heatObsSource;
					}else {
						delete trigger.heatAreaIds;
						delete trigger.heatObsSource;
					}
				}
			}
			data[DataStore.TRIGGERS] = triggers;
		}
	}

	/**
	 * Adds new song request filter item to chat columns
	 */
	private static addSRFilter(data:any):void {
		const chatCols:TwitchatDataTypes.ChatColumnsConfig[] = data[DataStore.CHAT_COLUMNS_CONF];

		if(chatCols) {
			chatCols.forEach(c => {
				c.filters.music_added_to_queue = false;
			});
			chatCols[0]!.filters.music_added_to_queue = true;

			data[DataStore.CHAT_COLUMNS_CONF] = chatCols;
		}

	}

	/**
	 * Migrates schedule durations from minutes to seconds
	 */
	private static migrateScheduleActionDuration(data:any):void {
		const triggers:TriggerData[] = data[DataStore.TRIGGERS];

		if(triggers && Array.isArray(triggers)) {
			triggers.forEach(t => {
				if(t.type == TriggerTypes.SCHEDULE && t.scheduleParams && t.scheduleParams.repeatDuration > 0) {
					console.log("migrate", t.scheduleParams.repeatDuration);
					t.scheduleParams.repeatDuration *= 60;
					console.log("new value is", t.scheduleParams.repeatDuration);
				}
			});
			data[DataStore.TRIGGERS] = triggers;
		}
	}

	/**
	 * Migrates schedule durations from minutes to seconds
	 */
	private static setDefaultQueuesToTriggers(data:any):void {
		const triggers:TriggerData[] = data[DataStore.TRIGGERS];
		const count:{[key:string]:number} = {};

		if(triggers && Array.isArray(triggers)) {
			triggers.forEach(t => {
				if(!t.queue) {
					const infos = TriggerUtils.getTriggerDisplayInfo(t);
					let name = Utils.slugify(infos.label || "automatic_queue");
					if(t.type == TriggerTypes.REWARD_REDEEM) {
						name = "channelpoints-reward";
					}
					if(count[name] === undefined) count[name] = 0;
					if(count[name]! > 0) name +="_"+count[name];
					count[name]! ++;

					t.queue = name;
					console.log("Set queue to", name);
				}
			});
			data[DataStore.TRIGGERS] = triggers;
		}
	}

	/**
	 * Migrate polls and predictions durations to seconds instead of minutes
	 * @param data
	 */
	private static migratePollPredDurations(data:any):void {
		//Migrate default poll duration
		let d = parseInt(data[DataStore.POLL_DEFAULT_DURATION]);
		if(!isNaN(d)) data[DataStore.POLL_DEFAULT_DURATION] = d * 60;

		//Migrate default prediction duration
		d = parseInt(data[DataStore.PREDICTION_DEFAULT_DURATION]);
		if(!isNaN(d)) data[DataStore.PREDICTION_DEFAULT_DURATION] = d * 60;

		//Migrate durations on triggers
		const triggers:TriggerData[] = data[DataStore.TRIGGERS];
		if(triggers && Array.isArray(triggers)) {
			triggers.forEach(t => {
				t.actions.forEach(a => {
					if(a.type == "poll" && a.pollData) {
						a.pollData.voteDuration *= 60;
					}
					if(a.type == "prediction" && a.predictionData) {
						a.predictionData.voteDuration *= 60;
					}
				})
			});
			data[DataStore.TRIGGERS] = triggers;
		}
	}

	/**
	 * Remove duplicates from the trigger tree after a mistake on the
	 * non-premium data cleanup that was duplicating everything on the
	 * root of the tree
	 * @param data
	 */
	private static dedupeTriggerTree(data:any):void {

		const tree:TriggerActionDataTypes.TriggerTreeItemData[] = data[DataStore.TRIGGERS_TREE];
		if(tree && Array.isArray(tree)) {
			const isInFolder:{[key:string]:boolean} = {};
			const parseTreeNode = (node:TriggerActionDataTypes.TriggerTreeItemData)=> {
				if(node.type == "folder") {
					(node.children || []).forEach(item => {
						if(item.type == "trigger") {
							isInFolder[item.triggerId!] = true;
						}else{
							parseTreeNode(item);
						}
					})
				}
			}
			//Check which nodes are duplicated on root
			tree.forEach(item=> parseTreeNode(item));

			//Cleanup any trigger from the root tree if it
			//exists within a folder
			for (let i = 0; i < tree.length; i++) {
				const item = tree[i]!;
				//Check if current item exists within a folder
				if(item.type == "trigger" && isInFolder[item.triggerId!] === true) {
					console.log("Remove", item.triggerId);
					tree.splice(i, 1);
					i--;
				}
			}
			data[DataStore.TRIGGERS_TREE] = tree;
		}
	}

	/**
	 * Old failed trigger entry was storing full value data instead of its id
	 * in the raffle trigger action data
	 * @param data
	 */
	private static fixRaffleTriggerEntry(data:any):void {
		const triggers:TriggerData[] = data[DataStore.TRIGGERS];
		if(triggers && Array.isArray(triggers)) {
			triggers.forEach(t => {
				t.actions.forEach(a => {
					if(a.type == "raffle" && a.raffleData && a.raffleData.value_id && typeof a.raffleData.value_id != "string") {
						a.raffleData.value_id = (a.raffleData.value_id as TwitchatDataTypes.ValueData).id;
					}
				})
			});
			data[DataStore.TRIGGERS] = triggers;
		}
	}

	/**
	 * Removes "showPremiumWarning" prop from ending credits slots
	 * this should have never been there in the first place as it's sent to server when
	 * it's only here to alert the user
	 * @param data
	 */
	private static cleanPremiumWarningEndingCredits(data:any):void {
		const credits:TwitchatDataTypes.EndingCreditsParams = data[DataStore.ENDING_CREDITS_PARAMS];
		if(credits) {
			credits.slots.forEach(slot => {
				delete slot.showPremiumWarning;
			});
			data[DataStore.ENDING_CREDITS_PARAMS] = credits;
		}
	}

	/**
	 * Fixing errors from users that managed to get invalid data
	 * @param data
	 */
	private static fixUserErrors(data:any):void {
		//Limiting to max 1 language source
		if(data["p:autoTranslateFirstLang"] && data["p:autoTranslateFirstLang"].length > 1) {
			data["p:autoTranslateFirstLang"] = [data["p:autoTranslateFirstLang"][0]];
		}

		//Limit stream info preset name
		const presets = data[DataStore.STREAM_INFO_PRESETS] as TwitchatDataTypes.StreamInfoPreset[];
		if(presets && Array.isArray(presets)) {
			presets.forEach(v=> {
				v.name = (v.name || "").substring(0, 50);
			})
		}

		//Someone entered many coma seperated IPs.
		//Keeping only the first one here
		if(data[DataStore.OBS_IP] && data[DataStore.OBS_IP].length > 100) {
			data[DataStore.OBS_IP] = data[DataStore.OBS_IP].split(",")[0].trim();
		}
		//Someone cleared the field and got an empty string as port before I
		//changed the component behavior so it doesn't returns an empty string
		if(data[DataStore.OBS_PORT] && isNaN(data[DataStore.OBS_PORT])) {
			data[DataStore.OBS_PORT] = 4455;
		}

		//Someone got a giant repeat duration value
		const triggers:TriggerData[] = data[DataStore.TRIGGERS];
		if(triggers && Array.isArray(triggers)) {
			triggers.forEach(t => {
				if(t.scheduleParams && t.scheduleParams.repeatDuration && t.scheduleParams.repeatDuration > 999999999999999999) {
					t.scheduleParams.repeatDuration =  30 * 60;
				}
			});
		}
	}

	/**
	 * Due to a mistake of mine, ghost values where added to per-user
	 * values when clearing them.
	 * @param data
	 */
	private static clearGhostValueEntry(data:any):void {
		const values = data[DataStore.VALUES] as TwitchatDataTypes.ValueData[];
		if(values && Array.isArray(values)) {
			values.forEach(v=> {
				if(v.perUser !== true) return;
				if(!v.users) return;
				delete v.users[""];
			})
		}
	}

	/**
	 * The HTTP trigger action only allowed to set the full result
	 * of the query inside a placeholder.
	 * Now any number of placeholders can be added with JSONPath
	 * capabilities.
	 * @param data
	 */
	private static migrateHTTPTriggerOutputPlaceholer(data:any):void {
		const triggers:TriggerData[] = data[DataStore.TRIGGERS];
		if(triggers && Array.isArray(triggers)) {
			triggers.forEach(t => {
				t.actions.forEach(a => {
					if(a.type == "http" && a.outputPlaceholder) {
						a.outputPlaceholderList = [
							{
								type:"text",
								path:"",
								placeholder:a.outputPlaceholder,
							}
						]
					}
				})
			});
		}
	}

	/**
	 * Migrate WS trigger actions.
	 * Until then there was a "topic" and "payload" options
	 * but they were both sent as a prop of the body with no
	 * way to specify the actual body which was blocking to
	 * properly interface with third party apps.
	 * Now there's only a "payload" property.
	 * This method migrates previous format to new one
	 * @param data
	 */
	private static migrateWSTriggerActions(data:any):void {
		const triggers:TriggerData[] = data[DataStore.TRIGGERS];
		if(triggers && Array.isArray(triggers)) {
			triggers.forEach(t => {
				t.actions.forEach(a => {
					if(a.type == "ws") {
						let payload:{payload?:string, topic?:string} = {};
						if(a.payload) payload.payload = a.payload;
						if(a.topic) payload.topic = a.topic;

						delete a.topic;

						a.payload = JSON.stringify(payload);
					}
				})
			});
		}
	}

	/**
	 * Migrate per-user counters and values to new "per-channel" items
	 * Old counter/values types where :
	 * {[uid:string]:string|number}
	 *
	 * Now it is:
	 * {[userId:string]:{
	 * 	platform:ChatPlatform,
	 * 	value:string|number;
	 * }}
	 * @param data
	 */
	private static migratePerUserCountersAndValues(data:any):void {
		const values:TwitchatDataTypes.ValueData[] = data[DataStore.VALUES];
		(values || []).forEach(value => {
			if(value.perUser !== true || !value.users) return;
			for (const uid in value.users) {
				const userVal = value.users[uid] as unknown as string;
				const platform:TwitchatDataTypes.ChatPlatform = (parseInt(uid).toString() == uid)? "twitch" : "youtube";
				value.users[uid] = {
					platform,
					value:userVal,
				};
			}
			console.log("Migrate value", value);
		});

		const counters:TwitchatDataTypes.CounterData[] = data[DataStore.COUNTERS];
		(counters || []).forEach(counter => {
			if(counter.perUser !== true || !counter.users) return;
			for (const uid in counter.users) {
				const userVal = counter.users[uid] as unknown as number;
				const platform:TwitchatDataTypes.ChatPlatform = (parseInt(uid).toString() == uid)? "twitch" : "youtube";
				counter.users[uid] = {
					platform,
					value:userVal,
				};
			}
			console.log("Migrate counter", counter);
		});
	}

	/**
	 * Cleanup all "manual" and "values" raffles that are still on user's data.
	 * After this update they will automatically be removed from it. But not until then.
	 * Also setting "autoClose" flag to true on all raffles started from triggers
	 * @param data
	 */
	private static cleanAndMigrateRunningRaffles(data:any):void {
		const triggers:TriggerData[] = data[DataStore.TRIGGERS];
		if(triggers && Array.isArray(triggers)) {
			triggers.forEach(t => {
				t.actions.forEach(a => {
					if(a.type == "raffle" && a.raffleData) {
						a.raffleData.autoClose = true;
					}
				})
			});
		}

		let rafflesRunning = data[DataStore.RAFFLES_RUNNING] as TwitchatDataTypes.RaffleData[];
		if(rafflesRunning && Array.isArray(rafflesRunning)) {
			//Remove manual and values raffles from history
			rafflesRunning = rafflesRunning.filter((v:TwitchatDataTypes.RaffleData) => {
				if(v.mode == "manual") return false;
				if(v.mode == "values") return false;
				return true;
			})
		}
	}

	/**
	 * Migrate old global timer/countdown placeholders to new ones
	 * @param data
	 */
	private static migrateTimerPlaceholders(data:any):void {
		const triggers:TriggerData[] = data[DataStore.TRIGGERS];
		if(triggers && Array.isArray(triggers)) {
			let str = JSON.stringify(triggers);
			str = str.replace(/\{TIMER_F\}/g, "{TIMER_DEFAULT_ELAPSED}");
			str = str.replace(/\{TIMER\}/g, "{TIMER_DEFAULT_ELAPSED_MS}");
			str = str.replace(/\{COUNTDOWN_VALUE_F\}/g, "{COUNTDOWN_DEFAULT_REMAINING}");
			str = str.replace(/\{COUNTDOWN_VALUE\}/g, "{COUNTDOWN_DEFAULT_REMAINING_MS}");
			str = str.replace(/\{COUNTDOWN_DURATION_F\}/g, "{COUNTDOWN_DEFAULT_DURATION}");
			str = str.replace(/\{COUNTDOWN_DURATION\}/g, "{COUNTDOWN_DEFAULT_DURATION_MS}");

			data[DataStore.TRIGGERS] = JSON.parse(str);
		}
	}

	/**
	 * Add new "approachEventCount" to custom trains
	 * @param data
	 */
	private static addApproachEventCountToCustomTrain(data:any):void {
		const trains:CustomTrainStoreData = data[DataStore.CUSTOM_TRAIN_CONFIGS];
		if(trains) {
			trains.customTrainList.forEach(t => {
				if(!t.approachEventCount) {
					t.approachEventCount = 2;
				}
			})
		}
	}

	/**
	 * Limit number of trigger actions to 100
	 * @param data
	 */
	private static limitTriggerActionCount(data:any):void {
		const triggers:TriggerData[] = data[DataStore.TRIGGERS];
		if(triggers && Array.isArray(triggers)) {
			triggers.forEach(t => {
				if(t.actions.length > Config.instance.MAX_TRIGGER_ACTIONS) {
					t.actions = t.actions.slice(0, 100);
				}
			});
		}
	}

	/**
	 * Migrates kofi webhooks structure from simple strings to complex objects
	 * @param data
	 */
	private static migrateKofiWebhooksData(data:any):void {
		const webhooks = data[DataStore.KOFI_CONFIGS]?.webhooks;
		if(webhooks && Array.isArray(webhooks) && webhooks.length > 0 && typeof webhooks[0] == "string") {
			for (let i = 0; i < webhooks.length; i++) {
				if(typeof webhooks[i] === "string") {
					const url = webhooks[i];
					webhooks[i] = {
						url,
						fails:0,
						enabled:true
					};
				}
			}
			console.log("Migrated Kofi webhooks data", webhooks);
		}
	}

	/**
	 * Migrates HTTP Call actions to use simple text output + JSON Extract action
	 * This simplifies the UI and provides better separation of concerns
	 */
	private static migrateHttpToJsonExtract(data:any):void {
		const triggers:TriggerActionDataTypes.TriggerData[] = data[DataStore.TRIGGERS];
		if(!triggers || !Array.isArray(triggers)) return;

		for (const trigger of triggers) {
			for (let i = 0; i < trigger.actions.length; i++) {
				const action = trigger.actions[i]!;

				// Handle HTTP Call actions
				if(action.type === "http") {
					const httpAction = action as TriggerActionDataTypes.TriggerActionHTTPCallData;

					// If it has complex JSON extraction, migrate it
					if(httpAction.outputPlaceholderList) {
						if(httpAction.outputPlaceholderList.length > 0) {
							if(httpAction.outputPlaceholderList.length === 1 && httpAction.outputPlaceholderList[0]!.type === 'text') {
								// If it only has a single text output, keep it as is
								if(httpAction.outputPlaceholderList[0]!.placeholder) {
									httpAction.outputPlaceholder = httpAction.outputPlaceholderList[0]!.placeholder;
								}
							}else{
								// Filter only JSON placeholders for the extract action
								const jsonPlaceholders = httpAction.outputPlaceholderList.filter(v=>v.type === 'json');

								// Only create JSON Extract action if there are actual JSON placeholders
								if(jsonPlaceholders.length > 0) {
									const baseHttpPlaceholder = this.generateUniquePlaceholderName(trigger, "HTTP_RESULT");

									const jsonExtractAction:TriggerActionDataTypes.TriggerActionJSONExtractData = {
										id: Utils.getUUID(),
										type: "json_extract",
										jsonExtractData:{
											sourcePlaceholder: baseHttpPlaceholder,
											outputPlaceholderList: [...jsonPlaceholders] as TriggerActionDataTypes.IHttpPlaceholder[],
										}
									};

									// Add the JSON extract action right after the HTTP action
									trigger.actions.splice(i+1, 0, jsonExtractAction);

									// Simplify the HTTP action to only output the full response
									httpAction.outputPlaceholder = baseHttpPlaceholder;
								}
							}
						}
						delete httpAction.outputPlaceholderList;
					}
				}
			}
		}

		console.log("Migrated HTTP Call actions to use JSON Extract pattern");
	}

	/**
	 * Generates a unique placeholder name that's not already used in the trigger
	 */
	private static generateUniquePlaceholderName(trigger:TriggerActionDataTypes.TriggerData, prefix:string):string {
		const existingPlaceholders = new Set<string>();

		// Collect all existing placeholder names from all actions
		for (const action of trigger.actions) {
			if('outputPlaceholderList' in action && action.outputPlaceholderList) {
				for (const ph of action.outputPlaceholderList) {
					if(ph.placeholder) {
						existingPlaceholders.add(ph.placeholder.toUpperCase());
					}
				}
			}
			if(action.type === "http" && 'outputPlaceholder' in action && action.outputPlaceholder) {
				existingPlaceholders.add(action.outputPlaceholder.toUpperCase());
			}
		}

		// Generate a unique name
		let counter = 1;
		let candidateName = prefix;
		while(existingPlaceholders.has(candidateName)) {
			candidateName = `${prefix}_${counter}`;
			counter++;
		}

		return candidateName;
	}

	/**
	 * Cleanup remaining outputPlaceholderList from HTTP and Groq actions
	 * Previous migration removed them only if they were not empty.
	 * Empty ones still remained.
	 * @param data
	 * @returns
	 */
	private static cleanupOutputPlaceholderList(data:any):void {
		const triggers:TriggerActionDataTypes.TriggerData[] = data[DataStore.TRIGGERS];
		if(!triggers || !Array.isArray(triggers)) return;

		for (const trigger of triggers) {
			for (const action of trigger.actions) {
				if(action.type === "http" || action.type === "groq") {
					if('outputPlaceholderList' in action && action.outputPlaceholderList) {
						// Remove any empty output placeholders
						delete action.outputPlaceholderList
					}
				}
			}
		}
	}

	/**
	 * Updates "autoTranslateFirst" param key to "autoTranslate"
	 * @param data
	 * @returns
	 */
	private static migrateAutoTranslateKey(data:any):void {
		if(data["p:autoTranslateFirst"] !== undefined) {
			data["p:autoTranslate"] = data["p:autoTranslateFirst"];
			data["p:autoTranslateLang"] = data["p:autoTranslateFirstLang"];
			data["p:autoTranslateSpoken"] = data["p:autoTranslateFirstSpoken"];
			delete data["p:autoTranslateFirst"];
			delete data["p:autoTranslateFirstLang"];
			delete data["p:autoTranslateFirstSpoken"];
		}
	}

	/**
	 * Fixes custom hype train record data that are broken due to
	 * shit data from Streamlabs corrupting everything
	 * @param data
	 * @returns
	 */
	private static fixCustomHypeTrainRecord(data:any):void {
		const trains:CustomTrainStoreData = data[DataStore.CUSTOM_TRAIN_CONFIGS];
		if(trains) {
			trains.customTrainList.forEach(t => {
				if(t.allTimeRecord && (isNaN(t.allTimeRecord.amount) || t.allTimeRecord.amount < 0 || typeof t.allTimeRecord.amount !== "number")) {
					delete t.allTimeRecord;
				}
			})
		}
	}
}
