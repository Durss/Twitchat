<template>
	<div
		class="chatcustompowerup chatMessage highlight"
		ref="rootEl"
		@contextmenu="onContextMenu($event, props.messageData, rootEl!)"
	>
		<div class="holder">
			<Icon name="watchStreak" />
			<i18n-t scope="global" class="label" tag="span" keypath="chat.custom_power_up.message">
				<template #USER>
					<a
						class="userlink"
						@click="openUserCard(props.messageData.user, props.messageData.channel_id)"
						>{{ props.messageData.user.displayName }}</a
					>
				</template>
				<template #NAME>
					<strong>{{ props.messageData.powerUpTitle }}</strong>
				</template>
			</i18n-t>
			<div class="cost">
				{{ props.messageData.cost }} <Icon class="bitsIcon" name="bits" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { useTemplateRef } from "vue";
import Icon from "../Icon.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageTwitchCustomPowerUpData;
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
.chatcustompowerup {
	.cost {
		font-size: 1.25em;
		gap: 0.2em;
		display: flex;
		font-weight: bold;
		flex-direction: row;
		align-items: center;
		flex-shrink: 0;
		.icon {
			height: 0.9em;
		}
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
	}
}
</style>
