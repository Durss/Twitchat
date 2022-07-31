import type { PermissionsData } from "@/types/TwitchatDataTypes";
import IRCClient from "./IRCClient";
import IRCEvent from "./IRCEvent";
import { getType, type IRCEventData, type IRCEventDataList } from "./IRCEventDataTypes";
import type PubSubEvent from "./PubSubEvent";
import StoreProxy from "./StoreProxy";
import TwitchUtils from "./TwitchUtils";
import Utils from "./Utils";

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
	private lastMessageTime:number = performance.now();

	/********************
	* HANDLERS          *
	********************/
	private addMessageHandler!:(e:IRCEvent)=>void;
	private deleteMessageHandler!:(e:IRCEvent)=>void;
	
	constructor() {
		window.speechSynthesis.onvoiceschanged = () => { // in case they are not yet loaded
			this.voices = window.speechSynthesis.getVoices();
			StoreProxy.store.state.params.tts.voice.listValues = this.voices.map(x => { return {label:x.name, value:x.name} });
		};
		this.addMessageHandler = (e:IRCEvent)=> this.onAddMessage(e);
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
			IRCClient.instance.addEventListener(IRCEvent.MESSAGE, this.addMessageHandler);
			IRCClient.instance.addEventListener(IRCEvent.NOTICE, this.addMessageHandler);
			IRCClient.instance.addEventListener(IRCEvent.HIGHLIGHT, this.addMessageHandler);
		} else {
			IRCClient.instance.removeEventListener(IRCEvent.DELETE_MESSAGE, this.deleteMessageHandler);
			IRCClient.instance.removeEventListener(IRCEvent.MESSAGE, this.addMessageHandler);
			IRCClient.instance.removeEventListener(IRCEvent.NOTICE, this.addMessageHandler);
			IRCClient.instance.removeEventListener(IRCEvent.HIGHLIGHT, this.addMessageHandler);
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

	public speak(message: IRCEventDataList.Message) {
		this.processMessage(message);
	}

	private onAddMessage(e:IRCEvent):void {
		const message = e.data as IRCEventDataList.Message|IRCEventDataList.Highlight|IRCEventDataList.Whisper;
		console.log(message);
		
		this.processMessage(message);
	}	

	private processMessage(message:IRCEventDataList.Message|IRCEventDataList.Highlight|IRCEventDataList.Whisper) {
		const paramsTTS = StoreProxy.store.state.params.tts;
		const uid:string|undefined = message?.tags['user-id'];
		const user: string|undefined = message?.tags['display-name'];
		let messageStr = message.type === "whisper"? message.params[1] : message.message;
		
		if (message.type === 'message') {
			// only speak if inactivity period is reached
			const lastMessageTime = this.lastMessageTime;
			this.lastMessageTime = performance.now();
			
			if (paramsTTS.inactivityPeriod.value > 0 && (performance.now() - lastMessageTime <= paramsTTS.inactivityPeriod.value * 1000 * 60)) {
				return;
			}
			if (paramsTTS['speakPattern'+message.type].value === '') {
				return;
			}
			if(message.message && message.tags.username) {
				const permissions: PermissionsData = {
					vips: paramsTTS.tts_vips.value,
					subs: paramsTTS.tts_subs.value,
					mods: paramsTTS.tts_subs.value,
					all: paramsTTS.tts_all.value,
					users: paramsTTS.tts_users.value
				}
				
				if(!Utils.checkPermissions(permissions, message.tags)) {
					return;
				}
			}
		} else if (message.type === 'whisper') {
			if (paramsTTS['speakPattern'+message.type].value === '') {
				return;
			}
		} else {
			let type:"bits"|"sub"|"raid"|"reward"|"follow"|"poll"|"prediction"|"commercial"|"bingo"|"raffle"|"countdown"|null = getType(message);
			console.log(message.type, message.tags, type);
			
			if(type == "sub" && !paramsTTS.speakSubs.value) return;
			if(type == "reward" && !paramsTTS.speakRewards.value) return;
			if(type == "raid" && !paramsTTS.speakRaids.value) return;
			if(type == "bits" && !paramsTTS.speakBits.value) return;
			if(type == "follow" && !paramsTTS.speakFollow.value) return;
			if(type == "poll" && !paramsTTS.speakPolls.value) return;
			if(type == "prediction" && !paramsTTS.speakPredictions.value) return;
			if(type == "bingo" && !paramsTTS.speakBingos.value) return;
			if(type == "raffle" && !paramsTTS.speakRaffles.value) return;
			if(type == "commercial") return;
			if(type == "countdown") return;

			messageStr = message.tags['system-msg']
			console.log(messageStr);
			
		}
		
		if (messageStr) {
			let spokenText = paramsTTS['speakPattern'+message.type].value.replace('$MESSAGE', messageStr);
			spokenText = spokenText.replace('$USER', user ? user : '');
			if (paramsTTS.removeURL.value) {
				spokenText = spokenText.replace(/(http[s]?|ftp):[^ ]*/g, paramsTTS.replaceURL.value);
			}	
	
			spokenText = spokenText.substring(0, paramsTTS.maxLength.value || Number.MAX_VALUE);
			if (paramsTTS.ttsRemoveEmotes) {
				spokenText = TwitchUtils.parseEmotes(spokenText, undefined, true, true)[0].value;
			}	
			this.speakText(user, spokenText, message);
		}	
	}	

	private async speakText(user: string | undefined, messageStr: string, message:IRCEventDataList.Message|IRCEventDataList.Highlight|IRCEventDataList.Whisper):Promise<void> {
		if (!this.enabled) {
			return;
		}			
		const paramsTTS = StoreProxy.store.state.params.tts;
		
		const mess = new SpeechSynthesisUtterance(messageStr);
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

		let index = this.pendingMessages.findIndex(v => v.message.tags.id === messageID);
		if(index > -1) {
			this.pendingMessages.splice(index, 1);
		}
	}

}
