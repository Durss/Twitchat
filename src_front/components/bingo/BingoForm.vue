<template>
	<div :class="classes" ref="rootEl">
		<div class="head" v-if="triggerMode === false">
			<ClearButton :aria-label="t('global.close')" @click="close()" />

			<h1 class="title"><Icon name="bingo" class="icon" />{{ t("bingo.form.title") }}</h1>

			<div class="description">{{ t("bingo.form.description") }}</div>
		</div>

		<TabMenu
			class="menu"
			v-model="mode"
			:values="['num', 'emote', 'custom']"
			:tooltips="[
				t('bingo.form.title_number'),
				t('bingo.form.title_emote'),
				t('bingo.form.title_custom'),
			]"
			:icons="['number', 'emote', 'edit']"
			@change="onValueChange()"
		/>

		<div class="content">
			<form class="form" @submit.prevent="onSubmit()">
				<div class="info" v-if="mode == 'num'" v-html="t('bingo.form.number_info')"></div>
				<div
					class="info"
					v-if="mode == 'emote'"
					v-html="t('bingo.form.emote_info', { COUNT: globalEmotes.length })"
				></div>
				<div class="info" v-if="mode == 'custom'">{{ t("bingo.form.custom_info") }}</div>

				<ParamItem
					class="card-item"
					v-if="mode == 'num'"
					:paramData="minValue"
					autofocus
					@change="onValueChange()"
				/>

				<ParamItem
					class="card-item"
					v-if="mode == 'num'"
					:paramData="maxValue"
					@change="onValueChange()"
				/>

				<ParamItem
					class="card-item custom"
					v-if="mode == 'custom'"
					:paramData="customValue"
					@change="onValueChange()"
				/>
				<ParamItem
					class="card-item custom"
					v-if="mode == 'custom'"
					:paramData="customValueTolerance"
					@change="onValueChange()"
				/>

				<ToggleBlock
					:icons="['params']"
					:title="t('global.advanced_params')"
					class="configs"
					:open="false"
					v-if="triggerMode === false"
					small
				>
					<PostOnChatParam
						botMessageKey="bingoStart"
						:placeholderEnabled="false"
						titleKey="bingo.form.announce_start"
						:placeholders="startPlaceholders"
						icon="announcement"
					/>
					<PostOnChatParam
						botMessageKey="bingo"
						titleKey="bingo.form.announce_winner"
						:placeholders="winnerPlaceholders"
						icon="announcement"
					/>
				</ToggleBlock>

				<TTButton v-if="triggerMode === false" type="submit">{{
					t("bingo.form.startBt")
				}}</TTButton>
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useSidePanel } from "@/composables/useSidePanel";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeBingo as useStoreBingo } from "@/store/bingo/storeBingo";
import {
	TriggerEventPlaceholders,
	type TriggerActionBingoData,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { computed, onBeforeMount, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import TTButton from "../TTButton.vue";
import TabMenu from "../TabMenu.vue";
import ToggleBlock from "../ToggleBlock.vue";
import ParamItem from "../params/ParamItem.vue";
import PostOnChatParam from "../params/PostOnChatParam.vue";

const props = withDefaults(
	defineProps<{
		triggerMode?: boolean;
		//This is used by the trigger action form.
		action?: TriggerActionBingoData;
		triggerData?: TriggerData;
	}>(),
	{
		triggerMode: false,
	},
);

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeBingo = useStoreBingo();
const rootEl = useTemplateRef<HTMLElement>("rootEl");
const { close } = useSidePanel(rootEl, () => emit("close"), props.triggerMode === false);

const globalEmotes = ref<TwitchatDataTypes.Emote[]>([]);
const mode = ref<"num" | "emote" | "custom">("num");
const minValue = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 0,
	type: "number",
	icon: "min",
	min: 0,
	max: 999999999,
	labelKey: "bingo.form.min_value",
});
const maxValue = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 100,
	type: "number",
	icon: "max",
	min: 0,
	max: 999999999,
	labelKey: "bingo.form.max_value",
});
const customValue = ref<TwitchatDataTypes.ParameterData<string | undefined>>({
	value: "",
	type: "string",
	maxLength: 500,
	placeholderKey: "bingo.form.custom_placeholder",
	labelKey: "bingo.form.custom_value",
	icon: "whispers",
});
// public customValueTolerance:TwitchatDataTypes.ParameterData<number|undefined> = {value:0, type:"slider", min:0, max: 100, labelKey:"bingo.form.custom_value_tolerance"};
const customValueTolerance = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 0,
	type: "list",
	icon: "spelling",
	labelKey: "bingo.form.custom_value_tolerance",
});
const winnerPlaceholders = ref<TwitchatDataTypes.PlaceholderEntry[]>([]);

