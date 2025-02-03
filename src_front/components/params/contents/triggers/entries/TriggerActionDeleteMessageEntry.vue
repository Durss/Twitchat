<template>
	<div class="triggeractiondeletemessageentry">
		<Icon name="dragZone"
			class="orderBt"
			data-noselect
			v-tooltip="$t('triggers.reorder_tt')" />


		<span>{{ $t("triggers.actions.delete_message.info") }}</span>

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
class TriggerActionDeleteMessageEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionTypes;

	@Prop
	declare triggerData:TriggerData;

}
export default toNative(TriggerActionDeleteMessageEntry);
</script>

<style scoped lang="less">
.triggeractiondeletemessageentry{
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

	.actions {
		display: flex;
		flex-direction: row;
		.button {
			align-self: stretch;
			border-radius: 0;
		}
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
