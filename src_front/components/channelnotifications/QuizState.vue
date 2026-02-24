<template>
	<div class="quizstate gameStateWindow" v-if="currentQuiz">
		<div class="head" v-stickyTopShadow>
			<div class="subHolder">
				<h1 class="title" v-stickyTopShadow><Icon name="quiz" />{{currentQuiz.title}}</h1>
				<div class="subtitle" v-if="currentQuestion">
					<span>{{ $t('quiz.state.questionIndex', { INDEX: currentQuestionIndex + 1, TOTAL: currentQuiz?.questionList.length }) }}</span>
				</div>
			</div>
			
			<ProgressBar v-if="showProgressbar"
				class="progress"
				secondary
				:percent="progressPercent"
				:duration="questionDuration" />
			
			<slot />
		</div>

		<div class="body">
			<div class="actions">
				<TTButton icon="test" light secondary noBounce :selected="fakeVotes" @click="fakeVotes = !fakeVotes" v-if="auth.isAdmin" />
				<template v-if="!currentQuestion">
					<TTButton icon="play" light @click="store.startNextQuestion(currentQuiz.id)">{{ $t('quiz.state.start_bt') }}</TTButton>
				</template>
				<template v-else>
					<TTButton icon="refresh"
						alert light
						@click="store.resetQuizState(currentQuiz.id)">{{ $t('quiz.state.resetQuiz_bt') }}</TTButton>
					<TTButton icon="checkmark"
						light
						@click="store.revealAnswer(currentQuiz.id)"
						v-if="!currentQuiz.currentQuestionRevealed">{{ $t('quiz.state.showAnswer_bt') }}</TTButton>
					<TTButton icon="next"
						light
						@click="store.startNextQuestion(currentQuiz.id)"
						v-if="!isLastQuestion && currentQuiz.currentQuestionRevealed">{{ $t('quiz.state.nextQuestion_bt') }}</TTButton>
					<TTButton icon="leaderboard"
						light
						@click="store.showLeaderBoard(currentQuiz.id)"
						v-if="isLastQuestion">{{ $t('quiz.state.leaderboard_bt') }}</TTButton>
				</template>
			</div>
	
			<template v-if="currentQuestion">
				<div class="question"><icon :name="`quiz_${currentQuestion.mode}`" v-tooltip="$t('quiz.form.mode_'+currentQuestion.mode+'.title')" />{{ currentQuestion.question }}</div>
				<div class="answers" v-if="currentQuestion.mode !== 'freeAnswer'">
					<div class="answer"
					:class="{selected:$utils.isClassicQuizAnswer(currentQuestion.mode, answer)? answer.correct : false}"
					:style="{backgroundPositionX: 100-store.computeQuestionPercents(currentQuiz.id, currentQuestion.id)[answer.id]!.relative * 100 + '%'}"
					v-for="(answer, index) in currentQuestion.answerList">
						<template v-if="$utils.isClassicQuizAnswer(currentQuestion.mode, answer)">
							<icon name="checkmark" v-if="answer.correct" />
							<icon name="cross" v-else />
						</template>
						<span class="index">{{ ["A", "B", "C", "D", "E", "F", "G", "H"][index] }}</span>
						<span class="label">{{ answer.title }}</span>
						<span class="percent">{{ (store.computeQuestionPercents(currentQuiz.id, currentQuestion.id)[answer.id]!.global * 100).toFixed(1) }}%</span>
					</div>
				</div>
				<div class="answer selected" v-else>{{ currentQuestion.answer }}</div>
			</template>

			<OverlayPresenceChecker
				:overlayName="$t('quiz.form.overlay_name')"
				:overlayType="'quiz'" />
		</div>
	</div>
</template>

<script lang="ts" setup>
import { storeQuiz } from '@/store/quiz/storeQuiz';
import { storeAuth } from '@/store/auth/storeAuth';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { computed, onBeforeUnmount, ref } from 'vue';
import ProgressBar from '../ProgressBar.vue';
import TTButton from '../TTButton.vue';
import OverlayPresenceChecker from './OverlayPresenceChecker.vue';

