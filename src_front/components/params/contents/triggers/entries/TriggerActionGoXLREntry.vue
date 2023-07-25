<template>
	<div class="triggeractiongoxlrentry triggerActionForm">
		<ParamItem :paramData="param_action" v-model="action.action" />
		<ParamItem :paramData="param_fxPreset" v-model="action.fxPresetIndex" v-if="param_action.value == 'fx_on'" />
	</div>
</template>

<script lang="ts">
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TriggerActionGoXLRDataActionList, type TriggerActionGoXLRData, type TriggerActionGoXLRDataAction } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import GoXLRSocket from '@/utils/goxlr/GoXLRSocket';
import { Component, Prop } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry.vue';

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

	public param_action:TwitchatDataTypes.ParameterData<TriggerActionGoXLRDataAction> = {type:"list", value:"fx_on", labelKey:"goxlr.trigger.param_action"}
	public param_fxPreset:TwitchatDataTypes.ParameterData<number> = {type:"list", value:0, labelKey:"goxlr.trigger.param_fxPreset"}

	public mounted():void {
		this.param_action.listValues = TriggerActionGoXLRDataActionList
						//Remove "large" GoXLR features if connected one is a mini model
						.filter(v=>v.mini === true || !GoXLRSocket.instance.isGoXLRMini )
						.map(v=>{ return {value:v.code, labelKey:"goxlr.trigger.action_"+v.code}});

		this.param_fxPreset.listValues = [0,1,2,3,4,5].map(v=>{ return {value:v, labelKey:"goxlr.trigger.param_fxPreset"+(v+1)}});

		this.param_action.value = this.action.action || this.param_action.listValues[0].value;
	}

}
</script>

<style scoped lang="less">
.triggeractiongoxlrentry{
	
}
</style>