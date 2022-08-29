<template>
	<div class="triggeractionttsentry" v-if="!$store.state.ttsParams.enabled">
		<div class="info">
			<img src="@/assets/icons/infos.svg" alt="info">
			<p class="label">This feature needs you to enable <a @click="$emit('setContent', contentTTS)">text to speech</a> feature</p>
		</div>
	</div>

	<div v-else class="triggeractionttsentry">
		<ParamItem class="item file" :paramData="message_conf" ref="textContent" v-model="action.text" />
	</div>
</template>

<script lang="ts">
import { ParamsContentType, type ParameterData, type ParamsContentStringType, type TriggerActionChatData } from '@/types/TwitchatDataTypes';
import { TriggerActionHelpers } from '@/utils/TriggerActionData';
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
export default class TriggerActionTTSEntry extends Vue {
	
	public action!:TriggerActionChatData;
	public event!:string;

	public message_conf:ParameterData = { label:"Message to read with text to speech", type:"text", longText:true, value:"", icon:"whispers_purple.svg", maxLength:500 };
	
	public get contentTTS():ParamsContentStringType { return ParamsContentType.TTS; }

	public beforeMount():void {
		this.message_conf.placeholderList = TriggerActionHelpers(this.event);
	}

}
</script>

<style scoped lang="less">
.triggeractionttsentry{
	.info {
		overflow: hidden;
		padding: .5em;
		padding-left: calc(1em + 10px);
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