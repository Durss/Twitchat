<template>
	<div class="triggeractionscheduleparams">
		<ParamItem
			noBackground
			:paramData="param_action"
			v-model="triggerData.scheduleParams!.type"
			:error="triggerData.scheduleParams!.type == '0'"
		/>

		<template v-if="param_action.value == '1'">
			<ParamItem
				noBackground
				:paramData="param_repeatDurationCondition"
				v-model="param_repeatDurationCondition.value"
			>
				<ParamItem
					class="child"
					noBackground
					:paramData="param_repeatDurationValue"
					v-model="triggerData.scheduleParams!.repeatDuration"
				/>
			</ParamItem>
			<ParamItem
				noBackground
				:paramData="param_repeatMessageCondition"
				v-model="param_repeatMessageCondition.value"
			>
				<ParamItem
					class="child"
					noBackground
					:paramData="param_repeatMessageValue"
					v-model="triggerData.scheduleParams!.repeatMinMessages"
				/>
			</ParamItem>
		</template>

		<div v-else-if="param_action.value == '2'" class="card-item dateForm">
			<TTButton class="addBt" icon="add" @click="addDate()">{{
				$t("triggers.schedule.add_dateBt")
			}}</TTButton>

			<div
				class="dateList"
				v-if="triggerData.scheduleParams && triggerData.scheduleParams.dates.length > 0"
			>
				<div
					:class="dateClasses(d)"
					v-for="(d, index) in triggerData.scheduleParams?.dates"
					:key="'date' + index"
				>
					<div class="recurrent">
						<ParamItem
							noBackground
							:paramData="params_daily[index]"
							v-model="d.daily"
						/>
						<ParamItem
							noBackground
							:paramData="params_monthly[index]"
							v-model="d.monthly"
						/>
						<ParamItem
							noBackground
							:paramData="params_yearly[index]"
							v-model="d.yearly"
						/>
					</div>
					<div class="date">
						<input type="datetime-local" v-model="d.value" />
						<TTButton
							class="deleteBt"
							icon="cross"
							@click="delDate(index)"
							small
							alert
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import {
	ScheduleTriggerEvents,
	type TriggerData,
	type TriggerScheduleEventType,
	type TriggerScheduleTypesValue,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { onBeforeMount, ref, watch } from "vue";
import ParamItem from "../../ParamItem.vue";

const props = defineProps<{
	triggerData: TriggerData;
}>();

const param_action = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "list",
	value: "",
	icon: "date",
	labelKey: "triggers.schedule.param_action",
});
const param_repeatDurationCondition = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "timeout",
	labelKey: "triggers.schedule.param_repeatDurationCondition",
});
const param_repeatDurationValue = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "duration",
	value: 30 * 60,
	icon: "timeout",
	min: 0,
	max: 48 * 60 * 60,
	labelKey: "triggers.schedule.param_repeatDurationValue",
});
const param_repeatMessageCondition = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "whispers",
	labelKey: "triggers.schedule.param_repeatMessageCondition",
});
const param_repeatMessageValue = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 100,
	icon: "whispers",
	min: 1,
	max: 9999,
	labelKey: "triggers.schedule.param_repeatMessageValue",
});
const params_daily = ref<TwitchatDataTypes.ParameterData<boolean>[]>([]);
const params_monthly = ref<TwitchatDataTypes.ParameterData<boolean>[]>([]);
const params_yearly = ref<TwitchatDataTypes.ParameterData<boolean>[]>([]);

onBeforeMount(() => {
	//List all available trigger types
	let events: TriggerScheduleEventType[] = ScheduleTriggerEvents().concat();
	if (!props.triggerData.scheduleParams) {
		props.triggerData.scheduleParams = {
			type: events[1]!.value as TriggerScheduleTypesValue,
			repeatDuration: 30 * 60,
			repeatMinMessages: 100,
			dates: [],
		};
	}
	param_action.value.value = props.triggerData.scheduleParams?.type
		? props.triggerData.scheduleParams?.type
		: events[0]!.value;
	param_action.value.listValues = events;
	const duration = props.triggerData.scheduleParams!.repeatDuration;
	const minMess = props.triggerData.scheduleParams!.repeatMinMessages;
	param_repeatDurationCondition.value.value = duration != undefined && duration > 0;
	param_repeatMessageCondition.value.value = minMess != undefined && minMess > 0;

	for (let i = 0; i < props.triggerData.scheduleParams!.dates.length; i++) {
		addDateParam();
	}
});

function dateClasses(d: {
	daily: boolean;
	monthly: boolean;
	yearly: boolean;
	value: string;
}): string[] {
	const res: string[] = ["row"];
	if (new Date(d.value).getTime() < Date.now() && !d.daily && !d.monthly && !d.yearly)
		res.push("past");
	return res;
}

function addDate(): void {
	const d = new Date();
	d.setHours(d.getHours() + 1);
	const value =
		Utils.toDigits(d.getFullYear(), 4) +
		"-" +
		Utils.toDigits(d.getMonth() + 1, 2) +
		"-" +
		Utils.toDigits(d.getDate(), 2) +
		"T" +
		Utils.toDigits(d.getHours(), 2) +
		":" +
		Utils.toDigits(d.getMinutes(), 2);
	props.triggerData.scheduleParams?.dates?.push({
		value,
		daily: false,
		monthly: false,
		yearly: false,
	});
	addDateParam();
}

function delDate(index: number): void {
	props.triggerData.scheduleParams?.dates?.splice(index, 1);
}

function addDateParam(): void {
	params_daily.value.push({
		type: "boolean",
		value: false,
		labelKey: "triggers.schedule.param_daily",
	});
	params_monthly.value.push({
		type: "boolean",
		value: false,
		labelKey: "triggers.schedule.param_monthly",
	});
	params_yearly.value.push({
		type: "boolean",
		value: false,
		labelKey: "triggers.schedule.param_yearly",
	});
}

watch(
	() => param_repeatDurationCondition.value.value,
	() => {
		if (param_repeatDurationCondition.value.value === false) {
			props.triggerData.scheduleParams!.repeatDuration = 0;
		}
	},
);

watch(
	() => param_repeatMessageCondition.value.value,
	() => {
		if (param_repeatMessageCondition.value.value === false) {
			props.triggerData.scheduleParams!.repeatMinMessages = 0;
		}
	},
);
</script>

<style scoped lang="less">
.triggeractionscheduleparams {
	gap: 0.5em;
	display: flex;
	flex-direction: column;

	:deep(input) {
		&[type="number"] {
			flex-basis: 80px;
		}
	}

	.dateForm {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.dateList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		max-height: 300px;
		overflow-y: auto;
		padding: 0 0 0.25em 0;
		.row {
			display: flex;
			flex-direction: row;
			gap: 1em;

			&.past {
				input {
					opacity: 0.5;
					position: relative;
					align-items: center;
					&::before {
						content: "";
						position: absolute;
						height: 2px;
						background-color: var(--color-light);
						width: calc(100% - 1em);
						top: 1em;
					}
				}
			}

			.date {
				display: flex;
				flex-direction: row;
				.deleteBt {
					padding-left: 0.5em;
					padding-right: 0.5em;
					border-radius: 10px;
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
				}
				input {
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
				}
			}

			.recurrent {
				align-self: center;
				display: flex;
				flex-direction: column;
				font-size: 0.8em;
			}
		}
	}
}
</style>
