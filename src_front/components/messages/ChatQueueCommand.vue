<template>
	<div :class="classes">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		<Icon name="list" theme="secondary" />
		<span class="queue" v-if="queueTitle">{{queueTitle}}</span>
		<img v-if="userAvatar" :src="userAvatar" class="avatar" @click.stop="onUserClick()" />
		<a class="userlink" v-if="userName" @click.stop="onUserClick()">{{userName}}</a>
		<span class="message" v-html="message"></span>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

type QueueMessageTypes = TwitchatDataTypes.MessageQueueCommandData
	| TwitchatDataTypes.MessageQueueJoinData
	| TwitchatDataTypes.MessageQueueLeaveData
	| TwitchatDataTypes.MessageQueueMoveToProgressData
	| TwitchatDataTypes.MessageQueueCompleteData
	| TwitchatDataTypes.MessageQueuePauseData
	| TwitchatDataTypes.MessageQueueResumeData
	| TwitchatDataTypes.MessageQueueUserPickedData
	| TwitchatDataTypes.MessageQueueUserRemovedData
	| TwitchatDataTypes.MessageQueueInProgressUserRemovedData
	| TwitchatDataTypes.MessageQueueClearedData
	| TwitchatDataTypes.MessageQueueInProgressClearedData
	| TwitchatDataTypes.MessageQueueUserMovedUpData
	| TwitchatDataTypes.MessageQueueUserMovedDownData
	| TwitchatDataTypes.MessageQueueUserMovedBackData;

@Component({
	components:{},
	emits:["onRead"]
})
class ChatQueueCommand extends AbstractChatMessage {

	@Prop
	declare messageData:QueueMessageTypes;

	public get queueTitle():string {
		return this.messageData.queueTitle || "";
	}

	public get userName():string {
		if('user' in this.messageData && this.messageData.user) {
			return this.messageData.user.displayName;
		}
		return "";
	}

	public get userAvatar():string {
		if('user' in this.messageData && this.messageData.user) {
			return this.messageData.user.avatarPath || "";
		}
		return "";
	}

	public get user():TwitchatDataTypes.TwitchatUser | null {
		if('user' in this.messageData && this.messageData.user) {
			return this.messageData.user;
		}
		return null;
	}

	public onUserClick():void {
		if(this.user) {
			this.openUserCard(this.user, this.messageData.channel_id);
		}
	}

	/**
	 * Gets text message based on message type
	 */
	public get message():string {
		const type = this.messageData.type;
		let text = "";

		switch(type) {
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_JOIN: {
				const data = this.messageData as TwitchatDataTypes.MessageQueueJoinData;
				text = this.$t("chat.queue.join", { POSITION: data.position?.toString() || "?" });
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_LEAVE: {
				text = this.$t("chat.queue.leave");
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_MOVE_TO_PROGRESS: {
				text = this.$t("chat.queue.move_to_progress");
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_COMPLETE: {
				text = this.$t("chat.queue.complete");
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_COMMAND: {
				const data = this.messageData as TwitchatDataTypes.MessageQueueCommandData;
				text = data.message ?? "";
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_PAUSE: {
				text = this.$t("chat.queue.pause");
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_RESUME: {
				text = this.$t("chat.queue.resume");
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_USER_PICKED: {
				const data = this.messageData as TwitchatDataTypes.MessageQueueUserPickedData;
				text = this.$t("chat.queue.user_picked", { METHOD: data.pickMethod });
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_USER_REMOVED: {
				text = this.$t("chat.queue.user_removed");
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_CLEARED: {
				const data = this.messageData as TwitchatDataTypes.MessageQueueClearedData;
				text = this.$t("chat.queue.cleared", { COUNT: data.count?.toString() || "0" });
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_IN_PROGRESS_CLEARED: {
				const data = this.messageData as TwitchatDataTypes.MessageQueueInProgressClearedData;
				text = this.$t("chat.queue.in_progress_cleared", { COUNT: data.count?.toString() || "0" });
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_IN_PROGRESS_USER_REMOVED: {
				text = this.$t("chat.queue.in_progress_user_removed");
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_USER_MOVED_UP: {
				const data = this.messageData as TwitchatDataTypes.MessageQueueUserMovedUpData;
				text = this.$t("chat.queue.user_moved_up", { POSITION: data.newPosition?.toString() || "?" });
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_USER_MOVED_DOWN: {
				const data = this.messageData as TwitchatDataTypes.MessageQueueUserMovedDownData;
				text = this.$t("chat.queue.user_moved_down", { POSITION: data.newPosition?.toString() || "?" });
				break;
			}
			case TwitchatDataTypes.TwitchatMessageType.QUEUE_USER_MOVED_BACK: {
				const data = this.messageData as TwitchatDataTypes.MessageQueueUserMovedBackData;
				text = this.$t("chat.queue.user_moved_back", { POSITION: data.newPosition?.toString() || "?" });
				break;
			}
		}

		text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;")
		text = text.replace(/&lt;(\/)?strong&gt;/gi, "<$1strong>");//Allow <strong> tags
		text = text.replace(/&lt;(\/)?mark&gt;/gi, "<$1mark>");//Allow <mark> tags
		return text;
	}

	public get classes():string[] {
		let res = ["chatqueuecommand", "chatMessage"];
		return res;
	}

	public mounted():void {
		this.$store.accessibility.setAriaPolite(this.message);
	}
}
export default toNative(ChatQueueCommand);
</script>

<style scoped lang="less">
.chatqueuecommand{
	.icon {
		width: 1em;
		height: 1em;
		vertical-align: middle;
		opacity: 0.7;
	}

	.queue {
		margin: 0 .25em 0 .5em;
		padding: .1em .4em;
		border-radius: var(--border-radius);
		background-color: var(--color-secondary-fadest);
		color: var(--color-secondary);
		font-size: .85em;
		font-weight: normal;
		vertical-align: middle;
		display: inline-block;
		line-height: 1.2em;
	}

	.avatar {
		width: 1.2em;
		height: 1.2em;
		border-radius: 50%;
		vertical-align: middle;
		margin-left: .5em;
		cursor: pointer;
		transition: transform .1s;
		&:hover {
			transform: scale(1.1);
		}
	}

	.userlink {
		font-weight: bold;
		margin-left: .25em;
		margin-right: .25em;
		color: var(--color-secondary);
		cursor: pointer;
		text-decoration: none;
		&:hover {
			text-decoration: underline;
		}
	}

	.message {
		font-style: italic;
		color: var(--color-secondary);
		font-weight: normal;
		:deep(strong) {
			font-weight: bold;
			font-style: normal;
		}
		:deep(mark) {
			background-color: var(--color-secondary-fadest);
			color: var(--color-text);
			padding: 0 .2em;
			border-radius: .2em;
		}
	}
}
</style>