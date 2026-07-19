<template>
	<ToggleBlock
		class="heatscreenentry"
		v-model:title="props.data.title"
		editableTitle
		:open="false"
		:title-max-length="50"
		:title-default="t('heat.default_title')"
	>
		<template #left_actions>
			<ToggleButton @click.stop v-if="canEnable" v-model="props.data.enabled" />
			<HeatScreenPreview :screen="props.data" :showObsScene="false" class="preview small" />
		</template>
		<template #right_actions>
			<TTButton
				icon="copy"
				v-if="canCreateScreens"
				@click.stop="duplicateScreen()"
				v-tooltip="t('global.duplicate')"
			/>
			<TTButton icon="trash" alert @click.stop="deleteScreen()" />
		</template>

		<div class="form">
			<ParamItem
				:paramData="params_target"
				v-model="params_target.value"
				@change="onSelectOBSScene()"
			/>
			<ParamItem
				:paramData="params_showOBS"
				v-model="params_showOBS.value"
				v-if="obsConnected"
				class="shrink"
			/>
		</div>

		<HeatScreenEditor :screen="props.data" :obsPreview="params_showOBS.value" class="preview" />
	</ToggleBlock>
</template>

<script setup lang="ts">
import ParamItem from "@/components/params/ParamItem.vue";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeHeat as useStoreHeat } from "@/store/heat/storeHeat";
import type { HeatScreen } from "@/types/HeatDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import OBSWebsocket from "@/utils/OBSWebsocket";
import { computed, ref, watch } from "vue";
import HeatScreenPreview from "./HeatScreenPreview.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import { useI18n } from "vue-i18n";
import ToggleButton from "@/components/ToggleButton.vue";
import Config from "@/utils/Config.js";
import TTButton from "@/components/TTButton.vue";
import HeatScreenEditor from "./HeatScreenEditor.vue";

const { t } = useI18n();
const props = defineProps<{ data: HeatScreen }>();
const storeParams = useStoreParams();
const storeAuth = useStoreAuth();
const storeHeat = useStoreHeat();

if (!props.data.title) props.data.title = "";

const maxScreens = computed(() => {
	return 1;
	return storeAuth.isPremium
		? Config.instance.MAX_CUSTOM_HEAT_SCREENS_PREMIUM
		: Config.instance.MAX_CUSTOM_HEAT_SCREENS;
});
const canCreateScreens = computed(() => {
	return storeHeat.screenList.length < maxScreens.value;
});

const canEnable = computed<boolean>(() => {
	let max = Config.instance.MAX_CUSTOM_HEAT_SCREENS;
	if (storeAuth.isPremium) max = Config.instance.MAX_CUSTOM_HEAT_SCREENS_PREMIUM;
	return (
		storeHeat.screenList.filter((v) => v.enabled).length < max || props.data.enabled != false
	);
});

const obsConnected = computed(() => {
	return OBSWebsocket.instance.connected.value;
});

const params_showOBS = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "heat.areas.show_obs",
});
const params_target = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "list",
	icon: "obs",
	value: "",
	labelKey: "heat.areas.target",
});

async function populateOBSScenes(): Promise<void> {
	params_target.value.listValues = [{ value: "", labelKey: "heat.areas.target_always" }];

	if (OBSWebsocket.instance.connected.value) {
		const scenes = await OBSWebsocket.instance.getScenes();
		scenes.scenes.forEach((v) => {
			params_target.value.listValues!.push({ value: v.sceneName, label: v.sceneName });
		});
	} else {
		params_target.value.listValues!.push({
			value: "obs",
			labelKey: "heat.areas.connect_obs",
		});
	}
	params_target.value.value = props.data.activeOBSScene;
}

function onSelectOBSScene(): void {
	if (params_target.value.value == "obs") {
		storeParams.openParamsPage(
			TwitchatDataTypes.ParameterPages.CONNECTIONS,
			TwitchatDataTypes.ParamDeepSections.OBS,
		);
		return;
	}
	props.data.activeOBSScene = params_target.value.value;
}

/**
 * Called when clicking duplicate button
 */
function duplicateScreen(): void {
	storeHeat.duplicateScreen(props.data.id);
}

/**
 * Called when clicking duplicate button
 */
function deleteScreen(): void {
	storeHeat.deleteScreen(props.data.id);
}

watch(
	() => OBSWebsocket.instance.connected.value,
	() => {
		populateOBSScenes();
	},
	{ immediate: true },
);
</script>

<style scoped lang="less">
.heatscreenentry {
	.preview {
		margin: 0 auto;
		&.small {
			height: 40px;
			width: auto;
			aspect-ratio: 16/9;
			background-color: #00000090;
			border: none;
			border-radius: 0.25em;
			pointer-events: none;
			:deep(polygon) {
				fill: white;
			}
		}
	}

	.form {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		gap: 0.25em;
		margin-top: 0.5em;

		&:first-of-type {
			margin-top: 0;
			margin-bottom: 0.5em;
		}

		.shrink {
			align-self: center;
		}

		.premium {
			background-color: var(--color-premium-fade);
		}
	}
}
</style>
