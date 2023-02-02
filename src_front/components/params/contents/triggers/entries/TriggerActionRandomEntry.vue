<template>
	<div class="triggeractionrandomentry">
		<div class="row item info">{{ $t("triggers.actions.common.dynamic_placeholder_info") }}</div>

		<div class="row item name">
			<ParamItem :paramData="param_min" v-model="action.min" />
		</div>

		<div class="row item name">
			<ParamItem :paramData="param_max" v-model="action.max" />
		</div>

		<div class="row item name">
			<ParamItem :paramData="param_float" v-model="action.float" />
		</div>

		<div class="row item name">
			<ParamItem :paramData="param_placeholder" v-model="action.placeholder" />
		</div>

		<i18n-t scope="global" class="example item" tag="div" keypath="triggers.actions.random.example" v-if="(param_placeholder.value as string).length > 0">
			<template #PLACEHOLDER>
				<mark v-click2Select>{{"{"}}{{(param_placeholder.value as string).toUpperCase()}}{{"}"}}</mark>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import type { TriggerActionRandomData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		action:Object,
	},
	components:{
		ParamItem,
	},
})
export default class TriggerActionRandomEntry extends Vue {

	public action!:TriggerActionRandomData;

	public param_min:TwitchatDataTypes.ParameterData = {type:"number",  labelKey:"triggers.actions.random.min_label", value:0, min:-Number.MAX_SAFE_INTEGER, max:Number.MAX_SAFE_INTEGER, icon:"min_purple.svg"}
	public param_max:TwitchatDataTypes.ParameterData = {type:"number",  labelKey:"triggers.actions.random.max_label", value:10, min:-Number.MAX_SAFE_INTEGER, max:Number.MAX_SAFE_INTEGER, icon:"max_purple.svg"}
	public param_float:TwitchatDataTypes.ParameterData = {type:"toggle",  labelKey:"triggers.actions.random.float_label", value:false, icon:"dice_purple.svg"}
	public param_placeholder:TwitchatDataTypes.ParameterData = {type:"text",  labelKey:"triggers.actions.countget.value_label", value:"", maxLength:20, icon:"placeholder_purple.svg"}

	public mounted():void {
		if(this.action.max == undefined) this.action.max = this.param_max.value as number;
		if(this.action.min == undefined) this.action.min = this.param_min.value as number;
	}

}
</script>

<style scoped lang="less">
.triggeractionrandomentry{
	.triggerActionForm();
	
	.name:deep(input), .itemSelector {
		// flex-grow: 1;
		flex-basis: 200px;
	}

	.example {
		font-size: .9em;
		// text-align: center;
		margin: 1em 0 .5em 0;
	}
}
</style>