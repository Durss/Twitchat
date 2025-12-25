import type SpeechRecognition from "@/ISpeechRecognition";
import { storeVoice } from "@/store/voice/storeVoice";
import type { JsonObject } from "type-fest";
import { reactive, ref, watch } from "vue";
import PublicAPI from "../PublicAPI";
import TwitchatEvent, { type TwitchatActionType, type TwitchatEventType } from "../../events/TwitchatEvent";
import VoiceAction from "./VoiceAction";

/**
* Created : 11/05/2022 
*/
export default class VoiceController {

	private static _instance:VoiceController;
	
	public lang = ref("en-US");
	public started = ref(false);
	public finalText = ref("");
	public tempText = ref("");
	
	private lastTriggerKey:string = "";
	private remoteControlMode:boolean = false;
	private wasIncludingGlobalCommand:boolean = false;
	private lastTriggerAction:VoiceAction|null = null;
	private timeoutNoAnswer:number = -1;
	private recognition!:SpeechRecognition;
	private hashmap:{[key:string]:VoiceAction} = {};
	private hashmapGlobalActions:{[key:string]:VoiceAction} = {};
	private splitRegGlobalActions!:RegExp;
	private triggersCountDone:number = 0;

	private sVoice = storeVoice();

	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():VoiceController {
		if(!VoiceController._instance) {
			VoiceController._instance = new VoiceController();
			VoiceController._instance.initialize();
		}
		return VoiceController._instance;
	}

	public get currentText():string {
		if(this.tempText.value) return this.tempText.value;
		return this.finalText.value;
	}

