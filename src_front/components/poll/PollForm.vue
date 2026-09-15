<template>
	<div class="pollform sidePanel" :class="{ embedMode: triggerMode !== false }" ref="rootEl">
		<div class="head" v-if="triggerMode === false">
			<h1 class="title"><Icon name="poll" class="icon" />{{ t("poll.form.title") }}</h1>
			<ClearButton @click="close()" />
		</div>

		<div class="content">
			<VoiceGlobalCommandsHelper v-if="voiceController" class="voiceHelper" />

			<div class="presets" v-if="pollHistory.length > 0">
				<TTButton
					@click="selectPreset(item)"
					v-for="item in pollHistory"
					v-tooltip="'•' + item.options.join('\n•') + '\n(' + item.duration + 's)'"
					>{{ item.title }}</TTButton
				>
			</div>

			<form class="form" @submit.prevent="submitForm()">
				<ParamItem
					:paramData="param_title"
					v-model="title"
					:autofocus="title == ''"
					:tabindex="1"
					@change="onValueChange()"
				/>

				<div class="card-item answers">
					<label for="poll_answer">{{ t("poll.form.answers") }}</label>

					<div class="field" v-for="(a, index) in answers.length" :key="index">
						<input
							type="text"
							id="poll_answer"
							v-model="answers[index]"
							maxlength="25"
							v-autofocus="index == 0 && title != ''"
							:tabindex="index + 2"
							@change="onValueChange()"
						/>
						<div class="len">{{ answers[index]!.length }}/25</div>
					</div>

					<PlaceholderSelector
						class="child placeholders"
						v-if="placeholderList.length > 0"
						copyMode
						:placeholders="placeholderList"
					/>
				</div>
				<ParamItem
					:paramData="param_extraVotes"
					v-model="param_extraVotes.value"
					@change="onValueChange()"
				>
					<ParamItem
						:paramData="param_points"
						@change="onValueChange()"
						v-model="param_points.value"
						noBackground
						class="child"
					/>
				</ParamItem>
				<ParamItem :paramData="param_duration" @change="onValueChange()" />

				<TTButton
					type="submit"
					v-if="triggerMode === false"
					:loading="loading"
					:disabled="
						title.length < 1 || answers.filter((v) => v.trim().length > 0).length < 2
					"
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
	type TriggerActionPollData,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import VoiceController from "@/utils/voice/VoiceController";
import { onBeforeMount, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
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
		action?: TriggerActionPollData;
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
const answers = ref<string[]>(["", "", "", "", ""]);
const param_title = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	maxLength: 60,
	labelKey: "poll.form.question",
	placeholderKey: "prediction.form.question_placeholder",
});
const param_extraVotes = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "poll.form.additional_votes",
	icon: "add",
});
const param_points = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 100,
	type: "number",
	min: 1,
	max: 99999,
	step: 1,
	icon: "channelPoints",
	labelKey: "poll.form.additional_votes_amount",
});
const param_duration = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 2 * 60,
	type: "duration",
	min: 15,
	max: 1800,
	labelKey: "poll.form.vote_duration",
	icon: "timer",
});
const placeholderList = ref<ITriggerPlaceholder<any>[]>([]);
const pollHistory = ref<
	{
		title: string;
		duration: number;
		options: string[];
		channelPoints: number;
	}[]
>([]);

const voiceController = ref<FormVoiceControllHelper>();

onBeforeMount(() => {
	if (storeMain.tempStoreValue) {
		const titlePrefill = storeMain.tempStoreValue as string;
		if (titlePrefill) title.value = titlePrefill;
		storeMain.tempStoreValue = null;
	}

	if (props.triggerMode !== false) {
		placeholderList.value = param_title.value.placeholderList = TriggerEventPlaceholders(
			props.triggerData!.type,
		);
		if (props.action?.pollData) {
			param_extraVotes.value.value = props.action.pollData.pointsPerVote > 0;
			param_points.value.value = props.action.pollData.pointsPerVote ?? 1;
			param_duration.value.value = props.action.pollData.voteDuration;
			title.value = props.action.pollData.title;
			for (let i = 0; i < props.action.pollData.answers.length; i++) {
				answers.value[i] = props.action.pollData.answers[i]!;
			}
		} else {
			onValueChange();
		}
	} else {
		param_duration.value.value =
			parseInt(DataStore.get(DataStore.POLL_DEFAULT_DURATION)) || 2 * 60;
		TwitchUtils.getPolls().then((polls) => {
			const done: { [key: string]: boolean } = {};
			pollHistory.value = polls
				.map((v) => {
					const options = v.choices.map((c) => c.title);
					const channelPoints = v.channel_points_voting_enabled
						? v.channel_points_per_vote
						: 0;
					let key = v.title + v.duration + channelPoints + options.join(",");
					if (done[key]) return null;
					done[key] = true;
					return { title: v.title, duration: v.duration, channelPoints, options };
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
});

onBeforeUnmount(() => {
	if (voiceController.value) voiceController.value.dispose();
});

async function submitForm(): Promise<void> {
	loading.value = true;
	error.value = "";

	try {
		await TwitchUtils.createPoll(
			StoreProxy.auth.twitch.user.id,
			title.value,
			answers.value.filter((v) => v.trim().length > 0),
			param_duration.value.value,
			param_extraVotes.value.value ? param_points.value.value : 0,
		);
	} catch (e: unknown) {
		loading.value = false;
		let message = (e as { message: string }).message;
		if (message.toLowerCase().indexOf("pollalreadyactive") > -1) {
			message = t("error.poll_active");
		} else if (message.toLowerCase().indexOf("illegal_argument") > -1) {
			message = t("error.poll_automod");
		}
		error.value = message;
		return;
	}
	loading.value = false;
	DataStore.set(DataStore.POLL_DEFAULT_DURATION, param_duration.value.value);
	close();
}

/**
 * Called when any value is changed
 */
function onValueChange(): void {
	if (props.action) {
		if (!param_extraVotes.value.value) {
			param_points.value.value = 0;
		}
		props.action.pollData = {
			title: title.value,
			answers: answers.value.filter((v) => v.length > 0),
			pointsPerVote: param_points.value.value,
			voteDuration: param_duration.value.value,
		};
	}
}

/**
 * Selects a poll's preset
 * @param params
 */
function selectPreset(params: (typeof pollHistory.value)[number]): void {
	param_title.value.value = params.title;
	param_duration.value.value = params.duration;
	param_extraVotes.value.value = params.channelPoints > 0;
	param_points.value.value = params.channelPoints;
	answers.value = params.options.concat();
	while (answers.value.length < 5) {
		answers.value.push("");
	}
}
</script>

<style scoped lang="less">
.pollform {
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
			overflow-y: auto;
			min-height: 2em;
		}
		form > .card-item {
			.field {
				flex-grow: 1;
				position: relative;
				input {
					width: 100%;
					padding-right: 3em;
				}
				.len {
					font-size: 0.7em;
					position: absolute;
					right: 0.5em;
					top: 50%;
					transform: translateY(-50%);
				}
			}
			&.answers {
				gap: 5px;
				display: flex;
				flex-direction: column;
				label {
					display: block;
					margin-bottom: 0.5em;
				}
			}
		}
	}
}
</style>
