<template>
	<div class="overlayadbreak" v-if="show">

		<template v-if="component == 'bar'">
			<div id="progress"
				ref="holder"
				:class="progressClasses"
				:style="progressStyles">
				<span v-if="label" key="labelbar"
					ref="label" class="label"
					:style="labelStyles"
					v-html="label"></span>
			</div>

		</template>

		<div v-if="component == 'text'"
		id="text"
		ref="holder"
		:class="progressClasses"
		:style="progressStyles">
			<span class="label" key="labeltext"
			:style="labelStyles"
			v-if="label" v-html="label"></span>
		</div>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import gsap from 'gsap/all';
import type { StyleValue } from 'vue';
import { Component } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay.vue';

@Component({
	components:{},
	emits:[],
})
export default class OverlayAdBreak extends AbstractOverlay {

	public show:boolean = false;
	public label:string = "";
	public adType:AdType = "none";
	public component:TwitchatDataTypes.AdBreakOverlayData["runningStyle"] = "bar";
	public adData:TwitchatDataTypes.CommercialData|null = null;
	public parameters:TwitchatDataTypes.AdBreakOverlayData|null = null;
	
	private dateEnd:number = 0;
	private dateStart:number = 0;
	private disposed:boolean = false;
	private progressPercent:number = 0;

	private adBreakDataHandler!:(e:TwitchatEvent) => void;
	private adBreakParamsHandler!:(e:TwitchatEvent) => void;
	private overlayPresenceHandler!:(e:TwitchatEvent)=>void;

	public get progressClasses():string[] {
		const res:string[] = [this.adType];
		const style = this.adType == "approaching"? this.parameters?.approachingStyle : this.parameters?.runningStyle;
		const placement = this.adType == "approaching"? this.parameters?.approachingPlacement : this.parameters?.runningPlacement;
		res.push(style!, "position-"+placement);
		return res;
	}

	public get progressStyles():StyleValue {
		const placement	= this.adType == "approaching"? this.parameters?.approachingPlacement : this.parameters?.runningPlacement;
		const thickness	= (this.adType == "approaching"? this.parameters?.approachingThickness : this.parameters?.runningThickness) || 20;
		const color		= this.adType == "approaching"? this.parameters?.approachingColor : this.parameters?.runningColor;
		const res:StyleValue = {};
		res.backgroundColor = color;
		if(this.component === "bar") {
			switch(placement) {
				case "t":
				case "b": {
					res.width = "100vw";
					res.transform = "scaleX("+this.progressPercent+")";
					res.height = thickness+"px";
					break
				}
				// case "l": 
				case "r": {
					res.height = "100vh";
					res.transform = "scaleY("+this.progressPercent+")";
					res.width = thickness+"px";
					break
				}
				case "l": {
					res.height = "100vh";
					res.transform = "scaleY("+this.progressPercent+")";
					res.width = thickness+"px";
					break
				}
			}
		}
		return res;
	}

	public get labelStyles():StyleValue {
		const placement	= this.adType == "approaching"? this.parameters?.approachingPlacement : this.parameters?.runningPlacement;
		const fontSize	= (this.adType == "approaching"? this.parameters?.approachingSize : this.parameters?.runningSize) || 20;
		const color		= this.adType == "approaching"? this.parameters?.approachingColor : this.parameters?.runningColor;
		const res:StyleValue = {};
		res.fontSize = fontSize+"px";
		if(this.component === "bar") {
			switch(placement) {
				case "t":
				case "b": {
					res.transform = "scaleX("+1/this.progressPercent+")";
					break
				}
				case "l":
				case "r": {
					res.transform = "scaleY("+1/this.progressPercent+")";
					// if(placement == "l") {
					// 	res.left = "10px";
					// }
					break
				}
			}
		}
		//Define text color based on background's brightness
		const hsl = Utils.rgb2hsl(parseInt((color || "#ffffff").replace("#", ""), 16));
		const minL = .65;
		if(hsl.l < minL) {
			res.color = "#ffffff";
		}else{
			res.color = "#000000";
		}
		return res;
	}

