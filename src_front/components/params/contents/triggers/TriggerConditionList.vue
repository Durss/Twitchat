<template>
	<TTButton icon="merge" v-if="actionContext !== false && !expanded" class="collapsed" @click="expand"></TTButton>

	<div v-else class="triggerconditionlist">
		<div v-if="actionContext === false">{{ $t("triggers.condition.title") }}</div>

		<TTButton v-if="!conditions || conditions.conditions.length == 0"
			icon="add"
			small
			@click="addCondition()">{{
			$t('triggers.condition.createBt') }}</TTButton>

		<TriggerConditionListGroupItem v-else class="list"
			:triggerData="triggerData"
			:parentCondition="conditions"
			:condition="[conditions]"
			:placeholderList="placeholderList" />
	</div>
</template>
<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import type { ITriggerPlaceholder, TriggerActionData, TriggerConditionGroup, TriggerData } from '@/types/TriggerActionDataTypes';
import Utils from '@/utils/Utils';
import { reactive, watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import TriggerConditionListGroupItem from './TriggerConditionListGroupItem.vue';
import TriggerUtils from '@/utils/TriggerUtils';

@Component({
	components:{
		TTButton,
		TriggerConditionListGroupItem,
	},
	emits:["empty"],
})
class TriggerConditionList extends Vue {
	@Prop({ required: true })
	public triggerData!: TriggerData;

	@Prop({required: false})
	declare triggerAction: TriggerActionData;

	@Prop({ required: true })
	public conditions!:TriggerConditionGroup;

	@Prop({default:false, type:Boolean})
	public actionContext!:boolean;

	public placeholderList!: ITriggerPlaceholder<unknown>[];
	public expanded:boolean = false;

	public beforeMount():void {
		watch(()=> this.conditions, ()=> {
			if(this.conditions) {
				this.cleanEmptyConditionNodes(this.conditions);
			}
			if(this.conditions.conditions.length == 0) {
				this.$emit("empty");
			}
		}, {deep:true});

		if(this.actionContext !== false && this.conditions.conditions.length == 0) {
			this.addCondition();
			this.expand();
		}
	}

	public beforeUnmount(): void {
		if (this, this.actionContext !== false) {
			document.removeEventListener('mousedown', this.handleClickOutside);
		}
	}

	public addCondition():void {
		if(this.conditions) {
			this.conditions.conditions.push({
					id:Utils.getUUID(),
					type:"condition",
					operator:"=",
					placeholder:"",
					value:"",
				})
		}else if(this.actionContext === false){
			//This will automatically mutate the "condition" prop
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

	public expand():void {
		this.updatePlaceholderList();
		this.expanded = true;
		document.addEventListener('mousedown', this.handleClickOutside);
	}

	public handleClickOutside(event: MouseEvent): void {
		const target = event.target as HTMLElement;
		if (!this.$el.contains(target)) {
			this.expanded = false;
		}
	}

	/**
	 * Get all placeholders available for the current trigger action
	 * Loads up all trigger related placeholders, chat command params and looks
	 * for any Random Value trigger action declaring a placeholder BEFORE the
	 * current action.
	 */
	private updatePlaceholderList(): void {
		this.placeholderList = TriggerUtils.getActionPlaceholderList(this.triggerAction, this.triggerData);
	}

}
export default toNative(TriggerConditionList);
</script>

<style scoped lang="less">
.triggerconditionlist{
	display: flex;
	flex-direction: column;
	gap: .5em;
	align-items:center;

	.list {
		display: flex;
		flex-direction: column;
		gap: .25em;
		width: 100%;
	}
}

.collapsed {
	margin: auto;
	padding: 0;
	background-color: transparent;
	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;
	&:after {
		// content: "";
		display: block;
		width: 2px;
		background-color: var(--color-primary);
		height: 10px;
		margin: auto;
	}
}
</style>
