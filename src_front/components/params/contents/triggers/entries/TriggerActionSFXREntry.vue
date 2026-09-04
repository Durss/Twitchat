<template>
	<div class="triggeractionsfxrentry triggerActionForm">
		<div class="options">
			<div
				class="option"
				v-for="id in actions"
				:class="{ selected: action.sfxr.presetId == id }"
				:key="id"
			>
				<label :for="'action_' + id"
					><Icon name="dice" v-if="id !== 'custom'" />{{
						$t("triggers.actions.sfxr.preset_" + id)
					}}</label
				>
				<input
					type="radio"
					v-model="action.sfxr.presetId"
					:name="'preset_' + id"
					:value="id"
					:id="'action_' + id"
					@click="playSample(id)"
				/>
			</div>
		</div>

		<div class="custom" v-if="action.sfxr.presetId == 'custom'">
			<ParamItem
				class="params"
				:paramData="param_custom"
				v-model="action.sfxr.rawConfig"
				:error="error"
				:errorMessage="$t('triggers.actions.sfxr.param_custom_error')"
			>
				<TTButton class="testBt" icon="test" @click="testCustomSound">Test</TTButton>
			</ParamItem>
		</div>

		<ParamItem class="params" :paramData="param_volume" v-model="action.sfxr.volume" />
		<ParamItem class="params" :paramData="param_waitForEnd" v-model="action.sfxr.waitForEnd" />
		<ParamItem
			class="params"
			:paramData="param_playOnOverlay"
			v-model="action.sfxr.playOnOverlay"
		>
			<div class="card-item alert connectObs" v-if="!exchangeChannelAvailable">
				<i18n-t scope="global" keypath="overlay.connection.title">
					<template #OBS>
						<TTButton
							icon="obs"
							light
							alert
							small
							@click="storeParams.openParamsPage(contentConnexions, subcontentObs)"
							>{{ $t("overlay.connection.obsBt") }}</TTButton
						>
					</template>
					<template #DOCK>{{ $t("overlay.connection.dockBt") }}</template>
				</i18n-t>
			</div>
			<div v-else class="info parameter-child">
				<span>{{ $t("triggers.actions.sfxr.param_playOnOverlay_info") }}</span>
				<OverlayInstaller
					class="parameter-child"
					type="sfxr"
					sourceSuffix="sound effect"
					:sourceTransform="{ width: 100, height: 100 }"
					light
				/>
			</div>
		</ParamItem>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import OverlayInstaller from "@/components/params/contents/overlays/OverlayInstaller.vue";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import type { TriggerActionSFXRData, TriggerData } from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { JSFXRSoundPreset } from "@/types/jsfxr";
import Config from "@/utils/Config";
import OBSWebsocket from "@/utils/OBSWebsocket";
import SFXRUtils from "@/utils/SFXRUtils";
import { computed, onBeforeMount, ref } from "vue";

const props = defineProps<{
	action: TriggerActionSFXRData;
	triggerData: TriggerData;
}>();

const storeParams = useStoreParams();
const error = ref(false);

const param_custom = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	labelKey: "triggers.actions.sfxr.param_custom",
	value: "",
	placeholder: "{...}",
	longText: true,
});

const param_volume = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "slider",
	min: 0,
	max: 100,
	labelKey: "triggers.actions.sfxr.param_volume",
	value: 25,
	icon: "volume",
});

const param_waitForEnd = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "triggers.actions.sfxr.param_waitForComplete",
	value: true,
	icon: "countdown",
});

const param_playOnOverlay = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "triggers.actions.sfxr.param_playOnOverlay",
	value: false,
	icon: "overlay",
});

let prevSound: AudioBufferSourceNode | null = null;

const exchangeChannelAvailable = computed((): boolean => {
	return Config.instance.OBS_DOCK_CONTEXT || OBSWebsocket.instance.connected.value;
});

const subcontentObs = computed((): TwitchatDataTypes.ParamDeepSectionsStringType => {
	return TwitchatDataTypes.ParamDeepSections.OBS;
});

const contentConnexions = computed((): TwitchatDataTypes.ParameterPagesStringType => {
	return TwitchatDataTypes.ParameterPages.CONNECTIONS;
});

const actions = computed((): TriggerActionSFXRData["sfxr"]["presetId"][] => {
	return [...JSFXRSoundPreset, "custom"];
});

onBeforeMount(() => {
	if (!props.action.sfxr) {
		props.action.sfxr = {
			presetId: "blipSelect",
			waitForEnd: true,
			playOnOverlay: false,
			volume: 100,
		};
	}
	param_custom.value.value = props.action.sfxr.rawConfig || "";
});

async function testCustomSound(): Promise<void> {
	if (prevSound) prevSound.stop();
	error.value = false;
	if (props.action.sfxr.rawConfig) {
		prevSound = (
			await SFXRUtils.playSFXRFromString(
				props.action.sfxr.rawConfig,
				param_volume.value.value,
			)
		).audio;
	}
}

async function playSample(id: TriggerActionSFXRData["sfxr"]["presetId"]): Promise<void> {
	if (prevSound) prevSound.stop();
	if (id === "custom") return;
	prevSound = (await SFXRUtils.playSFXRFromString(id, param_volume.value.value)).audio;
}
</script>

<style scoped lang="less">
.triggeractionsfxrentry {
	.options {
		gap: 0.25rem;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;

		.option {
			display: flex;
			flex-direction: row;
			gap: 0.25rem;
			cursor: pointer;
			align-items: center;
			padding: 0.25em 0.5em;
			border-radius: var(--border-radius);
			background-color: var(--grayout-fader);

			.icon {
				width: 1em;
				height: 1em;
			}

			label {
				cursor: pointer;
			}

			&.selected {
				background-color: var(--color-light);
				color: var(--color-secondary);
				font-weight: bold;
			}
		}
	}

	.custom {
		margin-top: 0.5rem;
		.testBt {
			margin: 0.25em auto 0 auto;
			display: flex;
		}
	}
}
</style>
