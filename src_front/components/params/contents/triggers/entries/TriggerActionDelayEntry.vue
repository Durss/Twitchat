<template>
	<div class="triggeractiondelayentry triggerActionLight">
		<Icon name="dragZone"
			class="orderBt"
			data-noselect
			v-tooltip="$t('triggers.reorder_tt')" />

		<Icon name="timer" class="icon" theme="light" />

		<DurationForm style="color:#fff" v-if="isNumericValue" class="field" v-model="action.delay" allowMs />

		<TTButton v-else icon="trash" small secondary @click="action.delay = 0">{{ action.delay }}</TTButton>

		<div class="actions">
			<PlaceholderSelector class="placeholders" v-if="placeholderList?.length > 0"
				:placeholders="placeholderList"
				:secondary="true"
				:popoutMode="true"
				@insert="insertTag"
			/>

			<TTButton transparent icon="merge" light @click="$emit('addCondition')" v-tooltip="$t('triggers.condition.add_tt')" />
			<TTButton alert icon="trash" @click="$emit('delete')" />
		</div>
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
	emits:["delete", "addCondition"],
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
}
</style>
