import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import StoreProxy, { type ITimerActions, type ITimerGetters, type ITimerState } from '../StoreProxy';
import SetTimeoutWorker from '@/utils/SetTimeoutWorker';

const countdownTO:Record<string, string> = {};
const getDefaultStyle = ():TwitchatDataTypes.TimerData["overlayParams"] => {
	return {
		style:"text",
		bgColor:"#ffffff",
		showIcon:true,
		bgEnabled:true,
		textFont:"Roboto",
		textSize:32,
		textColor:"#18181b",
		progressSize:10,
		progressStyle:"empty",
	}
}

export const storeTimer = defineStore('timer', {
	state: () => ({
		timerList: [] as TwitchatDataTypes.TimerData[],
	} as ITimerState),



	getters: {
	} as ITimerGetters
	& ThisType<UnwrapRef<ITimerState> & _StoreWithGetters<ITimerGetters> & PiniaCustomProperties>
	& _GettersTree<ITimerState>,



	actions: {
		async populateData():Promise<void> {
			const json = DataStore.get(DataStore.TIMERS_CONFIGS);
			if(json) {
				const data = JSON.parse(json) as IStoreData;
				this.timerList = data.timerList
			}
			const defaultTimer:TwitchatDataTypes.TimerData = {
				id:Utils.getUUID(),
				type:"timer",
				placeholderKey:"DEFAULT",
				title:StoreProxy.i18n.t("timers.default_timer_title"),
				enabled:true,
				isDefault:true,
				paused:false,
				startAt_ms:0,
				offset_ms:0,
				pauseDuration_ms:0,
				duration_ms:0,
				overlayParams: getDefaultStyle(),
			}
			const defaultCountdown:TwitchatDataTypes.TimerData = {
				id:Utils.getUUID(),
				type:"countdown",
				placeholderKey:"DEFAULT",
				title:StoreProxy.i18n.t("timers.default_countdown_title"),
				duration_ms:60_000,
				enabled:true,
				isDefault:true,
				paused:false,
				startAt_ms:0,
				offset_ms:0,
				pauseDuration_ms:0,
				overlayParams: getDefaultStyle(),
			}

			// Create default time/countdown if missing
			if (!this.timerList.some(timer => timer.isDefault && timer.type === "countdown")) {
				this.timerList.unshift(defaultCountdown);
			}
			if (!this.timerList.some(timer => timer.isDefault && timer.type === "timer")) {
				this.timerList.unshift(defaultTimer);
			}

			this.saveData();

			/**
			 * Called when timer overlay requests for a timer info
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_CURRENT_TIMERS, (event:TwitchatEvent<{ id?:string }>)=> {
				if(event.data?.id) {
					this.broadcastStates(event.data.id);
				}else{
					//Broadcast default timers states
					for (let i = 0; i < this.timerList.length; i++) {
						const entry = this.timerList[i];
						if(!entry.isDefault) continue;
						this.broadcastStates(entry.id);
					}
				}
			});
		},

		broadcastStates(id?:string) {
			for (let i = 0; i < this.timerList.length; i++) {
				const entry = this.timerList[i];
				if(id && entry.id !== id) continue;

				if(entry.type === "timer") {
					PublicAPI.instance.broadcast(TwitchatEvent.TIMER_START, entry);
				}

				if(entry.type === "countdown") {
					PublicAPI.instance.broadcast(TwitchatEvent.COUNTDOWN_START, entry);
				}
			}
		},

		createTimer() {
			// +2 is to account for the default timer and countdown
			if(!StoreProxy.auth.isPremium && this.timerList.filter(v=>!v.isDefault && v.enabled).length >= Config.instance.MAX_TIMERS + 2) return;
			const data:TwitchatDataTypes.TimerData = {
				id:Utils.getUUID(),
				type:"timer",
				placeholderKey:"",
				title:"",
				enabled:true,
				isDefault:false,
				paused:false,
				startAt_ms:0,
				offset_ms:0,
				pauseDuration_ms:0,
				duration_ms:0,
				overlayParams: getDefaultStyle(),
			}
			this.timerList.push(data);
			this.saveData();
		},

		deleteTimer(id:string) {
			const index = this.timerList.findIndex(t=> t.id === id);
			if(index == -1) return;
			StoreProxy.main.confirm(StoreProxy.i18n.t("timers.delete_confirm.title"), StoreProxy.i18n.t("timers.delete_confirm.message"))
			.then(()=> {
				this.timerList.splice(index, 1);
				this.saveData();
			}).catch(_=> {});
		},

		timerStart(id:string) {
			const entry = this.timerList.find(t=> t.id === id);
			if(!entry || !entry.enabled) return;

			let message:TwitchatDataTypes.MessageTimerData|TwitchatDataTypes.MessageCountdownData|null = null;
			this.resetTimer(id);

			entry.startAt_ms = Date.now();
			switch(entry.type) {
				case "timer": {
					const data:TwitchatDataTypes.MessageTimerData = {
						type:TwitchatDataTypes.TwitchatMessageType.TIMER,
						platform:"twitchat",
						id:Utils.getUUID(),
						date:Date.now(),
						timer_id:entry.id,
						channel_id:StoreProxy.auth.twitch.user.id,
						startedAt_ms:Date.now(),
						startedAt_str:Utils.formatDate(new Date(), true),
						duration_ms: 0,
						duration_str: "0",
						stopped:false,
					};
					message = data;
					break;
				}
				case "countdown":{
					const data:TwitchatDataTypes.MessageCountdownData = {
						type:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN,
						platform:"twitchat",
						id:Utils.getUUID(),
						date:Date.now(),
						countdown_id:entry.id,
						channel_id:StoreProxy.auth.twitch.user.id,
						startedAt_ms:Date.now(),
						startedAt_str:Utils.formatDate(new Date(), true),
						duration_ms: entry.duration_ms,
						duration_str: Utils.formatDuration(entry.duration_ms, true),
						aborted:false,
						complete:false,
					};
					message = data;
				}
			}
			if(message) StoreProxy.chat.addMessage(message);

			this.broadcastStates();
			this.saveData();
		},

		timerAdd(id:string, duration:number) {
			const entry = this.timerList.find(t=> t.id === id);
			if(!entry) return;
			if(entry.type == "timer") {
				entry.offset_ms += duration;
			}else if(entry.type == "countdown") {
				entry.duration_ms += duration;
				this.broadcastStates();
			}
			this.broadcastStates();
			this.saveData();
		},

		timerRemove(id:string, duration:number) {
			const entry = this.timerList.find(t=> t.id === id);
			if(!entry || !entry.startAt_ms) return;
			if(entry.type == "timer") {
				const elapsed = Date.now() - entry.startAt_ms;
				entry.offset_ms -= duration;
				if(elapsed + entry.offset_ms < 0) entry.offset_ms = -elapsed;
			}else if(entry.type == "countdown") {
				entry.duration_ms -= duration;
				if(entry.duration_ms < 0) entry.duration_ms = 0;
			}
			this.broadcastStates();
			this.saveData();
		},

		timerPause(id:string) {
			const entry = this.timerList.find(t=> t.id === id);
			if(!entry || !entry.startAt_ms || entry.paused) return;
			entry.paused = true;
			entry.pausedAt_ms = Date.now();
			if(entry.type == "countdown" && countdownTO[entry.id]) SetTimeoutWorker.instance.delete(countdownTO[entry.id]);
			this.broadcastStates();
			this.saveData();
		},

		timerUnpause(id:string) {
			const entry = this.timerList.find(t=> t.id === id);
			if(!entry || !entry.enabled) return;
			if(entry.paused && entry.startAt_ms) {
				entry.paused = false;
				if(entry.type == "timer") {
					entry.offset_ms -= Date.now() - (entry.pausedAt_ms || 0);
				}else{
					entry.pauseDuration_ms += Date.now() - (entry.pausedAt_ms || 0);
				}
				entry.pausedAt_ms = 0;
				this.broadcastStates();
				this.saveData();
			}else{
				this.timerStart(id);
			}
		},

		timerStop(id:string) {
			const entry = this.timerList.find(t=> t.id === id);
			if(!entry || !entry.startAt_ms) return;
			if(entry.paused) this.timerUnpause(id);
			entry.endAt_ms = Date.now();
			const duration = this.getTimerComputedValue(id);
			let message!:TwitchatDataTypes.MessageTimerData|TwitchatDataTypes.MessageCountdownData;
			switch(entry.type) {
				case "timer":{
					const data:TwitchatDataTypes.MessageTimerData = {
						type:TwitchatDataTypes.TwitchatMessageType.TIMER,
						platform:"twitchat",
						id:Utils.getUUID(),
						date:Date.now(),
						timer_id:entry.id,
						channel_id:StoreProxy.auth.twitch.user.id,
						startedAt_ms:entry.startAt_ms,
						startedAt_str:Utils.formatDate(new Date(entry.startAt_ms), true),
						duration_ms:duration.duration_ms,
						duration_str:duration.duration_str,
						stopped:true,
					};
					message = data;
					PublicAPI.instance.broadcast(TwitchatEvent.TIMER_STOP, entry);
					break;
				}
				case "countdown":{
					const aborted = duration.duration_ms > 0;
					const finalDuration_ms = aborted? entry.endAt_ms - entry.startAt_ms - entry.pauseDuration_ms : entry.duration_ms;
					const finalDuration_str = Utils.formatDuration(finalDuration_ms, true);

					const data:TwitchatDataTypes.MessageCountdownData = {
						type:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN,
						platform:"twitchat",
						id:Utils.getUUID(),
						date:Date.now(),
						countdown_id:entry.id,
						channel_id:StoreProxy.auth.twitch.user.id,
						startedAt_ms:entry.startAt_ms,
						startedAt_str:Utils.formatDate(new Date(entry.startAt_ms), true),
						duration_ms:entry.duration_ms,
						duration_str:Utils.formatDuration(entry.duration_ms, true),
						aborted,
						complete:true,
						endedAt_ms:Date.now(),
						endedAt_str:Utils.formatDate(new Date(), true),
						finalDuration_ms,
						finalDuration_str,
					};
					message = data;
					PublicAPI.instance.broadcast(TwitchatEvent.COUNTDOWN_COMPLETE, entry);
					break;
				}
			}
			StoreProxy.chat.addMessage(message);

			this.resetTimer(id);
			this.saveData();
		},

		resetTimer(id:string) {
			const entry = this.timerList.find(t=> t.id === id);
			if(!entry) return;
			if(countdownTO[entry.id]) SetTimeoutWorker.instance.delete(countdownTO[entry.id]);
			if(entry.startAt_ms) {
				if(entry.type == "timer") {
					PublicAPI.instance.broadcast(TwitchatEvent.TIMER_STOP, entry);
				}else if(entry.type == "countdown") {
					PublicAPI.instance.broadcast(TwitchatEvent.COUNTDOWN_COMPLETE, entry);
				}
			}
			delete entry.pausedAt_ms
			delete entry.endAt_ms
			delete entry.startAt_ms;
			delete countdownTO[entry.id];
			entry.offset_ms = 0;
			entry.pauseDuration_ms = 0;
		},

		saveData() {
			const data:IStoreData = {
				timerList:this.timerList
			};
			DataStore.set(DataStore.TIMERS_CONFIGS, data);

			// Schedule countdown ends
			for (let i = 0; i < this.timerList.length; i++) {
				const entry = this.timerList[i];
				if(entry.type != "countdown") continue;
				if(countdownTO[entry.id]) {
					SetTimeoutWorker.instance.delete(countdownTO[entry.id]);
					delete countdownTO[entry.id];
				}
				if(entry.paused || !entry.startAt_ms) continue;

				countdownTO[entry.id] = SetTimeoutWorker.instance.create(()=> {
					this.timerStop(entry.id);
				}, this.getTimerComputedValue(entry.id).duration_ms);
			}
		},

		getTimerComputedValue(id:string):{duration_ms:number, duration_str:string} {
			const entry = this.timerList.find(t=> t.id === id);

			// No timer found or timer not started
			if(!entry || !entry.startAt_ms) return {duration_ms:0, duration_str:""};

			if(entry.type === "timer")  {
				let elapsed = 0;
				if(entry.paused) {
					elapsed = entry.pausedAt_ms! - entry.startAt_ms + entry.offset_ms;
				}else{
					elapsed = Date.now() - entry.startAt_ms + entry.offset_ms;
				}
				return  {
					duration_ms: elapsed,
					duration_str: Utils.formatDuration(Math.ceil(elapsed/500)*500, true, StoreProxy.i18n.t("global.date_days"))
				}
			}

			else if(entry.type === "countdown")  {
				let elapsed = 0
				if(entry.paused) {
					elapsed = entry.pausedAt_ms! - entry.startAt_ms + entry.offset_ms;
				}else{
					elapsed = Date.now() - entry.startAt_ms + entry.offset_ms;
				}
				elapsed -= entry.pauseDuration_ms;
				const remaining = Math.max(0, entry.duration_ms - elapsed);

				return  {
					duration_ms: remaining,
					duration_str: Utils.formatDuration(Math.ceil(remaining/500)*500, true, StoreProxy.i18n.t("global.date_days"))
				}
			}

			return {duration_ms:0, duration_str:""}
		}
	} as ITimerActions
	& ThisType<ITimerActions
		& UnwrapRef<ITimerState>
		& _StoreWithState<"timer", ITimerState, ITimerGetters, ITimerActions>
		& _StoreWithGetters<ITimerGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeTimer, import.meta.hot))
}

interface IStoreData {
	timerList:TwitchatDataTypes.TimerData[];
}
