import IRCClient from "./IRCClient";
import IRCEvent from "./IRCEvent";
import type { IRCEventDataList } from "./IRCEventDataTypes";
import type PubSubEvent from "./PubSubEvent";
import StoreProxy from "./StoreProxy";

export interface SpokenMessage {
	wroteTime: number,
	voiceMessage: SpeechSynthesisUtterance,
	message: IRCEventDataList.Message|IRCEventDataList.Highlight|IRCEventDataList.Whisper
}

export default class TTSUtils {

	private static _instance:TTSUtils;

	private enabled:boolean = false;
	private voices:SpeechSynthesisVoice[] = window.speechSynthesis.getVoices();

	private pendingMessages:SpokenMessage[] = [];

	/********************
	* hANDLERS          *
	********************/
	private deleteMessageHandler!:(e:IRCEvent)=>void;
	
	constructor() {
		window.speechSynthesis.onvoiceschanged = () => { // in case they are not yet loaded
			this.voices = window.speechSynthesis.getVoices();
			StoreProxy.store.state.params.tts.voice.listValues = this.voices.map(x => { return {label:x.name, value:x.name} });
		};
		this.deleteMessageHandler = (e:IRCEvent)=> this.onDeleteMessage(e);
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():TTSUtils {
		if(!TTSUtils._instance) {
			TTSUtils._instance = new TTSUtils();
		}

		return TTSUtils._instance;
	}

	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Enables TTS
	 */
	 public async enable(enable: boolean):Promise<void> {
		this.enabled = enable;
		if (enable) {
			IRCClient.instance.addEventListener(IRCEvent.DELETE_MESSAGE, this.deleteMessageHandler);
		} else {
			IRCClient.instance.removeEventListener(IRCEvent.DELETE_MESSAGE, this.deleteMessageHandler);
		}
	}

    /**
     * Get voices list
     * 
     * @returns SpeechSynthesisVoice[]
     */
    public getVoices():SpeechSynthesisVoice[] {
		return this.voices;
    }

	public async speakText(user: string | undefined, messageStr: string, message:IRCEventDataList.Message|IRCEventDataList.Highlight|IRCEventDataList.Whisper):Promise<void> {
		if (!this.enabled) {
			return;
		}
		const paramsTTS = StoreProxy.store.state.params.tts;
		
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
		
		mess.onend = (ev: SpeechSynthesisEvent) => {
			let nextMessage = this.pendingMessages.shift();
			if (nextMessage) {
				// check timeout
				if (paramsTTS.timeout.value === 0 || performance.now() - nextMessage.wroteTime <= paramsTTS.timeout.value * 1000) {
					window.speechSynthesis.speak(nextMessage.voiceMessage);
				}
			}
		}
		
		if (!window.speechSynthesis.speaking) {
			window.speechSynthesis.speak(mess);
		} else {
			this.pendingMessages.push({wroteTime: performance.now(), voiceMessage: mess, message: message});
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
