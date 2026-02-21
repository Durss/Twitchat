<template>
	<div class="overlaytimer">
		<template v-if="timerValue && configTimer">
			<div class="timer" id="timer" ref="timer"
			:class="{noBg:!configTimer.bgEnabled}"
			:style="{
				fontFamily: 'custom-font, \''+configTimer.textFont+'\', Inter',
				fontSize: configTimer.textSize + 'px',
				color: configTimer.textColor,
				backgroundColor: configTimer.bgEnabled? configTimer.bgColor : 'transparent',
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
				fontFamily: 'custom-font, \''+configCountdown.textFont+'\', Inter',
				fontSize: configCountdown.textSize + 'px',
				color: configCountdown.textColor,
				backgroundColor: configCountdown.bgEnabled? configCountdown.bgColor : 'transparent',
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
	private styleNode:HTMLStyleElement|null = null;
	private timerData:TwitchatDataTypes.TimerData|null = null;
	private countdownData:TwitchatDataTypes.TimerData|null = null;

	private timerEventHandler!:(e:TwitchatEvent<"ON_TIMER_START" | "ON_TIMER_STOP">)=>void;
	private countdownEventHandler!:(e:TwitchatEvent<"ON_COUNTDOWN_START" | "ON_COUNTDOWN_COMPLETE">)=>void;
	private timerPresenceHandler!:()=>void;

	public beforeMount():void {
		this.timerEventHandler = (e)=>this.onTimerEvent(e);
		this.countdownEventHandler = (e)=>this.onCountdownEvent(e);
		this.timerPresenceHandler = ()=>{ PublicAPI.instance.broadcast("ON_TIMER_OVERLAY_PRESENCE"); }

		PublicAPI.instance.addEventListener("ON_TIMER_START", this.timerEventHandler);
		PublicAPI.instance.addEventListener("ON_TIMER_STOP", this.timerEventHandler);
		PublicAPI.instance.addEventListener("ON_COUNTDOWN_START", this.countdownEventHandler);
		PublicAPI.instance.addEventListener("ON_COUNTDOWN_COMPLETE", this.countdownEventHandler);
		PublicAPI.instance.addEventListener("GET_TIMER_OVERLAY_PRESENCE", this.timerPresenceHandler);

		this.intervalUpdate = window.setInterval(()=>{ this.computeValues() }, 100);

		this.overlayId = this.$route.query.twitchat_overlay_id as string ?? "";

		this.styleNode = document.createElement("style");
		document.head.appendChild(this.styleNode);
	}

	public beforeUnmount():void {
		clearTimeout(this.intervalUpdate);
		PublicAPI.instance.removeEventListener("ON_TIMER_START", this.timerEventHandler);
		PublicAPI.instance.removeEventListener("ON_TIMER_STOP", this.timerEventHandler);
		PublicAPI.instance.removeEventListener("ON_COUNTDOWN_START", this.countdownEventHandler);
		PublicAPI.instance.removeEventListener("ON_COUNTDOWN_COMPLETE", this.countdownEventHandler);
		PublicAPI.instance.removeEventListener("GET_TIMER_OVERLAY_PRESENCE", this.timerPresenceHandler);
		if(this.styleNode) {
			document.head.removeChild(this.styleNode);
			this.styleNode = null;
		}
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast("GET_TIMER", {id:this.overlayId});
	}

	public async onTimerEvent(e:TwitchatEvent<"ON_TIMER_START" | "ON_TIMER_STOP">):Promise<void> {
		const data = e.data;
		if(data.id != this.overlayId
		&& !(data.isDefault && this.overlayId == "")) return;

		if(this.$refs.timer) gsap.killTweensOf(this.$refs.timer as HTMLDivElement);

		if(e.type == "ON_TIMER_START") {
			this.timerData = data;
			const wasVisible = this.timerValue != "";
			this.computeValues();
			if(!wasVisible || this.timerHidding) {
				await this.$nextTick();
				if(this.$refs.timer) gsap.fromTo(this.$refs.timer as HTMLDivElement, {y:"-100%"}, {duration:.5, y:"0%"});
			}else{
				gsap.to(this.$refs.timer as HTMLDivElement, {duration:.5, y:"0%"});
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

		this.styleNode!.innerHTML = `
		@font-face {
			font-family: "custom-font";
			src: local("${this.configTimer.textFont}");
		}`;
	}

	public async onCountdownEvent(e:TwitchatEvent<"ON_COUNTDOWN_START" | "ON_COUNTDOWN_COMPLETE">):Promise<void> {
		if(e.data.id != this.overlayId
		&& !(e.data.isDefault && this.overlayId == ""))	return;

		if(this.$refs.countdown) gsap.killTweensOf(this.$refs.countdown as HTMLDivElement);

		if(e.type == "ON_COUNTDOWN_START") {
			this.countdownData = e.data;
			const wasVisible = this.countdownValue != "";
			this.computeValues();
			if(!wasVisible || this.countdownHidding){
				await this.$nextTick();
				if(this.$refs.countdown) gsap.fromTo(this.$refs.countdown as HTMLDivElement, {y:"-100%"}, {duration:.5, y:"0%"});
			}else{
				gsap.to(this.$refs.countdown as HTMLDivElement, {duration:.5, y:"0%"});
			}
			this.countdownHidding = false;

		}else if(this.$refs.countdown) {
			this.countdownHidding = true;
			gsap.to(this.$refs.countdown as HTMLDivElement, {duration:.5, y:"-100%", onComplete:()=>{
				this.countdownData = null;
				this.countdownValue = "";
			}});
		}

		this.configCountdown = e.data.overlayParams;

		this.styleNode!.innerHTML = `
		@font-face {
			font-family: "custom-font";
			src: local("${this.configCountdown.textFont}");
		}`;
	}

	public computeValues():void {
		if(this.countdownData && this.countdownData.startAt_ms) {
			let elapsed = 0;
			if(this.countdownData.paused) {
				elapsed = (this.countdownData.pausedAt_ms! - this.countdownData.startAt_ms + this.countdownData.offset_ms);
			}else{
				elapsed = Date.now() - this.countdownData.startAt_ms
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
			let elapsed = 0
			if(this.timerData.paused) {
				elapsed = Math.floor((this.timerData.pausedAt_ms! - this.timerData.startAt_ms + this.timerData.offset_ms)/1000)*1000;
			}else{
				elapsed = Math.floor((Date.now() - this.timerData.startAt_ms + this.timerData.offset_ms)/1000)*1000;
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
