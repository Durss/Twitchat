<template>
	<div :class="classes">
		<div class="fill" :style="getBarStyles()"></div>
		<div class="timer" ref="timer" :style="getTimerStyles()" v-if="percent<=1 && duration != undefined">{{timeLeft}}</div>
	</div>
</template>

<script lang="ts">
import Utils from '@/utils/Utils';
import type { StyleValue } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{}
})
export default class ProgressBar extends Vue {

	@Prop({type:Number,default:0})
	public percent!:number;

	@Prop({ type:Number, default:1})
	public duration!:number;//In ms

	@Prop({type:Boolean, default:false})
	public cyan!:boolean;

	public get timeLeft():string { return Utils.formatDuration(this.duration * this.elapsedPercent) }

	public get elapsedPercent():number { return Math.max(0, Math.min(1, (1-this.percent))); }

	public get classes():string[] {
		const res = ["progressbar"];
		if(this.cyan) res.push('green');
		return res;
	}

	public getBarStyles():StyleValue {
		return {
			transform: `scaleX(${this.elapsedPercent*100}%)`,
		}
	}

	public getTimerStyles():StyleValue {
		if(this.$refs.timer) {
			let parent = (this.$el as HTMLElement).getBoundingClientRect();
			let bounds = (this.$refs.timer as HTMLElement).getBoundingClientRect();
			let barSize = this.elapsedPercent * parent.width;
			let px = barSize - bounds.width;
			if(px < 0) px -= barSize - bounds.width;
			return {
				transform: "translateX("+px+"px)",
			}
		}else{
			return {
				right: 0,
			}
		}
	}
}
</script>

<style scoped lang="less">
.progressbar{
	height: 5px;
	width: 100%;
	background: var(--color-dark);
	position: relative;
	@shadow: 0 4px 4px rgba(0, 0, 0, .5);

	&.green {
		@c: darken(#00f0f0, 15%);
		.fill {
			background-color: @c;
		}
		.timer {
			color: @c;
		}
	}

	.fill {
		height: 4px;
		width: 100%;
		background-color: var(--color-primary);
		transform-origin: left;
		will-change: transform;
		box-shadow: @shadow;
	}

	.timer {
		position: absolute;
		font-family: var(--font-roboto);
		background-color: var(--color-primary);
		color: var(--color-light);
		font-size: 15px;
		padding: 2px 5px;
		border-bottom-left-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
		box-shadow: @shadow;
		will-change: transform;
	}
}
</style>