<template>
	<div
		:class="classes"
		@contextmenu="onContextMenu($event, props.messageData, rootEl!)"
		ref="rootEl"
	>
		<Icon v-if="props.messageData.is_gift" name="gift" alt="gift" class="icon" />
		<Icon v-else-if="props.messageData.tier == 'prime'" name="prime" alt="prime" class="icon" />
		<Icon v-else name="sub" alt="sub" class="icon" />

		<div>
			<!-- Subgift -->
			<div class="holder" v-if="props.messageData.is_gift">
				<i18n-t
					scope="global"
					tag="span"
					:keypath="
						props.messageData.is_targetedSubgift
							? 'chat.subscription.sub_gift_months'
							: 'chat.subscription.sub_gift'
					"
				>
					<template #USER>
						<a
							class="userlink"
							@click="
								openUserCard(props.messageData.user, props.messageData.channel_id)
							"
							>{{ props.messageData.user.displayName }}</a
						>
					</template>
					<template #TIER>
						<strong>{{ props.messageData.tier }}</strong>
					</template>
					<template #COUNT>
						<strong>{{ props.messageData.gift_recipients?.length }}</strong>
					</template>
					<template #MONTHS>
						<strong>{{
							formatedDuration(
								props.messageData.months > 0 ? props.messageData.months : 1,
							)
						}}</strong>
						<i v-if="props.messageData.months > 12">
							({{
								t(
									"chat.subscription.duration_months",
									{ COUNT: props.messageData.months },
									props.messageData.months,
								)
							}})</i
						>
					</template>
					<template #LIST>
						<span
							class="additionalUsers messageWithTime"
							v-if="giftRecipients.length > 0"
							v-for="(u, index) in giftRecipients"
							:key="u.id"
						>
							<a
								class="userlink"
								@click="openUserCard(u, props.messageData.channel_id)"
								>{{ u.displayName }}</a
							>
							<span v-if="index == giftRecipients.length - 2"
								>&nbsp;{{ t("global.and") }}&nbsp;</span
							>
							<span v-else-if="index < giftRecipients.length - 1">, </span>
						</span>
					</template>
				</i18n-t>

				<i18n-t
					scope="global"
					tag="div"
					class="additional messageWithTime"
					v-if="totalSubgifts && totalSubgifts > 0"
					keypath="chat.subscription.sub_gift_total"
					:plural="totalSubgifts"
				>
					<template #COUNT>
						<strong>{{ totalSubgifts }}</strong>
					</template>
				</i18n-t>
			</div>

			<!-- Gift upgrade -->
			<div class="holder" v-else-if="props.messageData.is_giftUpgrade">
				<i18n-t
					class="messageWithTime"
					scope="global"
					tag="span"
					:keypath="
						props.messageData.gift_upgradeSender
							? 'chat.subscription.sub_gift_upgrade'
							: 'chat.subscription.sub_gift_upgrade_anon'
					"
				>
					<template #USER>
						<a
							class="userlink"
							@click="
								openUserCard(props.messageData.user, props.messageData.channel_id)
							"
							>{{ props.messageData.user.displayName }}</a
						>
					</template>
					<template #GIFTER v-if="props.messageData.gift_upgradeSender">
						<a
							class="userlink"
							@click="
								openUserCard(
									props.messageData.gift_upgradeSender,
									props.messageData.channel_id,
								)
							"
							>{{ props.messageData.gift_upgradeSender.displayName }}</a
						>
					</template>
					<template #TIER>
						<strong>{{ props.messageData.tier }}</strong>
					</template>
				</i18n-t>
			</div>

			<!-- Sub and Resub -->
			<div class="holder" v-else>
				<!-- Resub -->
				<i18n-t
					class="messageWithTime"
					scope="global"
					tag="span"
					v-if="props.messageData.is_resub"
					:keypath="
						props.messageData.tier == 'prime'
							? 'chat.subscription.resub_prime'
							: 'chat.subscription.resub'
					"
				>
					<template #USER>
						<a
							class="userlink"
							@click="
								openUserCard(props.messageData.user, props.messageData.channel_id)
							"
							>{{ props.messageData.user.displayName }}</a
						>
					</template>
					<template #TIER>
						<strong>{{ props.messageData.tier }}</strong>
					</template>
				</i18n-t>

				<!-- Normal sub -->
				<i18n-t
					class="messageWithTime"
					scope="global"
					tag="span"
					v-else
					:keypath="
						props.messageData.tier == 'prime'
							? 'chat.subscription.sub_prime'
							: 'chat.subscription.sub'
					"
				>
					<template #USER>
						<a
							class="userlink"
							@click="
								openUserCard(props.messageData.user, props.messageData.channel_id)
							"
							>{{ props.messageData.user.displayName }}</a
						>
					</template>
					<template #TIER>
						<strong>{{ props.messageData.tier }}</strong>
					</template>
				</i18n-t>

				<!-- Total subscription duration of this user -->
				<i18n-t
					scope="global"
					tag="div"
					class="additional messageWithTime"
					v-if="props.messageData.totalSubDuration > 0"
					keypath="chat.subscription.sub_duration"
					:plural="props.messageData.totalSubDuration"
				>
					<template #COUNT>
						<strong>{{ formatedDuration(props.messageData.totalSubDuration) }}</strong>
						<i v-if="props.messageData.totalSubDuration > 12">
							({{
								t(
									"chat.subscription.duration_months",
									{ COUNT: props.messageData.totalSubDuration },
									props.messageData.totalSubDuration,
								)
							}})</i
						>
					</template>
				</i18n-t>

				<!-- Number of months they bought in advance -->
				<div class="additional messageWithTime" v-if="props.messageData.months > 1">
					<i18n-t
						scope="global"
						keypath="chat.subscription.sub_prepaid"
						:plural="props.messageData.months"
					>
						<template #COUNT>
							<strong>{{ formatedDuration(props.messageData.months) }}</strong>
							<i v-if="props.messageData.months > 12">
								({{
									t(
										"chat.subscription.duration_months",
										{ COUNT: props.messageData.months },
										props.messageData.months,
									)
								}})</i
							>
						</template>
					</i18n-t>
				</div>

				<!-- Sub streak -->
				<i18n-t
					scope="global"
					tag="div"
					class="additional messageWithTime"
					v-if="props.messageData.streakMonths > 1"
					keypath="chat.subscription.sub_streak"
					:plural="props.messageData.streakMonths"
				>
					<template #COUNT>
						<strong>{{ formatedDuration(props.messageData.streakMonths) }}</strong>
						<i v-if="props.messageData.streakMonths > 12">
							({{
								t(
									"chat.subscription.duration_months",
									{ COUNT: props.messageData.streakMonths },
									props.messageData.streakMonths,
								)
							}})</i
						>
					</template>
				</i18n-t>
			</div>

			<div class="quote messageWithTime" v-if="props.messageData.message">
				<ChatMessageChunksParser
					v-if="props.messageData.message_chunks"
					:chunks="props.messageData.message_chunks"
					:channel="props.messageData.channel_id"
					:platform="props.messageData.platform"
				/>
			</div>
			<MessageTranslation :messageData="props.messageData" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../Icon.vue";
