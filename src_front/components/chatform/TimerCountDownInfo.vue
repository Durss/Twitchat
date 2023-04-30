<template>
	<div class="timercountdowninfo">
		<div class="timer" v-if="$store('timer').timerStartDate > 0"
		@mouseenter="hoverTimer = true"
		@mouseleave="hoverTimer = false">
			<img src="@/assets/icons/timer.svg" alt="timer">
			<div v-if="!hoverTimer">{{timer}}</div>
			<div v-if="hoverTimer" @click="stopTimer()">{{ $t("global.stop") }}</div>
		</div>

		<div class="countdown" v-if="$store('timer').countdown"
		@mouseenter="hoverCountdown = true"
		@mouseleave="hoverCountdown = false">
			<img src="@/assets/icons/countdown.svg" alt="countdown">
			<div v-if="!hoverCountdown">{{countdown}}</div>
			<div v-if="hoverCountdown" @click="stopCountdown()">{{ $t("global.stop") }}</div>
		</div>
	</div>
</template>

<script lang="ts">
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
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
		watch(() => this.$store("timer").timerOffset, () => this.computeValues() );
		watch(() => this.$store("timer").timerStartDate, () => this.computeValues() );
		watch(() => this.$store("timer").countdown, () => this.computeValues(), {deep:true} );
	}

	public beforeUnmount():void {
		clearInterval(this.interval);
	}

	public computeValues():void {
		const countdown = this.$store("timer").countdown;
		if(countdown) {
			const ellapsed = Date.now() - countdown.startAt_ms;
			const remaining = Math.ceil((countdown.duration_ms - ellapsed)/1000)*1000;
			this.countdown = Utils.formatDuration(remaining);
		}
		const start = this.$store("timer").timerStartDate;
		if(start) {
			const offset = this.$store("timer").timerOffset;
			let ellapsed = Math.floor((Date.now() - start + offset)/1000)*1000;
			this.timer = Utils.formatDuration(ellapsed);
		}
	}

	public stopTimer():void { this.$store("timer").timerStop() }
	public stopCountdown():void { this.$store("timer").countdownStop() }

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
		color: var(--color-light);
		margin-left: 5px;
		font-size: .9em;
		padding: .35em;
		border-radius: var(--border-radius);
		background-color: var(--color-light-fadest);
		font-family: var(--font-roboto);
		text-transform: uppercase;

		img {
			height: 1em;
			width: 1em;
			object-fit: fill;
			margin-right: .3em;
		}
	}

}
</style>