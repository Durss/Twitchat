<template>
	<div class="triggerconditionlistitem">
		<Icon name="dragZone" class="dragIcon" />

		<ParamItem class="value" v-if="forceCustomPlaceholder" noBackground :paramData="param_placeholder" v-model="condition.placeholder" />
		<ParamItem class="placeholder" v-else noBackground :paramData="param_placeholder_list" @change="onSelectPlaceholder()" v-model="condition.placeholder" :key="'ph_'+condition.id" />

		<ParamItem class="operator" noBackground :paramData="param_operator" v-model="condition.operator" :key="'op_'+condition.id" />

		<div class="valueHolder" :class="{isCustomValue:forceCustomValue}">
			<TTButton class="clearCustomBt" v-if="forceCustomValue" @click="forceCustomValue = false" icon="cross" secondary small></TTButton>
			<ParamItem class="value" v-if="needsValue && forceCustomValue !== true && param_value_list.listValues" noBackground :paramData="param_value_list" v-model="condition.value" :key="'vl_'+condition.id" @change="onSelectFixedValue()" />
			<ParamItem class="value" v-else-if="needsValue" noBackground :paramData="param_value" v-model="condition.value" :key="'v_'+condition.id" placeholdersAsPopout />
		</div>

		<div class="ctas">
			<TTButton small icon="group"
				@click="addItem()"
				v-tooltip="$t('triggers.condition.group_tt')"
				v-if="parentCondition.conditions.length > 1" />
			<TTButton alert small icon="cross"
				@click="deleteItem()" />
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import { COUNTER_VALUE_PLACEHOLDER_PREFIX, TriggerConditionOperatorList, TriggerEventPlaceholders, type TriggerCondition, type TriggerConditionGroup, type TriggerData, VALUE_PLACEHOLDER_PREFIX, type TriggerConditionOperator, type ITriggerPlaceholder, STOPWATCH_PLACEHOLDER_PREFIX, COUNTDOWN_PLACEHOLDER_PREFIX } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		TTButton,
		ParamItem,
	},
	emits:[],
})
class TriggerConditionListItem extends Vue {

	@Prop
	public triggerData!:TriggerData;

	@Prop
	public condition!:TriggerCondition;

	@Prop
	public parentCondition!: TriggerConditionGroup;

	@Prop({ default: [], type: Array })
	public placeholderList!:ITriggerPlaceholder<string>[];

	public forceCustomValue:boolean = false;
	public forceCustomPlaceholder:boolean = false;
	public param_placeholder:TwitchatDataTypes.ParameterData<string, string> = {type:"string", value:"", longText:false}
	public param_placeholder_list:TwitchatDataTypes.ParameterData<string, string, void, void, ITriggerPlaceholder<string>> = {type:"list", value:""}
	public param_operator:TwitchatDataTypes.ParameterData<TriggerConditionOperator, TriggerConditionOperator> = {type:"list", value:">"}
	public param_value:TwitchatDataTypes.ParameterData<string, string> = {type:"string", value:"", longText:false}
	public param_value_list:TwitchatDataTypes.ParameterData<string, unknown> = {type:"list", value:""}

	private firstRender:boolean = true;
	private CUSTOM:string = "@___CUSTOM_VALUE___@";

	public get needsValue():boolean {
		return this.param_operator.value != "empty" && this.param_operator.value != "not_empty";
	}

	public beforeMount(): void {
		if(this.condition.placeholder) this.condition.placeholder = this.condition.placeholder.toUpperCase();

		this.buildSourceList();

		//Watch for changes on the chat command params to rebuild source list
		watch(()=> this.triggerData.chatCommandParams, ()=> {
			this.buildSourceList();
		}, {deep:true});
	}

