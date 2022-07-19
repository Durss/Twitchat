<template>
	<div class="overlaytimer">
		<div class="timer" v-if="timer" id="timer">
			<img id="timer_icon" src="@/assets/icons/timer_purple.svg" alt="timer">
			<div id="timer_label">{{timer}}</div>
		</div>

		<div class="countdown" v-if="countdown" id="countdown">
			<img id="countdown_icon" src="@/assets/icons/countdown_purple.svg" alt="countdown">
			<div id="countdown_label">{{countdown}}</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { CountdownData, TimerData } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{}
})
export default class OverlayTimer extends Vue {

	public timer:string = "";
	public countdown:string = "";

	private intervalUpdate:number = -1;
	private timerData:TimerData|null = null;
	private countdownData:CountdownData|null = null;
	
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

		PublicAPI.instance.broadcast(TwitchatEvent.GET_CURRENT_TIMERS);

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

	public async onTimerEvent(e:TwitchatEvent):Promise<void> {
		if(e.type == TwitchatEvent.TIMER_START) {
			this.timerData = (e.data as unknown) as TimerData;
			this.computeValues();
			await this.$nextTick();
			gsap.from("#timer", {duration:.7, y:"-100%"});
		}else{
			gsap.to("#timer", {duration:.7, y:"-100%", onComplete:()=> {
				this.timerData = null;
				this.timer = "";
			}});
		}
	}

	public async onCountdownEvent(e:TwitchatEvent):Promise<void> {
		if(e.type == TwitchatEvent.COUNTDOWN_START) {
			this.countdownData = (e.data as unknown) as CountdownData;
			this.computeValues();
			await this.$nextTick();
			gsap.from("#countdown", {duration:.7, y:"-100%"});
		}else{
			gsap.to("#countdown", {duration:.7, y:"-100%", onComplete:()=>{
				this.countdownData = null;
				this.countdown = "";
			}});
		}
	}

	public computeValues():void {
		if(this.countdownData) {
			const ellapsed = Date.now() - this.countdownData.startAt;
			const remaining = Math.round((this.countdownData.duration - ellapsed)/1000)*1000;
			this.countdown = Utils.formatDuration(remaining);
		}else{
			this.countdown = "";
		}
		if(this.timerData) {
			let ellapsed = Math.floor((Date.now() - this.timerData.startAt)/1000)*1000;
			this.timer = Utils.formatDuration(ellapsed);
		}else{
			this.timer = "";
		}
	}

}
</script>

<style scoped lang="less">
.overlaytimer{
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
		background-color: darken(@mainColor_light, 10%);
		padding: .5em;
		border-bottom-left-radius: 1em;
		border-bottom-right-radius: 1em;
		box-shadow: 0 0 .5em rgba(0, 0, 0, 1);
		font-family: 'Roboto';

		img {
			height: 1em;
			width: 1em;
			object-fit: contain;
			margin-right: .25em;
		}
		&:not(:first-child) {
			margin-left: 1em;
		}
	}
}
</style>