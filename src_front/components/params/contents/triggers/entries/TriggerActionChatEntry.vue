<template>
	<div class="triggeractionchatentry triggerActionForm">
		<ParamItem
			:paramData="param_message"
			v-model="action.text"
			forceChildDisplay
			:error="cmdNameConflict"
			:errorMessage="$t('triggers.actions.chat.loop')"
			chatPreview
		>
			<template #bellow_placeholders>
				<ToggleBlock
					class="commands"
					:title="$t('triggers.actions.chat.commands_list')"
					small
					:open="false"
				>
					<div
						class="cmd"
						v-for="c in sortedCommands"
						v-tooltip="$t('global.placeholder_selector_insert')"
						@click="insertCommand(c)"
						v-html="
							c.cmd
								.replace(/(\/\S+)/gi, '<mark>$1</mark>')
								.replace(/(?:\{([^}]+)\}?)/gi, ' [$1]')
						"
					></div>
				</ToggleBlock>
			</template>
		</ParamItem>

		<ParamItem
			v-if="canReply"
			:paramData="param_reply"
			v-model="action.sendAsReply"
		></ParamItem>
	</div>
</template>

<script setup lang="ts">
import ToggleBlock from "@/components/ToggleBlock.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import {
	TriggerTypes,
	type ITriggerPlaceholder,
	type TriggerActionChatData,
	type TriggerData,
	type TriggerTypesValue,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeMount, ref } from "vue";
import ParamItem from "../../../ParamItem.vue";

const props = defineProps<{
	action: TriggerActionChatData;
	triggerData: TriggerData;
}>();

const storeChat = useStoreChat();

const param_message = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	longText: true,
	value: "",
	icon: "whispers",
	maxLength: 500,
	labelKey: "triggers.actions.chat.param_message",
});
const param_reply = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "reply",
	labelKey: "triggers.actions.chat.param_reply",
});

const cmdNameConflict = computed<boolean>(() => {
	if (!props.action.text) return false;
	const cmds = props.triggerData.chatCommandAliases?.concat() ?? [];
	if (props.triggerData.chatCommand) cmds.push(props.triggerData.chatCommand);
	const cmd = props.action.text.split(" ")[0]!.toLowerCase();
	for (let i = 0; i < cmds.length; i++) {
		if (cmds[i] == cmd) return true;
	}
	return false;
});

const sortedCommands = computed<TwitchatDataTypes.CommandData[]>(() => {
	let res = storeChat.commands.filter((v) => v.twitchCmd);
	res.sort((a, b) => {
		if (a.cmd > b.cmd) return 1;
		if (a.cmd < b.cmd) return -1;
		return 0;
	});
	return res;
});

const canReply = computed<boolean>(() => {
	return (
		[
			TriggerTypes.CHAT_COMMAND,
			TriggerTypes.ANY_MESSAGE,
			TriggerTypes.FIRST_TODAY,
			TriggerTypes.FIRST_ALL_TIME,
			TriggerTypes.CHEER,
		] as TriggerTypesValue[]
	).includes(props.triggerData.type);
});

function insertCommand(cmd: TwitchatDataTypes.CommandData): void {
	param_message.value.value =
		cmd.cmd.replace(/(?:\{([^}]+)\}?)/gi, "$1") + "" + param_message.value.value;
}

onBeforeMount(() => {
	if (!props.action.text) props.action.text = "";
});

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	param_message.value.placeholderList = list;
}

useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);
</script>

<style scoped lang="less">
.triggeractionchatentry {
	.info {
		line-height: 1.25em;
	}

	.commands {
		margin-left: 1.5em;
		:deep(.content) {
			display: grid;
			grid-gap: 4px;
			background-color: transparent;
			grid-template-columns: repeat(auto-fill, minmax(max(calc(50% - 0.5em), 200px), 1fr));
		}
		.cmd {
			font-size: 0.8em;
			line-height: 1.5em;
			background-color: var(--background-color-fadest);
			padding: 0.1em;
			border-radius: 0.5em;
			cursor: pointer;
			&:hover {
				background-color: var(--color-dark-fadest);
			}
		}
	}
}
</style>
