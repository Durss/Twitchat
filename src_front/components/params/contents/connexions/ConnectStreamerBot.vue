<template>
	<ConnectionForm
		icon="streamerbot"
		:connected="storeStreamerbot.connected"
		:connecting="connecting"
		:error="error"
		:showSuccess="showSuccess"
		errorMessage="streamerbot.connect_error"
		:canConnect="canConnect"
		:connectedInfo="connectedInfo"
		:enabled="storeStreamerbot.connectionEnabled"
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
			<ParamItem noBackground :paramData="param_ip" v-model="storeStreamerbot.ip" />
			<ParamItem noBackground :paramData="param_port" v-model="storeStreamerbot.port" />
			<ParamItem noBackground :paramData="param_pass" v-model="storeStreamerbot.password" />
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
import { ref } from "vue";

const { t } = useI18n();
const storeStreamerbot = useStoreStreamerbot();
const { connecting, error, showSuccess, doConnect, doDisconnect } = useConnectionForm(
	() => storeStreamerbot.connect(),
	() => storeStreamerbot.disconnect(),
);

const param_ip = ref<TwitchatDataTypes.ParameterData<string>>({
	value: storeStreamerbot.ip,
	type: "string",
	labelKey: "streamerbot.ip",
	maxLength: 100,
});
const param_port = ref<TwitchatDataTypes.ParameterData<number>>({
	value: storeStreamerbot.port,
	type: "number",
	labelKey: "streamerbot.port",
	min: 0,
	max: 65535,
});
const param_pass = ref<TwitchatDataTypes.ParameterData<string>>({
	value: storeStreamerbot.password,
	type: "string",
	labelKey: "streamerbot.pass",
	maxLength: 100,
	isPrivate: true,
});

const canConnect = computed(() => storeStreamerbot.ip.length >= 7);

const connectedInfo = computed(() => [
	{ label: t(param_ip.value.labelKey!), value: storeStreamerbot.ip },
	{ label: t(param_port.value.labelKey!), value: storeStreamerbot.port },
]);

function onToggleEnabled(v: boolean): void {
	storeStreamerbot.connectionEnabled = v;
	storeStreamerbot.saveConfigs();
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
