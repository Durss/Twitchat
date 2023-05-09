<template>
	<div class="overlaytimer">
		<div class="timer" v-if="timerValue" id="timer" ref="timer">
			<Icon id="timer_icon" name="timer" theme="dark"/>
			<div id="timer_label">{{timerValue}}</div>
		</div>

		<div class="countdown" v-if="countdownValue" id="countdown" ref="countdown">
			<Icon id="countdown_icon" name="countdown" theme="dark"/>
			<div id="countdown_label">{{countdownValue}}</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';
import AbstractOberlay from './AbstractOberlay.vue';

@Component({
	components:{}
})
export default class OverlayTimer extends AbstractOberlay {

	public timerValue:string = "";
	public countdownValue:string = "";

	private intervalUpdate:number = -1;
	private timerData:TwitchatDataTypes.TimerData|null = null;
	private countdownData:TwitchatDataTypes.CountdownData|null = null;
	
	private timerEventHandler!:(e:TwitchatEvent)=>void;
	private countdownEventHandler!:(e:TwitchatEvent)=>void;
	private timerPresenceHandler!:(e:TwitchatEvent)=>void;

	public mounted():void {
		this.timerEventHandler = (e:TwitchatEvent)=>this.onTimerEvent(e);
		this.countdownEventHandler = (e:TwitchatEvent)=>this.onCountdownEvent(e);
		this.timerPresenceHandler = ()=>{ PublicAPI.instance.broadcast(TwitchatEvent.TIMER_OVERLAY_PRESENCE); }

		PublicAPI.instance.addEventListener(TwitchatEvent.TIMER_START, this.timerEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.TIMER_STOP, this.timerEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.COUNTDOWN_START, this.countdownEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.COUNTDOWN_COMPLETE, this.countdownEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_TIMER_OVERLAY_PRESENCE, this.timerPresenceHandler);

		this.intervalUpdate = setInterval(()=>{ this.computeValues() }, 1000)
	}

	public beforeUnmount():void {
		clearTimeout(this.intervalUpdate);
		PublicAPI.instance.removeEventListener(TwitchatEvent.TIMER_START, this.timerEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.TIMER_STOP, this.timerEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.COUNTDOWN_START, this.countdownEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.COUNTDOWN_COMPLETE, this.countdownEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GET_TIMER_OVERLAY_PRESENCE, this.timerPresenceHandler);
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_CURRENT_TIMERS);
	}

	public async onTimerEvent(e:TwitchatEvent):Promise<void> {
		if(e.type == TwitchatEvent.TIMER_START) {
			this.timerData = (e.data as unknown) as TwitchatDataTypes.TimerData;
			this.computeValues();

			if(!this.$refs.timer) {
				await this.$nextTick();
				gsap.from(this.$refs.timer as HTMLDivElement, {duration:.7, y:"-100%"});
			}
		}else{
			gsap.to(this.$refs.timer as HTMLDivElement, {duration:.7, y:"-100%", onComplete:()=> {
				this.timerData = null;
				this.timerValue = "";
			}});
		}
	}

	public async onCountdownEvent(e:TwitchatEvent):Promise<void> {
		if(e.type == TwitchatEvent.COUNTDOWN_START) {
			this.countdownData = (e.data as unknown) as TwitchatDataTypes.CountdownData;
			this.computeValues();

			if(!this.$refs.countdown) {
				await this.$nextTick();
				gsap.from(this.$refs.countdown as HTMLDivElement, {duration:.7, y:"-100%"});
			}
		}else{
			gsap.to(this.$refs.countdown as HTMLDivElement, {duration:.7, y:"-100%", onComplete:()=>{
				this.countdownData = null;
				this.countdownValue = "";
			}});
		}
	}

	public computeValues():void {
		if(this.countdownData) {
			const ellapsed = Date.now() - this.countdownData.startAt_ms;
			const remaining = Math.round((this.countdownData.duration_ms - ellapsed)/1000)*1000;
			this.countdownValue = Utils.formatDuration(remaining);
		}else{
			this.countdownValue = "";
		}
		if(this.timerData) {
			let ellapsed = Math.floor((Date.now() - this.timerData.startAt_ms)/1000)*1000;
			this.timerValue = Utils.formatDuration(ellapsed);
		}else{
			this.timerValue = "";
		}
	}

}
</script>

<style scoped lang="less">
.overlaytimer{
	position: absolute;
	top: 0;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: flex-start;
	
	.timer, .countdown {
		@margin: .5em;
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		font-size: 2em;
		color: var(--color-dark);
		background-color: var(--color-light);
		padding: .5em;
		border-bottom-left-radius: 1em;
		border-bottom-right-radius: 1em;
		box-shadow: 0 0 .5em rgba(0, 0, 0, 1);
		font-family: var(--font-roboto);

		img {
			height: 1em;
			width: 1em;
			object-fit: fill;
			margin-right: .25em;
		}
		&:not(:first-child) {
			margin-left: 1em;
		}
	}
}
</style>