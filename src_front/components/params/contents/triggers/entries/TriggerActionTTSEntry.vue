<template>
	<div class="triggeractionttsentry triggerActionForm" v-if="!$store.tts.params.enabled">
		<div class="info warn">
			<Icon name="info" alt="info" theme="light" />
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.tts.header">
				<template #LINK>
					<a @click="$store.params.openParamsPage(contentTTS)">{{ $t("triggers.actions.tts.header_link") }}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div v-else class="triggeractionttsentry">
		<ParamItem :paramData="param_message" v-model="action.text" />
		<ParamItem :paramData="param_customVoice" v-model="param_customVoice.value" @change="onToggleCustomVoice()">
			<TTSVoiceParams class="parameter-child" v-model="action.voiceParams" />
		</ParamItem>
	</div>
</template>

<script lang="ts">
import TTSVoiceParams from '@/components/voice/TTSVoiceParams.vue';
import type { ITriggerPlaceholder, TriggerActionTTSData, TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';
import Icon from '@/components/Icon.vue';

@Component({
	components:{
		Icon,
		ParamItem,
		TTSVoiceParams,
	},
	emits:["update"]
})
class TriggerActionTTSEntry extends AbstractTriggerActionEntry {
	
	@Prop
	declare action:TriggerActionTTSData;
	
	@Prop
	declare triggerData:TriggerData;

	public param_message:TwitchatDataTypes.ParameterData<string> = { type:"string", longText:true, value:"", icon:"whispers", maxLength:500, labelKey:"triggers.actions.tts.param_message" };
	public param_customVoice:TwitchatDataTypes.ParameterData<boolean> = { type:"boolean", value:false, icon:"voice", labelKey:"triggers.actions.tts.param_customVoice" };
	
	public get contentTTS():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.TTS; }

	public beforeMount():void {
		this.param_customVoice.value = !!this.action.voiceParams;
	}

	/**
	 * Called when the available placeholder list is updated
	 */
	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.param_message.placeholderList = list;
		if(!this.action.text) this.action.text = "";
	}

	public onToggleCustomVoice():void {
		if(this.param_customVoice.value) {
			if(!this.action.voiceParams) {
				this.action.voiceParams = {
					voice:"",
					volume:1,
					rate:1,
					pitch:1,
					elevenlabs_lang:"",
					elevenlabs_model:"eleven_turbo_v2_5",
					elevenlabs_stability:.5,
					elevenlabs_similarity:.5,
					elevenlabs_style:0,
				};
			}
		}else{
			delete this.action.voiceParams;
		}
	}

}
export default toNative(TriggerActionTTSEntry);
</script>

<style scoped lang="less">
.triggeractionttsentry{
	gap: .5em;
	display: flex;
	flex-direction: column;
}
</style>