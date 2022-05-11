<template>
	<div class="voicecontrolform">
		<label for="langSelector">Set your language:</label>
		<LangSelector id="langSelector" v-model:lang="lang" class="langSelector" />
		
		<Button v-if="!started" title="Start voice bot" class="startBt" @click="startBot()" />
		<Button v-if="started" title="Stop voice bot" class="startBt" @click="stopBot()" />
		
		<ToggleBlock title="Text flow" :enabled="false" class="block" v-if="started">
			<div class="temp">{{tempText}}</div>
		</ToggleBlock>
		
		<ToggleBlock title="Final text" :enabled="false" class="block" v-if="started">
			<div class="final">{{finalText}}</div>
		</ToggleBlock>

		<VoiceTriggerList class="triggerList" />
	</div>
</template>

<script lang="ts">
import store from '@/store';
import VoiceController from '@/utils/VoiceController';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import LangSelector from '../LangSelector.vue';
import ToggleBlock from '../ToggleBlock.vue';
import VoiceTriggerList from './VoiceTriggerList.vue';

@Options({
	props:{},
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
	public get tempText():string { return VoiceController.instance.tempText; }
	public get finalText():string { return VoiceController.instance.finalText; }

	public beforeMount():void {
		let userLang = navigator.language;
		//@ts-ignore
		if(!userLang) userLang = navigator.userLanguage; 
		if(userLang.length == 2) userLang = userLang + "-" + userLang.toUpperCase();
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
		store.dispatch("setVoiceLang", this.lang);
	}

}
</script>

<style scoped lang="less">
.voicecontrolform{
	width: 100%;
	height: 100%;

	.langSelector {
		width:100%;
		margin-bottom: 1em;
	}
	
	.startBt{
		display: block;
		margin: auto;
	}

	.triggerList {
		margin-top: 1em;
	}
}
</style>