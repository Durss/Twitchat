import type SpeechRecognition from "@/ISpeechRecognition";
import type { JsonObject } from "type-fest";
import { reactive, watch } from "vue";
import PublicAPI from "./PublicAPI";
import StoreProxy from "./StoreProxy";
import TwitchatEvent, { type TwitchatActionType, type TwitchatEventType } from "./TwitchatEvent";
import VoiceAction from "./VoiceAction";

/**
* Created : 11/05/2022 
*/
export default class VoiceController {

	private static _instance:VoiceController;
	
	public lang:string = "en-US";
	public started:boolean = false;
	
	private finalText:string = "";
	private tempText:string = "";
	private lastTriggerKey:string = "";
	private lastTriggerAction:VoiceAction|null = null;
	private ignoreResult:boolean = false;
	private wasIncludingGlobalCommand:boolean = false;
	private timeoutNoAnswer:number = -1;
	private recognition!:SpeechRecognition;
	private hashmap:{[key:string]:VoiceAction} = {};
	private hashmapGlobalActions:{[key:string]:VoiceAction} = {};
	private splitRegGlobalActions!:RegExp;
	private textUpdateAction!:VoiceAction;
	private triggersCountDone:number = 0;

	
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

	public get apiAvailable():boolean {
		//@ts-ignore
		return (window.SpeechRecognition ?? window.webkitSpeechRecognition) != undefined;
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

			this.tempText = "";
			let tempText_loc = "";
			for (let i = event.resultIndex; i < event.results.length; ++i) {
				if(event.results[i].isFinal) {
					this.finalText = event.results[i][0].transcript.replace(this.lastTriggerKey, "");
					if(!this.wasIncludingGlobalCommand) {
						this.triggerAction(this.textUpdateAction, {text:this.finalText});
					}
					if(this.triggersCountDone === 0) {
						this.parseSentence(this.finalText.toLowerCase());
					}
					this.triggerAction(new VoiceAction(VoiceAction.SPEECH_END), {text:this.finalText});
					this.wasIncludingGlobalCommand = false;
					this.lastTriggerAction = null;
					this.triggersCountDone = 0;
					this.lastTriggerKey = "";
				}else{
					this.finalText = "";
					tempText_loc += event.results[i][0].transcript;
				}
			}

			tempText_loc = tempText_loc.toLowerCase();
			//while talking, split the current text with all the global commands so
			//we get multiple chunks of actions
			const actionsList:{id:TwitchatActionType, value?:string|JsonObject}[] = [];
			let hasGlobalAction = false;
			if(tempText_loc.length > 0) {
				this.splitRegGlobalActions.lastIndex = 0;//reset regexp pointer
				const chunks = tempText_loc.split(this.splitRegGlobalActions);
				for (let i = 0; i < chunks.length; i++) {
					const v = chunks[i];
					let matchAction = false;
					for (const key in this.hashmapGlobalActions) {
						if(v == this.hashmapGlobalActions[key].sentences) {
							actionsList.push({id:this.hashmapGlobalActions[key].id as TwitchatActionType});
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
					const a = actionsList[0];
					this.triggerAction(new VoiceAction(a.id), a.value as JsonObject);
				}else{
					//There are more than one action including global one(s), send them
					//all as a batch
					this.triggerAction(new VoiceAction(VoiceAction.ACTION_BATCH), (actionsList as unknown) as JsonObject);
				}
			}else if(tempText_loc.length > 0) {
				tempText_loc = this.parseSentence(tempText_loc);
			}

			this.tempText = tempText_loc;
			if(!this.finalText) {
				this.triggerAction(new VoiceAction(VoiceAction.RAW_TEXT_UPDATE), {text:this.tempText});
			}
		}
		
		this.recognition.onend = () => {
			if(!this.started) return;
			this.recognition.start();
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
		this.textUpdateAction = new VoiceAction(VoiceAction.TEXT_UPDATE);

		watch(()=>this.lang, ()=> {
			if(this.recognition) {
				this.recognition.lang = this.lang;
				this.recognition.stop();
				//onend callback will restart the recognition automatically
			}
		});

		watch(()=>StoreProxy.store.state.voiceActions, ()=> {
			this.buildHashmaps();
		}, {deep:true})

		this.buildHashmaps();

		PublicAPI.instance.addEventListener(TwitchatEvent.ENABLE_STT, ()=> {
			this.start();
		})

		PublicAPI.instance.addEventListener(TwitchatEvent.DISABLE_STT, ()=> {
			this.stop();
		})
	}

	private parseSentence(str:string):string {
		//Handle non-global commands
		for (const key in this.hashmap) {
			const index = str.indexOf(key);
			if(index > -1) {
				this.lastTriggerKey = key;
				// str = str.replace(key, "");
				const action = this.hashmap[key];
				//Make sure event is broadcasted only once
				if(this.lastTriggerAction?.id !== action.id) {
					this.lastTriggerAction = action;
					this.triggerAction(action);
				}
			}
		}
		this.triggerAction(this.textUpdateAction, {text:str});
		return str;
	}

	private buildHashmaps():void {
		type VAKeys = keyof typeof VoiceAction;
		const actions:VoiceAction[] = StoreProxy.store.state.voiceActions;
		this.hashmap = {};
		this.hashmapGlobalActions = {};

		let regChunks:string[] = [];
		for (let i = 0; i < actions.length; i++) {
			const a = actions[i];
			if(!a.id) continue;
			const sentences = a.sentences?.split(/\r|\n/gi);
			sentences?.forEach(v => {
				const key = v.trim().toLowerCase();
				if(key.length > 1) {
					if(VoiceAction[a.id+"_IS_GLOBAL" as VAKeys] === true) {
						this.hashmapGlobalActions[key] = a;
						regChunks.push( a.sentences?.replace(/[^a-z0-9]/gi, "") as string );
					}else{
						this.hashmap[key] = a;
					}
				}
			}) 
		}

		this.splitRegGlobalActions = new RegExp("(?:^|\\s)("+regChunks.join("|")+")(?:$|(?:[^\\s]{1}\\s)?|\\s)", "gi");

		// console.log(this.hashmap);
		// console.log(this.hashmapGlobalActions);
		// console.log(this.splitRegGlobalActions);
	}

	private triggerAction(action:VoiceAction, data?:JsonObject):void {
		if(!action.id) return;

		// console.log("TRIGGER ACTION", action.id, data);
		
		switch(action.id) {
			case VoiceAction.CHAT_FEED_SCROLL_UP:	PublicAPI.instance.broadcast(TwitchatEvent.CHAT_FEED_SCROLL_UP, {scrollBy:500}, true); return;
			case VoiceAction.CHAT_FEED_SCROLL_DOWN:	PublicAPI.instance.broadcast(TwitchatEvent.CHAT_FEED_SCROLL_DOWN, {scrollBy:500}, true); return;
			case VoiceAction.CHAT_FEED_READ:		PublicAPI.instance.broadcast(TwitchatEvent.CHAT_FEED_READ, {count:10}, true); return;
			case VoiceAction.GREET_FEED_READ:		PublicAPI.instance.broadcast(TwitchatEvent.GREET_FEED_READ, {count:10}, true); return;
		}
		if(action.id != VoiceAction.TEXT_UPDATE) {
			this.triggersCountDone ++;
		}
		PublicAPI.instance.broadcast(action.id as TwitchatActionType|TwitchatEventType, data, true);
	}
}