<template>
	<div class="channelnotifications">
		<div ref="content" class="holder">
			<transition name="slide">
				<PollState class="content" v-if="showPoll" />
				<PredictionState class="content" v-else-if="showPrediction" />
				<TrackedUsers class="content" v-else-if="showTrackedUsers" />
				<RaffleState class="content" v-else-if="showRaffle" />
				<WhispersState class="content" v-else-if="showWhispers" />
				<BingoState class="content" v-else-if="showBingo" />
			</transition>

			<transition name="slide">
				<MessageSearch class="content" v-if="$store.state.searchMessages" />
			</transition>

			<transition name="slide">
				<RaidState class="content" v-if="showRaid" />
			</transition>

			<transition name="slide">
				<HypeTrainState class="content" v-if="showHypeTrain" />
			</transition>

			<div class="closeBt" v-if="showClose">
				<Button small
					:icon="require('@/assets/icons/cross_white.svg')"
					@click="$emit('close')" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import store, { BingoData, HypeTrainStateData, RaffleData } from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import { TwitchTypes } from '@/utils/TwitchUtils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import MessageSearch from '../chatform/MessageSearch.vue';
import BingoState from './BingoState.vue';
import HypeTrainState from './HypeTrainState.vue';
import PollState from './PollState.vue';
import PredictionState from './PredictionState.vue';
import RaffleState from './RaffleState.vue';
import RaidState from './RaidState.vue';
import TrackedUsers from './TrackedUsers.vue';
import WhispersState from './WhispersState.vue';

@Options({
	props:{
		currentContent:String,
	},
	components:{
		Button,
		PollState,
		RaidState,
		BingoState,
		RaffleState,
		TrackedUsers,
		MessageSearch,
		WhispersState,
		HypeTrainState,
		PredictionState,
	},
	emits:['close','showDimmer', 'hideDimmer'],
})
export default class ChannelNotifications extends Vue {

	public currentContent!:string;

	private clickHandler!:(e:MouseEvent) => void;

	public get showRaid():boolean { return store.state.raiding != null; }
	public get showHypeTrain():boolean { return store.state.params.filters.showHypeTrain.value as boolean && (store.state.hypeTrain as HypeTrainStateData).level != undefined; }
	public get showPoll():boolean { return this.currentContent == 'poll' && (store.state.currentPoll as TwitchTypes.Poll)?.id != null; }
	public get showPrediction():boolean { return this.currentContent == 'prediction' && (store.state.currentPrediction as TwitchTypes.Prediction)?.id != null; }
	public get showRaffle():boolean { return this.currentContent == 'raffle' && (store.state.raffle as RaffleData).command != null; }
	public get showBingo():boolean { return this.currentContent == 'bingo' && (store.state.bingo as BingoData)?.guessNumber != null; }
	public get showWhispers():boolean { return this.currentContent == 'whispers' && this.whispersAvailable; }
	public get showTrackedUsers():boolean { return this.currentContent == 'trackedUsers'; }

	public get showClose():boolean {
		return this.showPoll
			|| this.showBingo
			|| this.showRaffle
			|| this.showWhispers
			|| this.showPrediction
			|| this.showTrackedUsers;
	}

	public get whispersAvailable():boolean {
		const whispers:{[key:string]:IRCEventDataList.Whisper[]} = store.state.whispers;
		for (const key in store.state.whispers) {
			if (whispers[key].length > 0) return true;
		}
		return false;
	}

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);

		watch(()=>this.showClose, ()=> {
			if(this.showClose) this.$emit("showDimmer");
			else this.$emit("hideDimmer");
		})

	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$refs.content as HTMLDivElement;
		while(target != document.body && target != ref) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.$emit("close");
		}
	}
}
</script>

<style scoped lang="less">
.channelnotifications{
	width: 100%;
	pointer-events:none;

	.holder {
		position: relative;

		.content {
			pointer-events:all;
			padding: 10px;
			padding-bottom: 10px;
			background-color: darken(@mainColor_normal, 20%);
			box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);
			border-radius: 10px;
			border-bottom-right-radius: 0;
			border-bottom-left-radius: 0;
			display: flex;
			flex-direction: column;
			width: 100%;
			max-height: 50vh;//calc(100vh - 100px);
			overflow-y: auto;
			margin-bottom: 0;
			z-index: 1;
		}

		.closeBt {
			position: absolute;
			top:10px;
			left:50%;
			transform: translate(-50%, -100%);
			z-index: 1;
			pointer-events:all;
			background-color: darken(@mainColor_normal, 20%);
			padding: 10px;
			border-top-left-radius: 20px;
			border-top-right-radius: 20px;
		}

		.slide-enter-active {
			transition: all 0.2s;
		}

		.slide-leave-active {
			transition: all 0.2s;
		}
		
		.slide-enter-from,
		.slide-leave-to {
			// max-height: 0;
			// padding: 0;
			// transform: scaleY(0);
			// transform: translateY(100%);
			// margin-bottom: -10vh;
			margin-bottom: -400px;//calc(-100vh + 100px);
		}
	}
}
</style>