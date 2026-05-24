<template>
	<div class="triggeractionmeldstudioentry triggerActionForm" v-if="!storeMeldStudio.connected">
		<div class="info warn">
			<Icon name="info" alt="info" theme="light" />
			<i18n-t
				scope="global"
				class="label"
				tag="p"
				keypath="triggers.actions.meldstudio.connect"
			>
				<template #LINK>
					<a @click="openMeldConnect()">{{
						t("triggers.actions.meldstudio.connect_link")
					}}</a>
				</template>
			</i18n-t>
		</div>
	</div>
	<div class="triggeractionmeldstudioentry triggerActionForm" v-else-if="action.meldstudioData">
		<ParamItem :paramData="param_action" v-model="action.meldstudioData.action" noBackground />
		<ParamItem
			v-if="
				action.meldstudioData.action == 'show_scene' ||
				action.meldstudioData.action == 'toggle_effect' ||
				action.meldstudioData.action == 'layer_visibility'
			"
			:paramData="param_scene"
			v-model="action.meldstudioData.sceneId"
			noBackground
		/>
		<ParamItem
			v-if="
				action.meldstudioData.action == 'toggle_effect' ||
				action.meldstudioData.action == 'layer_visibility'
			"
			:readonly="!action.meldstudioData.sceneId"
			:disabled="!action.meldstudioData.sceneId"
			:paramData="param_layer"
			v-model="action.meldstudioData.layerId"
			noBackground
		/>
		<ParamItem
			v-if="action.meldstudioData.action == 'toggle_effect'"
			:readonly="!action.meldstudioData.layerId"
			:disabled="!action.meldstudioData.layerId"
			:paramData="param_effect"
			v-model="action.meldstudioData.effectId"
			noBackground
		/>
		<ParamItem
			v-if="action.meldstudioData.action == 'track_mute'"
			:paramData="param_track"
			v-model="action.meldstudioData.trackId"
			noBackground
		/>
		<ParamItem
			v-if="
				param_subAction.listValues!.length > 0 &&
				(action.meldstudioData.action == 'clip' ||
					action.meldstudioData.action == 'track_mute' ||
					action.meldstudioData.action == 'toggle_effect' ||
					action.meldstudioData.action == 'layer_visibility')
			"
			:disabled="param_subActionDisabled"
			:readonly="param_subActionDisabled"
			:paramData="param_subAction"
			v-model="action.meldstudioData.subAction"
			noBackground
		/>
	</div>
</template>

<script setup lang="ts">
import ParamItem from "@/components/params/ParamItem.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import { storeMeldStudio as useStoreMeldStudio } from "@/store/meldstudio/storeMeldStudio";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import type {
	ITriggerPlaceholder,
	TriggerActionMeldStudioData,
	TriggerData,
} from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";
type MeldAction = NonNullable<TriggerActionMeldStudioData["meldstudioData"]>["action"];
type MeldLayerVisibilitySubAction = Extract<
	NonNullable<TriggerActionMeldStudioData["meldstudioData"]>,
	{ action: "layer_visibility" }
>["subAction"];
type MeldLayerMuteSubAction = Extract<
	NonNullable<TriggerActionMeldStudioData["meldstudioData"]>,
	{ action: "track_mute" }
>["subAction"];
type MeldLayerMClipSubAction = Extract<
	NonNullable<TriggerActionMeldStudioData["meldstudioData"]>,
	{ action: "clip" }
>["subAction"];

const { t } = useI18n();
const storeParams = useStoreParams();
const storeMeldStudio = useStoreMeldStudio();
const props = defineProps<{
	action: TriggerActionMeldStudioData;
	triggerData: TriggerData;
}>();

const param_subActionDisabled = computed<boolean>(() => {
	switch (props.action.meldstudioData?.action) {
		case "track_mute":
			return !props.action.meldstudioData.trackId;
		case "layer_visibility":
			return !props.action.meldstudioData.sceneId || !props.action.meldstudioData.layerId;
		case "toggle_effect":
			return (
				!props.action.meldstudioData.sceneId ||
				!props.action.meldstudioData.layerId ||
				!props.action.meldstudioData.effectId
			);
	}
	return false;
});

