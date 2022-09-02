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
			<ParamItem class="row" :paramData="param_repeatDuration" v-model="triggerData.scheduleParams!.repeatDuration" />
			<ParamItem class="row" :paramData="param_repeatCondition" />
		</div>
		
		<div class="row" v-else-if="param_action.value == '2'">
		</div>
{{triggerData}}
	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TriggerEventTypeCategories, type ParameterData, type TriggerData, type TriggerEventTypes } from '@/types/TwitchatDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import { ScheduleTriggerEvents, TriggerTypes } from '@/utils/TriggerActionData';
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

	public triggerData!:TriggerData;

	public nameConflict = false;
	public param_name:ParameterData = { type:"text", value:"", label:"Schedule name", icon:"date_purple.svg", placeholder:"..." };
	public param_action:ParameterData = { type:"list", value:"", label:"Schedule type", icon:"date_purple.svg" };
	public param_repeatDuration:ParameterData = { type:"number", value:0, label:"Execute every (minutes)", icon:"timeout_purple.svg", min:1, max:48*60 };
	public param_repeatCondition:ParameterData = { type:"toggle", value:false, label:"Needs a minimum of messages to be received", icon:"timeout_purple.svg" };
	public param_repeatConditionValue:ParameterData = { type:"number", value:0, label:"Messages count", icon:"timeout_purple.svg", min:0, max:9999 };

	private originalName!:string;

	public beforeMount():void {
		//List all available trigger types
		let events:TriggerEventTypes[] = [
			{label:"Select an action...", icon:"date", value:"0", category:TriggerEventTypeCategories.TWITCHAT},
		];
		events = events.concat(ScheduleTriggerEvents);
		if(!this.triggerData.scheduleParams) {
			this.triggerData.scheduleParams = {
				type:events[1].value,
				repeatDuration:30,
			}
		}
		this.param_action.value = this.triggerData.scheduleParams?.type? this.triggerData.scheduleParams?.type : events[0].value;
		this.param_action.listValues = events;
		const minMess = this.triggerData.scheduleParams.repeatMinMessages;
		this.param_repeatCondition.value = minMess != undefined && minMess > 0;
		this.param_repeatCondition.children = [this.param_repeatConditionValue];

		watch(()=>this.param_repeatConditionValue.value, ()=> {
			this.triggerData.scheduleParams!.repeatMinMessages = this.param_repeatConditionValue.value as number;
		})
		
		this.populate();
		watch(()=> this.triggerData, ()=> { this.populate(); }, { deep:true });
	}

	public populate():void {
		this.param_name.value = 
		this.originalName = this.triggerData.name as string;
	}

	public onUpdateName():void {
		this.nameConflict = false;
		//If command name has been changed
		if(this.originalName != this.param_name.value) {
			//Make sure no other schedule trigger has the same name
			const triggers = StoreProxy.store.state.triggers;
			for (const k in triggers) {
				//Is a schedule trigger?
				if(k.indexOf(TriggerTypes.SCHEDULE+"_") === 0) {
					const t = triggers[k] as TriggerData;
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
	}
}
</style>