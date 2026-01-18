<template>
	<div class="timercountdowninfo"
	:class="{hovered: mainHover}"
	@mouseenter="mainHover = true"
	@mouseleave="mainHover = false">
		<TimerCountDownInfoEntry class="timer"
		v-if="activeTimers.length > 0"
		:timer="activeTimers[0]"
		:label="idToLabel[activeTimers[0]!.id]">
			<div v-if="activeTimers.length > 1" class="more">
				<div class="arrow">▲</div>
				<div class="label">+{{ activeTimers.length-1 }}</div>
			</div>
		</TimerCountDownInfoEntry>

		<div class="list" v-if="activeTimers.length > 1 && mainHover">
			<TimerCountDownInfoEntry class="timer"
			v-for="(timer, index) in activeTimers.concat().splice(1)"
				:key="timer.id"
				:timer="timer"
				:label="idToLabel[timer.id]" />
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import { TTButton } from '../TTButton.vue';
import TimerCountDownInfoEntry from './TimerCountDownInfoEntry.vue';

@Component({
	components:{
		Icon,
		TTButton,
		TimerCountDownInfoEntry,
	}
})
class TimerCountDownInfo extends Vue {

	public idToHover:Record<string, boolean> = {};
	public idToLabel:Record<string, string> = {};
	public mainHover:boolean = false

	private interval:number = -1;

	public get activeTimers():TwitchatDataTypes.TimerData[] {
		const durationsCache:Record<string, number> = {};
		this.$store.timers.timerList.forEach(t => {
			if(t.startAt_ms) {
				durationsCache[t.id] = this.$store.timers.getTimerComputedValue(t.id).duration_ms;
			}
		});
		return this.$store.timers.timerList.filter(t => t.startAt_ms).sort((a,b)=> {
			if(a.paused && !b.paused) return 1;
			if(!a.paused && b.paused) return -1;
			return durationsCache[a.id]! - durationsCache[b.id]!;
		});
	}

	public mounted():void {
		this.interval = window.setInterval(()=> {
			this.computeValues();
		}, 500);

		this.computeValues();
	}

	public beforeUnmount():void {
		clearInterval(this.interval);
	}

	public computeValues():void {
		this.idToLabel = {};
		this.$store.timers.timerList.forEach(t => {
			if(t.startAt_ms) {
				this.idToLabel[t.id] = this.$store.timers.getTimerComputedValue(t.id).duration_str;
			}
		});
	}

}
export default toNative(TimerCountDownInfo);
</script>

<style scoped lang="less">
.timercountdowninfo{
	display: flex;
	flex-direction: row;
	position: relative;

	.timer {
		width: 100%;
	}
	
	&.hovered {
		min-width: 80px;
		.more {
			display: none;
		}
	}

	.more {
		display: flex;
		flex-direction: column;
		margin: -.25em 0;
		margin-left: .25em;
		align-items: center;
		.arrow {
			font-size: .65em;
		}
		.label {
			color: var(--color-light);
			border-radius: var(--border-radius);
			font-size: .7em;
			font-family: var(--font-roboto);
			text-transform: uppercase;
		}
	}

	.list {
		position: absolute;
		top: 0;
		transform: translateY(-100%);
		width: 100%;
		display: flex;
		flex-direction: column;
		.timer {
			margin-bottom: 2px;
		}
	}

}
</style>
