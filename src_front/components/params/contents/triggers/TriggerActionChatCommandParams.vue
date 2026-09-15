<template>
	<div class="triggerActionchatcommandparams">
		<ParamItem
			noBackground
			@change="onUpdateCommand()"
			v-model="param_cmd.value"
			:paramData="param_cmd"
			:autofocus="true"
			:error="cmdNameConflict || slashCmdAlert"
			:errorMessage="
				$t(
					slashCmdAlert
						? 'triggers.actions.chat.use_slash_cmd'
						: 'triggers.actions.chat.conflict',
				)
			"
		/>

		<div class="moreOptions">
			<ToggleBlock
				class="block permissions"
				:open="false"
				:title="$t('triggers.actions.chat.allowed_users')"
				:icons="['user']"
				medium
				primary
			>
				<PermissionsForm v-model="triggerData.permissions!" />
			</ToggleBlock>

			<ToggleBlock
				class="block"
				secondary
				:icons="['params']"
				:open="false"
				:title="$t('triggers.actions.chat.advanced_params')"
				primary
				medium
			>
				<div class="advancedParams">
					<ParamItem
						secondary
						noBackground
						class="aliases"
						@change="onUpdateCommand()"
						v-model="triggerData.chatCommandAliases"
						:paramData="param_cmdAliases"
						:error="cmdAliasConflict"
						:errorMessage="$t('triggers.actions.chat.conflict')"
					/>

					<ParamItem
						secondary
						noBackground
						class="cooldown"
						:paramData="param_globalCD"
						v-model="triggerData.cooldown!.global"
					>
						<template #composite>
							<TTButton
								class="resetBt"
								icon="refresh"
								v-tooltip="$t('triggers.actions.chat.reset_cooldown_tt')"
								@click="resetCooldowns(true)"
								transparent
								light
							></TTButton>
						</template>
					</ParamItem>
					<ParamItem
						secondary
						noBackground
						class="cooldown"
						:paramData="param_userCD"
						v-model="triggerData.cooldown!.user"
					>
						<template #composite>
							<TTButton
								class="resetBt"
								icon="refresh"
								v-tooltip="$t('triggers.actions.chat.reset_cooldown_tt')"
								@click="resetCooldowns(false)"
								transparent
								light
							></TTButton>
						</template>
					</ParamItem>
					<ParamItem
						secondary
						noBackground
						class="cooldown"
						:paramData="param_alertCD"
						v-model="triggerData.cooldown!.alert"
					/>

					<TriggerActionCommandArgumentParams :triggerData="triggerData" />
				</div>
			</ToggleBlock>
		</div>
	</div>
</template>

<script setup lang="ts">
import ToggleBlock from "@/components/ToggleBlock.vue";
import TTButton from "@/components/TTButton.vue";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import { TriggerTypes, type TriggerData } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import Utils from "@/utils/Utils";
import { onBeforeMount, ref } from "vue";
import PermissionsForm from "../../../PermissionsForm.vue";
import ParamItem from "../../ParamItem.vue";
import TriggerActionCommandArgumentParams from "./TriggerActionCommandArgumentParams.vue";

const props = defineProps<{
	triggerData: TriggerData;
}>();

const storeTriggers = useStoreTriggers();