const store = storeQuiz();
const auth = storeAuth();
const progressPercent = ref(0);
const fakeVotes = ref(false);

const activeQuizList = computed(() => store.quizList.filter(v=>v.enabled))
const currentQuizId = ref(activeQuizList.value[0]?.id)
const currentQuiz = computed(() => store.quizList.filter(v=>v.id == currentQuizId.value)[0])
const currentQuestionIndex = computed(() => currentQuiz.value?.questionList.findIndex(v=>v.id == currentQuiz.value?.currentQuestionId) ?? -1)
const currentQuestion = computed(() => currentQuiz.value?.questionList.find(v=>v.id == currentQuiz.value?.currentQuestionId))
const questionDuration = computed(() => (currentQuestion.value?.duration_s ?? currentQuiz.value?.durationPerQuestion_s ?? 30) * 1000)
const isLastQuestion = computed(() => currentQuestionIndex.value === (currentQuiz.value?.questionList.length ?? 0) - 1)
const showProgressbar = computed(() => currentQuiz.value?.questionStarted_at && progressPercent.value < 1 )

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
	if(!fakeVotes.value || !currentQuestion.value || !showProgressbar.value) return;
	const fakeUserId = Utils.pickRand(await TwitchUtils.getFakeUsers()).id;
	if(currentQuestion.value.mode !== "freeAnswer") {
		const answer = Utils.pickRand(currentQuestion.value.answerList);
		console.log(answer.title)
		const answerId = answer.id;
		store.handleAnswer("twitch", currentQuizId.value!, currentQuestion.value.id, answerId, undefined, fakeUserId);
	}else{
		const answer = Math.random() > .5? currentQuestion.value.answer : "Wrong answer ";
		store.handleAnswer("twitch", currentQuizId.value!, currentQuestion.value.id, undefined, answer, fakeUserId);
	}
}
let fakeVoteInterval:number;
if(auth.isAdmin) {
	fakeVoteInterval = window.setInterval(fakeVote, 1000);
}

onBeforeUnmount(() => {
	cancelAnimationFrame(rafId);
	if(fakeVoteInterval) clearInterval(fakeVoteInterval);
});

</script>

<style scoped lang="less">
.quizstate{
	.subHolder {
		display: flex;
		flex-direction: column;
		align-items: center;
		.subtitle {
			font-size: 0.9em;
			opacity: 0.8;
			font-style: italic;
		}
	}
	.progress{
		z-index: 1;
	}
	.question {
		gap: .5em;
		display: flex;
		align-items: center;
		flex-direction: row;
		line-height: 1.1em;
		padding: .5em .75em;
		border-radius: .5em;
		background-color: rgba(0, 0, 0, .25);
		.icon {
			width: 2em;
			flex-shrink: 0;
			vertical-align: middle;
		}
	}
	.answers {
		gap: .5em;
		font-size: .9em;
		display: flex;
		align-self: stretch;
		flex-direction: column;
	}
	.answer {
		display: flex;
		gap: .5em;
		padding: .25em .5em;
		border: 1px solid transparent;
		border-radius: .5em;
		transition: all .15s;
		@c: rgba(0, 0, 0, .4);
		@bg: rgba(0, 0, 0, .25);
		background-color: @c;
		background: linear-gradient(90deg, @c 0%, @c 50%, @bg 50%, @bg 100%);
		background-size: 200% 100%;
		transition: background .25s;

		.icon {
			height: 1em;
			flex-shrink: 0;
			vertical-align: middle;
			color: var(--color-alert-light);
		}
		
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
			flex: 1;
			line-height: 1.2em;
		}

		&.selected {
			// border-color: var(--color-light);
			.index {
				opacity: 1;
			}
			.icon {
				color: inherit
			}
		}
	}
}
</style>