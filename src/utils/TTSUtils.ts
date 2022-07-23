import IRCClient from "./IRCClient";
import IRCEvent from "./IRCEvent";
import type { IRCEventDataList } from "./IRCEventDataTypes";
import type PubSubEvent from "./PubSubEvent";
import StoreProxy from "./StoreProxy";

export interface SpokenMessage {
	voiceMessage: SpeechSynthesisUtterance,
	message: IRCEventDataList.Message|IRCEventDataList.Highlight|IRCEventDataList.Whisper
}

export default class TTSUtils {

	private static _instance:TTSUtils;

	private enabled:boolean = false;
	private voices:SpeechSynthesisVoice[] = window.speechSynthesis.getVoices();
	private overflow: boolean = false;

	private pendingMessages:SpokenMessage[] = [];
	private deleteMessageHandler!:(e:IRCEvent)=>void;
	
	constructor() {
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():TTSUtils {
		if(!TTSUtils._instance) {
			TTSUtils._instance = new TTSUtils();
			window.speechSynthesis.onvoiceschanged = () => {
				this._instance.voices = window.speechSynthesis.getVoices();
				StoreProxy.store.state.params.tts.voice.listValues = this._instance.voices.map(x => { return {label:x.name, value:x.name} });
			};
		}

		this._instance.deleteMessageHandler = (e:IRCEvent)=> this._instance.onDeleteMessage(e);
		IRCClient.instance.addEventListener(IRCEvent.DELETE_MESSAGE, this._instance.deleteMessageHandler);
		return TTSUtils._instance;
	}

	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Enables TTC
	 * Loads up the necessary emotes
	 */
	 public async enable():Promise<void> {
		this.enabled = true;
	}

	/**
	 * Disable SevenTV emotes
	 */
	public async disable():Promise<void> {
		this.enabled = false;
	}


    /**
     * Get voices list
     * 
     * @returns SpeechSynthesisVoice[]
     */
    public getVoices():SpeechSynthesisVoice[] {
		return this.voices;
    }

	public speakText(user: string | undefined, messageStr: string, message:IRCEventDataList.Message|IRCEventDataList.Highlight|IRCEventDataList.Whisper):void {
		const paramsTTS = StoreProxy.store.state.params.tts;
		
		this.overflow = this.overflow && window.speechSynthesis.pending;
		if (this.overflow) {
			return;
		}
		
		let spokenText = paramsTTS.spokenPattern.value.replace('$MESSAGE', messageStr);
		spokenText = spokenText.replace('$USER', user ? user : '');
		if (paramsTTS.removeURL.value) {
			spokenText = spokenText.replace(/(http[s]?|ftp):[^ ]*/g, paramsTTS.replaceURL.value);
		}

		spokenText = spokenText.substring(0, paramsTTS.maxLength.value || Number.MAX_VALUE);
		const mess = new SpeechSynthesisUtterance(spokenText);
		mess.rate = paramsTTS.rate.value;
		mess.pitch = paramsTTS.pitch.value;
		mess.volume = paramsTTS.volume.value;
		mess.voice = this.voices.find(x => x.name == paramsTTS.voice.value) || this.voices[0];
		mess.lang = mess.voice.lang;
		
		let wroteTime = performance.now();
		mess.onstart = (ev: SpeechSynthesisEvent) => {
			this.overflow = performance.now() - wroteTime > paramsTTS.overflow.value * 1000;
		};
		mess.onend = (ev: SpeechSynthesisEvent) => {
			let nextMessage = this.pendingMessages.shift();
			if (nextMessage) {
				window.speechSynthesis.speak(nextMessage.voiceMessage);
			}
		}
		
		if (!window.speechSynthesis.speaking) {
			window.speechSynthesis.speak(mess);
		} else {
			this.pendingMessages.push({ voiceMessage: mess, message: message});
		}
	}

	private onDeleteMessage(e:IRCEvent|PubSubEvent):void {
		let messageID = "";
		if(typeof e.data == "string") {
			messageID = e.data;
		}else{
			const data = e.data as IRCEventDataList.MessageDeleted;
			messageID = data.tags['target-msg-id'] as string;
		}
		const keepDeletedMessages = StoreProxy.store.state.params.filters.keepDeletedMessages.value;

		let index = this.pendingMessages.findIndex(v => v.message.tags.id === messageID);
		if(index > -1) {
			this.pendingMessages.splice(index, 1);
		}
	}

}