	public beforeMount(): void {
		this.adBreakDataHandler = (e:TwitchatEvent) => this.onAdBreak(e);
		this.adBreakParamsHandler = (e:TwitchatEvent) => this.onParameters(e);
		this.overlayPresenceHandler = ()=>{ PublicAPI.instance.broadcast(TwitchatEvent.AD_BREAK_OVERLAY_PRESENCE); }
		PublicAPI.instance.addEventListener(TwitchatEvent.AD_BREAK_DATA, this.adBreakDataHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.AD_BREAK_OVERLAY_PARAMETERS, this.adBreakParamsHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_AD_BREAK_OVERLAY_PRESENCE, this.overlayPresenceHandler);
		this.renderFrame();

		/*
		this.adData = {
			adCooldown_ms:0,
			currentAdDuration_ms: 0,
			currentAdStart_at: 0,
			nextAdStart_at: Date.now() + 30000,
			nextSnooze_at: 0,
			remainingSnooze: 3,
		};
		//*/
		/*
		this.adData = {
			adCooldown_ms:0,
			// currentAdDuration_ms: 10 * 60000,
			// currentAdStart_at: Date.now() - 2 * 60000,
			currentAdDuration_ms: 100000,
			currentAdStart_at: Date.now(),
			nextAdStart_at: 0,
			nextSnooze_at: 0,
			remainingSnooze: 3,
		};
		//*/

	}

	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_AD_BREAK_OVERLAY_PARAMETERS);
	}

	public beforeUnmount(): void {
		this.disposed = true;
		PublicAPI.instance.removeEventListener(TwitchatEvent.AD_BREAK_DATA, this.adBreakDataHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.AD_BREAK_OVERLAY_PARAMETERS, this.adBreakParamsHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GET_AD_BREAK_OVERLAY_PRESENCE, this.overlayPresenceHandler);
	}

	/**
	 * Called when API sends fresh overlay parameters
	 */
	private async onParameters(e:TwitchatEvent):Promise<void> {
		if(e.data) {
			const prevStyle = this.adType == 'approaching'? this.parameters?.approachingStyle : this.parameters?.runningStyle;
			this.parameters = (e.data as unknown) as TwitchatDataTypes.AdBreakOverlayData;
			const newStyle = this.adType == 'approaching'? this.parameters!.approachingStyle : this.parameters!.runningStyle;
			if(prevStyle != newStyle) {
				this.populate();
			}
		}
	}
	
	/**
	 * Called when API sends an ad break info
	 */
	private onAdBreak(e:TwitchatEvent):void {
		if(e.data) {
			this.adData = (e.data as unknown) as TwitchatDataTypes.CommercialData;
			this.populate();
		}
	}

	private populate():void {
		gsap.killTweensOf(this);

		if(!this.adData) return;
		
		//Check if an ad is rolling
		const isAdRunning	= this.adData.currentAdStart_at + this.adData.currentAdDuration_ms - Date.now() > 0 && this.adData.currentAdStart_at > 0;
		//Check if an ad is coming in less than a minute
		const isAdApproaching	= this.adData.nextAdStart_at > 0;

		if(!isAdRunning && !isAdApproaching) {
			this.adType = "none";
			return;
		}
		if(isAdRunning && this.parameters?.showRunning !== true) {
			this.adType = "none";
			return;
		}
		if(isAdApproaching && this.parameters?.showApproaching !== true) {
			this.adType = "none";
			return;
		}

		const adType		= isAdRunning? "running" : "approaching";
		const delay			= isAdRunning? 0 :  (this.parameters?.approachingDelay || 30) * 1000;
		const adDuration	= isAdRunning? this.adData.currentAdDuration_ms : Math.min(this.adData.nextAdStart_at - Date.now(), delay);
		// const timeLeft		= Math.max(0, Math.round(date - Date.now()));
		this.component		= adType == 'approaching'? this.parameters!.approachingStyle : this.parameters!.runningStyle;
		this.dateStart		= isAdRunning? this.adData.currentAdStart_at : Math.max(Date.now(), this.adData.nextAdStart_at - delay);
		this.dateEnd		= this.dateStart + adDuration;
		this.adType			= adType;
		this.progressPercent= 0;

		/*
		gsap.to(this, {delay, duration:this.dateEnd, timeLeft:0, progressPercent:100, ease:Linear.easeNone, onStart:()=>{
			
			if(this.component == "text") {
				this.$nextTick().then(()=>{
					this.showCard();
				})
			}
		}, onComplete:()=>{
			if(this.component == "text") {
				this.hideCard();
			}else{
				this.adType = "none";
			}
		}});
		//*/
	}

	private renderFrame():void {
		if(this.disposed) return;

		requestAnimationFrame(()=>this.renderFrame());
		
		if(this.dateStart > Date.now() || this.dateEnd < Date.now()) {
			if(this.component == "text") {
				//Hid if progress greater than 0 to avoid spamming hideCard() call indefinitely
				if(this.progressPercent > 0) this.hideCard();
			}else{
				this.show = false;
			}
			this.progressPercent = 0;
			return;
		}

		if(this.component == "text") {
			this.showCard();
		}else{
			this.show = true;
		}
		
		const duration = (this.dateEnd - this.dateStart);
		this.progressPercent = (Date.now() - this.dateStart) / duration;
		
		let label = this.adType == "approaching"? this.parameters?.approachingLabel : this.parameters?.runningLabel;
		this.label = label?.replace(/\{TIMER\}/gi, Utils.formatDuration(900 + duration * (1- this.progressPercent))) || "";
	}

	/**
	 * Open the text card
	 */
	private async showCard():Promise<void> {
		if(this.show) return;
		this.show = true;
		await this.$nextTick();
		const placement = this.adType == "approaching"? this.parameters?.approachingPlacement : this.parameters?.runningPlacement;
		const holder = this.$refs.holder as HTMLDivElement;
		if(!holder || !placement) return;

		const bounds = holder.getBoundingClientRect();

		if(placement.indexOf("r") > -1){
			gsap.from(holder, {x:"100%", duration:.35, ease:"sine.out"});
		}else
		if(placement.indexOf("l") > -1){
			gsap.from(holder, {x:-(bounds.x+bounds.width), duration:.35, ease:"sine.out"});
		}else
		if(placement == "t"){
			gsap.from(holder, {y:-(bounds.y+bounds.height), duration:.35, ease:"sine.out"});
		}else
		if(placement == "b"){
			gsap.from(holder, {y:"100%", duration:.35, ease:"sine.out"});
		}else
		if(placement == "m"){
			gsap.from(holder, {scale:0, duration:.35, clearProps:"transform", ease:"back.out"});
		}
	}

	/**
	 * Closes the text card
	 */
	private async hideCard():Promise<void> {
		if(!this.show) return;
		const placement = this.adType == "approaching"? this.parameters?.approachingPlacement : this.parameters?.runningPlacement;
		const holder = this.$refs.holder as HTMLDivElement;
		if(!holder || !placement) return;

		if(placement.indexOf("r") > -1){
			gsap.to(holder, {x:"100%", duration:.35, ease:"sine.in", onComplete:()=>{ this.adType = "none"; }});
		}else
		if(placement.indexOf("l") > -1){
			gsap.to(holder, {x:"-100%", duration:.35, ease:"sine.in", onComplete:()=>{ this.adType = "none"; }});
		}else
		if(placement == "t"){
			gsap.to(holder, {y:"-100%", duration:.35, ease:"sine.in", onComplete:()=>{ this.adType = "none"; }});
		}else
		if(placement == "b"){
			gsap.to(holder, {y:"100%", duration:.35, ease:"sine.in", onComplete:()=>{ this.adType = "none"; }});
		}else
		if(placement == "m"){
			gsap.to(holder, {scale:0, duration:.35, ease:"back.in", onComplete:()=>{ this.adType = "none"; }});
		}
		await Utils.promisedTimeout(350);
		this.show = false;
	}
}