	public get apiAvailable():boolean {
		//@ts-ignore
		return (window.SpeechRecognition ?? window.webkitSpeechRecognition) != undefined;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/

	public async start(remoteControlMode:boolean):Promise<void> {
		this.remoteControlMode = remoteControlMode;
		if(this.started.value) return;
		if(this.recognition) {
			this.started.value = true;
			this.recognition.start();
			return;
		}
		
		//When using voice recognition from a remote page, we get 2 events broadcasted
		//for temp and final text. We then use these events to execute the voice actions
		if(!this.remoteControlMode) {
			watch(()=>this.sVoice.voiceActions, ()=> {
				this.buildHashmaps();
			}, {deep:true});
			this.buildHashmaps();
		}

		//@ts-ignore
		const SRConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
		this.recognition = new SRConstructor() as SpeechRecognition;
		this.recognition.continuous = true;
		this.recognition.interimResults = true;
		this.recognition.lang = this.lang.value;
		this.recognition.onresult = async (event) => {
			this.tempText.value = "";
			let tempText_loc = "";
			for (let i = event.resultIndex; i < event.results.length; ++i) {
				if(event.results[i]!.isFinal) {
					const finalText = event.results[i]![0]!.transcript.replace(this.lastTriggerKey, "");
					if(this.remoteControlMode) {
						this.finalText.value = tempText_loc;
						PublicAPI.instance.broadcast(TwitchatEvent.REMOTE_FINAL_TEXT_EVENT, {text:finalText})
					}else{
						this.onFinalText( finalText );
					}
					return;
				}else{
					this.finalText.value = "";
					tempText_loc += event.results[i]![0]!.transcript;
				}
			}

			if(this.remoteControlMode) {
				this.tempText.value = tempText_loc;
				PublicAPI.instance.broadcast(TwitchatEvent.REMOTE_TEMP_TEXT_EVENT, {text:tempText_loc});
			}else{
				this.onTempText(tempText_loc);
			}
		}
		
		this.recognition.onend = () => {
			if(!this.started.value) return;
			this.recognition.start();
		};

		this.recognition.onspeechend = () => {
			// console.log("SPEECH END");
		};
		
		this.recognition.onerror = () => {
			// console.log("ON ERROR", e);
		}

		this.recognition.start();
		this.started.value = true;
	}

	public stop():void {
		this.started.value = false;
		this.recognition.stop();
	}

	public dispose():void {
		this.started.value = false;
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
				this.recognition.lang = this.lang.value;
				this.recognition.stop();
				//onend callback will restart the recognition automatically
			}
		});

		PublicAPI.instance.addEventListener(TwitchatEvent.ENABLE_STT, ()=> {
			this.start(this.remoteControlMode);
		})

		PublicAPI.instance.addEventListener(TwitchatEvent.DISABLE_STT, ()=> {
			this.stop();
		})
		
		PublicAPI.instance.addEventListener(TwitchatEvent.REMOTE_TEMP_TEXT_EVENT, (e:TwitchatEvent)=> {
			this.finalText.value = "";
			// //@ts-ignore
			// console.log("REMOTE TEMP", e.data.text);
			this.onTempText((e.data as {text:string}).text);
		});
		PublicAPI.instance.addEventListener(TwitchatEvent.REMOTE_FINAL_TEXT_EVENT, (e:TwitchatEvent)=> {
			this.onFinalText((e.data as {text:string}).text);
		});
	}

	private parseSentence(str:string):string {
		//Handle non-global commands
		for (const key in this.hashmap) {
			const index = str.toLowerCase().indexOf(key);
			if(index > -1) {
				this.lastTriggerKey = key;
				// str = str.replace(key, "");
				const action = this.hashmap[key]!;
				//Make sure event is broadcasted only once
				if(this.lastTriggerAction?.id !== action.id) {
					this.lastTriggerAction = action;
					this.triggerAction(action.id as string);
				}
			}
		}
		this.triggerAction(VoiceAction.TEXT_UPDATE, {text:str});
		return str;
	}

	private buildHashmaps():void {
		type VAKeys = keyof typeof VoiceAction;
		const actions:VoiceAction[] = this.sVoice.voiceActions;
		this.hashmap = {};
		this.hashmapGlobalActions = {};

		const regChunks:string[] = [];
		for (let i = 0; i < actions.length; i++) {
			const a = actions[i];
			if(!a || !a.id) continue;
			const sentences = a.sentences?.split(/\r|\n/gi);
			sentences?.forEach(v => {
				const key = v.trim().toLowerCase();
				if(key.length > 1) {
					if(VoiceAction[a.id+"_IS_GLOBAL" as VAKeys] === true) {
						this.hashmapGlobalActions[key] = a;
						regChunks.push( a.sentences?.replace(/[^a-z0-9 ]/gi, "") as string );
					}else{
						this.hashmap[key] = a;
					}
				}
			}) 
		}

		this.splitRegGlobalActions = new RegExp("(?:^|\\s)("+regChunks.join("|")+")(?:(?:[^\\s]{0,1}$)|(?:[^\\s]{1}\\s)?|\\s)", "gi");
	}

	private triggerAction(action:string, data?:JsonObject):void {
		if(!action) return;

		// console.log("TRIGGER ACTION", action, data);
		
		switch(action) {
			case VoiceAction.CHAT_FEED_SCROLL_UP:	PublicAPI.instance.broadcast(TwitchatEvent.CHAT_FEED_SCROLL_UP, {scrollBy:500}, true, true); return;
			case VoiceAction.CHAT_FEED_SCROLL_DOWN:	PublicAPI.instance.broadcast(TwitchatEvent.CHAT_FEED_SCROLL_DOWN, {scrollBy:500}, true, true); return;
			case VoiceAction.CHAT_FEED_READ:		PublicAPI.instance.broadcast(TwitchatEvent.CHAT_FEED_READ, {count:10}, true, true); return;
			case VoiceAction.GREET_FEED_READ:		PublicAPI.instance.broadcast(TwitchatEvent.GREET_FEED_READ, {count:10}, true, true); return;
		}
		if(action != VoiceAction.TEXT_UPDATE) {
			this.triggersCountDone ++;
		}
		PublicAPI.instance.broadcast(action as TwitchatActionType|TwitchatEventType, data, true, true);
	}

	private onFinalText(text:string) {
		this.finalText.value = text.trim();
		if(!this.wasIncludingGlobalCommand) {
			this.triggerAction(VoiceAction.TEXT_UPDATE, {text:this.finalText.value});
		}
		if(this.triggersCountDone === 0) {
			this.parseSentence(this.finalText.value.toLowerCase());
		}
		this.triggerAction(VoiceAction.SPEECH_END, {text});
		this.wasIncludingGlobalCommand = false;
		this.lastTriggerAction = null;
		this.triggersCountDone = 0;
		this.lastTriggerKey = "";
	}

	private onTempText(text:string) {
		let tempText_loc = text.toLowerCase().trim();
		
		//while talking, split the current text with all the global commands so
		//we get multiple chunks of actions
		const actionsList:{id:TwitchatActionType, value?:string|JsonObject}[] = [];
		let hasGlobalAction = false;
		if(tempText_loc.length > 0) {
			//Force first build of hashmap if necessary
			if(!this.splitRegGlobalActions) {
				this.buildHashmaps();
			}
			
			this.splitRegGlobalActions.lastIndex = 0;//reset regexp pointer
			const chunks = tempText_loc.split(this.splitRegGlobalActions);
			console.log(chunks);
			for (const chunk of chunks) {
				const v = chunk.trim();
				let matchAction = false;
				for (const key in this.hashmapGlobalActions) {
					if(v?.toLowerCase() == (this.hashmapGlobalActions[key]!.sentences || "___").toLowerCase()) {
						actionsList.push({id:this.hashmapGlobalActions[key]!.id as TwitchatActionType});
						matchAction = true;
						break;
					}
				}
				if(!matchAction && v.length > 0) {
					actionsList.push({id:VoiceAction.TEXT_UPDATE as TwitchatActionType, value:{text:v}});
				}else{
					hasGlobalAction = true;
					this.wasIncludingGlobalCommand = true;
				}
			}
		}
		
		if(hasGlobalAction) {
			//If there's just one global action, send it the normal way
			if(actionsList.length ==1) {
				const a = actionsList[0]!;
				this.triggerAction(a.id, a.value as JsonObject);
			}else{
				//There are more than one action including global one(s), send them
				//all as a batch
				this.triggerAction(VoiceAction.ACTION_BATCH, (actionsList as unknown) as JsonObject);
			}
		}else if(tempText_loc.length > 0) {
			tempText_loc = this.parseSentence(tempText_loc);
		}

		this.tempText.value = tempText_loc;
		if(!this.finalText.value) {
			this.triggerAction(VoiceAction.RAW_TEXT_UPDATE, {text:tempText_loc});
		}
	}
}