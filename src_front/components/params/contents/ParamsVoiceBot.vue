<template>
	<div class="paramsvoicebot parameterContent">
		<Icon name="voice" alt="voice icon" class="icon" />
		<div class="head">{{ t("voice.header") }}</div>

		<div v-if="!voiceApiAvailable" class="card-item alert noApi">
			<p>{{ t("voice.unsupported_browser") }}</p>
			<p>{{ t("voice.unsupported_browser_detail") }}</p>
		</div>
		<div v-else class="infos">{{ t("voice.supported_browsers") }}</div>

		<div class="card-item fallback">
			<p>{{ t("voice.remote_control") }}</p>
			<a :href="voicePageUrl" target="_blank">{{ voicePageUrl }}</a>
		</div>

		<VoiceControlForm v-if="obsConnected" class="form" :voiceApiAvailable="voiceApiAvailable" />

		<div class="card-item alert connectObs" v-if="!obsConnected">
			<div>{{ t("voice.need_OBS") }}</div>
			<TTButton
				class="button"
				icon="obs"
				light
				alert
				@click="storeParams.openParamsPage(contentConnexions, subcontentObs)"
				>{{ t("voice.obs_connectBt") }}</TTButton
			>
		</div>
	</div>
</template>

<script setup lang="ts">
import OBSWebsocket from "@/utils/OBSWebsocket";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { computed } from "vue";
import { useRouter } from "vue-router";
import VoiceControlForm from "../../voice/VoiceControlForm.vue";
import TTButton from "../../TTButton.vue";
import VoiceController from "@/utils/voice/VoiceController";
import Config from "@/utils/Config";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type IParameterContent from "./IParameterContent";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const storeParams = useStoreParams();
const router = useRouter();

const subcontentObs = computed<TwitchatDataTypes.ParamDeepSectionsStringType>(() => {
	return TwitchatDataTypes.ParamDeepSections.OBS;
});
const contentConnexions = computed<TwitchatDataTypes.ParameterPagesStringType>(() => {
	return TwitchatDataTypes.ParameterPages.CONNECTIONS;
});

const obsConnected = computed<boolean>(() => {
	return OBSWebsocket.instance.connected.value;
});
const voiceApiAvailable = computed<boolean>(() => {
	return VoiceController.instance.apiAvailable && !Config.instance.OBS_DOCK_CONTEXT;
});
const voicePageUrl = computed<string>(() => {
	let url = document.location.origin;
	url += router.resolve({ name: "voice" }).href;
	return url;
});

defineExpose<IParameterContent>({
	onNavigateBack: () => {
		return false;
	},
});
</script>

<style scoped lang="less">
.paramsvoicebot {
	.infos {
		text-align: center;
	}

	.noApi,
	.connectObs {
		text-align: center;
		line-height: 1.3em;

		.button {
			margin-top: 0.5em;
		}
	}

	.fallback {
		font-size: 0.8em;
		line-height: 1.2em;
	}
}
</style>
