<template>
	<div class="quizquestionitem card-item">
		<div class="actions">
			<Icon class="dragHandle" name="dragZone" />

			<div class="innerGroup">
				<TTButton
					class="modeSelector"
					:icon="`quiz_${question.mode}`"
					transparent
					@click="(e: MouseEvent) => selectQuestionMode(e)"
					v-tooltip="$t(`quiz.form.mode_${question.mode}.title`)"
				/>

				<div class="durationOverride" v-tooltip="$t('quiz.form.durationOverride_tt')">
					<TTButton
						v-if="!editDurationOverride"
						icon="countdown"
						tabindex="-1"
						@click="setCustomDuration()"
						:secondary="!!question.duration_s && question.duration_s > 0"
						:transparent="!question.duration_s"
						>{{ question.duration_s ? question.duration_s + "s" : "" }}</TTButton
					>
					<span v-else class="durationForm">
						<ContentEditable
							tag="span"
							v-model="question.duration_s"
							v-autofocus
							:min="5"
							:max="600"
							:contenteditable="true"
							noNl
							numeric
							@blur="editDurationOverride = false"
							@submit="editDurationOverride = false"
							@keydown.native.esc.capture.prevent
						/>s
					</span>
				</div>

				<div
					class="toleranceOverride"
					v-if="question.mode == 'freeAnswer'"
					v-tooltip="$t('quiz.form.toleranceOverride_tt')"
				>
					<TTButton
						icon="spelling"
						tabindex="-1"
						@click="(e: MouseEvent | TouchEvent) => selectCustomTolerance(e)"
						:secondary="
							question.toleranceLevel !== undefined && question.toleranceLevel >= 0
						"
						:transparent="
							question.toleranceLevel === undefined || question.toleranceLevel < 0
						"
						>{{
							question.toleranceLevel == undefined
								? ""
								: {
										"0": $t("quiz.form.tolerances.none").split(" ")[0],
										"1": $t("quiz.form.tolerances.very_low").split(" ")[0],
										"2": $t("quiz.form.tolerances.low").split(" ")[0],
										"3": $t("quiz.form.tolerances.medium").split(" ")[0],
										"4": $t("quiz.form.tolerances.high").split(" ")[0],
										"5": $t("quiz.form.tolerances.very_high").split(" ")[0],
									}[question.toleranceLevel]
						}}</TTButton
					>
				</div>
			</div>

			<TTButton
				class="deleteBt"
				icon="trash"
				alert
				v-tooltip="$t('quiz.form.deleteQuestionbt_tt')"
				@click="$emit('delete', question.id)"
			/>
		</div>

		<TTButton
			@click.stop
			:copy="question.id"
			icon="id"
			v-tooltip="$t('global.copy_id')"
			class="copyIdBt"
			small
		/>

		<div class="question">
			<div class="questionHolder">
				<icon name="question" />
				<ParamItem
					:paramData="param_question"
					v-model="question.question"
					@blur="save()"
					noBackground
					:autofocus="autoOpen"
				/>
			</div>

			<template v-if="question.mode == 'freeAnswer'">
				<div class="singleAnswer">
					<icon name="quiz_answers" />
					<ParamItem
						:paramData="param_answer[question.id]"
						v-model="question.answer"
						@blur="save()"
						noBackground
					/>
				</div>

				<div
					class="testAnswer card-item dark"
					:class="{ valid: isValidAnswer, testMode: freeAnswerTest.length > 0 }"
				>
					<icon name="test" />
					<input
						class="noBg"
						:placeholder="$t('quiz.form.test_answer_placeholder')"
						v-model="freeAnswerTest"
						@input="testAnswer"
					/>
				</div>
			</template>

			<template v-else>
				<ToggleBlock
					:icons="question.mode == 'classic' ? ['quiz_answers'] : ['quiz_answers_wrong']"
					class="answersBlock"
					:subtitle="
						question.mode == 'majority' ? $t('quiz.form.answers_majority_subtitle') : ''
					"
					:title="
						question.mode == 'classic'
							? $t('quiz.form.answers', { COUNT: question.answerList.length })
							: $t('quiz.form.answers_majority', {
									COUNT: question.answerList.length,
								})
					"
					noTitleColor
					small
					:open="autoOpen"
				>
					<div class="answerList">
						<div
							v-for="answer in question.answerList"
							class="answer"
							:key="'answer_' + answer.id"
						>
							<TTButton
								v-if="$utils.isClassicQuizAnswer(question.mode, answer)"
								class="correctToggle"
								@click="tickAnswer(question.answerList, answer)"
								v-tooltip="
									answer.correct
										? $t('quiz.form.answer_correct')
										: $t('quiz.form.answer_wrong')
								"
								:icon="answer.correct ? 'checkmark' : 'cross'"
								:primary="answer.correct"
								:disabled="
									$utils.isClassicQuizAnswer(question.mode, answer) &&
									answer.correct &&
									question.answerList.filter(
										(a) =>
											$utils.isClassicQuizAnswer(question.mode, a) &&
											a.correct,
									).length === 1
								"
								noBounce
							/>
							<ParamItem
								:paramData="param_answer[answer.id]"
								v-model="answer.title"
								@blur="save()"
								noBackground
							/>
							<TTButton
								v-if="question.answerList.length > 2"
								class="deleteBt"
								icon="trash"
								@click="deleteAnswer(answer.id)"
								alert
							/>
						</div>

						<TTButton
							:sortable="false"
							:draggable="false"
							class="addBt"
							v-if="question.answerList.length < (question.mode == 'classic' ? 6 : 4)"
							@click="addAnswer()"
							primary
							icon="add"
							>{{ $t("quiz.form.addAnswer_bt") }}</TTButton
						>
					</div>
				</ToggleBlock>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import ContentEditable from "@/components/ContentEditable.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import TTButton from "@/components/TTButton.vue";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeQuiz as useStoreQuiz } from "@/store/quiz/storeQuiz";