const param_subAction = computed(() => {
	const result: TwitchatDataTypes.ParameterData<
		MeldLayerVisibilitySubAction | MeldLayerMuteSubAction | MeldLayerMClipSubAction | "",
		MeldLayerVisibilitySubAction | MeldLayerMuteSubAction | MeldLayerMClipSubAction | ""
	> = {
		type: "list",
		value: "",
		listValues: [],
	};
	switch (props.action.meldstudioData?.action) {
		case "track_mute": {
			// result.labelKey = "triggers.actions.meldstudio.param_subAction_audio";
			const list: TwitchatDataTypes.ParameterDataListValue<MeldLayerMuteSubAction>[] = [
				{
					value: "mute",
					labelKey: "triggers.actions.meldstudio.param_subAction_mute",
				},
				{
					value: "unmute",
					labelKey: "triggers.actions.meldstudio.param_subAction_unmute",
				},
				{
					value: "toggle",
					labelKey: "triggers.actions.meldstudio.param_subAction_toggle",
				},
			];
			result.listValues = list;
			break;
		}
		case "toggle_effect":
		case "layer_visibility": {
			// result.labelKey = "triggers.actions.meldstudio.param_subAction_visibility";
			const list: TwitchatDataTypes.ParameterDataListValue<MeldLayerVisibilitySubAction>[] = [
				{
					value: "show",
					labelKey: "triggers.actions.meldstudio.param_subAction_show",
				},
				{
					value: "hide",
					labelKey: "triggers.actions.meldstudio.param_subAction_hide",
				},
				{
					value: "toggle",
					labelKey: "triggers.actions.meldstudio.param_subAction_toggle",
				},
			];
			result.listValues = list;
			break;
		}
		case "clip": {
			// result.labelKey = "triggers.actions.meldstudio.param_subAction_clip";
			const list: TwitchatDataTypes.ParameterDataListValue<MeldLayerMClipSubAction | "">[] = [
				{ value: "", labelKey: "global.select_placeholder" },
				{ value: "record", labelKey: "triggers.actions.meldstudio.param_subAction_record" },
				{ value: "show", labelKey: "triggers.actions.meldstudio.param_subAction_replay" },
				{
					value: "hide",
					labelKey: "triggers.actions.meldstudio.param_subAction_stopReplay",
				},
			];
			result.listValues = list;
			break;
		}
	}
	return result;
});

const param_action = ref<TwitchatDataTypes.ParameterData<MeldAction, MeldAction>>({
	type: "list",
	value: "unset",
	listValues: [],
	labelKey: "triggers.actions.meldstudio.param_action",
});
const param_scene = computed<TwitchatDataTypes.ParameterData<string, string>>(() => {
	const data = props.action.meldstudioData;
	return {
		type: "list",
		value: data && "sceneId" in data ? data.sceneId : "",
		labelKey: "triggers.actions.meldstudio.param_scene",
		listValues: [
			{ value: "", labelKey: "global.select_placeholder" },
			...storeMeldStudio.sceneList.map((v) => ({
				value: v.id,
				label: v.name,
			})),
		],
	};
});
const param_layer = computed<TwitchatDataTypes.ParameterData<string, string>>(() => {
	const data = props.action.meldstudioData;
	return {
		type: "list",
		value: data && "layerId" in data ? data.layerId : "",
		labelKey: "triggers.actions.meldstudio.param_layer",
		listValues: [
			{ value: "", labelKey: "global.select_placeholder" },
			...storeMeldStudio.layerList
				.filter((v) => {
					if (!data) return true;
					if (!("sceneId" in data)) return true;
					return v.parent == data.sceneId;
				})
				.map((v) => ({
					value: v.id,
					label: v.name,
				})),
		],
	};
});
const param_effect = computed<TwitchatDataTypes.ParameterData<string, string>>(() => {
	const data = props.action.meldstudioData;
	return {
		type: "list",
		value: data && "effectId" in data ? data.effectId : "",
		labelKey: "triggers.actions.meldstudio.param_effect",
		listValues: [
			{ value: "", labelKey: "global.select_placeholder" },
			...storeMeldStudio.effectList
				.filter((v) => {
					if (!data) return true;
					if (!("layerId" in data)) return true;
					return v.parent == data.layerId;
				})
				.map((v) => ({
					value: v.id,
					label: v.name,
				})),
		],
	};
});
const param_track = computed<TwitchatDataTypes.ParameterData<string, string>>(() => {
	const data = props.action.meldstudioData;
	return {
		type: "list",
		value: data && "trackId" in data ? data.trackId : "",
		labelKey: "triggers.actions.meldstudio.param_track",
		listValues: [
			{ value: "", labelKey: "global.select_placeholder" },
			...storeMeldStudio.trackList.map((v) => ({
				value: v.id,
				label: v.name,
			})),
		],
	};
});

type ActionKeys = NonNullable<TriggerActionMeldStudioData["meldstudioData"]>["action"];
const actions: Record<ActionKeys, boolean> = {
	unset: true,
	show_scene: true,
	layer_visibility: true,
	toggle_effect: true,
	track_mute: true,
	screenshot: true,
	clip: true,
	start_record: true,
	stop_record: true,
	start_stream: true,
	stop_stream: true,
};
param_action.value.listValues = [];
for (const key in actions) {
	if (!Object.hasOwn(actions, key)) continue;
	param_action.value.listValues.push({
		value: key as ActionKeys,
		labelKey: `triggers.actions.meldstudio.actions.${key}`,
	});
}

function openMeldConnect(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.MELD_STUDIO,
	);
}

onBeforeMount(() => {
	if (!props.action.meldstudioData) {
		props.action.meldstudioData = {
			action: "unset",
		};
	}
});

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	// param_post.value.placeholderList = list;
}

useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);
</script>

<style scoped lang="less">
.triggeractionmeldstudioentry {
}
</style>
