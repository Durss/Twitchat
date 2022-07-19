<template>
	<div class="channelnotifications">
		<div ref="content" class="holder">
			<transition name="slide">
				<PollState class="content" v-if="showPoll" />
				<ChatPollState class="content" v-else-if="showChatPoll" />
				<PredictionState class="content" v-else-if="showPrediction" />
				<TrackedUsers class="content" v-else-if="showTrackedUsers" />
				<RaffleState class="content" v-else-if="showRaffle" />
				<WhispersState class="content" v-else-if="showWhispers" />
				<BingoState class="content" v-else-if="showBingo" />
				<DeezerState class="content" v-else-if="showDeezer" />
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
				<Button small white
					aria-label="Close current content"
					:icon="$image('icons/cross.svg')"
					@click="$emit('close')" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import MessageSearch from '../chatform/MessageSearch.vue';
import BingoState from './BingoState.vue';
import ChatPollState from './ChatPollState.vue';
import HypeTrainState from './HypeTrainState.vue';
import PollState from './PollState.vue';
import PredictionState from './PredictionState.vue';
import RaffleState from './RaffleState.vue';
import RaidState from './RaidState.vue';
import TrackedUsers from './TrackedUsers.vue';
import WhispersState from './WhispersState.vue';
import DeezerState from './DeezerState.vue';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import type { HypeTrainStateData } from '@/types/TwitchatDataTypes';

@Options({
	props:{
		currentContent:String,
	},
	components:{
		Button,
		PollState,
		RaidState,
		BingoState,
		DeezerState,
		RaffleState,
		TrackedUsers,
		ChatPollState,
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
	public get showPoll():boolean { return this.currentContent == 'poll' && (store.state.currentPoll as TwitchDataTypes.Poll)?.id != null; }
	public get showChatPoll():boolean { return this.currentContent == 'chatpoll' && store.state.chatPoll != null; }
	public get showPrediction():boolean { return this.currentContent == 'prediction' && (store.state.currentPrediction as TwitchDataTypes.Prediction)?.id != null; }
	public get showRaffle():boolean { return this.currentContent == 'raffle' && store.state.raffle != null && store.state.raffle.command != "__fakerafflecmd__"; }
	public get showBingo():boolean { return this.currentContent == 'bingo' && store.state.bingo != null; }
	public get showWhispers():boolean { return this.currentContent == 'whispers' && this.whispersAvailable; }
	public get showDeezer():boolean { return this.currentContent == 'deezer' && store.state.deezerConnected; }
	public get showTrackedUsers():boolean { return this.currentContent == 'trackedUsers'; }

	public get showClose():boolean {
		return this.showPoll
			|| this.showBingo
			|| this.showRaffle
			|| this.showChatPoll
			|| this.showWhispers
			|| this.showPrediction
			|| this.showTrackedUsers
			|| this.showDeezer
		;
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
		while(target != document.body && target != ref && target) {
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
			background-color: @windowStateColor;
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
			right:10px;
			z-index: 1;
			pointer-events:all;
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