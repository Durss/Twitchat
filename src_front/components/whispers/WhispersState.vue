<template>
	<div class="whispersstate sidePanel" ref="rootEl">
		<div class="head">
			<ClearButton @click="close" />
			<h1 class="title" v-if="isConversation">
				<img
					:src="getCorrespondant(selectedUserId).avatarPath"
					v-if="getCorrespondant(selectedUserId).avatarPath"
					class="icon"
				/>{{ t("whispers.title") }} - {{ getCorrespondant(selectedUserId).displayName }}
			</h1>
		</div>

		<div class="content" v-if="isConversation">
			<div class="messageList" ref="messageList">
				<div
					v-for="m in storeChat.whispers[selectedUserId]!.messages"
					:key="m.id"
					:class="messageClasses(m)"
				>
					<span class="chatMessageTime" v-if="storeParams.appearance.displayTime.value">{{
						getTime(m)
					}}</span>
					<div class="text">
						<ChatMessageChunksParser
							:chunks="m.message_chunks"
							:channel="m.channel_id"
							:platform="m.platform"
						/>
					</div>
				</div>
			</div>

			<div v-if="error" class="errorCard" @click="error = false">
				{{ t("whispers.cant_send_1") }}
				<br />
				{{ t("whispers.cant_send_2") }}
			</div>

			<form class="form" @submit.prevent="sendWhisper()" v-if="canAnswer">
				<input
					type="text"
					:placeholder="t('whispers.input_placeholder')"
					class="dark"
					v-model="whisper"
					maxlength="500"
					v-autofocus
				/>
				<TTButton class="submit" type="submit" icon="checkmark" :disabled="!whisper" />
			</form>
			<TTButton v-else small highlight icon="unlock" @click="requestTwitchScope()">{{
				t("whispers.add_scope_bt")
			}}</TTButton>

			<div class="userlist" v-if="Object.keys(storeChat.whispers).length > 0">
				<div v-for="(whispers, key) in storeChat.whispers" :key="key" class="user">
					<TTButton
						small
						class="login"
						@click="selectedUserId = <string>key"
						:selected="selectedUserId == key"
						>{{ getCorrespondant(key).displayName }}</TTButton
					>
					<TTButton
						small
						class="delete"
						icon="trash"
						@click="deleteWhispers(<string>key)"
						alert
					></TTButton>
				</div>
			</div>
		</div>

		<div class="content" v-else></div>
	</div>
</template>

<script setup lang="ts">
import { useSidePanel } from "@/composables/useSidePanel";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeMain as useStoreMain } from "@/store/storeMain";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { computed, nextTick, onBeforeMount, ref, useTemplateRef, watch } from "vue";
import ClearButton from "../ClearButton.vue";
import TTButton from "../TTButton.vue";
import ChatMessageChunksParser from "../messages/components/ChatMessageChunksParser.vue";
import { useI18n } from "vue-i18n";

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const storeChat = useStoreChat();
const storeAuth = useStoreAuth();
const storeMain = useStoreMain();
const storeParams = useStoreParams();

const rootEl = useTemplateRef("rootEl");
const messageList = useTemplateRef("messageList");

const { close } = useSidePanel(rootEl, () => emit("close"));

const error = ref(false);
const whisper = ref<string | null>(null);
const selectedUserId = ref("");

const canAnswer = computed((): boolean => TwitchUtils.hasScopes([TwitchScopes.WHISPER_MANAGE]));

const isConversation = computed((): boolean => Object.keys(storeChat.whispers).length > 0);

function getCorrespondant(uid: string): TwitchatDataTypes.TwitchatUser {
	const whispers = storeChat.whispers[uid]!;
	const me = storeAuth.twitch.user.id;
	return whispers.to.id == me ? whispers.from : whispers.to;
}

