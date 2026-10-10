<template>
	<div
		class="chatstreamlootsevent chatMessage highlight"
		ref="rootEl"
		@contextmenu="onContextMenu($event, messageData, rootEl!)"
	>
		<Icon name="streamloots" alt="streamloots" class="icon" />

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" :keypath="labelKey" :plural="count">
				<template #USER>
					<strong>{{ messageData.userName }}</strong>
				</template>
				<template #COUNT>
					<strong>{{ count }}</strong>
				</template>
				<template
					#GIFTEE
					v-if="
						messageData.type == 'streamloots_purchase' &&
						messageData.eventType == 'gift'
					"
				>
					<strong>{{ messageData.giftee }}</strong>
				</template>
				<template #REACTION v-if="messageData.type == 'streamloots_reaction'">
					<strong>{{ messageData.reactionName }}</strong>
				</template>
				<template #EMOTE v-if="messageData.type == 'streamloots_emote'">
					<img
						v-for="(url, index) in messageData.emotes"
						:key="index"
						:src="url"
						alt="emote"
						class="emote"
						referrerpolicy="no-referrer"
						v-tooltip="
							'<img src=' +
							url.replace(/2.0$/, '3.0') +
							' width=\'150\' class=\'emote\'>'
						"
					/>
				</template>
			</i18n-t>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, useTemplateRef } from "vue";

const props = defineProps<{
	messageData:
		| TwitchatDataTypes.MessageStreamlootsPurchaseData
		| TwitchatDataTypes.MessageStreamlootsReactionData
		| TwitchatDataTypes.MessageStreamlootsEmoteData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();

const emit = defineEmits<{ onRead: [] }>();

const rootEl = useTemplateRef("rootEl");
const { onContextMenu } = useChatMessage(props, emit, rootEl);

const labelKey = computed((): string => {
	switch (props.messageData.type) {
		case "streamloots_purchase":
			return "chat.streamloots." + props.messageData.eventType;
		case "streamloots_reaction":
			return "chat.streamloots.reaction";
		case "streamloots_emote":
			return "chat.streamloots.emote";
	}
	return "";
});

/**
 * Number of packs or emotes, used for pluralization
 */
const count = computed((): number => {
	const m = props.messageData;
	if (m.type == "streamloots_emote") return m.emotes.length;
	if (m.type == "streamloots_purchase" && m.eventType != "legendary") return m.quantity;
	return 1;
});
</script>

<style scoped lang="less">
.chatstreamlootsevent {
}
</style>

