<template>
	<div class="channelnotifications">
		<div class="notifications">
			<Button :icon="require('@/assets/icons/poll.svg')"
				small
				bounce
				@click="currentContent = 'poll'"
				v-if="$store.state.currentPoll?.id" />

			<Button :icon="require('@/assets/icons/prediction.svg')"
				small
				bounce
				@click="currentContent = 'prediction'"
				v-if="$store.state.currentPrediction?.id" />

			<Button :icon="require('@/assets/icons/markRead.svg')"
				small
				bounce
				v-if="$store.state.isMessageMarkedAsRead"
				data-tooltip="Scroll to last<br>messaged flagged"
				@click="$emit('goToLastRead')" />

			<Button :icon="require('@/assets/icons/magnet.svg')"
				small
				bounce
				v-if="$store.state.trackedUsers.length > 0"
				data-tooltip="View tracked users"
				@click="currentContent='trackedUsers'" />

			<Button :icon="require('@/assets/icons/ticket.svg')"
				small
				bounce
				v-if="$store.state.raffle.command"
				data-tooltip="Raffle"
				@click="currentContent='raffle'" />
		</div>
		<div ref="content">
			<transition name="slide">
				<PollState class="content" v-if="currentContent == 'poll' && $store.state.currentPoll?.id" />
				<PredictionState class="content" v-else-if="currentContent == 'prediction' && $store.state.currentPrediction?.id" />
				<TrackedUsers class="content" v-else-if="currentContent == 'trackedUsers'" />
				<RaffleState class="content" v-else-if="currentContent == 'raffle' && $store.state.raffle.command" />
			</transition>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { TwitchTypes } from '@/utils/TwitchUtils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import PollState from './PollState.vue';
import PredictionState from './PredictionState.vue';
import RaffleState from './RaffleState.vue';
import TrackedUsers from './TrackedUsers.vue';

@Options({
	props:{},
	components:{
		Button,
		PollState,
		RaffleState,
		TrackedUsers,
		PredictionState,
	},
	emits:['goToLastRead'],
})
export default class ChannelNotifications extends Vue {

	public currentContent:string = '';

	private clickHandler!:(e:MouseEvent) => void;

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);

		//Auto opens the prediction status if pending for completion
		watch(() => store.state.currentPrediction, () => {
			let prediction = store.state.currentPrediction as TwitchTypes.Prediction
			if(prediction && prediction.status == "LOCKED") {
				this.currentContent = "prediction";
			}
		});
	}

	public beforeunmout():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$refs.content as HTMLDivElement;
		while(target != document.body && target != ref) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.currentContent = '';
		}
	}
}
</script>

<style scoped lang="less">
.channelnotifications{
	width: 100%;
	pointer-events:none;
	// width: min-content;
	// right: 0;
	// left: auto;

	.notifications {
		pointer-events:none;
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
		padding-right: 3px;
		align-items: flex-end;
		.button {
			pointer-events:all;
			transform-origin: bottom;
			border-bottom-right-radius: 0;
			border-bottom-left-radius: 0;
			margin-left: 1px;
			height: 33px;
			transition: height 0.2s;
			:deep(.icon) {
				width: 25px;
				max-height: 20px;
			}
			&:hover {
				height: 40px;
			}
		}
	}

	.content {
		pointer-events:all;
		position: absolute;
		padding: 10px;
		padding-bottom: 20px;
		background-color: darken(@mainColor_normal, 20%);
		box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);
		border-radius: 10px;
		border-bottom-right-radius: 0;
		border-bottom-left-radius: 0;
		display: flex;
		flex-direction: column;
		width: 100%;
		max-height: calc(100vh - 100px);
		overflow-y: auto;
		transform: translateY(-100%);
	}

	.slide-enter-active {
		transition: all 0.2s;
	}

	.slide-leave-active {
		transition: all 0.2s;
	}
	
	.slide-enter-from,
	.slide-leave-to {
		transform: translateY(0);
	}
}
</style>