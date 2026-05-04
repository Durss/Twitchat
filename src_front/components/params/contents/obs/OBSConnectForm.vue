<template>
	<ConnectionForm
		class="obsconnectform"
		icon="obs"
		:showIcon="false"
		:showHeader="false"
		:connected="connected"
		:connecting="connecting"
		:error="error"
		:showSuccess="showSuccess"
		errorMessage="error.obs_ws_connect"
		:canConnect="canConnect"
		:connectedInfo="connectedInfo"
		:enableToggle="false"
		@connect="doConnect"
		@disconnect="doDisconnect"
		@update:error="error = $event"
	>
		<template #fields>
			<ParamItem
				:paramData="obsPort_conf"
				class="param"
				@change="paramUpdate()"
				noBackground
			/>
			<ParamItem
				:paramData="obsPass_conf"
				class="param"
				@change="paramUpdate()"
				noBackground
			/>
			<ParamItem :paramData="obsIP_conf" class="param" @change="paramUpdate()" noBackground />

			<ToggleBlock class="info" small :open="false" :title="t('obs.how_to_title')">
				<p>{{ t("obs.how_to1") }}</p>
				<i18n-t scope="global" tag="p" class="warn" keypath="obs.how_to2">
					<template #IP><strong>127.0.0.1</strong></template>
				</i18n-t>
				<img src="@/assets/img/obs-ws_credentials.png" alt="credentials" />
			</ToggleBlock>
		</template>

		<template #error>
			<div>{{ t("error.obs_ws_connect") }}</div>
			<div v-if="obsIP_conf.value != '127.0.0.1'">{{ t("obs.ip_advice") }}</div>
		</template>
	</ConnectionForm>
</template>

<script setup lang="ts">
import { useConnectionForm } from "@/composables/useConnectionForm";
import DataStore from "@/store/DataStore";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import OBSWebsocket from "@/utils/OBSWebsocket";
import { ref, computed, onBeforeMount } from "vue";
import ToggleBlock from "../../../ToggleBlock.vue";
import ParamItem from "../../ParamItem.vue";
import { useI18n } from "vue-i18n";
import ConnectionForm from "../connexions/ConnectionForm.vue";

const { t } = useI18n();
const obsPort_conf = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 4455,
	min: 0,
	max: 65535,
	step: 1,
	labelKey: "obs.form_port",
});
const obsPass_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "password",
	value: "",
	labelKey: "obs.form_pass",
	isPrivate: true,
});
const obsIP_conf = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "127.0.0.1",
	maxLength: 100,
	labelKey: "obs.form_ip",
});
const { connecting, error, showSuccess, doConnect, doDisconnect } = useConnectionForm(
	async () => {
		const isConnected = await OBSWebsocket.instance.connect(
			obsPort_conf.value.value.toString(),
			obsPass_conf.value.value,
			false,
			obsIP_conf.value.value,
			true,
		);
		if (isConnected) {
			paramUpdate();
		}
		return isConnected;
	},
	() => {
		OBSWebsocket.instance.disconnect();
	},
);

const connected = computed((): boolean => {
	return OBSWebsocket.instance.connected.value;
});

const canConnect = computed((): boolean => {
	return obsIP_conf.value.value.length >= 7;
});

const connectedInfo = computed(() => [
	{ label: t(obsIP_conf.value.labelKey!), value: obsIP_conf.value.value },
	{ label: t(obsPort_conf.value.labelKey!), value: obsPort_conf.value.value },
]);

onBeforeMount(async () => {
	const port = DataStore.get(DataStore.OBS_PORT);
	const pass = DataStore.get(DataStore.OBS_PASS);
	const ip = DataStore.get(DataStore.OBS_IP);
	if (port) obsPort_conf.value.value = parseInt(port);
	if (pass) obsPass_conf.value.value = pass;
	if (ip) obsIP_conf.value.value = ip;
});

/**
 * Called when changing OBS credentials
 */
function paramUpdate(): void {
	DataStore.set(DataStore.OBS_PORT, obsPort_conf.value.value);
	DataStore.set(DataStore.OBS_PASS, obsPass_conf.value.value);
	DataStore.set(DataStore.OBS_IP, obsIP_conf.value.value);
}
</script>

<style scoped lang="less">
.obsconnectform {
	:deep(.error),
	:deep(.success) {
		text-align: center;
		line-height: 1.3em;
		cursor: pointer;
		white-space: pre-line;
		&.success {
			align-self: center;
		}
		.icon {
			height: 2em;
			vertical-align: middle;
			margin-right: 0.5em;
		}
	}

	.info {
		width: 100%;
		:deep(.content) {
			gap: 0.5em;
			display: flex;
			flex-direction: column;
			align-items: center;
		}
	}
	.param {
		:deep(.inputHolder) {
			flex-basis: 200px;
			flex-grow: 0 !important;
		}
	}
}
</style>
