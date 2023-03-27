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
import { TriggerEventPlaceholders, type TriggerActionCountData, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		ParamItem,
	},
})
export default class TriggerActionCountEntry extends Vue {

	@Prop
	public action!:TriggerActionCountData;
	@Prop
	public triggerData!:TriggerData;


	public param_counters:TwitchatDataTypes.ParameterData = {type:"list", labelKey:"triggers.actions.count.select_label", value:[], listValues:[]}
	public param_value:TwitchatDataTypes.ParameterData = {type:"string",  labelKey:"triggers.actions.count.value_label", value:"", maxLength:100, icon:"add_purple.svg"}

	public beforeMount(): void {
		const counters:TwitchatDataTypes.ParameterDataListValue[] = this.$store("counters").data.map(v=>{
			return {value:v.id, label:v.name};
		}).filter(v=> {
			return v.value != this.triggerData.counterID
		});
		
		for (let i = 0; i < this.action.counters.length; i++) {
			const cid = this.action.counters[i];
			console.log(cid);
			if(counters.findIndex(v=>v.value == cid) === -1) {
				//Counter not found, user probably deleted it
				this.action.counters.splice(i,1);
				i--;
			}
		}
		
		this.param_counters.listValues = counters;

		this.param_value.placeholderList = TriggerEventPlaceholders(this.triggerData.type).filter(v=>v.numberParsable==true);
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

	// :deep(label), label {
		// flex-basis: 180px;
	// }

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