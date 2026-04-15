<template>
	<div class="connecttiktok parameterContent">
		<Icon name="tiktok" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="tiktok.header">
				<template #LINK>
					<a href="https://tiktok.com/" target="_blank"><Icon name="newtab" />TikTok</a>
				</template>
			</i18n-t>
			<div class="card-item secondary infos" v-if="!storeTiktok.connected">
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
					>{{ $t("tiktok.install") }}</TTButton
				>
			</div>
		</div>

		<div class="content">
			<TTButton
				type="submit"
				v-if="!storeTiktok.connected"
				@click="connect()"
				:loading="connecting"
				:disabled="!canConnect"
				>{{ $t("global.connect") }}</TTButton
			>

			<ToggleBlock
				v-if="!storeTiktok.connected"
				:title="$t('global.advanced_params')"
				small
				:open="false"
			>
				<form class="card-item" @submit.prevent="connect()">
					<ParamItem
						noBackground
						:paramData="param_ip"
						v-model="storeTiktok.ip"
						autofocus
					/>
					<ParamItem noBackground :paramData="param_port" v-model="storeTiktok.port" />

					<div class="ctas">
						<TTButton
							type="reset"
							alert
							@click="disconnect()"
							:loading="connecting"
							:disabled="!canConnect"
							>{{ $t("global.clear") }}</TTButton
						>
						<TTButton type="submit" :loading="connecting" :disabled="!canConnect">{{
							$t("global.connect")
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
				<div class="card-item alert error">
					{{ $t("tiktok.connect_error") }}
				</div>
			</BrowserPermissionChecker>

			<template v-if="storeTiktok.connected">
				<div class="card-item primary" v-if="showSuccess">
					{{ $t("connexions.triggerSocket.success") }}
				</div>

				<div class="card-item infos">
					<div>
						<strong>{{ $t(param_ip.labelKey!) }}</strong
						>: {{ storeTiktok.ip }}
					</div>
					<div>
						<strong>{{ $t(param_port.labelKey!) }}</strong
						>: {{ storeTiktok.port }}
					</div>
				</div>

				<TTButton class="connectBt" alert @click="disconnect()">{{
					$t("global.disconnect")
				}}</TTButton>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { storeTiktok as useStoreTiktok } from "@/store/tiktok/storeTiktok";
import ParamItem from "../../ParamItem.vue";
import TTButton from "@/components/TTButton.vue";
import Icon from "@/components/Icon.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import BrowserPermissionChecker from "@/components/BrowserPermissionChecker.vue";

const { t } = useI18n();
const storeTiktok = useStoreTiktok();

const error = ref(false);
const showSuccess = ref(false);
const connecting = ref(false);

const param_ip = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "127.0.0.1",
	type: "string",
	labelKey: "connexions.triggerSocket.ip",
	maxLength: 100,
});
const param_port = ref<TwitchatDataTypes.ParameterData<number>>({
	value: 0,
	type: "number",
	labelKey: "connexions.triggerSocket.port",
	min: 0,
	max: 65535,
});

const canConnect = computed((): boolean => {
	return param_ip.value.value.length >= 7; // && param_port.value.value > 0;
});

async function connect(): Promise<void> {
	connecting.value = true;
	error.value = !(await storeTiktok.connect());
	connecting.value = false;
}

function disconnect(): void {
	storeTiktok.disconnect();
}
</script>

<style scoped lang="less">
.connecttiktok {
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
