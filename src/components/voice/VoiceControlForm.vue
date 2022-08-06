<template>
	<div class="voicecontrolform">
		<label for="langSelector">Select your language:</label>
		<LangSelector id="langSelector" v-model:lang="lang" class="langSelector" />
		
		<Button v-if="!started && lang" title="Start voice bot" class="startBt" @click="startBot()" :icon="$image('icons/voice.svg')" />
		<Button v-if="started" title="Stop voice bot" class="stopBt" @click="stopBot()" highlight :icon="$image('icons/stop.svg')" />
		
		<ToggleBlock title="Speak to see the result" :enabled="false" class="block" v-if="started">
			<div class="temp" v-if="tempText && !finalText">{{tempText}}</div>
			<div class="final" v-if="finalText">{{finalText}}</div>
		</ToggleBlock>

		<VoiceTriggerList class="block" />
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/utils/StoreProxy';
import VoiceController from '@/utils/VoiceController';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import LangSelector from '../LangSelector.vue';
import ToggleBlock from '../ToggleBlock.vue';
import VoiceTriggerList from './VoiceTriggerList.vue';

@Options({
	props:{
	},
	components:{
		Button,
		ToggleBlock,
		LangSelector,
		VoiceTriggerList,
	}
})
export default class VoiceControlForm extends Vue {

	public lang:string = "";

	public get started():boolean { return VoiceController.instance.started; }
	public get tempText():string { return StoreProxy.store.state.voiceText.tempText; }
	public get finalText():string { return StoreProxy.store.state.voiceText.finalText; }

	public beforeMount():void {
		let userLang = navigator.language;
		//@ts-ignore
		if(!userLang) userLang = navigator.userLanguage; 
		if(userLang.length == 2) userLang = userLang + "-" + userLang.toUpperCase();
		if(StoreProxy.store.state.voiceLang) userLang = StoreProxy.store.state.voiceLang;
		this.lang = userLang;

		watch(()=>this.lang, ()=> this.updateLang());
		this.updateLang()
	}
	
	public startBot():void {
		VoiceController.instance.start();
	}
	
	public stopBot():void {
		VoiceController.instance.stop();
	}

	private updateLang():void {
		VoiceController.instance.lang = this.lang;
		StoreProxy.store.dispatch("setVoiceLang", this.lang);
	}

}
</script>

<style scoped lang="less">
.voicecontrolform{
	width: 100%;
	height: 100%;

	.langSelector {
		width:100%;
		margin-top: .5em;
		margin-bottom: 1em;
	}
	
	.startBt, .stopBt{
		display: block;
		margin: auto;
	}

	.block {
		margin-top: 1em;

		.temp {
			font-style: italic;
		}
	}

}
</style>