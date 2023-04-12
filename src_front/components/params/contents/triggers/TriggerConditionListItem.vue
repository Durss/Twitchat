<template>
	<div class="triggerconditionlistitem">
		<template v-for="c in condition" :key="c.id" >
			<div class="group" v-if="c.type == 'group'">
				<!-- <span class="operator">{{ parentCondition.operator }}</span> -->
				<Button class="operator" small :title="$t('triggers.condition.operators.'+c.operator)" @click="toggleOperator(c)" />
				<draggable class="draggable"
				v-model="c.conditions" 
				direction="vertical"
				group="condition"
				item-key="id"
				:animation="250">
					<template #item="{element, index}:{element:TriggerConditionGroup|TriggerCondition, index:number}">
						<div class="item">
							<TriggerConditionListItem :triggerData="triggerData" :parentCondition="c" :condition="[element]" />
						</div>
					</template>
				</draggable>
				<Button class="addBt" small :icon="$image('icons/add.svg')" @click="addItem(c)" v-tooltip="$t('triggers.condition.add_tt')" />
			</div>

			<div class="item" v-else-if="c.type == 'condition'">
				<img src="@/assets/icons/dragZone_purple.svg" alt="drag" class="dragIcon">
				<ParamItem class="placeholder" :paramData="getPlaceholderParam(c.id)" v-model="c.placeholder" :key="'ph_'+c.id" />
				<ParamItem class="operator" :paramData="getOperatorParam(c.id)" v-model="c.operator" :key="'op_'+c.id" />
				<ParamItem class="value" :paramData="getValueParam(c.id)" v-model="c.value" :key="'op_'+c.id" />
				<div class="ctas">
					<Button small :icon="$image('icons/group.svg')" @click="addItem(c)" v-tooltip="$t('triggers.condition.group_tt')" />
					<Button highlight small :icon="$image('icons/cross_white.svg')" @click="deleteItem(c)" />
				</div>
			</div>
		</template>
	</div>
</template>

<script lang="ts">
import { COUNTER_VALUE_PLACEHOLDER_PREFIX, TriggerConditionOperatorList, TriggerEventPlaceholders, type TriggerCondition, type TriggerConditionGroup, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import Button from '@/components/Button.vue';
import { reactive } from 'vue';
import Utils from '@/utils/Utils';
import draggable from 'vuedraggable';

@Component({
	name:"TriggerConditionListItem",
	components:{
		Button,
		draggable,
		ParamItem,
	},
	emits:["delete"],
})
export default class TriggerConditionListItem extends Vue {

	@Prop
	public triggerData!:TriggerData;

	@Prop
	public condition!:(TriggerConditionGroup|TriggerCondition)[];

	@Prop
	public parentCondition!:TriggerConditionGroup;

	public paramCache:{[key:string]:TwitchatDataTypes.ParameterData<string, string> } = {};

	public beforeMount():void {

	}

	public getPlaceholderParam(id:string):TwitchatDataTypes.ParameterData<string, string> {
		id = "ph_"+id;
		if(this.paramCache[id]) return this.paramCache[id];
		let placeholders = TriggerEventPlaceholders(this.triggerData.type).concat();
		this.paramCache[id] = reactive({
			type: "list",
			value: "",
			listValues: placeholders.map(v=> {
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
					label: this.$t("triggers.condition.operators."+v),
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
.triggerconditionlistitem{
	.group {
		position: relative;
		padding: .5em;
		padding-left: 1.25em;
		background-color: fade(@mainColor_normal, 10%);
		border-left: 1px solid @mainColor_normal;
		border-top-left-radius: 10px;
		border-bottom-left-radius: 10px;

		.draggable {
			display: flex;
			flex-direction: column;
			gap: .25em;
		}
		&>.addBt {
			margin: auto;
			display: block;
			display: none;
		}
		&:hover {
			&>.addBt {
				display: block;
			}
		}

		&>.operator {
			position: absolute;
			top: 50%;
			left: 0;
			z-index: 1;
			transform-origin: top left;
			transform: rotate(-90deg) translate(-50%, -50%);
			background-color: @mainColor_normal;
			color: @mainColor_light;
			font-weight: bold;
			padding: 1px 5px;
			font-size: .7em;
			border-radius: .5em;
			cursor: pointer;
			&:hover {
				background-color: @mainColor_normal_light;
			}
			:deep(.label) {
				letter-spacing: .5em;
				margin-right: -.5em;//Removes space after last letter
			}
		}
	}
	.item {
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
		.placeholder, .operator {
			flex-basis: 100px;
			flex-grow: 1;
		}
		.value {
			flex-grow: 1;
		}
		.ctas {
			display: flex;
			flex-direction: row;
			gap: 0;
		}
	}
}
</style>