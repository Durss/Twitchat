import type { PlaceholderEntry, TTSParamsData } from "@/types/TwitchatDataTypes";
import IRCClient from "./IRCClient";
import IRCEvent from "./IRCEvent";
import { getTwitchatMessageType, TwitchatMessageType, type IRCEventData, type IRCEventDataList } from "./IRCEventDataTypes";
import PubSub from "./PubSub";
import type { PubSubDataTypes } from "./PubSubDataTypes";
import PubSubEvent from "./PubSubEvent";
import StoreProxy from "./StoreProxy";
import TwitchUtils from "./TwitchUtils";
import Utils from "./Utils";


export interface SpokenMessage {
	wroteTime: number,
	voiceMessage: SpeechSynthesisUtterance,
	messageID: string|undefined
}

export default class TTSUtils {

	public static placeholderMessages:PlaceholderEntry[] = [
			{ tag:"USER", desc:"User name" },
			{ tag:"MESSAGE", desc:"User's message" },
		];

	public static placeholderNotices:PlaceholderEntry[] = [
			{ tag:"MESSAGE", desc:"User's message" },
		];

	public static placeholderFollows:PlaceholderEntry[] = [
			{ tag:"USER", desc:"User name" },
		];

	public static placeholderSubs:PlaceholderEntry[] = [
			{ tag:"USER", desc:"User name" },
			{ tag:"TIER", desc:"Sub tier" },
			{ tag:"MESSAGE", desc:"User's message" },
		];

	public static placeholderSubgifts:PlaceholderEntry[] = [
			{ tag:"USER", desc:"Subgifter's name" },
			{ tag:"TIER", desc:"Sub tier" },
			{ tag:"RECIPIENT", desc:"Sub gift recipient" },
		];

	public static placeholderRaids:PlaceholderEntry[] = [
			{ tag:"USER", desc:"User name" },
			{ tag:"VIEWERS", desc:"Sub tier" },
		];

	public static placeholderRewards:PlaceholderEntry[] = [
			{ tag:"USER", desc:"User name" },
			{ tag:"REWARD_NAME", desc:"Reward name" },
			{ tag:"REWARD_DESC", desc:"Reward description" },
		];

	public static placeholderBits:PlaceholderEntry[] = [
			{ tag:"USER", desc:"User name" },
			{ tag:"BITS", desc:"Bits sent" },
			{ tag:"MESSAGE", desc:"User's message" },
		];

	public static placeholderPolls:PlaceholderEntry[] = [
			{ tag:"TITLE", desc:"Poll title" },
			{ tag:"WINNER", desc:"Winning choice" },
		];

	public static placeholderPredictions:PlaceholderEntry[] = [
			{ tag:"TITLE", desc:"Poll title" },
			{ tag:"WINNER", desc:"Winning choice" },
		];

	public static placeholderRaffles:PlaceholderEntry[] = [
			{ tag:"WINNER", desc:"Winning user" },
		];

	public static placeholderBingo:PlaceholderEntry[] = [
			{ tag:"WINNER", desc:"Winning user" },
		];

	private static _instance:TTSUtils;

	private _enabled:boolean = false;
	private voices:SpeechSynthesisVoice[] = [];
	private pendingMessages:SpokenMessage[] = [];
	private lastMessageTime:number = performance.now();
	private stopTimeout:number = -1;

	/********************
	* HANDLERS          *
	********************/
	private addMessageHandler!:(e:IRCEvent)=>void;
	private deleteMessageHandler!:(e:PubSubEvent)=>void;
	
