<template>
	<div class="timercountdowninfo"
	@mouseenter="mainHover = true"
	@mouseleave="mainHover = false">
		<div class="timer" v-if="activeTimers.length > 0"
		:class="{paused:activeTimers[0].paused}"
		v-tooltip="{content:activeTimers[0].title, placement:'left'}"
		@mouseenter.capture="idToHover[activeTimers[0].id] = true"
		@mouseleave.capture="idToHover[activeTimers[0].id] = false"
		@click="$store.timers.timerStop(activeTimers[0].id)">
			<Icon name="countdown" alt="countdown" v-if="activeTimers[0].type == 'countdown'" />
			<Icon name="timer" alt="timer" v-else />
			<div v-if="!idToHover[activeTimers[0].id]">{{idToLabel[activeTimers[0].id]}}</div>
			<div v-if="idToHover[activeTimers[0].id]">{{ $t("global.stop") }}</div>
			<div v-if="activeTimers.length > 1" class="more">
				<div class="arrow">▲</div>
				<div class="label">+{{ activeTimers.length-1 }}</div>
			</div>
		</div>

		<div class="list" v-if="activeTimers.length > 1 && mainHover">
			<template v-for="(timer, index) in activeTimers">
				<div class="timer"
				v-if="index > 0"
				:key="timer.id"
				:class="{paused:timer.paused}"
				v-tooltip="{content:timer.title, placement:'left'}"
				@mouseenter="idToHover[timer.id] = true"
				@mouseleave="idToHover[timer.id] = false"
				@click="$store.timers.timerStop(timer.id)">
					<Icon name="countdown" alt="countdown" v-if="timer.type == 'countdown'" />
					<Icon name="timer" alt="timer" v-else />
					<div v-if="!idToHover[timer.id]">{{idToLabel[timer.id]}}</div>
					<div v-if="idToHover[timer.id]">{{ $t("global.stop") }}</div>
				</div>
			</template>
		</div>

	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import { TTButton } from '../TTButton.vue';

@Component({
	components:{
		Icon,
		TTButton,
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
			return durationsCache[a.id] - durationsCache[b.id]
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

		* {
			pointer-events: none;
		}

		.icon {
			height: 1em;
			width: 1em;
			object-fit: fill;
			padding-right: .3em;
		}

		&.paused {
			background-color: var(--color-secondary-fader);
		}
	}

	.more {
		display: flex;
		flex-direction: column;
		margin-left: .2em;
		align-items: center;
		.arrow {
			font-size: .8em;
		}
		.label {
			color: var(--color-light);
			padding: .1em .3em;
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
