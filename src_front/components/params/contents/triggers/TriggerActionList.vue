<template>
	<div ref="rootEl" class="triggeractionlist">
		<div class="card-item alert description" v-if="triggerDef?.disabledReasonKey" data-noselect>
			<Icon name="alert" class="icon" theme="light" />
			{{ $t(triggerDef.disabledReasonKey) }}
		</div>

		<div class="card-item secondary description" data-noselect>
			<Icon name="info" class="icon" theme="light" />
			<i18n-t
				scope="global"
				tag="span"
				v-if="triggerDef?.descriptionKey"
				:keypath="triggerDef?.descriptionKey"
			>
				<template #SUB_ITEM_NAME>
					<mark>{{ subTypeLabel }}</mark>
				</template>
				<template #INFO v-if="$te(triggerDef?.descriptionKey + '_info')">
					<i18n-t
						tag="i"
						class="details"
						scope="global"
						v-if="$te(triggerDef?.descriptionKey + '_info')"
						:keypath="triggerDef?.descriptionKey + '_info'"
					>
						<template #CMD v-if="$te(triggerDef?.descriptionKey + '_info_cmd')">
							<mark>{{ $t(triggerDef?.descriptionKey + "_info_cmd") }}</mark>
						</template>
					</i18n-t>
				</template>
				<template #CMD v-if="$te(triggerDef?.descriptionKey + '_cmd')">
					<mark v-html="$t(triggerDef?.descriptionKey + '_cmd')"></mark>
				</template>
			</i18n-t>
		</div>

		<div class="card-item params" data-noselect>
			<ParamItem noBackground :paramData="param_enabled" v-model="triggerData.enabled" />

			<ParamItem
				noBackground
				:paramData="param_enableForRemoteChans"
				v-if="allowedOnRemoteChans"
				v-model="triggerData.enableForRemoteChans"
				v-tooltip="{ content: $t('triggers.enableForRemoteChans_tt'), placement: 'bottom' }"
				class="premiumOption"
			/>
			<ParamItem
				noBackground
				:paramData="param_name"
				v-model="triggerData.name"
				class="nameInput"
			>
				<template #composite>
					<TTButton
						@click="(event: MouseEvent) => openEmoteSelector(event)"
						transparent
						class="emoteBt"
					>
						<img
							v-if="triggerData.icon && triggerData.icon?.indexOf('http') > -1"
							:src="triggerData.icon"
							alt="emote"
						/>
						<div v-else-if="triggerData.icon" class="icon">
							{{ triggerData.icon }}
						</div>
						<Icon v-else name="emote" class="icon" />
					</TTButton>
				</template>
			</ParamItem>

			<TriggerActionChatCommandParams v-if="isChatCmd" :triggerData="triggerData" />

			<TriggerActionScheduleParams v-if="isSchedule" :triggerData="triggerData" />

			<TriggerActionSlashCommandParams v-if="isSlashCommand" :triggerData="triggerData" />

			<TriggerActionCommandArgumentParams
				v-if="isAnyChatMessageCommand"
				:triggerData="triggerData"
			/>

			<TriggerActionHeatParams
				v-if="isHeatTrigger"
				:obsSources="obsSources"
				:triggerData="triggerData"
			/>

			<TriggerGoXLRParams
				v-if="isGoXLRButtonTrigger"
				:obsSources="obsSources"
				:triggerData="triggerData"
			/>

			<TriggerAdApproachParams v-if="isAdBreakApproach" :triggerData="triggerData" />

			<TriggerActionAnyMessageParams v-if="isAnyMessages" :triggerData="triggerData" />

			<div class="queue">
				<div class="info" v-tooltip="$t('triggers.trigger_queue_info')">
					<Icon name="list" class="icon" />
					<span>{{ $t("triggers.trigger_queue") }}</span>
				</div>
				<ParamItem
					noBackground
					class="selector"
					:paramData="param_queue"
					v-model="triggerData.queue"
				>
					<template #composite>
						<ParamItem
							noBackground
							class="priority"
							v-tooltip="$t('triggers.trigger_queue_priority')"
							:paramData="param_queue_priority"
							v-model="triggerData.queuePriority"
						/>
					</template>
				</ParamItem>
			</div>
		</div>

		<TriggerConditionList
			class="card-item conditions"
			:triggerData="triggerData"
			:conditions="triggerData.conditions"
			data-noselect
		/>

		<div :class="listClasses">
			<div v-if="hasCondition" class="conditionSelector" data-noselect>
				<TTButton
					icon="cross"
					alert
					@click="matchingCondition = false"
					:selected="matchingCondition == false"
				/>
				<Icon name="condition" class="conditionLink" />
				<TTButton
					icon="checkmark"
					@click="matchingCondition = true"
					:selected="matchingCondition == true"
					primary
				/>
			</div>
			<svg
				class="conditionJoint"
				v-if="hasCondition"
				version="1.1"
				xmlns="http://www.w3.org/2000/svg"
				xmlns:xlink="http://www.w3.org/1999/xlink"
				x="0px"
				y="0px"
				width="104.8px"
				height="24.4px"
				viewBox="0 0 104.8 24.4"
				style="enable-background: new 0 0 104.8 24.4"
				xml:space="preserve"
			>
				<polygon
					class="false"
					style="fill: #b71f1f"
					points="0,24.4 0,0 2,0 2,22.4 52.4,22.4 52.4,24.4 "
				/>
				<polygon
					class="true"
					style="fill: #008667"
					points="52.4,24.4 52.4,22.4 102.8,22.4 102.8,0 104.8,0 104.8,24.4 "
				/>
			</svg>

			<div class="dash long"></div>

			<button
				class="addBt"
				:disabled="filteredActionList.length >= $config.MAX_TRIGGER_ACTIONS"
				v-if="filteredActionList.length > 0"
				@click="addActionAt(0)"
				data-noselect
			>
				<Icon name="add" class="icon" />
			</button>
			<TTButton
				v-else
				class="mainAddBt"
				icon="add"
				@click="addActionAt(0)"
				data-noselect
				primary
				big
				>{{ $t("triggers.add_action") }}</TTButton
			>

			<draggable
				v-model="filteredActionList"
				group="actions"
				item-key="id"
				ghost-class="ghost"
				direction="vertical"
				handle=".header, .orderBt"
				:animation="250"
			>
				<template
					#item="{ element, index }: { element: TriggerActionTypes; index: number }"
				>
					<div class="listItem">
						<div class="dash"></div>
						<TriggerActionEntry
							:class="getActionClasses(element)"
							:ref="
								(el: any) => {
									actionEntryRefs[element.id] = el;
								}
							"
							:data-actionid="element.id"
							:action="element"
							:index="index"
							:obsScenes="obsScenes"
							:obsSources="obsSources"
							:obsInputs="obsInputs"
							:rewards="rewards"
							:extensions="extensions"
							:triggerData="triggerData"
							@delete="deleteAction(element.id)"
							@duplicate="duplicateAction(element, index)"
						/>
						<div class="dash"></div>
						<button
							class="addBt"
							@click="addActionAfter(element.id)"
							:disabled="filteredActionList.length >= $config.MAX_TRIGGER_ACTIONS"
							data-noselect
						>
							<Icon name="add" class="icon" />
						</button>
					</div>
				</template>
			</draggable>
		</div>

		<div class="selectRect" :style="selectStyles" v-if="selecting"></div>

		<EmoteSelector
			class="emoteSelector"
			popoutMode
			v-if="showEmoteSelector"
			@select="onSelectEmote"
			ref="emoteSelector"
			@onLoad="replaceEmoteSelector()"
		/>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import {
	TriggerSubTypeLabel,
	TriggerTypes,
	type TriggerActionEmptyData,
	type TriggerActionTypes,
	type TriggerData,
	type TriggerTypesValue,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { OBSInputItem, OBSSceneItem, OBSSourceItem } from "@/utils/OBSWebsocket";
import TriggerUtils from "@/utils/TriggerUtils";
import Utils from "@/utils/Utils";
import Config from "@/utils/Config";
import { gsap } from "gsap/gsap-core";
import {
	ref,
	computed,
	onBeforeMount,
	onBeforeUnmount,
	nextTick,
	type ComponentPublicInstance,
	useTemplateRef,
	onMounted,
} from "vue";
import { useI18n } from "vue-i18n";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import draggable from "vuedraggable";
import ParamItem from "../../ParamItem.vue";
import TriggerActionAnyMessageParams from "./TriggerActionAnyMessageParams.vue";
import TriggerActionChatCommandParams from "./TriggerActionChatCommandParams.vue";
import TriggerActionCommandArgumentParams from "./TriggerActionCommandArgumentParams.vue";
import TriggerActionEntry from "./TriggerActionEntry.vue";
import TriggerActionHeatParams from "./TriggerActionHeatParams.vue";
import TriggerActionScheduleParams from "./TriggerActionScheduleParams.vue";
import TriggerActionSlashCommandParams from "./TriggerActionSlashCommandParams.vue";
import TriggerAdApproachParams from "./TriggerAdApproachParams.vue";
import TriggerConditionList from "./TriggerConditionList.vue";
import TriggerGoXLRParams from "./TriggerGoXLRParams.vue";
import { useConfirm } from "@/composables/useConfirm";
import EmoteSelector from "@/components/chatform/EmoteSelector.vue";

const { t } = useI18n();
const { confirm } = useConfirm();
const storeTriggers = useStoreTriggers();
const rootElRef = useTemplateRef("rootEl");
const emoteSelectorRef = useTemplateRef("emoteSelector");
const actionEntryRefs: Record<string, ComponentPublicInstance | null> = {};

const props = withDefaults(
	defineProps<{
		triggerData: TriggerData;
		obsScenes?: OBSSceneItem[];
		obsSources?: OBSSourceItem[];
		obsInputs?: OBSInputItem[];
		rewards?: TwitchDataTypes.Reward[];
		extensions?: TwitchDataTypes.Extension[];
	}>(),
	{
		obsScenes: () => [],
		obsSources: () => [],
		obsInputs: () => [],
		rewards: () => [],
		extensions: () => [],
	},
);

const selecting = ref(false);
const showEmoteSelector = ref(false);
const emoteSelectorOrigin = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const emoteSelectorPos_x = ref("0px");
const emoteSelectorPos_y = ref("0px");
const selectStyles = ref<{ [key: string]: string }>({});
const selectedActions = ref<string[]>([]);
const matchingCondition = ref(true);
const triggerDef = ref<ReturnType<typeof TriggerUtils.getTriggerDisplayInfo> | undefined>(
	undefined,
);
const param_enabled = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	icon: "disable",
	labelKey: "global.enabled",
});
const param_enableForRemoteChans = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	icon: "disable",
	labelKey: "triggers.enableForRemoteChans",
});
const param_name = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	icon: "label",
	placeholder: "...",
	labelKey: "triggers.trigger_name",
	longText: false,
	maxLength: 100,
});
const param_icon = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "editablelist",
	value: "",
	icon: "emote",
	labelKey: "triggers.trigger_icon",
});
const param_queue = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "editablelist",
	value: "",
	maxLength: 100,
	max: 1,
	placeholderKey: "triggers.trigger_queue_input_placeholder",
});
const param_queue_priority = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 0,
	min: -100,
	max: 100,
});

