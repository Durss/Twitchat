<template>
	<div
		class="triggeractionbidwarentry triggerActionForm"
		v-if="storeBidWar.bidWarList.length === 0"
	>
		<div class="info alert">
			<div>{{ t("triggers.actions.bid_war.noBidwar") }}</div>
			<TTButton alert light icon="bidwar" @click="openBidWarParams">{{
				t("overlay.bidWar.add_bt")
			}}</TTButton>
		</div>
	</div>
	<div class="triggeractionbidwarentry triggerActionForm" v-else>
		<ParamItem :paramData="param_bidWarId" v-model="action.bidWarData.bidWarId" />
		<ParamItem :paramData="param_side" v-model="action.bidWarData.sideIndex" />
		<ParamItem :paramData="param_action" v-model="action.bidWarData.action" />
		<ParamItem :paramData="param_value" v-model="action.bidWarData.value" />
	</div>
</template>

<script setup lang="ts">
import ParamItem from "@/components/params/ParamItem.vue";
import TTButton from "@/components/TTButton.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import { storeBidWar as useStoreBidWar } from "@/store/bid_war/storeBidWar";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import {
	TriggerActionBidWarData_ActionList,
	type ITriggerPlaceholder,
	type TriggerActionBidWarData,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { onBeforeMount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	action: TriggerActionBidWarData;
	triggerData: TriggerData;
}>();

const { t } = useI18n();
const storeBidWar = useStoreBidWar();
const storeParams = useStoreParams();

const param_bidWarId = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "list",
	value: "",
	icon: "bidwar",
	labelKey: "triggers.actions.bid_war.param_bidWarId",
});
const param_side = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "list",
	value: 0,
	icon: "split",
	labelKey: "triggers.actions.bid_war.param_side",
});
const param_action = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "list",
	value: "",
	labelKey: "triggers.actions.bid_war.param_action",
});
const param_value = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	icon: "coin",
	maxLength: 1000,
	labelKey: "triggers.actions.bid_war.param_value",
});

useTriggerActionPlaceholders(
	props.action,
	props.triggerData,
	(list: ITriggerPlaceholder<any>[]): void => {
		param_value.value.placeholderList = list.filter((v) => v.numberParsable);
	},
);

/**
 * Lists the sides of the selected bid war
 */
function updateSideList(): void {
	const bidWar = storeBidWar.bidWarList.find((v) => v.id == props.action.bidWarData.bidWarId);
	param_side.value.listValues = ([0, 1] as const).map((index) => {
		const keyword = bidWar?.sides[index]?.keyword.trim();
		const label = t("overlay.bidWar.side_title", { INDEX: index + 1 });
		return { value: index, label: keyword ? label + " (" + keyword + ")" : label };
	});
}

function openBidWarParams(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.OVERLAYS,
		TwitchatDataTypes.ParamDeepSections.BIDWAR,
	);
}

onBeforeMount(() => {
	if (!props.action.bidWarData) {
		props.action.bidWarData = {
			bidWarId: storeBidWar.bidWarList[0]?.id ?? "",
			sideIndex: 0,
			action: "add",
			value: "",
		};
	}

	param_bidWarId.value.listValues = storeBidWar.bidWarList.map((entry, index) => {
		return {
			value: entry.id,
			label: entry.title || t("overlay.bidWar.default_title") + " " + (index + 1),
		};
	});

	param_action.value.listValues = TriggerActionBidWarData_ActionList.map((action) => {
		return {
			value: action,
			label: t("triggers.actions.bid_war.actions." + action),
		};
	});

	updateSideList();
	watch(() => props.action.bidWarData.bidWarId, updateSideList);
});
</script>

<style scoped lang="less">
.triggeractionbidwarentry {
	.info {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}
}
</style>
