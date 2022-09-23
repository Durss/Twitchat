<template>
	<div class="triggeractionttsentry" v-if="!$store('tts').params.enabled">
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
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TriggerActionHelpers } from '@/utils/TriggerActionData';
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
export default class TriggerActionTTSEntry extends Vue {
	
	public action!:TwitchatDataTypes.TriggerActionChatData;
	public event!:TwitchatDataTypes.TriggerEventTypes;

	public message_conf:TwitchatDataTypes.ParameterData = { label:"Message to read with text to speech", type:"text", longText:true, value:"", icon:"whispers_purple.svg", maxLength:500 };
	
	public get contentTTS():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsContentType.TTS; }

	public beforeMount():void {
		this.message_conf.placeholderList = TriggerActionHelpers(this.event.value);
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