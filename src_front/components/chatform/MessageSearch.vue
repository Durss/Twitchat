<template>
	<div :class="classes" ref="rootEl">
		<div class="head">
			<div class="title">
				<Icon name="search" />
				<i18n-t scope="global" tag="h1" keypath="search.title">
					<template #COUNT
						><span class="count" v-if="messages.length > 0">
							| {{ messages.length }}</span
						></template
					>
				</i18n-t>
			</div>

			<i18n-t scope="global" class="description" tag="span" keypath="search.subtitle">
				<template #SEARCH
					><span class="search">{{ search }}</span></template
				>
			</i18n-t>

			<ClearButton @click="close()" />
		</div>

		<div class="content" ref="holder">
			<div class="messages" v-if="messages.length > 0">
				<ChatMessage
					v-for="m in messages"
					class="message"
					:ref="'message_' + m.id"
					:key="m.id"
					:messageData="m"
					lightMode
					:highlightedWords="[search]"
					:enableWordHighlight="true"
				/>
			</div>

			<div class="noResult" v-if="messages.length == 0">
				{{ t("search.no_result", { SEARCH: search }) }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { useSidePanel } from "@/composables/useSidePanel";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import ChatMessage from "../messages/ChatMessage.vue";

const emit = defineEmits<{
	close: [];
}>();

const { t } = useI18n();
const storeChat = useStoreChat();
const rootEl = useTemplateRef<HTMLDivElement>("rootEl");
const holder = useTemplateRef<HTMLDivElement>("holder");
const { open, close: closePanel } = useSidePanel(rootEl, emit, false);

const search = ref<string>("");
const messages = ref<TwitchatDataTypes.MessageChatData[]>([]);

const classes = computed<string[]>(() => {
	let res = ["messagesearch", "sidePanel"];
	if (messages.value.length > 0) res.push("hasResult");
	return res;
});

onMounted(() => {
	watch(
		() => storeChat.searchMessages,
		() => {
			updateList();
		},
	);
	updateList();
	open();
});

async function close(): Promise<void> {
	storeChat.doSearchMessages("");
	closePanel();
}

async function updateList(): Promise<void> {
	if (storeChat.searchMessages.length === 0) return;

	if (search.value != storeChat.searchMessages) {
		//If search has changed clear all current results
		//to make sure items are properly updated.
		//If an item from the prev search is still there
		//with the new search, the highlight wouldn't be
		//updated if we wouldn't remove it first.
		search.value = storeChat.searchMessages;
		messages.value = [];
		await nextTick();
	}

	const list = storeChat.messages.concat();
	const result: TwitchatDataTypes.MessageChatData[] = [];
	for (const m of list) {
		if (m.type != "message") continue;
		//Remove any HTML tag to avoid wrong search results
		const text = Utils.stripHTMLTags(m.message);
		// const text = m.message.replace(/<[^>]*?>/gi, "");
		if (
			new RegExp(search.value, "gim").test(text) ||
			m.user.displayName.toLowerCase() == search.value.toLowerCase()
		) {
			result.push(m);
		}
	}
	messages.value = result;
	await nextTick();
	holder.value!.scrollTop = holder.value!.scrollHeight;
}
</script>

<style scoped lang="less">
.messagesearch {
	.count {
		font-size: 0.7em;
		font-weight: normal;
	}

	.messages {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		position: relative;
		flex-shrink: 0;

		.message {
			margin: 0.25em 0;

			&:nth-child(odd) {
				background-color: rgba(255, 255, 255, 0.05);
				&:hover {
					background-color: rgba(255, 255, 255, 0.2);
				}
			}
		}
	}

	.noResult {
		color: #ffffff;
		opacity: 0.5;
		font-size: 14px;
		font-style: italic;
		text-align: center;
	}
}
</style>
