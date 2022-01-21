<template>
	<div class="progressbar">
		<div class="fill" :style="getStyles()"></div>
	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		percent:Number
	},
	components:{}
})
export default class ProgressBar extends Vue {

	public percent!:number;

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
	.fill {
		height: 3px;
		width: 50%;
		background-color: darken(@mainColor_normal, 20%);
		margin-right: 0;
		margin-left: auto;
		transform-origin: right;
		will-change: transform;
	}
}
</style>