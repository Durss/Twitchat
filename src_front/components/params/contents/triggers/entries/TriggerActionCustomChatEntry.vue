<template>
	<div class="triggeractioncustomchatentry triggerActionForm">
		<ParamItem :paramData="param_icon" v-model="action.customMessage.icon" class="iconField" />

		<ParamItem :paramData="param_col" v-model="action.customMessage.col" class="colField" />

		<ParamItem :paramData="param_style" v-model="action.customMessage.style">
			<ParamItem
				:paramData="param_highlight"
				v-model="action.customMessage.highlightColor"
				v-if="action.customMessage.style == 'highlight'"
				noBackground
				class="child"
			/>
		</ParamItem>

		<ParamItem
			:paramData="param_user"
			v-if="action.customMessage.user"
			v-model="action.customMessage.user!.name"
		>
			<ParamItem
				:paramData="param_userColor"
				v-model="action.customMessage.user!.color"
				noBackground
				class="child"
				v-if="param_style.value != 'error'"
			/>
		</ParamItem>

		<ParamItem
			:paramData="param_message"
			v-if="action.customMessage.user"
			v-model="action.customMessage.message"
		>
			<div class="message">
				<ChatCustomMessage :messageData="messageData" tabindex="-1" demo />
			</div>
		</ParamItem>

		<draggable
			class="actions"
			v-model="action.customMessage.actions"
			itemKey="id"
			group="ctas"
			ghost-class="ghost"
			direction="vertical"
			handle=".header"
			:animation="250"
		>
			<template
				#item="{
					element,
					index,
				}: {
					element: NonNullable<TwitchatDataTypes.MessageCustomData['actions']>[number];
					index: number;
				}"
			>
				<ToggleBlock
					:title="element.label || 'action'"
					:icons="element.icon ? [element.icon] : []"
					:open="false"
					medium:open="false"
					class="actison"
				>
					<template #left_actions>
						<TTButton
							small
							icon="dragZone"
							class="orderBt"
							v-tooltip="t('triggers.reorder_tt')"
							@click.stop
						/>
					</template>

					<template #right_actions>
						<TTButton
							small
							alert
							icon="trash"
							@click="deleteAction(index)"
							v-tooltip="t('global.delete')"
						/>
					</template>

					<div class="ctaForm">
						<ParamItem
							:paramData="actionParams[index]!.label"
							v-model="element.label"
							noBackground
						/>
						<ParamItem
							class="iconField"
							:paramData="actionParams[index]!.icon"
							v-model="element.icon"
							noBackground
						/>
						<ParamItem
							:paramData="actionParams[index]!.theme"
							v-model="element.theme"
							noBackground
						/>
						<ParamItem
							:paramData="actionParams[index]!.actionType"
							v-model="element.actionType"
							noBackground
						>
							<ParamItem
								:paramData="actionParams[index]!.url"
								v-model="element.url"
								v-if="element.actionType == 'url'"
								noBackground
								class="child"
							/>
							<ParamItem
								:paramData="actionParams[index]!.message"
								v-model="element.message"
								v-else-if="element.actionType == 'message'"
								noBackground
								class="child"
								chatPreview
							/>
							<SimpleTriggerList
								class="child list"
								v-else-if="!element.triggerId"
								@select="(id: string) => (element.triggerId = id)"
							/>
							<SimpleTriggerList
								class="child"
								v-else
								:filteredItemId="element.triggerId"
								@click="element.triggerId = ''"
							/>
						</ParamItem>
					</div>
				</ToggleBlock>
			</template>
		</draggable>
		<TTButton class="addBt" icon="add" @click="addAction()">{{
			t("triggers.actions.customChat.add_actionBt")
		}}</TTButton>
	</div>
</template>

