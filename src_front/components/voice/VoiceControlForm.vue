<template>
	<div class="voicecontrolform">
		<section>
			<label v-if="voiceApiAvailable" for="langSelector" v-t="'voice.select_language'"></label>
			<LangSelector v-if="voiceApiAvailable" id="langSelector" v-model:lang="lang" class="langSelector" />
			<Button v-if="voiceApiAvailable && !started && lang" :title="$t('voice.startBt')" class="startBt" @click="startBot()" :icon="$image('icons/voice.svg')" />
			<Button v-if="voiceApiAvailable && started" :title="$t('voice.stopBt')" class="stopBt" @click="stopBot()" highlight :icon="$image('icons/stop.svg')" />
		</section>
		
		<section class="block" v-if="!voiceApiAvailable || started || tempText || finalText">
			<Splitter v-t="'voice.stt_preview'"></Splitter>
			<div class="temp" v-if="tempText && !finalText">{{tempText}}</div>
			<div class="final" v-if="finalText">{{finalText}}</div>
			<div class="empty" v-if="!tempText && !finalText">_</div>
		</section>

		<section v-if="sttOnly === false">
			<Splitter v-t="'voice.stt_actions'"></Splitter>
			<VoiceTriggerList class="block" />
		</section>
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import VoiceController from '@/utils/voice/VoiceController';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import LangSelector from '../LangSelector.vue';
import Splitter from '../Splitter.vue';
import ToggleBlock from '../ToggleBlock.vue';
import VoiceTriggerList from './VoiceTriggerList.vue';

@Options({
	props:{
		sttOnly: {
			type: Boolean,
			default: false,
		},
		voiceApiAvailable: {
			type: Boolean,
			default: true,
		},
	},
	components:{
		Button,
		Splitter,
		ToggleBlock,
		LangSelector,
		VoiceTriggerList,
	}
})
export default class VoiceControlForm extends Vue {

	public sttOnly!:boolean;
	public voiceApiAvailable!:boolean;

	public lang:string = "";

	public get started():boolean { return VoiceController.instance.started; }
	public get tempText():string { return this.sttOnly === false? this.$store("voice").voiceText.tempText : VoiceController.instance.tempText; }
	public get finalText():string { return this.sttOnly === false? this.$store("voice").voiceText.finalText : VoiceController.instance.finalText; }

	public beforeMount():void {
		let userLang = navigator.language;
		//@ts-ignore
		if(!userLang) userLang = navigator.userLanguage; 
		if(userLang.length == 2) userLang = userLang + "-" + userLang.toUpperCase();
		if(DataStore.get("voiceLang")) userLang = DataStore.get("voiceLang");
		this.lang = userLang;

		watch(()=>this.lang, ()=> this.updateLang());
		this.updateLang()
	}
	
	public startBot():void {
		VoiceController.instance.start(this.sttOnly);
	}
	
	public stopBot():void {
		VoiceController.instance.stop();
	}

	private updateLang():void {
		VoiceController.instance.lang = this.lang;
		this.$store("voice").setVoiceLang(this.lang);
	}

}
</script>

<style scoped lang="less">
.voicecontrolform{

	.langSelector {
		width:100%;
		margin: .5em 0;
	}
	
	.startBt, .stopBt{
		display: block;
		margin: auto;
	}

	.block {
		margin-top: .5em;

		.temp {
			font-style: italic;
		}
		.empty {
			text-align: center;
		}
	}

	section {
		border-radius: .5em;
		background-color: fade(@mainColor_normal_extralight, 30%);
		padding: .5em;
		&:not(:first-of-type) {
			margin-top: 1em;
		}
	}

}
</style>