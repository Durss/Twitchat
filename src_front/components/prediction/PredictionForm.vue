<template>
	<div :class="classes" ref="rootEl">
		<div class="head" v-if="triggerMode === false">
			<ClearButton @click="close()" />
			<h1><Icon name="prediction" class="icon" />{{ t("prediction.form.title") }}</h1>
		</div>
		<div class="content">
			<VoiceGlobalCommandsHelper v-if="voiceController" class="voiceHelper" />

			<div class="presets" v-if="predictionHistory.length > 0">
				<TTButton
					@click="selectPreset(item)"
					v-for="item in predictionHistory"
					v-tooltip="'•' + item.options.join('\n•') + '\n(' + item.duration + 's)'"
					>{{ item.title }}</TTButton
				>
			</div>

			<form class="form" @submit.prevent="submitForm()">
				<div class="card-item">
					<ParamItem
						:paramData="param_title"
						noBackground
						v-model="title"
						:autofocus="title == ''"
						:tabindex="1"
						@change="onValueChange()"
					/>
				</div>

				<div class="card-item answers">
					<label for="prediction_answer">{{ t("prediction.form.outcomes") }}</label>
					<div
						v-for="(a, index) in answers"
						:class="getAnswerClasses(index)"
						:key="'answer' + index"
					>
						<div class="inputHolder">
							<input
								type="text"
								maxlength="25"
								v-model="answers[index]"
								v-autofocus="index == 0 && title != ''"
								:tabindex="index + 2"
								:placeholder="t('prediction.form.answer_placeholder')"
								@change="onValueChange()"
							/>
							<div class="len">{{ answers[index]!.length }}/25</div>
						</div>
						<TTButton
							:aria-label="t('prediction.form.outcome_delete_aria')"
							class="deleteBt"
							icon="cross"
							type="button"
							alert
							small
							v-if="
								answers.length > 2 &&
								(index < answers.length - 1 || answers.length == 10)
							"
							@click="deleteAnswer(index)"
						/>
					</div>
					<PlaceholderSelector
						class="child placeholders"
						v-if="placeholderList.length > 0"
						copyMode
						:placeholders="placeholderList"
					/>
				</div>

				<div class="card-item">
					<ParamItem noBackground :paramData="param_duration" @change="onValueChange()" />
				</div>

				<TTButton
					type="submit"
					v-if="triggerMode === false"
					:loading="loading"
					:disabled="!canSubmit"
					>{{ t("global.start") }}</TTButton
				>
				<div class="errorCard" v-if="error" @click="error = ''">{{ error }}</div>
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useSidePanel } from "@/composables/useSidePanel";
import DataStore from "@/store/DataStore";
import StoreProxy from "@/store/StoreProxy";
import { storeMain as useStoreMain } from "@/store/storeMain";
import {
	TriggerEventPlaceholders,
	type ITriggerPlaceholder,
	type TriggerActionPredictionData,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import VoiceController from "@/utils/voice/VoiceController";
import {
	computed,
	onBeforeMount,
	onBeforeUnmount,
	onMounted,
	ref,
	useTemplateRef,
	watch,
} from "vue";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import TTButton from "../TTButton.vue";
import ParamItem from "../params/ParamItem.vue";
import PlaceholderSelector from "../params/PlaceholderSelector.vue";
import FormVoiceControllHelper from "../voice/FormVoiceControllHelper";
import VoiceGlobalCommandsHelper from "../voice/VoiceGlobalCommandsHelper.vue";

const props = withDefaults(
	defineProps<{
		triggerMode?: boolean;
		//This is used by the trigger action form.
		action?: TriggerActionPredictionData;
		triggerData?: TriggerData;
	}>(),
	{
		triggerMode: false,
	},
);

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const storeMain = useStoreMain();
const rootEl = useTemplateRef("rootEl");
const { close } = useSidePanel(rootEl, () => emit("close"), props.triggerMode === false);

const loading = ref(false);
const error = ref("");
const title = ref("");
const answers = ref<string[]>(["", ""]);
const placeholderList = ref<ITriggerPlaceholder<any>[]>([]);
const param_duration = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 10 * 60,
	type: "duration",
	min: 30,
	max: 1800,
	labelKey: "prediction.form.vote_duration",
});
const param_title = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	maxLength: 45,
	labelKey: "prediction.form.question",
	placeholderKey: "prediction.form.question_placeholder",
});
const predictionHistory = ref<{ title: string; duration: number; options: string[] }[]>([]);
const voiceController = ref<FormVoiceControllHelper>();

const classes = computed<string[]>(() => {
	const res = ["predictionform", "sidePanel"];
	if (props.triggerMode !== false) res.push("embedMode");
	return res;
});

const canSubmit = computed<boolean>(() => {
	return title.value.length > 1 && answers.value[0]!.length > 0 && answers.value[1]!.length > 0;
});

const filledCount = computed<number>(() => {
	let count = 0;
	for (let i = 0; i < answers.value.length; i++) {
		if (answers.value[i]!.length > 0) count++;
	}
	return count;
});

function getAnswerClasses(index: number): string[] {
	const res = ["answer"];
	if (filledCount.value < 3 && index == 1) res.push("red");
	if (index > 1 && answers.value[index]!.length == 0) res.push("disabled");
	return res;
}

