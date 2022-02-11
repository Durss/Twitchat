<template>
	<div class="progressbar">
		<div class="fill" :style="getStyles()"></div>
		<div class="timer" v-if="percent<=1 && duration != undefined">{{timeLeft}}s</div>
	</div>
</template>

<script lang="ts">
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		percent:Number,
		duration:Number,
	},
	components:{}
})
export default class ProgressBar extends Vue {

	public percent!:number;
	public duration!:number;//In ms

	public get timeLeft():string {
		return Utils.formatDuration(this.duration * (1-this.percent))
	}

	public getStyles():unknown {
		return {
			transform: `scaleX(${(1-this.percent) * 100}%)`,
		}
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

	.fill {
		height: 3px;
		width: 100%;
		background-color: darken(@mainColor_normal, 20%);
		transform-origin: left;
		will-change: transform;
	}

	.timer {
		position: absolute;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: @mainColor_light;
		color:@mainColor_normal;
		padding: 3px 6px;
		border-radius: 15px;
		font-size: 15px;
		font-variant-numeric: tabular-nums;
	}
}
</style>