<template>
	<div class="obsaudiosourceform">
		<p class="info">{{ t("obs.microphone_head") }}</p>
		<template v-if="!noAudioSource">
			<ParamItem
				:paramData="obsAllowed_audioSources"
				class="row"
				@change="onAudioParamChange()"
			/>
			<ParamItem
				:paramData="obsAllowed_muteCommand"
				class="row"
				@change="onAudioParamChange()"
			/>
			<ParamItem
				:paramData="obsAllowed_unmuteCommand"
				class="row"
				@change="onAudioParamChange()"
			/>
		</template>
		<div v-else class="card-item alert noAudioSource">
			<div class="label">{{ t("obs.microphone_empty") }}</div>
			<Button
				@click="listAudioSources(true)"
				class="connectBt"
				icon="refresh"
				:loading="loadingAudioSources"
				>{{ t("obs.microphone_reCheck") }}</Button
			>
		</div>
	</div>
</template>

<script setup lang="ts">
import Button from "@/components/TTButton.vue";
import DataStore from "@/store/DataStore";
import { storeOBS as useStoreOBS } from "@/store/obs/storeOBS";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { OBSInputItem } from "@/utils/OBSWebsocket";
import OBSWebsocket from "@/utils/OBSWebsocket";
import Utils from "@/utils/Utils";
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";

const { t } = useI18n();
const storeOBS = useStoreOBS();

const noAudioSource = ref(false);
const loadingAudioSources = ref(false);
const audioSources = ref<OBSInputItem[]>([]);
const obsAllowed_audioSources = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "list",
	value: "",
	listValues: [],
});
const obsAllowed_muteCommand = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	placeholder: "!mute",
});
const obsAllowed_unmuteCommand = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	placeholder: "!unmute",
});

const defaultEntry = { label: "", value: "" };

onMounted(() => {
	defaultEntry.label = defaultEntry.value = t("obs.microphone_default_entry");
	obsAllowed_audioSources.value.labelKey = "obs.microphone_source";
	obsAllowed_muteCommand.value.labelKey = "obs.microphone_mute";
	obsAllowed_unmuteCommand.value.labelKey = "obs.microphone_unmute";
	listAudioSources();
});

function onAudioParamChange(): void {
	if (
		!obsAllowed_audioSources.value.value ||
		(obsAllowed_unmuteCommand.value.value === "" && obsAllowed_muteCommand.value.value === "")
	)
		return;

	let audioSource = obsAllowed_audioSources.value.value;
	if (audioSource === defaultEntry.value) audioSource = "";
	const commands: TwitchatDataTypes.OBSMuteUnmuteCommands = {
		audioSourceName: audioSource,
		muteCommand: obsAllowed_muteCommand.value.value,
		unmuteCommand: obsAllowed_unmuteCommand.value.value,
	};
	storeOBS.setOBSMuteUnmuteCommands(commands);
}

async function listAudioSources(manualCheck = false): Promise<void> {
	const storeConfStr = DataStore.get(DataStore.OBS_CONF_MUTE_UNMUTE);
	let storeConf!: TwitchatDataTypes.OBSMuteUnmuteCommands;
	if (storeConfStr) {
		storeConf = JSON.parse(storeConfStr);
	}

	noAudioSource.value = true;
	if (manualCheck) {
		loadingAudioSources.value = true;
		audioSources.value = [];
		//Delay here only ofr UX purpose. This gives time to the loader to appear
		//Without that the user may think the button does nothing.
		await Utils.promisedTimeout(500);
	}

	audioSources.value = await OBSWebsocket.instance.getInputs();
	if (audioSources.value.length > 0) {
		noAudioSource.value = false;
		obsAllowed_audioSources.value.listValues = audioSources.value
			.map((v) => {
				return { label: v.inputName, value: v.inputName };
			})
			.sort((a, b) => {
				if (a.label < b.label) return -1;
				if (a.label > b.label) return 1;
				return 0;
			});
		obsAllowed_audioSources.value.listValues.unshift(defaultEntry);
		obsAllowed_audioSources.value.value = defaultEntry.value; //Default value

		if (
			storeConf &&
			storeConf.audioSourceName &&
			audioSources.value.find((v) => v.inputName == storeConf.audioSourceName)
		) {
			obsAllowed_audioSources.value.value = storeConf.audioSourceName;
		}

		const storedState = storeOBS.muteUnmuteCommands;
		if (storedState) {
			obsAllowed_muteCommand.value.value = storedState.muteCommand;
			obsAllowed_unmuteCommand.value.value = storedState.unmuteCommand;
			if (audioSources.value.find((v) => v.inputName == storedState.audioSourceName)) {
				obsAllowed_audioSources.value.value = storedState.audioSourceName;
			}
		}
	}
	loadingAudioSources.value = false;
}
watch(
	() => OBSWebsocket.instance.connected.value,
	() => {
		if (OBSWebsocket.instance.connected.value) {
			listAudioSources();
		}
	},
);
</script>

<style scoped lang="less">
.obsaudiosourceform {
	gap: 0.5em;
	display: flex;
	flex-direction: column;

	.noAudioSource {
		display: flex;
		flex-direction: column;
		align-items: center;
		.label {
			margin-bottom: 0.5em;
			font-style: italic;
		}
	}
}
</style>
