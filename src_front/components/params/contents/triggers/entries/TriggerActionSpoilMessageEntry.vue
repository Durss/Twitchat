<template>
	<div class="triggeractionspoilmessageentry triggerActionLight">
		<Icon name="dragZone"
			class="orderBt"
			data-noselect
			v-tooltip="$t('triggers.reorder_tt')" />

		<Icon name="spoiler" />

		<span>{{ $t("triggers.actions.spoil_message.info") }}</span>

		<div class="actions">
			<TTButton transparent icon="merge" @click="$emit('addCondition')" v-tooltip="$t('triggers.condition.add_tt')" />
			<TTButton class="deleteBt" alert icon="trash" @click="$emit('delete')" />
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
class TriggerActionSpoilMessageEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionTypes;

	@Prop
	declare triggerData:TriggerData;

}
export default toNative(TriggerActionSpoilMessageEntry);
</script>

<style scoped lang="less">
.triggeractionspoilmessageentry{
}
</style>
