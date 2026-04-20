<template>
	<ConnectionForm
		icon="elgato"
		:connected="connected"
		:connecting="connecting"
		:error="error"
		:showSuccess="showSuccess"
		:errorMessage="errorMessage ? `streamdeck.error_messages.${errorMessage}` : ''"
		:canConnect="!!param_secretKey.value"
		:connectedInfo="[]"
		:enabled="enabled"
		:localNetwork="true"
		@connect="doConnect"
		@disconnect="doDisconnect"
		@update:enabled="onToggleEnabled"
		@update:error="
			if (!$event) {
				error = false;
				errorMessage = '';
			}
		"
	>
		<template #header>{{ t("streamdeck.header") }}</template>

		<template #info>
			<TTButton
				icon="elgato"
				href="https://apps.elgato.com/plugins/fr.twitchat"
				target="_blank"
				type="link"
				class="elgatoBt"
				>{{ t("streamdeck.download_bt") }}</TTButton
			>
		</template>

		<template #mandatoryFields>
			<ParamItem :paramData="param_secretKey" v-model="param_secretKey.value" noBackground />
			<ToggleBlock
				class="secretKeyDetails"
				:title="t('streamdeck.connect_form.findSecretKey')"
				small
				noTitleColor
				:open="false"
			>
				<span class="info">{{ t("streamdeck.connect_form.findSecretKey_details") }}</span>
				<img src="@/assets/img/streamdeck_credentials.png" />
			</ToggleBlock>
		</template>

		<template #fields>
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
						<div class="logoList">
							<img class="logo" src="@/assets/icons/logo-chrome.svg" /><img
								class="logo"
								src="@/assets/icons/logo-vivaldi.svg"
							/><img class="logo" src="@/assets/icons/logo-edge.svg" /><img
								class="logo"
								src="@/assets/icons/logo-brave.svg"
							/>
						</div>
						—
						<span
							v-html="t('streamdeck.connect_form.chromium', { IP: param_ip.value })"
						></span>
					</li>
					<li>
						<img class="logo" src="@/assets/icons/logo-firefox.svg" /> —
						<span
							v-html="t('streamdeck.connect_form.firefox', { IP: param_ip.value })"
						></span>
					</li>
					<li>
						<img class="logo" src="@/assets/icons/logo-opera.svg" /> —
						<span
							v-html="t('streamdeck.connect_form.opera', { IP: param_ip.value })"
						></span>
					</li>
					<li>
						<img class="logo" src="@/assets/icons/logo-safari.svg" /> —
						<span
							v-html="t('streamdeck.connect_form.safari', { IP: param_ip.value })"
						></span>
					</li>
				</ul>
			</div>
		</template>
	</ConnectionForm>
</template>

<script setup lang="ts">
import ToggleBlock from "@/components/ToggleBlock.vue";
import TTButton from "@/components/TTButton.vue";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import StreamdeckSocket from "@/utils/StreamdeckSocket";
import Utils from "@/utils/Utils";
import { onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";
import ConnectionForm from "./ConnectionForm.vue";

const { t } = useI18n();

const enabled = ref(false);
const error = ref(false);
const errorMessage = ref("");
const connecting = ref(false);
const showSuccess = ref(false);
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
	isPrivate: true,
});

const connected = StreamdeckSocket.instance.connected;

onBeforeMount(() => {
	param_ip.value.value = StreamdeckSocket.instance.ip;
	param_secretKey.value.value = StreamdeckSocket.instance.secretKey;
	enabled.value = StreamdeckSocket.instance.enabled == true;
	onIpChange();
});

async function doConnect(): Promise<void> {
	error.value = false;
	errorMessage.value = "";
	connecting.value = true;
	await Utils.promisedTimeout(250);
	try {
		const res = await StreamdeckSocket.instance.connect(
			param_secretKey.value.value,
			param_ip.value.value,
			false,
		);
		if (!res) {
			errorMessage.value = "UNKNOWN_ERROR";
			error.value = true;
		} else {
			showSuccess.value = true;
			window.setTimeout(() => {
				showSuccess.value = false;
			}, 3000);
		}
	} catch (reason) {
		error.value = true;
		errorMessage.value = reason as string;
	}
	connecting.value = false;
}

function doDisconnect(): void {
	StreamdeckSocket.instance.disconnect();
	showSuccess.value = false;
	error.value = false;
	errorMessage.value = "";
}

function onIpChange(): void {
	securityWarning.value =
		param_ip.value.value.trim() != "127.0.0.1" && param_ip.value.value.trim() != "localhost";
}

function onToggleEnabled(v: boolean): void {
	StreamdeckSocket.instance.enabled = v;
}

defineExpose({ onNavigateBack: () => false });
</script>

<style scoped lang="less">
.connectionForm {
	.security {
		white-space: pre-line;
		line-height: 1.25em;

		h2 {
			margin-bottom: 1em;

			.icon {
				height: 1em;
				margin-right: 0.5em;
			}
		}

		ul {
			list-style: none;
			padding: 0;
			display: flex;
			flex-direction: column;
			gap: 0.5em;

			li {
				display: flex;
				align-items: center;
				gap: 0.5em;
				.logoList {
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 0.25em;
					flex-wrap: wrap;
					max-width: calc(3em + 0.3em);
				}
			}
		}

		.logo {
			height: 1.5em;
			vertical-align: middle;
			filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.7));
		}
	}
}
</style>
