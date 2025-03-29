<template>
	<div class="triggeractiondelayentry">
		<Icon name="dragZone"
			class="orderBt"
			v-tooltip="$t('triggers.reorder_tt')" />

		<img src="@/assets/icons/timer.svg" class="icon">

		<DurationForm v-if="isNumericValue" class="field" v-model="action.delay" allowMs />

		<TTButton v-else icon="trash" small secondary @click="action.delay = 0">{{ action.delay }}</TTButton>
		
		<PlaceholderSelector class="placeholders" v-if="placeholderList?.length > 0"
			:placeholders="placeholderList"
			:secondary="true"
			:popoutMode="true"
			@insert="insertTag"
		/>

		<TTButton class="deleteBt" alert icon="trash" @click="$emit('delete')" />
	</div>
</template>

<script lang="ts">
import DurationForm from '@/components/DurationForm.vue';
import TTButton from '@/components/TTButton.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import PlaceholderSelector from '@/components/params/PlaceholderSelector.vue';
import type { TriggerActionTypes, TriggerData } from '@/types/TriggerActionDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		TTButton,
		ParamItem,
		DurationForm,
		PlaceholderSelector,
	},
	emits:["delete"],
})
class TriggerActionDelayEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionTypes;
	
	@Prop
	declare triggerData:TriggerData;

	public get isNumericValue():boolean {
		return typeof(this.action.delay) != 'string';
	}

	public beforeMount():void {
		super.beforeMount();
		if(!this.action.delay) this.action.delay = 0;
	}

	/**
	 * Called when inserting a placeholder's tag
	 */
	public insertTag(tag:string):void {
		this.action.delay = tag;
	}
	
}
export default toNative(TriggerActionDelayEntry);
</script>

<style scoped lang="less">
.triggeractiondelayentry{
	margin: auto;
	width: fit-content;
	border-radius: .5em;
	background-color: var(--color-primary);
	display: flex;
	flex-direction: row;
	align-items: center;
	padding-left: .5em;
	color: var(--color-light);
	overflow: hidden;
	gap: .5em;
	line-height: 1.5em;
	box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
	position: relative;

	.icon {
		height: 1em;
	}

	.deleteBt {
		align-self: stretch;
		border-radius: 0;
		flex-shrink: 0;
	}

	.field {
		background: transparent;
		padding: 0;
	}

	.orderBt {
		cursor: grab;
		height: .8em;
		vertical-align: middle;
		line-height: 1em;
		user-select: none;
		&:active {
			cursor: grabbing;
		}
	}
	.placeholders {
		align-self: stretch;
		border-radius: 0;
		flex-shrink: 0;
		margin-right: -.5em;
	}
}
</style>