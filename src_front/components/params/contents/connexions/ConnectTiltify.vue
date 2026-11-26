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
				<ProfileInfoCard
					:avatar="storeTiltify.user?.avatar.src"
					:name="storeTiltify.user?.username"
					:url="'https://tiltify.com' + storeTiltify.user?.url"
					@logout="disconnect()"
				/>
			</section>

			<section
				class="card-item secondary noCampaign"
				v-if="storeTiltify.campaignList.length == 0"
			>
				<Icon name="alert" />
				<div class="content">
					<span>{{ t("tiltify.no_campaign") }}</span>
					<TTButton
						type="link"
						href="https://tiltify.com/start"
						target="_blank"
						icon="newtab"
						light
						secondary
						>{{ t("tiltify.start_bt") }}</TTButton
					>
				</div>
			</section>
			<template v-else>
				<section>
					<TTButton primary @click="openOverlay()" icon="overlay">{{
						t("tiltify.create_donation_goals")
					}}</TTButton>
				</section>

				<section class="card-item infos">
					<strong>{{
						t("tiltify.campaign_list", storeTiltify.campaignList.length)
					}}</strong>
					<div class="campaignList" v-if="activeCampaigns.length > 0">
						<TiltifyCampaignItem
							v-for="campaign in activeCampaigns"
							:key="campaign.id"
							:campaign="campaign"
						/>
					</div>
					<ToggleBlock
						v-if="retiredCampaigns.length > 0"
						class="retiredList"
						small
						:open="activeCampaigns.length == 0"
						:title="
							t(
								'tiltify.retired_list',
								{ COUNT: retiredCampaigns.length },
								retiredCampaigns.length,
							)
						"
					>
						<div class="campaignList">
							<TiltifyCampaignItem
								v-for="campaign in retiredCampaigns"
								:key="campaign.id"
								:campaign="campaign"
							/>
						</div>
					</ToggleBlock>
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
import ToggleBlock from "@/components/ToggleBlock.vue";
import TTButton from "@/components/TTButton.vue";
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import {
	storeTiltify as useStoreTiltify,
	type TiltifyCampaign,
} from "@/store/tiltify/storeTiltify";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ProfileInfoCard from "../ProfileInfoCard.vue";
import TiltifyCampaignItem from "./TiltifyCampaignItem.vue";

const { t } = useI18n();
const storeDebug = useStoreDebug();
const storeParams = useStoreParams();
const storeTiltify = useStoreTiltify();

const error = ref(false);
const loading = ref(false);
const oAuthURL = ref("");
const fakeDonation = ref<TwitchatDataTypes.TiltifyDonationData | undefined>(undefined);

/**
 * Campaigns sorted from most recent to oldest
 */
const sortedCampaigns = computed(() =>
	[...storeTiltify.campaignList].sort((a, b) => getStartTime(b) - getStartTime(a)),
);
const activeCampaigns = computed(() => sortedCampaigns.value.filter((v) => !isRetired(v)));
const retiredCampaigns = computed(() => sortedCampaigns.value.filter((v) => isRetired(v)));

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
 * Get the timestamp at which the given campaign started
 */
function getStartTime(campaign: TiltifyCampaign): number {
	return Date.parse(campaign.published_at || campaign.inserted_at) || 0;
}

/**
 * Get if the given campaign has been retired
 */
function isRetired(campaign: TiltifyCampaign): boolean {
	return !isNaN(Date.parse(campaign.retired_at || ""));
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
			gap: 0.5em;
			display: flex;
			flex-direction: column;
		}
		.retiredList {
			align-self: stretch;
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
			flex-shrink: 0;
		}
		.content {
			gap: 0.5em;
			display: flex;
			flex-direction: column;
			align-items: center;
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
