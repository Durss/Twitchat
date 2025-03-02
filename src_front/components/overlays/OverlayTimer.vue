<template>
	<div class="overlaytimer">
		<template v-if="timerValue && configTimer">
			<div class="timer" id="timer" ref="timer"
			:class="{noBg:!configTimer.bgEnabled}"
			:style="{
				fontFamily: configTimer.textFont,
				fontSize: configTimer.textSize + 'px',
				color: configTimer.textColor,
				backgroundColor: configTimer.bgColor,
			}">
				<Icon id="timer_icon" name="timer" v-if="configTimer.showIcon" />
				<div id="timer_label">{{timerValue}}</div>
			</div>
		</template>

		<template v-if="countdownValue && configCountdown">
			<div class="countdown" id="countdown" ref="countdown"
			v-if="configCountdown.style == 'text'"
			:class="{noBg:!configCountdown.bgEnabled}"
			:style="{
				fontFamily: configCountdown.textFont,
				fontSize: configCountdown.textSize + 'px',
				color: configCountdown.textColor,
				backgroundColor: configCountdown.bgColor,
			}">
				<Icon id="countdown_icon" name="countdown" v-if="configCountdown.showIcon" />
				<div id="countdown_label">{{countdownValue}}</div>
			</div>
			<div v-else-if="configCountdown.style == 'bar'" class="progress" ref="countdown">
				<div class="fill"
				:style="{
					width: countdownPercent+'%',
					backgroundColor: configCountdown.bgColor,
					height: configCountdown.progressSize + 'px',
				}"></div>
			</div>
		</template>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import { Component, toNative } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import AbstractOverlay from './AbstractOverlay';

@Component({
	components:{
		Icon,
	}
})
class OverlayTimer extends AbstractOverlay {

	public timerValue:string = "";
	public countdownValue:string = "";
	public countdownPercent:number = 0
	public configTimer:TwitchatDataTypes.TimerData["overlayParams"]|null = null;
	public configCountdown:TwitchatDataTypes.TimerData["overlayParams"]|null = null;

	private overlayId:string = "";
	private timerHidding:boolean = false;
	private countdownHidding:boolean = false;
	private intervalUpdate:number = -1;
	private timerData:TwitchatDataTypes.TimerData|null = null;
	private countdownData:TwitchatDataTypes.TimerData|null = null;

	private timerEventHandler!:(e:TwitchatEvent)=>void;
	private countdownEventHandler!:(e:TwitchatEvent)=>void;
	private timerPresenceHandler!:(e:TwitchatEvent)=>void;

	public beforeMount():void {
		this.timerEventHandler = (e:TwitchatEvent)=>this.onTimerEvent(e);
		this.countdownEventHandler = (e:TwitchatEvent)=>this.onCountdownEvent(e);
		this.timerPresenceHandler = ()=>{ PublicAPI.instance.broadcast(TwitchatEvent.TIMER_OVERLAY_PRESENCE); }

		PublicAPI.instance.addEventListener(TwitchatEvent.TIMER_START, this.timerEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.TIMER_STOP, this.timerEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.COUNTDOWN_START, this.countdownEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.COUNTDOWN_COMPLETE, this.countdownEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_TIMER_OVERLAY_PRESENCE, this.timerPresenceHandler);

		this.intervalUpdate = window.setInterval(()=>{ this.computeValues() }, 100);

		this.overlayId = this.$route.query.twitchat_overlay_id as string ?? "";
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
		PublicAPI.instance.broadcast(TwitchatEvent.GET_CURRENT_TIMERS, {id:this.overlayId});
	}

