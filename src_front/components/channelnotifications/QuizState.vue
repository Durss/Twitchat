<template>
	<div class="quizstate gameStateWindow" v-if="currentQuiz">
		<h1 class="title" v-stickyTopShadow><Icon name="quiz" />{{currentQuiz.title}}</h1>
		
		<ProgressBar v-if="currentQuiz.questionStarted_at && progressPercent < 1"
			class="progress"
			secondary
			:percent="progressPercent"
			:duration="questionDuration" />

		<div class="subtitle">{{ $t('quiz.state.questionIndex', { INDEX: currentQuestionIndex + 1, TOTAL: currentQuiz?.questionList.length }) }}</div>
		
		<div class="ctas">
			<TTButton icon="test" light secondary small @click="fakeVote()">fake votes</TTButton>
			<template v-if="!currentQuestion">
				<TTButton icon="play" light @click="store.startNextQuestion(currentQuiz.id)">{{ $t('quiz.state.start_bt') }}</TTButton>
			</template>
			<template v-else>
				<TTButton icon="checkmark" light @click="store.revealAnswer(currentQuiz.id)">{{ $t('quiz.state.showAnswer_bt') }}</TTButton>
				<TTButton icon="next" light @click="store.startNextQuestion(currentQuiz.id)">{{ $t('quiz.state.nextQuestion_bt') }}</TTButton>
			</template>
		</div>

		<div class="question">{{ currentQuestion?.question }}</div>
		<div class="answers" v-if="!$utils.isFreeAnswerQuestion(currentQuiz.mode, currentQuestion)">
			<div class="answer"
			:class="{selected:$utils.isClassicQuizAnswer(currentQuiz.mode, answer)? answer.correct : false}"
			v-for="(answer, index) in currentQuestion?.answerList">
				<span class="index">{{ ["A", "B", "C", "D", "E", "F", "G", "H"][index] }}</span>
				<span class="label">{{ answer.title }}</span>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { storeQuiz } from '@/store/quiz/storeQuiz';
import { computed, onBeforeUnmount, ref } from 'vue';
import { TTButton } from '../TTButton.vue';
import ProgressBar from '../ProgressBar.vue';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';

const store = storeQuiz();
const progressPercent = ref(0);

const activeQuizList = computed(() => store.quizList.filter(v=>v.enabled))
const currentQuizId = ref(activeQuizList.value[0]?.id)
const currentQuiz = computed(() => store.quizList.filter(v=>v.id == currentQuizId.value)[0])
const currentQuestionIndex = computed(() => currentQuiz.value?.questionList.findIndex(v=>v.id == currentQuiz.value?.currentQuestionId) || -1)
const currentQuestion = computed(() => currentQuiz.value?.questionList.find(v=>v.id == currentQuiz.value?.currentQuestionId))
const questionDuration = computed(() => (currentQuestion.value?.duration_s ?? currentQuiz.value?.durationPerQuestion_s ?? 30) * 1000)

// if(currentQuiz.value) currentQuiz.value.questionStarted_at = "";//TODO: remove
// if(currentQuiz.value) currentQuiz.value.currentQuestionId = "";//TODO: remove

let rafId:number;
function renderFrame():void {
	rafId = requestAnimationFrame(renderFrame);
	const elapsed = Date.now() - (new Date(currentQuiz.value?.questionStarted_at || "0").getTime() ?? 0);
	progressPercent.value = Math.min(1, elapsed/questionDuration.value);
}
renderFrame();

async function fakeVote():Promise<void> {
	if(!currentQuestion.value) return;
	if(!Utils.isFreeAnswerQuestion(currentQuiz.value!.mode, currentQuestion.value)) {
		const answerId = Utils.pickRand(currentQuestion.value.answerList).id;
		const fakeUserId = Utils.pickRand(await TwitchUtils.getFakeUsers()).id;
		store.handleAnswer(currentQuizId.value!, currentQuestion.value.id, answerId, undefined, fakeUserId);
	}
}

onBeforeUnmount(() => {
	cancelAnimationFrame(rafId);
});

</script>

<style scoped lang="less">
.quizstate{
	.subtitle {
		font-size: 0.9em;
		opacity: 0.8;
		margin-bottom: .5em;
		font-style: italic;
	}
	.ctas {
		gap: .25em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
	}
	.progress{
		z-index: 1;
	}
	.question {
		font-weight: 500;
		line-height: 1.2em;
		padding: .5em .75em;
		margin-top: .5em;
		border-radius: .5em;
		background-color: var(--grayout-fader);
	}
	.answers {
		gap: .5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: center;
		.answer {
			display: flex;
			gap: .5em;
			max-width: 40%;
			padding: .25em .5em;
			border: 1px solid var(--grayout);
			border-radius: .5em;
			background-color: var(--grayout-fadest);
			transition: all .15s;
			
			.index {
				flex-shrink: 0;
				font-weight: bold;
				font-size: 1.1em;
				opacity: .7;
			}
			
			.label {
				word-break: break-word;
				max-height: 100px;
				overflow-y: auto;
				padding-right: 3px;
				font-size: .95em;
				// Explicit line-height avoids sub-pixel rounding mismatches between
				// scrollHeight and clientHeight that cause spurious scrollbars
				// when line-height is "normal" (browser-computed fractional value).
				line-height: 1.3em;
			}

			& {
			// &.selected {
				border-color: var(--color-light);
				.index {
					opacity: 1;
				}
			}
		}
	}
}
</style>