let selectOffset = { x: 0, y: 0 };
let scrollDir = 0;
let disposed = false;
let pointerDownHandler: (e: PointerEvent) => void;
let pointerMoveHandler: (e: PointerEvent) => void;
let pointerUpHandler: (e: PointerEvent) => void;
let keyDownHandler: (e: KeyboardEvent) => void;
let keyUpHandler: (e: KeyboardEvent) => void;
let clickHandler: (e: MouseEvent) => void;

/**
 * Get if the trigger can be active on remote channels
 */
const allowedOnRemoteChans = computed((): boolean => {
	const allowList: TriggerTypesValue[] = [
		TriggerTypes.CHAT_COMMAND,
		TriggerTypes.ANY_MESSAGE,
		TriggerTypes.REWARD_REDEEM,
		TriggerTypes.FIRST_TODAY,
		TriggerTypes.FIRST_ALL_TIME,
		TriggerTypes.FOLLOW,
		TriggerTypes.USER_WATCH_STREAK,
		TriggerTypes.POLL_START,
		TriggerTypes.POLL_RESULT,
		TriggerTypes.PREDICTION_START,
		TriggerTypes.PREDICTION_RESULT,
		TriggerTypes.SUB,
		TriggerTypes.SUBGIFT,
		TriggerTypes.CHEER,
		TriggerTypes.POWER_UP_MESSAGE,
		TriggerTypes.POWER_UP_GIANT_EMOTE,
		TriggerTypes.POWER_UP_CELEBRATION,
		TriggerTypes.SHOUTOUT_IN,
		TriggerTypes.SHOUTOUT_OUT,
		TriggerTypes.PIN_MESSAGE,
		TriggerTypes.UNPIN_MESSAGE,
		TriggerTypes.BAN,
		TriggerTypes.UNBAN,
		TriggerTypes.TIMEOUT,
		TriggerTypes.CLEAR_CHAT,
		TriggerTypes.SUB_ONLY_ON,
		TriggerTypes.SUB_ONLY_OFF,
		TriggerTypes.EMOTE_ONLY_ON,
		TriggerTypes.EMOTE_ONLY_OFF,
		TriggerTypes.SLOW_MODE_ON,
		TriggerTypes.SLOW_MODE_OFF,
		TriggerTypes.RAID,
		TriggerTypes.RAID_STARTED,
	];
	return allowList.includes(props.triggerData.type);
});