	constructor() {
		this.voices = window.speechSynthesis.getVoices();
		window.speechSynthesis.onvoiceschanged = () => { // in case they are not yet loaded
			this.voices = window.speechSynthesis.getVoices();
		};
		this.addMessageHandler = (e:IRCEvent)=> this.onAddMessage(e);
		this.deleteMessageHandler = (e:PubSubEvent)=> this.onDeleteMessage(e);
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

	/**
	 * Enable/Disable TTS
	 */
	public set enabled(value: boolean) {
		if (value && !this._enabled) {
			PubSub.instance.addEventListener(PubSubEvent.DELETE_MESSAGE, this.deleteMessageHandler);
			IRCClient.instance.addEventListener(IRCEvent.MESSAGE, this.addMessageHandler);
			IRCClient.instance.addEventListener(IRCEvent.WHISPER, this.addMessageHandler);
			IRCClient.instance.addEventListener(IRCEvent.NOTICE, this.addMessageHandler);
			IRCClient.instance.addEventListener(IRCEvent.HIGHLIGHT, this.addMessageHandler);
		} else if (!value && this._enabled) {
			PubSub.instance.removeEventListener(PubSubEvent.DELETE_MESSAGE, this.deleteMessageHandler);
			IRCClient.instance.removeEventListener(IRCEvent.MESSAGE, this.addMessageHandler);
			IRCClient.instance.removeEventListener(IRCEvent.WHISPER, this.addMessageHandler);
			IRCClient.instance.removeEventListener(IRCEvent.NOTICE, this.addMessageHandler);
			IRCClient.instance.removeEventListener(IRCEvent.HIGHLIGHT, this.addMessageHandler);
		}
		this._enabled = value;
	}
	
	
	/******************
	 * PUBLIC METHODS *
	 ******************/

    /**
     * Get voices list
     * 
     * @returns SpeechSynthesisVoice[]
     */
    public getVoices():SpeechSynthesisVoice[] {
		return this.voices;
    }

	/**
	 * Reads a twitchat message
	 * @param message 
	 */
	public read(message: IRCEventDataList.Message) {
		this.processMessage(message);
	}

	/**
	 * Reads a raw string message
	 * 
	 * @param messageStr 
	 * @param messageID 
	 * @returns 
	 */
	public async readText(messageStr: string, messageID?:string):Promise<void> {
		if (!this._enabled || messageStr.length == 0) return;
		
		const paramsTTS = StoreProxy.store.state.ttsParams as TTSParamsData;

		clearTimeout(this.stopTimeout)
		
		const mess = new SpeechSynthesisUtterance(messageStr);
		mess.rate = paramsTTS.rate;
		mess.pitch = paramsTTS.pitch;
		mess.volume = paramsTTS.volume;
		mess.voice = this.voices.find(x => x.name == paramsTTS.voice) || this.voices[0];
		mess.lang = mess.voice.lang;
		mess.onend = (ev: SpeechSynthesisEvent) => {
			let nextMessage = this.pendingMessages.shift();
			if (nextMessage) {
				// check timeout
				if (paramsTTS.timeout === 0 || performance.now() - nextMessage.wroteTime <= paramsTTS.timeout * 1000) {
					window.speechSynthesis.speak(nextMessage.voiceMessage);
				}
			}
		}
		if(paramsTTS.maxDuration > 0) {
			this.stopTimeout = setTimeout(()=> {
				window.speechSynthesis.cancel();
			}, paramsTTS.maxDuration * 1000);
		}

		if (!window.speechSynthesis.speaking) {
			window.speechSynthesis.speak(mess);
		} else {
			this.pendingMessages.push({wroteTime: performance.now(), voiceMessage: mess, messageID: messageID});
		}
		this.lastMessageTime = performance.now();
	}

	private onAddMessage(e:IRCEvent):void {
		const message = e.data as IRCEventData;
		this.processMessage(message);
	}

	private async processMessage(message:IRCEventData):Promise<void> {
		const paramsTTS = StoreProxy.store.state.ttsParams as TTSParamsData;
		const type = getTwitchatMessageType(message);

		// const uid:string|undefined = message?.tags['user-id'];
		const lastMessageTime = this.lastMessageTime;

		//If requested to only read after a certain inactivity duration and
		//that duration has not passed yet, don't read the message
		if (paramsTTS.inactivityPeriod > 0
		&& (performance.now() - lastMessageTime <= paramsTTS.inactivityPeriod * 1000 * 60)) {
			return;
		}

		switch(type) {
			case TwitchatMessageType.MESSAGE:{
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readMessages) return;

				const m = message as IRCEventDataList.Message;
				//Stop there if the user isn't part of the permissions
				if(!Utils.checkPermissions(paramsTTS.ttsPerms, m.tags)) return;
				//Ignore automoded messages
				if(m.automod) return;

				let mess: string = m.message;
				if(paramsTTS.maxLength > 0) {
					mess = mess.substring(0, paramsTTS.maxLength);
				}
				if(paramsTTS.removeEmotes===true) {
					//Allow custom parsing of emotes only if it's a message of ours sent
					//from twitchat to avoid killing performances.
					//When seending a message, the one received back misses lots of info
					//like the "id", in this case a custom ID is given that starts
					//with "00000000"
					const customParsing = m.tags.id?.indexOf("00000000") == 0;
					mess = TwitchUtils.parseEmotes(mess, m.tags["emotes-raw"], true, customParsing).map(elem=>elem.value).join(', ');
				}
				if(paramsTTS.removeURL) {
					mess = Utils.parseURLs(mess, "", paramsTTS.replaceURL);
				}
				let txt = paramsTTS.readMessagePatern.replace(/\{USER\}/gi, m.tags["display-name"] as string)
				txt = txt.replace(/\{MESSAGE\}/gi, mess)
				this.readText(txt, m.tags.id);
				break;
			}

			case TwitchatMessageType.WHISPER: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readWhispers) return;

				const m = message as IRCEventDataList.Whisper;
				//Stop there if the user isn't part of the permissions
				if(!Utils.checkPermissions(paramsTTS.ttsPerms, m.tags)) return;

				let mess: string = m.params[1];
				if(paramsTTS.maxLength > 0) {
					mess = mess.substring(0, paramsTTS.maxLength);
				}
				if(paramsTTS.removeEmotes===true) {
					mess = TwitchUtils.parseEmotes(mess, m.tags["emotes-raw"], true).map(elem=>elem.value).join(', ');
				}
				if(paramsTTS.removeURL) {
					mess = Utils.parseURLs(mess, "", paramsTTS.replaceURL);
				}
				let txt = paramsTTS.readWhispersPattern.replace(/\{USER\}/gi, m.tags["display-name"] as string)
				txt = txt.replace(/\{MESSAGE\}/gi, mess)
				this.readText(txt, m.tags.id);
				break;
			}

