<template>
	<div class="triggeractionscheduleparams">
		<ParamItem :paramData="param_action" v-model="triggerData.scheduleParams!.type" />
		
		<template v-if="param_action.value == '1'">
			<ParamItem :paramData="param_repeatDurationCondition">
				<ParamItem :paramData="param_repeatDurationValue" v-model="triggerData.scheduleParams!.repeatDuration" />
			</ParamItem>
			<ParamItem :paramData="param_repeatMessageCondition">
				<ParamItem :paramData="param_repeatMessageValue" v-model="triggerData.scheduleParams!.repeatMinMessages" />
			</ParamItem>
		</template>
		
		<template v-else-if="param_action.value == '2'">
			<Button class="addBt"
				icon="date"
				:title="$t('triggers.schedule.add_dateBt')"
				@click="addDate()" />

			<div class="dateList"
			v-if="triggerData.scheduleParams && triggerData.scheduleParams.dates.length > 0">
				<div :class="dateClasses(d)"
				v-for="(d, index) in triggerData.scheduleParams?.dates"
				:key="'date'+index">
					<div class="recurrent">
						<ParamItem :paramData="params_daily[index]" v-model="d.daily" />
						<ParamItem :paramData="params_monthly[index]" v-model="d.monthly" />
						<ParamItem :paramData="params_yearly[index]" v-model="d.yearly" />
					</div>
					<div class="date">
						<input type="datetime-local" v-model="d.value" />
						<Button class="deleteBt" icon="cross" @click="delDate(index)" small highlight />
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { ScheduleTriggerEvents, TriggerEventTypeCategories, type TriggerData, type TriggerScheduleEventType, type TriggerScheduleTypesValue } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import PermissionsForm from '../../../PermissionsForm.vue';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
export default class TriggerActionScheduleParams extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public param_action:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", icon:"date.svg" };
	public param_repeatDurationCondition:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"timeout.svg" };
	public param_repeatDurationValue:TwitchatDataTypes.ParameterData<number> = { type:"number", value:20, icon:"timeout.svg", min:0, max:48*60 };
	public param_repeatMessageCondition:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"whispers.svg" };
	public param_repeatMessageValue:TwitchatDataTypes.ParameterData<number> = { type:"number", value:100, icon:"whispers.svg", min:1, max:9999 };
	public params_daily:TwitchatDataTypes.ParameterData<boolean>[] = [];
	public params_monthly:TwitchatDataTypes.ParameterData<boolean>[] = [];
	public params_yearly:TwitchatDataTypes.ParameterData<boolean>[] = [];

	public beforeMount():void {
		//List all available trigger types
		let events:TriggerScheduleEventType[] = [
			{labelKey:"triggers.schedule.default_action", icon:"date", value:"0", category:TriggerEventTypeCategories.TWITCHAT},
		];
		events = events.concat(ScheduleTriggerEvents());
		if(!this.triggerData.scheduleParams) {
			this.triggerData.scheduleParams = {
				type:events[1].value as TriggerScheduleTypesValue,
				repeatDuration:30,
				repeatMinMessages:100,
				dates:[],
			}
		}
		this.param_action.value							= this.triggerData.scheduleParams?.type? this.triggerData.scheduleParams?.type : events[0].value;
		this.param_action.listValues					= events;
		const duration									= this.triggerData.scheduleParams!.repeatDuration;
		const minMess									= this.triggerData.scheduleParams!.repeatMinMessages;
		this.param_repeatDurationCondition.value		= duration != undefined && duration > 0;
		this.param_repeatMessageCondition.value			= minMess != undefined && minMess > 0;
		this.param_action.labelKey						= "triggers.schedule.param_action";
		this.param_repeatDurationCondition.labelKey		= "triggers.schedule.param_repeatDurationCondition";
		this.param_repeatDurationValue.labelKey			= "triggers.schedule.param_repeatDurationValue";
		this.param_repeatMessageCondition.labelKey		= "triggers.schedule.param_repeatMessageCondition";
		this.param_repeatMessageValue.labelKey			= "triggers.schedule.param_repeatMessageValue";

		watch(()=>this.param_repeatDurationCondition.value, ()=> {
			if(this.param_repeatDurationCondition.value === false) {
				this.triggerData.scheduleParams!.repeatDuration = 0;
			}
		});

		watch(()=>this.param_repeatMessageCondition.value, ()=> {
			if(this.param_repeatMessageCondition.value === false) {
				this.triggerData.scheduleParams!.repeatMinMessages = 0;
			}
		});
		
		for (let i = 0; i < this.triggerData.scheduleParams!.dates.length; i++) {
			this.addDateParam();
		}
	}

	public dateClasses(d:{daily:boolean, monthly:boolean, yearly:boolean, value:string}):string[] {
		const res:string[] = ["row"];
		if(new Date(d.value).getTime() < Date.now() && !d.daily && !d.monthly && !d.yearly) res.push("past");
		return res;
	}

	public addDate():void {
		const d = new Date();
		const value = Utils.toDigits(d.getFullYear(),4)
					+"-"+Utils.toDigits(d.getMonth()+1,2)
					+"-"+Utils.toDigits(d.getDate(),2)
					+"T"+Utils.toDigits(d.getHours(),2)
					+":"+Utils.toDigits(d.getMinutes()+5,2)
		this.triggerData.scheduleParams?.dates?.push({value, daily:false, monthly:false, yearly:false});
		this.addDateParam();
	}

	public delDate(index:number):void {
		this.triggerData.scheduleParams?.dates?.splice(index, 1);
	}

	private addDateParam():void {
		this.params_daily.push({ type:"boolean", value:false, labelKey:"triggers.schedule.param_daily"} );
		this.params_monthly.push({ type:"boolean", value:false, labelKey:"triggers.schedule.param_monthly"} );
		this.params_yearly.push({ type:"boolean", value:false, labelKey:"triggers.schedule.param_yearly"} );
	}

}
</script>

<style scoped lang="less">
.triggeractionscheduleparams{
	display: flex;
	flex-direction: column;
	gap: .5em;

	:deep(input) {
		&[type="number"] {
			flex-basis: 80px;
		}
	}

	.dateList {
		display: flex;
		flex-direction: column;
		gap: .5em;
		align-items: center;
		max-height: 300px;
		overflow-y: auto;
		border: 1px solid var(--mainColor_normal);
		margin: -.5em .5em 0 .5em;
		border-top: 0;
		padding: .5em;
		border-bottom-left-radius: .5em;
		border-bottom-right-radius: .5em;
		background-color: fade(@mainColor_normal, 10%);
		.row {
			display: flex;
			flex-direction: row;
			gap: 1em;

			&.past {
				input {
					opacity: .5;
					position: relative;
					&::before {
						content:"";
						position: absolute;
						height: 2px;
						background-color: var(--mainColor_normal);
						width: calc(100% - 1.5em);
						top: 50%;
					}
				}
			}

			.date {
				display: flex;
				flex-direction: row;
				.deleteBt {
					padding-left: .5em;
					padding-right: .5em;
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
				font-size: .8em;
			}
		}
	}
}
</style>