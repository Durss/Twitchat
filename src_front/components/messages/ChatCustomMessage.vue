<template>
	<div
		:class="classes"
		:style="styles"
		@contextmenu="onContextMenu($event, messageData, rootEl!)"
		ref="rootEl"
	>
		<div class="messageHolder">
			<div class="content">
				<Icon v-if="messageData.icon" :name="messageData.icon" />
				<span class="username" :style="userStyles" v-if="messageData.user?.name">{{
					messageData.user.name
				}}</span>
				<span class="message" v-if="messageData.message_chunks"
					><ChatMessageChunksParser :chunks="messageData.message_chunks"
				/></span>
				<span class="message" v-else-if="messageData.message">{{
					messageData.message
				}}</span>
			</div>

			<template v-if="messageData.actions">
				<Button
					v-for="action in messageData.actions"
					class="cta"
					small
					:loading="loading"
					:type="demo == false && action.actionType == 'url' ? 'link' : 'button'"
					:href="action.url"
					:target="action.urlTarget || '_blank'"
					:icon="action.icon"
					:alert="
						action.theme == 'alert' ||
						(action.theme == 'light' && messageData.style == 'error')
					"
					:light="action.theme == 'light'"
					:primary="action.theme == 'primary'"
					:secondary="action.theme == 'secondary'"
					@click.stop="onClickButton(action)"
					>{{ action.label }}</Button
				>
			</template>

			<div class="quote" v-if="messageData.quote">
				<span class="message" v-if="messageData.quote_chunks"
					><ChatMessageChunksParser :chunks="messageData.quote_chunks"
				/></span>
				<span class="message" v-else-if="messageData.quote">{{ messageData.message }}</span>
			</div>
		</div>

		<ClearButton
			class="closeBt"
			@click.stop="deleteMessage()"
			small
			v-if="messageData.canClose !== false"
		/>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import MessengerProxy from "@/messaging/MessengerProxy";
import Database from "@/store/Database";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import TriggerUtils from "@/utils/TriggerUtils";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import { gsap } from "gsap/gsap-core";
import { computed, ref, useTemplateRef, type CSSProperties } from "vue";
import ClearButton from "../ClearButton.vue";
import Icon from "../Icon.vue";
import Button from "../TTButton.vue";
import ChatMessageChunksParser from "./components/ChatMessageChunksParser.vue";

const props = withDefaults(
	defineProps<{
		messageData: TwitchatDataTypes.MessageCustomData;
		demo?: boolean;
	}>(),
	{ demo: false },
);

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const storeTriggers = useStoreTriggers();

const rootEl = useTemplateRef<HTMLElement>("rootEl");
const { onContextMenu, deleteMessage } = useChatMessage(props, emit, rootEl);

const loading = ref(false);

const classes = computed<string[]>(() => {
	const res = ["chatcustommessage", "chatMessage"];
	if (props.messageData.icon) res.push("hasIcon");
	switch (props.messageData.style) {
		case "highlight":
			res.push("highlight");
			break;
		case "error":
			res.push("highlight", "alert");
			break;
		case "warn":
			res.push("highlight", "error");
			break;
	}
	return res;
});

const styles = computed<CSSProperties>(() => {
	const res: CSSProperties = {};
	if (
		props.messageData.highlightColor &&
		props.messageData.style == "highlight" &&
		props.messageData.highlightColor != "default" &&
		props.messageData.highlightColor != "#000000" &&
		props.messageData.highlightColor?.length > 0
	) {
		res.border = "1px solid " + props.messageData.highlightColor;
		res.backgroundColor = props.messageData.highlightColor + "10";
	}
	return res;
});

const userStyles = computed<CSSProperties>(() => {
	const res: CSSProperties = {};
	if (
		props.messageData.user?.color &&
		props.messageData.user.color != "default" &&
		props.messageData.user.color.length > 0
	) {
		res.color = props.messageData.user.color;
	}
	return res;
});

async function onClickButton(
	button: NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number],
): Promise<void> {
	if (props.demo !== false) return;

	switch (button.actionType) {
		case "trigger": {
			loading.value = true;
			const trigger = storeTriggers.triggerList.find((v) => v.id == button.triggerId);
			if (trigger)
				await TriggerActionHandler.instance.executeTrigger(
					trigger,
					props.messageData,
					false,
				);
			loading.value = false;
			break;
		}
		case "message": {
			const message = await TriggerUtils.parseGlobalPlaceholders(button.message || "");
			MessengerProxy.instance.sendMessage(message);
			break;
		}
		case "discord": {
			loading.value = true;
			const message = await TriggerUtils.parseGlobalPlaceholders(button.message || "");
			try {
				const res = await ApiHelper.call(
					"discord/answer",
					"POST",
					{ message: message, data: button.data },
					false,
				);
				if (res.status == 200) {
					props.messageData.actions = [];
					Database.instance.updateMessage(props.messageData);
				} else {
					gsap.killTweensOf(rootEl.value!);
					gsap.fromTo(
						rootEl.value!,
						{ x: -5 },
						{ duration: 0.01, x: 5, clearProps: "x", repeat: 30 },
					);
					gsap.fromTo(
						rootEl.value!,
						{ y: -5 },
						{ duration: 0.02, y: 5, clearProps: "y", repeat: 15 },
					);
				}
			} catch (error) {}
			loading.value = false;
			break;
		}
		case "url":
			break; //<a> tag already handled the action
	}
}
</script>

<style scoped lang="less">
.chatcustommessage {
	position: relative;
	.messageHolder {
		overflow: hidden;
		row-gap: 0.25em;
		column-gap: 0.5em;
		display: flex;
		flex-wrap: wrap;
		flex-direction: row;
		justify-content: flex-end;
		align-items: center;
		flex-grow: 1;
		padding-right: 1.5em;
		.content {
			flex-grow: 1;
			.icon {
				height: 1em;
				margin-right: 0.25em;
				vertical-align: middle;
			}
			.username {
				color: var(--color-secondary);
				font-weight: bold;
				&::after {
					content: ":";
					margin-right: 0.25em;
					color: var(--color-text);
					font-weight: normal;
				}
			}

			.message {
				word-break: break-word;
				white-space: pre-line;
			}
			.cta {
				align-self: right;
			}
		}

		.quote {
			flex-basis: 100%;
		}
	}

	&.hasIcon {
		.messageHolder {
			.quote {
				margin-left: 1.5em;
			}
		}
	}

	&.alert {
		.messageHolder {
			.content {
				.username {
					color: var(--color-light) !important;
				}
				:deep(a) {
					color: var(--color-light) !important;
				}
				:deep(.icon) {
					color: var(--color-light) !important;
				}
			}
		}
	}
}
</style>
