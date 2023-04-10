<template>
	<div class="triggerconditionlist">
		condition list
		<Button title="Add condition" :icon="$image('icons/add.svg')" @click="addCondition()" />

		<div class="list">
			<div v-for="item in triggerData.conditions" :key="item.id" class="item">
				<ParamItem class="placeholder" :paramData="getPlaceholderParam(item.id)" v-model="item.placeholder" :key="'ph_'+item.id" />
				<ParamItem class="operator" :paramData="getOperatorParam(item.id)" v-model="item.operator" :key="'op_'+item.id" />
				<ParamItem class="value" :paramData="getValueParam(item.id)" v-model="item.value" :key="'op_'+item.id" />
				<Button highlight small :icon="$image('icons/cross_white.svg')" @click="deleteCondition(item.id)" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import { TriggerEventPlaceholders, type TriggerData, type ITriggerPlaceholder, TriggerConditionOperatorList } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import Utils from '@/utils/Utils';
import { COUNTER_VALUE_PLACEHOLDER_PREFIX } from '@/types/TriggerActionDataTypes';
import { reactive } from 'vue';

@Component({
	components:{
		Button,
		ParamItem,
	},
	emits:[],
})
export default class TriggerConditionList extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public placeholders:ITriggerPlaceholder[] = [];
	public paramCache:{[key:string]:TwitchatDataTypes.ParameterData<string, string> } = {};

	public beforeMount():void {
		this.placeholders = TriggerEventPlaceholders(this.triggerData.type).concat();
	}

	public getPlaceholderParam(id:string):TwitchatDataTypes.ParameterData<string, string> {
		id = "ph_"+id;
		if(this.paramCache[id]) return this.paramCache[id];
		this.paramCache[id] = reactive({
			type: "list",
			value: "",
			listValues: this.placeholders.map(v=> {
				let name = "";
				if(v.tag.indexOf(COUNTER_VALUE_PLACEHOLDER_PREFIX) > -1) {
					const counterTag = v.tag.replace(COUNTER_VALUE_PLACEHOLDER_PREFIX, "");
					const counter = this.$store("counters").counterList.find(v=>v.placeholderKey.toLowerCase() === counterTag.toLowerCase());
					if(counter) name = counter.name;
				}
				return {
					label: this.$t(v.descKey, {NAME:"\""+name+"\""}),
					value:v.tag,
				}
			}),
		});
		return this.paramCache[id];
	}

	public getOperatorParam(id:string):TwitchatDataTypes.ParameterData<string, string> {
		id = "op_"+id;
		if(this.paramCache[id]) return this.paramCache[id];
		this.paramCache[id] = reactive({
			type: "list",
			value: "",
			listValues: TriggerConditionOperatorList.map(v=> {
				return {
					label: this.$t("triggers.actions.condition.operators."+v),
					value: v,
				}
			}),
		});
		return this.paramCache[id];
	}

	public getValueParam(id:string):TwitchatDataTypes.ParameterData<string, string> {
		id = "val_"+id;
		if(this.paramCache[id]) return this.paramCache[id];
		this.paramCache[id] = reactive({
			type: "string",
			value: "",
		});
		return this.paramCache[id];
	}

	public addCondition():void {
		if(!this.triggerData.conditions) this.triggerData.conditions = [];
		this.triggerData.conditions.push({
			id:Utils.getUUID(),
			operator:"=",
			placeholder:"",
			value:"",
		})
	}

	public deleteCondition(id:string):void {
		for (let i = 0; i < this.triggerData.conditions.length; i++) {
			const item = this.triggerData.conditions[i];
			if(item.id == id) {
				this.triggerData.conditions.splice(i, 1);
				return;
			}
		}
	}

}
</script>

<style scoped lang="less">
.triggerconditionlist{
	.list {
		display: flex;
		flex-direction: column;
		gap: .25em;
		.item {
			display: flex;
			flex-direction: row;
			.placeholder, .operator {
				flex-basis: 100px;
				flex-grow: 1;
			}
			.value {
				flex-grow: 1;
			}
		}
	}

}
</style>