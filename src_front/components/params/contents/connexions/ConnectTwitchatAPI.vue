<template>
	<div class="connecttwitchatapi parameterContent">
		<Icon name="twitchat" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="api.header">
				<template #LINK>
					<a :href="url" target="_blank"
						><Icon name="newtab" />{{ t("api.header_link") }}</a
					>
				</template>
			</i18n-t>
		</div>

		<template v-if="!storeAuth.isPremium">
			<TTButton class="premiumBt" icon="premium" @click="openPremium()" premium big>{{
				$t("premium.become_premiumBt")
			}}</TTButton>
		</template>

		<section v-else class="card-item form">
			<template v-if="privateKey">
				<div class="warning">
					<Icon name="alert" />
					<strong>{{ t("api.key_warning") }}</strong>
				</div>
				<div class="warning">
					<Icon name="info" />
					<span>{{ t("api.key_info") }}</span>
				</div>
				<div class="keyHolder">
					<Icon name="key" />
					<span>{{ t("api.param_key") }}</span>
					<div
						class="inputField"
						:class="{ censor }"
						@click="censor = false"
						v-tooltip="t('api.click_reveal')"
					>
						<input
							type="text"
							:value="censor ? '' : privateKey"
							name="apiKey"
							readonly
						/>
						<Icon v-if="censor" class="censorIcon" name="spoiler" />
					</div>
					<TTButton
						class="copyBt"
						icon="copy"
						:copy="privateKey"
						v-tooltip="t('global.copy')"
						transparent
					/>
				</div>
			</template>

			<div class="actions">
				<TTButton
					v-if="!storeApi.connected"
					icon="refresh"
					:loading="loading"
					@click="generateKey()"
					>{{ t("api.generate_key") }}</TTButton
				>

				<TTButton
					v-else
					icon="cross"
					alert
					:loading="deleting"
					@click="revokeKey()"
					v-tooltip="t('api.revoke_key_tt')"
					>{{ t("api.revoke_key") }}</TTButton
				>
			</div>

			<div v-if="error" class="errorMessage">{{ error }}</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeAPI as useStoreAPI } from "@/store/api/storeAPI";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const storeParams = useStoreParams();
const storeAuth = useStoreAuth();
const storeApi = useStoreAPI();
const censor = ref(true);
const loading = ref(false);
const deleting = ref(false);
const error = ref("");
const privateKey = ref("");

const gitBranch = Config.instance.BETA_MODE ? "v17" : "main";
const url = `https://github.com/Durss/Twitchat/blob/${gitBranch}/PUBLIC_API.md#actions-you-can-perform`;

function openPremium() {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

async function generateKey() {
	loading.value = true;
	error.value = "";
	censor.value = true;
	const result = await storeApi.generateKey();
	if (result !== false) {
		privateKey.value = result;
	} else {
		error.value = t("api.generate_error");
	}
	loading.value = false;
}

async function revokeKey() {
	deleting.value = true;
	error.value = "";
	const success = await storeApi.deleteKey();
	if (success) {
		privateKey.value = "";
	} else {
		error.value = t("api.revoke_error");
	}
	deleting.value = false;
}
</script>

<style scoped lang="less">
.connecttwitchatapi {
	.form {
		margin: auto;
		gap: 1em;
		display: flex;
		flex-direction: column;
	}

	.warning {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5em;
		white-space: pre-line;
		line-height: 1.25em;

		.icon {
			max-width: 1.5em;
			height: 1.5em;
			flex-shrink: 0;
		}
	}

	.connected {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5em;
		color: var(--color-secondary);

		.icon {
			max-width: 1em;
			height: 1em;
		}
	}

	.actions {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
	}

	.errorMessage {
		color: var(--color-alert);
		text-align: center;
	}

	.keyHolder {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		margin: auto;

		.icon {
			max-width: 1em;
			height: 1em;
		}

		.copyBt {
			height: auto;
			margin-left: -2.25em;
		}
		.inputField {
			position: relative;

			input {
				padding-right: 1.75em;
			}

			.censorIcon {
				position: absolute;
				right: 0.25em;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				pointer-events: none;
			}

			&.censor {
				input {
					cursor: pointer;
					@c1: var(--grayout-fadest);
					@c2: transparent;
					background-image: repeating-linear-gradient(
						-45deg,
						@c1,
						@c1 10px,
						@c2 10px,
						@c2 20px
					);
				}
			}
		}
	}
}
</style>
