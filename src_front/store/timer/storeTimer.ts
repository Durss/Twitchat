import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type ITimerActions, type ITimerGetters, type ITimerState } from '../StoreProxy';

export const storeTimer = defineStore('timer', {
	state: () => ({
		// timerStartDate: -1,
		// timerOffset: 0,
		// timerPaused:false,
		// timerPausedAt:0,
		timer: null as TwitchatDataTypes.TimerData|null,
		countdown: null as TwitchatDataTypes.CountdownData|null,
	} as ITimerState),



	getters: {
	} as ITimerGetters
	& ThisType<UnwrapRef<ITimerState> & _StoreWithGetters<ITimerGetters> & PiniaCustomProperties>
	& _GettersTree<ITimerState>,



	actions: {

		broadcastStates() {
			if(this.timer) {
				PublicAPI.instance.broadcast(TwitchatEvent.TIMER_START, this.timer);
			}
			
			if(this.countdown) {
				PublicAPI.instance.broadcast(TwitchatEvent.COUNTDOWN_START, this.countdown);
			}
				
			if(this.countdown) {
				//Reset end timeout
				const remaining = this.countdown.duration_ms - (Date.now() - this.countdown.startAt_ms) + this.countdown.pausedDuration;
				clearTimeout(this.countdown.timeoutRef);
				this.countdown.timeoutRef = window.setTimeout(()=> {
					this.countdownStop(false);
				}, remaining);
			}
		},

		timerStart() {
			this.timer = {
				startAt:Utils.formatDate(new Date()),
				startAt_ms:Date.now(),
				offset_ms:0,
				labels:{
					days:StoreProxy.i18n.t("global.date_days")
				}
			};
			
			const message:TwitchatDataTypes.MessageTimerData = {
				type:TwitchatDataTypes.TwitchatMessageType.TIMER,
				platform:"twitchat",
				started:true,
				id:Utils.getUUID(),
				date:Date.now(),
				timer:JSON.parse(JSON.stringify(this.timer)),
				channel_id:StoreProxy.auth.twitch.user.id,
			};
			StoreProxy.chat.addMessage(message);

			this.broadcastStates();
		},

		timerAdd(duration:number) {
			if(!this.timer) return;
			this.timer.offset_ms += duration;
			this.broadcastStates();
		},

		timerRemove(duration:number) {
			if(!this.timer) return;
			const elapsed = Date.now() - this.timer?.startAt_ms;
			this.timer.offset_ms -= duration;
			if(elapsed + this.timer.offset_ms < 0) this.timer.offset_ms = -elapsed;
			this.broadcastStates();
		},

		timerPause() {
			if(!this.timer) return;
			this.timer.paused = true;
			this.timer.pausedAt = Date.now();
			this.broadcastStates();
		},

		timerUnpause() {
			if(!this.timer) return;
			this.timer.paused = false;
			this.timer.offset_ms -= Date.now() - (this.timer.pausedAt || 0);
			this.timer.pausedAt = 0;
			this.broadcastStates();
		},

		timerStop() {
			if(!this.timer) return;
			if(this.timer.paused) this.timerUnpause();
			this.timer.endAt = Utils.formatDate(new Date());
			this.timer.endAt_ms = Date.now();
			this.timer.duration_ms = Date.now() - this.timer.startAt_ms + this.timer.offset_ms;
			this.timer.duration = Utils.formatDuration(this.timer.duration_ms, true);

			PublicAPI.instance.broadcast(TwitchatEvent.TIMER_STOP, (this.timer as unknown) as JsonObject);

			const message:TwitchatDataTypes.MessageTimerData = {
				type:TwitchatDataTypes.TwitchatMessageType.TIMER,
				platform:"twitchat",
				started:false,
				id:Utils.getUUID(),
				date:Date.now(),
				timer:JSON.parse(JSON.stringify(this.timer)),
				channel_id:StoreProxy.auth.twitch.user.id,
			};
			StoreProxy.chat.addMessage(message);

			this.timer = null;
		},

		countdownStart(duration_ms:number) {
			if(this.countdown) clearTimeout(this.countdown.timeoutRef);
			const timeout = window.setTimeout(()=> {
				this.countdownStop();
			}, Math.max(duration_ms, 1000));

			if(this.countdown) {
				clearTimeout(this.countdown.timeoutRef);
			}

			this.countdown = {
				timeoutRef:timeout,
				startAt:Utils.formatDate(new Date()),
				startAt_ms:Date.now(),
				duration:Utils.formatDuration(duration_ms, true),
				duration_ms:duration_ms,
				pausedDuration:0,
				labels:{
					days:StoreProxy.i18n.t("global.date_days")
				}
			};

			const message:TwitchatDataTypes.MessageCountdownData = {
				type:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN,
				platform:"twitchat",
				id:Utils.getUUID(),
				date:Date.now(),
				countdown:JSON.parse(JSON.stringify(this.countdown)),
				channel_id:StoreProxy.auth.twitch.user.id,
			};
			StoreProxy.chat.addMessage(message);
			
			this.broadcastStates();
		},

		countdownAdd(duration:number) {
			if(this.countdown) {
				this.countdown.duration_ms += duration;
				this.countdown.duration = Utils.formatDuration(this.countdown.duration_ms, true);
				this.broadcastStates();
			}
		},

		countdownRemove(duration:number) {
			if(this.countdown) {
				this.countdown.duration_ms -= duration;
				if(this.countdown.duration_ms < 0) this.countdown.duration_ms = 0;
				this.countdown.duration = Utils.formatDuration(this.countdown.duration_ms, true);
				this.broadcastStates();
			}
		},

		countdownPause() {
			if(!this.countdown) return;
			this.countdown.paused = true;
			this.countdown.pausedAt = Date.now();
			this.broadcastStates();
			clearTimeout(this.countdown.timeoutRef);
		},

		countdownUnpause() {
			if(!this.countdown) return;
			this.countdown.paused = false;
			this.countdown.pausedDuration += Date.now() - (this.countdown.pausedAt || 0);
			this.broadcastStates();
		},

		countdownStop(aborted:boolean = true) {
			if(!this.countdown) return;
			clearTimeout(this.countdown.timeoutRef);

			this.countdown.endAt_ms = Date.now();
			this.countdown.endAt = Utils.formatDate(new Date(this.countdown.endAt_ms));
			this.countdown.finalDuration_ms = aborted? this.countdown.endAt_ms - this.countdown.startAt_ms - this.countdown.pausedDuration : this.countdown.duration_ms;
			this.countdown.finalDuration = Utils.formatDuration(this.countdown.finalDuration_ms, true);
			this.countdown.aborted = aborted;

			const message:TwitchatDataTypes.MessageCountdownData = {
				type:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN,
				platform:"twitchat",
				id:Utils.getUUID(),
				date:Date.now(),
				countdown:this.countdown,
				channel_id:StoreProxy.auth.twitch.user.id,
			};
			StoreProxy.chat.addMessage(message);

			PublicAPI.instance.broadcast(TwitchatEvent.COUNTDOWN_COMPLETE, this.countdown);

			this.countdown = null;
		},
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