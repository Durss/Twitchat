<template>
	<div class="triggeractionhighlightentry">
		<i18n-t scope="global" tag="div" class="row info item" keypath="triggers.actions.highlight.header">
			<template #LINK>
				<a @click="openHighlightParams()">{{ $t("triggers.actions.highlight.header_link") }}</a>
			</template>
		</i18n-t>
		<ParamItem class="row item show" :paramData="show_conf" v-model="action.show" />
		<ParamItem class="row item" v-if="show_conf.value === true" :paramData="message_conf" ref="textContent" v-model="action.text" />
	</div>
</template>

<script lang="ts">
import { TriggerEventPlaceholders, type TriggerActionHighlightData, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';


@Component({
	components:{
		ParamItem,
	},
	emits:["update", "setContent"]
})
export default class TriggerActionHighlightEntry extends Vue {
	
	@Prop
	public action!:TriggerActionHighlightData;
	@Prop
	public triggerData!:TriggerData;

	private showHideValues:TwitchatDataTypes.ParameterDataListValue[] = [];
	
	public show_conf:TwitchatDataTypes.ParameterData = { type:"list", value:false, listValues:[], icon:"show_purple.svg" };
	public message_conf:TwitchatDataTypes.ParameterData = { type:"string", longText:true, value:"", icon:"highlight_purple.svg", maxLength:500};
	
	public beforeMount():void {
		this.showHideValues = [
			{labelKey:"global.hide", value:false},
			{labelKey:"global.show", value:true},
		];
		this.message_conf.placeholderList = TriggerEventPlaceholders(this.triggerData.type);
		this.show_conf.labelKey		= "triggers.actions.highlight.param_visibility";
		this.message_conf.labelKey	= "triggers.actions.highlight.param_message";
		this.show_conf.value		= this.showHideValues[1].value;
		this.show_conf.listValues	= this.showHideValues;
		if(this.action.show == undefined) this.action.show = true;
	}

	public openHighlightParams(){
		this.$emit("setContent", TwitchatDataTypes.ParamsCategories.OVERLAYS);
	}

}
</script>

<style scoped lang="less">
.triggeractionhighlightentry{
	.triggerActionForm();
}
</style>