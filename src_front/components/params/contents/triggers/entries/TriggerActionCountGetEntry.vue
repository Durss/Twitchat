<template>
	<div class="triggeractioncountgetentry">
		<div class="row item info">{{ $t("triggers.actions.common.dynamic_placeholder_info") }}</div>

		<div class="row item list">
			<label class="listLabel">
				<img src="@/assets/icons/count_purple.svg" class="icon">
				<span>{{ $t(param_counters.labelKey as string) }}</span>
			</label>
			<vue-select class="itemSelector"
				label="label"
				:placeholder="$t('triggers.actions.count.select_placeholder')"
				v-model="action.counter"
				:options="param_counters.listValues"
				:calculate-position="$placeDropdown"
				:reduce="(v:TwitchatDataTypes.ParameterDataListValue) => v.value" 
				:selectable="(v:TwitchatDataTypes.ParameterDataListValue) => (param_counters.value as string[]).indexOf(v.value as string) == -1"
				appendToBody
			></vue-select>
		</div>

		<div class="row item name">
			<ParamItem :paramData="param_value" v-model="action.placeholder" />
		</div>

		<i18n-t scope="global" class="example item" tag="div" keypath="triggers.actions.countget.example" v-if="(param_value.value as string).length > 0">
			<template #PLACEHOLDER>
				<mark v-click2Select>{{"{"}}{{(param_value.value as string).toUpperCase()}}{{"}"}}</mark>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import type { TriggerActionCountGetData } from '@/types/TriggerActionDataTypes';
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
export default class TriggerActionCountGetEntry extends Vue {

	public action!:TriggerActionCountGetData;

	public param_counters:TwitchatDataTypes.ParameterData = {type:"list", labelKey:"triggers.actions.countget.select_label", value:[], listValues:[]}
	public param_value:TwitchatDataTypes.ParameterData = {type:"text",  labelKey:"triggers.actions.countget.value_label", value:"", maxLength:20, icon:"placeholder_purple.svg"}

	public beforeMount(): void {
		const counters:TwitchatDataTypes.ParameterDataListValue[] = this.$store("counters").data.map(v=>{
			return {value:v.id, label:v.name};
		});
		
		this.param_counters.listValues = counters;
	}

}
</script>

<style scoped lang="less">
.triggeractioncountgetentry{
	.triggerActionForm();
	
	.name:deep(input), .itemSelector {
		// flex-grow: 1;
		flex-basis: 300px;
	}

	.list {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		.itemSelector {
			margin-left: 1.5em;
		}

		.icon {
			width: 1em;
			height: 1em;
			object-fit: contain;
			margin-right: 0.5em;
		}
	}

	.example {
		font-size: .9em;
		// text-align: center;
		margin: 1em 0 .5em 0;
	}
	
}
</style>