<script setup lang="ts">
import ChatCustomMessage from "@/components/messages/ChatCustomMessage.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import TTButton from "@/components/TTButton.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import type {
	ITriggerPlaceholder,
	TriggerActionCustomMessageData,
	TriggerData,
} from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import { computed, onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";
import draggable from "vuedraggable";
import SimpleTriggerList from "../SimpleTriggerList.vue";

const props = defineProps<{
	action: TriggerActionCustomMessageData;
	triggerData: TriggerData;
}>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();

const actionParams = ref<Key2ParamMap[]>([]);

const param_col = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "list",
	value: -1,
	labelKey: "triggers.actions.customChat.param_col",
});
const param_icon = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "imagelist",
	value: "",
	labelKey: "triggers.actions.customChat.param_icon",
});
const param_style = ref<
	TwitchatDataTypes.ParameterData<
		TwitchatDataTypes.MessageCustomData["style"] | "",
		TwitchatDataTypes.MessageCustomData["style"] | ""
	>
>({
	type: "list",
	value: "",
	labelKey: "triggers.actions.customChat.param_style",
});
const param_highlight = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "color",
	value: "",
	labelKey: "triggers.actions.customChat.param_highlight_color",
});
const param_userColor = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "color",
	value: "",
	labelKey: "triggers.actions.customChat.param_user_color",
});
const param_user = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 25,
	labelKey: "triggers.actions.customChat.param_user",
});
const param_message = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	maxLength: 1000,
	labelKey: "triggers.actions.customChat.param_message",
});

let iconList: TwitchatDataTypes.ParameterDataListValue<string>[] = [];
let buttonThemes: TwitchatDataTypes.ParameterDataListValue<
	NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number]["theme"]
>[] = [];
let actionTypes: TwitchatDataTypes.ParameterDataListValue<
	NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number]["actionType"]
>[] = [];

const messageData = computed<TwitchatDataTypes.MessageCustomData>(() => {
	const chunks = TwitchUtils.parseMessageToChunks(
		props.action.customMessage.message || "",
		undefined,
		true,
	);
	const actions = (JSON.parse(JSON.stringify(props.action.customMessage.actions)) ||
		[]) as NonNullable<typeof props.action.customMessage.actions>;
	for (const a of actions) {
		if (a.label) {
			a.label = a.label.replace(/\{.*?\}/gi, "***");
		}
		switch (a.actionType) {
			case "message": {
				a.message = (a.message || "").replace(/\{.*?\}/gi, "***");
				break;
			}
			case "url": {
				a.url = (a.url || "").replace(/\{.*?\}/gi, "***");
				break;
			}
		}
	}
	return {
		id: "",
		col: -1,
		date: Date.now(),
		platform: "twitchat",
		type: TwitchatDataTypes.TwitchatMessageType.CUSTOM,
		highlightColor: props.action.customMessage.highlightColor,
		style: props.action.customMessage.style,
		user: props.action.customMessage.user,
		icon: props.action.customMessage.icon,
		actions,
		message: props.action.customMessage.message,
		message_chunks: chunks,
		message_html: TwitchUtils.messageChunksToHTML(chunks),
		channel_id: storeAuth.twitch.user.id,
	};
});

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	param_user.value.placeholderList = list;
	param_message.value.placeholderList = list;
	for (let i = 0; i < actionParams.value.length; i++) {
		actionParams.value[i]!.message.placeholderList = list;
	}
}

const { placeholderList } = useTriggerActionPlaceholders(
	props.action,
	props.triggerData,
	onPlaceholderUpdate,
);

