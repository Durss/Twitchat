<template>
	<div
		class="chatgiantemote chatMessage highlight"
		ref="rootEl"
		@contextmenu="onContextMenu($event, props.messageData, rootEl!)"
	>
		<div class="holder">
			<Icon name="watchStreak" />
			<i18n-t
				scope="global"
				class="label"
				tag="span"
				keypath="chat.gigantified_emote.message"
			>
				<template #USER>
					<a
						class="userlink"
						@click="openUserCard(props.messageData.user, props.messageData.channel_id)"
						>{{ props.messageData.user.displayName }}</a
					>
				</template>
				<template #PRICE>
					<strong>{{ props.messageData.cost }}</strong>
					<Icon class="bitsIcon" name="bits" />
				</template>
			</i18n-t>
			<img
				v-if="props.messageData.emoteID"
				class="emote large"
				:src="
					'https://static-cdn.jtvnw.net/emoticons/v2/' +
					props.messageData.emoteID +
					'/default/light/3.0'
				"
				alt="emote"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { useTemplateRef } from "vue";
import Icon from "../Icon.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageTwitchGigantifiedEmoteData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const rootEl = useTemplateRef("rootEl");

const { onContextMenu, openUserCard } = useChatMessage(props, emit, rootEl);
</script>

<style scoped lang="less">
.chatgiantemote {
	.cost {
		font-size: 0.7em;
		font-style: italic;
	}

	.emote {
		height: 1.5em;
		&.large {
			display: inline-block;
			height: 3em;
		}
	}

	.holder {
		width: 100%;
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		.label {
			flex-grow: 1;
		}
		& > .icon {
			color: #5cffbe;
			width: 1.25em;
			height: 1.25em;
			margin-right: 5px;
			flex-shrink: 0;
		}
		.bitsIcon {
			width: 1em;
			height: 1em;
			margin-left: 2px;
			margin-bottom: -1px;
		}
	}
}
</style>
