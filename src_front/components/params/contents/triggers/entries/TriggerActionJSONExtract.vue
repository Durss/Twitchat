<template>
	<div class="triggeractionjsonextract triggerActionForm">
		<ParamItem :paramData="param_sourcePlaceholder" v-model="action.jsonExtractData.sourcePlaceholder" />

		<TriggerActionHttpPlaceholder :placeholderList="action.jsonExtractData.outputPlaceholderList" />
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import type { ITriggerPlaceholder, TriggerActionJSONExtractData, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import TriggerActionHttpPlaceholder from './common/TriggerActionHttpPlaceholder.vue';

@Component({
	components:{
		ParamItem,
		TriggerActionHttpPlaceholder,
	},
	emits:["update"]
})
class TriggerActionJSONExtract extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionJSONExtractData;

	@Prop
	declare triggerData:TriggerData;

	public param_sourcePlaceholder:TwitchatDataTypes.ParameterData<string> = {type:"list", value:"", listValues:[], labelKey:"triggers.actions.json_extract.source_placeholder"};

	public beforeMount():void {
		if(!this.action.jsonExtractData) {
			this.action.jsonExtractData = {
				sourcePlaceholder:"",
				outputPlaceholderList:[],
			};
		}
		if(!this.action.jsonExtractData.outputPlaceholderList) this.action.jsonExtractData.outputPlaceholderList = [];
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		// Update the dropdown list with available placeholders
		this.param_sourcePlaceholder.listValues = list.map(p => ({
			value: p.tag,
			labelKey: p.descKey,
			label: `{${p.tag}} - ${this.$t(p.descKey, p.descReplacedValues || {})}`
		}));
	}

}
export default toNative(TriggerActionJSONExtract);
</script>

<style scoped lang="less">
.triggeractionjsonextract{
	gap: .5em;
	display: flex;
	flex-direction: column;
}
</style>