/**
 * Get a trigger's description / Get filtered actions depending on condition result if any
 */
const filteredActionList = computed({
	get(): TriggerActionTypes[] {
		let res = props.triggerData.actions;
		if (hasCondition.value) {
			return res.filter((t) => {
				return (
					t.condition == matchingCondition.value ||
					(t.condition !== false && matchingCondition.value)
				);
			});
		}
		return res;
	},
	set(value: TriggerActionTypes[]) {
		if (hasCondition.value) {
			//Remove all sorted actions from the original trigger data
			for (let i = 0; i < props.triggerData.actions.length; i++) {
				const item = props.triggerData.actions[i]!;
				if (value.findIndex((v) => v.id == item.id) == -1) continue;
				props.triggerData.actions.splice(i, 1);
				i--;
			}
			//Push sorted actions
			props.triggerData.actions = props.triggerData.actions.concat(value);
		} else {
			props.triggerData.actions = value;
		}
	},
});

const isChatCmd = computed(() => props.triggerData.type === TriggerTypes.CHAT_COMMAND);
const isAnyMessages = computed(() => props.triggerData.type === TriggerTypes.ANY_MESSAGE);
const isSchedule = computed(() => props.triggerData.type === TriggerTypes.SCHEDULE);
const isSlashCommand = computed(() => props.triggerData.type === TriggerTypes.SLASH_COMMAND);
const isAdBreakApproach = computed(() => props.triggerData.type === TriggerTypes.AD_APPROACHING);
const isAnyChatMessageCommand = computed(() => props.triggerData.type === TriggerTypes.ANY_MESSAGE);
const isHeatTrigger = computed(() => props.triggerData.type === TriggerTypes.HEAT_CLICK);

