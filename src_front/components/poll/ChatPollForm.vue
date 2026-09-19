<template>
	<div class="chatpollform sidePanel" :class="{ embedMode: triggerMode !== false }" ref="rootEl">
		<div class="head" v-if="triggerMode === false">
			<h1 class="title"><Icon name="poll" class="icon" />{{ t("chatPoll.form.title") }}</h1>
			<span class="description">{{ t("chatPoll.form.header") }}</span>
			<ClearButton @click="close()" />
		</div>

		<div class="content">
			<div
				class="presets"
				v-if="storeChatPoll.presets.history.length > 0 && triggerMode === false"
			>
				<TTButton
					@click="selectPreset(item)"
					v-for="item in storeChatPoll.presets.history"
					v-tooltip="
						'•' +
						item.choices.map((v) => v.label).join('\n•') +
						'\n(⏱️' +
						item.duration_s +
						's)\n(🎫' +
						item.maxVotePerUser +
						')'
					"
					>{{
						item.title ||
						[...item.choices]
							.splice(0, 2)
							.map((v) => v.label)
							.join(", ") + "..."
					}}</TTButton
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
					<label for="poll_answer">{{ t("chatPoll.form.answers") }}</label>

					<div class="field" v-for="(a, index) in choices.length" :key="index">
						<input
							type="text"
							id="poll_answer"
							v-model="choices[index]!.label"
							maxlength="50"
							v-autofocus="index == 0 && title != ''"
							:tabindex="index + 2"
							@change="onValueChange()"
						/>
						<div class="len">{{ choices[index]!.label.length }}/50</div>
					</div>

					<div class="card-item premium" v-if="showPremiumLimit">
						<div>
							{{
								t("overlay.chatPoll.non_premium_limit", {
									MAX: Config.instance.MAX_CHAT_POLL_ENTRIES_PREMIUM,
								})
							}}
						</div>
						<TTButton icon="premium" @click="openPremium()" light premium>{{
							t("premium.become_premiumBt")
						}}</TTButton>
					</div>

					<PlaceholderSelector
						class="child placeholders"
						v-if="placeholderList.length > 0"
						copyMode
						:placeholders="placeholderList"
					/>
				</div>

				<ParamItem :paramData="param_duration" @change="onValueChange()" />
				<ParamItem :paramData="param_allowMultiVote" @change="onValueChange()" />

				<ToggleBlock
					:title="t('chatPoll.form.permissions')"
					:open="false"
					:icons="['lock_fit']"
					small
				>
					<PermissionsForm v-model="permissions" @change="onValueChange()" />
				</ToggleBlock>

				<TTButton
					type="submit"
					v-if="triggerMode === false"
					:disabled="choices.filter((v) => v.label.trim().length > 0).length < 2"
					>{{ t("global.start") }}</TTButton
				>
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useSidePanel } from "@/composables/useSidePanel";
import { storeChatPoll as useStoreChatPoll } from "@/store/chat_poll/storeChatPoll";
import { storeMain as useStoreMain } from "@/store/storeMain";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import {
	TriggerEventPlaceholders,
	type ITriggerPlaceholder,
	type TriggerActionChatPollData,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import { onBeforeMount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import PermissionsForm from "../PermissionsForm.vue";
import TTButton from "../TTButton.vue";
import ToggleBlock from "../ToggleBlock.vue";
import ParamItem from "../params/ParamItem.vue";
import PlaceholderSelector from "../params/PlaceholderSelector.vue";

const props = withDefaults(
	defineProps<{
		triggerMode?: boolean;
		//This is used by the trigger action form.
		action?: TriggerActionChatPollData;
		triggerData?: TriggerData;
	}>(),
	{
		triggerMode: false,
	},
);

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const storeChatPoll = useStoreChatPoll();
const storeMain = useStoreMain();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();
const rootEl = useTemplateRef("rootEl");
const { close } = useSidePanel(rootEl, () => emit("close"), props.triggerMode === false);

const title = ref("");
const showPremiumLimit = ref(false);
const choices = ref<TwitchatDataTypes.ChatPollData["choices"]>([]);
const param_title = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	maxLength: 100,
	labelKey: "chatPoll.form.question",
	placeholderKey: "prediction.form.question_placeholder",
});
const param_duration = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 2 * 60,
	type: "duration",
	min: 5,
	max: 3600,
	labelKey: "chatPoll.form.voteDuration",
	icon: "timer",
});
const param_allowMultiVote = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 1,
	type: "number",
	min: 1,
	max: 20,
	labelKey: "chatPoll.form.allowMultiVote",
	icon: "user",
});
const placeholderList = ref<ITriggerPlaceholder<any>[]>([]);
const permissions = ref<TwitchatDataTypes.PermissionsData>(Utils.getDefaultPermissions());

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
		if (props.action?.chatPollData) {
			title.value = props.action.chatPollData.title;
			param_duration.value.value = props.action.chatPollData.duration_s;
			permissions.value = props.action.chatPollData.permissions;
			for (let i = 0; i < props.action.chatPollData.choices.length; i++) {
				choices.value[i] = { ...props.action.chatPollData.choices[i]! };
			}
		} else {
			onValueChange();
		}
	} else {
		permissions.value = storeChatPoll.presets.permissions;
		param_duration.value.value = storeChatPoll.presets.duration_s;
		param_allowMultiVote.value.value = storeChatPoll.presets.voteCount;
	}

	// Add 2 empty choices if less than 2 choices exist
	for (let i = choices.value.length; i < 2; i++) {
		choices.value.push({
			id: Utils.getUUID(),
			label: "",
			votes: 0,
		});
	}
});

