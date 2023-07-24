<template>
	<div class="triggeractiongoxlrentry triggerActionForm">
		<ParamItem :paramData="param_action" v-model="action.action" />
		<ParamItem :paramData="param_fxPreset" v-model="action.fxPresetIndex" />
		{{ action.fxPresetIndex }}
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import { type TriggerActionGoXLRData, type TriggerActionGoXLRDataAction, type TriggerData, TriggerActionGoXLRDataActionList } from '@/types/TriggerActionDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry.vue';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
export default class TriggerActionGoXLREntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionGoXLRData;

	@Prop
	declare triggerData:TriggerData;

	public param_action:TwitchatDataTypes.ParameterData<TriggerActionGoXLRDataAction> = {type:"list", value:"fx_on", labelKey:"goxlr.trigger.param_action"}
	public param_fxPreset:TwitchatDataTypes.ParameterData<number> = {type:"list", value:0, labelKey:"goxlr.trigger.param_fxPreset"}

	public mounted():void {
		this.param_action.listValues = TriggerActionGoXLRDataActionList.map(v=>{ return {value:v, labelKey:"goxlr.trigger.action_"+v}});
		this.param_fxPreset.listValues = [0,1,2,3,4,5].map(v=>{ return {value:v, labelKey:"goxlr.trigger.param_fxPreset"+(v+1)}});
	}

}
</script>

<style scoped lang="less">
.triggeractiongoxlrentry{
	
}
</style>