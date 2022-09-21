<template>
	<ToggleBlock
	medium
	class="triggeractionscheduleparams"
	:open="true"
	title="Parameters"
	:icons="['params']">

		<ParamItem class="row" :paramData="param_name" @focusout="onUpdateName()" :error="nameConflict" />
		<div v-if="nameConflict" class="nameConflict">A schedule with this name already exists</div>

		<ParamItem class="row" :paramData="param_action" v-model="triggerData.scheduleParams!.type" />
		
		<div class="row" v-if="param_action.value == '1'">
			<ParamItem class="row" :paramData="param_repeatDurationCondition">
				<ParamItem class="row" :paramData="param_repeatDurationValue" v-model="triggerData.scheduleParams!.repeatDuration" />
			</ParamItem>
			<ParamItem class="row" :paramData="param_repeatMessageCondition">
				<ParamItem class="row" :paramData="param_repeatMessageValue" v-model="triggerData.scheduleParams!.repeatMinMessages" />
			</ParamItem>
		</div>
		
		<div class="row dates" v-else-if="param_action.value == '2'">
			<div class="row list">
				<div :class="dateClasses(d)"
				v-for="(d, index) in triggerData.scheduleParams?.dates"
				:key="'date'+index">
					<div class="date">
						<input type="datetime-local" v-model="d.value" />
						<Button class="deleteBt" :icon="$image('icons/cross_white.svg')" @click="delDate(index)" small highlight />
					</div>
					<div class="recurrent">
						<strong>Repeat:</strong>
						<ParamItem :paramData="params_daily[index]" v-model="d.daily" />
						<ParamItem :paramData="params_yearly[index]" v-model="d.yearly" />
					</div>
				</div>
			</div>
			<Button class="row" :icon="$image('icons/date.svg')" title="Add date" @click="addDate()" />
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { storeTriggers } from '@/store/triggers/storeTriggers';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { ScheduleTriggerEvents, TriggerTypes } from '@/utils/TriggerActionData';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../ParamItem.vue';
import PermissionsForm from '../obs/PermissionsForm.vue';

@Options({
	props:{
		triggerData:Object,
	},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		PermissionsForm,
	}
})
export default class TriggerActionScheduleParams extends Vue {

	public triggerData!:TwitchatDataTypes.TriggerData;

	public nameConflict = false;
	public param_name:TwitchatDataTypes.ParameterData = { type:"text", value:"", label:"Schedule name", icon:"date_purple.svg", placeholder:"..." };
	public param_action:TwitchatDataTypes.ParameterData = { type:"list", value:"", label:"Schedule type", icon:"date_purple.svg" };
	public param_repeatDurationCondition:TwitchatDataTypes.ParameterData = { type:"toggle", value:false, label:"Time based repeat", icon:"timeout_purple.svg" };
	public param_repeatDurationValue:TwitchatDataTypes.ParameterData = { type:"number", value:0, label:"Execute every {VALUE} minutes", icon:"timeout_purple.svg", min:.1, max:48*60 };
	public param_repeatMessageCondition:TwitchatDataTypes.ParameterData = { type:"toggle", value:false, label:"Message based repeat", icon:"whispers_purple.svg" };
	public param_repeatMessageValue:TwitchatDataTypes.ParameterData = { type:"number", value:0, label:"Must receive at least {VALUE} message", icon:"whispers_purple.svg", min:1, max:9999 };
	public params_daily:TwitchatDataTypes.ParameterData[] = [];
	public params_yearly:TwitchatDataTypes.ParameterData[] = [];

	private originalName!:string;

