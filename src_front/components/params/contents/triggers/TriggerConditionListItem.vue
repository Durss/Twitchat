<template>
	<div class="triggerconditionlistitem">
		<Icon name="dragZone" class="dragIcon" />

		<ParamItem class="placeholder" noBackground :paramData="param_placeholder" @change="updateOperators()" v-model="condition.placeholder" :key="'ph_'+condition.id" />

		<ParamItem class="operator" noBackground :paramData="param_operator" v-model="condition.operator" :key="'op_'+condition.id" />

		<ParamItem class="value" noBackground :paramData="param_value" v-model="condition.value" :key="'op_'+condition.id" />

		<div class="ctas">
			<Button small icon="group"
				@click="addItem()"
				v-tooltip="$t('triggers.condition.group_tt')" />
			<Button alert small icon="cross"
				@click="deleteItem()" />
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-facing-decorator';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TriggerEventPlaceholders, type TriggerCondition, type TriggerConditionGroup, type TriggerData, COUNTER_VALUE_PLACEHOLDER_PREFIX, TriggerConditionOperatorList } from '@/types/TriggerActionDataTypes';
import Utils from '@/utils/Utils';
import ParamItem from '../../ParamItem.vue';
import Button from '@/components/Button.vue';
import { watch } from 'vue';

@Component({
	components:{
		Button,
		ParamItem,
	},
	emits:[],
})
export default class TriggerConditionListItem extends Vue {

	@Prop
	public triggerData!:TriggerData;
	
	@Prop
	public condition!:TriggerCondition;

	@Prop
	public parentCondition!:TriggerConditionGroup;

	public param_placeholder:TwitchatDataTypes.ParameterData<string, string> = {type:"list", value:""}
	public param_operator:TwitchatDataTypes.ParameterData<string, string> = {type:"list", value:""}
	public param_value:TwitchatDataTypes.ParameterData<string, string> = {type:"string", value:""}

	public beforeMount():void {
		this.buildSourceList();
		this.updateOperators();

		//Watch for changes on the chat command params to rebuild source list
		watch(()=> this.triggerData.chatCommandParams, ()=> {
			this.buildSourceList();
		}, {deep:true});
	}

	/**
	 * Create the source list used as the first operator of the condition
	 */
	public buildSourceList():void {
		//Add commmand params
		let placeholderList:TwitchatDataTypes.ParameterDataListValue<string>[] = [];
			if(this.triggerData.chatCommandParams) {
			this.triggerData.chatCommandParams.forEach(v=> {
				placeholderList.push({
					value:v.tag,
					label: this.$t('triggers.condition.placeholder_cmd_param', {NAME:"{"+v.tag.toUpperCase()+"}"}),
				})
			})
		}
			
		//Add trigger's placeholders
		let placeholders = TriggerEventPlaceholders(this.triggerData.type).concat();
		placeholderList = placeholderList.concat(placeholders.map(v=> {
			let name = "";
			//If it's a counter tag, get counter's name
			if(v.tag.indexOf(COUNTER_VALUE_PLACEHOLDER_PREFIX) > -1) {
				const counterTag = v.tag.replace(COUNTER_VALUE_PLACEHOLDER_PREFIX, "");
				const counter = this.$store("counters").counterList.find(v=>v.placeholderKey?.toLowerCase() === counterTag.toLowerCase());
				if(counter) name = counter.name;
			}
			return {
				label: this.$t(v.descKey, {NAME:"\""+name+"\""}),
				value:v.tag,
			}
		}));
		
		this.param_placeholder.listValues = placeholderList;
	}

	/**
	 * Removes arithmetical operators if the placeholder
	 * isn't defined as number parsable.
	 */
	public updateOperators():void {
		let placeholders = TriggerEventPlaceholders(this.triggerData.type).concat();
		const placeholderRef = placeholders.find(v=> v.tag == this.condition.placeholder);
		const cmParamsRef = this.triggerData.chatCommandParams?.find(v=> v.tag == this.condition.placeholder);

		this.param_operator.listValues = TriggerConditionOperatorList.map(v=> {
				return {
					label: this.$t("triggers.condition.operators."+v),
					value: v,
				}
			}).filter(v=> {
				//Remove arithmetical operators if placeholder isn't parsable as number
				if((!placeholderRef || placeholderRef.numberParsable !== true) && !cmParamsRef) {
					return ![">","<",">=","<="].includes(v.value);
				}
				return true;
			});
	}

	/**
	 * Converts the current condition item to a group item and add a new condition in it
	 */
	public addItem():void {
		const index = this.parentCondition.conditions.findIndex(v=>v.id === this.condition.id);
		this.parentCondition.conditions.splice(index, 1, {
			id:Utils.getUUID(),
			type:"group",
			conditions:[this.condition, {
				id:Utils.getUUID(),
				type:"condition",
				operator:"=",
				placeholder:"",
				value:"",
			}],
			operator:"AND",
		})
	}

	/**
	 * Delete current item.
	 */
	public deleteItem():void {
		const index = this.parentCondition.conditions.findIndex(v=>v.id === this.condition.id);
		if(index === -1) return;//Item not found
		this.parentCondition.conditions.splice(index, 1);
	}
}
</script>

<style scoped lang="less">
.triggerconditionlistitem{
	display: flex;
	flex-direction: row;
	gap: 2px;
	&:hover, &:active, &:focus-within {
		.dragIcon {
			width: 8px;
			opacity: 1;
			margin-right: 0;
		}
	}
	.dragIcon {
		width: 0;
		opacity: 0;
		transition: all .1s;
		align-self: center;
		margin-right: -5px;
		cursor: grab;
		&:active {
			cursor: grabbing;
		}
	}
	.operator {
		flex-basis: 150px;
		flex-shrink: 0;
	}
	.ctas {
		flex-shrink: 0;
		display: flex;
		flex-direction: row;
		gap: 0;
		.button {
			border-radius: 0;
			&:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			&:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}
		}
	}
}
</style>