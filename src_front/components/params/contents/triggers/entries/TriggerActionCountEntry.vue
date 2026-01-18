<template>
	<div class="triggeractioncountentry triggerActionForm">
		<div class="card-item list">
			<label class="listLabel">
				<Icon name="count" class="icon" />
				<span>{{ $t(param_counters.labelKey as string) }}</span>
			</label>
			<vue-select class="itemSelector"
				label="label"
				:placeholder="$t('triggers.actions.count.select_placeholder')"
				v-model="action.counters"
				:options="param_counters.listValues"
				:calculate-position="$placeDropdown"
				:reduce="(v:TwitchatDataTypes.ParameterDataListValue<string>) => v.value"
				:selectable="(v:TwitchatDataTypes.ParameterDataListValue<string>) => action.counters.indexOf(v.value) == -1"
				appendToBody
				multiple
			></vue-select>
		</div>

		<div class="card-item counterList" v-if="selectedPerUserCounters.length > 0 && userSourceOptions.length > 1">
			<div class="head">
				<Icon name="user" class="icon" />
				<span>{{ $t("triggers.actions.count.user_source_title", selectedPerUserCounters.length) }}</span>
			</div>
			<div class="card-item dark" v-for="item in selectedPerUserCounters" :key="item.id">
				<label :for="'select_'+item.id" class="name">{{ item.name }}</label>
				<select :id="'select_'+item.id" v-model="action.counterUserSources[item.id]">
					<option v-for="opt in userSourceOptions" :value="opt.key">{{ $t(opt.labelKey, {PLACEHOLDER:opt.key.toUpperCase()}) }}</option>
				</select>
			</div>
		</div>

		<div class="card-item counterList" v-if="selectedPerUserCounters.length > 0 && userSourceOptions.length > 1">
			<div class="head">
				<Icon name="user" class="icon" />
				<span>{{ $t("triggers.actions.count.user_action_title", selectedPerUserCounters.length) }}</span>
			</div>

			<div class="card-item dark" v-for="item in selectedPerUserCounters" :key="item.id">
				<label :for="'select_'+item.id" class="name">{{ item.name }}</label>
				<select :id="'select_'+item.id" v-model="action.userAction![item.id]">
					<option v-for="opt in param_userAction.listValues" :value="opt.value">{{ $t(opt.labelKey!) }}</option>
				</select>
			</div>
		</div>

		<template v-if="showAction">
			<ParamItem :paramData="param_action" v-model="action.action" />
			<ParamItem :paramData="param_value" v-model="action.addValue" />
		</template>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import { COUNTER_EDIT_SOURCE_CHATTERS, COUNTER_EDIT_SOURCE_EVERYONE, COUNTER_EDIT_SOURCE_SENDER, COUNTER_VALUE_PLACEHOLDER_PREFIX, TriggerActionCountDataActionList, type ITriggerPlaceholder, type TriggerActionCounterData, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from 'vue';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		ParamItem,
	},
})
class TriggerActionCountEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionCounterData;

	@Prop
	declare triggerData:TriggerData;

	private userPLaceholders:ITriggerPlaceholder<any>[] = [];

	public param_counters:TwitchatDataTypes.ParameterData<string[], string> = {type:"list", labelKey:"triggers.actions.count.select_label", value:[], listValues:[]}
	public param_value:TwitchatDataTypes.ParameterData<string> = {type:"string",  labelKey:"triggers.actions.count.value_label", value:"", maxLength:100, icon:"add"}
	public param_action:TwitchatDataTypes.ParameterData<string, string> = {type:"list", labelKey:"triggers.actions.count.select_action", value:"", listValues:[]}
	public param_userAction:TwitchatDataTypes.ParameterData<NonNullable<TriggerActionCounterData["userAction"]>[string], NonNullable<TriggerActionCounterData["userAction"]>[string]> = {type:"list", labelKey:"triggers.actions.count.param_action", value:"update"}

	/**
	 * Define if global actions should be displayed.
	 * If only per-user delete actions are selected, we should not display the global action
	 */
	public get showAction():boolean {
		if(this.action.counters.length === 0) return true;
		let deleteBatchActions = 0;
		for (const cid of this.action.counters) {
			if(this.action.userAction
			&& this.action.userAction[cid] === "delete") deleteBatchActions ++;
		}

		return deleteBatchActions < this.action.counters.length;
	}

	/**
	 * Build user trigger source list
	 */
	public get userSourceOptions():{key:string, labelKey:string}[] {
		const res:{key:string, labelKey:string}[] = [
			//Add static sources "sender" and "everyone"
			{labelKey:"triggers.actions.count.user_source_sender", key:COUNTER_EDIT_SOURCE_SENDER},
			{labelKey:"triggers.actions.count.user_source_everyone", key:COUNTER_EDIT_SOURCE_EVERYONE},
			{labelKey:"triggers.actions.count.user_source_chatters", key:COUNTER_EDIT_SOURCE_CHATTERS},
		];

		//Add command's placeholders
		if(this.triggerData.chatCommandParams) {
			this.triggerData.chatCommandParams.forEach(v=> {
				res.push({labelKey:"triggers.actions.count.user_source_placeholder", key:v.tag});
			});
		}

		//Add global placeholders that may contain a user name
		this.userPLaceholders.filter(v=>v.tag.indexOf(COUNTER_VALUE_PLACEHOLDER_PREFIX)==-1).forEach(v=> {
			res.push({labelKey:"triggers.actions.count.user_source_placeholder", key:v.tag});
		})
		return res;
	}

	/**
	 * Get counter data of any per-user counter added to the selection
	 */
	public get selectedPerUserCounters():TwitchatDataTypes.CounterData[] {
		return this.$store.counters.counterList
		.filter(v=>v.perUser === true && this.action.counters.findIndex(v2=>v2 === v.id) > -1);
	}

	public beforeMount(): void {
		typeof this.action["userAction"]
		this.param_userAction.listValues = [
			{value:"update", labelKey:"triggers.actions.count.action_update"},
			{value:"delete", labelKey:"triggers.actions.count.action_delete"},
		];

		//If trigger is related to a counter event (looped, maxed, mined) remove it
		//from the editable counter to avoid infinite loop
		const counters:TwitchatDataTypes.ParameterDataListValue<string>[] = this.$store.counters.counterList.map(v=>{
			return {value:v.id, label:v.name};
		}).filter(v=> {
			return v.value != this.triggerData.counterId
		});

		//Init counter's action if necessary
		if(!this.action.action) this.action.action = "ADD";
		//Init counter's list if necessary
		if(!this.action.counters) this.action.counters = [];
		if(!this.action.addValue) this.action.addValue = "";

		//Check if selected counter still exists
		for (let i = 0; i < this.action.counters.length; i++) {
			const cid = this.action.counters[i];
			if(counters.findIndex(v=>v.value == cid) === -1) {
				//Counter not found, user probably remove it
				this.action.counters.splice(i,1);
				i--;
			}
		}

		this.param_counters.listValues = counters;

		//Populate action list from types definition
		let actionList:TwitchatDataTypes.ParameterDataListValue<string>[] = [];
		for (const value of TriggerActionCountDataActionList) {
			actionList.push({value, labelKey:"triggers.actions.count.action_"+value.toLowerCase()});
		}
		this.param_action.listValues = actionList;

		watch(()=>this.selectedPerUserCounters, ()=> this.updatePerUserCounterSources());
		this.updatePerUserCounterSources();
	}

	/**
	 * Initialize the "counterUserSources" data property if not
	 * existing yet and set "SENDER" default value
	 */
	private updatePerUserCounterSources():void {
		//Init per-user counter sources if necessary
		for (const c of this.selectedPerUserCounters) {
			if(!this.action.counterUserSources) {
				this.action.counterUserSources = {};
			}
			if(!this.action.userAction) {
				this.action.userAction = {};
			}
			if(!this.action.counterUserSources[c.id]) {
				this.action.counterUserSources[c.id] = COUNTER_EDIT_SOURCE_SENDER;
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
		console.log(list)
		this.userPLaceholders = list;
		this.param_value.placeholderList = list.filter(v=>v.numberParsable == true);
	}

}
export default toNative(TriggerActionCountEntry);
</script>

<style scoped lang="less">
.triggeractioncountentry{
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

	.counterList {
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
