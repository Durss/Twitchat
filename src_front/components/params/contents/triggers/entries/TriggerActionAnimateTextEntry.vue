<template>
	<div class="triggeractionanimatetext triggerActionForm">
		<ParamItem :paramData="param_overlayId" v-model="action.animatedTextData.overlayId" :error="!overlayExists" />
		<ParamItem :paramData="param_action" v-model="action.animatedTextData.action" />
		<template v-if="action.animatedTextData.action == 'show'">
			<ParamItem :paramData="param_text" v-model="action.animatedTextData.text" />
			<ParamItem :paramData="param_autoHide" v-model="action.animatedTextData.autoHide" />
		</template>
		<ParamItem :paramData="param_waitForComplete" v-model="action.animatedTextData.pauseUntilComplete" />
	</div>
</template>

<script lang="ts">
import { TriggerActionAnimatedTextData_ActionList, type TriggerActionAnimatedTextData, type TriggerData } from '@/types/TriggerActionDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ParamItem from '@/components/params/ParamItem.vue';
import TTButton from '@/components/TTButton.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
	},
	emits:[],
})
class TriggerActionAnimateTextEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionAnimatedTextData;

	@Prop
	declare triggerData:TriggerData;

	public param_overlayId:TwitchatDataTypes.ParameterData<string[], string> = {type:"list", labelKey:"triggers.actions.animated_text.param_overlayId", value:[], listValues:[]}
	public param_action:TwitchatDataTypes.ParameterData<TriggerActionAnimatedTextData["animatedTextData"]["action"], string> = {type:"list", labelKey:"triggers.actions.animated_text.param_action", value:"show", listValues:[]}
	public param_text:TwitchatDataTypes.ParameterData<string> = {type:"string",  labelKey:"triggers.actions.animated_text.param_text", value:"", longText:true, maxLength:100, icon:"font"}
	public param_autoHide:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean",  labelKey:"triggers.actions.animated_text.param_autoHide", value:true, icon:"hide"}
	public param_waitForComplete:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean",  labelKey:"triggers.actions.animated_text.param_waitForComplete", value:true, icon:"timer"}

	public get overlayExists():boolean {
		return this.$store.animatedText.animatedTextList.some(entry=> entry.id == this.action.animatedTextData.overlayId);
	}

	public beforeMount():void {
		if(!this.action.animatedTextData) {
			this.action.animatedTextData = {
				overlayId: this.$store.animatedText.animatedTextList[0]?.id || "",
				action: "show",
				text: "",
				autoHide: true,
			}
		}

		this.param_overlayId.listValues = this.$store.animatedText.animatedTextList.map(entry=> {
			return {
				value: entry.id,
				label: entry.title || this.$t("overlay.animatedText.default_title"),
			};
		});
		this.param_overlayId.listValues.unshift({value:"", label:this.$t("global.select_placeholder")});

		this.param_action.listValues = TriggerActionAnimatedTextData_ActionList.map(action=> {
			return {
				value: action,
				label: this.$t(`triggers.actions.animated_text.actions.${action}`),
			};
		})

		this.param_text.placeholderList = this.placeholderList;
	}

}
export default toNative(TriggerActionAnimateTextEntry);
</script>

<style scoped lang="less">
.triggeractionanimatetext{

}
</style>
