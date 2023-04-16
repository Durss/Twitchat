<template>
	<div :class="classes">
		<div class="fill" :style="getStyles()"></div>
		<div class="timer" v-if="percent<=1 && duration != undefined">{{timeLeft}}</div>
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

	@Prop({
			type:Number,
			default:0,
		})
	public percent!:number;
	@Prop({
			type:Number,
			default:1,
		})
	public duration!:number;//In ms
	@Prop({
			type:Boolean,
			default:false,
		})
	public green!:boolean;

	public get timeLeft():string {
		return Utils.formatDuration(this.duration * (1-this.percent))
	}

	public getStyles():StyleValue {
		const percent = Math.min(1, (1-this.percent)) * 100;
		return {
			transform: `scaleX(${percent}%)`,
		}
	}

	public get classes():string[] {
		const res = ["progressbar"];
		if(this.green) res.push('green');
		return res;
	}

}
</script>

<style scoped lang="less">
.progressbar{
	height: 5px;
	width: 100%;
	border-radius: 10px;
	background: white;
	padding: 1px;
	position: relative;

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
		height: 3px;
		width: 100%;
		background-color: var(--windowStateColor);
		transform-origin: left;
		will-change: transform;
	}

	.timer {
		font-family: var(--font-azeret);
		position: absolute;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: var(--mainColor_light);
		padding: 3px 6px;
		border-radius: 15px;
		font-size: 15px;
		font-variant-numeric: tabular-nums;
	}
}
</style>