<template>
	<div class="triggeractionvalueentry triggerActionForm">
		<div class="card-item list">
			<label class="listLabel">
				<img src="@/assets/icons/placeholder.svg" class="icon">
				<span>{{ $t(param_values.labelKey as string) }}</span>
			</label>
			<vue-select class="itemSelector"
				label="label"
				:placeholder="$t('triggers.actions.value.select_placeholder')"
				v-model="action.values"
				:options="param_values.listValues"
				:calculate-position="$placeDropdown"
				:reduce="(v:TwitchatDataTypes.ParameterDataListValue<string>) => v.value" 
				:selectable="(v:TwitchatDataTypes.ParameterDataListValue<string>) => action.values.indexOf(v.value) == -1"
				appendToBody
				multiple
			></vue-select>
		</div>

		<ParamItem :paramData="param_value" v-model="action.newValue" />
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import type { ITriggerPlaceholder, TriggerActionValueData, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry.vue';

@Component({
	components:{
		ParamItem,
	},
})
export default class TriggerActionValueEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionValueData;

	@Prop
	declare triggerData:TriggerData;

	public param_values:TwitchatDataTypes.ParameterData<string[], string> = {type:"list", labelKey:"triggers.actions.value.select_label", value:[], listValues:[]}
	public param_value:TwitchatDataTypes.ParameterData<string> = {type:"string",  labelKey:"triggers.actions.value.value_label", value:""}


	public beforeMount(): void {
		//If trigger is related to a value event (looped, maxed, mined) remove it
		//from the editable value to avoid infinite loop
		const values:TwitchatDataTypes.ParameterDataListValue<string>[] = this.$store("values").valueList.map(v=>{
			return {value:v.id, label:v.name};
		}).filter(v=> {
			return v.value != this.triggerData.counterId
		});
		
		//Init value's list if necessary
		if(!this.action.values) this.action.values = [];

		//Check if selected values still exists
		for (let i = 0; i < this.action.values.length; i++) {
			const cid = this.action.values[i];
			if(values.findIndex(v=>v.value == cid) === -1) {
				//Value not found, user probably remove it
				this.action.values.splice(i,1);
				i--;
			}
		}
		
		this.param_values.listValues = values;
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.param_value.placeholderList = list;
	}

}
</script>

<style scoped lang="less">
.triggeractionvalueentry{
	.itemSelector {
		flex-grow: 1;
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
			object-fit: fill;
			margin-right: 0.5em;
		}
	}

	.valueList {
		gap: .25em;
		display: flex;
		flex-direction: column;
		.head {
			margin-bottom: .25em;
			img {
				height: 1em;
				margin-right: .5em;
			}
		}
		.card-item {
			display: flex;
			flex-direction: row;
			align-items: center;
			flex-wrap: wrap;
			box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
			.name {
				font-weight: bold;
				flex-grow: 1;
			}
			select{
				width: 100%;//Allows proper auto size
				flex-grow: 1;
				max-width: 300px;
				flex-basis: 300px;
			}
		}
	}
}
</style>