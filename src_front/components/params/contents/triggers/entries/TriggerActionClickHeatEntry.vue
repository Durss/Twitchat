<template>
	<div class="triggeractionclickheatentry">
		<ParamItem :paramData="param_overlay" v-model="action.heatClickData.overlayId" />
		<template v-if="isHeatTrigger">
			<ParamItem :paramData="param_forward" v-model="action.heatClickData.forward" />
		</template>
		<template v-if="!isHeatTrigger || !param_forward.value">
			<ParamItem :paramData="param_x" v-model="action.heatClickData.x" />
			<ParamItem :paramData="param_y" v-model="action.heatClickData.y" />
			<ParamItem :paramData="param_ctrl" v-model="action.heatClickData.ctrl" />
			<ParamItem :paramData="param_shift" v-model="action.heatClickData.shift" />
			<ParamItem :paramData="param_alt" v-model="action.heatClickData.alt" />
		</template>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import { TriggerTypes, type ITriggerPlaceholder, type TriggerActionHeatClickData, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		ParamItem
	},
	emits:[],
})
export default class TriggerActionClickHeatEntry extends AbstractTriggerActionEntry {
	
	@Prop
	declare action:TriggerActionHeatClickData;
	@Prop
	declare triggerData:TriggerData;

	public param_overlay:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", labelKey:"triggers.actions.heat_click.param_overlay"};
	public param_forward:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:true, labelKey:"triggers.actions.heat_click.param_forward"};
	public param_x:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:500, labelKey:"triggers.actions.heat_click.param_x"};
	public param_y:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:500, labelKey:"triggers.actions.heat_click.param_y"};
	public param_ctrl:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"triggers.actions.heat_click.param_ctrl"};
	public param_shift:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"triggers.actions.heat_click.param_shift"};
	public param_alt:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"triggers.actions.heat_click.param_alt"};

	public get isHeatTrigger():boolean { return this.triggerData.type == TriggerTypes.HEAT_CLICK; }

	public beforeMount():void {
		if(!this.action.heatClickData) {
			this.action.heatClickData = {
				overlayId:"",
				forward:this.isHeatTrigger,
				x:"",
				y:"",
				alt:false,
				shift:false,
				ctrl:false,
			}
		}
		this.param_overlay.listValues = this.$store.heat.distortionList.map( v=> {
			let label = "";
			if(v.name) {
				label = v.name;
			}else{
				const chunks:string[] = [];
				if(v.obsItemPath.sceneName) chunks.push(v.obsItemPath.sceneName);
				if(v.obsItemPath.groupName) chunks.push(v.obsItemPath.groupName);
				if(v.obsItemPath.source.name) chunks.push(v.obsItemPath.source.name);
				label = chunks.join(" => ");
			}
			return {value:v.id, label}
		})
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.param_x.placeholderList = list.filter(v=>v.numberParsable == true);
		this.param_y.placeholderList = list.filter(v=>v.numberParsable == true);
	}


}
</script>

<style scoped lang="less">
.triggeractionclickheatentry{
	&, .list{
		gap: .25em;
		display: flex;
		flex-direction: column;	
	}
	
}
</style>