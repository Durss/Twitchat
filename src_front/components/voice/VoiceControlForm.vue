<template>
	<div class="voicecontrolform parameterContent">
		<section class="card-item block" v-if="voiceApiAvailable">
			<label for="langSelector">{{ $t("voice.select_language") }}</label>
			<LangSelector id="langSelector" v-model:lang="lang" class="langSelector" />
			<Button v-if="!started && lang" class="startBt" @click="startBot()" icon="voice">{{$t("voice.startBt")}}</Button>
			<Button v-if="started" class="stopBt" @click="stopBot()" highlight icon="stop">{{$t("voice.stopBt")}}</Button>
		</section>
		
		<template v-if="!voiceApiAvailable || started || tempText || finalText">
			<Splitter>{{ $t("voice.stt_preview") }}</Splitter>
			
			<section class="card-item block">
				<div class="temp" v-if="tempText && !finalText">{{tempText}}</div>
				<div class="final" v-if="finalText">{{finalText}}</div>
				<div class="empty" v-if="!tempText && !finalText">...</div>
			</section>
		</template>

		<Splitter v-if="sttOnly === false">{{ $t("voice.stt_actions") }}</Splitter>

		<VoiceTriggerList v-if="sttOnly === false" />
	</div>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import VoiceController from '@/utils/voice/VoiceController';
import { watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import LangSelector from '../LangSelector.vue';
import Splitter from '../Splitter.vue';
import ToggleBlock from '../ToggleBlock.vue';
import VoiceTriggerList from './VoiceTriggerList.vue';

@Component({
	components:{
		Button: TTButton,
		Splitter,
		ToggleBlock,
		LangSelector,
		VoiceTriggerList,
	}
})
class VoiceControlForm extends Vue {

	@Prop({type: Boolean, default: false})
	public sttOnly!:boolean;
	
	@Prop({type: Boolean, default: true})
	public voiceApiAvailable!:boolean;

	public lang:string = "";

	public get started():boolean { return VoiceController.instance.started.value; }
	public get tempText():string { return this.sttOnly === false? this.$store.voice.voiceText.tempText : VoiceController.instance.tempText.value; }
	public get finalText():string { return this.sttOnly === false? this.$store.voice.voiceText.finalText : VoiceController.instance.finalText.value; }

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
		VoiceController.instance.lang.value = this.lang;
		this.$store.voice.setVoiceLang(this.lang);
	}

}
export default toNative(VoiceControlForm);
</script>

<style scoped lang="less">
.voicecontrolform{

	.langSelector {
		width:100%;
	}
	
	.startBt, .stopBt{
		margin: auto;
	}

	.block {
		width: 100%;
		.temp {
			font-style: italic;
		}
		.empty {
			text-align: center;
		}
	}

}
</style>