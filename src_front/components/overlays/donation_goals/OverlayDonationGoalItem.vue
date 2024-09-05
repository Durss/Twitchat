<template>
	<div class="overlaydonationgoalitem"
	v-if="data.visible">
		<div ref="holder"
		:style="styles"
		:class="{holder:true, secret:data.goalItem.secret && data.percent < 1}">
			<span class="amount">{{ data.goalItem.amount }}€</span>
			<span class="title">{{ data.goalItem.title }}</span>
			<div class="hideTimer" v-if="data.hidePercent > 0" :style="{width:data.hidePercent+'%'}"></div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import { watch, type CSSProperties } from 'vue';
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["complete"],
})
class OverlayDonationGoalItem extends Vue {

	@Prop()
	public overlayParams!:TwitchatDataTypes.DonationGoalOverlayConfig;

	@Prop()
	public data!:TwitchatDataTypes.DonationGoalOverlayItem;

	@Prop()
	public color!:string;

	@Prop()
	public index!:number;
	
	public localPercent:number = 0;
	
	public get color_fill():string { return this.color+"30"; }
	
	public get styles():CSSProperties {
		return {
			backgroundPositionX: (1 - this.localPercent)*100+"%",
		}
	}

	public get color_background():string {
		const hsl = Utils.rgb2hsl(parseInt(this.color.replace("#", ""), 16));
		hsl.s *= .6;
		if(hsl.l > .75) hsl.l -= .6;
		else hsl.l += .6;
		hsl.l = Math.max(.1, Math.min(.9, hsl.l));
		hsl.s = Math.max(0, Math.min(1, hsl.s));
		const color = Utils.hsl2rgb(hsl.h, hsl.s, hsl.l).toString(16);
		return "#"+color.padStart(6, "0");
	}

	public beforeMount():void {
		this.localPercent = this.data.percent;
		if(this.data.percent >= 1) {
			this.data.visible = false;
		}

		watch(()=>this.data.percent, ()=>{
			if(this.data.percent < this.localPercent) {
				// this.localPercent = this.data.percent;
				this.data.visible = true;
				this.$nextTick(()=>this.open());
			}
			gsap.killTweensOf(this);
			gsap.to(this, {localPercent:this.data.percent, duration:.5, ease:"sine.inOut", onComplete:()=>{
				if(this.localPercent >= 1) {
					this.$emit("complete");
					gsap.killTweensOf(this.data);
					gsap.fromTo(this.data, {hidePercent:100}, {hidePercent:0, duration:10, ease:"none"});
					this.close(10);
				}
			}});
		});

		watch(()=>this.data.distanceToCurrentIndex, ()=> this.onDistanceChange());
		watch(()=>this.overlayParams.limitEntryCount, ()=> this.onDistanceChange());
		watch(()=>this.overlayParams.maxDisplayedEntries, ()=> this.onDistanceChange());
	}

	public mounted():void {
		this.open();
		this.onDistanceChange();
	}

	private open():void {
		if(this.data.visible) {
			gsap.killTweensOf(this.$refs.holder as HTMLDivElement);
			gsap.to(this.$refs.holder as HTMLDivElement, {left:0, delay:this.index*.05, duration:.5, ease:"back.out"})
		}
	}

	private close(delay:number = 0):void {
		if(!this.data.visible || !this.$refs.holder) return;
		gsap.killTweensOf(this.$refs.holder as HTMLDivElement);
		gsap.to(this.$refs.holder as HTMLDivElement, {scaleY:0, marginBottom:0, height:0, duration:.35, delay, ease:"back.in", clearProps:"scaleY,marginBottom,height", onComplete:()=>{
			this.data.visible = false;
		}});
	}

	private async onDistanceChange():Promise<void> {
		if(!this.overlayParams.limitEntryCount) {
			this.data.visible = true;
			await this.$nextTick();
			this.open();
			return;
		}

		const maxDist = this.overlayParams.maxDisplayedEntries || 0;
		if(Math.abs(this.data.distanceToCurrentIndex) > maxDist) {
			this.close();
		}else if(!this.data.visible) {
			this.data.visible = true;
			await this.$nextTick();
			this.open();
		}
	}

}
export default toNative(OverlayDonationGoalItem);
</script>

<style scoped lang="less">
.overlaydonationgoalitem{
	.holder {
		gap: 1em;
		display: flex;
		flex-direction: row;
		color: v-bind(color);
		background-color: v-bind(color_background);
		background-image: linear-gradient(90deg, v-bind(color_fill) 50%, transparent 50%);
		background-position-x: 100%;
		background-size: 200%;
		align-items: center;
		padding: .5em;
		border-radius: var(--border-radius);
		width: 500px;
		border-bottom: .3em solid v-bind(color);
		// box-shadow: 0 .3em 0px v-bind(color);
		position: relative;
		left: calc(-500px - 30px);
		overflow: hidden;
		.amount {
			font-weight: bold;
			font-size: 2.5em;
			// flex-basis: 2em;
			flex-shrink: 0;
		}
		.title {
			white-space: pre-line;
			font-size: 1.5em;
			text-align: center;
			flex-grow: 1;
			font-weight: bold;
			transition: filter 2s, background-color 2s;
			span {
				background-color: transparent;
			}
		}
	
		.hideTimer {
			position: absolute;
			bottom: 0;
			left: 0;
			height: 5px;
			background: v-bind(color);
			opacity: .5;
			width: 50%;
		}
	
		&.secret {
			.title {
				display: inline;
				filter: blur(8px);
			}
		}
	}
}
</style>