<template>
	<div
		:class="classes"
		@contextmenu="onContextMenu($event, props.messageData, rootEl!)"
		ref="rootEl"
	>
		<Icon name="chatCommand" class="icon" />

		<div class="content">
			<div class="textContent">
				<i18n-t scope="global" class="label" tag="span" :keypath="labelKey">
					<template #USER>
						<a
							class="userlink"
							@click="
								openUserCard(props.messageData.user, props.messageData.channel_id)
							"
							>{{ props.messageData.user.displayName }}</a
						>
					</template>
					<template #CMD>
						<strong>{{ props.messageData.command }}</strong>
					</template>
				</i18n-t>
				<div class="quote messageWithTime" v-if="props.messageData.message">
					{{ props.messageData.message }}
				</div>
			</div>

			<TTButton
				class="undoBt"
				light
				small
				alert
				icon="undo"
				v-if="canRestore"
				@click="restore()"
				>{{ t("chat_commands.feed.undoBt") }}</TTButton
			>

			<span class="restored" v-else-if="props.messageData.restored"
				><Icon name="checkmark" />{{ t("chat_commands.feed.restored") }}</span
			>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import { storeAccessibility as useStoreAccessibility } from "@/store/accessibility/storeAccessibility";
import { storeChatCommands as useStoreChatCommands } from "@/store/chat_commands/storeChatCommands";
import Database from "@/store/Database";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onMounted, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageChatCommandUpdateData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();

const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const { t } = useI18n();
const storeAccessibility = useStoreAccessibility();
const storeChatCommands = useStoreChatCommands();

const rootEl = useTemplateRef("rootEl");
const { onContextMenu, openUserCard } = useChatMessage(props, emit, rootEl);

const LABEL_KEYS: Record<TwitchatDataTypes.MessageChatCommandUpdateData["action"], string> = {
	add: "chat_commands.feed.added",
	edit: "chat_commands.feed.edited",
	remove: "chat_commands.feed.removed",
};

const labelKey = computed(() => LABEL_KEYS[props.messageData.action]);

const canRestore = computed(
	() => props.messageData.action == "remove" && props.messageData.restored !== true,
);

const classes = computed(() => {
	const res = ["chatchatcommandupdate", "chatMessage", "highlight"];
	res.push(props.messageData.action == "remove" ? "error" : "success");
	return res;
});

onMounted(() => {
	storeAccessibility.setAriaPolite(
		t(labelKey.value, {
			USER: props.messageData.user.displayName,
			CMD: props.messageData.command,
		}),
	);
});

/**
 * Restores the deleted command
 */
function restore(): void {
	if (!storeChatCommands.restoreEntry(props.messageData.entryId)) return;
	props.messageData.restored = true;
	Database.instance.updateMessage(props.messageData);
}
</script>

<style scoped lang="less">
.chatchatcommandupdate {
	.content {
		row-gap: 0.5em;
		column-gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		flex-grow: 1;
		align-items: center;
		.textContent {
			align-self: flex-start;
			flex-grow: 1;
		}
		.undoBt {
			align-self: flex-start;
			margin: 0 auto;
			flex-shrink: 0;
		}
		.restored {
			font-style: italic;
			.icon {
				height: 1em;
				margin-right: 0.25em;
				vertical-align: middle;
			}
		}
	}
}
</style>
