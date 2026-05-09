<template>
	<div class="quizquestionlist">
		<div class="noQuestion" v-if="search && quiz.questionList.length === 0">
			{{ t("quiz.form.no_question") }}
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
				v-for="question in visibleQuestions"
				:key="question.id"
				:question="question"
				:quiz="quiz"
				:autoOpen="autoOpenQuestionID === question.id"
				@delete="deleteQuestion"
				@changeMode="changeQuestionMode"
			/>
		</VueDraggable>

		<div class="card-item addQuestionBtns" v-if="quiz.questionList.length < maxQuestionCount">
			<div>{{ t("quiz.form.add_question_title") }}</div>
			<TTButton
				@click="addQuestion('classic')"
				icon="quiz_classic"
				primary
				v-tooltip="t('quiz.form.mode_classic.description')"
				>{{ t("quiz.form.mode_classic.title") }}</TTButton
			>
			<TTButton
				@click="addQuestion('freeAnswer')"
				icon="quiz_freeAnswer"
				primary
				v-tooltip="t('quiz.form.mode_freeAnswer.description')"
				>{{ t("quiz.form.mode_freeAnswer.title") }}</TTButton
			>
			<TTButton
				@click="addQuestion('majority')"
				icon="quiz_majority"
				primary
				v-tooltip="t('quiz.form.mode_majority.description')"
				>{{ t("quiz.form.mode_majority.title") }}</TTButton
			>
			<div class="importForm">
				<TTButton
					icon="download"
					type="file"
					primary
					accept=".csv"
					@update:file="(file: File) => onCSVImport(file)"
					>{{ t("quiz.form.import_bt") }}</TTButton
				>
				<Icon class="sideItem" name="info" v-tooltip="t('quiz.form.import_tt')" />
			</div>
			<div class="importForm" v-if="!availableLanguages">
				<TTButton
					icon="download"
					type="file"
					primary
					accept=".csv"
					@update:file="(file: File) => onOpenquizzdbCSVImport(file)"
					>{{ t("quiz.form.importOpenQuizzDB_bt") }}</TTButton
				>
				<TTButton
					class="sideItem"
					type="link"
					target="_blank"
					href="https://www.openquizzdb.org/listing/"
					icon="openquizzdb"
					light
					v-tooltip="t('quiz.form.importOpenQuizzDB_tt')"
				/>
			</div>
			<div class="importForm languageList" v-else>
				<span class="title"
					><Icon name="openquizzdb" />{{ t("quiz.form.importOpenQuizzDB_lang") }}</span
				>
				<TTButton
					light
					v-for="lang in availableLanguages"
					@click="finalizeOpenquizdbImport(lang)"
				>
					<CountryFlag :country="lang == 'en' ? 'gb' : lang" class="flag" />{{
						t(`global.languages.${lang}`)
					}}</TTButton
				>
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
import { computed, ref, watch } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { useI18n } from "vue-i18n";
import QuizQuestionItem from "./QuizQuestionItem.vue";
import { toast } from "@/utils/toast/toast";
import CountryFlag from "vue-country-flag-next";
import Icon from "../Icon.vue";

const props = defineProps<{
	quiz: TwitchatDataTypes.QuizParams;
}>();

const { t } = useI18n();
const storeCommon = useStoreCommon();
const storeQuiz = useStoreQuiz();
const storeAuth = useStoreAuth();

const search = ref("");
const availableLanguages = ref<string[] | null>(null);
const autoOpenQuestionID = ref<string | null>(null);
let openquizzdbCSV = "";

const maxQuestionCount = computed(() => {
	return storeAuth.isPremium
		? Config.instance.MAX_QUESTIONS_PER_QUIZ_PREMIUM
		: Config.instance.MAX_QUESTIONS_PER_QUIZ;
});

const BATCH_SIZE = 10;
const visibleCount = ref(BATCH_SIZE);
let batchRafId = 0;

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

const visibleQuestions = computed(() => filteredQuestions.value.slice(0, visibleCount.value));

function scheduleNextBatch(): void {
	if (batchRafId) cancelAnimationFrame(batchRafId);
	batchRafId = requestAnimationFrame(() => {
		batchRafId = 0;
		if (visibleCount.value >= filteredQuestions.value.length) return;
		visibleCount.value += BATCH_SIZE;
		if (visibleCount.value < filteredQuestions.value.length) scheduleNextBatch();
	});
}

watch(
	filteredQuestions,
	() => {
		visibleCount.value = BATCH_SIZE;
		if (filteredQuestions.value.length > BATCH_SIZE) scheduleNextBatch();
	},
	{ immediate: true },
);

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

