<template>
	<div class="connectlumia parameterContent">
		<Icon name="lumia" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="lumia.header">
				<template #LINK>
					<a href="https://lumiastream.com/" target="_blank"
						><Icon name="newtab" />Lumia Stream</a
					>
				</template>
			</i18n-t>
		</div>

		<section v-if="!storeAuth.isPremium">
			<TTButton icon="premium" @click="openPremium()" premium big>{{
				t("premium.become_premiumBt")
			}}</TTButton>
		</section>

		<form class="card-item" @submit.prevent="onConnect()" v-else-if="!storeLumia.connected">
			<ParamItem class="param" :paramData="param_token" noBackground v-model="token" />
			<div class="hint">({{ t("lumia.param_token_help") }})</div>
			<TTButton
				type="submit"
				icon="offline"
				:disabled="token.length < 10"
				:loading="loading"
				>{{ t("global.connect") }}</TTButton
			>
		</form>

		<div v-else>
			<TTButton alert @click="disconnect()" :loading="loading">{{
				t("global.disconnect")
			}}</TTButton>
		</div>

		<BrowserPermissionChecker
			v-if="error"
			@click="error = false"
			class="card-item alert error"
			:errorMessage="t('error.local_network_access_denied')"
			:permissionName="'local-network-access'"
		>
			{{ t("error.lumia_connect_failed") }}
		</BrowserPermissionChecker>

		<section class="card-item infos">
			<i18n-t scope="global" tag="p" keypath="lumia.info">
				<template #TRIGGERS>
					<a @click.prevent="openTriggers()">{{ t("params.categories.triggers") }}</a>
				</template>
			</i18n-t>
		</section>
	</div>
</template>

<script setup lang="ts">
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { ref } from "vue";
import ParamItem from "../../ParamItem.vue";
import TTButton from "@/components/TTButton.vue";
import BrowserPermissionChecker from "@/components/BrowserPermissionChecker.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeLumia as useStoreLumia } from "@/store/lumia/storeLumia";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeLumia = useStoreLumia();
const storeParams = useStoreParams();

const token = ref<string>("");
const error = ref<boolean>(false);
const loading = ref<boolean>(false);
const param_token = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 40,
	labelKey: "lumia.param_token",
});

/**
 * Attempt to connect to Lumia's socket
 */
async function onConnect(): Promise<void> {
	loading.value = true;
	try {
		await storeLumia.connect(token.value);
	} catch (e) {}
	error.value = !storeLumia.connected;
	loading.value = false;
}

/**
 * Opens the premium param page
 */
function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

/**
 * Opens the triggers page
 */
async function openTriggers(): Promise<void> {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
}

/**
 * Disconnects from Lumia Stream
 */
async function disconnect(): Promise<void> {
	storeLumia.disconnect();
}
</script>

<style scoped lang="less">
.connectlumia {
	align-items: center;

	form {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.param {
			:deep(.holder) {
				flex-direction: column;
			}
			:deep(.inputHolder) {
				width: 100%;
			}
		}
		.hint {
			font-size: 0.9em;
			font-style: italic;
		}
	}

	.error {
		margin: auto;
		cursor: pointer;
		white-space: pre-line;
		text-align: center;
		line-height: 1.25em;
	}

	.infos {
		max-width: 400px;
		line-height: 1.25em;
		text-align: center;
	}
}
</style>
