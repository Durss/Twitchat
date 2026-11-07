<template>
	<div class="triggeractionclickableareaentry triggerActionForm">
		<ParamItem :paramData="param_action" v-model="action.clickableAreaData.action" />

		<div class="title">
			<Icon name="polygon" />{{ t("triggers.actions.clickable_area.select") }}
		</div>

		<div class="screenList" v-if="sortedScreens.length > 0">
			<ClickableAreaScreenPreview
				class="screen"
				v-for="screen in sortedScreens"
				:key="screen.id"
				selectAreaMode
				@select="onSelectArea"
				:selectedAreas="action.clickableAreaData.areaIds"
				:screen="screen"
			/>
		</div>

		<div class="card-item secondary noArea" v-else>
			<span class="label">{{ t("triggers.actions.clickable_area.no_area") }}</span>
			<TTButton secondary light @click="openAreasParams()">{{
				t("triggers.actions.clickable_area.create_areaBt")
			}}</TTButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import TTButton from "@/components/TTButton.vue";
import { storeHeat as useStoreHeat } from "@/store/heat/storeHeat";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import type {
	TriggerActionClickableAreaData,
	TriggerActionClickableAreaDataAction,
	TriggerData,
} from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { toast } from "@/utils/toast/toast.js";
import { computed, onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ClickableAreaScreenPreview from "../../heat/areas/HeatScreenPreview.vue";

const { t } = useI18n();

const props = defineProps<{
	action: TriggerActionClickableAreaData;
	triggerData: TriggerData;
}>();

const MAX_SELECTABLE_AREAS = 100;
const storeHeat = useStoreHeat();
const storeParams = useStoreParams();

const param_action = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "list",
	value: "",
	labelKey: "triggers.actions.clickable_area.action",
});

const sortedScreens = computed(() => {
	return storeHeat.screenList.concat().sort((a, b) => (a.enabled ? -1 : 1));
});

onBeforeMount(() => {
	if (!props.action.clickableAreaData) {
		props.action.clickableAreaData = { areaIds: [], action: "toggle" };
	}
	const data = props.action.clickableAreaData;
	if (!data.areaIds) data.areaIds = [];
	if (!data.action) data.action = "toggle";

	const values: TwitchatDataTypes.ParameterDataListValue<TriggerActionClickableAreaDataAction>[] =
		[];
	values.push({ value: "enable", labelKey: "triggers.actions.clickable_area.action_enable" });
	values.push({ value: "disable", labelKey: "triggers.actions.clickable_area.action_disable" });
	values.push({ value: "toggle", labelKey: "triggers.actions.clickable_area.action_toggle" });
	param_action.value.listValues = values;

	//Cleanup any area ID that does not exist anymore in the screens definitions
	const areaIds = storeHeat.screenList
		.map((v) => v.areas)
		.flat()
		.map((v) => v.id);
	data.areaIds = data.areaIds.filter((id) => areaIds.includes(id));
});

function onSelectArea(id: string): void {
	const areaIds = props.action.clickableAreaData.areaIds;
	const index = areaIds.indexOf(id);
	if (index > -1) {
		areaIds.splice(index, 1);
	} else if (areaIds.length < MAX_SELECTABLE_AREAS) {
		areaIds.push(id);
	} else {
		toast(t("triggers.actions.clickable_area.max_area_reached", { MAX: MAX_SELECTABLE_AREAS }));
	}
}

function openAreasParams(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.OVERLAYS,
		TwitchatDataTypes.ParamDeepSections.CLICKABLE_AREAS,
	);
}
</script>

<style scoped lang="less">
.triggeractionclickableareaentry {
	min-width: 100%;
	.title {
		.icon {
			height: 1em;
			width: 1em;
			margin-right: 0.5em;
		}
	}

	.screenList {
		gap: 5px;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		overflow-y: auto;
		max-height: 400px;
		min-width: 600px;
		.screen {
			width: 80%;
		}
	}

	.noArea {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>
