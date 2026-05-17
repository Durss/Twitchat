<template>
	<div class="triggeractionslashcommandparams">
		<ParamItem
			noBackground
			@change="onUpdateCommand()"
			:paramData="param_command"
			:autofocus="true"
			:error="cmdNameConflict || formatError"
			:errorMessage="
				cmdNameConflict
					? $t('triggers.actions.chat.conflict')
					: formatError
						? $t('triggers.slash_cmd.format_error')
						: ''
			"
		/>
		<ParamItem
			noBackground
			:paramData="param_addToContextMenu"
			v-model="triggerData.addToContextMenu"
		/>
		<ParamItem
			v-if="$store.discord.discordLinked"
			noBackground
			:paramData="param_addToDiscord"
			v-model="triggerData.addToDiscord"
		>
			<ToggleBlock
				class="parameter-child"
				:title="$t('triggers.slash_cmd.grant_discord_rights')"
				:icons="['lock_fit']"
				:open="false"
				small
			>
				<img src="/discord/command_permissions.gif" class="grantAccessTutorial" />
			</ToggleBlock>
		</ParamItem>

		<TriggerActionCommandArgumentParams :triggerData="triggerData" />
	</div>
</template>

<script setup lang="ts">
import { TriggerTypes, type TriggerData } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { onBeforeMount, ref } from "vue";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import ParamItem from "../../ParamItem.vue";
import TriggerActionCommandArgumentParams from "./TriggerActionCommandArgumentParams.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";

const storeTriggers = useStoreTriggers();
const storeChat = useStoreChat();

const props = defineProps<{
	triggerData: TriggerData;
}>();

const formatError = ref(false);
const cmdNameConflict = ref(false);
const param_command = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	icon: "commands",
	labelKey: "triggers.slash_cmd.param_cmd",
	placeholderKey: "triggers.slash_cmd.param_cmd_placeholder",
});
const param_addToContextMenu = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "rightClick",
	labelKey: "triggers.slash_cmd.param_ctx_menu",
});
const param_addToDiscord = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "discord",
	labelKey: "triggers.slash_cmd.param_discord",
});

onBeforeMount(() => {
	if (!props.triggerData.chatCommand) props.triggerData.chatCommand = "";
	param_command.value.value = props.triggerData.chatCommand;
	if (!props.triggerData.addToDiscord) props.triggerData.addToDiscord = false;
	if (!props.triggerData.addToContextMenu) props.triggerData.addToContextMenu = false;
});

function onUpdateCommand(): void {
	cmdNameConflict.value = false;

	props.triggerData.chatCommand = param_command.value.value = param_command.value.value
		.trim()
		.replace(/\s+/g, "");

	//Make sure no other chat command has the same name
	const triggers = storeTriggers.triggerList;
	const mainCmd = props.triggerData.chatCommand?.toLowerCase() || "";

	formatError.value = mainCmd.indexOf("/") != 0;

	//Check if any other trigger contain the same command
	for (const trigger of triggers) {
		if (
			trigger.type == TriggerTypes.SLASH_COMMAND &&
			trigger.id != props.triggerData.id &&
			trigger.chatCommand
		) {
			//Check if there's a command conflict
			if (trigger.chatCommand?.toLowerCase() === mainCmd) {
				cmdNameConflict.value = true;
				break;
			}
		}
	}

	//Check if a global slash command exists with the same name
	const globalCmds = storeChat.commands;
	for (const entry of globalCmds) {
		if (entry.cmd.split(" ")[0]!.toLowerCase() === mainCmd) {
			cmdNameConflict.value = true;
			break;
		}
	}
}
</script>

<style scoped lang="less">
.triggeractionslashcommandparams {
	display: flex;
	flex-direction: column;
	gap: 0.5em;

	.grantAccessTutorial {
		width: 100%;
		max-width: 100%;
	}
}
</style>
