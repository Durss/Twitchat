<template>
	<div
		class="chatyoutubesupersticker chatMessage highlight"
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
				/>{{ messageData.user.displayName }}</a
			>
			<div class="amount">{{ messageData.amountDisplay }}</div>
		</div>

		<tooltip
			:content="
				'<center><img src=' + messageData.sticker_url + ' width=\'200\' class=\'emote\'>'
			"
		>
			<img
				:src="messageData.sticker_url"
				class="sticker"
				alt="sticker"
				v-if="messageData.sticker_url"
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
	messageData: TwitchatDataTypes.MessageYoutubeSuperStickerData;
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

	a {
		color: #000000;
	}

	.amount {
		font-size: 1.25em;
	}

	&.tier_1 {
		font-weight: normal;
		color: #000;
		background-color: #1e88e5;
	}
	&.tier_2 {
		font-weight: normal;
		color: #000;
		background-color: #00e5ff;
	}
	&.tier_3 {
		font-weight: normal;
		color: #000;
		background-color: #1de9b6;
	}
	&.tier_4 {
		font-weight: normal;
		color: #000;
		background-color: #ffca28;
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
