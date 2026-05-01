<template>
	<div :class="classes" ref="rootEl">
		<div class="head">
			<ClearButton @click="close()" />
			<h1 class="title"><Icon name="magnet" class="icon" />{{ t("tracked.title") }}sss</h1>
		</div>

		<div class="content">
			<div class="messageList" ref="messageList" v-if="messages.length > 0">
				<MessageItem
					v-for="(m, index) in messages"
					:key="m.id"
					:messageData="m"
					:lightMode="true"
					:disableConversation="true"
					class="message"
				/>
			</div>
			<div class="messageList empty" v-else>no message</div>

			<TTButton
				class="refreshBt clearButton"
				@click="refreshMessages()"
				icon="refresh"
				:loading="refreshing"
			/>

			<div class="userlist">
				<div v-for="user in trackedUsers" :key="user.id" class="user">
					<TTButton
						small
						class="login"
						@click="selectUser(user)"
						:selected="selectedUser?.id == user.id"
						>{{ user.displayName }}</TTButton
					>
					<TTButton
						small
						class="delete"
						icon="trash"
						@click="untrackUser(user)"
						alert
					></TTButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import EventBus from "@/events/EventBus";
import GlobalEvent from "@/events/GlobalEvent";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { useSidePanel } from "@/composables/useSidePanel";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { computed, nextTick, onBeforeMount, onBeforeUnmount, ref, useTemplateRef } from "vue";
import ClearButton from "../ClearButton.vue";
import TTButton from "../TTButton.vue";
import MessageItem from "../messages/MessageItem.vue";
import { useI18n } from "vue-i18n";

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const storeChat = useStoreChat();
const storeUsers = useStoreUsers();

const rootEl = useTemplateRef("rootEl");
const messageList = useTemplateRef("messageList");

const { close } = useSidePanel(rootEl, () => emit("close"));

const refreshing = ref(false);
const selectedUser = ref<TwitchatDataTypes.TwitchatUser | null>(null);
const messages = ref<TwitchatDataTypes.ChatMessageTypes[]>([]);
const trackedUsers = ref<TwitchatDataTypes.TwitchatUser[]>([]);

const classes = computed<string[]>(() => ["trackedusers", "sidePanel"]);

function selectUser(user: TwitchatDataTypes.TwitchatUser): void {
	selectedUser.value = user;
	const uid = user.id;
	let list: TwitchatDataTypes.ChatMessageTypes[] = [];
	const messageList = storeChat.messages;
	const allowedTypes: TwitchatDataTypes.TwitchatMessageStringType[] = [
		"following",
		"message",
		"reward",
		"subscription",
		"shoutout",
		"whisper",
		"ban",
		"unban",
		"cheer",
	];
	for (const mess of messageList) {
		if (!allowedTypes.includes(mess.type)) continue;
		if (mess.type == "shoutout" && mess.user.id == uid) {
			list.push(mess);
		} else if (mess.type == "following" && mess.user.id == uid) {
			list.push(mess);
		} else if ((mess.type == "ban" || mess.type == "unban") && mess.user.id == uid) {
			list.push(mess);
		} else if ((mess.type == "message" || mess.type == "whisper") && mess.user.id == uid) {
			list.push(mess);
		} else if (mess.type == "subscription" && mess.user.id == uid) {
			list.push(mess);
		} else if (mess.type == "cheer" && mess.user.id == uid) {
			list.push(mess);
		} else if (mess.type == "reward" && mess.user.id == uid) {
			list.push(mess);
		}
		if (list.length > 100) break; //Limit to 100 for perf reasons
	}
	messages.value = list;

	nextTick().then(() => {
		scrollToBottom();
	});
}

function untrackUser(user: TwitchatDataTypes.TwitchatUser): void {
	storeUsers.untrackUser(user);
	onUpdateList();
}

const updateListHandler = (e: GlobalEvent) => onUpdateList();

onBeforeMount(() => {
	EventBus.instance.addEventListener(GlobalEvent.TRACK_USER, updateListHandler);
	onUpdateList();
	selectUser(trackedUsers.value[0]!);
});

onBeforeUnmount(() => {
	EventBus.instance.removeEventListener(GlobalEvent.TRACK_USER, updateListHandler);
});

async function refreshMessages(): Promise<void> {
	refreshing.value = true;
	await Utils.promisedTimeout(250);
	selectUser(selectedUser.value!);
	refreshing.value = false;
}

function onUpdateList(): void {
	const res = [];
	for (const u of storeUsers.users) {
		if (u.is_tracked) res.push(u);
	}
	trackedUsers.value = res;
	if (res.length == 0) {
		close();
	}
}

function scrollToBottom(): void {
	const div = messageList.value;
	if (div) div.scrollTo(0, div.scrollHeight);
}
</script>

<style scoped lang="less">
.trackedusers {
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

			.message {
				flex-shrink: 0;
			}
			.message:nth-child(odd) {
				background-color: var(--background-color-fadest);
			}

			&.empty {
				align-items: center;
				justify-content: center;
				font-style: italic;
			}
		}
		.refreshBt {
			align-self: center;
			flex-shrink: 0;
			padding-left: 0.38em;
		}
	}
}
</style>

