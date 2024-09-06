<template>
	<div class="triggerconditionlist">
		<div>{{ $t("triggers.condition.title") }}</div>

		<Button v-if="!triggerData.conditions || triggerData.conditions.conditions.length == 0"
			icon="add" small
			@click="addCondition()">{{ $t('triggers.condition.createBt') }}</Button>

		<TriggerConditionListGroupItem v-else class="list"
			:triggerData="triggerData"
			:parentCondition="triggerData.conditions"
			:condition="[triggerData.conditions]" />
	</div>
</template>
<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import type { TriggerConditionGroup, TriggerData } from '@/types/TriggerActionDataTypes';
import Utils from '@/utils/Utils';
import { reactive, watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import TriggerConditionListGroupItem from './TriggerConditionListGroupItem.vue';

@Component({
	components:{
		Button: TTButton,
		TriggerConditionListGroupItem,
	},
	emits:[],
})
class TriggerConditionList extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public beforeMount():void {
		watch(()=> this.triggerData.conditions, ()=> {
			if(this.triggerData.conditions) {
				this.cleanEmptyConditionNodes(this.triggerData.conditions);
			}
		}, {deep:true});
	}

	public addCondition():void {
		if(this.triggerData.conditions) {
			this.triggerData.conditions.conditions.push({
					id:Utils.getUUID(),
					type:"condition",
					operator:"=",
					placeholder:"",
					value:"",
				})
		}else{
			this.triggerData.conditions = reactive({
				id:Utils.getUUID(),
				type:"group",
				conditions:[{
					id:Utils.getUUID(),
					type:"condition",
					operator:"=",
					placeholder:"",
					value:"",
				}],
				operator:"AND",
			});
		}
	}

	public cleanEmptyConditionNodes(group:TriggerConditionGroup):void {
		if(group.conditions.length == 1 && group.conditions[0].type == "group") {
			//Group contains only one item, bring them to parent
			let subgroup:TriggerConditionGroup = group.conditions[0];
			group.conditions = subgroup.conditions;
			group.operator = subgroup.operator;

		}else{
			for (let i = 0; i < group.conditions.length; i++) {
				const node = group.conditions[i];
				if(node.type == "group") {
					if(node.conditions.length === 0) {
						//Sub group is empty, delete it
						group.conditions.splice(i, 1);
						i--;
					}else
					if(node.conditions.length === 1) {
						//Sub group only has one item, bring it up
						group.conditions = group.conditions.concat(node.conditions);
						group.conditions.splice(i, 1);
						i--;
					}else{
						this.cleanEmptyConditionNodes(node);
					}
				}
			}
		}
	}

}
export default toNative(TriggerConditionList);
</script>

<style scoped lang="less">
.triggerconditionlist{
	display: flex;
	flex-direction: column;
	gap: .5em;
	align-items: center;

	.list {
		display: flex;
		flex-direction: column;
		gap: .25em;
		width: 100%;
	}

}
</style>