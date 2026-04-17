<template>
	<ConnectionForm
		icon="sammi"
		:connected="sSammi.connected"
		:connecting="connecting"
		:error="error"
		:showSuccess="showSuccess"
		errorMessage="sammi.connect_error"
		:canConnect="canConnect"
		:connectedInfo="connectedInfo"
		:enabled="sSammi.connectionEnabled"
		@connect="doConnect"
		@disconnect="doDisconnect"
		@update:enabled="onToggleEnabled"
		@update:error="error = $event"
	>
		<template #header>
			<i18n-t scope="global" tag="span" keypath="sammi.header">
				<template #LINK>
					<a href="https://sammi.solutions" target="_blank"
						><Icon name="newtab" />SAMMI</a
					>
				</template>
			</i18n-t>
		</template>

		<template #info>
			<div class="card-item secondary infos">
				<span>
					<Icon name="info" />
					<span>{{ t("sammi.instructions") }}</span>
				</span>
				<TTButton
					class="installBt"
					href="https://sammi.solutions"
					type="link"
					icon="newtab"
					target="_blank"
					light
					secondary
					>{{ t("sammi.install") }}</TTButton
				>
			</div>
		</template>

		<template #fields>
			<ParamItem noBackground :paramData="param_ip" v-model="sSammi.ip" />
			<ParamItem noBackground :paramData="param_port" v-model="sSammi.port" />
			<ParamItem noBackground :paramData="param_pass" v-model="sSammi.password" />
		</template>
	</ConnectionForm>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ParamItem from "../../ParamItem.vue";
import TTButton from "@/components/TTButton.vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { storeSammi as useStoreSammi } from "@/store/sammi/storeSammi";
import { useConnectionForm } from "@/composables/useConnectionForm";
import ConnectionForm from "./ConnectionForm.vue";

const { t } = useI18n();
const sSammi = useStoreSammi();
const { connecting, error, showSuccess, doConnect, doDisconnect } = useConnectionForm(
	() => sSammi.connect(),
	() => sSammi.disconnect(),
);

const param_ip: TwitchatDataTypes.ParameterData<string> = {
	value: "",
	type: "string",
	labelKey: "sammi.ip",
	maxLength: 100,
};
const param_port: TwitchatDataTypes.ParameterData<number> = {
	value: 0,
	type: "number",
	labelKey: "sammi.port",
	min: 0,
	max: 65535,
};
const param_pass: TwitchatDataTypes.ParameterData<string> = {
	value: "",
	type: "string",
	labelKey: "sammi.pass",
	maxLength: 100,
	isPrivate: true,
};

const canConnect = computed(() => sSammi.ip.length >= 7);

const connectedInfo = computed(() => [
	{ label: t(param_ip.labelKey!), value: sSammi.ip },
	{ label: t(param_port.labelKey!), value: sSammi.port },
]);

function onToggleEnabled(v: boolean): void {
	sSammi.connectionEnabled = v;
	sSammi.saveConfigs();
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
