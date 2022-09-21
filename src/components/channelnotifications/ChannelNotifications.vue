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
				<MessageSearch class="content" v-if="sChat.searchMessages" />
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
import { storeBingo } from '@/store/bingo/storeBingo';
import { storeChat } from '@/store/chat/storeChat';
import { storeChatSuggestion } from '@/store/chatSugg/storeChatSuggestion';
import { storeMusic } from '@/store/music/storeMusic';
import { storePoll } from '@/store/poll/storePoll';
import { storePrediction } from '@/store/prediction/storePrediction';
import { storeRaffle } from '@/store/raffle/storeRaffle';
import { storeStream } from '@/store/stream/storeStream';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import MessageSearch from '../chatform/MessageSearch.vue';
import BingoState from './BingoState.vue';
import ChatPollState from './ChatPollState.vue';
import DeezerState from './DeezerState.vue';
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
	public sChat = storeChat();
	public sPoll = storePoll();
	public sMusic = storeMusic();
	public sBingo = storeBingo();
	public sRaffle = storeRaffle();
	public sStream = storeStream();
	public sPrediction = storePrediction();
	public sChatSuggestion = storeChatSuggestion();
	
	private clickHandler!:(e:MouseEvent) => void;

	public get showRaid():boolean { return this.sStream.raiding != null; }
	public get showHypeTrain():boolean { return this.sStream.hypeTrain != undefined; }
	public get showPoll():boolean { return this.currentContent == 'poll' && this.sPoll.data?.id != null; }
	public get showChatPoll():boolean { return this.currentContent == 'chatpoll' && this.sChatSuggestion != null; }
	public get showPrediction():boolean { return this.currentContent == 'prediction' && this.sPrediction.data?.id != null; }
	public get showRaffle():boolean { return this.currentContent == 'raffle' && this.sRaffle.data != null && this.sRaffle.data.mode == "chat"; }
	public get showBingo():boolean { return this.currentContent == 'bingo' && this.sBingo.data != null; }
	public get showWhispers():boolean { return this.currentContent == 'whispers' && this.whispersAvailable; }
	public get showDeezer():boolean { return this.currentContent == 'deezer' && this.sMusic.deezerConnected; }
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
		const whispers = this.sChat.whispers;
		for (const key in whispers) {
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