const classes = computed<string[]>(() => {
	const res = ["bingoform", "sidePanel"];
	if (props.triggerMode !== false) res.push("embedMode");
	return res;
});

const finalData = computed<TwitchatDataTypes.BingoConfig>(() => ({
	guessNumber: mode.value == "num",
	guessEmote: mode.value == "emote",
	guessCustom: mode.value == "custom",
	genericValue: "",
	min: minValue.value.value,
	max: maxValue.value.value,
	customValue: customValue.value.value,
	customValueTolerance: customValueTolerance.value.value,
}));

const startPlaceholders = computed<TwitchatDataTypes.PlaceholderEntry[]>(() => [
	{
		tag: "GOAL",
		descKey: "bingo.form.goal_placeholder",
		example: (<Record<typeof mode.value, any>>{
			num: t("bingo.goal_number", {
				MIN: minValue.value.value,
				MAX: maxValue.value.value,
			}),
			emote: t("bingo.goal_emote"),
			custom: "",
		})[mode.value],
	},
]);

onBeforeMount(async () => {
	winnerPlaceholders.value = [
		{
			tag: "USER",
			descKey: "bingo.form.winner_placeholder",
			example: storeAuth.twitch.user.displayName,
		},
	];
	if (props.triggerMode) {
		if (props.action?.bingoData) {
			if (props.action.bingoData.guessNumber) mode.value = "num";
			else if (props.action.bingoData.guessEmote) mode.value = "emote";
			else if (props.action.bingoData.guessCustom) mode.value = "custom";
			minValue.value.value = props.action.bingoData.min;
			maxValue.value.value = props.action.bingoData.max;
			customValue.value.value = props.action.bingoData.customValue;
			customValueTolerance.value.value = props.action.bingoData.customValueTolerance ?? 0;
		} else {
			onValueChange();
		}
	}

	customValueTolerance.value.listValues = [
		{ value: 0, labelKey: "bingo.form.custom_value_tolerances.none" },
		{ value: 1, labelKey: "bingo.form.custom_value_tolerances.very_low" },
		{ value: 2, labelKey: "bingo.form.custom_value_tolerances.low" },
		{ value: 3, labelKey: "bingo.form.custom_value_tolerances.medium" },
		{ value: 4, labelKey: "bingo.form.custom_value_tolerances.high" },
		{ value: 5, labelKey: "bingo.form.custom_value_tolerances.very_high" },
	];

	let emotes = await TwitchUtils.getEmotes();
	emotes = emotes.filter((v) => v.is_public === true);
	globalEmotes.value = emotes;

	if (props.triggerMode !== false && props.triggerData) {
		customValue.value.placeholderList = TriggerEventPlaceholders(props.triggerData.type);
	}
});

/**
 * Start a bingo
 */
function onSubmit(): void {
	storeBingo.startBingo(finalData.value);
	close();
}

/**
 * Called when any value is changed
 */
function onValueChange(): void {
	if (props.action) {
		props.action.bingoData = finalData.value;
	}
}
</script>

<style scoped lang="less">
.bingoform {
	.content > form > .card-item.custom {
		:deep(input) {
			flex-basis: 200px;
			text-align: left;
		}
	}
}
</style>
