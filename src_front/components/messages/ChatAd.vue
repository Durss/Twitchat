<template>
	<div class="chatad chatMessage">
		<div class="innerHolder">
			<div v-if="isDonate || isDonateReminder" class="card-item primary sponsor">
				<div class="header">
					<ClearButton
						@click.stop="deleteMessage()"
						v-if="storeParams.donationReminderEnabled"
					/>
					<div class="title">{{ t("chat.sponsor.title") }}</div>
				</div>
				<div
					class="content"
					v-html="
						isDonateReminder ? t('chat.sponsor.head_reminder') : t('chat.sponsor.head')
					"
				></div>
				<div class="ctas">
					<img
						@click.stop="openParamPage(contentDonate)"
						src="@/assets/img/eating.gif"
						alt="nomnom"
						class="sponsorGif"
					/>

					<TTButton
						primary
						light
						:aria-label="t('chat.sponsor.tipBt_aria')"
						@click.stop="openParamPage(contentDonate)"
						>{{ t("chat.sponsor.tipBt") }}</TTButton
					>

					<template v-if="!isDonateReminder">
						<TTButton
							v-if="!storeParams.donationReminderEnabled"
							light
							primary
							@click.stop="storeParams.donationReminderEnabled = true"
							icon="timer"
							>{{ t("chat.sponsor.remind_meBt") }}</TTButton
						>
						<div v-else class="card-item secondary infos">
							{{ t("chat.sponsor.reminder_scheduled") }}
						</div>
					</template>
				</div>
			</div>

			<div v-if="isTip" class="card-item primary tip">
				<div class="header">
					<ClearButton
						:aria-label="t('chat.closeBt_aria')"
						@click.stop="deleteMessage()"
					/>
					<div class="title">{{ t("tips.title") }}</div>
				</div>
				<ChatTipAndTrickAd class="content" />
			</div>

			<div v-if="isDiscord" class="card-item primary discord">
				<div class="header">
					<ClearButton
						:aria-label="t('chat.closeBt_aria')"
						@click.stop="deleteMessage()"
					/>
					<div class="title">{{ t("chat.discord.title") }}</div>
				</div>
				<div class="content">
					<Icon name="discord" alt="discord" class="icon" theme="light" />
					<div v-html="t('chat.discord.content')"></div>
				</div>
				<div class="ctas">
					<TTButton
						primary
						light
						icon="discord"
						:href="discordURL"
						target="_blank"
						type="link"
						>{{ t("chat.discord.joinBt") }}</TTButton
					>
				</div>
			</div>

			<div v-if="isAdWarning" class="card-item primary">
				<div class="header">
					<ClearButton
						:aria-label="t('chat.closeBt_aria')"
						@click.stop="showConfirm ? (showConfirm = false) : confirmGngngnClose()"
					/>
					<div class="title">{{ t("chat.adalert.title") }}</div>
				</div>
				<div class="content left">
					<Icon name="twitchat" alt="twitchat" class="icon" theme="light" />
					<div v-for="e in <string[]>tm('chat.adalert.contents')" v-html="e"></div>
				</div>
				<div class="ctas">
					<TTButton
						primary
						light
						icon="edit"
						@click="openParamPage(contentMainMenu, 'ad')"
						>{{ t("chat.adalert.customizeBt") }}</TTButton
					>
					<TTButton icon="premium" premium @click="openParamPage(contentPremium)">{{
						t("premium.become_premiumBt")
					}}</TTButton>
					<TTButton icon="follow" secondary @click="openParamPage(contentDonate)">{{
						t("chat.adalert.donateBt")
					}}</TTButton>
					<TTButton primary @click="openModal('gngngn')">{{
						t("chat.adalert.unacceptableBt")
					}}</TTButton>
				</div>
			</div>

			<div v-if="isSponsorPublicPrompt" class="card-item primary sponsorPrompt">
				<div class="header">
					<ClearButton
						:aria-label="t('chat.closeBt_aria')"
						@click.stop="deleteMessage()"
					/>
					<div class="title">{{ t("chat.donor.title") }}</div>
				</div>
				<div class="content">
					<Icon name="follow" alt="heart" class="icon" theme="light" />
					<div>{{ t("chat.donor.info_1") }}</div>
					<i18n-t scope="global" tag="div" keypath="chat.donor.info_2">
						<template #LINK
							><a @click="openParamPage(contentDonate)">{{
								t("chat.donor.info_2_link")
							}}</a></template
						>
					</i18n-t>
					<div>{{ t("chat.donor.info_3") }}</div>
					<div class="card-item" v-if="madeDonationPublic">
						<div>{{ t("chat.donor.thanks") }}</div>
						<i18n-t scope="global" tag="div" keypath="chat.donor.thanks_change">
							<template #LINK
								><a @click="openParamPage(contentDonate)">{{
									t("chat.donor.thanks_change_link")
								}}</a></template
							>
						</i18n-t>
					</div>
				</div>
				<div class="ctas">
					<TTButton
						icon="follow"
						primary
						light
						:loading="loading"
						@click="makeDonationPublic()"
						v-if="!madeDonationPublic"
						>{{ t("chat.donor.publicBt") }}</TTButton
					>
				</div>
			</div>

			<div v-if="isUpdateReminder" class="card-item primary updateReminder">
				<div class="content">
					<Icon name="firstTime" class="small" theme="light" />
					<i18n-t scope="global" tag="span" keypath="chat.updateReminder.content">
						<template #CMD>
							<mark>/updates</mark>
						</template>
					</i18n-t>
				</div>
				<div class="ctas">
					<TTButton @click="openChangelog()" icon="firstTime" primary light
						>/updates</TTButton
					>
				</div>
			</div>

			<div v-if="isAdBreakScopeRequest" class="card-item primary adBreak">
				<div class="header">
					<ClearButton @click.stop="deleteMessage()" />
					<div class="title">
						<Icon name="ad" class="icon small" theme="light" />
						{{ t("chat.adBreakScope.header") }}
					</div>
				</div>
				<div class="content">
					<span>{{ t("chat.adBreakScope.content") }}</span>
				</div>
				<div class="ctas">
					<TTButton icon="lock_fit" light @click="grantAdScopes()">{{
						t("chat.adBreakScope.grantBt")
					}}</TTButton>
				</div>

				<div class="card-item secondary infos">
					<Icon name="info" />
					<i18n-t tag="span" scope="global" keypath="chat.adBreakScope.infos">
						<template #DASHBOARD_LINK>
							<a
								href="https://dashboard.twitch.tv/monetization/ads/ads-manager"
								target="_blank"
								>{{ t("chat.adBreakScope.infos_link") }}</a
							>
						</template>
					</i18n-t>
				</div>
			</div>

			<div class="confirmClose" ref="confirmClose" v-if="showConfirm">
				<p class="label">{{ t("chat.donor.close_confirm.info_1") }}</p>
				<p class="label">{{ t("chat.donor.close_confirm.info_2") }}</p>
				<div class="ctaConfirm">
					<TTButton :loading="confirmDelay" @click="showConfirm = false" alert>{{
						t("chat.donor.close_confirm.cancelBt")
					}}</TTButton>
					<TTButton :loading="confirmDelay" @click="deleteMessage()">{{
						t("chat.donor.close_confirm.confirmBt")
					}}</TTButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import DataStore from "@/store/DataStore";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import Config from "@/utils/Config";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import ChatTipAndTrickAd from "./ChatTipAndTrickAd.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageTwitchatAdData;
}>();

defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const { t, tm } = useI18n();
const storeAuth = useStoreAuth();
const storeChat = useStoreChat();
const storeParams = useStoreParams();

const showConfirm = ref<boolean>(false);
const confirmDelay = ref<boolean>(false);
const loading = ref<boolean>(false);
const madeDonationPublic = ref<boolean>(false);

const isDonate = computed<boolean>(
	() => props.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.DONATE,
);
const isDonateReminder = computed<boolean>(
	() => props.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.DONATE_REMINDER,
);
const isTip = computed<boolean>(
	() => props.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK,
);
const isDiscord = computed<boolean>(
	() => props.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.DISCORD,
);
const isAdWarning = computed<boolean>(
	() => props.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_AD_WARNING,
);
const isSponsorPublicPrompt = computed<boolean>(
	() =>
		props.messageData.adType ==
		TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_SPONSOR_PUBLIC_PROMPT,
);
const isUpdateReminder = computed<boolean>(
	() => props.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.UPDATE_REMINDER,
);
const isAdBreakScopeRequest = computed<boolean>(
	() => props.messageData.adType == TwitchatDataTypes.TwitchatAdTypes.AD_BREAK_SCOPE_REQUEST,
);

const discordURL = computed<string>(() => Config.instance.DISCORD_URL);
const contentDonate = computed<TwitchatDataTypes.ParameterPagesStringType>(
	() => TwitchatDataTypes.ParameterPages.DONATE,
);
const contentPremium = computed<TwitchatDataTypes.ParameterPagesStringType>(
	() => TwitchatDataTypes.ParameterPages.PREMIUM,
);
const contentMainMenu = computed<TwitchatDataTypes.ParameterPagesStringType>(
	() => TwitchatDataTypes.ParameterPages.MAIN_MENU,
);

