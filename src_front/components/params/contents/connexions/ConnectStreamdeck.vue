<template>
	<div class="paramsstreamdeck parameterContent">
		<Icon name="elgato" alt="stream deck logo" class="icon" />

		<p class="head">{{ t("streamdeck.header") }}</p>

		<section>
			<TTButton
				icon="elgato"
				href="https://apps.elgato.com/plugins/fr.twitchat"
				target="_blank"
				type="link"
				class="button elgatoBt"
				>{{ t("streamdeck.download_bt") }}</TTButton
			>
		</section>

		<section v-if="connected">
			<div class="connected card-item primary">
				<icon name="checkmark" />{{ t("streamdeck.connected") }}
			</div>
			<TTButton icon="offline" alert @click="disconnect()">{{
				t("global.disconnect")
			}}</TTButton>
		</section>

		<section v-else>
			<form @submit.prevent="connect()">
				<div class="card-item secretKeyHolder">
					<ParamItem
						:paramData="param_secretKey"
						v-model="param_secretKey.value"
						noBackground
					/>
					<ToggleBlock
						class="secretKeyDetails"
						:title="t('streamdeck.connect_form.findSecretKey')"
						small
						noTitleColor
						:open="false"
					>
						<span class="info">{{
							t("streamdeck.connect_form.findSecretKey_details")
						}}</span>
						<img src="@/assets/img/streamdeck_credentials.png" />
					</ToggleBlock>
				</div>

				<TTButton
					type="submit"
					icon="online"
					:loading="connecting"
					:disabled="!param_secretKey.value"
					>{{ t("global.connect") }}</TTButton
				>

				<BrowserPermissionChecker
					v-if="error"
					@click="error = false"
					class="card-item alert error"
					:errorMessage="t('error.local_network_access_denied')"
					:permissionName="'local-network-access'"
				>
					{{ $t(`streamdeck.error_messages.${error}`) }}
				</BrowserPermissionChecker>

				<ToggleBlock :title="t('global.advanced_params')" small :open="false">
					<ParamItem
						:paramData="param_ip"
						v-model="param_ip.value"
						@change="onIpChange()"
						noBackground
					/>

					<div v-if="securityWarning" class="card-item secondary security">
						<h2>
							<icon name="info" />
							<i18n-t scope="global" keypath="streamdeck.connect_form.info">
								<template #URL
									><a :href="`https://${param_ip.value}:30386`" target="_blank"
										>https://{{ param_ip.value }}:30386</a
									></template
								>
							</i18n-t>
						</h2>
						<ul>
							<li>
								<img class="logo" src="@/assets/icons/logo-chrome.svg" /><img
									class="logo"
									src="@/assets/icons/logo-vivaldi.svg"
								/><img class="logo" src="@/assets/icons/logo-edge.svg" /><img
									class="logo"
									src="@/assets/icons/logo-brave.svg"
								/>
								—
								<span
									v-html="
										t('streamdeck.connect_form.chromium', {
											IP: param_ip.value,
										})
									"
								></span>
							</li>
							<li>
								<img class="logo" src="@/assets/icons/logo-firefox.svg" /> —
								<span
									v-html="
										t('streamdeck.connect_form.firefox', {
											IP: param_ip.value,
										})
									"
								></span>
							</li>
							<li>
								<img class="logo" src="@/assets/icons/logo-opera.svg" /> —
								<span
									v-html="
										t('streamdeck.connect_form.opera', { IP: param_ip.value })
									"
								></span>
							</li>
							<li>
								<img class="logo" src="@/assets/icons/logo-safari.svg" /> —
								<span
									v-html="
										t('streamdeck.connect_form.safari', { IP: param_ip.value })
									"
								></span>
							</li>
						</ul>
					</div>
				</ToggleBlock>
			</form>
		</section>
	</div>
</template>

<script setup lang="ts">
import ToggleBlock from "@/components/ToggleBlock.vue";
import TTButton from "@/components/TTButton.vue";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import StreamdeckSocket from "@/utils/StreamdeckSocket";
import ParamItem from "../../ParamItem.vue";
import Utils from "@/utils/Utils";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import BrowserPermissionChecker from "@/components/BrowserPermissionChecker.vue";

const { t } = useI18n();

const error = ref(false);
const errorMessage = ref("");
const connecting = ref(false);
const securityWarning = ref(false);
const param_ip = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "127.0.0.1",
	label: "IP",
});
const param_secretKey = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	labelKey: "global.key",
	icon: "key",
	longText: false,
});

const connected = computed<boolean>(() => {
	return StreamdeckSocket.instance.connected.value;
});

function onNavigateBack(): boolean {
	return false;
}

onMounted(() => {
	param_ip.value.value = StreamdeckSocket.instance.ip;
	param_secretKey.value.value = StreamdeckSocket.instance.secretKey;
	onIpChange();
});

async function connect(): Promise<void> {
	errorMessage.value = "";
	error.value = false;
	connecting.value = true;
	await Utils.promisedTimeout(250);
	StreamdeckSocket.instance
		.connect(param_secretKey.value.value, param_ip.value.value)
		.then((res) => {
			console.log(res);
			if (!res) {
				errorMessage.value = "UNKNOWN_ERROR";
				error.value = true;
			} else errorMessage.value = "";
		})
		.catch((reason) => {
			errorMessage.value = reason;
			error.value = true;
		})
		.finally(() => {
			connecting.value = false;
		});
}

function disconnect(): void {
	StreamdeckSocket.instance.disconnect();
}

function onIpChange(): void {
	securityWarning.value =
		param_ip.value.value.trim() != "127.0.0.1" && param_ip.value.value.trim() != "localhost";
}

defineExpose({ onNavigateBack });
</script>

<style scoped lang="less">
.paramsstreamdeck {
	.connected {
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		margin: auto;
		.icon {
			height: 1em;
		}
	}

	form {
		margin: auto;
		width: fit-content;
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		:deep(.inputHolder),
		:deep(input) {
			flex-basis: 150px !important;
			flex-grow: unset;
		}

		.security {
			white-space: pre-line;
			line-height: 1.25em;

			.head {
				margin-bottom: 1em;
			}

			.logo {
				height: 1.5em;
				margin-right: 0.25em;
				vertical-align: middle;
				filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.7));
			}

			.icon {
				height: 1em;
				margin-right: 0.5em;
			}
		}
	}

	.loader {
		margin: auto;
		height: 1.75em;
	}

	.error {
		cursor: pointer;
		margin: auto;
	}

	ul {
		list-style: disc;
		list-style-position: inside;
		padding-left: 1em;
		margin-top: 1em;
		li:not(:last-child) {
			margin-bottom: 0.5em;
		}
		::v-deep(mark) {
			padding: 0;
			font-weight: normal;
		}
	}

	.secretKeyHolder {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		.secretKeyDetails {
			width: fit-content;
			max-width: 400px;
			align-self: center;

			.info {
				font-size: 0.8em;
			}
		}
	}
}
</style>
