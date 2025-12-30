import TwitchatEvent, { type TwitchatEventMap } from '@/events/TwitchatEvent';
import PublicAPI from '@/utils/PublicAPI';
import VoiceAction from '@/utils/voice/VoiceAction';
import { gsap } from 'gsap/gsap-core';

/**
 * There's a VERY strange issue I couldn't figure out so far.
 * If instanciating this class on the Confirm view in its mounted()
 * then an later instance of this class will simply not work.
 * No PublicAPI callback will be called.
 * I've worked around this by instanciating this class on the
 * Confirm view only on its open and destroying it on its close.
 */
export default class FormVoiceControllHelper {
	
	public enabled:boolean = true;
	
	public tabIndex:number = 1;
	private originalTabIndex:number = 1;
	private voiceInputs:HTMLInputElement[] = [];
	private prevField:HTMLInputElement|null = null;
	private prevFieldValue:string = "";
	private voiceActionHandler!:(e:unknown)=>void;
	private batchVoiceActionHandler!:(e:unknown)=>void;

	constructor(private target:HTMLDivElement, private closeCallback:()=>void, private submitCallback:()=>void) {
		this.initialize();
	}

	private get currentInput():HTMLInputElement|null {
		return this.voiceInputs[this.tabIndex-1]!;
	}

	public dispose():void {
		PublicAPI.instance.removeEventListener("ON_STT_ERASE", this.voiceActionHandler);
		PublicAPI.instance.removeEventListener("ON_STT_SUBMIT", this.voiceActionHandler);
		PublicAPI.instance.removeEventListener("ON_STT_PREVIOUS", this.voiceActionHandler);
		PublicAPI.instance.removeEventListener("ON_STT_NEXT", this.voiceActionHandler);
		PublicAPI.instance.removeEventListener("ON_STT_CANCEL", this.voiceActionHandler);
		PublicAPI.instance.removeEventListener("ON_STT_TEXT_UPDATE", this.voiceActionHandler);
		PublicAPI.instance.removeEventListener("ON_STT_SPEECH_END", this.voiceActionHandler);
		PublicAPI.instance.removeEventListener("ON_STT_ACTION_BATCH", this.batchVoiceActionHandler);
	}

	private initialize():void {
		this.voiceActionHandler = (e) => this.onVoiceAction(e as any);
		this.batchVoiceActionHandler = (e) => this.onBatchVoiceAction(e as any);
		PublicAPI.instance.addEventListener("ON_STT_ERASE", this.voiceActionHandler);
		PublicAPI.instance.addEventListener("ON_STT_SUBMIT", this.voiceActionHandler);
		PublicAPI.instance.addEventListener("ON_STT_PREVIOUS", this.voiceActionHandler);
		PublicAPI.instance.addEventListener("ON_STT_NEXT", this.voiceActionHandler);
		PublicAPI.instance.addEventListener("ON_STT_CANCEL", this.voiceActionHandler);
		PublicAPI.instance.addEventListener("ON_STT_TEXT_UPDATE", this.voiceActionHandler);
		PublicAPI.instance.addEventListener("ON_STT_SPEECH_END", this.voiceActionHandler);
		PublicAPI.instance.addEventListener("ON_STT_ACTION_BATCH", this.batchVoiceActionHandler);
		
		this.updateVoiceInputList();
		this.voiceInputs.forEach(v => {
			v.addEventListener("focus", ()=>{
				this.tabIndex = v.tabIndex;
				this.setFocus();
			});
		});

	}

	private updateVoiceInputList():void {
		const inputs = this.target.querySelectorAll("input[tabindex]");
		this.voiceInputs = [...inputs] as HTMLInputElement[];
	}

	private onText(text:string = ""):void {
		if(!this.currentInput) return;

		const maxLength = this.currentInput.maxLength ?? 9999;

		// text too long, shake the field
		if(text.length > maxLength) {
			gsap.fromTo(this.currentInput, {x:-2}, {x:2, duration:0.01, clearProps:"x", repeat:20});
			text = text.substring(0, maxLength);
		}

		this.currentInput.value = text;
		this.currentInput.dispatchEvent(new Event("input"));
	}

	private onVoiceAction(
	e:{type:"ON_STT_ERASE", data:TwitchatEventMap["ON_STT_ERASE"]}
	| {type:"ON_STT_SUBMIT", data:TwitchatEventMap["ON_STT_SUBMIT"]}
	| {type:"ON_STT_PREVIOUS", data:TwitchatEventMap["ON_STT_PREVIOUS"]}
	| {type:"ON_STT_NEXT", data:TwitchatEventMap["ON_STT_NEXT"]}
	| {type:"ON_STT_CANCEL", data:TwitchatEventMap["ON_STT_CANCEL"]}
	| {type:"ON_STT_TEXT_UPDATE", data:TwitchatEventMap["ON_STT_TEXT_UPDATE"]}
	| {type:"ON_STT_SPEECH_END", data:TwitchatEventMap["ON_STT_SPEECH_END"]}):void {
		
		switch(e.type) {
			case "ON_STT_CANCEL": this.closeCallback(); break;
			case "ON_STT_SPEECH_END": {
				this.originalTabIndex = this.tabIndex;
				break;
			}
			case "ON_STT_ERASE": {
				if(this.currentInput) {
					this.currentInput.value = "";
					this.currentInput.dispatchEvent(new Event("input"));
				}
				break;
			}
			case "ON_STT_SUBMIT": this.submitCallback(); break;
			case "ON_STT_PREVIOUS": this.tabIndex --; break;
			case "ON_STT_NEXT": this.tabIndex ++; break;
			case "ON_STT_TEXT_UPDATE": {
				const text = (e.data as {text:string}).text as string;
				this.onText(text);
				return;
			}
		}

		this.updateVoiceInputList();
		
		if(this.tabIndex < 1) this.tabIndex = this.voiceInputs.length;
		if(this.tabIndex > this.voiceInputs.length) this.tabIndex = 1;
		this.setFocus();

		if(e.type != VoiceAction.SPEECH_END
		&& e.type != VoiceAction.ERASE
		&& this.prevField) {
			//Backup prev field value to revert it if just using a global command
			this.prevField.value = this.prevFieldValue;
			this.prevField.dispatchEvent(new Event("input"));
			this.prevField = null;
			this.prevFieldValue = "";
		}else if(this.currentInput){
			this.prevField = this.currentInput;
			this.prevFieldValue = this.currentInput.value;
		}
	}

	private onBatchVoiceAction(e:TwitchatEvent<"ON_STT_ACTION_BATCH">):void {
		const actionList = e.data;
		this.tabIndex = this.originalTabIndex;
		this.setFocus();
		for (const a of actionList) {
			// @ts-ignore gave up on typing this in the middle of massive refactoring T_T
			this.onVoiceAction(new TwitchatEvent(a.id, a.value));
		}
	}

	private setFocus():void {
		//Set focus to the current input and remove it from the others
		this.voiceInputs.forEach(v=> {
			if(v.tabIndex == this.tabIndex) {
				v.focus();
				v.scrollIntoView({behavior:"auto", block:"center"})
				v.classList.add("voiceFocus");
			}
			else v.classList.remove("voiceFocus");
		});
	}

}