type AdType = "approaching"|"running"|"none";
</script>

<style scoped lang="less">
.overlayadbreak{
	font-variant-numeric: tabular-nums;
	.bar {
		position: absolute;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-end;
		transform-origin: top left;

		.label {
			z-index: 1;
			padding: .5em;
			border-bottom-left-radius: .5em;
			border-bottom-right-radius: .5em;
			margin: auto 0;
			background-color: inherit;
			// background-color: rgba(0, 255, 0, .5);
			transform-origin: top right;
		}

		&.position-b {
			bottom: 0;
		}
		&.position-b {
			display: flex;
			flex-direction: column;
			.label {
				align-self: flex-end;
				border-radius: 0;
				border-top-left-radius: .5em;
				border-top-right-radius: .5em;
			}
		}
		&.position-l {
			left: 0;
			display: flex;
			flex-direction: column;
			transform-origin: bottom left;
			.label {
				align-self: flex-end;
				writing-mode: vertical-lr;
				text-orientation: mixed;
				margin: auto;
				margin-top: 0;
				border-radius: 0;
				border-top-right-radius: .5em;
				border-bottom-right-radius: .5em;
			}
		}
		&.position-r {
			right: 0;
			transform-origin: bottom right;
			.label {
				writing-mode: vertical-rl;
				text-orientation: mixed;
				margin: auto;
				margin-bottom: 0;
				border-radius: 0;
				border-top-left-radius: .5em;
				border-bottom-left-radius: .5em;
			}
		}
		// &.position-r,
		// &.position-l {
		// 	.label {
		// 		transform-origin: top right;
		// 		transform: rotate(90deg);
		// 		min-width: 100px;
		// 		margin: 0 auto;
		// 	}
		// }

		// &.labelOverflow {
		// 	.label {
		// 		top: 100%;
		// 		right: 0;
		// 		padding: 0 .5em .5em .5em;
		// 		border-bottom-left-radius: .5em;
		// 		border-bottom-right-radius: .5em;
		// 		background-color: inherit;
		// 	}
		// }
	}

	.text {
		@margin: 1vh;
		@borderRadius: .5em;

		position: absolute;
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		font-size: 1.25em;
		background-color: var(--color-light);
		padding: .5em;
		border-top-right-radius: @borderRadius;
		border-bottom-right-radius: @borderRadius;
		// box-shadow: 0 0 .5em rgba(0, 0, 0, 1);
		max-width: calc(60vw - @margin);
	
		&.position-tl {
			top: @margin;
			left: 0;
		}
	
		&.position-t {
			top: 0;
			right: 50%;
			transform: translateX(50%);
			border-radius: 0;
			border-bottom-right-radius: @borderRadius;
			border-bottom-left-radius: @borderRadius;
		}
	
		&.position-tr {
			top: .5em;
			right: 0;
			border-radius: 0;
			border-top-left-radius: @borderRadius;
			border-bottom-left-radius: @borderRadius;
		}
	
		&.position-l {
			top: 50%;
			left: 0;
			transform: translateY(-50%);
		}
	
		&.position-m {
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			border-radius: @borderRadius;
		}
	
		&.position-r {
			top: 50%;
			right: 0;
			transform: translateY(-50%);
			border-radius: 0;
			border-top-left-radius: @borderRadius;
			border-bottom-left-radius: @borderRadius;
		}
	
		&.position-bl {
			bottom: @margin;
			left: 0;
		}
	
		&.position-b {
			bottom: 0;
			right: 50%;
			transform: translateX(50%);
			border-radius: 0;
			border-top-right-radius: @borderRadius;
			border-top-left-radius: @borderRadius;
		}
	
		&.position-br {
			bottom: .5em;
			right: 0;
			border-radius: 0;
			border-top-left-radius: @borderRadius;
			border-bottom-left-radius: @borderRadius;
		}
	}
	
}
</style>