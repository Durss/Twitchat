<template>
	<div class="triggeractioncustomtrainentry triggerActionForm">
		<ParamItem :paramData="param_trainId" v-model="action.customTrainData.trainId" />
		<ParamItem :paramData="param_action" v-model="action.customTrainData.action" />
		<ParamItem :paramData="param_value" v-model="action.customTrainData.value" />
	</div>
</template>

<script lang="ts">
import { TriggerActionCustomTrainData_ActionList, type TriggerActionCustomTrainData, type TriggerData } from '@/types/TriggerActionDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ParamItem from '@/components/params/ParamItem.vue';

@Component({
	components:{
		ParamItem
	},
	emits:[],
})
class TriggerActionCustomTrainEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionCustomTrainData;

	@Prop
	declare triggerData:TriggerData;

	public param_trainId:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", icon:"train", labelKey:"triggers.actions.custom_train.param_trainId" };
	public param_action:TwitchatDataTypes.ParameterData<string> = { type:"list", value:"", icon:"", labelKey:"triggers.actions.custom_train.param_action" };
	public param_value:TwitchatDataTypes.ParameterData<string> = { type:"string", value:"", icon:"add", maxLength:1000, labelKey:"triggers.actions.custom_train.param_value" };

	public beforeMount():void {
		if(!this.action.customTrainData) {
			this.action.customTrainData = {
				trainId:"",
				action:"add",
				value:"",
			}
		}

		this.param_trainId.listValues = this.$store.customTrain.customTrainList.map((train, index)=>{
			return {
				value:train.id,
				label:train.title || (this.$t("overlay.customTrain.default_title")+' '+(index+1)),
			}
		});

		this.param_action.listValues = TriggerActionCustomTrainData_ActionList.map(action=>{
			return {
				value:action,
				label:this.$t("triggers.actions.custom_train.actions."+action),
			}
		});
		this.param_value.placeholderList = this.placeholderList.filter(v=> v.numberParsable);
	}

}
export default toNative(TriggerActionCustomTrainEntry);
</script>

<style scoped lang="less">
.triggeractioncustomtrainentry{

}
</style>
