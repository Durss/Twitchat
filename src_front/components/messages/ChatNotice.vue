<template>
	<div :class="classes" ref="rootEl">
		<Icon :name="icon" :theme="theme" />
		<span class="message" v-html="message"></span>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import { storeAccessibility as useStoreAccessibility } from "@/store/accessibility/storeAccessibility";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onMounted, ref, useTemplateRef } from "vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageNoticeData;
}>();

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const storeAccessibility = useStoreAccessibility();

const rootEl = useTemplateRef("rootEl");
useChatMessage(props, emit, rootEl);

const icon = ref<string>("info");
const theme = ref<string>("secondary");

/**
 * Gets text message with parsed emotes
 */
const message = computed<string>(() => {
	let text = props.messageData.message ?? "";
	text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
	text = text.replace(/&lt;(\/)?strong&gt;/gi, "<$1strong>"); //Allow <strong> tags
	text = text.replace(/&lt;(\/)?mark&gt;/gi, "<$1mark>"); //Allow <mark> tags
	return text;
});

const classes = computed<string[]>(() => {
	let res = ["chatnotice", "chatMessage"];
	if (props.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.COMMERCIAL_ERROR)
		res.push("alert");
	if (props.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE) {
		if ((props.messageData as TwitchatDataTypes.MessageShieldMode).enabled) {
			res.push("highlight", "alert");
		} else {
			res.push("highlight", "primary");
		}
	}
	if (props.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE) {
		if ((props.messageData as TwitchatDataTypes.MessageEmergencyModeInfo).enabled) {
			res.push("highlight", "alert");
		} else {
			res.push("highlight", "primary");
		}
	}
	if (
		props.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.SUB_ONLY_OFF ||
		props.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.SLOW_MODE_OFF ||
		props.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.EMOTE_ONLY_OFF ||
		props.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.FOLLOW_ONLY_OFF
	) {
		res.push("highlight", "success");
	}
	if (
		props.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.SUB_ONLY_ON ||
		props.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.SLOW_MODE_ON ||
		props.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.EMOTE_ONLY_ON ||
		props.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.FOLLOW_ONLY_ON
	) {
		res.push("highlight", "error");
	}
	return res;
});

onMounted(() => {
	switch (props.messageData.noticeId) {
		case TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE:
			icon.value = "shield";
			theme.value = "light";
			break;
		case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE:
			icon.value = "emergency";
			theme.value = "light";
			break;
		case TwitchatDataTypes.TwitchatNoticeType.SUB_ONLY_ON:
			icon.value = "sub";
			theme.value = "light";
			break;
		case TwitchatDataTypes.TwitchatNoticeType.SUB_ONLY_OFF:
			icon.value = "sub";
			theme.value = "light";
			break;
		case TwitchatDataTypes.TwitchatNoticeType.FOLLOW_ONLY_ON:
			icon.value = "follow";
			theme.value = "light";
			break;
		case TwitchatDataTypes.TwitchatNoticeType.FOLLOW_ONLY_OFF:
			icon.value = "follow";
			theme.value = "light";
			break;
		case TwitchatDataTypes.TwitchatNoticeType.EMOTE_ONLY_ON:
			icon.value = "emote";
			theme.value = "light";
			break;
		case TwitchatDataTypes.TwitchatNoticeType.EMOTE_ONLY_OFF:
			icon.value = "emote";
			theme.value = "light";
			break;
		case TwitchatDataTypes.TwitchatNoticeType.SLOW_MODE_ON:
			icon.value = "slow";
			theme.value = "light";
			break;
		case TwitchatDataTypes.TwitchatNoticeType.SLOW_MODE_OFF:
			icon.value = "slow";
			theme.value = "light";
			break;
	}
	storeAccessibility.setAriaPolite(message.value);
});
</script>

<style scoped lang="less">
.chatnotice {
	&:not(.highlight) {
		.message {
			font-style: italic;
			font-weight: normal;
			color: var(--color-secondary);
		}
	}
}
</style>