async function onCSVImport(file: File): Promise<void> {
	let isValid = file.type == "text/csv" && file.name.endsWith(".csv");
	if (isValid) {
		const content = await file.text();
		openquizzdbCSV = content;
		const firstRow = content.split("\n")[0]?.split(";");
		if (isValid && !firstRow) isValid = false;
		if (isValid && firstRow!.length < 3) isValid = false;
		if (isValid && !isNaN(parseInt(firstRow![0]!))) isValid = false; // Filter openquizzdb
		if (isValid) {
			const questions = content
				.split("\n")
				.map((line) => line.split(";"))
				.filter((line) => line.length > 0);
			questions.forEach((line) => {
				const questionText = line[0]!.trim();
				if (!questionText) return;
				const answerList = line.slice(1).filter((a) => a.trim());

				if (answerList.length === 1) {
					props.quiz.questionList.push({
						id: Utils.getUUID(),
						mode: "freeAnswer",
						question: questionText,
						answer: answerList[0]!.trim(),
					});
				} else if (answerList.length >= 2) {
					props.quiz.questionList.push({
						id: Utils.getUUID(),
						mode: "classic",
						question: questionText,
						answerList: answerList.map((a, index) => ({
							id: Utils.getUUID(),
							title: a.trim(),
							correct: index === 0,
						})),
					});
				}
			});
			save();
		}
	}
	if (!isValid) toast(t("quiz.form.import_invalid_file"), { type: "error" });
}

async function onOpenquizzdbCSVImport(file: File): Promise<void> {
	let isValid = file.type == "text/csv" && file.name.endsWith(".csv");

	if (isValid) {
		const content = await file.text();
		openquizzdbCSV = content;
		const firstRow = content.split("\n")[0]?.split(";");
		if (isValid && !firstRow) isValid = false;
		if (isValid && firstRow!.length < 8) isValid = false;
		if (isValid && isNaN(parseInt(firstRow![0]!))) isValid = false;
		if (isValid && firstRow![1]!.length != 2) isValid = false;
		if (isValid) {
			availableLanguages.value = [];
			const langDone = new Set<string>();
			/// Extract available languages
			content.split("\n").forEach((row) => {
				const [index, lang] = row.split(";");
				if (!lang || langDone.has(lang)) return;
				langDone.add(lang);
				availableLanguages.value!.push(lang);
			});
		}
	}

	if (!isValid) toast(t("quiz.form.import_invalid_file"), { type: "error" });
	else if (availableLanguages.value?.length == 1) {
		finalizeOpenquizdbImport(availableLanguages.value[0]!);
	}
}

function finalizeOpenquizdbImport(langRef: string): void {
	availableLanguages.value = null;
	const content = openquizzdbCSV;
	const questions = content
		.split("\n")
		.map((line) => line.split(";"))
		.filter((line) => line.length > 0);
	questions.forEach((line) => {
		const [
			index,
			lang,
			question,
			answer1,
			answer2,
			answer3,
			answer4,
			level,
			details,
			wikipediaUrl,
		] = line;
		if (!question || !answer1 || !answer2 || !answer3 || !answer4 || lang != langRef) return;
		props.quiz.questionList.push({
			id: Utils.getUUID(),
			mode: "classic",
			question: question,
			answerList: [answer1, answer2, answer3, answer4].map((a, index) => ({
				id: Utils.getUUID(),
				title: a.trim(),
				correct: index === 0,
			})),
		});
	});
	save();
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

			& > .sideItem {
				height: auto;
				max-width: 1.5em;
				flex-shrink: 1;
				min-width: unset;
			}

			& > .sideItem.icon {
				cursor: help;
				padding: 0.25em;
				color: var(--color-primary);
				background-color: var(--color-light);
			}

			& > .icon:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			& > .icon:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}

			&.languageList {
				background-color: var(--color-primary);
				border-radius: var(--border-radius);
				margin: auto;
				align-self: center;
				justify-self: center;
				padding: 0.5em;
				gap: 0.25em;
				flex-direction: column;
				align-items: center;

				.title {
					display: flex;
					align-items: center;
					font-weight: bold;
					margin-bottom: 0.5em;
					.icon {
						margin-right: 0.5em;
					}
				}

				.flag {
					margin-right: -5px !important;
					vertical-align: middle !important;
				}

				& > * {
					border-radius: var(--border-radius);
				}
			}
		}
	}
}
</style>
