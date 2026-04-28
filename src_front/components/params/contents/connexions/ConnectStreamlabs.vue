<template>
	<div class="connectstreamlabs parameterContent">
		<Icon name="streamlabs" class="icon" />

		<div class="head">
			<i18n-t scope="global" tag="span" keypath="streamlabs.header">
				<template #LINK>
					<a href="https://streamlabs.com/" target="_blank"
						><Icon name="newtab" />Streamlabs</a
					>
				</template>
				<template #CHARITY_LINK>
					<a href="https://streamlabscharity.com" target="_blank"
						><Icon name="newtab" />Streamlabs Charity</a
					>
				</template>
			</i18n-t>
		</div>

		<section v-if="!storeStreamlabs.connected">
			<TTButton
				type="link"
				:href="oAuthURL"
				target="_self"
				:loading="loading"
				icon="newtab"
				>{{ t("global.connect") }}</TTButton
			>
			<div class="card-item alert error" v-if="error" @click="error = false">
				{{ t("error.streamlabs_connect_failed") }}
			</div>
		</section>

		<template v-else>
			<section>
				<ProfileInfoCard
					icon="streamlabs"
					:avatar="storeStreamlabs.profile?.avatar"
					:name="storeStreamlabs.profile?.name"
					@logout="disconnect()"
				/>
			</section>

			<section v-if="storeStreamlabs.charityTeam">
				<ProfileInfoCard
					icon="charity"
					:avatar="storeStreamlabs.charityTeam.avatar"
					:name="storeStreamlabs.charityTeam.title"
					:details="storeStreamlabs.charityTeam.cause.title"
					@logout="disconnectCharityCampaign()"
				/>
			</section>

			<section class="card-item charity" v-if="!storeStreamlabs.charityTeam">
				<div class="header">
					<span class="title"
						><Icon name="notification" />{{ t("streamlabs.charity_title") }}</span
					>
				</div>

				<div class="info">
					<Icon name="info" />
					<i18n-t scope="global" keypath="streamlabs.charity_header">
						<template #OVERLAY>
							<a @click.stop="openGoalsOverlay()">{{
								t("streamlabs.charity_header_overlayBt")
							}}</a>
						</template>
					</i18n-t>
				</div>
				<form @submit.prevent="submitCharity()">
					<ul>
						<li>
							<a
								href="https://streamlabscharity.com/profile/user/teams"
								target="_blank"
								><Icon name="newtab" />{{ t("streamlabs.step1") }}</a
							>
						</li>
						<li>{{ t("streamlabs.step2") }}</li>
						<li>{{ t("streamlabs.step3") }}</li>
						<li>{{ t("streamlabs.step4") }}</li>
						<li class="input">
							<label for="charityTeamURL">{{ t("streamlabs.step5") }}</label>
							<input
								id="charityTeamURL"
								type="text"
								v-model="charityURL"
								pattern="https://streamlabscharity.com/teams.*"
								placeholder="https://streamlabscharity.com/teams/@..."
							/>
						</li>
						<li>
							<Icon name="alert" theme="secondary" />
							<Icon name="alert" theme="secondary" />
							<Icon name="alert" theme="secondary" />
							<i18n-t scope="global" keypath="streamlabs.step6">
								<template #LINK>
									<a :href="t('streamlabs.step6_url')" target="_blank"
										><Icon name="newtab" />{{ t("streamlabs.step6_link") }}</a
									>
								</template>
							</i18n-t>
						</li>
					</ul>
					<TTButton
						type="submit"
						icon="checkmark"
						:loading="connectingCharity"
						:disabled="charityURL.trim().length == 0"
						primary
						>{{ t("global.submit") }}</TTButton
					>
					<div
						class="card-item alert error"
						@click="charityError = false"
						v-if="charityError"
					>
						{{ t("streamlabs.charity_error") }}
					</div>
				</form>
			</section>

			<section v-if="!storeAuth.isPremium" class="card-item premium">
				<div class="header">
					<span class="title"
						><Icon name="notification" />{{ t("streamlabs.personnal_title") }}</span
					>
				</div>
				<div class="info">{{ t("streamlabs.personnal_header") }}</div>
				<TTButton icon="premium" @click="openPremium()" premium light>{{
					t("premium.become_premiumBt")
				}}</TTButton>
			</section>
		</template>

		<section class="examples">
			<h2><Icon name="whispers" />{{ t("streamlabs.examples") }}</h2>
			<Icon
				name="loader"
				v-if="!fakeDonation || !fakeMerch || !fakePatreon || !fakeCharity"
			/>
			<template v-else>
				<MessageItem :messageData="fakeDonation" />
				<MessageItem :messageData="fakeMerch" />
				<MessageItem :messageData="fakePatreon" />
				<MessageItem :messageData="fakeCharity" />
			</template>
		</section>
	</div>
