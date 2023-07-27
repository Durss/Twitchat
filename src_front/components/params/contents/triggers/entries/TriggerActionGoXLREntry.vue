<template>
	<div class="triggeractiongoxlrentry triggerActionForm">
		<ParamItem :paramData="param_action" v-model="action.action" />
		<ParamItem :paramData="param_fxPreset" v-model="action.fxPresetIndex" v-if="param_action.value == 'fx_on'" />

		<div class="card-item" v-if="param_action.value == 'sample_play'">
			<p class="head">{{ $t("triggers.actions.goxlr.select_sampler") }}</p>
			<GoXLRUI v-model="sampleTarget" @change="samplerTargetChange()" samplerMode childMode />
		</div>
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
import GoXLRUI from '@/components/goxlr/GoXLRUI.vue';
import type { GoXLRTypes } from '@/types/GoXLRTypes';

@Component({
	components:{
		GoXLRUI,
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
export default class TriggerActionGoXLREntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionGoXLRData;

	public sampleTarget:Extract<GoXLRTypes.ButtonTypesData, "SamplerSelectA"|"SamplerSelectB"|"SamplerSelectC"|"SamplerBottomLeft"|"SamplerBottomRight"|"SamplerTopLeft"|"SamplerTopRight">[] = [];
	public param_action:TwitchatDataTypes.ParameterData<TriggerActionGoXLRDataAction> = {type:"list", value:"fx_on", labelKey:"triggers.actions.goxlr.param_action"}
	public param_fxPreset:TwitchatDataTypes.ParameterData<number> = {type:"list", value:0, labelKey:"triggers.actions.goxlr.param_fxPreset"}

	public mounted():void {
		this.param_action.listValues = TriggerActionGoXLRDataActionList
						//Remove "large" GoXLR features if connected one is a mini model
						.filter(v=>v.mini === true || !GoXLRSocket.instance.isGoXLRMini )
						.map(v=>{ return {value:v.code, labelKey:"triggers.actions.goxlr.action_"+v.code}});

		this.param_fxPreset.listValues = [0,1,2,3,4,5].map(v=>{ return {value:v, labelKey:"triggers.actions.goxlr.param_fxPreset"+(v+1)}});
		this.param_fxPreset.listValues.unshift({value:-1, labelKey:"triggers.actions.goxlr.param_fxPreset_keep"})

		this.param_action.value = this.action.action || this.param_action.listValues[0].value;
		
		if(this.action.sampleIndex) {
			const bt1 = "SamplerSelect" + this.action.sampleIndex[0] as "SamplerSelectA" | "SamplerSelectB" | "SamplerSelectC";
			const bt2 = "Sampler" + this.action.sampleIndex[1] as "SamplerBottomLeft" | "SamplerBottomRight" | "SamplerTopLeft" | "SamplerTopRight";
			this.sampleTarget = [bt1, bt2];
		}

	}

	public samplerTargetChange():void {
		if(this.sampleTarget.length > 2) {
			this.sampleTarget.splice(1, 1);
		}

		if(this.sampleTarget.length == 2) {
			const bt1 = this.sampleTarget[0].replace("SamplerSelect", "") as "A" | "B" | "C";
			const bt2 = this.sampleTarget[1].replace("Sampler", "") as "BottomLeft" | "BottomRight" | "TopLeft" | "TopRight";
			this.action.sampleIndex = [bt1, bt2];
		}
	}

}
</script>

<style scoped lang="less">
.triggeractiongoxlrentry{
	.head {
		margin-bottom: .5em;
		text-align: center;
	}
}
</style>