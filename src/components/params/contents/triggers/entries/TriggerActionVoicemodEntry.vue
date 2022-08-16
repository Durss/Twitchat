<template>
	<div class="triggeractionvoicemodentry">
		<ParamItem :paramData="param_voiceList" v-model="action.voiceID" />
	</div>
</template>

<script lang="ts">
import type { ParameterData, TriggerActionVoicemodData } from '@/types/TwitchatDataTypes';
import VoicemodWebSocket from '@/utils/VoicemodWebSocket';
import { Options, Vue } from 'vue-class-component';
import ParamItem from '../../../ParamItem.vue';

@Options({
	props:{
		action:Object,
		event:String,
	},
	components:{
		ParamItem,
	},
	emits:["update"]
})
export default class TriggerActionVoicemodEntry extends Vue {
	
	public action!:TriggerActionVoicemodData;
	public event!:string;

	public param_voiceList:ParameterData = {type:"list", label:"Voice", listValues:[], value:""}

	public beforeMount():void {
		// this.message_conf.placeholderList = TriggerActionHelpers(this.event);
		this.param_voiceList.listValues = VoicemodWebSocket.instance.voices.map(v=>{
			return {
				label:v.friendlyName,
				value:v.voiceID,
			}
		});
	}

}
</script>

<style scoped lang="less">
.triggeractionvoicemodentry{
	
}
</style>