function openModal(modal: TwitchatDataTypes.ModalTypes): void {
	storeParams.openModal(modal);
}

function openChangelog(): void {
	storeParams.openChangelog();
}

function openParamPage(
	page: TwitchatDataTypes.ParameterPagesStringType,
	subContent?: TwitchatDataTypes.ParamDeepSectionsStringType,
): void {
	storeParams.openParamsPage(page, subContent);
}

function deleteMessage(): void {
	if (isAdWarning.value) {
		DataStore.set(DataStore.TWITCHAT_AD_WARNED, true);
	}
	if (isAdBreakScopeRequest.value) {
		DataStore.set(DataStore.AD_BREAK_SCOPES_REQUEST, true);
	}
	if (isSponsorPublicPrompt.value) {
		DataStore.set(DataStore.TWITCHAT_SPONSOR_PUBLIC_PROMPT, true);
	}

	storeChat.deleteMessage(props.messageData);
}

function confirmGngngnClose(): void {
	showConfirm.value = true;
	confirmDelay.value = true;
	window.setTimeout(() => {
		confirmDelay.value = false;
	}, 2000);
}

async function makeDonationPublic(): Promise<void> {
	loading.value = true;
	try {
		ApiHelper.call("user/donor/anon", "POST", { public: true });
	} catch (error) {}
	loading.value = false;
	madeDonationPublic.value = true;
	DataStore.set(DataStore.TWITCHAT_SPONSOR_PUBLIC_PROMPT, true);
}

function grantAdScopes(): void {
	storeAuth.requestTwitchScopes([TwitchScopes.ADS_READ, TwitchScopes.ADS_SNOOZE]);
	if (isAdBreakScopeRequest.value) {
		DataStore.set(DataStore.AD_BREAK_SCOPES_REQUEST, true);
	}
}
</script>

<style scoped lang="less">
.chatad {
	.innerHolder {
		position: relative;
		font-weight: 300;
		.confirmClose {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.7);
			backdrop-filter: blur(5px);
			display: flex;
			align-items: center;
			flex-direction: column;
			justify-content: center;
			color: var(--color-light);
			.label {
				font-size: 2em;
				text-shadow: 1px 1px 1px var(--color-dark);
				text-align: center;
				line-height: 1.2em;
			}
			.ctaConfirm {
				font-size: 1rem;
				max-width: 250px;
				margin-top: 0.5em;
				gap: 1em;
				display: flex;
				flex-direction: row;
				justify-content: space-evenly;
			}
		}

		.header {
			position: relative;
			& > .title {
				color: var(--color-light);
				font-size: 1.5em;
				.icon {
					height: 1em;
					margin-right: 0.5em;
					color: var(--color-light);
				}
			}
		}
		.content {
			padding: 0.5em;
			&:not(.left) {
				text-align: center;
			}

			& > .icon {
				height: 4em;
				width: 4em;
				margin: 0 auto 0.5em auto;
				display: block;

				&.small {
					height: 1em;
					display: inline-block;
					width: auto;
					vertical-align: middle;
					margin-right: 0.5em;
				}
			}

			:deep(mark) {
				border: 1px dashed fade(#000, 20);
				background-color: fade(#000, 5);
				border-radius: 0.5em;
				padding: 0 0.25em;
			}
			span {
				white-space: pre-line;
			}
		}

		.infos {
			margin: auto;
			width: fit-content;
			background-color: var(--color-secondary-fade);
			.icon {
				height: 1em;
				margin-right: 0.5em;
				vertical-align: middle;
			}
		}

		.center {
			text-align: center;
		}

		.ctas {
			padding: 0.5em;
			gap: 0.5em;
			display: flex;
			flex-direction: column;
			align-items: center;

			.sponsorGif {
				width: 8em;
				margin-bottom: -0.5em; //Compensate for flex gap
				cursor: pointer;
			}
		}
	}
}
</style>
