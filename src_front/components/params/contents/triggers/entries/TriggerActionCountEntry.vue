<template>
	<div class="triggeractioncountentry">
		<div class="row item list">
			<label class="listLabel">
				<img src="@/assets/icons/count.svg" class="icon">
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

		<div class="row item users" v-if="selectedPerUserCounters.length > 0 && userSourceOptions.length > 1">
			<div class="head">
				<img src="@/assets/icons/user.svg" class="icon">
				<span>{{ $tc("triggers.actions.count.user_source_title", selectedPerUserCounters.length) }}</span>
			</div>
			<div class="item" v-for="item in selectedPerUserCounters" :key="item.id">
				<label :for="'select_'+item.id" class="name">{{ item.name }}</label>
				<select :id="'select_'+item.id" v-model="action.counterUserSources[item.id]">
					<option v-for="opt in userSourceOptions" :value="opt.key">{{ $t(opt.labelKey, {PLACEHOLDER:opt.key.toUpperCase()}) }}</option>
				</select>
			</div>
		</div>

		<div class="row item value">
			<ParamItem :paramData="param_value" v-model="action.addValue" />
		</div>
	</div>
</template>

<script lang="ts">
import ParamItem from '@/components/params/ParamItem.vue';
import { COUNTER_VALUE_PLACEHOLDER_PREFIX } from '@/types/TriggerActionDataTypes';
import { TriggerEventPlaceholders, type TriggerActionCountData, type TriggerData, type TriggerActionCountDataUserSource } from '@/types/TriggerActionDataTypes';
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

	public get userSourceOptions():{key:TriggerActionCountDataUserSource, labelKey:string}[] {
		const res:{key:TriggerActionCountDataUserSource, labelKey:string}[] = [{labelKey:"triggers.actions.count.user_source_sender", key:"SENDER"}]
		if(this.triggerData.chatCommandParams) {
			this.triggerData.chatCommandParams.forEach(v=> {
				res.push({labelKey:"triggers.actions.count.user_source_placeholder", key:v.tag});
			});
			this.param_value.placeholderList!.filter(v=>v.tag.indexOf(COUNTER_VALUE_PLACEHOLDER_PREFIX)==-1).forEach(v=> {
				res.push({labelKey:"triggers.actions.count.user_source_placeholder", key:v.tag});
			})
		}
		return res;
	}

	public param_counters:TwitchatDataTypes.ParameterData<string[], string> = {type:"list", labelKey:"triggers.actions.count.select_label", value:[], listValues:[]}
	public param_value:TwitchatDataTypes.ParameterData<string> = {type:"string",  labelKey:"triggers.actions.count.value_label", value:"", maxLength:100, icon:"add.svg"}

	public get selectedPerUserCounters():TwitchatDataTypes.CounterData[] {
		return this.$store("counters").counterList
		.filter(v=>v.perUser === true && this.action.counters.findIndex(v2=>v2 === v.id) > -1);
	}

	public beforeMount(): void {
		const counters:TwitchatDataTypes.ParameterDataListValue<string>[] = this.$store("counters").counterList.map(v=>{
			return {value:v.id, label:v.name};
		}).filter(v=> {
			return v.value != this.triggerData.counterId
		});
		
		if(!this.action.counters) this.action.counters = [];

		for (let i = 0; i < this.action.counters.length; i++) {
			const cid = this.action.counters[i];
			if(counters.findIndex(v=>v.value == cid) === -1) {
				//Counter not found, user probably deleted it
				this.action.counters.splice(i,1);
				i--;
			}
		}
		
		this.param_counters.listValues = counters;

		this.param_value.placeholderList = TriggerEventPlaceholders(this.triggerData.type).filter(v=>v.numberParsable==true);

		//Init per-user counter sources if necessary
		for (let i = 0; i < this.selectedPerUserCounters.length; i++) {
			const c = this.selectedPerUserCounters[i];
			if(!this.action.counterUserSources) {
				this.action.counterUserSources = {};
			}
			if(!this.action.counterUserSources[c.id]) {
				this.action.counterUserSources[c.id] = "SENDER";
			}
		}
	}

}
</script>

<style scoped lang="less">
.triggeractioncountentry{
	.triggerActionForm();
	
	.value:deep(input) {
		flex-grow: 1;
		flex-basis: 200px;
	}
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

	.users {
		.head {
			margin-bottom: .25em;
			img {
				height: 1em;
				margin-right: .5em;
			}
		}
		.item {
			display: flex;
			flex-direction: row;
			align-items: center;
			flex-wrap: wrap;
			padding: .5em;
			border-radius: .5em;
			background-color: rgba(255, 255, 255, 30%);
			box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
			.name {
				font-weight: bold;
				flex-grow: 1;
			}
			select{
				width: 100%;//Allows proper auto size
				flex-grow: 1;
				max-width: 200px;
				flex-basis: 200px;
			}
		}
	}
}
</style>