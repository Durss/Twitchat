<template>
	<div class="TriggerActionHeatParams">
		<ParamItem
			noBackground
			:paramData="param_clickSource"
			v-model="triggerData.heatClickSource"
			@change="cleanupData"
		/>

		<template v-if="param_clickSource.value == 'area'">
			<div><Icon name="polygon" />{{ $t("triggers.actions.heat.select_area") }}</div>
			<div class="screenList" v-if="storeHeat.screenList.length > 0">
				<HeatScreenPreview
					class="screen"
					v-for="screen in storeHeat.screenList"
					:key="screen.id"
					selectAreaMode
					@select="(id: string) => onSelectArea(id)"
					:selectedAreas="triggerData.heatAreaIds"
					:screen="screen"
				/>
			</div>

			<div class="card-item secondary noArea" v-else>
				<span class="label">{{ $t("triggers.actions.heat.no_area") }}</span>
				<TTButton secondary light @click="openHeatParams()">{{
					$t("triggers.actions.heat.create_areaBt")
				}}</TTButton>
			</div>
		</template>

		<template v-if="param_clickSource.value == 'obs'">
			<template v-if="obsConnected">
				<ParamItem
					noBackground
					:paramData="param_obsSources"
					v-model="triggerData.heatObsSource"
				/>
				<ToggleBlock
					:title="$t('heat.click_source_info_title')"
					:icons="['alert']"
					small
					secondary
					:open="false"
				>
					<i18n-t
						scope="global"
						class="infos"
						tag="p"
						keypath="heat.click_source_info_description"
					>
						<template #CMD><mark>/clearobscache</mark></template>
					</i18n-t>
				</ToggleBlock>
			</template>

			<div v-else class="card-item alert error">
				<p v-html="$t('heat.need_OBS')"></p>
				<TTButton @click="openOBSParams()" alert light icon="obs">{{
					$t("heat.need_OBS_connectBt")
				}}</TTButton>
			</div>
		</template>

		<ParamItem noBackground :paramData="param_allowAnon" v-model="triggerData.heatAllowAnon" />
		<ParamItem
			secondary
			noBackground
			class="cooldown"
			:paramData="param_globalCD"
			v-model="triggerData.cooldown!.global"
		/>
		<ParamItem
			secondary
			noBackground
			class="cooldown"
			:paramData="param_userCD"
			v-model="triggerData.cooldown!.user"
		/>

		<ToggleBlock
			class="permissions"
			:open="false"
			:title="$t('triggers.actions.chat.allowed_users')"
			:icons="['lock_fit']"
			medium
			primary
		>
			<PermissionsForm v-if="triggerData.permissions" v-model="triggerData.permissions" />
		</ToggleBlock>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import Icon from "@/components/Icon.vue";
import PermissionsForm from "@/components/PermissionsForm.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import type { TriggerData } from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { OBSSourceItem } from "@/utils/OBSWebsocket";
import ParamItem from "../../ParamItem.vue";
import HeatScreenPreview from "../heat/areas/HeatScreenPreview.vue";
import OBSWebsocket from "@/utils/OBSWebsocket";
import { computed, watch, onBeforeMount, onMounted, ref } from "vue";
import Utils from "@/utils/Utils";
import { storeHeat as useStoreHeat } from "@/store/heat/storeHeat";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeParams as useStoreParams } from "@/store/params/storeParams";

const props = defineProps<{
	triggerData: TriggerData;
	obsSources: OBSSourceItem[];
}>();

const storeHeat = useStoreHeat();
const storeCommon = useStoreCommon();
const storeParams = useStoreParams();

const param_clickSource = ref<TwitchatDataTypes.ParameterData<TriggerData["heatClickSource"]>>({
	type: "list",
	value: "all",
	listValues: [],
	labelKey: "heat.click_source",
	icon: "click",
});
const param_obsSources = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "list",
	value: "",
	listValues: [],
	labelKey: "heat.obs_source",
	icon: "obs",
});
const param_allowAnon = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "heat.param_anon",
	icon: "anon",
	tooltipKey: "heat.anonymous",
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