onMounted(() => {
	watch(
		() => choices.value,
		() => {
			let emptyCount = 0;
			for (let i = 0; i < choices.value.length; i++) {
				if (choices.value[i]!.label.length === 0) emptyCount++;
			}
			const maxEntries = storeAuth.isPremium
				? Config.instance.MAX_CHAT_POLL_ENTRIES_PREMIUM
				: Config.instance.MAX_CHAT_POLL_ENTRIES;
			if (emptyCount == 0 && choices.value.length < maxEntries) {
				choices.value.push({
					id: Utils.getUUID(),
					label: "",
					votes: 0,
				});
			} else if (emptyCount > 1 && choices.value.length > 2) {
				while (emptyCount > 1) {
					for (let i = 0; i < choices.value.length; i++) {
						if (choices.value[i]!.label.length === 0) {
							choices.value.splice(i, 1);
							emptyCount--;
							break;
						}
					}
				}
			}

			showPremiumLimit.value =
				choices.value.length - emptyCount == maxEntries &&
				maxEntries < Config.instance.MAX_CHAT_POLL_ENTRIES_PREMIUM;
			// param_allowMultiVote.value.max = choices.value.filter(v=>v.label.trim().length > 0).length
		},
		{ deep: true },
	);
});

async function submitForm(): Promise<void> {
	storeChatPoll.setCurrentPoll(
		{
			title: title.value,
			choices: choices.value
				.filter((v) => v.label.trim().length > 0)
				.map((v) => {
					return { ...v };
				}),
			permissions: permissions.value,
			duration_s: param_duration.value.value,
			started_at: Date.now(),
			votes: {},
			maxVotePerUser: param_allowMultiVote.value.value,
		},
		true,
	);
	close();
}

/**
 * Called when any value is changed
 */
function onValueChange(): void {
	if (props.action) {
		props.action.chatPollData = {
			title: title.value,
			choices: choices.value
				.filter((v) => v.label.trim().length > 0)
				.map((v) => {
					return { ...v };
				}),
			duration_s: param_duration.value.value,
			started_at: Date.now(),
			permissions: permissions.value,
			maxVotePerUser: param_allowMultiVote.value.value,
			votes: {},
		};
	}
}

/**
 * Opens the premium section
 */
function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

/**
 * Selects a poll's preset
 * @param params
 */
function selectPreset(params: TwitchatDataTypes.ChatPollData): void {
	param_title.value.value = params.title;
	param_duration.value.value = params.duration_s;
	title.value = params.title;
	choices.value = params.choices
		.filter((v) => v.label.trim().length > 0)
		.map((v) => {
			return { ...v };
		});
	permissions.value = params.permissions;
	param_duration.value.value = params.duration_s;
	param_allowMultiVote.value.value = params.maxVotePerUser;
	// submitForm();
}
</script>

<style scoped lang="less">
.chatpollform {
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

	.premium {
		white-space: pre-line;
		.button {
			display: flex;
			margin: auto;
			margin-top: 0.5em;
		}
	}
}
</style>
