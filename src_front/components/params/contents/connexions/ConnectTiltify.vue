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
					<div class="campaignList">
						<div
							v-for="campaign in storeTiltify.campaignList"
							:key="campaign.id"
							class="campaign"
							:class="{ retired: getRetiredDate(campaign) }"
						>
							<img
								v-if="campaign.avatar?.src"
								class="avatar"
								:src="campaign.avatar.src"
								:alt="campaign.avatar.alt || campaign.name"
							/>
							<Icon v-else name="tiltify" class="avatar" />

							<div class="details">
								<div class="title">
									<a class="name" :href="campaign.donate_url" target="_blank"
										><Icon name="newtab" />{{ campaign.name }}</a
									>
									<Tag
										v-if="getRetiredDate(campaign)"
										v-tooltip="
											t('tiltify.retired_tt', {
												DATE: getRetiredDate(campaign),
											})
										"
										>{{ t("tiltify.retired") }}</Tag
									>
								</div>

								<template v-if="getGoal(campaign) > 0">
									<div class="progress">
										<div
											class="fill"
											:style="{
												width: getPercent(campaign) + '%',
											}"
										></div>
									</div>
									<div class="amounts">
										<strong>{{
											formatAmount(
												getRaised(campaign),
												campaign.currency_code ||
													campaign.amount_raised.currency,
											)
										}}</strong>
										<span>{{
											formatAmount(
												getGoal(campaign),
												campaign.currency_code ||
													campaign.amount_raised.currency,
											)
										}}</span>
									</div>
								</template>
							</div>

							<TTButton
								class="copyBt"
								small
								transparent
								icon="id"
								v-tooltip="t('tiltify.copy_id_tt')"
								:copy="campaign.id"
							/>
						</div>
					</div>
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
import Tag from "@/components/Tag.vue";
import TTButton from "@/components/TTButton.vue";
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import {
	storeTiltify as useStoreTiltify,
	type TiltifyCampaign,
} from "@/store/tiltify/storeTiltify";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ProfileInfoCard from "../ProfileInfoCard.vue";

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
 * Get the formatted date at which the given campaign has been retired.
 * Returns an empty string if the campaign is still running.
 */
function getRetiredDate(campaign: TiltifyCampaign): string {
	if (!campaign.retired_at) return "";
	const date = new Date(campaign.retired_at);
	if (isNaN(date.getTime())) return "";
	return Utils.formatDate(date, false, false, false);
}

/**
 * Get the amount raised so far on the given campaign
 */
function getRaised(campaign: TiltifyCampaign): number {
	return parseFloat(campaign.total_amount_raised?.value) || 0;
}

/**
 * Get the fundraising goal of the given campaign
 */
function getGoal(campaign: TiltifyCampaign): number {
	return parseFloat(campaign.goal?.value) || 0;
}

/**
 * Get the completion percent of the given campaign's goal
 */
function getPercent(campaign: TiltifyCampaign): number {
	const goal = getGoal(campaign);
	if (goal <= 0) return 0;
	return Math.max(0, Math.min(100, (getRaised(campaign) / goal) * 100));
}

/**
 * Formats an amount to the given currency
 */
function formatAmount(amount: number, currency: string): string {
	try {
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency,
		}).format(amount);
	} catch (e) {
		return amount + " " + (currency || "");
	}
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
			.campaign {
				gap: 0.5em;
				display: flex;
				flex-direction: row;
				align-items: center;
				padding: 0.5em;
				border-radius: var(--border-radius);
				background-color: var(--background-color-fader);
				transition: background-color 0.2s;
				position: relative;
				&:hover {
					background-color: var(--background-color-fadest);
				}

				&.retired {
					opacity: 0.6;
					transition:
						background-color 0.2s,
						opacity 0.2s;
					.avatar {
						filter: saturate(0%);
					}
					.progress .fill {
						background-color: var(--color-text-fade);
					}
					&:hover {
						opacity: 1;
					}
				}

				.avatar {
					width: 2.5em;
					height: 2.5em;
					margin: 0;
					flex-shrink: 0;
					object-fit: cover;
					border-radius: var(--border-radius);
				}

				.details {
					gap: 0.25em;
					min-width: 0;
					flex-grow: 1;
					display: flex;
					flex-direction: column;

					.title {
						gap: 0.5em;
						display: flex;
						flex-direction: row;
						align-items: center;
						flex-wrap: wrap;
						padding-right: 1.5em;
						.tag {
							flex-shrink: 0;
						}
					}

					.name {
						font-weight: bold;
						line-height: 1.2em;
						overflow-wrap: anywhere;
					}

					.progress {
						height: 4px;
						overflow: hidden;
						border-radius: 4px;
						background-color: var(--color-text-fadest);
						.fill {
							height: 100%;
							border-radius: 4px;
							background-color: var(--color-primary-light);
							transition: width 0.2s;
						}
					}

					.amounts {
						gap: 0.5em;
						display: flex;
						flex-direction: row;
						justify-content: space-between;
						font-size: 0.8em;
						span {
							font-style: italic;
							color: var(--color-text-fade);
						}
					}
				}

				.copyBt {
					flex-shrink: 0;
					width: 2em;
					height: 2em;
					position: absolute;
					top: 0;
					right: 0;
				}
			}
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