const obsConnected = computed(() => OBSWebsocket.instance.connected.value);

onBeforeMount(() => {
	if (!props.triggerData.heatAreaIds) props.triggerData.heatAreaIds = [];
	if (!props.triggerData.permissions) {
		props.triggerData.permissions = Utils.getDefaultPermissions();
	}
	if (!props.triggerData.cooldown) {
		props.triggerData.cooldown = {
			global: 0,
			user: 0,
			alert: false,
		};
	}

	const entries: TwitchatDataTypes.ParameterDataListValue<TriggerData["heatClickSource"]>[] = [
		{ value: "obs", labelKey: "heat.click_source_obs" },
		{ value: "area", labelKey: "heat.click_source_area" },
		{ value: "all", labelKey: "heat.click_source_all" },
	];
	param_clickSource.value.listValues = entries;

	populateObsSources();
});

onMounted(() => {
	//Cleanup any area ID from the trigger that does not exist anymore
	//in the screens definitions
	const screenList = storeHeat.screenList;
	if (!props.triggerData.heatAreaIds) props.triggerData.heatAreaIds = [];
	for (let i = 0; i < props.triggerData.heatAreaIds!.length; i++) {
		const id = props.triggerData.heatAreaIds![i];
		let found = false;
		for (let j = 0; j < screenList.length; j++) {
			if (screenList[j]!.areas.findIndex((v) => v.id == id) > -1) {
				found = true;
			}
		}
		if (!found) {
			props.triggerData.heatAreaIds!.splice(i, 1);
			i--;
		}
	}
});

function onSelectArea(id: string): void {
	if (!props.triggerData.heatAreaIds) props.triggerData.heatAreaIds = [];
	const index = props.triggerData.heatAreaIds.indexOf(id);
	if (index > -1) {
		props.triggerData.heatAreaIds.splice(index, 1);
	} else if (props.triggerData.heatAreaIds.length < 100) {
		props.triggerData.heatAreaIds.push(id);
	} else {
		storeCommon.alert("You reached the maximum of 100 clickable areas");
	}
}

function openHeatParams(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.HEAT_AREAS,
	);
}

function openOBSParams(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.OBS,
	);
}

function cleanupData(prevValue: any, newValue: any): void {
	if (prevValue === newValue) return;

	switch (param_clickSource.value.value) {
		case "obs": {
			props.triggerData.heatAreaIds = undefined;
			props.triggerData.heatObsSource =
				param_obsSources.value.listValues && param_obsSources.value.listValues.length > 0
					? param_obsSources.value.listValues[0]!.value
					: "";
			break;
		}
		case "area": {
			props.triggerData.heatAreaIds = props.triggerData.heatAreaIds || [];
			props.triggerData.heatObsSource = undefined;
			break;
		}
		default: {
			props.triggerData.heatAreaIds = undefined;
			props.triggerData.heatObsSource = undefined;
		}
	}
}

function populateObsSources(): void {
	param_obsSources.value.listValues = (props.obsSources || []).map((v) => {
		return { value: v.sourceName, label: v.sourceName };
	});
}

watch(
	() => props.obsSources,
	() => populateObsSources(),
);
</script>

<style scoped lang="less">
.TriggerActionHeatParams {
	gap: 0.5em;
	display: flex;
	flex-direction: column;

	.icon {
		height: 1em;
		width: 1em;
		margin-right: 0.5em;
	}

	.screenList {
		gap: 5px;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: 0.5em;
		.screen {
			width: 30%;
		}
	}

	.noArea {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 0.5em;
	}

	.permissions {
		align-self: center;
	}

	.error {
		text-align: center;
		button {
			margin-top: 0.5em;
		}
	}

	.infos {
		font-size: 0.9em;
		line-height: 1.2em;
	}
}
</style>
