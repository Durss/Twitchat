<template>
	<div class="channelnotifications">
		<div ref="content" class="holder">
			<transition name="slide">
				<PollState class="content" v-if="showPoll" />
				<ChatPollState class="content" v-else-if="showChatPoll" />
				<PredictionState class="content" v-else-if="showPrediction" />
				<RaffleState class="content" v-else-if="showRaffle" />
				<BingoState class="content" v-else-if="showBingo" />
				<HypeTrainState class="content" v-else-if="showHypeTrain" />
				<RaidState class="content" v-else-if="showRaid" />
				<QuizState class="content" v-else-if="showQuiz" />
			</transition>

			<ClearButton class="closeBt clearButton" v-if="showClose"
				aria-label="close"
				@click="$emit('close')" />
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import BingoState from './BingoState.vue';
import HypeTrainState from './HypeTrainState.vue';
import PollState from './PollState.vue';
import PredictionState from './PredictionState.vue';
import RaffleState from './RaffleState.vue';
import RaidState from './RaidState.vue';
import ChatPollState from './ChatPollState.vue';
import QuizState from './QuizState.vue';

@Component({
	components:{
		QuizState,
		PollState,
		RaidState,
		BingoState,
		ClearButton,
		RaffleState,
		ChatPollState,
		HypeTrainState,
		PredictionState,
	},
	emits:['close'],
})
class ChannelNotifications extends AbstractSidePanel {

	@Prop
	public currentContent!:TwitchatDataTypes.NotificationTypes;

	public get showRaid():boolean { return this.currentContent == 'raid' && this.$store.stream.currentRaid != undefined; }
	public get showHypeTrain():boolean { return this.currentContent == 'train' && this.$store.stream.hypeTrain != undefined; }
	public get showPoll():boolean { return this.currentContent == 'poll' && this.$store.poll.data?.id != null && this.$store.poll.data?.isFake != true; }
	public get showChatPoll():boolean { return this.currentContent == 'chatPoll' && this.$store.chatPoll.data != null; }
	public get showPrediction():boolean { return this.currentContent == 'prediction' && this.$store.prediction.data?.id != null && this.$store.prediction.data?.isFake != true; }
	public get showRaffle():boolean { return this.currentContent == 'raffle' && this.$store.raffle.raffleList != null && this.$store.raffle.raffleList.filter(v=>v.mode === "chat" || v.mode === "tips").length > 0; }
	public get showBingo():boolean { return this.currentContent == 'bingo' && this.$store.bingo.data != null; }
	public get showQuiz():boolean { return this.currentContent == 'quiz' && this.$store.quiz.quizList.filter(v=>v.enabled).length > 0; }

	public get showClose():boolean {
		return (this.showPoll
			|| this.showPrediction
			|| this.showChatPoll
			|| this.showBingo
			|| this.showRaffle
			|| this.showRaid
			|| this.showQuiz
			|| this.showHypeTrain
			|| this.$store.chat.searchMessages != "")
		;
	}

	public mounted():void {
	}
}
export default toNative(ChannelNotifications);
</script>

<style scoped lang="less">
.channelnotifications{
	width: 100%;
	pointer-events:none;

	.holder {
		position: relative;
		pointer-events:all;
		&>.content {
			max-height: 30vh;
			overflow: auto;
			transition: all .35s;
		}
		.closeBt {
			position: absolute;
			top:10px;
			right:10px;
			width: 1.5em;
			height: 1.5em;
			padding: 0;
			z-index: 1;
			color: #ffffff;
		}

		.slide-enter-from,
		.slide-leave-to {
			&.slide-leave-to {
				// filter: brightness(.1);
				opacity: .2;
			}
			max-height: 0;
			padding-top: 0;
			padding-bottom: 0;
			// margin-bottom: -100%;
			// transform: translateY(100%);
		}
	}
}
</style>
