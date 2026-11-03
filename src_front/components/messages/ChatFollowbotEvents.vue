<template>
	<div class="chatfollowbotevents chatMessage highlight" ref="rootEl">
		<button class="head messageWithTime" @click="expand = !expand">
			<Icon name="shield" class="icon" theme="light" />
			<Icon name="follow" class="icon" theme="light" />
			<span class="label">{{
				t("chat.followbot.title", { COUNT: props.messageData.users.length })
			}}</span>
		</button>
		<div v-if="expand" class="userList">
			<button
				class="user"
				v-for="(u, index) in props.messageData.users"
				:key="u.id"
				@click="openUserCard(u, props.messageData.channel_id)"
			>
				<span class="login">{{ u.displayName }}</span>
				<span v-if="index < props.messageData.users.length - 1">, </span>
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageFollowbotData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const { t } = useI18n();
const rootEl = useTemplateRef("rootEl");
const { openUserCard } = useChatMessage(props, emit, rootEl);

const expand = ref(false);
</script>

<style scoped lang="less">
.chatfollowbotevents {
	color: var(--color-light);
	background-color: var(--color-alert);
	flex-direction: column;
	align-items: flex-start;
	pointer-events: all;
	&:hover {
		background-color: var(--color-alert-light);
	}

	.head {
		cursor: pointer;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		width: 100%;
		text-align: left;
		.label {
			flex-grow: 1;
		}
	}

	.userList {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		cursor: pointer;
		background-color: fade(#000, 20%);
		border-radius: 0.5em;
		padding: 0.5em;
		font-size: 0.9em;
		max-height: 20vh;
		overflow-y: auto;
		margin-top: 0.5em;
		width: 100%;
		.user {
			padding: 0.25em 0.25em;
			.login {
				background-color: var(--color-dark-fadest);
				padding: 0.1em 0.25em;
				transition: background-color 0.1s;
			}
			&:nth-child(odd) {
				.login {
					background-color: var(--color-light-fadest);
				}
			}
			&:hover {
				.login {
					background-color: var(--color-dark-fade);
				}
			}
		}
	}
}
</style>
