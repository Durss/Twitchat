<template>
	<div class="triggerconditionlistgroupitem">
		<template v-for="c in condition " :key="c.id">
			<div class="group" v-if="c.type == 'group'" :class="{'card-item':c.conditions.length > 1}">
				<TTButton class="operator" small secondary noBounce v-if="c.conditions.length > 1" @click="toggleOperator(c)">{{
					$t('triggers.condition.operators.' + c.operator) }}</TTButton>

				<VueDraggable
				class="list"
				v-model="c.conditions"
				:animation="250"
				:forceFallback="false"
				:handle="'.dragIcon'"
				group="triggerCondition">
					<div class="item" v-for="element in c.conditions" :key="element.id">
						<TriggerConditionListGroupItem
							:placeholderList="placeholderList"
							:triggerData="triggerData"
							:parentCondition="c"
							:condition="[element]" />
					</div>
				</VueDraggable>

				<TTButton class="addBt"
				small
				icon="add"
				@click="addItem(c)"
				v-tooltip=" $t('triggers.condition.add_tt') ">
					{{ $t('triggers.condition.add_tt') }}
				</TTButton>
			</div>

			<TriggerConditionListItem class="item" v-else-if=" c.type == 'condition' "
				:triggerData="triggerData"
				:placeholderList="placeholderList"
				:parentCondition="parentCondition"
				:condition="c" />

		</template>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import type { ITriggerPlaceholder, TriggerCondition, TriggerConditionGroup, TriggerData } from '@/types/TriggerActionDataTypes';
import Utils from '@/utils/Utils';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import TriggerConditionListItem from './TriggerConditionListItem.vue';
import { VueDraggable } from 'vue-draggable-plus';

@Component({
	name: "TriggerConditionListGroupItem",
	components: {
		TTButton,
		ParamItem,
		VueDraggable,
		TriggerConditionListItem,
	},
	emits: ["delete"],
})
class TriggerConditionListGroupItem extends Vue {

	@Prop
	public triggerData!: TriggerData;

	@Prop
	public condition!: (TriggerConditionGroup | TriggerCondition)[];

	@Prop
	public parentCondition!: TriggerConditionGroup;

	@Prop
	public placeholderList!: ITriggerPlaceholder<string>[];

	public addItem(item: TriggerCondition | TriggerConditionGroup): void {
		if (item.type == "condition") {
			const index = this.parentCondition.conditions.findIndex(v => v.id === item.id);
			this.parentCondition.conditions.splice(index, 1, {
				id: Utils.getUUID(),
				type: "group",
				conditions: [item, {
					id: Utils.getUUID(),
					type: "condition",
					operator: "=",
					placeholder: "",
					value: "",
				}],
				operator: "AND",
			})
		} else if (item.type == "group") {
			item.conditions.push({
				id: Utils.getUUID(),
				type: "condition",
				operator: "=",
				placeholder: "",
				value: "",
			});
		}
	}

	public deleteItem(item: TriggerCondition | TriggerConditionGroup): void {
		const index = this.parentCondition.conditions.findIndex(v => v.id === item.id);
		if (index === -1) return;//Item not found
		this.parentCondition.conditions.splice(index, 1);
	}

	public toggleOperator(item: TriggerConditionGroup): void {
		item.operator = (item.operator == "AND") ? "OR" : "AND";
	}

}

export default toNative(TriggerConditionListGroupItem);
</script>

<style scoped lang="less">
.triggerconditionlistgroupitem {
	.list {
		gap: .25em;
		display: flex;
		flex-direction: column;
	}
	.group {
		overflow: visible;
		flex-grow: 1;
		position: relative;
		padding-left: .5em;
		border-left: 1px solid var(--color-text);
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
			margin-top: .25em;
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
				margin-right: -.3em; //Removes space after last letter
			}
		}

		.item {
			-webkit-touch-callout: none; /* iOS Safari */
			-webkit-user-select: none; /* Chrome/Safari/Opera */
			-khtml-user-select: none; /* Konqueror */
			-moz-user-select: none; /* Firefox */
			-ms-user-select: none; /* Internet Explorer/Edge */
			user-select: none; /* Non-prefixed version, currently
									not supported by any browser */
		}
	}
}
</style>