</template>

<script setup lang="ts">
import MessageItem from "@/components/messages/MessageItem.vue";
import TTButton from "@/components/TTButton.vue";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeStreamlabs as useStoreStreamlabs } from "@/store/streamlabs/storeStreamlabs";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ProfileInfoCard from "../ProfileInfoCard.vue";

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeDebug = useStoreDebug();
const storeParams = useStoreParams();
const storeStreamlabs = useStoreStreamlabs();

const error = ref(false);
const charityError = ref(false);
const loading = ref(false);
const connectingCharity = ref(false);
const oAuthURL = ref("");
const charityURL = ref("");
const fakeDonation = ref<TwitchatDataTypes.StreamlabsDonationData | undefined>(undefined);
const fakeMerch = ref<TwitchatDataTypes.StreamlabsMerchData | undefined>(undefined);
const fakePatreon = ref<TwitchatDataTypes.StreamlabsPatreonPledgeData | undefined>(undefined);
const fakeCharity = ref<TwitchatDataTypes.StreamlabsCharityData | undefined>(undefined);

onBeforeMount(() => {
	if (!storeStreamlabs.connected) {
		if (storeStreamlabs.authResult.code) {
			//Complete oauth process
			loading.value = true;
			storeStreamlabs.getAccessToken().then((success) => {
				error.value = !success;
				loading.value = false;
				loadAuthURL();
			});
		} else {
			//Preload oAuth URL
			loadAuthURL();
		}
	}
	storeDebug.simulateMessage<TwitchatDataTypes.StreamlabsDonationData>(
		TwitchatDataTypes.TwitchatMessageType.STREAMLABS,
		(mess) => {
			mess.eventType = "donation";
			fakeDonation.value = mess;
		},
		false,
	);
	storeDebug.simulateMessage<TwitchatDataTypes.StreamlabsMerchData>(
		TwitchatDataTypes.TwitchatMessageType.STREAMLABS,
		(mess) => {
			mess.eventType = "merch";
			mess.product = "T-shirt";
			fakeMerch.value = mess;
		},
		false,
	);
	storeDebug.simulateMessage<TwitchatDataTypes.StreamlabsPatreonPledgeData>(
		TwitchatDataTypes.TwitchatMessageType.STREAMLABS,
		(mess) => {
			mess.eventType = "patreon_pledge";
			fakePatreon.value = mess;
		},
		false,
	);
	storeDebug.simulateMessage<TwitchatDataTypes.StreamlabsCharityData>(
		TwitchatDataTypes.TwitchatMessageType.STREAMLABS,
		(mess) => {
			mess.eventType = "charity";
			mess.campaign = {
				id: Utils.getUUID(),
				title: "Awesome charity campaign",
				url: "https://streamlabscharity.com",
			};
			fakeCharity.value = mess;
		},
		false,
	);
});

/**
 * Disconnects from streamlabs
 */
function disconnect(): void {
	storeStreamlabs.disconnect();
	loadAuthURL();
}

/**
 * Disconnects from streamlabs charity campaign only
 */
function disconnectCharityCampaign(): void {
	storeStreamlabs.disconnectCharityCampaign();
}

/**
 * Opens the premium param page
 */
function openPremium(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
}

/**
 * Opens the Goals overlay
 */
function openGoalsOverlay(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "donationgoals");
}

/**
 * Submit streamlabs charity campaign url
 */
async function submitCharity(): Promise<void> {
	connectingCharity.value = true;
	const result = await storeStreamlabs.loadCharityCampaignInfo(charityURL.value);
	charityError.value = !result;
	connectingCharity.value = false;
}

/**
 * initiliaze the auth url
 */
function loadAuthURL(): void {
	loading.value = true;
	storeStreamlabs.getOAuthURL().then((res) => {
		oAuthURL.value = res;
		loading.value = false;
	});
}
</script>

<style scoped lang="less">
.connectstreamlabs {
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

	.info {
		.icon {
			height: 1em;
			margin-right: 0.25em;
			vertical-align: middle;
		}
	}

	.charity {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		form {
			gap: 0.5em;
			display: flex;
			flex-direction: column;
			.button {
				align-self: center;
			}
		}
		ul {
			list-style: decimal;
			margin-left: 3em;
			margin-top: 0.5em;
			li {
				margin-bottom: 1em;
				line-height: 1.25em;
				.icon {
					height: 1em;
					margin-right: 0.25em;
				}
			}
		}
		a {
			.icon {
				height: 1em;
				vertical-align: middle;
				margin-right: 0.25em;
			}
		}

		.input input {
			width: 100%;
		}
	}
}
</style>
