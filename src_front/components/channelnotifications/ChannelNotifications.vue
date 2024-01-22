<template>
	<div class="channelnotifications">
		<div ref="content" class="holder">
			<transition name="slide">
				<PollState class="content" v-if="showPoll" />
				<PredictionState class="content" v-else-if="showPrediction" />
				<RaffleState class="content" v-else-if="showRaffle" />
				<BingoState class="content" v-else-if="showBingo" />
			</transition>

			<transition name="slide">
				<RaidState class="content" v-if="showRaid" />
			</transition>

			<transition name="slide">
				<HypeTrainState class="content" v-if="showHypeTrain" />
			</transition>

			<ClearButton class="closeBt clearButton" v-if="showClose"
				aria-label="close"
				@click="$emit('close')" />
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from '@vue/runtime-core';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import BingoState from './BingoState.vue';
import HypeTrainState from './HypeTrainState.vue';
import PollState from './PollState.vue';
import PredictionState from './PredictionState.vue';
import RaffleState from './RaffleState.vue';
import RaidState from './RaidState.vue';

@Component({
	components:{
		Button: TTButton,
		PollState,
		RaidState,
		BingoState,
		ClearButton,
		RaffleState,
		HypeTrainState,
		PredictionState,
	},
	emits:['close','showDimmer', 'hideDimmer'],
})
export default class ChannelNotifications extends AbstractSidePanel {

	@Prop
	public currentContent!:TwitchatDataTypes.NotificationTypes;
	
	// private clickHandler!:(e:MouseEvent) => void;

	public get showRaid():boolean { return this.$store.stream.currentRaid != null; }
	public get showHypeTrain():boolean { return this.$store.stream.hypeTrain != undefined; }
	public get showPoll():boolean { return this.currentContent == 'poll' && this.$store.poll.data?.id != null; }
	public get showPrediction():boolean { return this.currentContent == 'prediction' && this.$store.prediction.data?.id != null; }
	public get showRaffle():boolean { return this.currentContent == 'raffle' && this.$store.raffle.data != null && this.$store.raffle.data!.mode == "chat"; }
	public get showBingo():boolean { return this.currentContent == 'bingo' && this.$store.bingo.data != null; }

	public get showClose():boolean {
		return (this.showPoll
			|| this.showPrediction
			|| this.showBingo
			|| this.showRaffle
			|| this.$store.chat.searchMessages != "")
		;
	}

	public get whispersAvailable():boolean {
		const whispers = this.$store.chat.whispers;
		for (const key in whispers) {
			if (whispers[key].length > 0) return true;
		}
		return false;
	}
	
	public mounted():void {
		// this.clickHandler = (e:MouseEvent) => this.onClick(e);
		// document.addEventListener("mousedown", this.clickHandler);

		watch(()=>this.showClose, ()=> {
			if(this.showClose) this.$emit("showDimmer");
			else this.$emit("hideDimmer");
		})
	}

	public beforeUnmount():void {
		// document.removeEventListener("mousedown", this.clickHandler);
	}

	// private onClick(e:MouseEvent):void {
	// 	let target = e.target as HTMLDivElement;
	// 	const ref = this.$refs.content as HTMLDivElement;
	// 	while(target != document.body && target != ref && target) {
	// 		target = target.parentElement as HTMLDivElement;
	// 	}
	// 	if(target != ref) {
	// 		this.$emit("close");
	// 	}
	// }
}
</script>

<style scoped lang="less">
.channelnotifications{
	width: 100%;
	pointer-events:none;
	
	.holder {
		position: relative;
		pointer-events:all;
		&>* {
			transition: margin-bottom .35s;
		}
		.closeBt {
			position: absolute;
			top:10px;
			right:10px;
			width: 1.5em;
			height: 1.5em;
			padding: 0;
			z-index: 1;
		}

		.slide-enter-from,
		.slide-leave-to {
			margin-bottom: -100%;
		}
	}
}
</style>