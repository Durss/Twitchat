<template>
	<div class="triggeractionvoicemodentry" v-if="!vmConnected">
		<div class="item info warn">
			<img src="@/assets/icons/infos.svg" alt="info">
			<i18n-t scope="global" class="label" tag="p" keypath="triggers.actions.voicemod.header">
				<template #LINK>
					<a @click="$store('params').openParamsPage(contentVM)">{{ $t("triggers.actions.voicemod.header_link") }}</a>
				</template>
			</i18n-t>
		</div>
	</div>

	<div class="triggeractionvoicemodentry" v-else>
		<ParamItem :paramData="param_voiceList" v-model="action.voiceID" />
	</div>
</template>

<script lang="ts">
import type { TriggerActionVoicemodData, TriggerEventTypes } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../../../ParamItem.vue';

@Component({
	components:{
		ParamItem,
	},
	emits:["update"]
})
export default class TriggerActionVoicemodEntry extends Vue {
	
	@Prop
	public action!:TriggerActionVoicemodData;

	public param_voiceList:TwitchatDataTypes.ParameterData<string, string> = {type:"list", label:"", listValues:[], value:"", icon:"voice_purple.svg"}
	
	public get vmConnected():boolean { return VoicemodWebSocket.instance.connected; }
	public get contentVM():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.VOICEMOD; } 

	public beforeMount():void {
		this.param_voiceList.labelKey = "triggers.actions.voicemod.param_voice";
		if(this.vmConnected) {
			this.param_voiceList.listValues = VoicemodWebSocket.instance.voices.map(v=>{
				return {
					label:v.friendlyName,
					value:v.voiceID,
				}
			});
		}
	}

}
</script>

<style scoped lang="less">
.triggeractionvoicemodentry{
	.triggerActionForm();
}
</style>