<template>
	<div class="connecttipeee parameterContent">
		<Icon name="tipeee" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="tipeee.header">
				<template #LINK>
					<a href="https://www.tipeeestream.com/" target="_blank"
						><Icon name="newtab" />Tipeee Stream</a
					>
				</template>
			</i18n-t>
		</div>

		<section v-if="!storeAuth.isPremium">
			<TTButton icon="premium" @click="openPremium()" premium big>{{
				t("premium.become_premiumBt")
			}}</TTButton>
		</section>

		<section v-else-if="!storeTipeee.connected">
			<TTButton
				type="link"
				:href="oAuthURL"
				target="_self"
				:loading="loading"
				icon="newtab"
				>{{ t("global.connect") }}</TTButton
			>
			<div class="card-item alert error" v-if="error" @click="error = false">
				{{ t("error.tipeee_connect_failed") }}
			</div>
		</section>

		<section v-else>
			<TTButton alert @click="disconnect()" icon="offline">{{
				t("global.disconnect")
			}}</TTButton>
		</section>

		<section class="examples">
			<h2><Icon name="whispers" />{{ t("tipeee.examples") }}</h2>
			<Icon name="loader" v-if="!fakeDonation || !fakeSub || !fakeResub" />
			<template v-else>
				<MessageItem :messageData="fakeDonation" />
				<MessageItem :messageData="fakeSub" />
				<MessageItem :messageData="fakeResub" />
			</template>
		</section>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import MessageItem from "@/components/messages/MessageItem.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeTipeee as useStoreTipeee } from "@/store/tipeee/storeTipeee";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeDebug = useStoreDebug();
const storeParams = useStoreParams();
const storeTipeee = useStoreTipeee();

const error = ref(false);
const loading = ref(false);
const oAuthURL = ref("");
const fakeDonation = ref<TwitchatDataTypes.MessageTipeeeDonationData | undefined>(undefined);
const fakeSub = ref<TwitchatDataTypes.MessageTipeeeDonationData | undefined>(undefined);
const fakeResub = ref<TwitchatDataTypes.MessageTipeeeDonationData | undefined>(undefined);

onBeforeMount(() => {
	if (!storeTipeee.connected) {
		if (storeTipeee.authResult.code) {
			//Complete oauth process
			loading.value = true;
			storeTipeee.completeOAuthProcess().then((success) => {
				error.value = !success;
				loading.value = false;
				loadAuthURL();
			});
		} else {
			//Preload oAuth URL
			loadAuthURL();
		}
	}

	storeDebug.simulateMessage<TwitchatDataTypes.MessageTipeeeDonationData>(
		TwitchatDataTypes.TwitchatMessageType.TIPEEE,
		(mess) => {
			fakeDonation.value = mess;
		},
		false,
	);
	storeDebug.simulateMessage<TwitchatDataTypes.MessageTipeeeDonationData>(
		TwitchatDataTypes.TwitchatMessageType.TIPEEE,
		(mess) => {
			mess.recurring = true;
			fakeSub.value = mess;
		},
		false,
	);
	storeDebug.simulateMessage<TwitchatDataTypes.MessageTipeeeDonationData>(
		TwitchatDataTypes.TwitchatMessageType.TIPEEE,
		(mess) => {
			mess.recurring = true;
			mess.recurringCount = Math.round(Math.random() * 10);
			fakeResub.value = mess;
		},
		false,
	);
});

/**
 * Opens the premium param page
 */
function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

/**
 * Disconnects from tipeee
 */
function disconnect(): void {
	storeTipeee.disconnect();
	loadAuthURL();
}

/**
 * initiliaze the auth url
 */
function loadAuthURL(): void {
	loading.value = true;
	storeTipeee.getOAuthURL().then((res) => {
		oAuthURL.value = res;
		loading.value = false;
	});
}
</script>

<style scoped lang="less">
.connecttipeee {
	.error {
		cursor: pointer;
		line-height: 1.2em;
		text-align: center;
		white-space: pre-line;
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
}
</style>