import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import ContextMenu, { type MenuOptions } from "@imengyu/vue3-context-menu";
import {
	computed,
	h,
	onBeforeMount,
	ref,
	watch,
	type RendererElement,
	type RendererNode,
	type VNode,
} from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	question: TwitchatDataTypes.QuizParams["questionList"][number];
	quizId: string;
	autoOpen?: boolean;
}>();

const emit = defineEmits<{
	delete: [questionId: string];
	changeMode: [
		question: TwitchatDataTypes.QuizParams["questionList"][number],
		newMode: "classic" | "majority" | "freeAnswer",
	];
}>();

const { t, tm } = useI18n();
const storeCommon = useStoreCommon();
const storeQuiz = useStoreQuiz();

const param_question = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 300,
	placeholderKey: "quiz.form.question_placeholder",
});
const param_answer = ref<Record<string, TwitchatDataTypes.ParameterData<string>>>({});
const freeAnswerTest = ref("");
const editDurationOverride = ref(false);
const isValidAnswer = ref(false);

watch(
	() => props.question,
	() => {
		initParams();
	},
);

onBeforeMount(() => {
	initParams();
});

function save(): void {
	storeQuiz.saveData(props.quizId);
	testAnswer();
}

function addAnswer(): void {
	if (props.question.mode === "freeAnswer") return;
	props.question.answerList.push({ id: Utils.getUUID(), title: "" });
	initParams();
	save();
}

function deleteAnswer(answerId: string): void {
	if (props.question.mode === "freeAnswer") return;
	props.question.answerList = props.question.answerList.filter((v) => v.id != answerId);
	initParams();
	save();
}

function setCustomDuration(): void {
	if (props.question.duration_s) {
		delete props.question.duration_s;
	} else {
		props.question.duration_s = 30;
		editDurationOverride.value = true;
	}
	save();
}

function tickAnswer(
	answerList: Extract<
		TwitchatDataTypes.QuizParams["questionList"][number],
		{ mode: "classic" }
	>["answerList"],
	answer: Extract<
		TwitchatDataTypes.QuizParams["questionList"][number],
		{ mode: "classic" }
	>["answerList"][number],
): void {
	if (answer.correct) {
		if (answerList.filter((a) => a.correct).length > 1) {
			answer.correct = false;
		}
	} else {
		answer.correct = true;
	}
	save();
}

