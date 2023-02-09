<template>
	<div class="triggeractioncountentry">
		<div class="row item list">
			<label class="listLabel">
				<img src="@/assets/icons/count_purple.svg" class="icon">
				<span>{{ $t(param_counters.labelKey as string) }}</span>
			</label>
			<vue-select class="itemSelector"
				label="label"
				:placeholder="$t('triggers.actions.count.select_placeholder')"
				v-model="action.counters"
				:options="param_counters.listValues"
				:calculate-position="$placeDropdown"
				:reduce="(v:TwitchatDataTypes.ParameterDataListValue) => v.value" 
				:selectable="(v:TwitchatDataTypes.ParameterDataListValue) => (param_counters.value as string[]).indexOf(v.value as string) == -1"
				appendToBody
				multiple
			></vue-select>
		</div>

		<div class="row item value">
			<ParamItem :paramData="param_value" v-model="action.addValue" />
		</div>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import { TriggerActionHelpers, type TriggerActionCountData, type TriggerData, type TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		action:Object,
		event:Object,
		triggerData:Object,
		triggerKey:String,
	},
	components:{
		ParamItem,
	},
})
export default class TriggerActionCountEntry extends Vue {

	public action!:TriggerActionCountData;
	public event!:TriggerEventTypes;
	public triggerData!:TriggerData;
	public triggerKey!:string;


	public param_counters:TwitchatDataTypes.ParameterData = {type:"list", labelKey:"triggers.actions.count.select_label", value:[], listValues:[]}
	public param_value:TwitchatDataTypes.ParameterData = {type:"text",  labelKey:"triggers.actions.count.value_label", value:"", maxLength:100, icon:"add_purple.svg"}

	public beforeMount(): void {
		const counters:TwitchatDataTypes.ParameterDataListValue[] = this.$store("counters").data.map(v=>{
			return {value:v.id, label:v.name};
		}).filter(v=> {
			return v.value != this.triggerKey.split("_").pop()
		});
		
		this.param_counters.listValues = counters;

		this.param_value.placeholderList = TriggerActionHelpers(this.event.value).filter(v=>v.numberParsable==true);
	}

}
</script>

<style scoped lang="less">
.triggeractioncountentry{
	.triggerActionForm();
	
	.value:deep(input), .itemSelector {
		flex-grow: 1;
		flex-basis: 300px;
	}

	:deep(label), label {
		// flex-basis: 180px;
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
}
</style>