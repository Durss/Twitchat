<template>
	<div class="triggeractionttsentry triggerActionForm" v-if="!storeTTS.params.enabled">
		<div class="info warn">
			<Icon name="info" alt="info" theme="light" />
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.tts.header">
				<template #LINK>
					<a @click="storeParams.openParamsPage(contentTTS)">{{
						t("triggers.actions.tts.header_link")
					}}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div v-else class="triggeractionttsentry">
		<ParamItem :paramData="param_message" v-model="props.action.text" />
		<ParamItem
			:paramData="param_customVoice"
			v-model="param_customVoice.value"
			@change="onToggleCustomVoice()"
		>
			<TTSVoiceParams
				v-if="props.action.voiceParams"
				class="parameter-child"
				v-model="props.action.voiceParams"
			/>
		</ParamItem>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTSVoiceParams from "@/components/voice/TTSVoiceParams.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeTTS as useStoreTTS } from "@/store/tts/storeTTS";
import type {
	ITriggerPlaceholder,
	TriggerActionTTSData,
	TriggerData,
} from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../../ParamItem.vue";

const props = defineProps<{
	action: TriggerActionTTSData;
	triggerData: TriggerData;
}>();

const { t } = useI18n();
const storeTTS = useStoreTTS();
const storeParams = useStoreParams();

const param_message = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	longText: true,
	value: "",
	icon: "whispers",
	maxLength: 500,
	labelKey: "triggers.actions.tts.param_message",
});
const param_customVoice = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "voice",
	labelKey: "triggers.actions.tts.param_customVoice",
});

const contentTTS = computed<TwitchatDataTypes.ParameterPagesStringType>(() => {
	return TwitchatDataTypes.ParameterPages.TTS;
});

onBeforeMount(() => {
	param_customVoice.value.value = !!props.action.voiceParams;
});

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	param_message.value.placeholderList = list;
	if (!props.action.text) props.action.text = "";
}

function onToggleCustomVoice(): void {
	if (param_customVoice.value.value) {
		if (!props.action.voiceParams) {
			props.action.voiceParams = {
				voice: "",
				volume: 1,
				rate: 1,
				pitch: 1,
				elevenlabs_lang: "",
				elevenlabs_model: "eleven_turbo_v2_5",
				elevenlabs_stability: 0.5,
				elevenlabs_similarity: 0.5,
				elevenlabs_style: 0,
			};
		}
	} else {
		delete props.action.voiceParams;
	}
}

useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);
</script>

<style scoped lang="less">
.triggeractionttsentry {
	gap: 0.5em;
	display: flex;
	flex-direction: column;
}
</style>