const slashCmdAlert = ref(false);
const cmdNameConflict = ref(false);
const cmdAliasConflict = ref(false);
const param_cmd = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	icon: "chatCommand",
	placeholder: "!command",
	labelKey: "triggers.actions.chat.param_cmd",
	maxLength: 100,
});
const param_cmdAliases = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "editablelist",
	value: "",
	icon: "commands",
	placeholder: "!alias",
	labelKey: "triggers.actions.chat.param_cmd_alias",
	tooltipKey: "triggers.actions.chat.param_cmd_alias_tt",
	max: 10,
	maxLength: 100,
});
const param_globalCD = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 0,
	icon: "timeout",
	min: 0,
	max: 60 * 60 * 12,
	labelKey: "triggers.actions.chat.param_globalCD",
});
const param_userCD = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 0,
	icon: "timeout",
	min: 0,
	max: 60 * 60 * 12,
	labelKey: "triggers.actions.chat.param_userCD",
});
const param_alertCD = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	icon: "whispers",
	labelKey: "triggers.actions.chat.param_alertCD",
});
onBeforeMount(() => {
	if (!props.triggerData.permissions) {
		props.triggerData.permissions = Utils.getDefaultPermissions();
	}
	if (!props.triggerData.cooldown) {
		props.triggerData.cooldown = {
			global: 0,
			user: 0,
			alert: true,
		};
	}
	if (
		!props.triggerData.chatCommandAliases ||
		typeof props.triggerData.chatCommandAliases == "string"
	) {
		props.triggerData.chatCommandAliases = [];
	}

	param_cmd.value.value = props.triggerData.chatCommand || "";
});

function onUpdateCommand(): void {
	cmdNameConflict.value = false;
	cmdAliasConflict.value = false;
	slashCmdAlert.value = param_cmd.value.value.trim().charAt(0) == "/";

	props.triggerData.chatCommand = param_cmd.value.value = param_cmd.value.value
		.trim()
		.replace(/\s+/g, "");

	//Make sure no other chat command has the same name
	const triggers = storeTriggers.triggerList;
	let aliases: string[] = [];
	if (props.triggerData.chatCommandAliases) {
		for (let i = 0; i < props.triggerData.chatCommandAliases.length; i++) {
			props.triggerData.chatCommandAliases[i] = props.triggerData.chatCommandAliases[
				i
			]!.trim()
				.replace(/\s+/g, "")
				.toLowerCase();
		}
		aliases = props.triggerData.chatCommandAliases.concat().filter((v) => v.length > 0);
	}
	const mainCmd = props.triggerData.chatCommand?.toLowerCase() || "";

	//Check if aliases contain the main command
	if (mainCmd && aliases.indexOf(mainCmd) > -1) {
		cmdAliasConflict.value = true;
		return;
	}

	//Check if any other trigger contain the same command
	let cmdListLocal = aliases.concat();
	if (mainCmd) cmdListLocal.push(mainCmd);
	for (const trigger of triggers) {
		if (trigger.type == TriggerTypes.CHAT_COMMAND && trigger.id != props.triggerData.id) {
			//Create an array with main command and aliases concatenated
			let cmdList = trigger.chatCommandAliases?.concat() ?? [];
			if (trigger.chatCommand) cmdList.push(trigger.chatCommand!);
			cmdList.map((v) => v.toLowerCase());

			//Check if trigger contains the main command of the current trigger
			if (cmdList.findIndex((v) => v === mainCmd) > -1) {
				cmdNameConflict.value = true;
			}

			//Check if trigger contains an alias of the current trigger
			for (let j = 0; j < aliases.length; j++) {
				const alias = aliases[j];
				if (alias && cmdList.findIndex((v) => v === alias) > -1) {
					cmdAliasConflict.value = true;
				}
			}
		}
	}
}

function resetCooldowns(global: boolean): void {
	if (global) {
		TriggerActionHandler.instance.resetGlobalCooldown(props.triggerData.id);
	} else {
		TriggerActionHandler.instance.resetUsersCooldown(props.triggerData.id);
	}
}
</script>

<style scoped lang="less">
.triggerActionchatcommandparams {
	display: flex;
	flex-direction: column;
	gap: 0.5em;

	.cooldown {
		:deep(input) {
			flex-basis: 100px;
		}
	}

	.aliases {
		:deep(.content) {
			.holder {
				flex-direction: row;
				.listField {
					flex-basis: 300px;
				}
			}
		}
	}
	.moreOptions {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;

		.block {
			&:not(.closed) {
				width: 100%;
			}
		}
	}
	.advancedParams {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}

	.resetBt {
		flex-grow: 0;
		flex-shrink: 0;
	}
}
</style>
