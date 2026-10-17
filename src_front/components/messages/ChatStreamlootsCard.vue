<template>
	<div
		class="chatstreamlootscard chatMessage highlight"
		ref="rootEl"
		@contextmenu="onContextMenu($event, messageData, rootEl!)"
	>
		<Icon name="streamloots" alt="streamloots" class="icon" />

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" keypath="chat.streamloots.card">
				<template #USER>
					<strong>{{ messageData.userName }}</strong>
				</template>
				<template #CARD>
					<strong>{{ messageData.cardName }}</strong>
				</template>
				<template #RARITY>
					<strong>{{ $t("chat.streamloots.rarity." + messageData.rarity) }}</strong>
				</template>
				<template #TROLL v-if="messageData.trolled || true">
					<strong>{{ $t("chat.streamloots.trolled") }}</strong>
				</template>
			</i18n-t>

			<div class="quote" v-for="(input, index) in messageData.inputs" :key="index">
				<div class="label">{{ input.label }}</div>
				<ChatMessageChunksParser :chunks="input.value_chunks" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { useTemplateRef } from "vue";
import ChatMessageChunksParser from "./components/ChatMessageChunksParser.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageStreamlootsCardData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();

const emit = defineEmits<{ onRead: [] }>();

const rootEl = useTemplateRef("rootEl");
const { onContextMenu } = useChatMessage(props, emit, rootEl);
</script>

<style scoped lang="less">
.chatstreamlootscard {
	.quote {
		margin-top: 0.5em;
		.label {
			font-size: 0.8em;
			font-style: normal;
			font-weight: bold;
			opacity: 0.7;
			margin-bottom: 0.25em;
		}
	}
}
</style>

