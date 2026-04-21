<template>
	<div class="goxlrconnectform">
		<TTButton
			type="submit"
			v-if="!connected"
			@click="connect()"
			:loading="connecting"
			icon="online"
			>{{ t("global.connect") }}</TTButton
		>

		<ToggleBlock v-if="!connected" :title="t('global.advanced_params')" small :open="false">
			<form class="card-item" @submit.prevent="connect()">
				<ParamItem
					:paramData="param_ip"
					v-model="param_ip.value"
					@change="onIpChange()"
					noBackground
				/>

				<i18n-t
					scope="global"
					class="card-item secondary security"
					tag="div"
					v-if="securityWarning"
					keypath="goxlr.connect_form.ip_security"
				>
					<template #LINK>
						<a :href="Config.instance.DISCORD_URL" target="_blank">{{
							t("goxlr.connect_form.ip_security_link")
						}}</a>
					</template>
				</i18n-t>

				<ParamItem :paramData="param_port" v-model="param_port.value" noBackground />
			</form>
		</ToggleBlock>

		<BrowserPermissionChecker
			v-if="error"
			@click="error = false"
			class="card-item alert error"
			:errorMessage="t('error.local_network_access_denied')"
			:permissionName="'local-network-access'"
		>
			{{ t("goxlr.connect_failed") }}
		</BrowserPermissionChecker>

		<template v-else-if="connected">
			<TTButton
				class="disconnectBt"
				type="button"
				@click="disconnect()"
				alert
				icon="offline"
				>{{ t("global.disconnect") }}</TTButton
			>
		</template>
	</div>
</template>

<script setup lang="ts">
import ToggleBlock from "@/components/ToggleBlock.vue";
import TTButton from "@/components/TTButton.vue";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import GoXLRSocket from "@/utils/goxlr/GoXLRSocket";
import Config from "@/utils/Config";
import { ref, computed, onBeforeMount } from "vue";
import { useI18n } from "vue-i18n";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import ParamItem from "../../ParamItem.vue";
import BrowserPermissionChecker from "@/components/BrowserPermissionChecker.vue";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();

const error = ref<boolean>(false);
const opened = ref<boolean>(true);
const fxEnabled = ref<boolean>(false);
const connecting = ref<boolean>(false);
const securityWarning = ref<boolean>(false);
const selectedPresetIndex = ref<number>(0);
const param_ip = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "127.0.0.1",
	label: "IP",
});
const param_port = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 14564,
	label: "Port",
});

const connected = computed((): boolean => {
	return GoXLRSocket.instance.connected.value;
});

async function connect(): Promise<void> {
	error.value = false;
	connecting.value = true;
	try {
		let res = await GoXLRSocket.instance
			.connect(param_ip.value.value, param_port.value.value)
			.catch(() => {
				if (!storeAuth.isPremium) {
					storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
				}
			});
		if (!res) error.value = true;
	} catch (err) {
		console.log(err);
		error.value = true;
	}
	const state = GoXLRSocket.instance.status.value;
	if (state) {
		fxEnabled.value = state.effects.is_enabled;
		selectedPresetIndex.value = parseInt(state.effects.active_preset.replace(/\D/gi, ""));
	}
	connecting.value = false;
}

onBeforeMount(() => {
	opened.value = !connected.value;
});

function disconnect(): void {
	connecting.value = false;
	GoXLRSocket.instance.disconnect();
}

function onIpChange(): void {
	securityWarning.value =
		param_ip.value.value.trim() != "127.0.0.1" && param_ip.value.value.trim() != "localhost";
}
</script>

<style scoped lang="less">
.goxlrconnectform {
	// width: 100%;
	max-width: 500px;
	align-self: center;
	gap: 1em;
	display: flex;
	flex-direction: column;
	align-items: center;

	.disconnectBt {
		margin: auto;
		display: flex;
	}

	form {
		margin: auto;
		width: fit-content;
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		:deep(.inputHolder),
		:deep(input) {
			flex-basis: 150px !important;
			flex-grow: unset;
		}

		.security {
			white-space: pre-line;
		}
	}
	.error {
		cursor: pointer;
	}
}
</style>
