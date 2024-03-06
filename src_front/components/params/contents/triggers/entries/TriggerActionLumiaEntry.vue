<template>
	<div class="triggeractionlumiaentry triggerActionForm">
		<ParamItem :paramData="param_color" v-model="action.lumia.color"></ParamItem>
		<ParamItem :paramData="param_duration" v-model="action.lumia.colorDuration_s"></ParamItem>
		<ParamItem :paramData="param_transition" v-model="action.lumia.colorTransition_s"></ParamItem>
		<ParamItem :paramData="param_brightness" v-model="action.lumia.colorBrightness"></ParamItem>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import type { TriggerActionLumiaData, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		ParamItem,
	},
	emits:[],
})
class TriggerActionLumiaEntry extends AbstractTriggerActionEntry {

	public param_color:TwitchatDataTypes.ParameterData<number> = {type:"color", value:0, labelKey:"triggers.actions.lumia.param_color", icon:"color"};
	public param_brightness:TwitchatDataTypes.ParameterData<number> = {type:"slider", value:100, min:0, max:100, allowMs:true, labelKey:"triggers.actions.lumia.param_brightness", icon:"brightness"};
	public param_duration:TwitchatDataTypes.ParameterData<number> = {type:"duration", value:0, allowMs:true, labelKey:"triggers.actions.lumia.param_duration", icon:"timer"};
	public param_transition:TwitchatDataTypes.ParameterData<number> = {type:"duration", value:0, allowMs:true, labelKey:"triggers.actions.lumia.param_transition", icon:"timer"};

	@Prop
	declare action:TriggerActionLumiaData;

	@Prop
	declare triggerData:TriggerData;

	public beforeMount():void {
		if(!this.action.lumia) {
			this.action.lumia = {
				action:"color",
				colorBrightness:100,
				colorDuration_s:10,
				colorTransition_s:.5,
			};
		}
	}

}
export default toNative(TriggerActionLumiaEntry);
</script>

<style scoped lang="less">
.triggeractionlumiaentry{
	
}
</style>