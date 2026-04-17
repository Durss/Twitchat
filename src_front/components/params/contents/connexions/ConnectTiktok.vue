<template>
	<ConnectionForm
		icon="tiktok"
		:connected="storeTiktok.connected"
		:connecting="connecting"
		:error="error"
		:showSuccess="showSuccess"
		errorMessage="tiktok.connect_error"
		:canConnect="canConnect"
		:connectedInfo="connectedInfo"
		:enabled="storeTiktok.connectionEnabled"
		@connect="doConnect"
		@disconnect="doDisconnect"
		@update:enabled="onToggleEnabled"
		@update:error="error = $event"
	>
		<template #header>
			<i18n-t scope="global" tag="span" keypath="tiktok.header">
				<template #LINK>
					<a href="https://tiktok.com/" target="_blank"><Icon name="newtab" />TikTok</a>
				</template>
			</i18n-t>
		</template>

		<template #info>
			<div class="card-item secondary infos">
				<span>
					<Icon name="info" />
					<i18n-t scope="global" keypath="tiktok.requirement">
						<template #LINK>
							<a href="https://tikfinity.zerody.one/app/" target="_blank"
								><Icon name="newtab" />TikFinity</a
							>
						</template>
					</i18n-t>
				</span>
				<TTButton
					class="installBt"
					href="https://tikfinity.zerody.one/app"
					type="link"
					icon="newtab"
					target="_blank"
					light
					secondary
					>{{ t("tiktok.install") }}</TTButton
				>
			</div>
		</template>

		<template #fields>
			<ParamItem noBackground :paramData="param_ip" v-model="storeTiktok.ip" />
			<ParamItem noBackground :paramData="param_port" v-model="storeTiktok.port" />
		</template>
	</ConnectionForm>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ParamItem from "../../ParamItem.vue";
import TTButton from "@/components/TTButton.vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { storeTiktok as useStoreTiktok } from "@/store/tiktok/storeTiktok";
import { useConnectionForm } from "@/composables/useConnectionForm";
import ConnectionForm from "./ConnectionForm.vue";

const { t } = useI18n();
const storeTiktok = useStoreTiktok();
const { connecting, error, showSuccess, doConnect, doDisconnect } = useConnectionForm(
	() => storeTiktok.connect(),
	() => storeTiktok.disconnect(),
);

const param_ip: TwitchatDataTypes.ParameterData<string> = {
	value: "127.0.0.1",
	type: "string",
	labelKey: "connexions.ip",
	maxLength: 100,
};
const param_port: TwitchatDataTypes.ParameterData<number> = {
	value: 0,
	type: "number",
	labelKey: "connexions.port",
	min: 0,
	max: 65535,
};

const canConnect = computed(() => storeTiktok.ip.length >= 7);

const connectedInfo = computed(() => [
	{ label: t(param_ip.labelKey!), value: storeTiktok.ip },
	{ label: t(param_port.labelKey!), value: storeTiktok.port },
]);

function onToggleEnabled(v: boolean): void {
	storeTiktok.connectionEnabled = v;
	storeTiktok.saveConfigs();
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