const hasCondition = computed((): boolean => {
	return (
		props.triggerData.conditions != undefined &&
		props.triggerData.conditions.conditions.length > 0
	);
});
const isGoXLRButtonTrigger = computed((): boolean => {
	const list: TriggerTypesValue[] = [
		TriggerTypes.GOXLR_BUTTON_PRESSED,
		TriggerTypes.GOXLR_BUTTON_RELEASED,
	];
	return list.indexOf(props.triggerData.type) > -1;
});
const listClasses = computed((): string[] => {
	const res = ["list"];
	if (hasCondition.value && !matchingCondition.value) res.push("alert");
	return res;
});

/**
 * Get a trigger's sub type's label (reward name, counter name, ...)
 */
const subTypeLabel = computed((): string | undefined => {
	return TriggerSubTypeLabel(props.triggerData);
});

function getActionClasses(action: TriggerActionTypes): string[] {
	const res = ["action", "actionItemEntry"];
	if (selectedActions.value.includes(action.id)) res.push("selected");
	return res;
}

/**
 * Called when deleting an action item
 */
function deleteAction(actionId: string): void {
	confirm(t("triggers.delete_action_confirm"))
		.then(async () => {
			let index = props.triggerData.actions.findIndex((v) => v.id == actionId);
			props.triggerData.actions.splice(index, 1);
		})
		.catch(() => {});
}