	/**
	 * Create the source list used as the first operator of the condition
	 */
	public buildSourceList():void {
		let placeholderListLocal:ConditionListValues<string,ITriggerPlaceholder<string>>[] =  [];
		let placeholders: ITriggerPlaceholder<any, unknown, "">[] = [];
		if(this.placeholderList.length == 0) {
			//Add commmand params
			if(this.triggerData.chatCommandParams) {
				this.triggerData.chatCommandParams.forEach(v=> {
					placeholderListLocal.push({
						value:v.tag.toUpperCase(),
						label: this.$t('triggers.condition.placeholder_cmd_param', {NAME:"{"+v.tag.toUpperCase()+"}"}),
					});
				})
			}

			//Add trigger's placeholders
			placeholders = TriggerEventPlaceholders(this.triggerData.type).concat();
			let debouncedRebuild = -1;
			placeholderListLocal = placeholderListLocal.concat(placeholders.map(v=> {
				let name = "";
				//If it's a counter tag, get counter's name
				if(v.tag.indexOf(COUNTER_VALUE_PLACEHOLDER_PREFIX) > -1) {
					const counterTag = v.tag.replace(COUNTER_VALUE_PLACEHOLDER_PREFIX, "");
					const counter = this.$store.counters.counterList.find(v=>v.placeholderKey?.toLowerCase() === counterTag.toLowerCase());
					if(counter) name = counter.name;
				}
				if(v.tag.indexOf(VALUE_PLACEHOLDER_PREFIX) > -1) {
					const valueTag = v.tag.replace(VALUE_PLACEHOLDER_PREFIX, "");
					const counter = this.$store.values.valueList.find(v=>v.placeholderKey?.toLowerCase() === valueTag.toLowerCase());
					if(counter) name = counter.name;
				}
				if(v.tag.indexOf(COUNTDOWN_PLACEHOLDER_PREFIX) > -1) {
					const valueTag = v.tag.replace(COUNTDOWN_PLACEHOLDER_PREFIX, "");
					const timer = this.$store.timers.timerList.find(v=>v.placeholderKey && valueTag.indexOf(v.placeholderKey) == 0);
					if(timer) name = timer.title;
				}
				if(v.tag.indexOf(STOPWATCH_PLACEHOLDER_PREFIX) > -1) {
					const valueTag = v.tag.replace(STOPWATCH_PLACEHOLDER_PREFIX, "");
					const timer = this.$store.timers.timerList.find(v=>v.placeholderKey && valueTag.indexOf(v.placeholderKey) == 0);
					if(timer) name = timer.title;
				}
				watch(()=>v.values, ()=> {
					clearTimeout(debouncedRebuild);
					debouncedRebuild = window.setTimeout(()=> {
						this.buildSourceList();
					}, 20);
				}, {deep:true});
				return {
					label: this.$t(v.descKey, {NAME:name? "\""+name+"\"" : ""}),
					value:v.tag.toUpperCase(),
					fixedValues:v.values,
					storage:v,
				}
			}));
		}else {
			placeholders = this.placeholderList;
			placeholderListLocal = placeholders.map(v => {
				return {
					label: this.$t(v.descKey, v.descReplacedValues ?? {}),
					value: v.tag.toUpperCase(),
					fixedValues: v.values,
					storage:v,
				}
			})
		}

		if(this.$store.auth.isAdmin && this.$store.main.devmode) {
			//Add custom placeholder for devs
			placeholderListLocal.push({
				label: "Custom",
				value:this.CUSTOM,
			});
		}

		//Fail safe, if the placeholder isn't found on the list, push it to avoid reseting it to another
		//random one in case it's been deleted or I fuck up something in the futur
		if(this.condition.placeholder != "" && placeholderListLocal.findIndex(v=>v.value == this.condition.placeholder) == -1) {
			placeholderListLocal.push({label:this.condition.placeholder, value:this.condition.placeholder});
		}

		this.param_placeholder_list.listValues = placeholderListLocal;
		this.param_value.placeholderList = placeholders.concat();
		//Wait for list to render and update its internal "selectedListValue" value.
		//Might be something fixable within the ParamItem component to avoid that
		//async behavior, but too lazy for now :3
		this.$nextTick().then(()=>{
			this.updateOperators();
			this.firstRender = false;
		})
	}

