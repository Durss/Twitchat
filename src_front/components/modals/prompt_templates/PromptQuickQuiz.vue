<template>
	<div class="promptquickquiz">
		<QuizQuestionItem
			:question="quiz.questionList[0]!"
			:quiz="quiz"
			:noToggle="true"
			@changeMode="changeQuestionMode"
		/>
	</div>
</template>

<script setup lang="ts">
import QuizQuestionItem from "@/components/quiz/QuizQuestionItem.vue";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { computed, reactive } from "vue";

const props = defineProps<{
	payload?: TwitchatDataTypes.PromptTemplates["quiz"]["payload"];
}>();

const quiz = reactive<TwitchatDataTypes.QuizParams>({
	id: Utils.getUUID(),
	currentQuestionId: "",
	enabled: true,
	leaderboard: {},
	durationPerQuestion_s: 30,
	toleranceLevel: 2,
	loosePointsOnFail: true,
	timeBasedScoring: true,
	questionList: [
		{
			id: Utils.getUUID(),
			question: "",
			answerList: [
				{ id: Utils.getUUID(), title: "", correct: true },
				{ id: Utils.getUUID(), title: "" },
			],
			mode: "classic",
		},
	],
	questionStarted_at: new Date().toISOString(),
	quizStarted_at: new Date().toISOString(),
	title: props.payload?.title ?? "",
});

const isValid = computed(() => {
	const question = quiz.questionList[0];
	if (!question || question.question.trim().length === 0) return false;
	if (question.mode == "freeAnswer") return question.answer.trim().length > 0;
	return question.answerList.filter((v) => v.title.trim().length > 0).length > 1;
});

function changeQuestionMode(
	question: TwitchatDataTypes.QuizParams["questionList"][number],
	newMode: "classic" | "majority" | "freeAnswer",
): void {
	const newQuestion = Utils.convertQuizQuestionMode(question, newMode);
	if (!newQuestion) return;
	quiz.questionList.splice(0, 1, newQuestion);
}

function getResult(): TwitchatDataTypes.QuizParams | undefined {
	if (!isValid.value) return undefined;
	return JSON.parse(JSON.stringify(quiz)) as TwitchatDataTypes.QuizParams;
}

//Fulfills PromptTemplateExpose<QuizParams>. Vue unwraps "isValid" for the parent
defineExpose({ isValid, getResult });
</script>

<style scoped lang="less">
.promptquickquiz {
}
</style>

