import type SpeechRecognition from "@/ISpeechRecognition";
import store from "@/store";
import { reactive, watch } from "vue";
import PublicAPI from "./PublicAPI";
import TwitchatEvent, { type TwitchatActionType } from "./TwitchatEvent";
import VoiceAction from "./VoiceAction";

/**
* Created : 11/05/2022 
*/
export default class VoiceController {

	private static _instance:VoiceController;
	
	public lang:string = "en-US";
	public tempText:string = "";
	public finalText:string = "";
	public started:boolean = false;

	private ignoreResult:boolean = false;
	private timeoutNoAnswer:number = -1;
	private recognition!:SpeechRecognition;
	private hashmap:{[key:string]:VoiceAction} = {};
	private carretIndex:number = 0;

	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():VoiceController {
		if(!VoiceController._instance) {
			VoiceController._instance = reactive(new VoiceController()) as VoiceController;
			VoiceController._instance.initialize();
		}
		return VoiceController._instance;
	}

	public get currentText():string {
		if(this.tempText) return this.tempText;
		return this.finalText;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/

	public async start():Promise<void> {
		if(this.started) return;
		if(this.recognition) {
			this.started = true;
			this.recognition.start();
			return;
		}

		//@ts-ignore
		const SRConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
		this.recognition = new SRConstructor() as SpeechRecognition;
		this.recognition.continuous = true;
		this.recognition.interimResults = true;
		this.recognition.lang = this.lang;
		this.recognition.onresult = async (event) => {
			if(this.ignoreResult) return;

			const texts = [];
			this.tempText = "";
			for (let i = event.resultIndex; i < event.results.length; ++i) {
				if(event.results[i].isFinal) {
					texts.push(event.results[i][0].transcript);
					this.finalText = texts[0];
				}else{
					this.tempText += event.results[i][0].transcript;
				}
			}

			this.tempText = this.tempText.toLowerCase();
			for (const key in this.hashmap) {
				const index = this.tempText.substring(Math.max(0,this.carretIndex)).indexOf(key);
				if(index > -1) {
					this.triggerAction(this.hashmap[key]);
					this.carretIndex += index + key.length;
				}
			}

			//Reset carret after temp text is cleared.
			//Edge is turbo slow to fire the onspeechend event.
			//This condition is a workaround for that issue.
			if(this.tempText?.length == 0) {
				this.carretIndex = -1;
			}
		}
		
		this.recognition.onend = () => {
			this.carretIndex = -1;
			if(!this.started) return;
			this.recognition.start();
		};

		this.recognition.onspeechend = () => {
			this.carretIndex = -1;
			// console.log("SPEECH END");
		};
		
		this.recognition.onerror = () => {
			this.carretIndex = -1;
			// console.log("ON ERROR", e);
		}

		this.recognition.start();
		this.started = true;
	}

	public stop():void {
		this.started = false;
		this.recognition.stop();
	}

	public dispose():void {
		this.started = false;
		try {
			this.recognition.stop();
		}catch(e) {
			//ignore
		}
		this.recognition.onend = null;
		this.recognition.onerror = null;
		this.recognition.onresult = null;
		this.recognition.onspeechend = null;
		clearTimeout(this.timeoutNoAnswer);
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		watch(()=>this.lang, ()=> {
			if(this.recognition) {
				this.recognition.lang = this.lang;
				this.recognition.stop();
				//onend callback will restart the recognition automatically
			}
		});

		watch(()=>store.state.voiceActions, ()=> {
			this.buildHashmap();
		}, {deep:true})

		this.buildHashmap();
	}

	private buildHashmap():void {
		const actions = store.state.voiceActions;
		this.hashmap = {};

		for (let i = 0; i < actions.length; i++) {
			const a = actions[i];
			if(!a.id) continue;
			const sentences = a.sentences?.split(/\r|\n/gi);
			sentences?.forEach(v => {
				const key = v.trim().toLowerCase();
				if(key.length > 1) {
					this.hashmap[key] = a;
				}
			}) 
		}
	}

	private triggerAction(action:VoiceAction):void {
		if(!action.id) return;
		
		switch(action.id) {
			case VoiceAction.CHAT_FEED_SCROLL_UP:	PublicAPI.instance.broadcast(TwitchatEvent.CHAT_FEED_SCROLL_UP, {scrollBy:500}, true); return;
			case VoiceAction.CHAT_FEED_SCROLL_DOWN:	PublicAPI.instance.broadcast(TwitchatEvent.CHAT_FEED_SCROLL_DOWN, {scrollBy:500}, true); return;
			case VoiceAction.CHAT_FEED_READ:		PublicAPI.instance.broadcast(TwitchatEvent.CHAT_FEED_READ, {count:10}, true); return;
			case VoiceAction.GREET_FEED_READ:		PublicAPI.instance.broadcast(TwitchatEvent.GREET_FEED_READ, {count:10}, true); return;
		}
		PublicAPI.instance.broadcast(action.id as TwitchatActionType, undefined, true);
	}
}