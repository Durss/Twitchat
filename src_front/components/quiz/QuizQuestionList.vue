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
		</div>
		<div class="card-item importHolder">
			<template v-if="!showImportOptions">
				<TTButton @click="showImportOptions = true">{{
					t("quiz.form.import_bt")
				}}</TTButton>
				<TTButton
					@click="storeQuiz.exportCSV(quiz.id)"
					icon="upload"
					:disabled="quiz.questionList.length === 0"
					>{{ t("quiz.form.export_bt") }}</TTButton
				>
			</template>
			<template v-if="showImportOptions">
				<ClearButton
					icon="back"
					class="backBt"
					@click="
						availableLanguages
							? (availableLanguages = null)
							: (showImportOptions = false)
					"
				/>
				<template v-if="!availableLanguages">
					<i18n-t
						tag="span"
						class="instructions"
						keypath="quiz.form.importOpenQuizzDB_title"
					>
						<template #URL>
							<a href="https://www.openquizzdb.org/listing" target="_blank"
								>OpenQuizzDB.org<Icon name="newtab"
							/></a>
						</template>
					</i18n-t>
					<TTButton
						icon="download"
						type="file"
						primary
						accept=".csv"
						@update:file="(file: File) => onOpenquizzdbCSVImport(file)"
						>{{ t("quiz.form.importOpenQuizzDB_bt") }}</TTButton
					>
					<Splitter class="splitter">{{ t("global.or") }}</Splitter>
					<span class="instructions">{{ t("quiz.form.importCSV_title") }}</span>
					<TTButton
						icon="download"
						type="file"
						primary
						accept=".csv"
						@update:file="(file: File) => onCSVImport(file)"
						>{{ t("quiz.form.importCSV_bt") }}</TTButton
					>
					<ToggleBlock
						class="format"
						small
						:title="t('quiz.form.importCSV_format')"
						:open="false"
					>
						<div class="tableHolder">
							<table>
								<tr>
									<td>classic</td>
									<td>{{ t("quiz.form.importCSV_format_col_question") }}</td>
									<td>
										{{ t("quiz.form.importCSV_format_col_answer_n", { N: 1 }) }}
									</td>
									<td>
										{{ t("quiz.form.importCSV_format_col_answer_n", { N: 2 }) }}
									</td>
									<td class="optional">
										{{ t("quiz.form.importCSV_format_col_answer_n", { N: 3 }) }}
									</td>
									<td class="optional">
										{{ t("quiz.form.importCSV_format_col_answer_n", { N: 4 }) }}
									</td>
									<td class="optional">
										{{ t("quiz.form.importCSV_format_col_answer_n", { N: 5 }) }}
									</td>
									<td class="optional">
										{{ t("quiz.form.importCSV_format_col_answer_n", { N: 6 }) }}
									</td>
									<td class="optional">
										{{ t("quiz.form.importCSV_format_col_duration") }}
									</td>
								</tr>
								<tr>
									<td>majority</td>
									<td>{{ t("quiz.form.importCSV_format_col_question") }}</td>
									<td>
										{{ t("quiz.form.importCSV_format_col_answer_n", { N: 1 }) }}
									</td>
									<td>
										{{ t("quiz.form.importCSV_format_col_answer_n", { N: 2 }) }}
									</td>
									<td class="optional">
										{{ t("quiz.form.importCSV_format_col_answer_n", { N: 3 }) }}
									</td>
									<td class="optional">
										{{ t("quiz.form.importCSV_format_col_answer_n", { N: 4 }) }}
									</td>
									<td class="optional">
										{{ t("quiz.form.importCSV_format_col_duration") }}
									</td>
								</tr>
								<tr>
									<td>freeAnswer</td>
									<td>{{ t("quiz.form.importCSV_format_col_question") }}</td>
									<td>{{ t("quiz.form.importCSV_format_col_answer") }}</td>
									<td class="optional">
										{{ t("quiz.form.importCSV_format_col_duration") }}
									</td>
									<td class="optional">
										{{ t("quiz.form.importCSV_format_col_tolerance") }}<br />(0
										-> 5)
									</td>
								</tr>
							</table>
						</div>
						<ul class="formatNotes">
							<li v-html="t('quiz.form.importCSV_format_note_separator')"></li>
							<li v-html="t('quiz.form.importCSV_format_note_correct')"></li>
							<li v-html="t('quiz.form.importCSV_format_note_optional')"></li>
						</ul>
					</ToggleBlock>
				</template>
				<div class="languageList" v-else>
					<span class="title"
						><Icon name="openquizzdb" />{{
							t("quiz.form.importOpenQuizzDB_lang")
						}}</span
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
			</template>
		</div>

		<PremiumLimitMessage
			v-if="quiz.questionList.length >= maxQuestionCount"
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
import ClearButton from "../ClearButton.vue";
import Splitter from "../Splitter.vue";
import ToggleBlock from "../ToggleBlock.vue";

const props = defineProps<{
	quiz: TwitchatDataTypes.QuizParams;
}>();

const { t } = useI18n();
const storeQuiz = useStoreQuiz();
const storeAuth = useStoreAuth();

const search = ref("");
const showImportOptions = ref(false);
const availableLanguages = ref<string[] | null>(null);
const autoOpenQuestionID = ref<string | null>(null);

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
	const ok = await storeQuiz.importCSV(props.quiz.id, file);
	if (!ok) toast(t("quiz.form.import_invalid_file"), { type: "error" });
	scheduleNextBatch();
}

async function onOpenquizzdbCSVImport(file: File): Promise<void> {
	const languages = await storeQuiz.parseOpenquizzdbCSV(file);
	if (!languages) {
		toast(t("quiz.form.import_invalid_file"), { type: "error" });
		return;
	}
	availableLanguages.value = languages;
	if (languages.length === 1) {
		finalizeOpenquizdbImport(languages[0]!);
	}
}

function finalizeOpenquizdbImport(langRef: string): void {
	availableLanguages.value = null;
	showImportOptions.value = false;
	storeQuiz.importOpenquizzdbCSV(props.quiz.id, langRef);
	scheduleNextBatch();
}
</script>

<style scoped lang="less">
.quizquestionlist {
	display: contents;

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
	}

	.importHolder {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
		padding-left: 2em;
		padding-right: 2em;

		.backBt {
			left: 0;
			top: 50%;
			transform: translateY(-50%);
			padding: 0.5em;
			right: auto;
		}

		.splitter {
			align-self: stretch;
			margin: 1em 0;
		}
		.instructions {
			line-height: 1.1em;
			text-align: left;
			align-self: flex-start;
			.icon {
				vertical-align: middle;
			}
		}

		.languageList {
			gap: 0.25em;
			flex-direction: column;
			align-items: center;
			display: flex;

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

		.format {
			max-width: 100%;
		}

		.tableHolder {
			overflow: auto;
			padding-bottom: 0.5em;
		}
		td {
			padding: 0.25em 0.5em;
			border: 1px solid var(--color-text);
			font-family: "Courier New", Courier, monospace;
			white-space: nowrap;
			&:first-child {
				font-style: italic;
				font-size: 0.8em;
			}
			&.optional {
				opacity: 0.5;
				font-style: italic;
			}
		}

		.formatNotes {
			margin: 0.5em 0 0 0;
			padding-left: 1.2em;
			font-size: 0.9em;
			line-height: 1.3em;
			text-align: left;
			align-self: stretch;
			code {
				font-family: "Courier New", Courier, monospace;
				padding: 0 0.25em;
				border-radius: 0.25em;
				background-color: var(--background-color-fadest);
			}
		}
	}
}
</style>