/**
 * Called when duplicating an action item
 */
function duplicateAction(action: TriggerActionTypes, index: number): void {
	const clone: TriggerActionTypes = JSON.parse(JSON.stringify(action));
	clone.id = Utils.getUUID();
	props.triggerData.actions.splice(index + 1, 0, clone);

	highlightItemById(action.id);
}

/**
 * Adds an action after the specified trigger ID
 * @param id
 */
function addActionAfter(id: string): void {
	let index = props.triggerData.actions.findIndex((v) => v.id == id);
	if (index == -1) return;
	addActionAt(index + 1);
}

/**
 * Adds an action at a specific index
 * @param id
 */
function addActionAt(index: number): void {
	const action: TriggerActionEmptyData = {
		id: Utils.getUUID(),
		type: null,
	};
	if (hasCondition.value) {
		action.condition = matchingCondition.value;
	}
	props.triggerData.actions.splice(index, 0, action);

	highlightItemById(action.id);
}

function onPointerDown(e: PointerEvent): void {
	const parent = document.getElementById("paramContentHolder")!;
	let target = e.target as HTMLElement;
	//Go up on hierarchy until reaching the parameters holder
	//stop if finding a button or an element with "data-noselect" attribute
	while (
		target != parent &&
		target.dataset.noselect == undefined &&
		target.nodeName != "BUTTON"
	) {
		target = target.parentElement as HTMLElement;
	}

	//Not a valid drag start place
	if (target != parent) return;

	Utils.unselectDom();
	const offsetBounds = rootElRef.value!.getBoundingClientRect();

	selecting.value = true;
	selectOffset.x = e.clientX - offsetBounds.left;
	selectOffset.y = e.clientY - offsetBounds.top;
	onPointerMove(e);
}

function onPointerMove(e: PointerEvent): void {
	if (!selecting.value) return;

	const offsetBounds = rootElRef.value!.getBoundingClientRect();

	const margin = 20;
	const x1 = Math.min(
		offsetBounds.width + margin,
		Math.max(-margin, Math.min(selectOffset.x, e.clientX - offsetBounds.left)),
	);
	const y1 = Math.min(
		offsetBounds.height,
		Math.max(0, Math.min(selectOffset.y, e.clientY - offsetBounds.top)),
	);
	const x2 = Math.min(
		offsetBounds.width + margin,
		Math.max(selectOffset.x, e.clientX - offsetBounds.left),
	);
	const y2 = Math.min(
		offsetBounds.height,
		Math.max(selectOffset.y, e.clientY - offsetBounds.top),
	);
	selectStyles.value.left = x1 + "px";
	selectStyles.value.top = y1 + "px";
	selectStyles.value.width = x2 - x1 + "px";
	selectStyles.value.height = y2 - y1 + "px";
	selectStyles.value.display = Math.abs(x2 - x1) < 2 || Math.abs(y2 - y1) < 2 ? "none" : "block";

	if (x2 - x1 < 10 && y2 - y1 < 5) {
		selectedActions.value = [];
		return;
	}

	const entries = rootElRef.value!.querySelectorAll(".actionItemEntry");
	const selected: string[] = [];
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i] as HTMLElement;
		const bounds = entry.getBoundingClientRect();
		const overlap = !(
			x1 + offsetBounds.left > bounds.right ||
			x2 + offsetBounds.left < bounds.left ||
			y1 + offsetBounds.top > bounds.bottom ||
			y2 + offsetBounds.top < bounds.top
		);
		if (overlap) {
			selected.push(entry.dataset.actionid as string);
		}
	}

	scrollDir = 0;
	if (y2 - y1 > 10) {
		if (e.clientY > document.body.clientHeight * 0.8)
			scrollDir = (e.clientY - document.body.clientHeight * 0.8) * 0.1;
		if (e.clientY < document.body.clientHeight * 0.2)
			scrollDir = -(document.body.clientHeight * 0.2) * 0.1;
	}

	selectedActions.value = selected;

	//If moved 10px away in a direction, avoid selecting something on the page
	if (x2 - x1 > 10 || y2 - y1 > 10) {
		Utils.unselectDom();
		e.preventDefault();
	}
}

