<template>
	<div class="timercountdowninfo">
		<div class="timer" v-if="$store.state.timerStart > 0"
		@mouseenter="hoverTimer = true"
		@mouseleave="hoverTimer = false">
			<img src="@/assets/icons/timer.svg" alt="boost">
			<div v-if="!hoverTimer">{{timer}}</div>
			<div v-if="hoverTimer" @click="stopTimer()">STOP</div>
		</div>

		<div class="countdown" v-if="$store.state.countdown"
		@mouseenter="hoverCountdown = true"
		@mouseleave="hoverCountdown = false">
			<img src="@/assets/icons/countdown.svg" alt="boost">
			<div v-if="!hoverCountdown">{{countdown}}</div>
			<div v-if="hoverCountdown" @click="stopCountdown()">STOP</div>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{}
})
export default class TimerCountDownInfo extends Vue {
	
	public timer:string = "";
	public countdown:string = "";
	public hoverTimer:boolean = false;
	public hoverCountdown:boolean = false;
	
	private interval:number = -1;

	public mounted():void {
		this.interval = setInterval(()=> {
			this.computeValues();
		}, 1000);
		this.computeValues();
		watch(() => store.state.timerStart, () => this.computeValues() );
		watch(() => store.state.countdown, () => this.computeValues() );
	}

	public beforeUnmount():void {
		clearInterval(this.interval);
	}

	public computeValues():void {
		if(store.state.countdown) {
			const ellapsed = Date.now() - store.state.countdown.start;
			const remaining = Math.ceil((store.state.countdown.duration - ellapsed)/1000)*1000;
			this.countdown = Utils.formatDuration(remaining);
		}
		if(store.state.timerStart) {
			let ellapsed = Math.floor((Date.now() - store.state.timerStart as number)/1000)*1000;
			this.timer = Utils.formatDuration(ellapsed);
		}
	}

	public stopTimer():void { store.dispatch("stopTimer") }
	public stopCountdown():void { store.dispatch("stopCountdown") }

}
</script>

<style scoped lang="less">
.timercountdowninfo{
	display: flex;
	flex-direction: row;
	.timer, .countdown {
		cursor: pointer;
		display: flex;
		flex-direction: row;
		align-items: center;
		white-space: nowrap;
		color: @mainColor_light;
		margin-left: 5px;
		font-size: .65em;
		padding: 5px;
		border-radius: 5px;
		background-color: fade(@mainColor_dark, 50%);
		font-family: 'Roboto';

		img {
			height: 1em;
			width: 1em;
			object-fit: contain;
			margin-right: .3em;
		}
	}

}
</style>