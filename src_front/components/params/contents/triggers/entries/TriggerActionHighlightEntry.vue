<template>
	<div class="triggeractionhighlightentry triggerActionForm">
		<i18n-t scope="global" tag="div" class="info" keypath="triggers.actions.highlight.header">
			<template #LINK>
				<a @click="openHighlightParams()">{{ $t("triggers.actions.highlight.header_link") }}</a>
			</template>
		</i18n-t>
		<ParamItem class="show" :paramData="show_conf" v-model="action.show" />
		<ParamItem v-if="show_conf.value === true" :paramData="message_conf" v-model="action.text" />
	</div>
</template>

<script lang="ts">
import type { ITriggerPlaceholder, TriggerActionHighlightData, TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';


@Component({
	components:{
		ParamItem,
	},
	emits:["update"]
})
class TriggerActionHighlightEntry extends AbstractTriggerActionEntry {
	
	@Prop
	declare action:TriggerActionHighlightData;

	@Prop
	declare triggerData:TriggerData;

	private showHideValues:TwitchatDataTypes.ParameterDataListValue<boolean>[] = [];
	
	public show_conf:TwitchatDataTypes.ParameterData<boolean, boolean> = { type:"list", value:false, listValues:[], icon:"show" };
	public message_conf:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"highlight", maxLength:500};
	
	public beforeMount():void {
		this.showHideValues = [
			{labelKey:"global.hide", value:false},
			{labelKey:"global.show", value:true},
		];
		this.show_conf.labelKey		= "triggers.actions.highlight.param_visibility";
		this.message_conf.labelKey	= "triggers.actions.highlight.param_message";
		this.show_conf.value		= this.showHideValues[1]!.value;
		this.show_conf.listValues	= this.showHideValues;
		if(this.action.show == undefined) this.action.show = true;
		if(this.action.text == undefined) this.action.text = "";
	}

	public openHighlightParams(){
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS);
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.message_conf.placeholderList = list;
	}

}
export default toNative(TriggerActionHighlightEntry);
</script>

<style scoped lang="less">
.triggeractionhighlightentry{
}
</style>