onBeforeMount(() => {
	selectedUserId.value = Object.keys(storeChat.whispers)[0]!;
	storeChat.whispersUnreadCount = 0;

	if (
		storeMain.tempStoreValue &&
		typeof storeMain.tempStoreValue === "object" &&
		"type" in storeMain.tempStoreValue &&
		storeMain.tempStoreValue.type == "user"
	) {
		const data = storeMain.tempStoreValue as {
			type: string;
			user: TwitchatDataTypes.TwitchatUser;
		};
		selectedUserId.value = data.user.id;
		storeMain.tempStoreValue = null;
	}

	watch(
		() => selectedUserId.value,
		async () => {
			//Force scroll for a few frames in case there are
			//emotes to be loaded. If we were not waiting for this
			//the scroll might to be at the bottom
			for (let i = 0; i < 10; i++) {
				await nextTick();
				scrollToBottom();
			}
		},
	);
});

function messageClasses(whisper: TwitchatDataTypes.MessageWhisperData): string[] {
	let classes: string[] = ["message"];
	if (whisper.user.id == storeAuth.twitch.user.id) classes.push("isMe");
	return classes;
}

function getTime(whisper: TwitchatDataTypes.MessageWhisperData): string {
	const d = new Date(whisper.date);
	return Utils.toDigits(d.getHours()) + ":" + Utils.toDigits(d.getMinutes());
}

function requestTwitchScope(): void {
	storeAuth.requestTwitchScopes([TwitchScopes.WHISPER_MANAGE]);
}

async function sendWhisper(): Promise<void> {
	if (!whisper.value || !selectedUserId.value) return;

	error.value = false;

	try {
		await TwitchUtils.whisper(whisper.value, undefined, selectedUserId.value);
	} catch (e) {
		error.value = true;
	}
	scrollToBottom();

	whisper.value = "";
}

function deleteWhispers(uid: string): void {
	storeChat.closeWhispers(uid);
	if (selectedUserId.value == uid && isConversation.value) {
		selectedUserId.value = Object.keys(storeChat.whispers)[0]!;
	}
	if (!isConversation.value) close();
}

function scrollToBottom(): void {
	const div = messageList.value!;
	div.scrollTo(0, div.scrollHeight);
}
</script>

<style scoped lang="less">
.whispersstate {
	.head > .title > .icon {
		border-radius: 50%;
	}
	.content {
		padding-right: 5px;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		width: 100%;
		margin: auto;

		.userlistToggle {
			width: 100%;
		}

		.userlist {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			gap: 10px;
			flex-shrink: 0;
			.user {
				display: flex;
				flex-direction: row;
				.login {
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
				}
				.delete {
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
					padding: 0 0.5em;
				}
			}
		}

		.messageList {
			overflow-y: auto;
			display: flex;
			flex-direction: column;
			flex-grow: 1;
			gap: 0.5em;

			.message {
				display: flex;
				flex-direction: row;
				align-items: baseline;
				align-self: flex-start;
				position: relative;
				padding: 0.5em;
				line-height: 1.25em;
				// width: auto;
				max-width: 80%;
				border-radius: 0.5em;
				font-size: var(--messageSize);
				color: var(--color-text);
				background-color: var(--color-primary-fadest);
				flex-shrink: 0;

				.chatMessageTime + * {
					padding-left: 3em;
				}

				.text {
					word-break: break-word;
				}

				&.isMe {
					flex-direction: row-reverse;
					align-self: flex-end;
					margin-right: 0;
					background-color: var(--color-secondary-fadest);

					.chatMessageTime + * {
						padding-left: 0;
						padding-right: 3em;
					}
				}

				:deep(.emote) {
					max-height: 2em;
					vertical-align: middle;
					object-fit: fill;
				}
			}
		}

		form {
			gap: 0;
			flex-direction: row;
			align-items: stretch;
			flex-shrink: 0;
			input {
				flex-grow: 1;
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
			.submit {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
			}
		}
	}
}
</style>
