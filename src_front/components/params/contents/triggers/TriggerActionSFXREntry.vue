<template>
	<div class="triggeractionsfxrentry triggerActionForm">
		<div class="options">
			<div class="option" v-for="id in actions" :class="{selected: action.sfxr.presetId == id}" :key="id">
				<label :for="'action_'+id"><Icon name="dice" v-if="id !== 'custom'" />{{  $t('triggers.actions.sfxr.preset_'+id) }}</label>
				<input type="radio"
					v-model="action.sfxr.presetId"
					:name="'preset_'+id"
					:value="id"
					:id="'action_'+id"
					@click="playSample(id)">
			</div>
		</div>

		<div class="custom" v-if="action.sfxr.presetId == 'custom'">
			<ParamItem class="params" :paramData="param_custom" v-model="action.sfxr.rawConfig" :error="error" :errorMessage="$t('triggers.actions.sfxr.param_custom_error')">
				<TTButton class="testBt" icon="test" @click="testCustomSound">Test</TTButton>
			</ParamItem>
		</div>

		<ParamItem class="params" :paramData="param_volume" v-model="action.sfxr.volume" />
		<ParamItem class="params" :paramData="param_waitForEnd" v-model="action.sfxr.waitForEnd" />
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import { TTButton } from '@/components/TTButton.vue';
import { JSFXRSoundPreset } from '@/types/jsfxr';
import type { TriggerActionSFXRData, TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import SFXRUtils from '@/utils/SFXRUtils';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';
import AbstractTriggerActionEntry from './entries/AbstractTriggerActionEntry';

@Component({
	components:{
		Icon,
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
	public param_custom:TwitchatDataTypes.ParameterData<string> = { type: "string", labelKey: "triggers.actions.sfxr.param_custom", value: "", placeholder: "{...}", longText: true }
	public param_volume:TwitchatDataTypes.ParameterData<number> = { type: "slider", min:0, max:100, labelKey: "triggers.actions.sfxr.param_volume", value:25 }
	public param_waitForEnd:TwitchatDataTypes.ParameterData<boolean> = { type: "boolean", labelKey: "triggers.actions.sfxr.param_waitForComplete", value: true }

	private prevSound : AudioBufferSourceNode | null = null;

	public get actions():TriggerActionSFXRData['sfxr']["presetId"][] {
		return [...JSFXRSoundPreset, "custom"]
	}

	public beforeMount(): void {
		if (!this.action.sfxr) {
			this.action.sfxr = {
				presetId: "blipSelect",
				waitForEnd: true,
				volume: 100,
			};
		}
		this.param_custom.value = this.action.sfxr.rawConfig || "";
	}

	public async testCustomSound(): Promise<void> {
		if(this.prevSound) this.prevSound.stop()
		this.error = false;
		if (this.action.sfxr.rawConfig) {
			this.prevSound = (await SFXRUtils.playSFXRFromString(this.action.sfxr.rawConfig, this.param_volume.value)).audio;
		}
	}

	public async playSample(id: TriggerActionSFXRData['sfxr']["presetId"]):Promise<void> {
		if(this.prevSound) this.prevSound.stop()
		if (id === "custom") return;
		this.prevSound = (await SFXRUtils.playSFXRFromString(id, this.param_volume.value)).audio;
	}

}
export default toNative(TriggerActionSFXREntry);
</script>

<style scoped lang="less">
.triggeractionsfxrentry{
	.options {
		gap: 0.25rem;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		
		.option {
			display: flex;
			flex-direction: row;
			gap: 0.25rem;
			cursor: pointer;
			align-items: center;
			padding: .25em .5em;
			border-radius: var(--border-radius);
			background-color: var(--grayout-fader);

			.icon {
				width: 1em;
				height: 1em;
			}

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

	.custom {
		margin-top: .5rem;
		.testBt {
			margin: .25em auto 0 auto;
			display: flex;
		}
	}
}
</style>