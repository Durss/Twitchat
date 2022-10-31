import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import PublicAPI from '@/utils/PublicAPI';
import TriggerActionHandler from '@/utils/TriggerActionHandler';
import TwitchatEvent from '@/events/TwitchatEvent';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type ITimerActions, type ITimerGetters, type ITimerState } from '../StoreProxy';

export const storeTimer = defineStore('timer', {
	state: () => ({
		timerStart: -1,
		countdown: null as TwitchatDataTypes.CountdownData|null,
	} as ITimerState),



	getters: {
	} as ITimerGetters
	& ThisType<UnwrapRef<ITimerState> & _StoreWithGetters<ITimerGetters> & PiniaCustomProperties>
	& _GettersTree<ITimerState>,



	actions: {

		startTimer() {
			this.timerStart = Date.now();
			const data = { startAt:this.timerStart };
			PublicAPI.instance.broadcast(TwitchatEvent.TIMER_START, data);

			const message:TwitchatDataTypes.MessageTimerData = {
				type:"timer",
				platform:"twitchat",
				started:true,
				id:Utils.getUUID(),
				date:Date.now(),
				startAt:Date.now(),
			};
			TriggerActionHandler.instance.onMessage(message);
		},

		stopTimer() {
			const data = { startAt:this.timerStart, stopAt:Date.now() };
			PublicAPI.instance.broadcast(TwitchatEvent.TIMER_STOP, data);

			const message:TwitchatDataTypes.MessageTimerData = {
				type:"timer",
				platform:"twitchat",
				started:true,
				id:Utils.getUUID(),
				date:Date.now(),
				startAt:Date.now(),
				duration:Date.now() - this.timerStart,
			};
			TriggerActionHandler.instance.onMessage(message);

			this.timerStart = -1;
		},

		startCountdown(duration:number) {
			let timeout = setTimeout(()=> {
				this.stopCountdown()
			}, Math.max(duration, 1000));

			if(this.countdown) {
				clearTimeout(this.countdown.timeoutRef);
			}

			this.countdown = {
				timeoutRef:timeout,
				startAt:Date.now(),
				duration:duration,
			};

			const message:TwitchatDataTypes.MessageCountdownData = {
				type:"countdown",
				platform:"twitchat",
				id:Utils.getUUID(),
				date:Date.now(),
				countdown:this.countdown,
			};
			TriggerActionHandler.instance.onMessage(message);
			
			const data = { startAt:this.countdown.startAt, duration:this.countdown.duration };
			PublicAPI.instance.broadcast(TwitchatEvent.COUNTDOWN_START, data);
		},

		stopCountdown() {
			if(this.countdown) {
				clearTimeout(this.countdown.timeoutRef);
				
				const message:TwitchatDataTypes.MessageCountdownData = {
					type:"countdown",
					platform:"twitchat",
					id:Utils.getUUID(),
					date:Date.now(),
					countdown:this.countdown,
				};
				StoreProxy.chat.addMessage(message);
				TriggerActionHandler.instance.onMessage(message);
	
				const data = { startAt:this.countdown?.startAt, duration:this.countdown?.duration };
				PublicAPI.instance.broadcast(TwitchatEvent.COUNTDOWN_COMPLETE, (data as unknown) as JsonObject);
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