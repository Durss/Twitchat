<template>
	<div class="paramsobs parameterContent">
		<Icon name="obs" alt="overlay icon" class="icon" />

		<div class="head">
			<p>{{ $t("obs.header") }}</p>
		</div>

		<ParamItem class="item enableBt" :paramData="param_enabled" v-model="param_enabled.value" />

		<div class="fadeHolder" :style="holderStyles">
			<OBSConnectForm class="connectForm" />

			<ToggleBlock
				class="block permissions"
				v-if="connected"
				:open="false"
				:icons="['lock_fit']"
				:title="$t('obs.permissions_title')"
			>
				<p class="info">{{ $t("obs.permissions_head") }}</p>
				<PermissionsForm class="content" v-model="permissions" />
			</ToggleBlock>

			<ToggleBlock
				class="block mic"
				v-if="connected"
				:open="false"
				:icons="['microphone']"
				:title="$t('obs.microphone_title')"
			>
				<OBSAudioSourceForm />
			</ToggleBlock>

			<ToggleBlock
				class="block scenes"
				v-if="connected"
				:open="false"
				:icons="['list']"
				:title="$t('obs.scenes_title')"
			>
				<OBSScenes />
			</ToggleBlock>

			<ToggleBlock
				class="block browserSources"
				v-newflag="{ date: $config.NEW_FLAGS_DATE_V11, id: 'obs_browsersources' }"
				v-if="connected"
				:open="false"
				:icons="['internet']"
				:title="$t('obs.browser_sources_title')"
			>
				<OBSBrowserSources />
			</ToggleBlock>
		</div>
	</div>
</template>

<script setup lang="ts">
import ToggleBlock from "@/components/ToggleBlock.vue";
import DataStore from "@/store/DataStore";
import { storeOBS as useStoreOBS } from "@/store/obs/storeOBS";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import OBSWebsocket from "@/utils/OBSWebsocket";
import Utils from "@/utils/Utils";
import { computed, onMounted, ref, watch } from "vue";
import type { CSSProperties } from "vue";
import PermissionsForm from "../../../PermissionsForm.vue";
import ParamItem from "../../ParamItem.vue";
import OBSAudioSourceForm from "../obs/OBSAudioSourceForm.vue";
import OBSConnectForm from "../obs/OBSConnectForm.vue";
import OBSScenes from "../obs/OBSScenes.vue";
import OBSBrowserSources from "../obs/OBSBrowserSources.vue";
import type IParameterContent from "../IParameterContent";

const storeOBS = useStoreOBS();

const connected = ref(false);
const openConnectForm = ref(false);
const param_enabled = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "global.enabled",
	value: false,
});
const permissions = ref<TwitchatDataTypes.PermissionsData>(
	Utils.getDefaultPermissions(true, true, false, false, false, false),
);

const holderStyles = computed<CSSProperties>(() => ({
	opacity: param_enabled.value.value === true ? 1 : 0.5,
	pointerEvents: param_enabled.value.value === true ? "all" : "none",
}));

watch(
	() => param_enabled.value.value,
	() => {
		paramUpdate();
	},
);
watch(
	() => permissions.value,
	() => {
		onPermissionChange();
	},
	{ deep: true },
);
watch(
	() => OBSWebsocket.instance.connected.value,
	() => {
		connected.value = OBSWebsocket.instance.connected.value;
		if (!connected.value) openConnectForm.value = true;
	},
);

onMounted(() => {
	const port = DataStore.get(DataStore.OBS_PORT);
	const pass = DataStore.get(DataStore.OBS_PASS);
	const ip = DataStore.get(DataStore.OBS_IP);

	if (port != undefined || pass != undefined || ip != undefined) {
		connected.value = OBSWebsocket.instance.connected.value;
		openConnectForm.value = !connected.value;
	} else {
		openConnectForm.value = true;
	}

	const storedPermissions = storeOBS.commandsPermissions;
	permissions.value = JSON.parse(JSON.stringify(storedPermissions)); //Clone object to break ref
	param_enabled.value.value = storeOBS.connectionEnabled ?? false;
});

function onNavigateBack(): boolean {
	return false;
}

/**
 * Called when changing commands permisions
 */
async function onPermissionChange(): Promise<void> {
	storeOBS.setObsCommandsPermissions(permissions.value);
}

/**
 * Called when changing OBS credentials
 */
function paramUpdate(): void {
	connected.value = false;
	storeOBS.connectionEnabled = param_enabled.value.value;
	DataStore.set(DataStore.OBS_CONNECTION_ENABLED, param_enabled.value.value);
	if (!param_enabled.value.value) {
		OBSWebsocket.instance.disconnect();
	}
}

defineExpose<IParameterContent>({ onNavigateBack });
</script>

<style scoped lang="less">
.paramsobs {
	.fadeHolder {
		transition: opacity 0.2s;
		gap: 1em;
		display: flex;
		flex-direction: column;

		.connectForm {
			align-self: center;
		}
	}

	.block {
		.info {
			margin-bottom: 1em;
		}
		&.permissions {
			.info {
				text-align: center;
				margin-bottom: 0.5em;
			}
			.content {
				width: 300px;
			}
		}
	}

	.conf {
		display: flex;
		flex-direction: column;

		.info {
			margin-bottom: 1em;
		}

		.connectBt {
			display: block;
			margin: auto;
		}

		.fade-enter-active {
			transition: all 0.2s;
		}

		.fade-leave-active {
			transition: all 0.2s;
		}

		.fade-enter-from,
		.fade-leave-to {
			opacity: 0;
			transform: translateY(-10px);
		}
	}
}
</style>
