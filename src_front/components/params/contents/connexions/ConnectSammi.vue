<template>
	<div class="connectsammi parameterContent">
		<Icon name="sammi" alt="sammi icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="sammi.header">
				<template #LINK>
					<a href="https://sammi.solutions" target="_blank"
						><Icon name="newtab" />SAMMI</a
					>
				</template>
			</i18n-t>
			<div class="card-item secondary infos" v-if="!sSammi.connected">
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
		</div>

		<div class="content">
			<TTButton
				type="submit"
				v-if="!sSammi.connected"
				@click="connect()"
				:loading="connecting"
				:disabled="!canConnect"
				>{{ t("global.connect") }}</TTButton
			>

			<ToggleBlock
				v-if="!sSammi.connected"
				:title="t('global.advanced_params')"
				small
				:open="false"
			>
				<form class="card-item" @submit.prevent="connect()">
					<ParamItem noBackground :paramData="param_ip" v-model="sSammi.ip" autofocus />
					<ParamItem noBackground :paramData="param_port" v-model="sSammi.port" />
					<ParamItem noBackground :paramData="param_pass" v-model="sSammi.password" />

					<div class="ctas">
						<TTButton
							type="reset"
							alert
							@click="disconnect()"
							:loading="connecting"
							:disabled="!canConnect"
							>{{ t("global.clear") }}</TTButton
						>
						<TTButton type="submit" :loading="connecting" :disabled="!canConnect">{{
							t("global.connect")
						}}</TTButton>
					</div>
				</form>
			</ToggleBlock>

			<BrowserPermissionChecker
				v-if="error"
				@click="error = false"
				class="card-item alert error"
				:errorMessage="t('error.local_network_access_denied')"
				:permissionName="'local-network-access'"
			>
				{{ t("sammi.connect_error") }}
			</BrowserPermissionChecker>

			<template v-if="sSammi.connected">
				<div class="card-item primary" v-if="showSuccess">
					{{ t("connexions.triggerSocket.success") }}
				</div>

				<div class="card-item infos">
					<div>
						<strong>{{ t(param_ip.labelKey!) }}</strong
						>: {{ sSammi.ip }}
					</div>
					<div>
						<strong>{{ t(param_port.labelKey!) }}</strong
						>: {{ sSammi.port }}
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
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ParamItem from "../../ParamItem.vue";
import TTButton from "@/components/TTButton.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import { computed, onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";
import { storeSammi as useStoreSammi } from "@/store/sammi/storeSammi";
import BrowserPermissionChecker from "@/components/BrowserPermissionChecker.vue";

const { t } = useI18n();
const sSammi = useStoreSammi();

const error = ref(false);
const showSuccess = ref(false);
const connecting = ref(false);

const param_ip = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	labelKey: "sammi.ip",
	maxLength: 100,
});
const param_port = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 0,
	type: "number",
	labelKey: "sammi.port",
	min: 0,
	max: 65535,
});
const param_pass = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	labelKey: "sammi.pass",
	maxLength: 100,
	isPrivate: true,
});

const canConnect = computed<boolean>(() => {
	return param_ip.value.value.length >= 7; // && param_port.value.value > 0;
});

onBeforeMount(() => {
	param_ip.value.value = sSammi.ip;
});

async function connect(): Promise<void> {
	error.value = false;
	connecting.value = true;
	const res = await sSammi.connect();
	error.value = !res;
	connecting.value = false;
}

function disconnect(): void {
	sSammi.disconnect();
}
</script>

<style scoped lang="less">
.connectsammi {
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

		.error {
			cursor: pointer;
			white-space: pre-line;
			text-align: center;
		}
	}

	.infos {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>
