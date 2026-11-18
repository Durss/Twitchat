<template>
	<div class="voicecontrolform parameterContent">
		<section class="card-item block" v-if="voiceApiAvailable">
			<label for="langSelector">{{ t("voice.select_language") }}</label>
			<LangSelector id="langSelector" v-model:lang="lang" class="langSelector" />
			<Button v-if="!started && lang" class="startBt" @click="startBot()" icon="voice">{{
				t("voice.startBt")
			}}</Button>
			<Button v-if="started" class="stopBt" @click="stopBot()" highlight icon="stop">{{
				t("voice.stopBt")
			}}</Button>
		</section>

		<template v-if="!voiceApiAvailable || started || tempText || finalText">
			<Splitter>{{ t("voice.stt_preview") }}</Splitter>

			<section class="card-item block">
				<div class="temp" v-if="tempText && !finalText">{{ tempText }}</div>
				<div class="final" v-if="finalText">{{ finalText }}</div>
				<div class="empty" v-if="!tempText && !finalText">...</div>
			</section>
		</template>

		<Splitter v-if="sttOnly === false">{{ t("voice.stt_actions") }}</Splitter>

		<VoiceTriggerList v-if="sttOnly === false" />
	</div>
</template>

<script setup lang="ts">
import DataStore from "@/store/DataStore";
import { storeVoice as useStoreVoice } from "@/store/voice/storeVoice";
import VoiceController from "@/utils/voice/VoiceController";
import { computed, ref, watch } from "vue";
import Button from "../TTButton.vue";
import LangSelector from "../LangSelector.vue";
import Splitter from "../Splitter.vue";
import VoiceTriggerList from "./VoiceTriggerList.vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
	defineProps<{
		sttOnly?: boolean;
		voiceApiAvailable?: boolean;
	}>(),
	{
		sttOnly: false,
		voiceApiAvailable: true,
	},
);

const { t } = useI18n();
const storeVoice = useStoreVoice();

let userLang = navigator.language;
//@ts-ignore
if (!userLang) userLang = navigator.userLanguage;
if (userLang.length == 2) userLang = userLang + "-" + userLang.toUpperCase();
if (DataStore.get("voiceLang")) userLang = DataStore.get("voiceLang");
const lang = ref(userLang);

const started = computed(() => VoiceController.instance.started.value);
const tempText = computed(() =>
	props.sttOnly === false
		? storeVoice.voiceText.tempText
		: VoiceController.instance.tempText.value,
);
const finalText = computed<string>(() =>
	props.sttOnly === false
		? storeVoice.voiceText.finalText
		: VoiceController.instance.finalText.value,
);

watch(
	() => lang.value,
	() => updateLang(),
);
updateLang();

function startBot(): void {
	VoiceController.instance.start(props.sttOnly);
}

function stopBot(): void {
	VoiceController.instance.stop();
}

function updateLang(): void {
	VoiceController.instance.lang.value = lang.value;
	storeVoice.setVoiceLang(lang.value);
}
</script>

<style scoped lang="less">
.voicecontrolform {
	.langSelector {
		width: 100%;
	}

	.startBt,
	.stopBt {
		margin: auto;
	}

	.block {
		width: 100%;
		.temp {
			font-style: italic;
		}
		.empty {
			text-align: center;
		}
	}
}
</style>
