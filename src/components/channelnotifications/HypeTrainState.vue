<template>
	<div class="hypetrainstate" :style="styles">
		
		<div class="content" v-if="trainData.state === 'APPROACHING'">
			<img src="@/assets/icons/train.svg" alt="train" class="icon">
			<h1>Hype train Approaching!</h1>
		</div>
		
		<div class="content" v-if="trainData.state === 'COMPLETED'">
			<img src="@/assets/icons/train.svg" alt="train" class="icon">
			<h1>
				Hype train complete<br />
				<span class="subtitle">Level <strong>{{completeLevel}}</strong> reached</span>
			</h1>
		</div>
		
		<div class="content" v-if="trainData.state === 'EXPIRE'">
			<img src="@/assets/icons/train.svg" alt="train" class="icon">
			<h1>Hype train went away...</h1>
		</div>
		
		<div class="content" v-if="trainProgress">
			<img src="@/assets/icons/train.svg" alt="train" class="icon">
			<h1>Hype train level {{trainData.level}}</h1>
			<p class="percent">{{roundProgressPercent}}%</p>
		</div>

		<ProgressBar v-if="trainProgress || trainData.state === 'APPROACHING'" class="progressBar" :duration="trainData.timeLeft*1000" :percent="timerPercent" />
	</div>
</template>

<script lang="ts">
import store, { HypeTrainStateData } from '@/store';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import ProgressBar from '../ProgressBar.vue';

@Options({
	props:{},
	components:{
		ProgressBar,
	}
})
export default class HypeTrainState extends Vue {

	// state:"APPROACHING" | "START" | "PROGRESSING" | "LEVEL_UP" | "COMPLETED" | "EXPIRE";

	public timerPercent:number = 0;
	public progressPercent:number = 0;

	public get completeLevel():number {
		let level = this.trainData.level;
		if(this.progressPercent < 100) level --;
		return level;
	}

	public get trainProgress():boolean {
		return this.trainData.state == 'START' || this.trainData.state == 'PROGRESSING' || this.trainData.state == 'LEVEL_UP';
	}

	public get trainData():HypeTrainStateData {
		return store.state.hypeTrain as HypeTrainStateData;
	}

	public get duration():string {
		return Utils.formatDuration(this.trainData.timeLeft * (1-this.timerPercent) * 1000);
	}

	public get roundProgressPercent():number {
		return Math.floor(this.progressPercent);
	}

	public get styles():unknown {
		if(this.trainProgress) {
			return {
				backgroundSize: `${this.progressPercent}% 100%`,
			}
		}
		return {};
	}

	public mounted():void {
		this.dataChange();
		watch(()=>store.state.hypeTrain, ()=>this.dataChange());
	}

	public dataChange():void {
		const ellapsed = new Date().getTime() - this.trainData.started_at;
		const duration = this.trainData.timeLeft * 1000;
		const timeLeft = duration - ellapsed
		this.timerPercent = ellapsed/duration;
		gsap.killTweensOf(this);

		gsap.to(this, {timerPercent:1, duration:timeLeft/1000, ease:"linear"});

		const p = Math.floor(this.trainData.currentValue/this.trainData.goal * 100);
		gsap.to(this, {progressPercent:p, ease:"sine.inOut", duration:.5});
	}

}
</script>

<style scoped lang="less">
.hypetrainstate{
	color: @mainColor_light;
	padding: 10px;
	border-top-left-radius: 10px;
	border-top-right-radius: 10px;
	@c: darken(@mainColor_normal, 10%);
	background-color: darken(@mainColor_normal, 20%);
	background-image: linear-gradient(to right, @c 100%, @c 100%);
	background-size: 0% 100%;
	background-repeat: no-repeat;
	display: flex;
	flex-direction: column;
	justify-content: center;
	position: relative;

	.progressBar {
		margin: 10px 0;
	}

	.content {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;

		h1 {
			text-align: center;
			.subtitle {
				font-size: .9em;
				font-weight: normal;
			}
		}
		
		.icon {
			height: 25px;
			margin-right: 10px;
		}

		.duration {
			// font-size: .8em;
			margin-left: 15px;
		}

		.percent {
			font-size: 1.25em;
			margin-left: 15px;
			font-weight: bold;
			background-color: fade(@mainColor_light, 25%);
			padding: 5px;
			border-radius: 5px;
		}
	}
	
}
</style>