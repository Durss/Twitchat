<template>
	<ConnectionForm
		icon="playability"
		:connected="sPlayability.connected"
		:connecting="connecting"
		:error="error"
		:showSuccess="showSuccess"
		errorMessage="playability.connect_error"
		:canConnect="canConnect"
		:connectedInfo="connectedInfo"
		:enabled="sPlayability.connectionEnabled"
		@connect="doConnect"
		@disconnect="doDisconnect"
		@update:enabled="onToggleEnabled"
		@update:error="error = $event"
	>
		<template #header>
			<i18n-t scope="global" tag="span" keypath="playability.header">
				<template #LINK>
					<a href="https://playability.gg" target="_blank"
						><Icon name="newtab" />PlayAbility</a
					>
				</template>
			</i18n-t>
			<div class="small">{{ t("playability.info") }}</div>
		</template>

		<template #info>
			<div class="card-item secondary infos">
				<span>
					<Icon name="info" />
					<i18n-t scope="global" tag="span" keypath="playability.instructions">
						<template #SETTINGS><strong>Settings</strong></template>
						<template #ADVANCED><strong>Advanced</strong></template>
						<template #OPTION_1><strong>Enable Websocket Server</strong></template>
						<template #OPTION_2><strong>Allow Websocket Inputs</strong></template>
						<template #OPTION_3><strong>Allow Websocket Outputs</strong></template>
					</i18n-t>
				</span>
				<TTButton
					class="installBt"
					href="https://playability.gg"
					type="link"
					icon="newtab"
					target="_blank"
					light
					secondary
					>{{ t("playability.install") }}</TTButton
				>
			</div>
		</template>

		<template #fields>
			<ParamItem noBackground :paramData="param_ip" v-model="sPlayability.ip" />
			<ParamItem noBackground :paramData="param_port" v-model="sPlayability.port" />
		</template>
	</ConnectionForm>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ParamItem from "../../ParamItem.vue";
import TTButton from "@/components/TTButton.vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { storePlayability as useStorePlayability } from "@/store/playability/storePlayability";
import { useConnectionForm } from "@/composables/useConnectionForm";
import ConnectionForm from "./ConnectionForm.vue";

const { t } = useI18n();
const sPlayability = useStorePlayability();
const { connecting, error, showSuccess, doConnect, doDisconnect } = useConnectionForm(
	() => sPlayability.connect(),
	() => sPlayability.disconnect(),
);

const param_ip: TwitchatDataTypes.ParameterData<string> = {
	value: "",
	type: "string",
	labelKey: "playability.ip",
	maxLength: 100,
};
const param_port: TwitchatDataTypes.ParameterData<number> = {
	value: 0,
	type: "number",
	labelKey: "playability.port",
	min: 0,
	max: 65535,
};

const canConnect = computed(() => sPlayability.ip.length >= 7);

const connectedInfo = computed(() => [
	{ label: t(param_ip.labelKey!), value: sPlayability.ip },
	{ label: t(param_port.labelKey!), value: sPlayability.port },
]);

function onToggleEnabled(v: boolean): void {
	sPlayability.connectionEnabled = v;
	sPlayability.saveConfigs();
}
</script>

<style scoped lang="less">
.connectionForm {
	.infos {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>
