import PublicAPI from '@/utils/PublicAPI';
import type { TwitchatActionType } from '@/events/TwitchatEvent';
import TwitchatEvent from '@/events/TwitchatEvent';
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
	private voiceActionHandler!:(e:TwitchatEvent)=>void;
	private batchVoiceActionHandler!:(e:TwitchatEvent)=>void;

	constructor(private target:HTMLDivElement, private closeCallback:()=>void, private submitCallback:()=>void) {
		this.initialize();
	}

	private get currentInput():HTMLInputElement|null {
		return this.voiceInputs[this.tabIndex-1]!;
	}

	public dispose():void {
		PublicAPI.instance.removeEventListener(VoiceAction.ERASE, this.voiceActionHandler);
		PublicAPI.instance.removeEventListener(VoiceAction.SUBMIT, this.voiceActionHandler);
		PublicAPI.instance.removeEventListener(VoiceAction.PREVIOUS, this.voiceActionHandler);
		PublicAPI.instance.removeEventListener(VoiceAction.NEXT, this.voiceActionHandler);
		PublicAPI.instance.removeEventListener(VoiceAction.CANCEL, this.voiceActionHandler);
		PublicAPI.instance.removeEventListener(VoiceAction.TEXT_UPDATE, this.voiceActionHandler);
		PublicAPI.instance.removeEventListener(VoiceAction.SPEECH_END, this.voiceActionHandler);
		PublicAPI.instance.removeEventListener(VoiceAction.ACTION_BATCH, this.batchVoiceActionHandler);
	}

	private initialize():void {
		this.voiceActionHandler = (e:TwitchatEvent) => this.onVoiceAction(e);
		this.batchVoiceActionHandler = (e:TwitchatEvent) => this.onBatchVoiceAction(e);
		PublicAPI.instance.addEventListener(VoiceAction.ERASE, this.voiceActionHandler);
		PublicAPI.instance.addEventListener(VoiceAction.SUBMIT, this.voiceActionHandler);
		PublicAPI.instance.addEventListener(VoiceAction.PREVIOUS, this.voiceActionHandler);
		PublicAPI.instance.addEventListener(VoiceAction.NEXT, this.voiceActionHandler);
		PublicAPI.instance.addEventListener(VoiceAction.CANCEL, this.voiceActionHandler);
		PublicAPI.instance.addEventListener(VoiceAction.TEXT_UPDATE, this.voiceActionHandler);
		PublicAPI.instance.addEventListener(VoiceAction.SPEECH_END, this.voiceActionHandler);
		PublicAPI.instance.addEventListener(VoiceAction.ACTION_BATCH, this.batchVoiceActionHandler);
		
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

	private onVoiceAction(e:TwitchatEvent):void {
		
		switch(e.type) {
			case VoiceAction.CANCEL: this.closeCallback(); break;
			case VoiceAction.SPEECH_END: {
				this.originalTabIndex = this.tabIndex;
				break;
			}
			case VoiceAction.ERASE: {
				if(this.currentInput) {
					this.currentInput.value = "";
					this.currentInput.dispatchEvent(new Event("input"));
				}
				break;
			}
			case VoiceAction.SUBMIT: this.submitCallback(); break;
			case VoiceAction.PREVIOUS: this.tabIndex --; break;
			case VoiceAction.NEXT: this.tabIndex ++; break;
			case VoiceAction.TEXT_UPDATE: {
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

	private onBatchVoiceAction(e:TwitchatEvent):void {
		const actionList = e.data as {id:string, value:string}[];
		this.tabIndex = this.originalTabIndex;
		this.setFocus();
		for (const a of actionList) {
			this.onVoiceAction(new TwitchatEvent(a.id as TwitchatActionType, a.value));
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