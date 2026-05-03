<template>
	<div class="quizquestionlist">
		<div class="noQuestion" v-if="search && quiz.questionList.length === 0">
			{{ $t("quiz.form.no_question") }}
		</div>

		<SearchForm
			v-if="quiz.questionList.length > 5"
			v-model="search"
			:debounceDelay="0"
			:autoFocus="false"
		/>

		<VueDraggable
			class="questionList"
			v-model="quiz.questionList"
			:group="{ name: 'questionList_' + quiz.id }"
			handle=".dragHandle"
			:animation="250"
			@end="$store.quiz.saveData()"
		>
			<QuizQuestionItem
				v-for="question in filteredQuestions"
				:key="question.id"
				:question="question"
				:quizId="quiz.id"
				:autoOpen="autoOpenQuestionID === question.id"
				@delete="deleteQuestion"
				@changeMode="changeQuestionMode"
			/>
		</VueDraggable>

		<div class="card-item addQuestionBtns" v-if="quiz.questionList.length < maxQuestionCount">
			<div>{{ $t("quiz.form.add_question_title") }}</div>
			<TTButton
				@click="addQuestion('classic')"
				icon="quiz_classic"
				primary
				v-tooltip="$t('quiz.form.mode_classic.description')"
				>{{ $t("quiz.form.mode_classic.title") }}</TTButton
			>
			<TTButton
				@click="addQuestion('freeAnswer')"
				icon="quiz_freeAnswer"
				primary
				v-tooltip="$t('quiz.form.mode_freeAnswer.description')"
				>{{ $t("quiz.form.mode_freeAnswer.title") }}</TTButton
			>
			<TTButton
				@click="addQuestion('majority')"
				icon="quiz_majority"
				primary
				v-tooltip="$t('quiz.form.mode_majority.description')"
				>{{ $t("quiz.form.mode_majority.title") }}</TTButton
			>
			<div class="importForm">
				<TTButton
					icon="download"
					type="file"
					primary
					accept=".csv"
					@update:file="(file: File) => onCSVImport(file)"
					>{{ $t("quiz.form.import_bt") }}</TTButton
				>
				<Icon class="icon" name="info" v-tooltip="$t('quiz.form.import_tt')" />
			</div>
		</div>

		<PremiumLimitMessage
			v-else
			label="quiz.form.nonpremium_question_limit"
			premiumLabel="quiz.form.premium_question_limit"
			:max="$config.MAX_QUESTIONS_PER_QUIZ"
			:maxPremium="$config.MAX_QUESTIONS_PER_QUIZ_PREMIUM"
		/>
	</div>
</template>

<script setup lang="ts">
import SearchForm from "@/components/params/contents/SearchForm.vue";
import PremiumLimitMessage from "@/components/params/PremiumLimitMessage.vue";
import TTButton from "@/components/TTButton.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeQuiz as useStoreQuiz } from "@/store/quiz/storeQuiz";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import { computed, ref } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { useI18n } from "vue-i18n";
import QuizQuestionItem from "./QuizQuestionItem.vue";

const props = defineProps<{
	quiz: TwitchatDataTypes.QuizParams;
}>();

const { t } = useI18n();
const storeCommon = useStoreCommon();
const storeQuiz = useStoreQuiz();
const storeAuth = useStoreAuth();

const search = ref("");
const autoOpenQuestionID = ref<string | null>(null);

const maxQuestionCount = computed(() => {
	return storeAuth.isPremium
		? Config.instance.MAX_QUESTIONS_PER_QUIZ_PREMIUM
		: Config.instance.MAX_QUESTIONS_PER_QUIZ;
});

const filteredQuestions = computed(() => {
	const s = search.value.trim().toLowerCase();
	if (!s) return props.quiz.questionList;
	return props.quiz.questionList.filter((q) => {
		if (q.question.toLowerCase().includes(s)) return true;
		if (q.mode === "freeAnswer") {
			return (q.answer || "").toLowerCase().includes(s);
		} else {
			return q.answerList.some((a) => a.title.toLowerCase().includes(s));
		}
	});
});

function save(): void {
	storeQuiz.saveData(props.quiz.id);
}

