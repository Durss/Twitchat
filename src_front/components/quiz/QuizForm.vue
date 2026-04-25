<template>
	<div class="quizform sidePanel" :class="{ embedMode }" ref="rootEl">
		<div class="head" v-if="embedMode === false">
			<div class="title">
				<Icon name="quiz" />
				<i18n-t scope="global" tag="h1" keypath="quiz.form.title"> </i18n-t>
			</div>

			<i18n-t scope="global" class="description" tag="span" keypath="quiz.form.subtitle">
			</i18n-t>

			<ClearButton @click="close()" />
		</div>

		<div class="content" ref="content">
			<div class="overlayInstallCard">
				<h1><Icon name="obs" />{{ $t("quiz.form.install_title") }}</h1>
				<OverlayInstaller type="quiz" sourceSuffix="Twitchat_Quiz" />
			</div>

			<VueDraggable
				class="quizList"
				v-model="storeQuiz.quizList"
				:group="{ name: 'quiz' }"
				handle=".header"
				:animation="250"
				@end="storeQuiz.saveData()"
			>
				<ToggleBlock
					v-for="quiz in storeQuiz.quizList"
					editableTitle
					v-model:title="quiz.title"
					:titleDefault="$t('quiz.form.default_title')"
					:titleMaxLengh="30"
					:open="autoOpenQuizID === quiz.id"
					:key="quiz.id"
					@update:title="save(quiz)"
				>
					<template #left_actions>
						<ToggleButton
							small
							v-model="quiz.enabled"
							@click.stop
							@change="save(quiz)"
							:disabled="!storeAuth.isPremium && storeQuiz.quizList.length > 1"
						/>
					</template>

					<template #right_actions>
						<TTButton
							@click.stop="duplicateQuiz(quiz.id)"
							data-close-popout
							icon="copy"
							v-tooltip="$t('global.duplicate')"
							v-if="!maxQuizReached"
						/>
						<TTButton
							@click.stop
							:copy="quiz.id"
							icon="id"
							v-tooltip="$t('global.copy_id')"
						/>
						<TTButton @click.stop="storeQuiz.removeQuiz(quiz.id)" icon="trash" alert />
					</template>

					<div class="form">
						<ToggleBlock
							:icons="['params']"
							small
							:title="$t('global.settings')"
							:open="false"
						>
							<div class="settings">
								<ParamItem
									:paramData="param_duration[quiz.id]!"
									v-model="quiz.durationPerQuestion_s"
									@change="save(quiz)"
								/>
								<ParamItem
									:paramData="param_looseOnFail[quiz.id]!"
									v-model="quiz.loosePointsOnFail"
									@change="save(quiz)"
								/>
								<ParamItem
									:paramData="param_timeBasedScore[quiz.id]!"
									v-model="quiz.timeBasedScoring"
									@change="save(quiz)"
								/>
								<ParamItem
									:paramData="param_tolerance[quiz.id]!"
									v-model="quiz.toleranceLevel"
									@change="save(quiz)"
									class="toleranceParam"
								/>
							</div>
						</ToggleBlock>

						<QuizQuestionList :quiz="quiz" />
					</div>
				</ToggleBlock>
			</VueDraggable>

			<div class="createForm">
				<TTButton
					class="addBt"
					v-if="storeAuth.isPremium || storeQuiz.quizList.length < $config.MAX_QUIZ"
					@click="addQuiz()"
					icon="add"
					>{{ $t("quiz.form.add_bt") }}</TTButton
				>

				<PremiumLimitMessage
					v-else
					label="quiz.form.non_premium_limit"
					premiumLabel="quiz.form.premium_limit"
					:max="$config.MAX_QUIZ"
					:maxPremium="$config.MAX_QUIZ_PREMIUM"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import ClearButton from "@/components/ClearButton.vue";