function onPointerUp(e: PointerEvent): void {
	selecting.value = false;
}

function onKeyDown(e: KeyboardEvent): void {
	//Avoid closing parameters page if actions are selected
	if (e.key == "Escape" && selectedActions.value.length > 0) {
		selectedActions.value = [];
		e.stopPropagation();
	}
	if (selectedActions.value.length > 0 && e.key == "Backspace") e.preventDefault();
}

function onKeyUp(e: KeyboardEvent): void {
	//Do not copy/past actions if focus is on a form input
	const nodeName = (e.target as HTMLElement).nodeName;
	if (["TEXTAREA", "INPUT"].indexOf(nodeName) > -1) return;
	const metaKey = e.metaKey || e.ctrlKey;

	//Delete selected actions
	if ((e.key == "Delete" || e.key == "Backspace") && selectedActions.value.length > 0) {
		const list = selectedActions.value;
		confirm(t("triggers.delete_actions_confirm"))
			.then(async () => {
				for (let i = 0; i < props.triggerData.actions.length; i++) {
					const a = props.triggerData.actions[i]!;
					if (list.find((v) => v == a.id)) {
						props.triggerData.actions.splice(i, 1);
						i--;
					}
				}
			})
			.catch(() => {});
	}

	if (e.key == "c" && metaKey && selectedActions.value.length > 0) {
		const clipboar: TriggerActionTypes[] = [];
		for (const a of props.triggerData.actions) {
			if (selectedActions.value.includes(a.id)) {
				clipboar.push(a);
			}
		}
		selectedActions.value = [];
		storeTriggers.clipboard = clipboar;
	} else if (e.key == "v" && metaKey && storeTriggers.clipboard.length > 0) {
		for (let i = 0; i < storeTriggers.clipboard.length; i++) {
			if (props.triggerData.actions.length >= Config.instance.MAX_TRIGGER_ACTIONS) break;
			const action = JSON.parse(
				JSON.stringify(storeTriggers.clipboard[i]),
			) as TriggerActionTypes;
			action.id = Utils.getUUID(); //Override ID by a new one to avoid conflicts
			action.condition = matchingCondition.value;
			props.triggerData.actions.push(action);
		}
	}
}

function renderFrame(): void {
	if (disposed) return;
	requestAnimationFrame(() => renderFrame());
	if (!selecting.value) return;
	if (scrollDir == 0) return;
	const scrollableHolder = document.getElementById(
		"paramContentScrollableHolder",
	) as HTMLDivElement;
	if (!scrollableHolder) return;
	scrollableHolder.scrollTop += scrollDir;
}

async function highlightItemById(id: string): Promise<void> {
	await nextTick();
	const refEl = actionEntryRefs[id]?.$el;
	if (refEl) {
		gsap.from(refEl, {
			duration: 0.5,
			overflow: "hidden",
			width: 0,
			height: 0,
			ease: "back.out",
			clearProps: "all",
			onUpdate: () => {
				refEl.scrollIntoView({ behavior: "auto", block: "center" });
			},
		});
	}
}

/**
 * Open emote selector
 */
function openEmoteSelector(event: MouseEvent): void {
	props.triggerData.icon = "";
	showEmoteSelector.value = true;
	emoteSelectorOrigin.value = { x: event.clientX, y: event.clientY };
	nextTick(() => {
		replaceEmoteSelector();
	});
}

/**
 * Replaces emote selector position
 */
