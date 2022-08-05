import type { PermissionsData } from "@/types/TwitchatDataTypes";
import IRCClient from "./IRCClient";
import IRCEvent from "./IRCEvent";
import { getType, type IRCEventData, type IRCEventDataList } from "./IRCEventDataTypes";
import type { PubSubDataTypes } from "./PubSubDataTypes";
import type PubSubEvent from "./PubSubEvent";
import StoreProxy from "./StoreProxy";
import TwitchUtils from "./TwitchUtils";
import Utils from "./Utils";

export interface SpokenMessage {
	wroteTime: number,
	voiceMessage: SpeechSynthesisUtterance,
	messageID: string|undefined
}

export default class TTSUtils {

	private static _instance:TTSUtils;

	private enabled:boolean = false;
	private voices:SpeechSynthesisVoice[] = window.speechSynthesis.getVoices();

	private pendingMessages:SpokenMessage[] = [];
	private lastMessageTime:number = performance.now();
	private giftedSubs:any = {}

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
		console.log('enable', enable);
		
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
		const message = e.data as IRCEventDataList.Message|IRCEventDataList.Highlight|IRCEventDataList.Whisper|IRCEventDataList.Notice|IRCEventDataList.PollResult|IRCEventDataList.PredictionResult;
		console.log(message);
		
		this.processMessage(message);
	}

	private replacePattern(pattern: string, messageStr: string, user: string|undefined): string {
		messageStr = pattern.replace('$MESSAGE', messageStr);
		messageStr = messageStr.replace('$USER', user ? user : '');
		return messageStr;
	}

	private processMessage(message:IRCEventDataList.Message|IRCEventDataList.Highlight|IRCEventDataList.Whisper|IRCEventDataList.Notice|IRCEventDataList.PollResult|IRCEventDataList.PredictionResult) {
		const paramsTTS = StoreProxy.store.state.params.tts;
		// const uid:string|undefined = message?.tags['user-id'];
		let user: string|undefined;
		let messageStr: string = message.type === "whisper"? message.params[1] : message.message as string;
		
		if (message.type === 'message') {
			// only speak if inactivity period is reached
			const lastMessageTime = this.lastMessageTime;
			this.lastMessageTime = performance.now();
			user = message?.tags['display-name'];
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
			messageStr = this.replacePattern(paramsTTS['speakPattern'+message.type].value, messageStr, user);
		} else if (message.type === 'whisper') {
			if (paramsTTS['speakPattern'+message.type].value === '') {
				return;
			}
			user = message?.tags['display-name'];
			messageStr = this.replacePattern(paramsTTS['speakPattern'+message.type].value, messageStr, user);
		} else if (message.type === 'notice') {
			if (paramsTTS['speakPattern'+message.type].value === '') {
				return;
			}			
		} else if (message.type === 'poll') {
			if(!paramsTTS.speakPolls.value) return;
			const pollData:IRCEventDataList.PollResult = message as IRCEventDataList.PollResult;
			console.log(pollData, pollData.data, pollData.tags, pollData.winner, pollData['winner']);
			const winner = pollData.data.choices.reduce((prev, elem) => {
				if (elem.channel_points_votes > prev.channel_points_votes) {
					return elem;
				} else {
					return prev;
				}});
			
			messageStr = "Poll result, winner is "+winner.title;
		} else if (message.type === 'prediction') {
			if(!paramsTTS.speakPredictions.value) return;
			const predictionData:IRCEventDataList.PredictionResult = message as IRCEventDataList.PredictionResult;
			
			const winner = predictionData.data.outcomes.find(pred => pred.id === predictionData.data.winning_outcome_id);
			if (winner) {
				messageStr = "Prediction result, correct answer is "+winner.title;
			}
	 	} else {
			let type:"bits"|"sub"|"raid"|"reward"|"follow"|"poll"|"prediction"|"commercial"|"bingo"|"raffle"|"countdown"|"cooldown"|null = getType(message);
			messageStr = message.tags['system-msg']
			console.log(message.type, message.tags, type);
			
			if(type == "sub") {
				if (!paramsTTS.speakSubs.value) return;
				
				if(message.methods?.prime) {
					messageStr = ""+message.username+" subscribed with Prime";
				} else if (message.recipient) { // subgift
					const value = parseInt(message.methods?.plan!)/1000;
					if (message.username && !(message.username in this.giftedSubs)) {
						this.giftedSubs[message.username] = 1;
						setTimeout(() => {
							console.log(this.giftedSubs[message.username!]);
							
							if(this.giftedSubs[message.username!] > 1) {
								messageStr = ""+message.username+" gifted "+(this.giftedSubs[message.username!])+" Tier "+value;
							} else {
								messageStr = ""+message.username+" gifted a Tier "+value+" to "+message.recipient;
							}
							delete this.giftedSubs[message.username!];
							this.speakText(messageStr, message.tags.id);
						}, 5000);
					} else if (message.username) {
						
						this.giftedSubs[message.username]++;
						console.log(this.giftedSubs[message.username!]);
					} else {
						// nothing
					}
					return;
				} else if (message.tags['message-type'] == "giftpaidupgrade") {
					messageStr = ""+message.username+" is continuing the Gift Sub they got from "+message.sender;
				} else { // sub
					const value = parseInt(message.methods?.plan!)/1000;
					messageStr = ""+message.username+" subscribed at Tier "+value;
				}
			}
			else if(type == "reward") {
				if(!paramsTTS.speakRewards.value) return;
				const localObj = message.reward as PubSubDataTypes.RewardData;				
				messageStr = localObj.redemption.user.display_name+" redeemed the reward "+localObj.redemption.reward.title;
			}
			else if(type == "raid") {
				if (!paramsTTS.speakRaids.value) return;
				messageStr = ""+message.username+" is raiding with a party of "+message.viewers+".";
			}
			else if(type == "bits") {
				if(!paramsTTS.speakBits.value) return;
				messageStr = ""+message.tags.username+" sent "+message.tags.bits+" bits";
			}
			else if(type == "follow") {
				if(!paramsTTS.speakFollow.value) return;
				messageStr = ""+message.username+" followed your channel!";
			}
			else if(type == "bingo") {
				if(!paramsTTS.speakBingos.value) return;
				messageStr = "";
			}
			else if(type == "raffle"){
				if(!paramsTTS.speakRaffles.value) return;
				messageStr = "";
			}
			else if(type == "commercial") return;
			else if(type == "countdown") return;

			console.log(type, messageStr);
		}
		
		if (messageStr) {
			if (paramsTTS.removeURL.value) {
				messageStr = messageStr.replace(/(http[s]?|ftp):[^ ]*/g, paramsTTS.replaceURL.value);
			}	
	
			messageStr = messageStr.substring(0, paramsTTS.maxLength.value || Number.MAX_VALUE);
			if (paramsTTS.ttsRemoveEmotes) {
				messageStr = TwitchUtils.parseEmotes(messageStr, undefined, true, true)[0].value;
			}	
			this.speakText(messageStr, message.tags.id);
		}	
	}	

	private async speakText(messageStr: string, messageID:string|undefined):Promise<void> {
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
			this.pendingMessages.push({wroteTime: performance.now(), voiceMessage: mess, messageID: messageID});
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

		let index = this.pendingMessages.findIndex(v => v.messageID === messageID);
		if(index > -1) {
			this.pendingMessages.splice(index, 1);
		}
	}

}
