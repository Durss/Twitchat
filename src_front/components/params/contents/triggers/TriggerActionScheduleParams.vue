<template>
	<div class="triggeractionscheduleparams">
		<ParamItem noBackground :paramData="param_action" v-model="triggerData.scheduleParams!.type" :error="triggerData.scheduleParams!.type == '0'" />
		
		<template v-if="param_action.value == '1'">
			<ParamItem noBackground :paramData="param_repeatDurationCondition" v-model="param_repeatDurationCondition.value">
				<ParamItem class="child" noBackground :paramData="param_repeatDurationValue" v-model="triggerData.scheduleParams!.repeatDuration" />
			</ParamItem>
			<ParamItem noBackground :paramData="param_repeatMessageCondition" v-model="param_repeatMessageCondition.value">
				<ParamItem class="child" noBackground :paramData="param_repeatMessageValue" v-model="triggerData.scheduleParams!.repeatMinMessages" />
			</ParamItem>
		</template>
		
		<div v-else-if="param_action.value == '2'" class="card-item dateForm">
			<Button class="addBt"
				icon="add"
				@click="addDate()">{{ $t('triggers.schedule.add_dateBt') }}</Button>

			<div class="dateList"
			v-if="triggerData.scheduleParams && triggerData.scheduleParams.dates.length > 0">
				<div :class="dateClasses(d)"
				v-for="(d, index) in triggerData.scheduleParams?.dates"
				:key="'date'+index">
					<div class="recurrent">
						<ParamItem noBackground :paramData="params_daily[index]" v-model="d.daily" />
						<ParamItem noBackground :paramData="params_monthly[index]" v-model="d.monthly" />
						<ParamItem noBackground :paramData="params_yearly[index]" v-model="d.yearly" />
					</div>
					<div class="date">
						<input type="datetime-local" v-model="d.value" />
						<Button class="deleteBt" icon="cross" @click="delDate(index)" small alert />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { ScheduleTriggerEvents, type TriggerData, type TriggerScheduleEventType, type TriggerScheduleTypesValue } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import PermissionsForm from '../../../PermissionsForm.vue';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		Button: TTButton,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
class TriggerActionScheduleParams extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public param_action:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", icon:"date", labelKey:"triggers.schedule.param_action" };
	public param_repeatDurationCondition:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"timeout", labelKey:"triggers.schedule.param_repeatDurationCondition" };
	public param_repeatDurationValue:TwitchatDataTypes.ParameterData<number> = { type:"duration", value:30 * 60, icon:"timeout", min:0, max:48*60*60, labelKey:"triggers.schedule.param_repeatDurationValue" };
	public param_repeatMessageCondition:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"whispers", labelKey:"triggers.schedule.param_repeatMessageCondition" };
	public param_repeatMessageValue:TwitchatDataTypes.ParameterData<number> = { type:"number", value:100, icon:"whispers", min:1, max:9999, labelKey:"triggers.schedule.param_repeatMessageValue" };
	public params_daily:TwitchatDataTypes.ParameterData<boolean>[] = [];
	public params_monthly:TwitchatDataTypes.ParameterData<boolean>[] = [];
	public params_yearly:TwitchatDataTypes.ParameterData<boolean>[] = [];

	public beforeMount():void {
		//List all available trigger types
		let events:TriggerScheduleEventType[] = ScheduleTriggerEvents().concat();
		if(!this.triggerData.scheduleParams) {
			this.triggerData.scheduleParams = {
				type:events[1]!.value as TriggerScheduleTypesValue,
				repeatDuration:30 * 60,
				repeatMinMessages:100,
				dates:[],
			}
		}
		this.param_action.value						= this.triggerData.scheduleParams?.type? this.triggerData.scheduleParams?.type : events[0]!.value;
		this.param_action.listValues				= events;
		const duration								= this.triggerData.scheduleParams!.repeatDuration;
		const minMess								= this.triggerData.scheduleParams!.repeatMinMessages;
		this.param_repeatDurationCondition.value	= duration != undefined && duration > 0;
		this.param_repeatMessageCondition.value		= minMess != undefined && minMess > 0;

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
		d.setHours(d.getHours()+1)
		const value = Utils.toDigits(d.getFullYear(),4)
					+"-"+Utils.toDigits(d.getMonth()+1,2)
					+"-"+Utils.toDigits(d.getDate(),2)
					+"T"+Utils.toDigits(d.getHours(),2)
					+":"+Utils.toDigits(d.getMinutes(),2)
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
export default toNative(TriggerActionScheduleParams);
</script>

<style scoped lang="less">
.triggeractionscheduleparams{
	gap: .5em;
	display: flex;
	flex-direction: column;

	:deep(input) {
		&[type="number"] {
			flex-basis: 80px;
		}
	}

	.dateForm {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.dateList {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		max-height: 300px;
		overflow-y: auto;
		padding: 0 0 .25em 0;
		.row {
			display: flex;
			flex-direction: row;
			gap: 1em;

			&.past {
				input {
					opacity: .5;
					position: relative;
					align-items: center;
					&::before {
						content:"";
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