function selectCustomTolerance(event: MouseEvent | TouchEvent): void {
	if (props.question.mode !== "freeAnswer") return;
	const question = props.question;
	const list: { [key: string]: string } = tm("quiz.form.tolerances") as {
		[key: string]: string;
	};
	const px =
		event.type == "touchstart"
			? (event as TouchEvent).touches[0]!.clientX
			: (event as MouseEvent).x;
	const py =
		event.type == "touchstart"
			? (event as TouchEvent).touches[0]!.clientY
			: (event as MouseEvent).y;
	const menu: MenuOptions = {
		theme: "mac " + storeCommon.theme,
		x: px,
		y: py,
		items: [],
		mouseScroll: true,
		closeWhenScroll: false,
		updownButtonSpaceholder: false,
	};

	let index: 0 | 1 | 2 | 3 | 4 | 5 = 0;
	for (const key in list) {
		if (!Object.hasOwn(list, key)) continue;
		menu.items!.push({
			customClass:
				(key == "undefined" && question.toleranceLevel === undefined) ||
				question.toleranceLevel === index - 1
					? "selected"
					: "",
			label: t("quiz.form.tolerances." + key),
			preserveIconWidth: false,
			onClick: ((index) => {
				return () => {
					if (key == "undefined") {
						delete question.toleranceLevel;
					} else {
						question.toleranceLevel = (index - 1) as 0 | 1 | 2 | 3 | 4 | 5;
					}
					save();
				};
			})(index),
		});
		index++;
	}
	ContextMenu.showContextMenu(menu);
}

function selectQuestionMode(event: MouseEvent): void {
	const menu: MenuOptions = {
		theme: "mac " + storeCommon.theme,
		x: event.x,
		y: event.y,
		items: [
			{
				icon: getIcon("icons/quiz_classic.svg"),
				customClass: props.question.mode === "classic" ? "selected" : "",
				label: t("quiz.form.mode_classic.title"),
				onClick: () => emit("changeMode", props.question, "classic"),
			},
			{
				icon: getIcon("icons/quiz_freeAnswer.svg"),
				customClass: props.question.mode === "freeAnswer" ? "selected" : "",
				label: t("quiz.form.mode_freeAnswer.title"),
				onClick: () => emit("changeMode", props.question, "freeAnswer"),
			},
			{
				icon: getIcon("icons/quiz_majority.svg"),
				customClass: props.question.mode === "majority" ? "selected" : "",
				label: t("quiz.form.mode_majority.title"),
				onClick: () => emit("changeMode", props.question, "majority"),
			},
		],
		mouseScroll: true,
		closeWhenScroll: false,
		updownButtonSpaceholder: false,
	};
	ContextMenu.showContextMenu(menu);
}

function getIcon(icon: string): VNode<RendererNode, RendererElement> {
	return h("img", {
		src: StoreProxy.asset(icon),
		style: { width: "1em", height: "1em" },
	});
}

function initParams(): void {
	if (props.question.mode == "freeAnswer") {
		if (!param_answer.value[props.question.id]) {
			param_answer.value[props.question.id] = {
				type: "string",
				value: "",
				maxLength: 50,
				placeholderKey: "quiz.form.answer_placeholder",
			};
		}
	} else {
		props.question.answerList.forEach((answer) => {
			if (!param_answer.value[answer.id]) {
				param_answer.value[answer.id] = {
					type: "string",
					value: "",
					maxLength: 130,
					placeholderKey: "quiz.form.answer_placeholder",
				};
			}
		});
	}
}

/**
 * Test if current free answer test value is valid
 */
function testAnswer(): void {
	if (props.question.mode !== "freeAnswer") return;
	isValidAnswer.value = storeQuiz.validateFreeAnswer(
		freeAnswerTest.value,
		storeQuiz.quizList.find((q) => q.enabled)!,
		props.question,
	);
}

const quiz = computed(() => {
	return storeQuiz.quizList.find((q) => q.enabled)!;
});
/**
 * Check for global tolerance level changes to update the free answer test validity accordingly
 */
watch(
	() => quiz.value.toleranceLevel,
	() => {
		testAnswer();
	},
);
</script>