onBeforeMount(() => {
	if (storeMain.tempStoreValue) {
		const titlePrefill = storeMain.tempStoreValue as string;
		if (titlePrefill) title.value = titlePrefill;
		storeMain.tempStoreValue = null;
	}

	if (props.triggerMode != false) {
		placeholderList.value = param_title.value.placeholderList = TriggerEventPlaceholders(
			props.triggerData!.type,
		);

		if (props.action?.predictionData) {
			param_duration.value.value = props.action.predictionData.voteDuration;
			title.value = props.action.predictionData.title;
			for (let i = 0; i < props.action.predictionData.answers.length; i++) {
				answers.value[i] = props.action.predictionData.answers[i]!;
			}
		} else {
			onValueChange();
		}
	} else {
		param_duration.value.value =
			parseInt(DataStore.get(DataStore.PREDICTION_DEFAULT_DURATION)) || 10 * 60;

		TwitchUtils.getPredictions().then((pred) => {
			const done: { [key: string]: boolean } = {};
			predictionHistory.value = pred
				.map((v) => {
					const options = v.outcomes.map((c) => c.title);
					let key = v.title + v.prediction_window + options.join(",");
					if (done[key]) return null;
					done[key] = true;
					return { title: v.title, duration: v.prediction_window, options };
				})
				.filter((v) => v != null);
		});
	}
});

onMounted(() => {
	watch(
		() => VoiceController.instance.started.value,
		() => {
			if (VoiceController.instance.started.value && !voiceController.value) {
				voiceController.value = new FormVoiceControllHelper(
					rootEl.value!,
					close,
					submitForm,
				);
			}
		},
	);

	watch(
		() => answers.value,
		() => {
			let emptyCount = 0;
			for (let i = 0; i < answers.value.length; i++) {
				if (answers.value[i]!.length === 0) emptyCount++;
			}
			if (emptyCount == 0 && answers.value.length < Config.instance.MAX_PREDICTION_OUTCOMES) {
				answers.value.push("");
			} else if (emptyCount > 1 && answers.value.length > 2) {
				while (emptyCount > 1) {
					for (let i = 0; i < answers.value.length; i++) {
						if (answers.value[i]!.length === 0) {
							answers.value.splice(i, 1);
							emptyCount--;
							break;
						}
					}
				}
			}
		},
		{ deep: true },
	);
});

onBeforeUnmount(() => {
	if (voiceController.value) voiceController.value.dispose();
});

async function deleteAnswer(index: number): Promise<void> {
	answers.value.splice(index, 1);
}

async function submitForm(): Promise<void> {
	loading.value = true;
	error.value = "";

	const filtered = answers.value.filter((v) => v.length > 0);

	try {
		await TwitchUtils.createPrediction(
			StoreProxy.auth.twitch.user.id,
			title.value,
			filtered,
			param_duration.value.value,
		);
	} catch (e: unknown) {
		loading.value = false;
		error.value = (e as { message: string }).message;
		return;
	}
	loading.value = false;
	DataStore.set(DataStore.PREDICTION_DEFAULT_DURATION, param_duration.value.value);
	close();
}

/**
 * Called when any value is changed
 */
function onValueChange(): void {
	if (props.action) {
		props.action.predictionData = {
			title: title.value,
			answers: answers.value.filter((v) => v.length > 0),
			voteDuration: param_duration.value.value,
		};
	}
}

/**
 * Selects a poll's preset
 * @param params
 */
function selectPreset(params: (typeof predictionHistory.value)[number]): void {
	param_title.value.value = params.title;
	param_duration.value.value = params.duration;
	answers.value = params.options.concat();
	while (answers.value.length < 5) {
		answers.value.push("");
	}
}
</script>

<style scoped lang="less">
.predictionform {
	.content {
		.presets {
			row-gap: 0.5em;
			column-gap: 0.2em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;
			max-height: 5em;
			min-height: 2em;
			overflow-y: auto;
		}
		form {
			.card-item {
				.questionInput {
					flex-basis: unset;
					text-align: left;
				}
				&.answers {
					gap: 5px;
					display: flex;
					flex-direction: column;
					label {
						display: block;
						margin-bottom: 0.5em;
					}
					.answer {
						flex-grow: 1;
						display: flex;
						flex-direction: row;
						&.red {
							.inputHolder {
								input {
									@c: #f50e9b;
									// color: @c;
									border-color: @c;
								}
							}
						}
						&.disabled {
							.inputHolder {
								input {
									@c: #727272;
									color: @c;
									border-color: @c;
								}
							}
						}
						.inputHolder {
							position: relative;
							flex-grow: 1;
							input {
								width: 100%;
								min-width: 0;
								border-width: 3px;
								text-align: left;
								@c: #3798ff;
								// color: @c;
								color: var(--color-text);
								border: 2px solid @c;
								text-shadow: var(--text-shadow-contrast);
							}
							.len {
								font-size: 0.7em;
								position: absolute;
								right: 0.5em;
								top: 50%;
								transform: translateY(-50%);
							}
						}
						&:has(.deleteBt) {
							input {
								border-top-right-radius: 0;
								border-bottom-right-radius: 0;
							}
						}
					}
					.deleteBt {
						border-top-left-radius: 0;
						border-bottom-left-radius: 0;
						width: 2em;
					}
				}
			}
		}
	}
}
</style>

