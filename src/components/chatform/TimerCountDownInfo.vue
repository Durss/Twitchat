<template>
	<div class="timercountdowninfo">
		<div class="timer" v-if="$store.state.timerStart > 0"
		@mouseenter="hoverTimer = true"
		@mouseleave="hoverTimer = false">
			<img src="@/assets/icons/timer.svg" alt="timer">
			<div v-if="!hoverTimer">{{timer}}</div>
			<div v-if="hoverTimer" @click="stopTimer()">STOP</div>
		</div>

		<div class="countdown" v-if="$store.state.countdown"
		@mouseenter="hoverCountdown = true"
		@mouseleave="hoverCountdown = false">
			<img src="@/assets/icons/countdown.svg" alt="countdown">
			<div v-if="!hoverCountdown">{{countdown}}</div>
			<div v-if="hoverCountdown" @click="stopCountdown()">STOP</div>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/utils/StoreProxy';
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
		watch(() => StoreProxy.store.state.timerStart, () => this.computeValues() );
		watch(() => StoreProxy.store.state.countdown, () => this.computeValues() );
	}

	public beforeUnmount():void {
		clearInterval(this.interval);
	}

	public computeValues():void {
		if(StoreProxy.store.state.countdown) {
			const ellapsed = Date.now() - StoreProxy.store.state.countdown.startAt;
			const remaining = Math.ceil((StoreProxy.store.state.countdown.duration - ellapsed)/1000)*1000;
			this.countdown = Utils.formatDuration(remaining);
		}
		if(StoreProxy.store.state.timerStart) {
			let ellapsed = Math.floor((Date.now() - StoreProxy.store.state.timerStart as number)/1000)*1000;
			this.timer = Utils.formatDuration(ellapsed);
		}
	}

	public stopTimer():void { StoreProxy.store.dispatch("stopTimer") }
	public stopCountdown():void { StoreProxy.store.dispatch("stopCountdown") }

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