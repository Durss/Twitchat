<template>
	<div class="triggeractionvoicemodentry" v-if="!vmConnected">
		<div class="info">
			<img src="@/assets/icons/infos.svg" alt="info">
			<p class="label">This feature needs you to <a @click="$emit('setContent', contentVM)">connect with Voicemod</a></p>
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
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../../ParamItem.vue';

@Options({
	props:{
		action:Object,
		event:Object,
	},
	components:{
		ParamItem,
	},
	emits:["update"]
})
export default class TriggerActionVoicemodEntry extends Vue {
	
	public action!:TriggerActionVoicemodData;
	public event!:TriggerEventTypes;

	public param_voiceList:TwitchatDataTypes.ParameterData = {type:"list", label:"Voice", listValues:[], value:""}
	
	public get vmConnected():boolean { return VoicemodWebSocket.instance.connected; }
	public get contentVM():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsContentType.VOICEMOD; } 

	public beforeMount():void {
		// this.message_conf.placeholderList = TriggerActionHelpers(this.event);
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
	.info {
		overflow: hidden;
		padding: .5em;
		background-color: @mainColor_light;
		border-radius: .5em;
		margin-bottom: .5em;
		img {
			height: 1em;
			margin-right: .5em;
			vertical-align: middle;
		}
		.label {
			display: inline;
			color: @mainColor_warn;
		}
	}
}
</style>