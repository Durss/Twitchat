<template>
	<div class="triggerconditionlist">
		<div>{{ $t("triggers.condition.title") }}</div>

		<Button v-if="!triggerData.conditions || triggerData.conditions.conditions.length == 0" small :title="$t('triggers.condition.createBt')" :icon="$image('icons/add.svg')" @click="addCondition()" />

		<TriggerConditionListItem v-else class="list" :triggerData="triggerData" :parentCondition="triggerData.conditions" :condition="[triggerData.conditions]" />
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import type { TriggerCondition, TriggerConditionGroup, TriggerData } from '@/types/TriggerActionDataTypes';
import Utils from '@/utils/Utils';
import { reactive, watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import TriggerConditionListItem from './TriggerConditionListItem.vue';

@Component({
	components:{
		Button,
		TriggerConditionListItem,
	},
	emits:[],
})
export default class TriggerConditionList extends Vue {

	@Prop
	public triggerData!:TriggerData;

	public beforeMount():void {
		watch(()=> this.triggerData.conditions, ()=> {
			if(this.triggerData.conditions) {
				this.cleanEmptyConditionNodes([this.triggerData.conditions]);
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

	public cleanEmptyConditionNodes(nodes:(TriggerCondition|TriggerConditionGroup)[]):void {
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if(node.type == "group") {
				if(node.conditions.length === 0) {
					nodes.splice(i, 1);
					i--;
				}else{
					this.cleanEmptyConditionNodes(node.conditions);
				}
			}
		}
	}

}
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
	}

}
</style>