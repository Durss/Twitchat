<template>
	<div class="connectwebsocket parameterContent">
		<Icon name="broadcast" alt="socket icon" class="icon" />

		<div class="head">{{ t("connexions.triggerSocket.usage") }}</div>

		<div class="content">
			<form class="card-item" v-if="!connected" @submit.prevent="connect()">
				<ParamItem noBackground :paramData="param_ip" autofocus @change="onChangeValue" />
				<ParamItem noBackground :paramData="param_port" @change="onChangeValue" />
				<ParamItem
					noBackground
					:paramData="param_secured"
					v-model="param_secured.value"
					@change="onChangeValue"
				/>

				<div class="ctas">
					<TTButton
						type="reset"
						v-if="!connected"
						alert
						@click="clearForm()"
						:loading="connecting"
						:disabled="!canConnect"
						>{{ t("global.clear") }}</TTButton
					>
					<TTButton
						type="submit"
						v-if="!connected"
						:loading="connecting"
						:disabled="!canConnect"
						>{{ t("global.connect") }}</TTButton
					>
				</div>
			</form>

			<BrowserPermissionChecker
				v-if="error"
				@click="error = false"
				class="card-item alert error"
				:errorMessage="t('error.local_network_access_denied')"
				:permissionName="'local-network-access'"
			>
				{{ t("error.trigger_socket") }}
			</BrowserPermissionChecker>

			<template v-if="connected">
				<div class="card-item primary" v-if="showSuccess">
					{{ t("connexions.triggerSocket.success") }}
				</div>

				<div class="card-item infos">
					<div>
						<strong>{{ t(param_ip.labelKey!) }}</strong
						>: {{ param_ip.value }}
					</div>
					<div>
						<strong>{{ t(param_port.labelKey!) }}</strong
						>: {{ param_port.value }}
					</div>
				</div>

				<TTButton class="connectBt" alert @click="disconnect()">{{
					t("global.disconnect")
				}}</TTButton>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import DataStore from "@/store/DataStore";
import type { SocketParams } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import WebsocketTrigger from "@/utils/WebsocketTrigger";
import ParamItem from "../../ParamItem.vue";
import BrowserPermissionChecker from "@/components/BrowserPermissionChecker.vue";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const error = ref(false);
const showSuccess = ref(false);
const connecting = ref(false);

const param_ip = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	labelKey: "connexions.triggerSocket.ip",
	maxLength: 100,
});
const param_port = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 3000,
	type: "number",
	labelKey: "connexions.triggerSocket.port",
	min: 0,
	max: 65535,
});
const param_secured = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "connexions.triggerSocket.secured",
});

const connected = computed(() => {
	return WebsocketTrigger.instance.connected.value;
});
const canConnect = computed<boolean>(() => {
	return param_ip.value.value.length >= 7; // && param_port.value.value > 0;
});

onMounted(() => {
	const paramsStr = DataStore.get(DataStore.WEBSOCKET_TRIGGER);
	if (paramsStr) {
		let params = JSON.parse(paramsStr) as SocketParams;
		param_ip.value.value = params.ip;
		param_port.value.value = params.port || 3000;
		param_secured.value.value = params.secured;
	}
});

function connect(): void {
	connecting.value = true;
	WebsocketTrigger.instance
		.connect(param_ip.value.value, param_port.value.value, param_secured.value.value)
		.then(() => {
			connecting.value = false;
			showSuccess.value = true;
		})
		.catch(() => {
			connecting.value = false;
			error.value = true;
		});
}

function clearForm(): void {
	DataStore.remove(DataStore.WEBSOCKET_TRIGGER);
	WebsocketTrigger.instance.disconnect();
}

function disconnect(): void {
	DataStore.remove(DataStore.WEBSOCKET_TRIGGER);
	WebsocketTrigger.instance.disconnect();
}

function onChangeValue(): void {
	DataStore.set(DataStore.WEBSOCKET_TRIGGER, {
		ip: param_ip.value.value,
		port: param_port.value.value,
		secured: param_secured.value.value,
	});
}
</script>

<style scoped lang="less">
.connectwebsocket {
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;

		form {
			display: flex;
			flex-direction: column;
			gap: 0.5em;
		}
		.ctas {
			gap: 1em;
			display: flex;
			flex-direction: row;
			justify-content: center;
		}

		.infos {
			gap: 0.5em;
			display: flex;
			flex-direction: column;
		}
	}
}
</style>