import OverlayInstaller from "@/components/params/contents/overlays/OverlayInstaller.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import PremiumLimitMessage from "@/components/params/PremiumLimitMessage.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import TTButton from "@/components/TTButton.vue";
import { useSidePanel } from "@/composables/useSidePanel";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeQuiz as useStoreQuiz } from "@/store/quiz/storeQuiz";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import { computed, onBeforeMount, ref, useTemplateRef } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import QuizQuestionList from "./QuizQuestionList.vue";

const props = withDefaults(defineProps<{ embedMode?: boolean }>(), { embedMode: false });

const emit = defineEmits<{ close: [] }>();

const storeAuth = useStoreAuth();
const storeQuiz = useStoreQuiz();

const rootEl = useTemplateRef<HTMLElement>("rootEl");

const { close } = useSidePanel(rootEl, () => emit("close"));

const param_duration = ref<Record<string, TwitchatDataTypes.ParameterData<number>>>({});
const param_timeBasedScore = ref<Record<string, TwitchatDataTypes.ParameterData<boolean>>>({});
const param_looseOnFail = ref<Record<string, TwitchatDataTypes.ParameterData<boolean>>>({});
const param_tolerance = ref<Record<string, TwitchatDataTypes.ParameterData<number>>>({});
const autoOpenQuizID = ref<string | null>(null);

const maxQuizReached = computed((): boolean => {
	if (storeAuth.isPremium) {
		return storeQuiz.quizList.length >= Config.instance.MAX_QUIZ_PREMIUM;
	} else {
		return storeQuiz.quizList.length >= Config.instance.MAX_QUIZ;
	}
});

onBeforeMount(() => {
	initParams();
	if (!storeAuth.isPremium && storeQuiz.quizList.filter((v) => v.enabled).length === 0) {
		storeQuiz.quizList[0]!.enabled = true;
	}
});

/**
 * Save data to storage
 */
function save(quiz: TwitchatDataTypes.QuizParams): void {
	storeQuiz.saveData(quiz.id);
}

/**
 * Create a new quiz
 */
function addQuiz(): void {
	const quiz = storeQuiz.addQuiz();
	autoOpenQuizID.value = quiz.id;
	initParams();
}

/**
 * Duplicate given quiz ID
 */
function duplicateQuiz(id: string): void {
	const quiz = storeQuiz.duplicateQuiz(id);
	autoOpenQuizID.value = quiz?.id ?? null;
	initParams();
}

/**
 * Initialize quiz-level parameters
 */
function initParams(): void {
	const spellingOptions = [
		{ value: 0, labelKey: "quiz.form.tolerances.none" },
		{ value: 1, labelKey: "quiz.form.tolerances.very_low" },
		{ value: 2, labelKey: "quiz.form.tolerances.low" },
		{ value: 3, labelKey: "quiz.form.tolerances.medium" },
		{ value: 4, labelKey: "quiz.form.tolerances.high" },
		{ value: 5, labelKey: "quiz.form.tolerances.very_high" },
	];
	storeQuiz.quizList.forEach((quiz) => {
		const id = quiz.id;
		if (!param_duration.value[id]) {
			param_duration.value[id] = {
				type: "number",
				value: 30,
				min: 5,
				max: 600,
				labelKey: "quiz.form.param_duration",
				icon: "countdown",
			};
			param_timeBasedScore.value[id] = {
				type: "boolean",
				value: false,
				labelKey: "quiz.form.param_time_based_scoring",
				icon: "timer",
			};
			param_looseOnFail.value[id] = {
				type: "boolean",
				value: true,
				labelKey: "quiz.form.param_loose_on_fail",
				icon: "sad",
			};
		}

		if (!param_tolerance.value[id]) {
			param_tolerance.value[id] = {
				type: "list",
				value: 1,
				listValues: spellingOptions,
				labelKey: "quiz.form.param_tolerance",
				icon: "spelling",
			};
		}
	});
}
</script>

<style scoped lang="less">
.quizform {
	.form {
		gap: 0.5em;
	}

	.settings {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}

	.toleranceParam {
		:deep(.holder) {
			flex-direction: column;
			select {
				flex-basis: unset;
			}
		}
	}

	.createForm {
		text-align: center;
		gap: 1em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.quizList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}
}
</style>