function replaceEmoteSelector(): void {
	const bounds = emoteSelectorRef.value?.$el.getBoundingClientRect();
	let x =
		emoteSelectorOrigin.value.x < window.innerWidth / 2
			? emoteSelectorOrigin.value.x
			: emoteSelectorOrigin.value.x - bounds.width;
	let y =
		emoteSelectorOrigin.value.y < window.innerHeight / 2
			? emoteSelectorOrigin.value.y
			: emoteSelectorOrigin.value.y - bounds.height;
	const marginBottom = 70;
	if (x + bounds.width > window.innerWidth) x = window.innerWidth - bounds.width;
	if (y + bounds.height > window.innerHeight - marginBottom)
		y = window.innerHeight - marginBottom - bounds.height;
	emoteSelectorPos_x.value = x + "px";
	emoteSelectorPos_y.value = y + "px";
}

/**
 * Called after selecting an emote
 */
async function onSelectEmote(
	emote: TwitchatDataTypes.Emote | TwitchatDataTypes.Emoji,
): Promise<void> {
	props.triggerData.icon =
		"images" in emote
			? emote.images.url_2x || emote.images.url_4x || emote.images.url_1x
			: emote.emoji;
	showEmoteSelector.value = false;
}

/**
 * Detect click outside emote selector
 */
function onClick(e: MouseEvent): void {
	if (showEmoteSelector.value) {
		const emoteSelector = emoteSelectorRef.value!.$el;
		if (!emoteSelector.contains(e.target as Node)) {
			showEmoteSelector.value = false;
		}
	}
}

onBeforeMount(() => {
	param_queue.value.options = storeTriggers.queues;
	triggerDef.value = TriggerUtils.getTriggerDisplayInfo(props.triggerData);

	// Init new prop if not existing
	if (props.triggerData.enableForRemoteChans === undefined) {
		props.triggerData.enableForRemoteChans = false;
	}

	//Not super clean way of getting the param content holder but don't
	//know any cleaner one.
	pointerDownHandler = (e: PointerEvent) => onPointerDown(e);
	pointerMoveHandler = (e: PointerEvent) => onPointerMove(e);
	pointerUpHandler = (e: PointerEvent) => onPointerUp(e);
	clickHandler = (e: MouseEvent) => onClick(e);
	keyUpHandler = (e: KeyboardEvent) => onKeyUp(e);
	keyDownHandler = (e: KeyboardEvent) => onKeyDown(e);
	const holder = document.getElementById("paramContentHolder")!;
	//Make sure holder exists. Apparently someone succeeded to have not existing holder (?!). See Sentry TWITCHAT-1Q
	if (holder) holder.addEventListener("pointerdown", pointerDownHandler);
	document.addEventListener("pointermove", pointerMoveHandler);
	document.addEventListener("pointerup", pointerUpHandler);
	document.addEventListener("click", clickHandler, true);
	document.addEventListener("keyup", keyUpHandler, true);
	document.addEventListener("keydown", keyDownHandler, true);

	renderFrame();
});

onMounted(() => {
	const scrollableHolder = document.getElementById(
		"paramContentScrollableHolder",
	) as HTMLDivElement;
	if (!scrollableHolder) return;
	scrollableHolder.scrollTop = 0;
});

onBeforeUnmount(() => {
	disposed = true;
	const holder = document.getElementById("paramContentHolder")!;
	if (holder) holder.removeEventListener("pointerdown", pointerDownHandler);
	document.removeEventListener("pointermove", pointerMoveHandler);
	document.removeEventListener("pointerup", pointerUpHandler);
	document.removeEventListener("click", clickHandler, true);
	document.removeEventListener("keyup", keyUpHandler, true);
	document.removeEventListener("keydown", keyDownHandler, true);
});
</script>

