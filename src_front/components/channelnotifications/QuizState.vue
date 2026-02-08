<template>
	<div class="quizstate gameStateWindow" v-if="currentQuiz">
		<h1 class="title"><Icon name="quiz" />{{currentQuiz.title}}</h1>

		<div class="question">{{ currentQuestion?.question }}</div>
		<div class="answers" v-if="!$utils.isFreeAnswerQuestion(currentQuiz.mode, currentQuestion)">
			<div class="answer" :class="{selected:$utils.isClassicQuizAnswer(currentQuiz.mode, answer)? answer.correct : false}" v-for="(answer, index) in currentQuestion?.answerList">
				<span class="index">{{ ["A", "B", "C", "D", "E", "F", "G", "H"][index] }}</span>
				<span class="label">{{ answer.title }}</span>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { storeQuiz } from '@/store/quiz/storeQuiz';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { computed, ref } from 'vue';

const store = storeQuiz();

const activeQuizList = computed(() => store.quizList.filter(v=>v.enabled))
const currentQuizId = ref(activeQuizList.value[0]?.id)
const currentQuiz = computed(() => store.quizList.filter(v=>v.id == currentQuizId.value)[0])
const currentQuestion = computed(() => currentQuiz.value?.questionList.find(v=>v.id == currentQuiz.value?.currentQuestionId) ?? currentQuiz.value?.questionList[0])


</script>

<style scoped lang="less">
.quizstate{
	.question {
		line-height: 1.1em;
	}
	.answers {
		gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: center;
		.answer {
			display: flex;
			gap: .25em;
			max-width: 40%;
			word-break: break-word;
			padding: 2px 5px;
			border: 1px solid transparent;
			border-radius: 5px;
			
			.index {
				flex-shrink: 0;
				font-weight: bold;
				font-size: 1.1em;
			}
			
			.label {
				word-break: break-word;
				max-height: 100px;
				overflow-y: auto;
				padding-right: 3px;
			}

			&.selected {
				border-color: var(--color-light);
			}
		}
	}
}
</style>