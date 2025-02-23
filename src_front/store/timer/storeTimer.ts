import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import StoreProxy, { type ITimerActions, type ITimerGetters, type ITimerState } from '../StoreProxy';

const countdownTO:Record<string, number> = {};

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
				title:StoreProxy.i18n.t("timers.default.timer_title"),
				enabled:true,
				isDefault:true,
				paused:false,
				startAt_ms:0,
				offset_ms:0,
				pauseDuration_ms:0,
				duration_ms:0,
			}
			const defaultCountdown:TwitchatDataTypes.TimerData = {
				id:Utils.getUUID(),
				type:"countdown",
				placeholderKey:"DEFAULT",
				title:StoreProxy.i18n.t("timers.default.countdown_title"),
				duration_ms:60_000,
				enabled:true,
				isDefault:true,
				paused:false,
				startAt_ms:0,
				offset_ms:0,
				pauseDuration_ms:0,
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
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_CURRENT_TIMERS, ()=> {
				this.broadcastStates();
			});
		},

		broadcastStates() {
			for (let i = 0; i < this.timerList.length; i++) {
				const entry = this.timerList[i];

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
			if(!StoreProxy.auth.isPremium && this.timerList.length >= Config.instance.MAX_TIMERS + 2) return;
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
			if(!entry) return;

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
			if(!entry || !entry.startAt_ms) return;
			entry.paused = true;
			entry.pausedAt_ms = Date.now();
			if(entry.type == "countdown" && countdownTO[entry.id]) window.clearTimeout(countdownTO[entry.id]);
			this.broadcastStates();
			this.saveData();
		},

		timerUnpause(id:string) {
			const entry = this.timerList.find(t=> t.id === id);
			if(!entry || !entry.startAt_ms) return;
			entry.paused = false;
			entry.offset_ms -= Date.now() - (entry.pausedAt_ms || 0);
			entry.pausedAt_ms = 0;
			this.broadcastStates();
			this.saveData();
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
				}
			}
			StoreProxy.chat.addMessage(message);

			this.resetTimer(id);
			this.saveData();
		},

		resetTimer(id:string) {
			const entry = this.timerList.find(t=> t.id === id);
			if(!entry) return;
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
				if(countdownTO[entry.id]) window.clearTimeout(countdownTO[entry.id]);
				if(entry.paused) continue;

				countdownTO[entry.id] = window.setTimeout(()=> {
					this.timerStop(entry.id);
				}, this.getTimerComputedValue(entry.id).duration_ms);
			}
		},

		getTimerComputedValue(id:string):{duration_ms:number, duration_str:string} {
			const entry = this.timerList.find(t=> t.id === id);

			// No timer found or timer not started
			if(!entry || !entry.startAt_ms) return {duration_ms:0, duration_str:""};

			if(entry.type === "timer")  {
				let elapsed = Date.now() - entry.startAt_ms + entry.offset_ms;
				if(entry.paused) {
					elapsed -= Date.now() - entry.pausedAt_ms!;
				}
				return  {
					duration_ms: elapsed,
					duration_str: Utils.formatDuration(elapsed, true, StoreProxy.i18n.t("global.date_days"))
				}
			}

			else if(entry.type === "countdown")  {
				let elapsed = Date.now() - entry.startAt_ms + entry.offset_ms;
				if(entry.paused) {
					elapsed -= Date.now() - entry.pausedAt_ms!;
				}
				elapsed -= entry.pauseDuration_ms;
				const remaining = Math.max(0, entry.duration_ms - elapsed);

				return  {
					duration_ms: remaining,
					duration_str: Utils.formatDuration(remaining, true, StoreProxy.i18n.t("global.date_days"))
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
