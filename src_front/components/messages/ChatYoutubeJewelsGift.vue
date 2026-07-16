<template>
	<div
		class="chatyoutubesupersticker chatMessage highlight"
		@contextmenu="onContextMenu($event, messageData, $el)"
	>
		<Icon name="youtube" alt="notice" class="icon" />

		<img
			:src="messageData.user.avatarPath"
			class="avatar"
			alt="avatar"
			v-if="messageData.user.avatarPath"
			referrerpolicy="no-referrer"
		/>

		<div class="holder">
			<a
				class="userlink"
				:href="getProfilePage(messageData.user)"
				target="_blank"
				@click.stop.prevent="
					openUserCard(messageData.user, messageData.channel_id, messageData.platform)
				"
				>{{ messageData.user.displayName }}</a
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

<script lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { toNative, Component, Prop } from "vue-facing-decorator";
import AbstractChatMessage from "./AbstractChatMessage";
import ChatMessageChunksParser from "./components/ChatMessageChunksParser.vue";
import MessageTranslation from "./MessageTranslation.vue";

@Component({
	components: {
		MessageTranslation,
		ChatMessageChunksParser,
	},
	emits: ["onRead"],
})
class ChatYoutubeSuperSticker extends AbstractChatMessage {
	@Prop
	declare messageData: TwitchatDataTypes.MessageYoutubeJewelsGiftData;
}
export default toNative(ChatYoutubeSuperSticker);
</script>

<style scoped lang="less">
.chatyoutubesupersticker {
	.icon {
		align-self: unset;
		margin-left: 0;
	}
	.avatar {
		height: 2em;
		border-radius: 50%;
		margin-right: 0.5em;
	}
	.sticker {
		height: 3.5em;
	}
	.holder {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		font-weight: bold;
		align-items: flex-start;
	}

	.amount {
		gap: 0.25em;
		display: flex;
		font-size: 1.5em;
		align-items: center;
		.icon {
			height: 1em;
		}
	}
}
</style>
