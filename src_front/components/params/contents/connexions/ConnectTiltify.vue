<template>
	<div class="connecttiltify parameterContent">
		<Icon name="tiltify" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="tiltify.header">
				<template #LINK>
					<a href="https://tiltify.com/" target="_blank"><Icon name="newtab" />Tiltify</a>
				</template>
			</i18n-t>
		</div>

		<section v-if="!storeTiltify.connected">
			<TTButton
				type="link"
				:href="oAuthURL"
				target="_self"
				:loading="loading"
				icon="online"
				>{{ t("global.connect") }}</TTButton
			>
			<div class="card-item alert error" v-if="error" @click="error = false">
				{{ t("error.tiltify_connect_failed") }}
			</div>
		</section>

		<template v-else>
			<section>
				<TTButton alert icon="offline" @click="disconnect()">
					<div class="userInfo" v-if="storeTiltify.user">
						<span>{{ t("global.disconnect") }} </span>
						<img :src="storeTiltify.user.avatar.src" alt="avatar" />
						<h2>{{ storeTiltify.user.username }}</h2>
					</div>
				</TTButton>
			</section>

			<section
				class="card-item secondary noCampaign"
				v-if="storeTiltify.campaignList.length == 0"
			>
				<Icon name="alert" />
				<span>{{ t("tiltify.no_campaign") }}</span>
				<TTButton
					type="link"
					href="https://tiltify.com/start"
					target="_blank"
					icon="newtab"
					light
					secondary
					>{{ t("global.start") }}</TTButton
				>
			</section>
			<template v-else>
				<section class="card-item infos">
					<strong>{{
						t("tiltify.campaign_list", storeTiltify.campaignList.length)
					}}</strong>
					<div class="campaignList">
						<div v-for="campaign in storeTiltify.campaignList" class="campaign">
							<a :href="campaign.donate_url" target="_blank"
								><Icon name="newtab" />{{ campaign.name }}</a
							>
							<TTButton
								clear
								icon="copy"
								v-tooltip="t('tiltify.copy_id_tt')"
								@click="copyId(campaign.id)"
								>#ID</TTButton
							>
						</div>
					</div>
					<span class="spaceAbove">{{ t("tiltify.create_donation_goals") }}</span>
					<TTButton @click="openOverlay()" icon="add">{{ t("global.create") }}</TTButton>
				</section>
			</template>
		</template>

		<section class="examples">
			<h2><Icon name="whispers" />{{ t("tiltify.examples") }}</h2>
			<Icon name="loader" v-if="!fakeDonation" />
			<template v-else>
				<MessageItem :messageData="fakeDonation" />
			</template>
		</section>
	</div>
</template>

<script setup lang="ts">
import MessageItem from "@/components/messages/MessageItem.vue";
import TTButton from "@/components/TTButton.vue";
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeTiltify as useStoreTiltify } from "@/store/tiltify/storeTiltify";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const storeDebug = useStoreDebug();
const storeParams = useStoreParams();
const storeTiltify = useStoreTiltify();

const error = ref(false);
const loading = ref(false);
const oAuthURL = ref("");
const fakeDonation = ref<TwitchatDataTypes.TiltifyDonationData | undefined>(undefined);

onBeforeMount(() => {
	if (!storeTiltify.connected) {
		if (storeTiltify.authResult.code) {
			//Complete oauth process
			loading.value = true;
			storeTiltify.getAccessToken().then((success) => {
				error.value = !success;
				loading.value = false;
				if (error.value) {
					loadAuthURL();
				}
			});
		} else {
			//Preload oAuth URL
			loadAuthURL();
		}
	}
	storeDebug.simulateMessage<TwitchatDataTypes.TiltifyDonationData>(
		TwitchatDataTypes.TwitchatMessageType.TILTIFY,
		(mess) => {
			mess.eventType = "donation";
			fakeDonation.value = mess;
		},
		false,
	);
	// storeTiltify.connect()
	// .then(res => {
	// 	console.log(res)
	// });
});

/**
 * Disconnects from streamlabs
 */
function disconnect(): void {
	storeTiltify.disconnect();
	loadAuthURL();
}

/**
 * Open donation goal overlay section
 */
function openOverlay(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "donationgoals");
}

/**
 * Copies ID to clipboard
 */
function copyId(id: string): void {
	Utils.copyToClipboard(id);
}

/**
 * initiliaze the auth url
 */
function loadAuthURL(): void {
	loading.value = true;
	storeTiltify.getOAuthURL().then((res) => {
		oAuthURL.value = res;
		loading.value = false;
	});
}
</script>

<style scoped lang="less">
.connecttiltify {
	.userInfo {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		align-self: center;
		img {
			border-radius: 50%;
			height: 2em;
		}
	}

	.infos {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.icon {
			height: 1em;
			vertical-align: middle;
			margin-right: 0.25em;
		}
		.campaignList {
			align-self: stretch;
			gap: 0.25em;
			display: flex;
			flex-direction: column;
			.campaign {
				display: flex;
				flex-direction: row;
				justify-content: space-between;
				align-items: center;
				padding-left: 0.5em;
				border-radius: var(--border-radius);
				&:hover {
					background-color: var(--background-color-fadest);
				}
			}
		}
		.spaceAbove {
			margin-top: 0.5em;
		}
	}

	.error {
		cursor: pointer;
		line-height: 1.2em;
		text-align: center;
		white-space: pre-line;
	}

	.noCampaign {
		line-height: 1.2em;
		flex-direction: row;
		align-items: center;
		.icon {
			height: 1.5em;
		}
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

	.create {
		align-items: center;
	}
}
</style>
