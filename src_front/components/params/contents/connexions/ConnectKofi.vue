<template>
	<div class="connectkofi parameterContent">
		<Icon name="kofi" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="kofi.header">
				<template #LINK>
					<a href="https://ko-fi.com/" target="_blank"><Icon name="newtab" />Ko-fi</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!storeAuth.isPremium">
			<TTButton icon="premium" @click="openPremium()" premium big>{{
				t("premium.become_premiumBt")
			}}</TTButton>
		</section>

		<template v-else-if="!storeKofi.connected">
			<ol>
				<li class="card-item">
					<span class="index">1.</span>
					<a href="https://ko-fi.com/manage/webhooks" target="_blank">{{
						t("kofi.open_dashboard")
					}}</a>
				</li>

				<li class="card-item">
					<span class="index">2.</span>
					<span>{{ t("kofi.set_url") }}</span>
					<input type="text" :value="webhookURL" v-click2Select readonly />
				</li>

				<li class="card-item">
					<span class="index">3.</span>
					<span>{{ t("kofi.find_key") }}</span>
				</li>

				<li class="card-item">
					<span class="index">4.</span>
					<span>{{ t("kofi.set_token") }}</span>
					<input type="text" v-model="token" />
				</li>

				<li class="card-item">
					<span class="index">5.</span>
					<TTButton
						icon="kofi"
						@click="connect()"
						:disabled="token.length < 36"
						:loading="loading"
						>{{ t("global.connect") }}</TTButton
					>
				</li>
			</ol>

			<div class="card-item alert error" v-if="error" @click="error = ''">{{ error }}</div>
		</template>

		<section class="connected" v-else>
			<TTButton alert @click="disconnect()" :loading="loading">{{
				t("global.disconnect")
			}}</TTButton>

			<ToggleBlock
				:title="t('global.advanced_params')"
				class="advancedParams"
				small
				:open="false"
			>
				<div @submit.prevent="" class="additionalWebhooks">
					<div>{{ t("kofi.advanced_params_header") }}</div>
					<div
						v-for="(wh, index) in storeKofi.webhooks"
						:class="['entry', { disabled: !wh.enabled }]"
						:key="index"
					>
						<div class="form">
							<input
								type="text"
								@blur="storeKofi.saveConfigs()"
								pattern="https?:\/\/.*"
								v-model="wh.url"
								:placeholder="t('kofi.webhook_placeholder')"
							/>

							<TTButton
								icon="trash"
								alert
								@click="
									storeKofi.removeWebhook(wh);
									storeKofi.saveConfigs();
								"
							/>
						</div>
						<div v-if="!wh.enabled" class="error">
							<div><Icon name="alert" />{{ t("kofi.disabled") }}</div>
							<TTButton
								icon="offline"
								@click="storeKofi.restartWebhook(wh)"
								alert
								light
								>{{ t("kofi.restartBt") }}</TTButton
							>
						</div>
					</div>
					<TTButton
						@click="addWebhook()"
						v-if="storeKofi.webhooks.length < 5"
						icon="add"
						>{{ t("kofi.add_webhookBt") }}</TTButton
					>
				</div>
			</ToggleBlock>
		</section>

		<section class="examples">
			<h2><Icon name="whispers" />{{ t("kofi.examples") }}</h2>
			<Icon name="loader" v-if="!fakeDonation || !fakeMerch || !fakeSubscription" />
			<template v-else>
				<MessageItem :messageData="fakeDonation" />
				<MessageItem :messageData="fakeMerch" />
				<MessageItem :messageData="fakeSubscription" />
			</template>
		</section>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import MessageItem from "@/components/messages/MessageItem.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import { storeKofi as useStoreKofi } from "@/store/kofi/storeKofi";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import { computed, onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeDebug = useStoreDebug();
const storeKofi = useStoreKofi();
const storeParams = useStoreParams();

const token = ref("");
const error = ref("");
const loading = ref(false);
const fakeDonation = ref<TwitchatDataTypes.KofiDonationData | undefined>(undefined);
const fakeMerch = ref<TwitchatDataTypes.KofiMerchData | undefined>(undefined);
const fakeSubscription = ref<TwitchatDataTypes.KofiSubscriptionData | undefined>(undefined);

