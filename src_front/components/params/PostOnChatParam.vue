<template>
	<div
		ref="rootEl"
		class="postonchatparam"
		@focus="showMessage = true"
		@blur="showMessage = false"
	>
		<ParamItem
			class="parameter"
			ref="paramItem"
			:clearToggle="clearToggle"
			:paramData="enabledParam"
			:error="error != ''"
			:errorMessage="error"
			:secondary="secondary"
			:alert="alert"
			:noBackground="noBackground"
			v-model="enabledParam.value"
		>
			<PlaceholderSelector
				class="placeholders"
				v-if="placeholderTarget && placeholders"
				v-model="textParam.value"
				:target="placeholderTarget"
				:placeholders="placeholders"
				@change="saveParams()"
			/>

			<div class="preview" ref="preview" v-if="adPreview && showMessage">
				<ChatMessage class="message" lightMode contextMenuOff :messageData="adPreview" />
			</div>

			<slot></slot>
		</ParamItem>
	</div>
</template>

<script setup lang="ts">
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import { nextTick, onBeforeMount, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import ChatMessage from "../messages/ChatMessage.vue";
import ParamItem from "./ParamItem.vue";
import PlaceholderSelector from "./PlaceholderSelector.vue";

const { t } = useI18n();
const storeChat = useStoreChat();
const storeAuth = useStoreAuth();

const props = withDefaults(
	defineProps<{
		icon?: string;
		titleKey?: string;
		noToggle?: boolean;
		clearToggle?: boolean;
		secondary?: boolean;
		alert?: boolean;
		noBackground?: boolean;
		botMessageKey?: TwitchatDataTypes.BotMessageField;
		placeholders?: TwitchatDataTypes.PlaceholderEntry[];
		text?: string;
		prefix?: string;
		enabled?: boolean;
	}>(),
	{
		titleKey: "",
		noToggle: false,
		clearToggle: false,
		secondary: false,
		alert: false,
		noBackground: false,
		text: "",
		prefix: "",
		enabled: false,
	},
);

const emit = defineEmits<{
	change: [];
	"update:text": [value: string];
	"update:enabled": [value: boolean];
}>();

const rootEl = useTemplateRef<HTMLElement>("rootEl");
const paramItem = useTemplateRef("paramItem");

const adPreview = ref<TwitchatDataTypes.MessageChatData | null>(null);
const error = ref<string>("");
const showMessage = ref<boolean>(false);
const enabledParam = ref<TwitchatDataTypes.ParameterData<boolean, unknown, string>>({
	value: false,
	type: "boolean",
});
const textParam = ref<TwitchatDataTypes.ParameterData<string>>({
	value: "",
	type: "string",
	longText: true,
	maxLength: 500,
});

const placeholderTarget = ref<HTMLTextAreaElement | null>(null);

let isFirstRender: boolean = true;
let focusHandler: (e: FocusEvent) => void;

onBeforeMount(async () => {
	if (props.botMessageKey) {
		const data = storeChat.botMessages[props.botMessageKey];
		textParam.value.value = data.message;
		enabledParam.value.value = data.enabled || props.noToggle !== false;
		if (
			props.botMessageKey == "twitchatAd" &&
			textParam.value.value.indexOf("/announce") == 0
		) {
			// Remove /announcexxx from message. It's now given as prefix prop.
			textParam.value.value = textParam.value.value.replace(/\/announce[a-z]*\s(.*)/i, "$1");
		}
	} else {
		textParam.value.value = props.text;
		enabledParam.value.value = props.enabled || props.noToggle !== false;
	}

	enabledParam.value.labelKey = props.titleKey;
	enabledParam.value.children = [textParam.value];
	enabledParam.value.noInput = props.noToggle;
	if (props.icon) {
		enabledParam.value.icon = props.icon;
	}

	focusHandler = (e: FocusEvent) => onFocus(e);
	document.addEventListener("mouseup", focusHandler);

	await nextTick();
	saveParams(false);
});

onBeforeUnmount(() => {
	document.removeEventListener("mouseup", focusHandler);
});

function onFocus(e: FocusEvent): void {
	let target = document.activeElement as HTMLElement;
	while (target != rootEl.value && target != document.body) {
		target = (target as HTMLElement).parentElement!;
	}
	showMessage.value = target == rootEl.value;
}

async function saveParams(saveToStore = true): Promise<void> {
	if (props.botMessageKey) {
		//Avoid useless save on mount
		if (saveToStore) {
			storeChat.updateBotMessage({
				key: props.botMessageKey,
				enabled: enabledParam.value.value,
				message: textParam.value.value,
			});
		}

		error.value = "";
		if (props.botMessageKey == "twitchatAd") {
			if (
				!/(^|\s|\.|,|!|:|;|\*|https?:\/\/)twitchat\.fr($|\s|\.|,|!|:|;|\*)/gi.test(
					textParam.value.value,
				)
			) {
				error.value = t("error.ad_url_required");
			}
		}
	} else if (saveToStore) {
		emit("update:text", textParam.value.value);
		emit("update:enabled", enabledParam.value.value);
		emit("change");
	}

	if (enabledParam.value.value && isFirstRender) {
		isFirstRender = false;
		await nextTick();
		placeholderTarget.value = paramItem.value!.$el.getElementsByTagName("textarea")[0];
	}
	updatePreview();
}

async function updatePreview(): Promise<void> {
	adPreview.value = null;
	await nextTick();

	const me = storeAuth.twitch.user;
	let rawMessage = (props.prefix + textParam.value.value).normalize("NFC");

	if (props.placeholders) {
		for (const p of props.placeholders) {
			if (p.private === true) continue;
			if (p.example != undefined) {
				rawMessage = rawMessage.replace(new RegExp("{" + p.tag + "}", "gi"), p.example);
			}
		}
	}

	let announcementColor: "primary" | "purple" | "blue" | "green" | "orange" | undefined =
		undefined;
	if (rawMessage.indexOf("/announce") == 0) {
		announcementColor = rawMessage.replace(/\/announce([a-z]+)?\s.*/i, "$1") as
			| "primary"
			| "purple"
			| "blue"
			| "green"
			| "orange";
		rawMessage = rawMessage.replace(/\/announce([a-z]+)?\s(.*)/i, "$2");
	}

	const chunks = TwitchUtils.parseMessageToChunks(rawMessage, undefined, true);
	const message_html = TwitchUtils.messageChunksToHTML(chunks);
	adPreview.value = {
		id: Utils.getUUID(),
		date: Date.now(),
		channel_id: me.id,
		platform: "twitch",
		type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
		answers: [],
		user: me,
		twitch_announcementColor: announcementColor,
		is_short: false,
		message: rawMessage,
		message_chunks: chunks,
		message_html,
		message_size: TwitchUtils.computeMessageSize(chunks),
	};
}

watch(
	() => textParam.value.value,
	() => saveParams(),
);
watch(
	() => enabledParam.value.value,
	() => saveParams(),
);
watch(
	() => props.placeholders,
	() => updatePreview(),
	{ deep: true },
);
</script>

<style scoped lang="less">
.postonchatparam {
	display: flex;
	flex-direction: column;
	gap: 0.5em;

	.placeholders {
		align-self: stretch;
	}

	.message {
		position: relative;
		font-size: 1em;
	}

	.preview {
		padding: 0.25em 0.5em;
		border-radius: 0.5em;
		box-sizing: border-box;
		background-color: var(--background-color-primary);
		overflow: hidden;
	}

	:deep(.errorMessage) {
		font-weight: normal;
		color: var(--color-alert);
		background-color: var(--color-light);
	}
}
</style>
