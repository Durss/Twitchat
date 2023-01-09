import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type ITimerActions, type ITimerGetters, type ITimerState } from '../StoreProxy';

export const storeTimer = defineStore('timer', {
	state: () => ({
		timerStartDate: -1,
		timerOffset: 0,
		countdown: null as TwitchatDataTypes.CountdownData|null,
	} as ITimerState),



	getters: {
	} as ITimerGetters
	& ThisType<UnwrapRef<ITimerState> & _StoreWithGetters<ITimerGetters> & PiniaCustomProperties>
	& _GettersTree<ITimerState>,



	actions: {

		timerStart() {
			this.timerStartDate = Date.now();
			const data:TwitchatDataTypes.TimerData = {
				startAt:Utils.formatDate(new Date()),
				startAt_ms:this.timerStartDate,
			};
			
			PublicAPI.instance.broadcast(TwitchatEvent.TIMER_START, (data as unknown) as JsonObject);

			const message:TwitchatDataTypes.MessageTimerData = {
				type:TwitchatDataTypes.TwitchatMessageType.TIMER,
				platform:"twitchat",
				started:true,
				id:Utils.getUUID(),
				date:Date.now(),
				startAt:Utils.formatDuration(Date.now(), true),
				startAt_ms:Date.now(),
			};
			StoreProxy.chat.addMessage(message);
		},

		timerAdd(duration:number) {
			this.timerOffset += duration;
		},

		timerRemove(duration:number) {
			const ellapsed = Date.now() - this.timerStartDate;
			this.timerOffset -= duration;
			if(ellapsed + this.timerOffset < 0) this.timerOffset = -ellapsed;
		},

		timerStop() {
			const data:TwitchatDataTypes.TimerData = {
				startAt:Utils.formatDate(new Date(this.timerStartDate)),
				startAt_ms:this.timerStartDate,
				endAt:Utils.formatDate(new Date()),
				endAt_ms:Date.now(),
			};

			PublicAPI.instance.broadcast(TwitchatEvent.TIMER_STOP, (data as unknown) as JsonObject);

			const message:TwitchatDataTypes.MessageTimerData = {
				type:TwitchatDataTypes.TwitchatMessageType.TIMER,
				platform:"twitchat",
				started:false,
				id:Utils.getUUID(),
				date:Date.now(),
				startAt:Utils.formatDuration(Date.now(), true),
				startAt_ms:Date.now(),
				duration:Utils.formatDuration(Date.now() - this.timerStartDate, true),
				duration_ms:Date.now() - this.timerStartDate,
			};
			StoreProxy.chat.addMessage(message);

			this.timerStartDate = -1;
		},

		countdownStart(duration_ms:number) {
			if(this.countdown) clearTimeout(this.countdown.timeoutRef);
			const timeout = setTimeout(()=> {
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
			};

			const message:TwitchatDataTypes.MessageCountdownData = {
				type:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN,
				platform:"twitchat",
				id:Utils.getUUID(),
				date:Date.now(),
				countdown:this.countdown,
			};
			StoreProxy.chat.addMessage(message);
			
			PublicAPI.instance.broadcast(TwitchatEvent.COUNTDOWN_START, this.countdown);
		},

		countdownAdd(duration:number) {
			if(this.countdown) {
				this.countdown.duration_ms += duration;
				this.countdown.duration = Utils.formatDuration(this.countdown.duration_ms, true);
				
				//Reset end timeout
				const remaining = this.countdown.duration_ms - (Date.now() - this.countdown.startAt_ms);
				if(this.countdown) clearTimeout(this.countdown.timeoutRef);
				this.countdown.timeoutRef = setTimeout(()=> {
					this.countdownStop();
				}, remaining);
			}
		},

		countdownRemove(duration:number) {
			if(this.countdown) {
				this.countdown.duration_ms -= duration;
				if(this.countdown.duration_ms < 0) this.countdown.duration_ms = 0;
				this.countdown.duration = Utils.formatDuration(this.countdown.duration_ms, true);
				
				//Reset end timeout
				const remaining = this.countdown.duration_ms - (Date.now() - this.countdown.startAt_ms);
				if(this.countdown) clearTimeout(this.countdown.timeoutRef);
				this.countdown.timeoutRef = setTimeout(()=> {
					this.countdownStop();
				}, remaining);
			}
		},

		countdownStop() {
			if(this.countdown) {
				clearTimeout(this.countdown.timeoutRef);

				const cd:TwitchatDataTypes.CountdownData = {
					timeoutRef:-1,
					startAt:this.countdown.startAt,
					startAt_ms:this.countdown.startAt_ms,
					duration:this.countdown.duration,
					duration_ms:this.countdown.duration_ms,
					endAt:Utils.formatDate(new Date()),
					endAt_ms:Date.now(),
				};
				
				const message:TwitchatDataTypes.MessageCountdownData = {
					type:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN,
					platform:"twitchat",
					id:Utils.getUUID(),
					date:Date.now(),
					countdown:cd,
				};
				StoreProxy.chat.addMessage(message);
	
				PublicAPI.instance.broadcast(TwitchatEvent.COUNTDOWN_COMPLETE, (cd as unknown) as JsonObject);
			}

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