const webhookURL = computed(() => Config.instance.API_PATH + "/kofi/webhook");

onBeforeMount(() => {
	storeDebug.simulateMessage<TwitchatDataTypes.KofiDonationData>(
		TwitchatDataTypes.TwitchatMessageType.KOFI,
		(mess) => {
			mess.eventType = "donation";
			fakeDonation.value = mess;
		},
		false,
	);
	storeDebug.simulateMessage<TwitchatDataTypes.KofiMerchData>(
		TwitchatDataTypes.TwitchatMessageType.KOFI,
		(mess) => {
			mess.eventType = "merch";
			mess.products = [
				{ id: "123456", name: "T-shirt", quantity: 1 },
				{ id: "234561", name: "Hoodie", quantity: 1 },
			];
			fakeMerch.value = mess;
		},
		false,
	);
	storeDebug.simulateMessage<TwitchatDataTypes.KofiSubscriptionData>(
		TwitchatDataTypes.TwitchatMessageType.KOFI,
		(mess) => {
			mess.eventType = "subscription";
			mess.tier = Utils.pickRand(["Gold", "Bronze", "Silver", "Poop"]);
			fakeSubscription.value = mess;
		},
		false,
	);
});

/**
 * Connects to kofi
 */
async function connect(): Promise<void> {
	loading.value = true;
	const success = await storeKofi.connect(token.value);
	error.value = !success ? t("error.kofi_connect_failed") : "";
	loading.value = false;
}

/**
 * Disconnects from kofi
 */
async function disconnect(): Promise<void> {
	loading.value = true;
	const success = await storeKofi.disconnect();
	error.value = !success ? t("error.kofi_disconnect_failed") : "";
	loading.value = false;
}

/**
 * Opens the premium param page
 */
function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

/**
 * Opens the premium param page
 */
function addWebhook(): void {
	storeKofi.addWebhook("");
}
</script>

<style scoped lang="less">
.connectkofi {
	.error {
		cursor: pointer;
		line-height: 1.2em;
		text-align: center;
		white-space: pre-line;
	}

	ol {
		gap: 1em;
		display: flex;
		flex-direction: column;
		list-style-position: inside;
		list-style-type: none;
		li {
			width: 100%;
			line-height: 1.2em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			.index {
				display: block;
				font-weight: bold;
				font-size: 1.2em;
				margin-right: 0.5em;
			}

			input {
				flex-basis: 100%;
				margin-top: 0.5em;
			}

			.button {
				display: flex;
				margin: 0 auto;
				align-self: center;
				justify-self: center;
			}
		}
	}

	.connected {
		align-items: center;
	}

	.examples {
		margin-top: 2em;
		.icon {
			height: 1em;
			margin-right: 0.5em;
			vertical-align: middle;
		}
		.chatMessage {
			font-size: 1em;
		}
	}

	.advancedParams {
		margin-top: 1em;
	}

	.additionalWebhooks {
		display: flex;
		flex-direction: column;
		gap: 0.25em;

		.entry {
			gap: 1px;
			display: flex;
			flex-direction: column;
			align-items: center;
			flex-wrap: wrap;
			row-gap: 0.5em;
			overflow: hidden;
			.form {
				gap: 1px;
				display: flex;
				flex-direction: row;
				align-items: center;
				flex-wrap: wrap;
				row-gap: 0.5em;
				overflow: hidden;
				width: 100%;
				input {
					width: 0;
					flex-grow: 1;
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
					border: 1px solid transparent;
				}
				input:invalid {
					border-color: var(--color-alert);
					background-color: var(--color-alert-fadest);
				}
				.button {
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
					align-self: stretch;
				}
			}
			.error {
				background-color: var(--color-alert);
				padding: 0.5em;
				display: flex;
				align-items: center;
				flex-direction: column;
				gap: 0.5em;
				.icon {
					height: 1em;
					margin-right: 0.5em;
				}
			}

			&.disabled {
				border: 1px solid var(--color-alert);
				border-radius: var(--border-radius);
				background-color: var(--color-alert-fader);
			}
		}
	}
}
</style>
