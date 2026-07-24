<template>
	<div class="pinedmessages sidePanel" ref="rootEl">
		<div class="head">
			<div class="title">
				<Icon name="save" />
				<i18n-t
					scope="global"
					tag="h1"
					keypath="pin.title"
					:plural="storeChat.savedMessages.length"
				>
					<template #COUNT>{{ storeChat.savedMessages.length }}</template>
				</i18n-t>
			</div>
			<ClearButton @click="close()" />
		</div>
		<div class="content">
			<div class="list">
				<div v-for="m in storeChat.savedMessages" :key="m.id" class="messageItem">
					<ChatMessage class="message" :messageData="m" :lightMode="true" />
					<TTButton
						:aria-label="t('pin.highlightBt_aria')"
						@click.capture="chatHighlight(m)"
						class="button"
						small
						icon="highlight"
						v-tooltip="t('pin.highlightBt_tt')"
						:loading="highlightLoading"
						:disabled="!overlayAvailable"
					/>
					<TTButton
						:aria-label="t('pin.unpinBt_aria')"
						@click="unpin(m)"
						class="button"
						small
						secondary
						highlight
						icon="delete"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useSidePanel } from "@/composables/useSidePanel";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";
import ChatMessage from "../messages/ChatMessage.vue";

const emit = defineEmits<{
	close: [];
}>();

const { t } = useI18n();
const storeChat = useStoreChat();
const storeParams = useStoreParams();
const rootEl = useTemplateRef("rootEl");
const { close } = useSidePanel(rootEl, () => emit("close"));

const overlayAvailable = ref(false);
const highlightLoading = ref(true);

onMounted(() => {
	//Check if highlight overlay exists
	Utils.getHighlightOverPresence().then((res) => {
		overlayAvailable.value = res;
		highlightLoading.value = false;
	});
});

/**
 * Removes a message from pins
 * @param m
 */
async function unpin(
	m: TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData,
): Promise<void> {
	storeChat.unsaveMessage(m);
	if (storeChat.savedMessages.length === 0) {
		close();
	}
}

/**
 * Highlights a message on dedicated overlay
 */
async function chatHighlight(
	m: TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData,
): Promise<void> {
	if (!overlayAvailable.value) {
		//Open parameters if overlay is not found
		storeParams.openParamsPage(
			TwitchatDataTypes.ParameterPages.OVERLAYS,
			TwitchatDataTypes.ParamDeepSections.HIGHLIGHT,
		);
	} else {
		highlightLoading.value = true;
		storeChat.highlightChatMessageOverlay(m);
		await Utils.promisedTimeout(1000);
		highlightLoading.value = false;
	}
}
</script>

<style scoped lang="less">
.pinedmessages {
	.content {
		.list {
			padding: 0.5em;
			max-width: 100%;

			.messageItem {
				display: flex;
				flex-direction: row;
				align-items: center;
				position: relative;
				gap: 0.25em;
				width: 100%;
				max-width: 100%;

				.message {
					flex-grow: 1;
				}

				.button {
					width: fit-content;
					min-width: fit-content;
				}
			}
		}
	}
}
</style>
