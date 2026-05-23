<template>
	<ConnectionForm
		icon="meldStudio"
		:connected="storeMeldStudio.connected"
		:connecting="storeMeldStudio.connecting"
		:error="error"
		:showSuccess="showSuccess"
		errorMessage="meldStudio.connect_error"
		:canConnect="canConnect"
		:connectedInfo="connectedInfo"
		:enabled="storeMeldStudio.connectionEnabled"
		@connect="doConnect"
		@disconnect="doDisconnect"
		@update:enabled="onToggleEnabled"
		@update:error="error = $event"
	>
		<template #header>
			<i18n-t scope="global" tag="span" keypath="meldStudio.header">
				<template #LINK>
					<a href="https://meldStudio.solutions" target="_blank"
						><Icon name="newtab" />Meld Studio</a
					>
				</template>
			</i18n-t>
		</template>

		<template #fields>
			<ParamItem noBackground :paramData="param_ip" v-model="storeMeldStudio.ip" />
			<ParamItem noBackground :paramData="param_port" v-model="storeMeldStudio.port" />
		</template>
	</ConnectionForm>
</template>

<script setup lang="ts">
import { useConnectionForm } from "@/composables/useConnectionForm";
import { storeMeldStudio as useStoreMeldStudio } from "@/store/meldstudio/storeMeldStudio";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import ConnectionForm from "./ConnectionForm.vue";

const { t } = useI18n();
const storeMeldStudio = useStoreMeldStudio();
const { error, showSuccess, doConnect, doDisconnect } = useConnectionForm(
	() => storeMeldStudio.connect(),
	() => storeMeldStudio.disconnect(),
);

const param_ip = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	labelKey: "meldStudio.ip",
	maxLength: 100,
});
const param_port = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 0,
	type: "number",
	labelKey: "meldStudio.port",
	min: 0,
	max: 13376,
});

const canConnect = computed(() => storeMeldStudio.ip.length >= 7);

const connectedInfo = computed(() => [
	{ label: t(param_ip.value.labelKey!), value: storeMeldStudio.ip },
	{ label: t(param_port.value.labelKey!), value: storeMeldStudio.port },
]);

function onToggleEnabled(v: boolean): void {
	storeMeldStudio.connectionEnabled = v;
	storeMeldStudio.saveConfigs();
}
</script>

<style scoped lang="less">
.connectmeldstudio {
}
</style>
