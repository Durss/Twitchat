<template>
	<div class="channelnotifications">
		<div ref="content" class="holder">
			<transition name="slide">
				<component class="content" :is="component" v-if="component">
					<ClearButton class="closeBt clearButton"
						aria-label="close"
						@click="$emit('close')" />
				</component>
			</transition>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeBingo as useStoreBingo } from '@/store/bingo/storeBingo';
import { storeChatPoll as useStoreChatPoll } from '@/store/chat_poll/storeChatPoll';
import { storePoll as useStorePoll } from '@/store/poll/storePoll';
import { storePrediction as useStorePrediction } from '@/store/prediction/storePrediction';
import { storeQuiz as useStoreQuiz } from '@/store/quiz/storeQuiz';
import { storeRaffle as useStoreRaffle } from '@/store/raffle/storeRaffle';
import { storeStream as useStoreStream } from '@/store/stream/storeStream';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { computed } from 'vue';
import ClearButton from '../ClearButton.vue';
import BingoState from './BingoState.vue';
import ChatPollState from './ChatPollState.vue';
import HypeTrainState from './HypeTrainState.vue';
import PollState from './PollState.vue';
import PredictionState from './PredictionState.vue';
import QuizState from './QuizState.vue';
import RaffleState from './RaffleState.vue';
import RaidState from './RaidState.vue';

const props = defineProps<{
	currentContent: TwitchatDataTypes.NotificationTypes;
}>();

const emit = defineEmits<{
	close: [];
}>();

const storePoll = useStorePoll();
const storePrediction = useStorePrediction();
const storeChatPoll = useStoreChatPoll();
const storeBingo = useStoreBingo();
const storeRaffle = useStoreRaffle();
const storeStream = useStoreStream();
const storeQuiz = useStoreQuiz();

const component = computed(() => {
	switch(props.currentContent) {
		case "poll": {
			if(storePoll.data?.id != null && storePoll.data?.isFake != true) {
				return PollState;
			}
			break;
		}
		case "prediction": {
			if(storePrediction.data?.id != null && storePrediction.data?.isFake != true) {
				return PredictionState;
			}
			break;
		}
		case "chatPoll": {
			if(storeChatPoll.data != null) {
				return ChatPollState;
			}
			break;
		}
		case "bingo": {
			if(storeBingo.data != null) {
				return BingoState;
			}
			break;
		}
		case "raffle": {
			if(storeRaffle.raffleList != null && storeRaffle.raffleList.filter(v=>v.mode === "chat" || v.mode === "tips").length > 0) {
				return RaffleState;
			}
			break;
		}
		case "raid": {
			if(storeStream.currentRaid != undefined) {
				return RaidState;
			}
			break;
		}
		case "quiz": {
			if(storeQuiz.quizList.filter(v=>v.enabled).length > 0) {
				return QuizState;
			}
			break;
		}
		case "train": {
			if(storeStream.hypeTrain != undefined) {
				return HypeTrainState;
			}
			break;
		}
	}
	return null;
});

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
			top:.5em;
			right:.25em;
			width: 1.25em;
			height: 1.25em;
			padding: 0;
			z-index: 1;
			color: #ffffff;
		}

		.slide-enter-from,
		.slide-leave-to {
			&.slide-leave-to {
				opacity: .2;
			}
			max-height: 0;
			padding-top: 0;
			padding-bottom: 0;
		}
	}
}
</style>
