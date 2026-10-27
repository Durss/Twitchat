<template>
	<div class="connectstreamelements parameterContent">
		<Icon name="streamelements" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="streamelements.header">
				<template #LINK>
					<a href="https://streamelements.com/" target="_blank"
						><Icon name="newtab" />Streamelements</a
					>
				</template>
			</i18n-t>
		</div>

		<section v-if="!storeAuth.isPremium">
			<TTButton icon="premium" @click="openPremium()" premium big>{{
				t("premium.become_premiumBt")
			}}</TTButton>
		</section>

		<section v-else-if="!storeStreamelements.connected">
			<TTButton
				type="link"
				:href="oAuthURL"
				target="_self"
				:loading="loading"
				icon="newtab"
				>{{ t("global.connect") }}</TTButton
			>
			<div class="card-item alert error" v-if="error" @click="error = false">
				{{ t("error.streamelements_connect_failed") }}
			</div>
		</section>

		<section v-else>
			<ProfileInfoCard
				:avatar="storeStreamelements.profile?.avatar"
				:name="storeStreamelements.profile?.name"
				@logout="storeStreamelements.disconnect()"
			/>
		</section>

		<section class="examples">
			<h2><Icon name="whispers" />{{ t("streamelements.examples") }}</h2>
			<Icon name="loader" v-if="!fakeDonation" />
			<template v-else>
				<MessageItem v-if="fakeDonation" :messageData="fakeDonation" />
			</template>
		</section>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import MessageItem from "@/components/messages/MessageItem.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeStreamelements as useStoreStreamelements } from "@/store/streamelements/storeStreamelements";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ProfileInfoCard from "../ProfileInfoCard.vue";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeDebug = useStoreDebug();
const storeParams = useStoreParams();
const storeStreamelements = useStoreStreamelements();

const error = ref(false);
const loading = ref(false);
const oAuthURL = ref("");
const fakeDonation = ref<TwitchatDataTypes.StreamelementsDonationData | undefined>(undefined);

onBeforeMount(() => {
	if (!storeStreamelements.connected) {
		if (storeStreamelements.authResult.code) {
			//Complete oauth process
			loading.value = true;
			storeStreamelements.getAccessToken().then((success) => {
				error.value = !success;
				loading.value = false;
				loadAuthURL();
			});
		} else {
			//Preload oAuth URL
			loadAuthURL();
		}
	}
	storeDebug.simulateMessage<TwitchatDataTypes.StreamelementsDonationData>(
		TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS,
		(mess) => {
			mess.eventType = "donation";
			fakeDonation.value = mess;
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
 * initiliaze the auth url
 */
function loadAuthURL(): void {
	loading.value = true;
	storeStreamelements.getOAuthURL().then((res) => {
		oAuthURL.value = res;
		loading.value = false;
	});
}
</script>

<style scoped lang="less">
.connectstreamelements {
	.error {
		cursor: pointer;
		line-height: 1.2em;
		text-align: center;
		white-space: pre-line;
	}

	.examples {
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
