<template>
	<div :class="classes" @contextmenu="onContextMenu($event, messageData, rootEl!)" ref="rootEl">
		<Icon name="raid" alt="raid" class="icon" />

		<div class="messageHolder">
			<i18n-t
				scope="global"
				class="message"
				tag="span"
				keypath="chat.raid.text"
				:plural="showCount ? messageData.viewers : 2"
			>
				<template #USER>
					<a
						class="userlink"
						@click.stop="openUserCard(messageData.user, messageData.channel_id)"
						>{{ messageData.user.displayName }}</a
					>
				</template>
				<template #COUNT>
					<strong @click.stop="showCount = !showCount" v-if="showCount">{{
						messageData.viewers
					}}</strong>
					<mark class="censored" @click.stop="showCount = !showCount" v-else>???</mark>
				</template>
			</i18n-t>

			<div
				class="streamInfo"
				v-if="
					storeParams.appearance.showRaidStreamInfo.value == true &&
					(messageData.stream.title || messageData.stream.category)
				"
			>
				<div class="infos">
					<div class="title quote">
						<span>{{ messageData.stream.title }}</span>
						<div class="details">
							<p class="category" v-if="messageData.stream.category">
								{{ messageData.stream.category }}
							</p>
							<div class="duration" v-if="messageData.stream.wasLive">
								<Icon name="timer" class="icon" />{{ formattedDuration }}
							</div>
							<div
								class="offline"
								v-else
								v-tooltip="
									t('chat.raid.offline_tt', {
										USER: messageData.user.displayNameOriginal,
									})
								"
							>
								<Icon name="cross" class="icon" /> {{ t("chat.raid.offline") }}
							</div>
						</div>
					</div>
				</div>

				<TTButton
					@click.stop="shoutout()"
					small
					icon="shoutout"
					:loading="shoutoutLoading"
					class="soButton"
					v-if="showSOButton"
					>{{ t("chat.soBt") }}</TTButton
				>
			</div>

			<TTButton
				v-else-if="showSOButton"
				@click.stop="shoutout()"
				small
				icon="shoutout"
				:loading="shoutoutLoading"
				class="soButton"
				>{{ t("chat.soBt") }}</TTButton
			>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { toast } from "@/utils/toast/toast";
import { computed, onBeforeMount, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import TTButton from "../TTButton.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageRaidData;
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
const storeUsers = useStoreUsers();

const rootEl = useTemplateRef<HTMLElement>("rootEl");
const { openUserCard, onContextMenu } = useChatMessage(props, emit, rootEl);

const shoutoutLoading = ref(false);
const showCount = ref(false);
const showSOButton = ref(false);
const formattedDuration = ref("");

const classes = computed<string[]>(() => {
	const res = ["chatraid", "chatMessage", "highlight"];
	if (storeParams.appearance.showRaidStreamInfo.value !== true) {
		res.push("rowMode");
	}
	return res;
});

const iconColor = computed<string>(() => {
	return storeCommon.theme == "dark" ? "#ebeb00" : "#949400";
});

onBeforeMount(() => {
	showCount.value = storeParams.appearance.showRaidViewersCount.value !== false;
	formattedDuration.value = Utils.formatDuration(props.messageData.stream.duration);
	showSOButton.value =
		storeAuth.twitch.user.channelInfo[props.messageData.channel_id]?.is_moderator === true;
});

async function shoutout(): Promise<void> {
	shoutoutLoading.value = true;
	try {
		await storeUsers.shoutout(props.messageData.channel_id, props.messageData.user);
	} catch (error) {
		toast(t("error.shoutout"));
		console.log(error);
	}
	shoutoutLoading.value = false;
}
</script>

<style scoped lang="less">
.chatraid {
	& > .icon {
		color: v-bind(iconColor);
	}
	.messageHolder {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		flex-grow: 1;
		gap: 0.25em;
	}

	.censored {
		cursor: pointer;
	}

	&.rowMode {
		.messageHolder {
			flex-wrap: wrap;
			flex-direction: row;
			gap: 1em;
			.message {
				flex-grow: 1;
				flex-basis: 150px;
			}

			.soButton {
				flex-shrink: 0;
			}
		}
	}
}
</style>
