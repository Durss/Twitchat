<template>
	<div class="triggeractioncustomusername triggerActionForm">
		<ParamItem :paramData="param_userSource" v-model="props.action.customUsernameUserSource" />
		<ParamItem :paramData="param_username" v-model="props.action.customUsername" />
	</div>
</template>

<script setup lang="ts">
import ParamItem from "@/components/params/ParamItem.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import {
	COUNTER_EDIT_SOURCE_CHATTERS,
	COUNTER_EDIT_SOURCE_EVERYONE,
	COUNTER_EDIT_SOURCE_SENDER,
	COUNTER_VALUE_PLACEHOLDER_PREFIX,
	type ITriggerPlaceholder,
	type TriggerCustomUsernameData,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TriggerUtils from "@/utils/TriggerUtils";
import { computed, ref } from "vue";

const props = defineProps<{
	action: TriggerCustomUsernameData;
	triggerData: TriggerData;
}>();

const param_userSource = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "list",
	value: "",
	searchable: true,
	labelKey: "triggers.actions.customUsername.param_user",
});
const param_username = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "string",
	value: "",
	labelKey: "triggers.actions.customUsername.param_username",
});

const userPLaceholders = ref<ITriggerPlaceholder<any>[]>([]);

/**
 * Build user trigger source list
 */
const userSourceOptions = computed((): TwitchatDataTypes.ParameterDataListValue<string>[] => {
	const res: TwitchatDataTypes.ParameterDataListValue<string>[] = [
		//Add static sources "sender" and "everyone"
		{
			labelKey: "triggers.actions.customUsername.user_source_sender",
			value: COUNTER_EDIT_SOURCE_SENDER,
		},
		{
			labelKey: "triggers.actions.customUsername.user_source_chatters",
			value: COUNTER_EDIT_SOURCE_CHATTERS,
		},
		{
			labelKey: "triggers.actions.customUsername.user_source_everyone",
			value: COUNTER_EDIT_SOURCE_EVERYONE,
		},
	];

	//Add placeholders that may contain a user name (chat command params included)
	res.push(
		...TriggerUtils.getPlaceholderGroupedListValues(
			userPLaceholders.value.filter(
				(v) => v.tag.indexOf(COUNTER_VALUE_PLACEHOLDER_PREFIX) == -1,
			),
		),
	);
	return res;
});

useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	userPLaceholders.value = list;
	param_userSource.value.listValues = userSourceOptions.value;
	param_username.value.placeholderList = list;
}
</script>

<style scoped lang="less">
.triggeractioncustomusername {
	.list,
	.group {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		max-height: 300px;
		overflow-x: hidden;
		padding: 1px;

		.badge {
			padding: 2px;
			outline: 1px solid var(--color-light-fade);
			img,
			.icon {
				display: block;
				width: 32px;
				height: 32px;
			}

			&:hover {
				outline: 1px solid var(--color-light);
			}
		}
	}

	.targets {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		.col {
			width: 50%;
			padding: 0.5em;
			background-color: var(--grayout);
			border-radius: var(--border-radius);

			.head {
				gap: 0.5em;
				display: flex;
				flex-direction: row;
				justify-content: center;
				.icon {
					height: 1em;
					margin-bottom: 0.5em;
				}
			}

			.dropZone {
				position: relative;
				.group {
					min-height: 3em;
					overflow: hidden;
					z-index: 1;
					position: relative;
				}
				.placeholder,
				.placeholder_hidden {
					position: absolute;
					width: 100%;
					height: 100%;
					font-style: italic;
					text-align: center;
					opacity: 0.5;
					padding: 1em;
					// min-height: 3.5em;
					border: 1px dashed var(--color-text);
					border-radius: var(--border-radius);
				}

				.placeholder_hidden {
					opacity: 0;
					position: relative;
				}

				.badge {
					cursor: not-allowed;
				}
			}
		}
	}
}
</style>