	public async onTimerEvent(e:TwitchatEvent):Promise<void> {
		const data = (e.data as unknown) as TwitchatDataTypes.TimerData;
		if(data.id != this.overlayId
		&& !(data.isDefault && this.overlayId == "")) return;

		if(this.$refs.timer) gsap.killTweensOf(this.$refs.timer as HTMLDivElement);

		if(e.type == TwitchatEvent.TIMER_START) {
			this.timerData = data;
			const wasVisible = this.timerValue != "";
			this.computeValues();
			if(!wasVisible || this.timerHidding) {
				await this.$nextTick();
				if(this.$refs.timer) gsap.fromTo(this.$refs.timer as HTMLDivElement, {y:"-100%"}, {duration:.5, y:"0%"});
			}
			this.timerHidding = false;

		}else if(this.$refs.timer) {
			this.timerHidding = true;
			gsap.to(this.$refs.timer as HTMLDivElement, {duration:.5, y:"-100%", onComplete:()=> {
				this.timerData = null;
				this.timerValue = "";
			}});
		}

		this.configTimer = data.overlayParams;
	}

	public async onCountdownEvent(e:TwitchatEvent):Promise<void> {
		const data = (e.data as unknown) as TwitchatDataTypes.TimerData;
		if(data.id != this.overlayId
		&& !(data.isDefault && this.overlayId == ""))	return;

		if(this.$refs.countdown) gsap.killTweensOf(this.$refs.countdown as HTMLDivElement);

		if(e.type == TwitchatEvent.COUNTDOWN_START) {
			this.countdownData = data;
			const wasVisible = this.countdownValue != "";
			this.computeValues();
			if(!wasVisible || this.countdownHidding){
				await this.$nextTick();
				if(this.$refs.countdown) gsap.from(this.$refs.countdown as HTMLDivElement, {duration:.5, y:"-100%"});
			}
			this.countdownHidding = false;
			
		}else if(this.$refs.countdown) {
			this.countdownHidding = true;
			gsap.to(this.$refs.countdown as HTMLDivElement, {duration:.5, y:"-100%", onComplete:()=>{
				this.countdownData = null;
				this.countdownValue = "";
			}});
		}

		this.configCountdown = data.overlayParams;
	}

	public computeValues():void {
		if(this.countdownData && this.countdownData.startAt_ms) {
			let elapsed = Date.now() - this.countdownData.startAt_ms;
			if(this.countdownData.paused) {
				elapsed -= Date.now() - this.countdownData.pausedAt_ms!;
			}
			elapsed -= this.countdownData.pauseDuration_ms;
			const remaining = Math.round((this.countdownData.duration_ms - elapsed)/1000)*1000;
			this.countdownValue = Utils.formatDuration(remaining, false, "d");

			let percent = elapsed/this.countdownData.duration_ms;
			if(this.configCountdown && this.configCountdown.progressStyle === "empty") {
				percent = 1 - percent;
			}
			this.countdownPercent = Math.max(0, Math.min(100, percent*100));
		}else{
			this.countdownValue = "";
			this.countdownPercent = 0;
		}

		if(this.timerData && this.timerData.startAt_ms) {
			let elapsed = Math.floor((Date.now() - this.timerData.startAt_ms + this.timerData.offset_ms)/1000)*1000;
			if(this.timerData.paused) {
				elapsed -= Date.now() - this.timerData.pausedAt_ms!;
			}
			this.timerValue = Utils.formatDuration(elapsed, false, "d");
		}else{
			this.timerValue = "";
		}
	}

}
export default toNative(OverlayTimer);
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
		border-bottom-left-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
		box-shadow: 0 0 .5em rgba(0, 0, 0, 1);
		font-family: var(--font-roboto);

		&.noBg {
			background-color: transparent;
			box-shadow: none;
			padding: 0;
		}

		.icon {
			height: 1em;
			width: 1em;
			object-fit: fill;
			margin-right: .25em;
		}
		&:not(:first-child) {
			margin-left: 1em;
		}
	}

	.progress {
		width: 100vw;
		position: fixed;
		top: 0;
		left: 0;
		transform: translateX(-50vw);
		.fill {
			will-change: width;
			transition: width .1s linear;
		}
	}
}
</style>