	/**
	 * Removes arithmetical operators if the placeholder
	 * isn't defined as number parsable.
	 */
	public updateOperators(inputOrigin:boolean = false):void {
		if(inputOrigin && this.firstRender || !this.param_placeholder_list.selectedListValue) return;

		const placeholderRef = this.param_placeholder_list.selectedListValue.storage;
		const cmdParamRef = this.triggerData.chatCommandParams?.find(v=> v.tag == this.condition.placeholder);

		this.param_operator.listValues = TriggerConditionOperatorList.map(v=> {
			return {
				label: this.$t("triggers.condition.operators."+v),
				value: v,
			}
		}).filter(v=> {
			//Remove arithmetical operators if placeholder isn't parsable as number
			// console.log(placeholderRef, v.value);
			if((!placeholderRef || placeholderRef.numberParsable !== true) && !cmdParamRef) {
				return ![">","<",">=","<="].includes(v.value);
			}
			return true;
		});

		//If selected placeholder has fixed values
		if(this.param_placeholder_list.selectedListValue && (this.param_placeholder_list.selectedListValue as ConditionListValues<string,ITriggerPlaceholder<string>>).fixedValues) {
			const list = (this.param_placeholder_list.selectedListValue as ConditionListValues<string,ITriggerPlaceholder<string>>).fixedValues!.concat();
			list.push({value:this.CUSTOM, labelKey:"triggers.condition.custom_value"});
			this.param_value_list.listValues = list;
			this.param_value_list.type = "imagelist";

			//If condition's value does not exist on the fixed ones, force
			//custom field to be displayed with that value.
			const item = list.find(v=> (v.value as any).toString().toLowerCase() == (this.condition.value as any).toString().toLowerCase())
			if(this.condition.value && !item) {
				this.forceCustomValue = true;
			}

			if(item) this.condition.value = item.value as string;
		}else{
			delete this.param_value_list.listValues;
		}
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

	/**
	 * Called when a fixed value is selected.
	 * Detect if its the "custom" entry that's selected to switch to the
	 * custom field.
	 */
	public onSelectFixedValue():void {
		if(this.param_value_list.value == this.CUSTOM) {
			this.forceCustomValue = true;
			this.condition.value = "";
		}
	}

	public onSelectPlaceholder():void {
		if(this.param_placeholder_list.value == this.CUSTOM) {
			this.forceCustomPlaceholder = true;
			this.condition.placeholder = "";
		}

		this.updateOperators(true);
	}
}

export interface ConditionListValues<T,U> extends TwitchatDataTypes.ParameterDataListValue<T,U> {
	fixedValues?:TwitchatDataTypes.ParameterDataListValue<unknown>[];
}

export default toNative(TriggerConditionListItem);
</script>

<style scoped lang="less">
.triggerconditionlistitem{
	display: flex;
	flex-direction: row;
	gap: 2px;
	&:hover, &:active, &:focus-within {
		.dragIcon {
			// width: 15px;
			height: 1.5em;
			width: auto;
			vertical-align: middle;
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
		flex-basis: 80px;
		flex-shrink: 0;
	}

	.valueHolder {
		min-width: 100px;
		display: flex;
		flex-direction: row;
		.value {
			width: 100%;
		}
		.clearCustomBt {
			border-top-right-radius: 0;
			border-bottom-right-radius: 0;
		}
		&.isCustomValue{
			.value {
				:deep(.popoutMode) {
					height: 100%;
				}
				:deep(.content) {
					height: 100%;
					.holder {
						height: 100%;
					}
					.inputHolder, input {
						height: 100%;
						border-top-left-radius: 0;
						border-bottom-left-radius: 0;
					}
				}
			}
		}
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
