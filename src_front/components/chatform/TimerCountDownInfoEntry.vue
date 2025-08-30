<template>
	<tooltip :content="timer.title || 'Test tooltip'" placement="left">
		<div class="timercountdowninfoentry"
			:class="{paused:timer.paused, hovered:hover}"
			@mouseenter="hover = true"
			@mouseleave="hover = false"
			@click="$store.timers.timerStop(timer.id)">
				<Icon name="countdown" alt="countdown" v-if="timer.type == 'countdown'" />
				<Icon name="timer" alt="timer" v-else />
				<div class="value">{{label}}</div>
				<div class="stopLabel">{{ $t("global.stop") }}</div>
				<slot></slot>
		</div>
	</tooltip>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue, Prop } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
class TimerCountDownInfoEntry extends Vue {

	@Prop()
	public timer!: TwitchatDataTypes.TimerData;

	@Prop()
	public label!: string;

	public hover:boolean = false;

}
export default toNative(TimerCountDownInfoEntry);
</script>

<style scoped lang="less">
.timercountdowninfoentry{
	cursor: pointer;
	display: flex;
	position: relative;
	flex-direction: row;
	align-items: center;
	white-space: nowrap;
	color: var(--color-text);
	font-size: .9em;
	padding: .35em;
	border-radius: var(--border-radius);
	color: var(--color-light);
	background-color: var(--color-secondary);
	font-family: var(--font-roboto);
	overflow: hidden;

	&>* {
		pointer-events: none;
	}
	.value {
		flex: 1;
		text-align: center;
	}

	.stopLabel {
		opacity: 0;
		position: absolute;
		top: 50%;
		left: calc(50% + .5em);
		transform: translate(-50%, -50%);
		text-transform: uppercase;
	}

	.icon {
		height: 1em;
		width: 1em;
		object-fit: fill;
		padding-right: .3em;
		flex-shrink: 0;
	}

	&.paused {
		background-color: var(--color-secondary-fader);
	}

	&.hovered {
		.stopLabel {
			opacity: 1;
		}
		.value {
			opacity: 0;
		}
	}
	
}
</style>