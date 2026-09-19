<template>
	<div class="chatmessageclippending chatMessage highlight" ref="rootEl">
		<Icon name="clip" alt="notice" class="icon" />

		<div class="loading" v-if="loading && !error">
			<div class="message">{{ t("global.moderation_action.clip_creating") }}</div>
			<Icon name="loader" alt="loading" class="loader" />
		</div>

		<div class="holder" v-else-if="!error">
			<div class="message">{{ t("global.moderation_action.clip_created") }}</div>
			<div class="ctas">
				<TTButton
					small
					:loading="clipHighlightLoading"
					@click.stop="clipHighlight()"
					icon="highlight"
					>{{ t("global.moderation_action.clip_created_highlightBt") }}</TTButton
				>
				<TTButton
					small
					type="link"
					:href="messageData.clipUrl"
					target="_blank"
					icon="newtab"
					>{{ t("global.moderation_action.clip_created_publishBt") }}</TTButton
				>
			</div>
		</div>

		<div v-if="error" class="card-item alert">{{ t("error.clip_creation") }}</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import { useClipHighlight } from "@/composables/useClipHighlight";
import { storeAccessibility as useStoreAccessibility } from "@/store/accessibility/storeAccessibility";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageClipCreate;
}>();

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const rootEl = useTemplateRef("rootEl");
const storeAccessibility = useStoreAccessibility();
const { t } = useI18n();

const error = ref(false);
const loading = ref(true);

let interval = -1;

useChatMessage(props, emit, rootEl);

//Clip isn't loaded upfront, request it only when highlighting it.
//MP4 source is skipped as Twitch hasn't processed the clip yet
const { clipHighlightLoading, clipHighlight } = useClipHighlight(
	props,
	() => TwitchUtils.getClipById(props.messageData.clipID),
	{ fetchMp4: false },
);

onMounted(() => {
	storeAccessibility.setAriaPolite(t("global.moderation_action.clip_creating", { LINK: "" }));
	//This is a stupid solution to the fact the watcher doesn't seem to work
	//and I have no idea why :/
	interval = window.setInterval(() => {
		loading.value = props.messageData.loading;
		error.value = props.messageData.error;

		if (!loading.value) {
			clearInterval(interval);
			if (error.value) {
				storeAccessibility.setAriaPolite(t("error.clip_creation"));
			} else {
				storeAccessibility.setAriaPolite(
					t("global.moderation_action.clip_created", { LINK: "" }),
				);
			}
		}
	}, 1000);
});

onBeforeUnmount(() => {
	clearInterval(interval);
});
</script>

<style scoped lang="less">
.chatmessageclippending {
	.holder {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		flex: 1;
		.message {
			flex: 1;
		}
	}

	.ctas {
		margin-top: 0.25em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.5em;
		row-gap: 0.25em;
	}

	.loading {
		display: flex;
		flex-direction: row;
		gap: 0.5em;
		align-items: center;
		font-style: italic;
		.icon {
			height: 1em;
		}
	}
}
</style>