			case TwitchatMessageType.BAN:
			case TwitchatMessageType.COMMERCIAL:
			case TwitchatMessageType.LEAVE:
			case TwitchatMessageType.JOIN:
			case TwitchatMessageType.HOST:
			case TwitchatMessageType.NOTICE: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readNotices) return;

				const m = message as IRCEventDataList.Notice;
				if(!m.message) return;

				let mess: string = m.message.replace(/<[^>]*>/gim, "");//Strip HTML tags;
				let txt = paramsTTS.readNoticesPattern.replace(/\{MESSAGE\}/gi, mess);
				this.readText(txt, m.tags.id);
				break;
			}

			case TwitchatMessageType.FOLLOW: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readFollow) return;

				const m = message as IRCEventDataList.Highlight;
				
				let txt = paramsTTS.readFollowPattern.replace(/\{USER\}/gi, m.username as string);
				this.readText(txt, m.tags.id);
				break;
			}

			case TwitchatMessageType.SUB:
			case TwitchatMessageType.SUB_PRIME:
			case TwitchatMessageType.SUBGIFT_UPGRADE: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readSubs) return;

				const m = message as IRCEventDataList.Highlight;
				const tier = TwitchatMessageType.SUB_PRIME? "prime" : (parseInt(m.methods?.plan as string)/1000).toString();
				
				let txt = paramsTTS.readSubsPattern.replace(/\{USER\}/gi, m.username as string);
				txt = txt.replace(/\{MESSAGE\}/gi, m.message ?? "");
				txt = txt.replace(/\{TIER\}/gi, tier);
				this.readText(txt, m.tags.id);
				break;
			}

			case TwitchatMessageType.SUBGIFT: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readSubgifts) return;

				const m = message as IRCEventDataList.Highlight;
				const tier = (parseInt(m.methods?.plan as string)/1000).toString();
				
				let recipients = [m.recipient];
				if(m.subgiftAdditionalRecipents && m.subgiftAdditionalRecipents.length > 0) {
					recipients = recipients.concat(m.subgiftAdditionalRecipents);
				}

				let txt = paramsTTS.readSubgiftsPattern.replace(/\{USER\}/gi, m.tags["display-name"] as string);
				txt = txt.replace(/\{RECIPIENT\}/gi, recipients.join(', ').replace(/,([^,]*)$/, " and$1"));
				txt = txt.replace(/\{TIER\}/gi, tier);
				this.readText(txt, m.tags.id);
				break;
			}

			case TwitchatMessageType.BITS: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readBits) return;

				const m = message as IRCEventDataList.Highlight;
				
				let mess: string = m.message as string;
				if(paramsTTS.removeEmotes===true) {
					//Remove emotes
					mess = TwitchUtils.parseEmotes(mess, m.tags["emotes-raw"], true).map(elem=>elem.value).join(', ');
					//Remove cheermotes
					mess = await TwitchUtils.parseCheermotes(mess, m.tags["room-id"] as string, true);
				}
				let txt = paramsTTS.readBitsPattern.replace(/\{USER\}/gi, m.tags["display-name"] as string);
				txt = txt.replace(/\{BITS\}/gi, (m.tags.bits as number).toString());
				txt = txt.replace(/\{MESSAGE\}/gi, mess);
				this.readText(txt, m.tags.id);
				break;
			}

			case TwitchatMessageType.RAID: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readRaids) return;

				const m = message as IRCEventDataList.Highlight;
				
				let txt = paramsTTS.readRaidsPattern.replace(/\{USER\}/gi, m.username as string);
				txt = txt.replace(/\{VIEWERS\}/gi, (m.viewers as number).toString());
				this.readText(txt, m.tags.id);
				break;
			}

			case TwitchatMessageType.REWARD: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readRewards) return;

				const m = message as IRCEventDataList.Highlight;
				
				const reward = (m.reward as PubSubDataTypes.RewardData).redemption.reward;
				let txt = paramsTTS.readRewardsPattern.replace(/\{USER\}/gi, m.tags["display-name"] as string);
				txt = txt.replace(/\{REWARD_NAME\}/gi, reward.title);
				txt = txt.replace(/\{REWARD_DESC\}/gi, reward.prompt);
				this.readText(txt, m.tags.id);
				break;
			}

			case TwitchatMessageType.POLL: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readPolls) return;

				const m = message as IRCEventDataList.PollResult;
				let winner = "";
				let max = 0;
				m.data.choices.forEach(v =>{
					if(v.votes > max) {
						max = v.votes;
						winner = v.title;
					}
				})
				let txt = paramsTTS.readPollsPattern.replace(/\{TITLE\}/gi, m.data.title);
				txt = txt.replace(/\{WINNER\}/gi, winner);
				this.readText(txt, m.tags.id);
				break;
			}

			case TwitchatMessageType.PREDICTION: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readPredictions) return;

				const m = message as IRCEventDataList.PredictionResult;
				let winner = "";
				m.data.outcomes.forEach(v =>{
					if(v.id == m.data.winning_outcome_id) {
						winner = v.title;
					}
				})
				
				let txt = paramsTTS.readPredictionsPattern.replace(/\{TITLE\}/gi, m.data.title);
				txt = txt.replace(/\{WINNER\}/gi, winner);
				this.readText(txt, m.tags.id);
				break;
			}

			case TwitchatMessageType.BINGO: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readBingos) return;

				const m = message as IRCEventDataList.BingoResult;
				
				let txt = paramsTTS.readBingosPattern.replace(/\{WINNER\}/gi, m.winner?.["display-name"] as string);
				this.readText(txt, m.tags.id);
				break;
			}

			case TwitchatMessageType.RAFFLE: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readRaffle) return;

				const m = message as IRCEventDataList.RaffleResult;
				
				let txt = paramsTTS.readRafflePattern.replace(/\{WINNER\}/gi, m.winner?.["display-name"] as string);
				this.readText(txt, m.tags.id);
				break;
			}
		}
	}

	private onDeleteMessage(e:PubSubEvent):void {
		let messageID = e.data as string;

		let index = this.pendingMessages.findIndex(v => v.messageID === messageID);
		if(index > -1) {
			this.pendingMessages.splice(index, 1);
		}
	}

}
