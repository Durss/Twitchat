<template>
	<div class="connectmixitup parameterContent">
		<Icon name="mixitup" alt="mixitup icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="mixitup.header">
				<template #LINK>
					<a href="https://mixitupapp.com" target="_blank"
						><Icon name="newtab" />Mix It Up</a
					>
				</template>
			</i18n-t>
			<div class="card-item secondary infos" v-if="!sMixitup.connected">
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
		</div>

		<div class="content">
			<TTButton
				type="submit"
				v-if="!sMixitup.connected"
				@click="connect()"
				:loading="connecting"
				:disabled="!canConnect"
				>{{ t("global.connect") }}</TTButton
			>

			<ToggleBlock
				v-if="!sMixitup.connected"
				:title="t('global.advanced_params')"
				small
				:open="false"
			>
				<form class="card-item" @submit.prevent="connect()">
					<ParamItem noBackground :paramData="param_ip" v-model="sMixitup.ip" autofocus />
					<ParamItem noBackground :paramData="param_port" v-model="sMixitup.port" />

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
				{{ t("mixitup.connect_error") }}
			</BrowserPermissionChecker>

			<template v-if="sMixitup.connected">
				<div class="card-item primary" v-if="showSuccess">
					{{ t("connexions.triggerSocket.success") }}
				</div>

				<div class="card-item infos">
					<div>
						<strong>{{ t(param_ip.labelKey!) }}</strong
						>: {{ sMixitup.ip }}
					</div>
					<div>
						<strong>{{ t(param_port.labelKey!) }}</strong
						>: {{ sMixitup.port }}
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
import { storeMixitup as useStoreMixitup } from "@/store/mixitup/storeMixitup";
import BrowserPermissionChecker from "@/components/BrowserPermissionChecker.vue";

const { t } = useI18n();
const sMixitup = useStoreMixitup();

const error = ref(false);
const showSuccess = ref(false);
const connecting = ref(false);

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

const canConnect = computed<boolean>(() => {
	return param_ip.value.value.length >= 7; // && param_port.value.value > 0;
});

onBeforeMount(() => {
	param_ip.value.value = sMixitup.ip;
});

async function connect(): Promise<void> {
	error.value = false;
	connecting.value = true;
	const res = await sMixitup.connect();
	error.value = !res;
	connecting.value = false;
}

function disconnect(): void {
	sMixitup.disconnect();
}
</script>

<style scoped lang="less">
.connectmixitup {
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
