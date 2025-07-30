<template>
	<div class="triggeractionvalueentry triggerActionForm">
		<div class="card-item list">
			<label class="listLabel">
				<Icon name="placeholder" />
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

		<div class="card-item valueList" v-if="selectedPerUserValue.length > 0 && userSourceOptions.length > 1">
			<div class="head">
				<Icon name="user" class="icon" />
				<span>{{ $t("triggers.actions.value.user_source_title", selectedPerUserValue.length) }}</span>
			</div>

			<div class="card-item dark" v-for="item in selectedPerUserValue" :key="item.id">
				<label :for="'select_'+item.id" class="name">{{ item.name }}</label>
				<select :id="'select_'+item.id" v-model="action.valueUserSources[item.id]">
					<option v-for="opt in userSourceOptions" :value="opt.key">{{ $t(opt.labelKey, {PLACEHOLDER:opt.key.toUpperCase()}) }}</option>
				</select>
			</div>
		</div>

		<div class="card-item valueList" v-if="selectedPerUserValue.length > 0 && userSourceOptions.length > 1">
			<div class="head">
				<Icon name="user" class="icon" />
				<span>{{ $t("triggers.actions.value.user_action_title", selectedPerUserValue.length) }}</span>
			</div>

			<div class="card-item dark" v-for="item in selectedPerUserValue" :key="item.id">
				<label :for="'select_'+item.id" class="name">{{ item.name }}</label>
				<select :id="'select_'+item.id" v-model="action.userAction![item.id]">
					<option v-for="opt in param_userAction.listValues" :value="opt.value">{{ $t(opt.labelKey!) }}</option>
				</select>
			</div>
		</div>

		<ParamItem v-if="showAction" :paramData="param_value" v-model="action.newValue" key="value" forceChildDisplay>
			<ParamItem :childLevel="1" :paramData="param_maths" v-model="action.interpretMaths" key="maths" noBackground />
		</ParamItem>

	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import { VALUE_EDIT_SOURCE_CHATTERS, VALUE_EDIT_SOURCE_EVERYONE, VALUE_EDIT_SOURCE_SENDER, VALUE_PLACEHOLDER_PREFIX, type ITriggerPlaceholder, type TriggerActionValueData, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from 'vue';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		Icon,
		ParamItem,
	},
})
class TriggerActionValueEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionValueData;

	@Prop
	declare triggerData:TriggerData;

	private userPLaceholders:ITriggerPlaceholder<any>[] = [];

	public param_values:TwitchatDataTypes.ParameterData<string[], string> = {type:"list", labelKey:"triggers.actions.value.select_label", value:[], listValues:[]};
	public param_value:TwitchatDataTypes.ParameterData<string> = {type:"string", labelKey:"triggers.actions.value.value_label", value:""};
	public param_maths:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", labelKey:"triggers.actions.value.interpret_arithmetic", value:true};
	public param_userAction:TwitchatDataTypes.ParameterData<NonNullable<TriggerActionValueData["userAction"]>[string], NonNullable<TriggerActionValueData["userAction"]>[string]> = {type:"list", labelKey:"triggers.actions.value.param_action", value:"update"};

	/**
	 * Define if global actions should be displayed.
	 * If only per-user delete actions are selected, we should not display the global action
	 */
	public get showAction():boolean {
		if(this.action.values.length === 0) return true;
		let deleteBatchActions = 0;
		for (let i = 0; i < this.action.values.length; i++) {
			const cid = this.action.values[i];
			if(this.action.userAction
			&& this.action.userAction[cid] === "delete") deleteBatchActions ++;
		}

		return deleteBatchActions < this.action.values.length;
	}

	/**
	 * Build user trigger source list
	 */
	public get userSourceOptions():{key:string, labelKey:string}[] {
		const res:{key:string, labelKey:string}[] = [
			//Add static sources "sender" and "everyone"
			{labelKey:"triggers.actions.value.user_source_sender", key:VALUE_EDIT_SOURCE_SENDER},
			{labelKey:"triggers.actions.value.user_source_everyone", key:VALUE_EDIT_SOURCE_EVERYONE},
			{labelKey:"triggers.actions.value.user_source_chatters", key:VALUE_EDIT_SOURCE_CHATTERS},
		];

		//Add command's placeholders
		if(this.triggerData.chatCommandParams) {
			this.triggerData.chatCommandParams.forEach(v=> {
				res.push({labelKey:"triggers.actions.value.user_source_placeholder", key:v.tag});
			});
		}

		//Add global placeholders that may contain a user name
		this.userPLaceholders.filter(v=>v.tag.indexOf(VALUE_PLACEHOLDER_PREFIX)==-1).forEach(v=> {
			res.push({labelKey:"triggers.actions.value.user_source_placeholder", key:v.tag});
		})
		return res;
	}

	/**
	 * Get value data of any per-user value added to the selection
	 */
	public get selectedPerUserValue():TwitchatDataTypes.ValueData[] {
		return this.$store.values.valueList
		.filter(v=>v.perUser === true && this.action.values.findIndex(v2=>v2 === v.id) > -1);
	}


	public beforeMount(): void {
		if(this.action.interpretMaths === undefined) this.action.interpretMaths = true;

		typeof this.action["userAction"]
		this.param_userAction.listValues = [
			{value:"update", labelKey:"triggers.actions.value.action_update"},
			{value:"delete", labelKey:"triggers.actions.value.action_delete"},
		];
		//If trigger is related to a value event (looped, maxed, mined) remove it
		//from the editable value to avoid infinite loop
		const values:TwitchatDataTypes.ParameterDataListValue<string>[] = this.$store.values.valueList.map(v=>{
			return {value:v.id, label:v.name};
		}).filter(v=> {
			return v.value != this.triggerData.valueId
		});

		//Init value's list if necessary
		if(!this.action.values) this.action.values = [];
		if(!this.action.newValue) this.action.newValue = "";

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

		watch(()=>this.selectedPerUserValue, ()=> this.updatePerUserValueSources());
		this.updatePerUserValueSources();
	}

	/**
	 * Initialize the "valueUserSources" data property if not
	 * existing yet and set "SENDER" default value
	 */
	private updatePerUserValueSources():void {
		//Init per-user value sources if necessary
		for (let i = 0; i < this.selectedPerUserValue.length; i++) {
			const c = this.selectedPerUserValue[i];
			if(!this.action.valueUserSources) {
				this.action.valueUserSources = {};
			}
			if(!this.action.userAction) {
				this.action.userAction = {};
			}
			if(!this.action.valueUserSources[c.id]) {
				this.action.valueUserSources[c.id] = VALUE_EDIT_SOURCE_SENDER;
			}
			if(!this.action.userAction[c.id]) {
				this.action.userAction[c.id] = "update";
			}
		}
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.userPLaceholders = list;
		this.param_value.placeholderList = list;
	}

}
export default toNative(TriggerActionValueEntry);
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
			.icon {
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