import MessageTranslation from "./MessageTranslation.vue";
import ChatMessageChunksParser from "./components/ChatMessageChunksParser.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageSubscriptionData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();
const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const { t } = useI18n();
const storeCommon = useStoreCommon();
const rootEl = useTemplateRef("rootEl");
const { onContextMenu, openUserCard } = useChatMessage(props, emit, rootEl);

const classes = computed(() => {
	let res = ["chatsubscription", "chatMessage", "highlight"];
	if (props.messageData.deleted === true) res.push("deleted");
	return res;
});

const iconColor = computed(() => {
	return storeCommon.theme == "dark" ? "#1f69ff" : "#1756d3";
});

const totalSubgifts = computed(() => {
	return props.messageData.user.channelInfo[props.messageData.channel_id]!.totalSubgifts;
});

const giftRecipients = computed(() => {
	if (props.messageData.gift_recipients && props.messageData.gift_recipients?.length > 0) {
		return props.messageData.gift_recipients;
	}
	return [];
});

function formatedDuration(months: number): string {
	months ||= 1;
	const years = Math.floor(months / 12);
	months = months - years * 12;
	const chunks: string[] = [];
	if (years > 0) {
		chunks.push(t("chat.subscription.duration_years", { COUNT: years }, years));
	}
	if (months > 0) {
		chunks.push(t("chat.subscription.duration_months", { COUNT: months }, months));
	}
	return chunks.join(" " + t("global.and") + " ");
}
</script>

<style scoped lang="less">
.chatsubscription {
	& > .icon {
		color: v-bind(iconColor);
	}
	.additional {
		opacity: 0.8;
		.icon {
			margin-right: 0.25em;
			background-color: var(--color-secondary);
			color: white;
			padding: 3px;
			border-radius: 5px;
			height: 1.25em;
			vertical-align: text-bottom;
		}
	}

	.holder {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
	}
}
</style>
