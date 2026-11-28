<template>
	<div class="triggeractiondelayentry triggerActionLight">
		<Icon name="dragZone" class="orderBt" data-noselect v-tooltip="$t('triggers.reorder_tt')" />

		<ToggleButton v-model="action.enabled" small />

		<Icon name="timer" class="icon" theme="light" @click="action.enabled = !action.enabled" />

		<ParamItem
			class="field"
			noBackground
			placeholdersAsPopout
			:paramData="param_delay"
			v-model="action.delay"
		/>

		<div class="actions">
			<TTButton
				v-if="!action.conditionList"
				transparent
				icon="merge"
				light
				@click="$emit('addCondition')"
				v-tooltip="$t('triggers.condition.add_tt')"
			/>
			<TTButton alert icon="trash" @click="$emit('delete')" />
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from "@/components/TTButton.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import type {
	ITriggerPlaceholder,
	TriggerActionTypes,
	TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { Component, Prop, toNative } from "vue-facing-decorator";
import AbstractTriggerActionEntry from "./AbstractTriggerActionEntry";

@Component({
	components: {
		TTButton,
		ParamItem,
		ToggleButton,
	},
	emits: ["delete", "addCondition"],
})
class TriggerActionDelayEntry extends AbstractTriggerActionEntry {
	@Prop
	declare action: TriggerActionTypes;

	@Prop
	declare triggerData: TriggerData;

	public param_delay: TwitchatDataTypes.ParameterData<number | string> = {
		type: "duration",
		value: 0,
		allowMs: true,
	};

	public beforeMount(): void {
		super.beforeMount();
		if (!this.action.delay) this.action.delay = 0;
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list: ITriggerPlaceholder<unknown>[]): void {
		this.param_delay.placeholderList = list;
	}
}
export default toNative(TriggerActionDelayEntry);
</script>

<style scoped lang="less">
.triggeractiondelayentry {
	.field {
		//Make the duration field blend within the action's background
		:deep(.durationform) {
			color: var(--color-light);
			background-color: transparent;
			padding-top: 0;
			padding-bottom: 0;
			padding-left: 0;
		}
		:deep(.content) {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			align-items: stretch;
			&::before {
				display: none;
			}
			.placeholderselector {
				border-radius: 0;
				position: relative;
				transform: none;
				top: auto;
				right: auto;
			}
			.durationform {
				padding-right: 0;
			}
			.duration > .button {
				padding-right: 0.7em;
			}
		}
	}
}
</style>
