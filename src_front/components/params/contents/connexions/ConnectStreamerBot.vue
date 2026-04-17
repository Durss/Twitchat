<template>
	<ConnectionForm
		icon="streamerbot"
		:connected="sStreamerbot.connected"
		:connecting="connecting"
		:error="error"
		:showSuccess="showSuccess"
		errorMessage="streamerbot.connect_error"
		:canConnect="canConnect"
		:connectedInfo="connectedInfo"
		:enabled="sStreamerbot.connectionEnabled"
		@connect="doConnect"
		@disconnect="doDisconnect"
		@update:enabled="onToggleEnabled"
		@update:error="error = $event"
	>
		<template #header>
			<i18n-t scope="global" tag="span" keypath="streamerbot.header">
				<template #LINK>
					<a href="https://streamer.bot/" target="_blank"
						><Icon name="newtab" />Streamer.bot</a
					>
				</template>
			</i18n-t>
		</template>

		<template #info>
			<div class="card-item secondary infos">
				<span>
					<Icon name="info" />
					<span>{{ t("streamerbot.instructions") }}</span>
				</span>
				<TTButton
					class="installBt"
					href="https://streamer.bot"
					type="link"
					icon="newtab"
					target="_blank"
					light
					secondary
					>{{ t("streamerbot.install") }}</TTButton
				>
			</div>
		</template>

		<template #fields>
			<ParamItem noBackground :paramData="param_ip" v-model="sStreamerbot.ip" />
			<ParamItem noBackground :paramData="param_port" v-model="sStreamerbot.port" />
			<ParamItem noBackground :paramData="param_pass" v-model="sStreamerbot.password" />
		</template>
	</ConnectionForm>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ParamItem from "../../ParamItem.vue";
import TTButton from "@/components/TTButton.vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { storeStreamerbot as useStoreStreamerbot } from "@/store/streamerbot/storeStreamerbot";
import { useConnectionForm } from "@/composables/useConnectionForm";
import ConnectionForm from "./ConnectionForm.vue";

const { t } = useI18n();
const sStreamerbot = useStoreStreamerbot();
const { connecting, error, showSuccess, doConnect, doDisconnect } = useConnectionForm(
	() => sStreamerbot.connect(),
	() => sStreamerbot.disconnect(),
);

const param_ip: TwitchatDataTypes.ParameterData<string> = {
	value: "",
	type: "string",
	labelKey: "streamerbot.ip",
	maxLength: 100,
};
const param_port: TwitchatDataTypes.ParameterData<number> = {
	value: 0,
	type: "number",
	labelKey: "streamerbot.port",
	min: 0,
	max: 65535,
};
const param_pass: TwitchatDataTypes.ParameterData<string> = {
	value: "",
	type: "string",
	labelKey: "streamerbot.pass",
	maxLength: 100,
	isPrivate: true,
};

const canConnect = computed(() => sStreamerbot.ip.length >= 7);

const connectedInfo = computed(() => [
	{ label: t(param_ip.labelKey!), value: sStreamerbot.ip },
	{ label: t(param_port.labelKey!), value: sStreamerbot.port },
]);

function onToggleEnabled(v: boolean): void {
	sStreamerbot.connectionEnabled = v;
	sStreamerbot.saveConfigs();
	if (!v) doDisconnect();
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