<style scoped lang="less">
.triggeractionlist {
	display: flex;
	flex-direction: column;
	gap: 1em;
	position: relative;

	.premiumOption {
		outline: 4px solid var(--color-premium-fader);
		background-color: var(--color-premium-fader);
		border-radius: var(--border-radius);
	}

	.list {
		.conditionSelector {
			display: flex;
			flex-direction: row;
			align-items: flex-end;
			margin: auto;
			width: fit-content;
			.button {
				margin-bottom: 3px;
				&:not(.selected) {
					opacity: 0.5;
				}
			}
			.icon {
				width: 75px;
			}
		}
		.conditionJoint {
			display: block;
			margin: auto;
			width: 105px;
			.true {
				fill-opacity: 1;
			}
			.false {
				fill-opacity: 0.25;
			}
		}
		.dash {
			width: 2px;
			background-color: var(--color-primary);
			height: 10px;
			margin: auto;
			&.long {
				height: 15px;
			}
		}

		.action.selected {
			outline: 2px dashed var(--color-text);
			border-radius: var(--border-radius);
		}

		.addBt {
			display: block;
			margin: auto;
			border-radius: 50%;
			width: 2em;
			height: 2em;
			background-color: var(--color-primary);
			transition: background-color 0.25s;
			color: white;
			.icon {
				padding: 0.35em;
				height: 100%;
				width: 100%;
			}
			&:hover {
				background-color: var(--color-primary-light);
			}
			&:disabled {
				cursor: not-allowed;
				opacity: 0.5;
				background-color: var(--color-text);
				color: var(--color-text-inverse);
			}
		}

		.mainAddBt {
			display: flex;
			margin: auto;
		}

		&.alert {
			.addBt {
				background-color: var(--color-alert);
				&:hover {
					background-color: var(--color-alert-light);
				}
			}

			.dash {
				background-color: var(--color-alert);
			}

			.conditionJoint {
				.true {
					fill-opacity: 0.25;
				}
				.false {
					fill-opacity: 1;
				}
			}
		}
	}

	& > .params,
	& > .conditions,
	& > .description {
		box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.25);

		& > .head {
			text-align: center;
			margin-bottom: 0.5em;
		}

		&.description {
			line-height: 1.3em;
		}

		&.params {
			display: flex;
			flex-direction: column;
			gap: 0.5em;
		}

		.icon {
			width: 1em;
			height: 1em;
			object-fit: fill;
			margin-right: 0.5em;
			vertical-align: top;
		}

		.details {
			display: block;
			font-size: 0.9em;
			opacity: 0.9;
			line-height: 1.2em;
		}

		.queue {
			display: flex;
			flex-grow: 1;
			align-items: center;
			width: 100%;
			.info {
				flex-grow: 1;
				cursor: pointer;
			}
			.selector {
				flex-basis: 300px;
				:deep(.list.editable) {
					gap: 1px;
					flex-direction: row;
					justify-content: stretch;
					align-items: stretch;
					.listField {
						flex: 1;
					}
					.vs__dropdown-toggle {
						border-top-right-radius: 0 !important;
						border-bottom-right-radius: 0 !important;
					}
				}
				.priority {
					flex-basis: 50px;
					:deep(.content),
					:deep(.holder),
					:deep(input) {
						height: 100%;
						border-top-left-radius: 0;
						border-bottom-left-radius: 0;
					}
				}
			}
		}

		&.conditions {
			border: 2px solid var(--color-primary);
			margin-bottom: -1em;
		}

		.nameInput {
			:deep(input) {
				padding-right: 1.5em;
			}

			.emoteBt {
				border-radius: 0;
				padding: 0;
				margin-left: -1.5em;
				height: 1.5em;
				width: 1.5em;
				img {
					height: 1em;
					object-fit: contain;
					border-radius: 0.25em;
					vertical-align: middle;
				}
				.icon {
					margin: 0;
					padding: 0;
					width: auto;
					height: auto;
					vertical-align: middle;
					font-size: 1em;
				}
			}
		}
	}

	.selectRect {
		z-index: 1;
		pointer-events: none;
		position: absolute;
		border: 1px solid var(--color-text);
		background-color: var(--background-color-fader);
	}

	.emoteSelector {
		position: fixed;
		z-index: 100;
		top: v-bind(emoteSelectorPos_y);
		left: v-bind(emoteSelectorPos_x);
	}
}
</style>
