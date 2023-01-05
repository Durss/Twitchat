<template>
	<div class="triggeractionhighlightentry">
		<i18n-t scope="global" tag="div" class="row info item" keypath="triggers.actions.highlight.header">
			<template #LINK>
				<a @click="openHighlightParams()" v-t="'triggers.actions.highlight.header_link'"></a>
			</template>
		</i18n-t>
		<ParamItem class="row item show" :paramData="show_conf" v-model="action.show" />
		<ParamItem class="row item" v-if="show_conf.value === true" :paramData="message_conf" ref="textContent" v-model="action.text" />
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TriggerActionHelpers, type TriggerActionHighlightData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../../ParamItem.vue';


@Options({
	props:{
		action:Object,
		event:Object,
	},
	components:{
		ParamItem,
	},
	emits:["update", "setContent"]
})
export default class TriggerActionHighlightEntry extends Vue {

	public action!:TriggerActionHighlightData;
	public event!:TriggerEventTypes;

	private showHideValues:TwitchatDataTypes.ParameterDataListValue[] = [
		{label:"Hide", value:false},
		{label:"Show", value:true},
	];
	
	public show_conf:TwitchatDataTypes.ParameterData = { label:"", type:"list", value:this.showHideValues[1].value, listValues:this.showHideValues, icon:"show_purple.svg" };
	public message_conf:TwitchatDataTypes.ParameterData = { label:"", type:"text", longText:true, value:"", icon:"highlight_purple.svg", maxLength:500};
	
	public beforeMount():void {
		if(this.action.show == undefined) this.action.show = true;
		this.message_conf.placeholderList = TriggerActionHelpers(this.event.value);
		this.show_conf.label		= this.$t("triggers.actions.highlight.param_visibility");
		this.message_conf.label		= this.$t("triggers.actions.highlight.param_message");
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