	public beforeMount():void {
		//List all available trigger types
		let events:TwitchatDataTypes.TriggerEventTypes[] = [
			{label:"Select an action...", icon:"date", value:"0", category:TwitchatDataTypes.TriggerEventTypeCategories.TWITCHAT},
		];
		events = events.concat(ScheduleTriggerEvents);
		if(!this.triggerData.scheduleParams) {
			this.triggerData.scheduleParams = {
				type:events[1].value as TwitchatDataTypes.TriggerScheduleTypesValue,
				repeatDuration:30,
				repeatMinMessages:100,
				dates:[],
			}
		}
		this.param_action.value = this.triggerData.scheduleParams?.type? this.triggerData.scheduleParams?.type : events[0].value;
		this.param_action.listValues = events;
		const duration = this.triggerData.scheduleParams!.repeatDuration;
		const minMess = this.triggerData.scheduleParams!.repeatMinMessages;
		this.param_repeatDurationCondition.value = duration != undefined && duration > 0;
		this.param_repeatMessageCondition.value = minMess != undefined && minMess > 0;

		watch(()=>this.param_repeatDurationCondition.value, ()=> {
			if(this.param_repeatDurationCondition.value === false) {
				this.triggerData.scheduleParams!.repeatDuration = 0;
			}
		})
		watch(()=>this.param_repeatMessageCondition.value, ()=> {
			if(this.param_repeatMessageCondition.value === false) {
				this.triggerData.scheduleParams!.repeatMinMessages = 0;
			}
		})
		watch(()=> this.triggerData, ()=> { this.populate(); }, { deep:true });

		for (let i = 0; i < this.triggerData.scheduleParams!.dates.length; i++) {
			this.params_daily.push({ type:"toggle", value:false, label:"Daily"} );
			this.params_yearly.push({ type:"toggle", value:false, label:"Yearly"} );
		}
		
		this.populate();
	}

	public populate():void {
		this.param_name.value = 
		this.originalName = this.triggerData.name as string;
	}

	public dateClasses(d:{value:string, daily:boolean}):string[] {
		const res:string[] = ["row"];
		if(new Date(d.value).getTime() < Date.now() && !d.daily) res.push("past");
		return res;
	}

	public addDate():void {
		const d = new Date();
		const value = Utils.toDigits(d.getFullYear(),4)
					+"-"+Utils.toDigits(d.getMonth()+1,2)
					+"-"+Utils.toDigits(d.getDate(),2)
					+"T"+Utils.toDigits(d.getHours(),2)
					+":"+Utils.toDigits(d.getMinutes()+5,2)
		this.triggerData.scheduleParams?.dates?.push({value, daily:false, yearly:false});
		this.params_daily.push({ type:"toggle", value:false, label:"Daily"} );
		this.params_yearly.push({ type:"toggle", value:false, label:"Yearly"} );
	}

	public delDate(index:number):void {
		this.triggerData.scheduleParams?.dates?.splice(index, 1);
	}

	public onUpdateName():void {
		this.nameConflict = false;
		//If command name has been changed
		if(this.originalName != this.param_name.value) {
			//Make sure no other schedule trigger has the same name
			const triggers = storeTriggers().triggers;
			for (const k in triggers) {
				//Is a schedule trigger?
				if(k.indexOf(TriggerTypes.SCHEDULE+"_") === 0) {
					const t = triggers[k] as TwitchatDataTypes.TriggerData;
					if(t.name?.toLowerCase() == (this.param_name.value as string).toLowerCase()) {
						this.nameConflict = true;
						return;
					}
				}
			}
			this.triggerData.prevKey = TriggerTypes.SCHEDULE+"_"+this.triggerData.name;
		}
		//This triggers a save event that will clean the previous key
		//based on the "prevKey" property value
		this.triggerData.name = this.param_name.value as string;
	}
}
</script>

<style scoped lang="less">
.triggeractionscheduleparams{

	.nameConflict {
		background-color: @mainColor_alert;
		color: @mainColor_light;
		text-align: center;
		margin:auto;
		display: block;
		padding: .25em;
		border-bottom-left-radius: .5em;
		border-bottom-right-radius: .5em;
	}

	.row{
		margin:auto;
		&:not(:first-child) {
			margin-top: .5em;
		}

		:deep(input),
		:deep(select) {
			width: 225px;
			&[type="number"] {
				width: 80px;
			}
		}

		&.dates {
			display: flex;
			flex-direction: column;
			align-items: center;
			.list {
				display: flex;
				flex-direction: column;
				.row {
					display: flex;
					flex-direction: column;

					&.past {
						input {
							opacity: .5;
							position: relative;
							&::before {
								content:"";
								position: absolute;
								height: 2px;
								background-color: @mainColor_normal;
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
						display: flex;
						flex-direction: row;
						justify-content: space-around;
					}
				}
			}
		}
	}
}
</style>