<style scoped lang="less">
.quizquestionitem {
	gap: 0.5em;
	display: flex;
	flex-direction: column;
	position: relative;
	overflow: visible;

	.actions {
		gap: 3px;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;

		.innerGroup {
			gap: 0.25em;
			display: flex;
			flex-direction: row;
			align-items: center;
			flex-grow: 1;
			flex-wrap: wrap;
			justify-content: flex-start;
		}

		.dragHandle {
			flex-shrink: 0;
			padding: 0.25em;
			height: 1.25em;
			cursor: grab;
			margin-right: 1em;
		}

		.modeSelector {
			flex-shrink: 0;
			align-self: flex-start;
			:deep(.icon) {
				max-width: 1.25em;
			}
		}

		.durationOverride,
		.toleranceOverride {
			display: flex;
			.button {
				height: 100%;
				min-height: 100%;
				padding-left: 0.5em;
				padding-right: 0.5em;
				gap: 0.25em;
				flex-wrap: nowrap;
				flex-shrink: 0;
				::v-deep(.icon) {
					flex-shrink: 0;
				}
				::v-deep(.label) {
					font-size: 0.7em;
					flex-shrink: 0;
				}
			}

			&.toleranceOverride {
				::v-deep(.label) {
					font-size: 1em;
					margin-top: -0.5em;
					margin-bottom: -0.5em;
				}
			}

			.durationForm {
				margin-top: 0.1em;
				padding: 0.25em 0.5em;
				font-size: 0.8em;
				align-self: center;
			}
		}
	}

	.deleteBt {
		flex-shrink: 0;
		height: 100%;
	}

	.copyIdBt {
		position: absolute;
		top: -0.5em;
		left: -0.5em;
		z-index: 1;
		border-radius: var(--border-radius);
		opacity: 0;
	}

	&:hover {
		background-color: var(--background-color-secondary);
		.copyIdBt {
			opacity: 1;
		}
	}

	.question {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		flex: 1;

		.questionHolder {
			display: flex;
			flex-direction: row;
			align-items: stretch;
			background-color: var(--background-color-fader);
			border-radius: var(--border-radius);

			& > .icon {
				width: 1.35em;
				flex-shrink: 0;
				align-self: center;
				:deep(svg) {
					margin: auto;
				}
			}

			.paramitem {
				flex-grow: 1;
				::v-deep(input),
				::v-deep(textarea) {
					background: transparent;
				}
			}
		}

		.answersBlock {
			::v-deep(.header) {
				.title {
					font-size: 1rem;
				}
				& > .icon {
					width: 2em;
					height: 2em;
					flex-shrink: 0;
				}
			}
		}

		.singleAnswer {
			display: flex;
			flex-direction: row;
			align-items: stretch;
			background-color: var(--background-color-fader);
			border-radius: var(--border-radius);

			& > .icon {
				width: 1.35em;
				flex-shrink: 0;
				align-self: center;
				:deep(svg) {
					margin: auto;
				}
			}

			.paramitem {
				flex-grow: 1;
				::v-deep(input),
				::v-deep(textarea) {
					background: transparent;
				}
			}
		}

		.testAnswer {
			padding: 0;
			display: flex;
			flex-direction: row;

			& > .icon {
				width: 1.35em;
				flex-shrink: 0;
				align-self: center;
				:deep(svg) {
					margin: auto;
				}
			}
			&.testMode {
				&.valid {
					background-color: var(--color-primary-dark);
				}
				&:not(.valid) {
					background-color: var(--color-alert-dark);
				}
			}
		}

		.answerList {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			& > * {
				flex-grow: 1;
				flex-basis: calc(50% - 0.5em);
				min-width: 170px;
			}
			.answer {
				display: flex;
				position: relative;
				flex-direction: row;
				.correctToggle {
					flex-shrink: 0;
				}
				& > .paramitem {
					flex-grow: 1;
				}
				& > * {
					border-radius: 0;
					&.paramitem::v-deep(.content) {
						flex-grow: 1;
						.holder {
							flex-grow: 1;
							height: 100%;
							.inputHolder {
								flex-grow: 1;
								height: 100%;
								border-radius: 0;
								textarea,
								input {
									border-radius: 0;
									flex-grow: 1;
									height: 100%;
									resize: none;
								}
							}
						}
					}
				}
				& > *:first-child {
					border-top-left-radius: var(--border-radius);
					border-bottom-left-radius: var(--border-radius);
					&.paramitem::v-deep(.content) {
						.holder {
							.inputHolder,
							textarea,
							input {
								border-top-left-radius: var(--border-radius);
								border-bottom-left-radius: var(--border-radius);
							}
						}
					}
				}
				& > *:last-child {
					border-top-right-radius: var(--border-radius);
					border-bottom-right-radius: var(--border-radius);
					&.paramitem::v-deep(.content) {
						.holder {
							.inputHolder,
							textarea,
							input {
								border-top-right-radius: var(--border-radius);
								border-bottom-right-radius: var(--border-radius);
							}
						}
					}
				}
			}
		}
	}
}
</style>
