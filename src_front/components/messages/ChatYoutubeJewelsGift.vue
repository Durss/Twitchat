<template>
	<div
		class="chatyoutubesupersticker chatMessage highlight"
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
				/>{{ messageData.user.displayName }}</a
			>
			<div class="amount">
				<img src="@/assets/icons/youtube_jewels.svg" alt="jewels" class="icon" />{{
					messageData.amount
				}}
			</div>
		</div>

		<tooltip
			:content="
				'<center><img src=' + messageData.gift_url + ' width=\'200\' class=\'emote\'>'
			"
		>
			<img
				:src="messageData.gift_url"
				class="sticker"
				alt="sticker"
				v-if="messageData.gift_url"
				referrerpolicy="no-referrer"
			/>
		</tooltip>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { useTemplateRef } from "vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageYoutubeJewelsGiftData;
}>();

const emit = defineEmits<{ onRead: [] }>();

const rootEl = useTemplateRef("rootEl");
const { openUserCard, onContextMenu, getProfilePage } = useChatMessage(props, emit, rootEl);
</script>

<style scoped lang="less">
.chatyoutubesupersticker {
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
	.sticker {
		height: 3em;
	}
	.holder {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		font-weight: bold;
		align-items: flex-start;
	}

	.amount {
		gap: 0.25em;
		display: flex;
		font-size: 1.25em;
		align-items: center;
		.icon {
			height: 1em;
		}
	}
}
</style>
