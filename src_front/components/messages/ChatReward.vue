<template>
	<div
		:class="classes"
		@contextmenu="onContextMenu($event, props.messageData, rootEl!)"
		ref="rootEl"
	>
		<div class="holder">
			<div v-for="entry in rewardList" :key="entry.vo.id" class="item">
				<img
					:src="getIcon(entry.vo)"
					alt="reward"
					class="icon"
					:style="{ backgroundColor: entry.vo.reward.color }"
				/>

				<TTButton
					v-if="entry.vo.message_html == undefined && getCanRefund()"
					@click="refund()"
					v-tooltip="
						entry.count > 1 ? t('chat.reward.refundOne_tt') : t('chat.reward.refund_tt')
					"
					class="refundBt"
					icon="refundPoints"
				></TTButton>

				<span class="card-item secondary count" v-if="entry.count > 1"
					>x{{ entry.count }}</span
				>

				<i18n-t
					scope="global"
					tag="span"
					keypath="chat.reward.message"
					class="messageWithTime"
				>
					<template #USER>
						<a
							class="userlink"
							@click="
								openUserCard(props.messageData.user, props.messageData.channel_id)
							"
							>{{ entry.vo.user.displayName }}</a
						>
					</template>
					<template #REWARD>
						<strong>{{ entry.vo.reward.title }}</strong>
					</template>
					<template #COST>
						<span class="cost" v-if="entry.vo.reward.cost > 0"
							>({{ entry.vo.reward.cost }}pts)</span
						>
					</template>
				</i18n-t>

				<div class="quote messageWithTime" v-if="showQuote(entry)">
					{{ entry.vo.reward.description }}
				</div>
			</div>

			<div class="prompt quote messageWithTime" v-if="props.messageData.message_html">
				<TTButton
					v-if="getCanRefund(props.messageData)"
					@click="refund(props.messageData)"
					v-tooltip="t('chat.reward.refund_tt')"
					class="refundBt"
					icon="refundPoints"
				></TTButton>
				<ChatMessageChunksParser
					v-if="props.messageData.message_chunks"
					:chunks="props.messageData.message_chunks"
					:channel="props.messageData.channel_id"
					:platform="props.messageData.platform"
				/>
			</div>
			<div
				class="prompt quote messageWithTime"
				v-if="props.childrenList"
				v-for="child in props.childrenList.filter((v) => v.message_html != undefined)"
				:key="child.id"
			>
				<TTButton
					v-if="getCanRefund(child)"
					@click="refund(child)"
					v-tooltip="t('chat.reward.refund_tt')"
					class="refundBt"
					icon="refundPoints"
				></TTButton>
				<ChatMessageChunksParser
					v-if="child.message_chunks"
					:chunks="child.message_chunks"
					:channel="child.channel_id"
					:platform="child.platform"
				/>
			</div>
			<MessageTranslation class="messageWithTime" :messageData="props.messageData" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { asset } from "@/composables/useAsset";
import { useChatMessage } from "@/composables/useChatMessage";
import Database from "@/store/Database";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import TTButton from "../TTButton.vue";
import MessageTranslation from "./MessageTranslation.vue";
import ChatMessageChunksParser from "./components/ChatMessageChunksParser.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageRewardRedeemData;
	childrenList?: TwitchatDataTypes.MessageRewardRedeemData[];
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();
const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeCommon = useStoreCommon();
const storeParams = useStoreParams();
const { getAsset } = asset();
const rootEl = useTemplateRef("rootEl");
const { copyJSON, onContextMenu, openUserCard } = useChatMessage(props, emit, rootEl, {
	copyJSON: copyJSONOverride,
});

const refundableIds = ref<{ [key: string]: TwitchDataTypes.Reward }>({});

const rewardList = computed(() => {
	const res = [props.messageData];
	if (props.childrenList) res.push(...props.childrenList);

	const idCountDictionary: { [key: string]: number } = {};

	res.forEach((r) => {
		const id = r.reward.id;
		idCountDictionary[id] = (idCountDictionary[id] || 0) + 1;
	});

	const finalList: { count: number; vo: TwitchatDataTypes.MessageRewardRedeemData }[] =
		Object.keys(idCountDictionary).map((id) => {
			return { count: idCountDictionary[id]!, vo: res.find((r) => r.reward.id === id)! };
		});

	finalList.sort((a, b) => {
		// if(a.count != b.count) return b.count - a.count;
		return a.vo.date - b.vo.date;
	});
	return finalList;
});

const classes = computed(() => {
	let res = ["chatreward", "chatMessage", "highlight"];
	if (props.messageData.deleted === true) res.push("deleted");
	return res;
});

function showQuote(entry: (typeof rewardList.value)[number]): boolean {
	return storeParams.appearance.showRewardsInfos.value === true && !!entry.vo.reward.description;
}

function getIcon(message: TwitchatDataTypes.MessageRewardRedeemData): string {
	let icon = getAsset("icons/channelPoints.svg");
	const img = message.reward.icon;
	icon = img.hd || img.sd || icon;
	return icon;
}

function getCanRefund(message?: TwitchatDataTypes.MessageRewardRedeemData): boolean {
	if (!message) {
		const list = [props.messageData];
		if (props.childrenList) list.push(...props.childrenList);
		message = list.find((v) => v.refund !== true);
	}
	if (!message) return false;
	return (
		refundableIds.value[message.reward.id] != undefined &&
		!refundableIds.value[message.reward.id]!.should_redemptions_skip_request_queue &&
		message.redeemId != undefined &&
		message.refund !== true
	);
}

onMounted(() => {
	if (props.messageData.channel_id == storeAuth.twitch.user.id) {
		TwitchUtils.getRewards(false, true).then((res) => {
			res.forEach((v) => (refundableIds.value[v.id] = v));
		});
	}
});

async function refund(message?: TwitchatDataTypes.MessageRewardRedeemData): Promise<void> {
	if (!message) {
		const list = [props.messageData];
		if (props.childrenList) list.push(...props.childrenList);
		message = list.find((v) => v.refund !== true);
	}
	if (!message || !message.redeemId) return;
	if ((await TwitchUtils.refundRedemptions([message.redeemId], message.reward.id)) != true) {
		storeCommon.alert(t("error.rewards.refund_redemption"));
	}
	message.refund = true;
	Database.instance.updateMessage(message);
}

function copyJSONOverride(): void {
	copyJSON();
	console.log(rewardList.value.length);
	console.log(props.childrenList);
}
</script>

<style scoped lang="less">
.chatreward {
	.cost {
		font-size: 0.7em;
		font-style: italic;
	}

	.icon {
		border-radius: var(--border-radius);
		padding: 0.25em;
		height: 2em;
		width: 2em;
		flex-shrink: 0;
		vertical-align: middle;
		margin-right: 5px;
	}

	.refundBt {
		vertical-align: middle;
		margin-right: 5px;
	}

	.count {
		padding: 3px;
		margin-right: 5px;
	}

	.item:not(:last-child) {
		margin-bottom: 1px;
	}

	.prompt {
		margin-top: 0.25em;
	}
}
</style>
