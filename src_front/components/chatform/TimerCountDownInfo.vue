<template>
	<div class="timercountdowninfo">
		<div class="timer" v-if="timerRef?.startAt_ms"
		@mouseenter="hoverTimer = true"
		@mouseleave="hoverTimer = false">
			<Icon name="timer" alt="timer" />
			<div v-if="!hoverTimer">{{timer}}</div>
			<div v-if="hoverTimer" @click="stopTimer()">{{ $t("global.stop") }}</div>
		</div>

		<div class="countdown" v-if="countdownRef?.startAt_ms"
		@mouseenter="hoverCountdown = true"
		@mouseleave="hoverCountdown = false">
			<Icon name="countdown" alt="countdown" />
			<div v-if="!hoverCountdown">{{countdown}}</div>
			<div v-if="hoverCountdown" @click="stopCountdown()">{{ $t("global.stop") }}</div>
		</div>
	</div>
</template>

<script lang="ts">
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{
		Icon,
	}
})
class TimerCountDownInfo extends Vue {

	public timer:string = "";
	public countdown:string = "";
	public hoverTimer:boolean = false;
	public hoverCountdown:boolean = false;
	public timerRef:TwitchatDataTypes.TimerData|null = null;
	public countdownRef:TwitchatDataTypes.TimerData|null = null;

	private interval:number = -1;


	public mounted():void {
		this.timerRef = this.$store.timers.timerList.find(t => t.type === "timer" && t.isDefault)!;
		this.countdownRef = this.$store.timers.timerList.find(t => t.type === "countdown" && t.isDefault)!;

		this.interval = window.setInterval(()=> {
			this.computeValues();
		}, 1000);

		this.computeValues();

		watch(() => this.timerRef, () => this.computeValues(), {deep:true} );
		watch(() => this.countdownRef, () => this.computeValues(), {deep:true} );
	}

	public beforeUnmount():void {
		clearInterval(this.interval);
	}

	public computeValues():void {
		this.countdown = this.$store.timers.getTimerComputedValue(this.countdownRef!.id).duration_str;
		this.timer = this.$store.timers.getTimerComputedValue(this.timerRef!.id).duration_str;
	}

	public stopTimer():void { this.$store.timers.timerStop(this.timerRef!.id) }
	public stopCountdown():void { this.$store.timers.timerStop(this.countdownRef!.id) }

}
export default toNative(TimerCountDownInfo);
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
		color: var(--color-text);
		margin-left: 5px;
		font-size: .9em;
		padding: .35em;
		border-radius: var(--border-radius);
		color: var(--color-light);
		background-color: var(--color-secondary);
		font-family: var(--font-roboto);
		text-transform: uppercase;

		.icon {
			height: 1em;
			width: 1em;
			object-fit: fill;
			margin-right: .3em;
		}
	}

}
</style>
