<template>
	<div class="triggerconditionlistgroupitem card-item">
		<template v-for="c in condition" :key="c.id" >
			<div class="group" v-if="c.type == 'group'">
				<Button class="operator" small noBounce
					v-if="c.conditions.length > 1"
					@click="toggleOperator(c)">{{ $t('triggers.condition.operators.'+c.operator) }}</Button>

				<draggable class="draggable"
				v-model="c.conditions" 
				direction="vertical"
				group="condition"
				item-key="id"
				:animation="250">
				
					<template #item="{element, index}:{element:TriggerConditionGroup|TriggerCondition, index:number}">
						<div class="item">
							<TriggerConditionListGroupItem :triggerData="triggerData" :parentCondition="c" :condition="[element]" />
						</div>
					</template>

				</draggable>

				<Button class="addBt"
					icon="add"
					@click="addItem(c)"
					v-tooltip="$t('triggers.condition.add_tt')" />
			</div>

			<TriggerConditionListItem class="item" v-else-if="c.type == 'condition'"
				:triggerData="triggerData"
				:parentCondition="parentCondition"
				:condition="c"
			 />
		</template>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import Utils from '@/utils/Utils';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import ParamItem from '../../ParamItem.vue';
import TriggerConditionListItem from './TriggerConditionListItem.vue';
import type { TriggerCondition, TriggerConditionGroup, TriggerData } from '@/types/TriggerActionDataTypes';

@Component({
	name:"TriggerConditionListGroupItem",
	components:{
		Button,
		draggable,
		ParamItem,
		TriggerConditionListItem,
	},
	emits:["delete"],
})
export default class TriggerConditionListGroupItem extends Vue {

	@Prop
	public triggerData!:TriggerData;

	@Prop
	public condition!:(TriggerConditionGroup|TriggerCondition)[];

	@Prop
	public parentCondition!:TriggerConditionGroup;

	public beforeMount():void {

	}

	public addItem(item:TriggerCondition|TriggerConditionGroup):void {
		if(item.type == "condition") {
			const index = this.parentCondition.conditions.findIndex(v=>v.id === item.id);
			this.parentCondition.conditions.splice(index, 1, {
				id:Utils.getUUID(),
				type:"group",
				conditions:[item, {
					id:Utils.getUUID(),
					type:"condition",
					operator:"=",
					placeholder:"",
					value:"",
				}],
				operator:"AND",
			})
		}else if(item.type== "group"){
			item.conditions.push({
				id:Utils.getUUID(),
				type:"condition",
				operator:"=",
				placeholder:"",
				value:"",
			});
		}
	}

	public deleteItem(item:TriggerCondition|TriggerConditionGroup):void {
		const index = this.parentCondition.conditions.findIndex(v=>v.id === item.id);
		if(index === -1) return;//Item not found
		this.parentCondition.conditions.splice(index, 1);
	}

	public toggleOperator(item:TriggerConditionGroup):void {
		item.operator = (item.operator == "AND")? "OR" : "AND";
	}

}

</script>

<style scoped lang="less">
.triggerconditionlistgroupitem{
	.group {
		flex-grow: 1;
		position: relative;
		padding-left: 1.25em;
		border-left: 1px solid var(--color-light);
		border-top-left-radius: 10px;
		border-bottom-left-radius: 10px;
		min-height: 2em;

		.draggable {
			display: flex;
			flex-direction: column;
			gap: .25em;
		}
		&>.addBt {
			margin: auto;
			display: none;
		}
		&:hover {
			&>.addBt {
				display: flex;
			}
		}

		&>.operator {
			position: absolute;
			top: 50%;
			left: 0;
			z-index: 1;
			transform-origin: top left;
			transform: rotate(-90deg) translate(-50%, -50%);
			font-weight: bold;
			padding: 1px 5px;
			font-size: .7em;
			:deep(.label) {
				letter-spacing: .3em;
				margin-right: -.3em;//Removes space after last letter
			}
		}
	}
}
</style>