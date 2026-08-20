<template>
	<div
		class="chatyoutubesuperchat chatMessage highlight"
		:class="'tier_' + Math.min(7, messageData.tier)"
		ref="rootEl"
		@contextmenu="onContextMenu($event, messageData, rootEl!)"
	>
		<Icon name="youtube" alt="notice" class="icon" />

		<div class="holder">
			<a
				class="userlink"
				:href="getProfilePage(messageData.user)"
				target="_blank"
				@click.stop.prevent="
					openUserCard(messageData.user, messageData.channel_id, messageData.platform)
				"
			>
				<img
					:src="messageData.user.avatarPath"
					class="avatar"
					alt="avatar"
					v-if="messageData.user.avatarPath"
					referrerpolicy="no-referrer"
				/>
				{{ messageData.user.displayName }}</a
			>

			<div class="quote" v-if="messageData.message_chunks">
				<ChatMessageChunksParser
					:chunks="messageData.message_chunks"
					:channel="messageData.channel_id"
					:platform="messageData.platform"
				/>
			</div>
			<MessageTranslation :messageData="messageData" />
		</div>

		<div class="amount">{{ messageData.amountDisplay }}</div>

		<div class="fill" ref="fill" v-if="messageData.tier > 2"></div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { onMounted, useTemplateRef } from "vue";
import ChatMessageChunksParser from "./components/ChatMessageChunksParser.vue";
import MessageTranslation from "./MessageTranslation.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageYoutubeSuperChatData;
}>();

const emit = defineEmits<{ onRead: [] }>();

const rootEl = useTemplateRef("rootEl");
const fill = useTemplateRef("fill");
const { openUserCard, onContextMenu, getProfilePage } = useChatMessage(props, emit, rootEl);

onMounted(() => {
	if (!fill.value) return;

	const duration_m = Math.min(
		300,
		[0, 0, 2, 5, 10, 30, 60, 120, 180, 240, 300][props.messageData.tier - 1]!,
	);

	const duration_s = duration_m * 60;
	const remainingDuration = Math.max(
		0,
		duration_s - (Date.now() - props.messageData.date) / 1000,
	);
	fill.value.style.transition = "transform " + remainingDuration + "s linear";
	fill.value.style.transform = "scaleX(100%)";
	window.setTimeout(() => {
		if (!fill.value) return;
		fill.value.style.transform = "scaleX(0)";
	}, 100);
});
</script>

<style scoped lang="less">
.chatyoutubesuperchat {
	@border: 0.25em;
	overflow: hidden;
	position: relative;
	flex-wrap: wrap;
	row-gap: 0.25em;

	.icon {
		align-self: unset;
		margin-left: 0;
	}
	.avatar {
		height: 1.25em;
		flex-shrink: 0;
		border-radius: 50%;
		margin-right: 0.25em;
		vertical-align: middle;
	}
	.holder {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		flex-grow: 1;
		flex-basis: 150px;
		min-width: 0;
		max-width: 100%;
	}

	a {
		color: #000000;
	}

	.userlink {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.quote {
		color: inherit;
		word-break: break-word;
		:deep(a) {
			color: inherit;
			font-weight: bold;
			word-break: break-all;
		}
	}

	.fill {
		background-color: rgba(255, 255, 255, 0.9);
		position: absolute;
		bottom: 0;
		left: 0;
		height: @border;
		width: 100%;
		transition: transform 10s;
		will-change: transform;
		transform-origin: left top;
	}

	.amount {
		font-weight: bold;
		font-size: 1.25em;
		margin: auto;
		white-space: nowrap;
	}

	&.tier_1 {
		font-weight: normal;
		color: #000;
		background-color: #1e88e5;
		a:hover {
			background-color: var(--color-light-fade);
		}
	}
	&.tier_2 {
		font-weight: normal;
		color: #000;
		background-color: #00e5ff;
		a:hover {
			background-color: var(--color-light-fade);
		}
	}
	&.tier_3 {
		font-weight: normal;
		color: #000;
		background-color: #1de9b6;
		a:hover {
			background-color: var(--color-light-fade);
		}
	}
	&.tier_4 {
		font-weight: normal;
		color: #000;
		background-color: #ffca28;
		a:hover {
			background-color: var(--color-light-fade);
		}
	}
	&.tier_5 {
		a {
			color: #ffffff;
		}
		background-color: #e91e63;
	}
	&.tier_6 {
		a {
			color: #ffffff;
		}
		background-color: #e91e63;
	}
	&.tier_7 {
		a {
			color: #ffffff;
		}
		background-color: #e62117;
	}
}
</style>
