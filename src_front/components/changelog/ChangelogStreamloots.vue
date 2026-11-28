<template>
	<div class="changelogstreamloots">
		<MessageItem v-if="message1" :messageData="message1" />
		<MessageItem v-if="message2" :messageData="message2" />
		<MessageItem v-if="message3" :messageData="message3" />
		<MessageItem v-if="message4" :messageData="message4" />
	</div>
</template>

<script setup lang="ts">
import { storeDebug as useStoreDebug } from "@/store/debug/storeDebug";
import MessageItem from "../messages/MessageItem.vue";
import { ref } from "vue";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes.js";

const storeDebug = useStoreDebug();

let message1 = ref<TwitchatDataTypes.MessageStreamlootsCardData | null>(null);
let message2 = ref<TwitchatDataTypes.MessageStreamlootsEmoteData | null>(null);
let message3 = ref<TwitchatDataTypes.StreamlootsPackPurchaseData | null>(null);
let message4 = ref<TwitchatDataTypes.StreamlootsPackGiftData | null>(null);

storeDebug.simulateMessage<TwitchatDataTypes.MessageStreamlootsCardData>(
	"streamloots_card",
	(m) => {
		message1.value = m;
		return true;
	},
	false,
);
storeDebug.simulateMessage<TwitchatDataTypes.MessageStreamlootsEmoteData>(
	"streamloots_emote",
	(m) => {
		message2.value = m;
		return true;
	},
	false,
);
storeDebug.simulateMessage<TwitchatDataTypes.StreamlootsPackPurchaseData>(
	"streamloots_purchase",
	(m) => {
		message3.value = m;
		return true;
	},
	false,
);
storeDebug.simulateMessage<TwitchatDataTypes.StreamlootsPackGiftData>(
	"streamloots_reaction",
	(m) => {
		message4.value = m;
		return true;
	},
	false,
);
</script>

<style scoped lang="less">
.changelogstreamloots {
	gap: 0.5em;
	display: flex;
	flex-direction: column;
	pointer-events: none;
}
</style>
