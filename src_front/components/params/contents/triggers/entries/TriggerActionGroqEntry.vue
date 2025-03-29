<template>
	<div class="triggeractiongroqentry triggerActionForm">

		<ParamItem :paramData="param_model" v-model="action.groqData!.model" />
		<ParamItem :paramData="param_preprompt" v-model="action.groqData!.preprompt" />
		<ParamItem :paramData="param_prompt" v-model="action.groqData!.prompt" />
		<ParamItem :paramData="param_jsonMode" v-model="action.groqData!.jsonMode">
			<ParamItem :paramData="param_json" v-model="action.groqData!.json" noBackground @blur="onBlurJSON"
			:childLevel="1"
			:error="jsonError != ''"
			:errorMessage="$t('', {ERROR:jsonError})" />
			<i18n-t scope="global" class="infos" tag="div" keypath="triggers.actions.groq.jsonMode_hint">
				<template #LINK>
					<a href="https://console.groq.com/docs/text-chat#json-mode-object-object" target="_blank">{{ $t("triggers.actions.groq.jsonMode_hint_link") }}</a>
				</template>
			</i18n-t>
		</ParamItem>

		<TriggerActionHttpPlaceholder :placeholderList="action.groqData?.outputPlaceholderList" />
	</div>
</template>

<script lang="ts">
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import type { ITriggerPlaceholder, TriggerActionGroqData, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TriggerActionHttpPlaceholder from './common/TriggerActionHttpPlaceholder.vue';
import ParamItem from '@/components/params/ParamItem.vue';

@Component({
	components:{
		ParamItem,
		TriggerActionHttpPlaceholder,
	},
	emits:[],
})
class TriggerActionGroqEntry extends AbstractTriggerActionEntry {

	public param_preprompt:TwitchatDataTypes.ParameterData<string> = {type:'string', value:'', longText:true, labelKey:"triggers.actions.groq.preprompt"};
	public param_prompt:TwitchatDataTypes.ParameterData<string> = {type:'string', value:'', longText:true, labelKey:"triggers.actions.groq.prompt"};
	public param_jsonMode:TwitchatDataTypes.ParameterData<boolean> = {type:'boolean', value:false, labelKey:"triggers.actions.groq.jsonMode"};
	public param_json:TwitchatDataTypes.ParameterData<string> = {type:'string', value:'', longText:true, placeholderKey:"triggers.actions.groq.json"};
	public param_model:TwitchatDataTypes.ParameterData<string, string> = {type:'list', value:'', longText:true, placeholderKey:"triggers.actions.groq.model"};
	public jsonError:string = "";

	@Prop
	declare action:TriggerActionGroqData;

	@Prop
	declare triggerData:TriggerData;

	public beforeMount():void {
		if(!this.action.groqData) this.action.groqData = {
			preprompt:"",
			prompt:"",
			model:"",
			jsonMode:false,
			outputPlaceholderList:[],
		};

		this.param_model.listValues = this.$store.groq.availableModels.map(m => ({
			value: m.id == this.$store.groq.defaultModel? "" : m.id,
			label: m.id.replace(/-/g, ' ') + (m.id == this.$store.groq.defaultModel? ' (default)' : ''),
		}));
	}

	public onPlaceholderUpdate(list:ITriggerPlaceholder<unknown>[]):void {
		this.param_preprompt.placeholderList = list;
		this.param_prompt.placeholderList = list;
	}

	public onBlurJSON():void {
		this.jsonError = "";
		try {
			const json = JSON.parse(this.param_json.value);
			this.param_json.value = JSON.stringify(json, null, 2);
		}catch(error) {
			this.jsonError = (error as Error).message;
		}
	}

}
export default toNative(TriggerActionGroqEntry);
</script>

<style scoped lang="less">
.triggeractiongroqentry{
	.infos {
		font-style: italic;
		margin-left: 1.5rem;
		margin-top: .25em;
	}
}
</style>
