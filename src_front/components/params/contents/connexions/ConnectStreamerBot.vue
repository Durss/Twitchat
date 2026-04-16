<template>
	<div class="connectstreamerbot parameterContent">
		<Icon name="streamerbot" alt="streamerbot icon" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="streamerbot.header">
				<template #LINK>
					<a href="https://streamer.bot/" target="_blank"
						><Icon name="newtab" />Streamer.bot</a
					>
				</template>
			</i18n-t>
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
		</div>

		<div class="content">
			<TTButton
				type="submit"
				v-if="!sStreamerbot.connected"
				@click="connect()"
				:loading="connecting"
				:disabled="!canConnect"
				>{{ t("global.connect") }}</TTButton
			>

			<ToggleBlock
				v-if="!sStreamerbot.connected"
				:title="t('global.advanced_params')"
				small
				:open="false"
			>
				<form class="card-item" @submit.prevent="connect()">
					<ParamItem
						noBackground
						:paramData="param_ip"
						v-model="sStreamerbot.ip"
						autofocus
					/>
					<ParamItem noBackground :paramData="param_port" v-model="sStreamerbot.port" />
					<ParamItem
						noBackground
						:paramData="param_pass"
						v-model="sStreamerbot.password"
					/>

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
				{{ t("streamerbot.connect_error") }}
			</BrowserPermissionChecker>

			<template v-if="sStreamerbot.connected">
				<div class="card-item primary" v-if="showSuccess">
					{{ t("connexions.triggerSocket.success") }}
				</div>

				<div class="card-item infos">
					<div>
						<strong>{{ t(param_ip.labelKey!) }}</strong
						>: {{ sStreamerbot.ip }}
					</div>
					<div>
						<strong>{{ t(param_port.labelKey!) }}</strong
						>: {{ sStreamerbot.port }}
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
import { storeStreamerbot as useStoreStreamerbot } from "@/store/streamerbot/storeStreamerbot";
import BrowserPermissionChecker from "@/components/BrowserPermissionChecker.vue";

const { t } = useI18n();
const sStreamerbot = useStoreStreamerbot();

const error = ref(false);
const showSuccess = ref(false);
const connecting = ref(false);

const param_ip = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	labelKey: "streamerbot.ip",
	maxLength: 100,
});
const param_port = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 0,
	type: "number",
	labelKey: "streamerbot.port",
	min: 0,
	max: 65535,
});
const param_pass = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	labelKey: "streamerbot.pass",
	maxLength: 100,
	isPrivate: true,
});

const canConnect = computed<boolean>(() => {
	return param_ip.value.value.length >= 7; // && param_port.value.value > 0;
});

onBeforeMount(() => {
	param_ip.value.value = sStreamerbot.ip;
});

async function connect(): Promise<void> {
	error.value = false;
	connecting.value = true;
	const res = await sStreamerbot.connect();
	error.value = !res;
	connecting.value = false;
}

function disconnect(): void {
	sStreamerbot.disconnect();
}
</script>

<style scoped lang="less">
.connectstreamerbot {
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
