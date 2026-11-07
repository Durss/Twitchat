<template>
	<div class="chatcommandentryform">
		<ParamItem
			:paramData="param_name"
			v-model="entry.command.name"
			:error="conflict != null"
			:errorMessage="t('chat_commands.form.conflict', { CMD: conflict })"
			@change="onChangeCommand()"
		/>

		<ParamItem
			:paramData="param_automatic"
			v-model="entry.schedule.enabled"
			@change="emit('change')"
		/>

		<ParamItem
			:paramData="param_message"
			v-model="entry.message"
			chatPreview
			@change="emit('change')"
		/>

		<ToggleBlock
			v-if="hasCommand || entry.schedule.enabled"
			:open="false"
			:title="t('global.advanced_params')"
			:icons="['params']"
			medium
			primary
		>
			<div class="children">
				<template v-if="hasCommand">
					<ParamItem
						noBackground
						class="aliases"
						:paramData="param_aliases"
						v-model="entry.command.aliases"
						@change="onChangeCommand()"
					/>

					<ParamItem
						noBackground
						premium
						:paramData="param_remoteChans"
						v-model="entry.command.remoteChans"
						@change="emit('change')"
						class="premiumOption"
					/>

					<ToggleBlock
						:open="false"
						:title="t('chat_commands.form.allowed_users')"
						:icons="['user']"
						medium
					>
						<PermissionsForm
							v-model="entry.command.permissions"
							@change="emit('change')"
						/>
					</ToggleBlock>

					<ParamItem
						noBackground
						class="cooldown"
						:paramData="param_globalCD"
						v-model="entry.command.cooldown.global"
						@change="emit('change')"
					>
						<template #composite>
							<TTButton
								class="resetBt"
								icon="refresh"
								v-tooltip="t('triggers.actions.chat.reset_cooldown_tt')"
								@click="resetCooldowns(true)"
								transparent
								light
							/>
						</template>
					</ParamItem>
					<ParamItem
						noBackground
						class="cooldown"
						:paramData="param_userCD"
						v-model="entry.command.cooldown.user"
						@change="emit('change')"
					>
						<template #composite>
							<TTButton
								class="resetBt"
								icon="refresh"
								v-tooltip="t('triggers.actions.chat.reset_cooldown_tt')"
								@click="resetCooldowns(false)"
								transparent
								light
							/>
						</template>
					</ParamItem>
					<ParamItem
						noBackground
						:paramData="param_alertCD"
						v-model="entry.command.cooldown.alert"
						@change="emit('change')"
					/>
				</template>

				<template v-if="entry.schedule.enabled">
					<ParamItem
						noBackground
						:paramData="param_interval"
						v-model="intervalMinutes"
						@change="emit('change')"
					/>
					<ParamItem
						noBackground
						:paramData="param_minMessages"
						v-model="entry.schedule.repeatMinMessages"
						@change="emit('change')"
					/>
				</template>
			</div>
		</ToggleBlock>

		<div class="updatedBy" v-if="entry.updatedBy">
			{{
				t("chat_commands.form.updated_by", {
					USER: entry.updatedBy,
					DATE: Utils.formatDate(new Date(entry.updated_at)),
				})
			}}
		</div>
	</div>
</template>

<script setup lang="ts">
import PermissionsForm from "@/components/PermissionsForm.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import TTButton from "@/components/TTButton.vue";
import {
	getCommandTriggerId,
	normalizeCommandName,
	storeChatCommands as useStoreChatCommands,
} from "@/store/chat_commands/storeChatCommands";
import { TriggerEventPlaceholders } from "@/types/TriggerActionDataTypes";
import { TriggerTypes } from "@/types/TriggerTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import Utils from "@/utils/Utils";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import ParamItem from "../../ParamItem.vue";

const props = defineProps<{
	entry: TwitchatDataTypes.ChatCommandData;
}>();

const emit = defineEmits<{
	change: [];
}>();

const { t } = useI18n();
const storeChatCommands = useStoreChatCommands();

const COMMAND_PLACEHOLDERS = ["USER", "USER_FOLLOWAGE", "DATE", "TARGET"];
const SCHEDULE_PLACEHOLDERS = ["DATE"];

const param_name = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	icon: "chatCommand",
	placeholder: "!discord",
	labelKey: "chat_commands.form.command",
	maxLength: 100,
});
const param_automatic = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "timer",
	labelKey: "chat_commands.form.automatic",
});
const param_message = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	longText: true,
	value: "",
	icon: "whispers",
	maxLength: 500,
	labelKey: "chat_commands.form.message",
});
const param_aliases = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "editablelist",
	value: "",
	icon: "commands",
	placeholder: "!alias",
	labelKey: "chat_commands.form.aliases",
	max: 10,
	maxLength: 50,
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
const param_remoteChans = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "sharedChat",
	labelKey: "triggers.enableForRemoteChans",
	tooltipKey: "triggers.enableForRemoteChans_tt",
});
const param_interval = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 30,
	icon: "timer",
	min: 1,
	max: 60 * 24,
	labelKey: "chat_commands.form.interval",
});
const param_minMessages = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 10,
	icon: "whispers",
	min: 0,
	max: 10000,
	labelKey: "chat_commands.form.min_messages",
});

const intervalMinutes = computed<number>({
	get: () => Math.round(props.entry.schedule.repeatDuration / 60),
	set: (value: number) => (props.entry.schedule.repeatDuration = value * 60),
});

const hasCommand = computed<boolean>(() => props.entry.command.name.trim().length > 0);

const conflict = computed<string | null>(() => {
	if (!hasCommand.value) return null;
	return storeChatCommands.getConflict(
		[props.entry.command.name, ...props.entry.command.aliases],
		props.entry.id,
	);
});

/**
 * Defines available placeholders.
 * If scheduling is enabled, only {DATE} is available
 */
watch(
	() => props.entry.schedule.enabled,
	(scheduled) => {
		const tags = scheduled ? SCHEDULE_PLACEHOLDERS : COMMAND_PLACEHOLDERS;
		param_message.value.placeholderList = TriggerEventPlaceholders(TriggerTypes.CHAT_COMMAND)
			.filter((v) => tags.includes(v.tag))
			.map((v) => ({ ...v, globalTag: false }));
	},
	{ immediate: true },
);

/**
 * Normalizes command and aliases.
 * The command is enabled as soon as a name is set
 */
function onChangeCommand(): void {
	const name = normalizeCommandName(props.entry.command.name);
	if (name != props.entry.command.name) props.entry.command.name = name;
	props.entry.command.enabled = name.length > 0;
	const aliases = props.entry.command.aliases.map((v) => normalizeCommandName(v, 50));
	if (aliases.join() != props.entry.command.aliases.join()) {
		props.entry.command.aliases = aliases;
	}
	emit("change");
}

function resetCooldowns(global: boolean): void {
	const triggerId = getCommandTriggerId(props.entry.id);
	if (global) {
		TriggerActionHandler.instance.resetGlobalCooldown(triggerId);
	} else {
		TriggerActionHandler.instance.resetUsersCooldown(triggerId);
	}
}
</script>

<style scoped lang="less">
.chatcommandentryform {
	display: flex;
	flex-direction: column;
	gap: 0.5em;

	.children {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
	}

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

	.resetBt {
		flex-grow: 0;
		flex-shrink: 0;
	}

	.updatedBy {
		font-size: 0.8em;
		font-style: italic;
		text-align: right;
		opacity: 0.8;
	}

	.premiumOption {
		outline: 4px solid var(--color-premium-fader);
		background-color: var(--color-premium-fader);
		border-radius: var(--border-radius);
	}
}
</style>