onBeforeMount(() => {
	if (!props.action.customMessage) {
		props.action.customMessage = {
			user: {
				name: "",
				color: "#e04e00",
			},
			highlightColor: "#000000",
			actions: [],
		};
	}
	if (!props.action.customMessage.actions) {
		props.action.customMessage.actions = [];
	}

	const iconFiles = import.meta.glob("@/assets/icons/*.svg");
	const keys = Object.keys(iconFiles)
		.map((v) => v.replace(/.*\/(.*?).svg/, "$1"))
		.splice(0, 10);
	keys.unshift("");
	iconList = keys.map((v) => {
		return { value: v, icon: v, label: v };
	});
	param_icon.value.listValues = iconList.concat();

	const cols = storeParams.chatColumnsConfig.length;
	const params: TwitchatDataTypes.ParameterDataListValue<number>[] = [];
	params.push({
		value: -1,
		labelKey: "triggers.actions.customChat.param_col_all",
	});
	for (let i = 0; i < cols; i++) params.push({ value: i, label: (i + 1).toString() });
	param_col.value.listValues = params;

	param_style.value.listValues = [
		{
			value: "message",
			labelKey: "triggers.actions.customChat.param_style_message",
		},
		{
			value: "highlight",
			labelKey: "triggers.actions.customChat.param_style_highlight",
		},
		{
			value: "error",
			labelKey: "triggers.actions.customChat.param_style_error",
		},
	];

	buttonThemes = [
		{
			value: "default",
			labelKey: "triggers.actions.customChat.param_action_theme_default",
		},
		{
			value: "primary",
			labelKey: "triggers.actions.customChat.param_action_theme_primary",
		},
		{
			value: "secondary",
			labelKey: "triggers.actions.customChat.param_action_theme_secondary",
		},
		{
			value: "alert",
			labelKey: "triggers.actions.customChat.param_action_theme_alert",
		},
		{
			value: "light",
			labelKey: "triggers.actions.customChat.param_action_theme_light",
		},
	];

	actionTypes = [
		{
			value: "url",
			labelKey: "triggers.actions.customChat.param_action_type_url",
		},
		{
			value: "trigger",
			labelKey: "triggers.actions.customChat.param_action_type_trigger",
		},
		{
			value: "message",
			labelKey: "triggers.actions.customChat.param_action_type_chat",
		},
	];
	for (let i = 0; i < props.action.customMessage.actions.length; i++) {
		const a = props.action.customMessage.actions[i];
		addAction(a);
	}
});

/**
 * Add a new action
 * @param source
 */
function addAction(
	source?: NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number],
): void {
	if (!source) {
		source = {
			id: Utils.getUUID(),
			label: "",
			icon: "",
			theme: "",
			actionType: "url",
			url: "",
			triggerId: "",
		};
		if (!props.action.customMessage.actions) props.action.customMessage.actions = [];
		props.action.customMessage.actions.push(source);
	}

	const params: Key2ParamMap = {
		id: { type: "boolean", value: false },
		icon: {
			type: "imagelist",
			value: "",
			listValues: iconList.concat(),
			labelKey: "triggers.actions.customChat.param_action_icon",
		},
		actionType: {
			type: "list",
			value: "",
			listValues: actionTypes,
			labelKey: "triggers.actions.customChat.param_action_type",
		},
		url: {
			type: "string",
			value: "",
			maxLength: 1000,
			labelKey: "triggers.actions.customChat.param_action_url",
		},
		triggerId: { type: "string", value: "" },
		label: {
			type: "string",
			value: "",
			maxLength: 100,
			labelKey: "triggers.actions.customChat.param_action_label",
		},
		theme: {
			type: "list",
			value: "",
			listValues: buttonThemes,
			labelKey: "triggers.actions.customChat.param_action_theme",
		},
		message: {
			type: "string",
			value: "",
			maxLength: 500,
			longText: true,
			placeholderList: placeholderList.value,
			labelKey: "triggers.actions.customChat.param_action_message",
		},
	};
	console.log(placeholderList.value);
	actionParams.value.push(params);
}

/**
 * Delete an action by its index
 * @param index
 */
function deleteAction(index: number): void {
	props.action.customMessage.actions!.splice(index, 1);
}

type keys = keyof NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number];
type Key2ParamMap = Omit<
	{
		[K in keys]: TwitchatDataTypes.ParameterData<unknown>;
	},
	"urlTarget" | "data"
>;
</script>

<style scoped lang="less">
.triggeractioncustomchatentry {
	.message {
		.bevel();
		background-color: var(--grayout);
		padding: 0.5em;
		border-radius: var(--border-radius);
	}
	.iconField {
		:deep(.listField) {
			max-width: 100px;
		}
	}
	.colField {
		:deep(select) {
			max-width: 100px;
		}
	}
	.addBt {
		margin: auto;
	}

	.actions {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		.action {
			gap: 0.5em;
			display: flex;
			flex-direction: column;

			.child::before {
				position: absolute;
				left: -1em;
				top: 0.1em;
				font-size: 1rem;
				content: "⤷";
				display: block;
			}
			.deleteBt {
				align-self: center;
			}
		}
		.ctaForm {
			gap: 0.25em;
			display: flex;
			flex-direction: column;
		}
	}
}
</style>
