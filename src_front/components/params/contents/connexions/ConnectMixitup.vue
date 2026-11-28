<template>
	<ConnectionForm
		icon="mixitup"
		:connected="sMixitup.connected"
		:connecting="connecting"
		:error="error"
		:showSuccess="showSuccess"
		errorMessage="mixitup.connect_error"
		:canConnect="canConnect"
		:connectedInfo="connectedInfo"
		:enabled="sMixitup.connectionEnabled"
		@connect="doConnect"
		@disconnect="doDisconnect"
		@update:enabled="onToggleEnabled"
		@update:error="error = $event"
	>
		<template #header>
			<i18n-t scope="global" tag="span" keypath="mixitup.header">
				<template #LINK>
					<a href="https://mixitupapp.com" target="_blank"
						><Icon name="newtab" />Mix It Up</a
					>
				</template>
			</i18n-t>
		</template>

		<template #info>
			<div class="card-item secondary infos">
				<span>
					<Icon name="info" />
					<span>{{ t("mixitup.instructions") }}</span>
				</span>
				<TTButton
					class="installBt"
					href="https://mixitupapp.com"
					type="link"
					icon="newtab"
					target="_blank"
					light
					secondary
					>{{ t("mixitup.install") }}</TTButton
				>
			</div>
		</template>

		<template #fields>
			<ParamItem noBackground :paramData="param_ip" v-model="sMixitup.ip" />
			<ParamItem noBackground :paramData="param_port" v-model="sMixitup.port" />
		</template>
	</ConnectionForm>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ParamItem from "../../ParamItem.vue";
import TTButton from "@/components/TTButton.vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { storeMixitup as useStoreMixitup } from "@/store/mixitup/storeMixitup";
import { useConnectionForm } from "@/composables/useConnectionForm";
import ConnectionForm from "./ConnectionForm.vue";
import { ref } from "vue";

const { t } = useI18n();
const sMixitup = useStoreMixitup();
const { connecting, error, showSuccess, doConnect, doDisconnect } = useConnectionForm(
	() => sMixitup.connect(),
	() => sMixitup.disconnect(),
);

const param_ip = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	labelKey: "mixitup.ip",
	maxLength: 100,
});
const param_port = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 0,
	type: "number",
	labelKey: "mixitup.port",
	min: 0,
	max: 65535,
});

const canConnect = computed(() => sMixitup.ip.length >= 7);

const connectedInfo = computed(() => [
	{ label: t(param_ip.value.labelKey!), value: sMixitup.ip },
	{ label: t(param_port.value.labelKey!), value: sMixitup.port },
]);

function onToggleEnabled(v: boolean): void {
	sMixitup.connectionEnabled = v;
	sMixitup.saveConfigs();
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
