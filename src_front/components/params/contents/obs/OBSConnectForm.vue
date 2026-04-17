<template>
	<form @submit.prevent="connect()" class="obsconnectform" :class="connected ? '' : 'card-item'">
		<transition name="fade">
			<div
				v-if="connectSuccess && connected"
				@click="connectSuccess = false"
				class="card-item primary success"
			>
				{{ t("obs.connection_success") }}
			</div>
		</transition>

		<template v-if="!connected">
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

			<Button type="submit" class="connectBt" :loading="loading">{{
				t("global.connect")
			}}</Button>
		</template>

		<Button
			v-else
			@click="disconnect()"
			class="connectBt"
			alert
			:loading="loading"
			icon="cross"
			>{{ t("global.disconnect") }}</Button
		>

		<transition name="fade">
			<BrowserPermissionChecker
				v-if="connectError"
				@click="connectError = false"
				class="card-item alert error"
				:errorMessage="t('error.local_network_access_denied')"
				:permissionName="'local-network-access'"
			>
				<div>{{ t("error.obs_ws_connect") }}</div>
				<div v-if="obsIP_conf.value != '127.0.0.1'">{{ t("obs.ip_advice") }}</div>
			</BrowserPermissionChecker>
		</transition>
	</form>
</template>

<script setup lang="ts">
import DataStore from "@/store/DataStore";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import OBSWebsocket from "@/utils/OBSWebsocket";
import { ref, computed, onBeforeMount } from "vue";
import Button from "../../../TTButton.vue";
import ToggleBlock from "../../../ToggleBlock.vue";
import ParamItem from "../../ParamItem.vue";
import BrowserPermissionChecker from "@/components/BrowserPermissionChecker.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const loading = ref<boolean>(false);
const connectError = ref<boolean>(false);
const connectSuccess = ref<boolean>(false);
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

const connected = computed((): boolean => {
	return OBSWebsocket.instance.connected.value;
});

onBeforeMount(async () => {
	const port = DataStore.get(DataStore.OBS_PORT);
	const pass = DataStore.get(DataStore.OBS_PASS);
	const ip = DataStore.get(DataStore.OBS_IP);
	if (port) obsPort_conf.value.value = parseInt(port);
	if (pass) obsPass_conf.value.value = pass;
	if (ip) obsIP_conf.value.value = ip;
});

/**
 * Connect to OBS websocket
 */
async function connect(): Promise<void> {
	loading.value = true;
	connectSuccess.value = false;
	connectError.value = false;
	const isConnected = await OBSWebsocket.instance.connect(
		obsPort_conf.value.value.toString(),
		obsPass_conf.value.value,
		false,
		obsIP_conf.value.value,
		true,
	);
	if (isConnected) {
		paramUpdate();
		connectSuccess.value = true;
		window.setTimeout(() => {
			connectSuccess.value = false;
		}, 3000);
	} else {
		connectError.value = true;
	}
	loading.value = false;
}

async function disconnect(): Promise<void> {
	OBSWebsocket.instance.disconnect();
}

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
	gap: 0.5em;
	display: flex;
	flex-direction: column;

	.connectBt {
		margin: auto;
	}

	.error,
	.success {
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
</style>
