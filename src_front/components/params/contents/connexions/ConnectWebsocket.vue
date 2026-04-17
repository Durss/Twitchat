<template>
	<ConnectionForm
		icon="broadcast"
		:connected="connected"
		:connecting="connecting"
		:error="error"
		:showSuccess="showSuccess"
		errorMessage="error.trigger_socket"
		:canConnect="canConnect"
		:connectedInfo="connectedInfo"
		:enabled="enabled"
		@connect="doConnect"
		@disconnect="doDisconnect"
		@update:enabled="onToggleEnabled"
		@update:error="error = $event"
	>
		<template #header>{{ t("connexions.triggerSocket.usage") }}</template>

		<template #mandatoryFields>
			<ParamItem noBackground :paramData="param_ip" @change="onChangeValue" />
			<ParamItem noBackground :paramData="param_port" @change="onChangeValue" />
			<ParamItem
				noBackground
				:paramData="param_secured"
				v-model="param_secured.value"
				@change="onChangeValue"
			/>
		</template>
	</ConnectionForm>
</template>

<script setup lang="ts">
import { useConnectionForm } from "@/composables/useConnectionForm";
import DataStore from "@/store/DataStore";
import type { SocketParams } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import WebsocketTrigger from "@/utils/WebsocketTrigger";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import ConnectionForm from "./ConnectionForm.vue";

const { t } = useI18n();

const enabled = ref(false);

const { connecting, error, showSuccess, doConnect, doDisconnect } = useConnectionForm(
	async () => {
		await WebsocketTrigger.instance.connect(
			param_ip.value.value,
			param_port.value.value,
			param_secured.value.value,
		);
		return true;
	},
	() => {
		WebsocketTrigger.instance.disconnect();
	},
);

const param_ip = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	labelKey: "connexions.ip",
	maxLength: 100,
});
const param_port = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 3000,
	type: "number",
	labelKey: "connexions.port",
	min: 0,
	max: 65535,
});
const param_secured = ref<TwitchatDataTypes.ParameterData<boolean>>({
	value: false,
	type: "boolean",
	labelKey: "connexions.triggerSocket.secured",
});

const connected = computed(() => WebsocketTrigger.instance.connected.value);
const canConnect = computed(() => param_ip.value.value.length >= 7);
const connectedInfo = computed(() => [
	{ label: t(param_ip.value.labelKey!), value: param_ip.value.value },
	{ label: t(param_port.value.labelKey!), value: param_port.value.value },
]);

onMounted(() => {
	const paramsStr = DataStore.get(DataStore.WEBSOCKET_TRIGGER);
	if (paramsStr) {
		let params = JSON.parse(paramsStr) as SocketParams & { connectionEnabled?: boolean };
		param_ip.value.value = params.ip;
		param_port.value.value = params.port || 3000;
		param_secured.value.value = params.secured;
		enabled.value = params.connectionEnabled ?? true;
	}
});

function onChangeValue(): void {
	saveConfigs();
}

function saveConfigs(): void {
	DataStore.set(DataStore.WEBSOCKET_TRIGGER, {
		ip: param_ip.value.value,
		port: param_port.value.value,
		secured: param_secured.value.value,
		connectionEnabled: enabled.value,
	});
}

function onToggleEnabled(v: boolean): void {
	enabled.value = v;
	saveConfigs();
}
</script>

<style scoped lang="less"></style>