function addQuestion(mode: "classic" | "majority" | "freeAnswer"): void {
	let question: TwitchatDataTypes.QuizParams["questionList"][number];

	if (mode == "classic") {
		question = {
			id: Utils.getUUID(),
			mode: "classic",
			question: "",
			answerList: [
				{ id: Utils.getUUID(), title: "", correct: true },
				{ id: Utils.getUUID(), title: "" },
			],
		};
	} else if (mode == "majority") {
		question = {
			id: Utils.getUUID(),
			mode: "majority",
			question: "",
			answerList: [
				{ id: Utils.getUUID(), title: "" },
				{ id: Utils.getUUID(), title: "" },
			],
		};
	} else {
		question = {
			id: Utils.getUUID(),
			mode: "freeAnswer",
			question: "",
			answer: "",
		};
	}

	autoOpenQuestionID.value = question.id;
	props.quiz.questionList.push(question);
	save();
}

function deleteQuestion(questionId: string): void {
	props.quiz.questionList = props.quiz.questionList.filter(
		(v) => v.id != questionId,
	) as typeof props.quiz.questionList;
	save();
}

function changeQuestionMode(
	question: TwitchatDataTypes.QuizParams["questionList"][number],
	newMode: "classic" | "majority" | "freeAnswer",
): void {
	if (question.mode === newMode) return;
	const index = props.quiz.questionList.findIndex((q) => q.id === question.id);
	if (index === -1) return;

	const hasAnswerList = question.mode === "classic" || question.mode === "majority";
	let newQuestion: TwitchatDataTypes.QuizParams["questionList"][number];

	if (newMode === "classic") {
		const answerList = hasAnswerList
			? question.answerList.map((a) => ({ id: a.id, title: a.title, correct: false }))
			: [
					{ id: Utils.getUUID(), title: "", correct: true },
					{ id: Utils.getUUID(), title: "", correct: false },
				];
		newQuestion = {
			id: question.id,
			mode: "classic",
			question: question.question,
			duration_s: question.duration_s,
			answerList,
		};
	} else if (newMode === "majority") {
		const answerList = hasAnswerList
			? question.answerList.map((a) => ({ id: a.id, title: a.title }))
			: [
					{ id: Utils.getUUID(), title: "" },
					{ id: Utils.getUUID(), title: "" },
				];
		newQuestion = {
			id: question.id,
			mode: "majority",
			question: question.question,
			duration_s: question.duration_s,
			answerList,
		};
	} else {
		newQuestion = {
			id: question.id,
			mode: "freeAnswer",
			question: question.question,
			duration_s: question.duration_s,
			answer: "",
		};
	}

	props.quiz.questionList.splice(index, 1, newQuestion);
	save();
}

function onCSVImport(file: File): void {
	if (file.type != "text/csv" && !file.name.endsWith(".csv")) {
		storeCommon.alert(t("quiz.form.import_invalid_file"));
		return;
	}

	file.text().then((content) => {
		const questions = content
			.split("\n")
			.map((line) => line.split(";"))
			.filter((line) => line.length > 0);
		questions.forEach((line) => {
			const questionText = line[0]!.trim();
			if (!questionText) return;
			const answersText = line.slice(1).filter((a) => a.trim());

			if (answersText.length === 1) {
				props.quiz.questionList.push({
					id: Utils.getUUID(),
					mode: "freeAnswer",
					question: questionText,
					answer: answersText[0]!.trim(),
				});
			} else if (answersText.length >= 2) {
				props.quiz.questionList.push({
					id: Utils.getUUID(),
					mode: "classic",
					question: questionText,
					answerList: answersText.map((a, index) => ({
						id: Utils.getUUID(),
						title: a.trim(),
						correct: index === 0,
					})),
				});
			}
		});
		save();
	});
}
</script>

<style scoped lang="less">
.quizquestionlist {
	display: contents;

	.splitter {
		margin: 1em 0;
		.icon {
			height: 1em;
			margin-right: 0.25em;
			vertical-align: middle;
		}
	}

	.noQuestion {
		text-align: center;
		font-style: italic;
	}

	.questionList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}

	.addQuestionBtns {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		& > :first-child {
			flex: 1 1 100%;
			text-align: center;
			font-weight: bold;
		}
		.button {
			min-width: 120px;
		}

		.importForm {
			display: flex;
			flex-direction: row;
			justify-content: center;
			flex: 1 1 100%;
			.button {
				flex-wrap: nowrap;
			}

			& > * {
				border-radius: 0;
			}
			& > *:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			& > *:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}

			& > .icon {
				cursor: help;
				padding: 0.25em;
				background-color: var(--color-secondary);
				height: auto;
				max-width: 1.5em;
			}

			& > .icon:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			& > .icon:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}
		}
	}
}
</style>
