<template>
	<div class="voicecontrolform">
		<LangSelector v-model:lang="lang" />
		<Button v-if="!started" title="Start voice bot" />
		<ToggleBlock title="Text flow" :enabled="false" class="block" v-if="started">
			<div class="temp">{{tempText}}</div>
		</ToggleBlock>
		<ToggleBlock title="Final text" :enabled="false" class="block" v-if="started">
			<div class="final">{{finalText}}</div>
		</ToggleBlock>
	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import SpeechRecognition from '@/ISpeechRecognition';
import ToggleBlock from '../ToggleBlock.vue';
import LangSelector from '../LangSelector.vue';
import Button from '../Button.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
		LangSelector,
	}
})
export default class VoiceControlForm extends Vue {

	public lang:string = "";
	public tempText:string = "";
	public finalText:string = "";
	public started:boolean = false;

	private timeoutNoAnswer:number = -1;
	private recognition!:SpeechRecognition;
	private ignoreResult:boolean = false;

	public beforeMount():void {
		let userLang = navigator.language;
		//@ts-ignore
		if(!userLang) userLang = navigator.userLanguage; 
		this.lang = userLang;
	}

	public async start():Promise<void> {
		//@ts-ignore
		let SRConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
		this.recognition = new SRConstructor() as SpeechRecognition;
		this.recognition.continuous = true;
		this.recognition.interimResults = true;
		this.recognition.lang = "fr-FR";
		this.recognition.onresult = async (event) => {
			console.log(event);
			if(this.ignoreResult) return;

			let texts = [];
			this.tempText = "";
			for (var i = event.resultIndex; i < event.results.length; ++i) {
				if(event.results[i].isFinal) {
					texts.push(event.results[i][0].transcript);
					this.finalText = texts[0];
				}else{
					this.tempText += event.results[i][0].transcript;
				}
			}
		}
		
		this.recognition.onend = () => {
			// console.log("ON END");
			this.recognition.start();
			if(this.ignoreResult) {
				this.startBotListening();
				this.ignoreResult = false;
			}
		};

		this.recognition.onspeechend = () => {
			// console.log("SPEECH END");
		};

		this.recognition.onerror = () => {
			// console.log("ON ERROR", e);
		}

		this.recognition.start();
		this.started = true;
	}

	public beforeDestroy():void {
		this.recognition.onend = null;
		this.recognition.onerror = null;
		this.recognition.onresult = null;
		this.recognition.onspeechend = null;
		clearTimeout(this.timeoutNoAnswer);
	}
	
	private startBotListening():void {

	}

}
</script>

<style scoped lang="less">
.speech2text{
	width: 100%;
	height: 100%;
	background: black;
	.holder {
		.center();
		position: absolute;
		
		.block {
			margin-bottom: 20px;

			.temp {
				opacity: .5;
			}
		}
	}
}
</style>