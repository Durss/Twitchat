import type { TwitchatEventMap } from "@/events/TwitchatEvent";
import type SpeechRecognition from "@/ISpeechRecognition";
import { storeVoice } from "@/store/voice/storeVoice";
import type { JsonObject } from "type-fest";
import { ref, watch } from "vue";
import PublicAPI from "../PublicAPI";
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
	
	private lastTriggerKey:(keyof TwitchatEventMap | "") = "";
	private remoteControlMode:boolean = false;
	private wasIncludingGlobalCommand:boolean = false;
	private lastTriggerAction:VoiceAction|null = null;
	private timeoutNoAnswer:number = -1;
	private recognition!:SpeechRecognition;
	private hashmap:Partial<{[key in keyof TwitchatEventMap]:VoiceAction}> = {};
	private hashmapGlobalActions:Partial<{[key in keyof TwitchatEventMap]:VoiceAction}> = {};
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
			PublicAPI.instance.broadcast("ON_VOICE_CONTROL_STATE_CHANGE", {enabled:true});
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
						PublicAPI.instance.broadcast("ON_STT_REMOTE_FINAL_TEXT_EVENT", {text:finalText})
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
				PublicAPI.instance.broadcast("ON_STT_REMOTE_TEMP_TEXT_EVENT", {text:tempText_loc});
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
		PublicAPI.instance.broadcast("ON_VOICE_CONTROL_STATE_CHANGE", {enabled:true});
	}

	public stop():void {
		this.started.value = false;
		this.recognition.stop();

		PublicAPI.instance.broadcast("ON_VOICE_CONTROL_STATE_CHANGE", {enabled:false});
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

		PublicAPI.instance.addEventListener("SET_VOICE_CONTROL_STATE", (data)=> {
			let enable = data.data.enabled;
			if(enable === undefined) enable = !this.started.value;
			if(enable) {
				this.start(this.remoteControlMode);
			}else{
				this.stop();
			}
		})
		
		PublicAPI.instance.addEventListener("ON_STT_REMOTE_TEMP_TEXT_EVENT", (e)=> {
			this.finalText.value = "";
			// //@ts-ignore
			// console.log("REMOTE TEMP", e.data.text);
			this.onTempText(e.data.text);
		});
		PublicAPI.instance.addEventListener("ON_STT_REMOTE_FINAL_TEXT_EVENT", (e)=> {
			this.onFinalText(e.data.text);
		});
	}

	private parseSentence(str:string):string {
		//Handle non-global commands
		for (const key in this.hashmap) {
			const index = str.toLowerCase().indexOf(key);
			const typedKey = key as keyof TwitchatEventMap;
			if(index > -1) {
				this.lastTriggerKey = typedKey;
				// str = str.replace(key, "");
				const action = this.hashmap[typedKey]!;
				//Make sure event is broadcasted only once
				if(action && this.lastTriggerAction?.id !== action.id) {
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
				const typedKey = key as keyof TwitchatEventMap;
				if(key.length > 1) {
					if(VoiceAction[a.id+"_IS_GLOBAL" as VAKeys] === true) {
						this.hashmapGlobalActions[typedKey] = a;
						regChunks.push( a.sentences?.replace(/[^a-z0-9 ]/gi, "") as string );
					}else{
						this.hashmap[typedKey] = a;
					}
				}
			}) 
		}

		this.splitRegGlobalActions = new RegExp("(?:^|\\s)("+regChunks.join("|")+")(?:(?:[^\\s]{0,1}$)|(?:[^\\s]{1}\\s)?|\\s)", "gi");
	}

	private triggerAction(action:string, data?:JsonObject):void {
		if(!action) return;

		switch(action) {
			case VoiceAction.CHAT_FEED_SCROLL_UP:	PublicAPI.instance.broadcast("SET_CHAT_FEED_SCROLL_UP", {scrollBy:500, colIndex:0}, true, true); return;
			case VoiceAction.CHAT_FEED_SCROLL_DOWN:	PublicAPI.instance.broadcast("SET_CHAT_FEED_SCROLL_DOWN", {scrollBy:500, colIndex:0}, true, true); return;
			case VoiceAction.CHAT_FEED_READ:		PublicAPI.instance.broadcast("SET_CHAT_FEED_READ", {count:10, colIndex:0}, true, true); return;
			case VoiceAction.GREET_FEED_READ:		PublicAPI.instance.broadcast("SET_GREET_FEED_READ", {messageCount:10}, true, true); return;
			case VoiceAction.START_EMERGENCY:		PublicAPI.instance.broadcast("SET_EMERGENCY_MODE", {enabled:true, promptConfirmation:true}, true, true); return;
			case VoiceAction.STOP_EMERGENCY:		PublicAPI.instance.broadcast("SET_EMERGENCY_MODE", {enabled:false}, true, true); return;
			case VoiceAction.CHAT_FEED_PAUSE:		PublicAPI.instance.broadcast("SET_CHAT_FEED_PAUSE", {colIndex:0}, true, true); return;
			case VoiceAction.CHAT_FEED_UNPAUSE:		PublicAPI.instance.broadcast("SET_CHAT_FEED_PAUSE", {colIndex:0}, true, true); return;
		}
		if(action != VoiceAction.TEXT_UPDATE) {
			this.triggersCountDone ++;
		}
		// @ts-ignore
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
		const actionsList:{id:keyof TwitchatEventMap, value?:{text:string}}[] = [];
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
					const typedKey = key as keyof TwitchatEventMap;
					if(this.hashmapGlobalActions[typedKey]
					&& this.hashmapGlobalActions[typedKey].id
					&& v?.toLowerCase() == (this.hashmapGlobalActions[typedKey].sentences || "___").toLowerCase()) {
						actionsList.push({id:this.hashmapGlobalActions[typedKey].id});
						matchAction = true;
						break;
					}
				}
				if(!matchAction && v.length > 0) {
					actionsList.push({id:VoiceAction.TEXT_UPDATE, value:{text:v}});
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