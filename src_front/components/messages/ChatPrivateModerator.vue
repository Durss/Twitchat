<template>
	<div
		class="chatprivatemoderatorevent chatMessage highlight"
		@contextmenu="onContextMenu($event, props.messageData, rootEl!)"
		ref="rootEl"
	>
		<Icon name="mod" alt="moderator" class="icon" />

		<div class="messageHolder">
			<a
				:href="getProfilePage(props.messageData.user)"
				target="_blank"
				@click.prevent="
					openUserCard(
						props.messageData.user,
						props.messageData.channel_id,
						props.messageData.platform,
					)
				"
				data-login
				class="login bold"
				>{{ props.messageData.user.displayNameOriginal }}</a
			>

			<span
				class="login"
				v-if="toUser && toUser.id != storeAuth.twitch.user.id && toUser.temporary !== true"
				>=>
				<a
					:href="getProfilePage(toUser)"
					target="_blank"
					@click.prevent="
						openUserCard(
							toUser,
							props.messageData.channel_id,
							props.messageData.platform,
						)
					"
					data-login
					class="login bold"
					>{{ toUser.displayNameOriginal }}</a
				>
			</span>

			<span
				class="message"
				:class="{
					messageWithTime:
						props.messageData.action != 'question' &&
						!props.messageData.parentMessage &&
						!props.messageData.parentMessageFallback,
				}"
				v-if="props.messageData.message_chunks"
			>
				<ChatMessageChunksParser
					:platform="props.messageData.platform"
					:chunks="props.messageData.message_chunks"
					:channel="props.messageData.channel_id"
				/>
			</span>

			<div class="quote" v-if="props.messageData.parentMessage">
				<MessageItem
					class="message"
					disableDate
					:messageData="props.messageData.parentMessage"
					@showConversation="
						(messageData: TwitchatDataTypes.ChatMessageTypes) =>
							emit('showConversation', messageData)
					"
					@showUserMessages="
						(messageData: TwitchatDataTypes.ChatMessageTypes) =>
							emit('showUserMessages', messageData)
					"
				/>
			</div>

			<div class="quote" v-if="props.messageData.parentMessageFallback">
				<a
					v-if="fallbackParentUser"
					:href="getProfilePage(fallbackParentUser)"
					target="_blank"
					@click.prevent="
						openUserCard(
							fallbackParentUser,
							props.messageData.channel_id,
							fallbackParentUser.platform,
						)
					"
					data-login
					class="login"
					>{{ fallbackParentUser.displayName }}</a
				>

				<ChatMessageChunksParser
					:platform="props.messageData.parentMessageFallback.platform"
					:chunks="props.messageData.parentMessageFallback.message"
					:channel="props.messageData.channel_id"
				/>
			</div>
		</div>

		<div
			class="ctas"
			v-if="
				props.messageData.action == 'question' &&
				props.messageData.user.id != storeAuth.twitch.user.id &&
				props.messageData.answer == undefined
			"
		>
			<TTButton
				icon="checkmark"
				small
				primary
				:loading="loading"
				@click.prevent="answerQuestion(true)"
				>{{ t("global.yes") }}</TTButton
			>
			<TTButton
				icon="cross"
				small
				alert
				:loading="loading"
				@click.prevent="answerQuestion(false)"
				>{{ t("global.no") }}</TTButton
			>
		</div>
		<div
			class="answer"
			:class="{ rejected: props.messageData.answer === false }"
			v-if="props.messageData.answer != undefined"
		>
			<template v-if="props.messageData.answer"
				><Icon name="checkmark" /> {{ t("chat.private_mod_message.accepted") }}</template
			>
			<template v-else
				><Icon name="cross" /> {{ t("chat.private_mod_message.refused") }}</template
			>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import Database from "@/store/Database";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import { computed, defineAsyncComponent, onBeforeMount, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";
import ChatMessageChunksParser from "./components/ChatMessageChunksParser.vue";

const MessageItem = defineAsyncComponent(() => import("@/components/messages/MessageItem.vue"));

const props = defineProps<{
	messageData: TwitchatDataTypes.MessagePrivateModeratorData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
	showConversation: [message: TwitchatDataTypes.ChatMessageTypes];
	showUserMessages: [message: TwitchatDataTypes.ChatMessageTypes];
}>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeCommon = useStoreCommon();
const storeUsers = useStoreUsers();

const rootEl = useTemplateRef("rootEl");
const { onContextMenu, openUserCard, getProfilePage } = useChatMessage(props, emit, rootEl);

const loading = ref<boolean>(false);
const toUser = ref<TwitchatDataTypes.TwitchatUser | null>(null);
const fallbackParentUser = ref<TwitchatDataTypes.TwitchatUser | null>(null);

const loginsBrightnessFilter = computed((): string => {
	return storeCommon.theme == "dark" ? "none" : "brightness(80%)";
});

onBeforeMount(() => {
	toUser.value = storeUsers.getUserFrom(
		"twitch",
		props.messageData.channel_id,
		props.messageData.toChannelId,
	);
	if (!props.messageData.parentMessage && props.messageData.parentMessageFallback) {
		fallbackParentUser.value = storeUsers.getUserFrom(
			props.messageData.parentMessageFallback.platform,
			props.messageData.channel_id,
			props.messageData.parentMessageFallback.uid,
			props.messageData.parentMessageFallback.login,
		);
	}
});

async function answerQuestion(answer: boolean): Promise<void> {
	loading.value = true;
	const res = await ApiHelper.call("mod/privateMessage", "PUT", {
		messageId: props.messageData.id,
		answer: answer,
	});
	if (res.status == 200) {
		props.messageData.answer = answer;
		Database.instance.updateMessage(props.messageData);
	}
	loading.value = false;
}
</script>

<style scoped lang="less">
.chatprivatemoderatorevent {
	background-color: var(--color-text-inverse);
	@c1: #00a86520;
	@c2: #00a86530;
	background-image: repeating-linear-gradient(-45deg, @c1, @c1 20px, @c2 20px, @c2 40px);

	.messageHolder {
		align-self: flex-start;
		flex-grow: 1;
	}

	.quote {
		position: relative;
		font-style: italic;
		margin-top: 0.5em;
		.message {
			font-size: 1rem;
			:deep(.chatmessageholder) {
				border: unset !important;
				background: unset !important;
				padding: 0 !important;
			}
		}
		:deep(.login) {
			font-weight: bold;
			filter: v-bind(loginsBrightnessFilter);
		}
	}

	.login {
		cursor: pointer;
		text-decoration: none;
		text-wrap: nowrap;
		&.bold {
			font-weight: bold;
		}
		// -webkit-text-stroke: fade(#000, 50%) .25px;
		&::after {
			content: ": ";
			display: inline-block;
		}
	}

	.ctas {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.25em;
		flex-shrink: 1;
		justify-content: flex-end;
	}

	.answer {
		padding: 0.25em 0.5em;
		gap: 0.25em;
		display: flex;
		flex-direction: row;
		align-items: center;
		border-radius: var(--border-radius);
		background-color: var(--color-primary-fade);
		color: var(--color-light);
		flex-shrink: 0;
		.icon {
			height: 1em;
		}

		&.rejected {
			background-color: var(--color-alert-fade);
		}
	}
}
</style>
