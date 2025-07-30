<template>
	<div class="triggeractionsfxrentry triggerActionForm">
		<div class="options">
			<div class="option" v-for="id in actions" :class="{selected: action.sfxr.presetId == id}" :key="id">
				<label :for="'action_'+id">{{  $t('triggers.actions.sfxr.preset_'+id) }}</label>
				<input type="radio"
					v-model="action.sfxr.presetId"
					:name="'preset_'+id"
					:value="id"
					:id="'action_'+id">
			</div>
		</div>

		<template v-if="action.sfxr.presetId == 'custom'">
			<ParamItem :paramData="param_custom" v-model="action.sfxr.rawConfig" :error="error" :errorMessage="$t('triggers.actions.sfxr.param_custom_error')" />
			<TTButton icon="test" @click="testCustomSound">Test</TTButton>
		</template>
		
	</div>
</template>

<script lang="ts">
import type { TriggerActionSFXRData, TriggerData } from '@/types/TriggerActionDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './entries/AbstractTriggerActionEntry';
import { JSFXRSoundPreset } from '@/types/jsfxr';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ParamItem from '../../ParamItem.vue';
import { TTButton } from '@/components/TTButton.vue';
import Utils from '@/utils/Utils';

@Component({
	components:{
		TTButton,
		ParamItem,
	},
	emits:[],
})
class TriggerActionSFXREntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionSFXRData;

	@Prop
	declare triggerData:TriggerData;

	public error:boolean = false;
	public param_custom:TwitchatDataTypes.ParameterData<string> = {
		type: "string",
		labelKey: "triggers.actions.sfxr.param_custom",
		value: "",
		placeholder: "{...}",
		longText: true,
	}

	public get actions():TriggerActionSFXRData['sfxr']["presetId"][] {
		return [...JSFXRSoundPreset, "custom"]
	}

	public beforeMount(): void {
		if (!this.action.sfxr) {
			this.action.sfxr = {
				presetId: "blipSelect",
			};
		}
		this.param_custom.value = this.action.sfxr.rawConfig || "";
	}

	public async testCustomSound(): Promise<void> {
		this.error = false;
		if (this.action.sfxr.rawConfig) {
			this.error = !await Utils.playSFXRFromString(this.action.sfxr.rawConfig);
		}
	}

}
export default toNative(TriggerActionSFXREntry);
</script>

<style scoped lang="less">
.triggeractionsfxrentry{
	.options {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		
		.option {
			display: flex;
			flex-direction: row;
			gap: 0.25rem;
			cursor: pointer;
			padding: .25em .5em;
			border-radius: var(--border-radius);
			label {
				cursor: pointer;
			}

			&.selected {
				background-color: var(--color-light);
				color: var(--color-secondary);
				font-weight: bold;
			}
		}
	}
}
</style>