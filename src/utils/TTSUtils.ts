import { storeChat } from "@/store/chat/storeChat";
import { storeTTS } from "@/store/tts/storeTTS";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { watch } from "vue";
import { getTwitchatMessageType, TwitchatMessageType, type ActivityFeedData, type IRCEventData, type IRCEventDataList } from "./IRCEventDataTypes";
import PublicAPI from "./PublicAPI";
import PubSub from "./PubSub";
import type { PubSubDataTypes } from "./PubSubDataTypes";
import PubSubEvent from "./PubSubEvent";
import TwitchatEvent from "./TwitchatEvent";
import TwitchUtils from "./TwitchUtils";
import Utils from "./Utils";

interface SpokenMessage {
	message: TwitchatDataTypes.ChatMessageTypes,
	date: number,
	id: string,
}

export default class TTSUtils {

	public static placeholderMessages:TwitchatDataTypes.PlaceholderEntry[] = [
			{ tag:"USER", desc:"User name" },
			{ tag:"MESSAGE", desc:"User's message" },
		];

	public static placeholderNotices:TwitchatDataTypes.PlaceholderEntry[] = [
			{ tag:"MESSAGE", desc:"User's message" },
		];

	public static placeholderFollows:TwitchatDataTypes.PlaceholderEntry[] = [
			{ tag:"USER", desc:"User name" },
		];

	public static placeholderSubs:TwitchatDataTypes.PlaceholderEntry[] = [
			{ tag:"USER", desc:"User name" },
			{ tag:"TIER", desc:"Sub tier" },
			{ tag:"MESSAGE", desc:"User's message" },
		];

	public static placeholderSubgifts:TwitchatDataTypes.PlaceholderEntry[] = [
			{ tag:"USER", desc:"Subgifter's name" },
			{ tag:"TIER", desc:"Sub tier" },
			{ tag:"COUNT", desc:"Sub gift count" },
			{ tag:"RECIPIENTS", desc:"Sub gift recipients" },
		];

	public static placeholderRaids:TwitchatDataTypes.PlaceholderEntry[] = [
			{ tag:"USER", desc:"User name" },
			{ tag:"VIEWERS", desc:"Sub tier" },
		];

	public static placeholderRewards:TwitchatDataTypes.PlaceholderEntry[] = [
			{ tag:"USER", desc:"User name" },
			{ tag:"REWARD_NAME", desc:"Reward name" },
			{ tag:"REWARD_DESC", desc:"Reward description" },
		];

	public static placeholderBits:TwitchatDataTypes.PlaceholderEntry[] = [
			{ tag:"USER", desc:"User name" },
			{ tag:"BITS", desc:"Bits sent" },
			{ tag:"MESSAGE", desc:"User's message" },
		];

	public static placeholderPolls:TwitchatDataTypes.PlaceholderEntry[] = [
			{ tag:"TITLE", desc:"Poll title" },
			{ tag:"WINNER", desc:"Winning choice" },
		];

	public static placeholderPredictions:TwitchatDataTypes.PlaceholderEntry[] = [
			{ tag:"TITLE", desc:"Poll title" },
			{ tag:"WINNER", desc:"Winning choice" },
		];

	public static placeholderRaffles:TwitchatDataTypes.PlaceholderEntry[] = [
			{ tag:"WINNER", desc:"Winning user" },
		];

	public static placeholderBingo:TwitchatDataTypes.PlaceholderEntry[] = [
			{ tag:"WINNER", desc:"Winning user" },
		];

	private static _instance:TTSUtils;

	private _enabled:boolean = false;
	private voices:SpeechSynthesisVoice[] = [];
	private pendingMessages:SpokenMessage[] = [];
	private lastMessageTime:number = 0;
	private stopTimeout:number = -1;
	private idsParsed:{[key:string]:boolean} = {};

	private sTTS = storeTTS();
	private sChat = storeChat();

	/********************
	* HANDLERS          *
	********************/
	private deleteMessageHandler!:(e:PubSubEvent)=>void;
	
	constructor() {
		this.voices = window.speechSynthesis.getVoices();
		window.speechSynthesis.onvoiceschanged = () => { // in case they are not yet loaded
			this.voices = window.speechSynthesis.getVoices();
		};
		
		this.deleteMessageHandler = (e:PubSubEvent)=> this.onDeleteMessage(e);
		
		watch(() => this.sChat.messages, async (value) => {
				//There should be no need to read more than 100 new messages at a time
				//Unless the chat is ultra spammy in which case we wouldn't notice
				//messages are missing from the list anyway...
				const len = this.sChat.messages.length;
				let i = Math.max(0, len - 100);
				for (; i < len; i++) {
					const m = this.sChat.messages[i];
					if(this.idsParsed[m.id as string] !== true) {
						this.idsParsed[m.id as string] = true;
						this.parseMessage(m);
					}
				}
				return;
		});
		
		watch(() => this.sChat.activityFeed, async (value) => {
				//There should be no need to read more than 100 new messages at a time
				//Unless the chat is ultra spammy in which case we wouldn't notice
				//messages are missing from the list anyway...
				const len = this.sChat.activityFeed.length;
				let i = Math.max(0, len - 100);
				for (; i < len; i++) {
					const m = this.sChat.activityFeed[i];
					if(this.idsParsed[m.id as string] !== true) {
						this.idsParsed[m.id as string] = true;
						this.parseMessage(m);
					}
				}
				return;
		});

		PublicAPI.instance.addEventListener(TwitchatEvent.STOP_TTS, ()=> {
			this.stop();
		})
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
		} else if (!value && this._enabled) {
			this.stop();
			this.pendingMessages = [];
			PubSub.instance.removeEventListener(PubSubEvent.DELETE_MESSAGE, this.deleteMessageHandler);
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
     * Stops currently playing speech
     */
    public stop():void {
		window.speechSynthesis.cancel();
    }

	/**
	 * Reads a twitchat message
	 * @param message 
	 */
	public read(message: IRCEventDataList.Message):void {
		this.parseMessage(message);
	}

	/**
	 * Reads a string message now.
	 * Stops any currently playing message and add it next on the queue
	 * @param message 
	 */
	public readNow(message:TwitchatDataTypes.ChatMessageTypes, id?:string):void {
		if (!this._enabled) return;
		if(id) this.cleanupPrevIDs(id);
		if(!id) id = crypto.randomUUID();

		const m:SpokenMessage = {message, id, date: Date.now()};
		this.pendingMessages.splice(1, 0, m);
		if(this.sTTS.speaking) {
			this.stop();
		}else
		if(this.pendingMessages.length == 1) {
			this.readNextMessage();
		}
	}

	/**
	 * Reads a string message after the current one.
	 * @param text 
	 */
	public readNext(message: TwitchatDataTypes.ChatMessageTypes, id?:string):void {
		if (!this._enabled) return;
		if(id) this.cleanupPrevIDs(id);
		if(!id) id = crypto.randomUUID();
		
		const m:SpokenMessage = {message, id, date: Date.now()};
		if(this.pendingMessages.length == 0) {
			this.pendingMessages.push(m);
			this.readNextMessage();
		}else{
			this.pendingMessages.splice(1, 0, m);
		}
	}

	/**
	 * Adds a string message to the TTS queue
	 * 
	 * @param text 
	 * @param id 
	 * @returns 
	 */
	public async addMessageToQueue(message:TwitchatDataTypes.ChatMessageTypes, id?:string):Promise<void> {
		if (!this._enabled) return;
		if(id) this.cleanupPrevIDs(id);
		if(!id) id = crypto.randomUUID();

		const m:SpokenMessage = {message, id, date: Date.now()};

		if (this.pendingMessages.length == 0) {
			this.pendingMessages.push(m)
			this.readNextMessage();
		} else {
			this.pendingMessages.push(m);
		}
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Parse a message and add it to the queue
	 * 
	 * @param message 
	 * @returns 
	 */
	private async parseMessage(message:TwitchatDataTypes.ChatMessageTypes):Promise<void> {
		const paramsTTS = this.sTTS.params;

		// console.log("Read message type", type);
		// console.log(message);

		//If requested to only read after a certain inactivity duration and
		//that duration has not passed yet, don't read the message
		if (paramsTTS.inactivityPeriod > 0
		&& (Date.now() - this.lastMessageTime <= paramsTTS.inactivityPeriod * 1000 * 60)) {
			this.lastMessageTime = Date.now();
			return;
		}
		this.lastMessageTime = Date.now();

		switch(message.type) {
			case TwitchatDataTypes.TwitchatMessageType.MESSAGE:{
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readMessages) return;

				//Stop there if the user isn't part of the permissions
				if(!Utils.checkPermissions(paramsTTS.ttsPerms, m.user)) return;
				//Ignore automoded messages
				if(message.twitch_automod) return;

				let mess: string = message.message;
				if(paramsTTS.removeEmotes===true) {
					mess = message.message_html.replace(/<[>]*?>/gi, "");//Remove all HTML tags
				}
				if(paramsTTS.maxLength > 0) {
					mess = mess.substring(0, paramsTTS.maxLength);
				}
				if(paramsTTS.removeURL) {
					mess = Utils.parseURLs(mess, "", paramsTTS.replaceURL);
				}
				let txt = paramsTTS.readMessagePatern.replace(/\{USER\}/gi, message.user.displayName)
				txt = txt.replace(/\{MESSAGE\}/gi, mess)
				this.addMessageToQueue(txt, message.user.id);
				break;
			}

			case TwitchatMessageType.WHISPER: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readWhispers) return;

				const m = message as IRCEventDataList.Whisper;
				//Stop there if the user isn't part of the permissions
				if(!Utils.checkPermissions(paramsTTS.ttsPerms, m.tags)) return;

				//Don't read our answers
				if(m.isAnswer === true) return;

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
				this.addMessageToQueue(txt, m.tags.id as string);
				break;
			}

			case TwitchatMessageType.BAN:
			case TwitchatMessageType.COMMERCIAL:
			case TwitchatMessageType.LEAVE:
			case TwitchatMessageType.JOIN:
			case TwitchatMessageType.HOST:
			case TwitchatMessageType.ROOM_STATE:
			case TwitchatMessageType.NOTICE: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readNotices) return;

				const m = message as IRCEventDataList.Notice;
				if(!m.message) return;

				let mess: string = m.message.replace(/<[^>]*>/gim, "");//Strip HTML tags;
				let txt = paramsTTS.readNoticesPattern.replace(/\{MESSAGE\}/gi, mess);
				this.addMessageToQueue(txt, m.tags.id as string);
				break;
			}

			case TwitchatMessageType.FOLLOW: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readFollow) return;

				const m = message as IRCEventDataList.Highlight;
				
				let txt = paramsTTS.readFollowPattern.replace(/\{USER\}/gi, m.username as string);
				this.addMessageToQueue(txt, m.tags.id as string);
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
				this.addMessageToQueue(txt, m.tags.id as string);
				break;
			}

			case TwitchatMessageType.SUBGIFT: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readSubgifts) return;

				const m = message as IRCEventDataList.Highlight;
				const tier = (parseInt(m.methods?.plan as string)/1000).toString();
				let prevCount = (m.subgiftAdditionalRecipents?.length ?? 0) + 1;

				//Wait a little for potential subgift streak to complete
				const checkComplete = () => {
					let recipients = [m.recipient];
					if(m.subgiftAdditionalRecipents && m.subgiftAdditionalRecipents.length > 0) {
						recipients = recipients.concat(m.subgiftAdditionalRecipents);
					}
					
					//If count has changed, wait a little there might be more subgifts coming
					if(prevCount != recipients.length) {
						prevCount = recipients.length;
						return;
					}
	
					let txt = paramsTTS.readSubgiftsPattern.replace(/\{USER\}/gi, m.tags["display-name"] as string);
					txt = txt.replace(/\{RECIPIENTS\}/gi, recipients.join(', ').replace(/,\s([^,]*)$/, " and$1"));
					txt = txt.replace(/\{TIER\}/gi, tier);
					txt = txt.replace(/\{COUNT\}/gi, recipients.length.toString());
					this.addMessageToQueue(txt, m.tags.id as string);
					clearInterval(checkCompleteInterval);
				}

				const checkCompleteInterval = setInterval(()=>checkComplete(), 500);
				break;
			}

			case TwitchatMessageType.BITS: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readBits) return;

				const m = message as IRCEventDataList.Highlight;
				const bits = parseInt(m.tags.bits as string);
				
				//Has enough bits been sent ?
				if(bits < paramsTTS.readBitsMinAmount) return;
				
				let mess: string = m.message as string;
				if(paramsTTS.removeEmotes===true) {
					//Remove emotes
					mess = TwitchUtils.parseEmotes(mess, m.tags["emotes-raw"], true).map(elem=>elem.value).join(', ');
					//Remove cheermotes
					mess = await TwitchUtils.parseCheermotes(mess, m.tags["room-id"] as string, true);
				}
				let txt = paramsTTS.readBitsPattern.replace(/\{USER\}/gi, m.tags["display-name"] as string);
				txt = txt.replace(/\{BITS\}/gi, bits.toString());
				txt = txt.replace(/\{MESSAGE\}/gi, mess);
				this.addMessageToQueue(txt, m.tags.id as string);
				break;
			}

			case TwitchatMessageType.RAID: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readRaids) return;

				const m = message as IRCEventDataList.Highlight;
				
				let txt = paramsTTS.readRaidsPattern.replace(/\{USER\}/gi, m.username as string);
				txt = txt.replace(/\{VIEWERS\}/gi, (m.viewers as number).toString());
				this.addMessageToQueue(txt, m.tags.id as string);
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
				this.addMessageToQueue(txt, m.tags.id as string);
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
				this.addMessageToQueue(txt, m.tags.id);
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
				this.addMessageToQueue(txt, m.tags.id);
				break;
			}

			case TwitchatMessageType.BINGO: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readBingos) return;

				const m = message as IRCEventDataList.BingoResult;
				
				let txt = paramsTTS.readBingosPattern.replace(/\{WINNER\}/gi, m.winner as string);
				this.addMessageToQueue(txt, m.tags.id as string);
				break;
			}

			case TwitchatMessageType.RAFFLE: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readRaffle) return;

				const m = message as IRCEventDataList.RaffleResult;
				
				let txt = paramsTTS.readRafflePattern.replace(/\{WINNER\}/gi, m.winner.label);
				this.addMessageToQueue(txt, m.tags.id as string);
				break;
			}
		}
	}

	/**
	 * Called if a message is deleted
	 * Remove it from the queue
	 */
	private onDeleteMessage(e:PubSubEvent):void {
		let messageID = e.data as string;

		let index = this.pendingMessages.findIndex(v => v.id === messageID);
		if(index > -1) {
			this.pendingMessages.splice(index, 1);
		}
	}

	/**
	 * Read the next pending message
	 * @param str 
	 */
	private readNextMessage():void {
		if(this.pendingMessages.length === 0 || !this._enabled) return;

		const message = this.pendingMessages[0];
		const paramsTTS = this.sTTS.params;
		
		if (paramsTTS.timeout > 0 && Date.now() - message.date > paramsTTS.timeout * 1000 * 60) {
			//Timeout reached for this message, ignore it and
			//process the next one
			this.pendingMessages.shift();
			//Settimout is here to avoid potential recursion overflow
			//if there are too many expired pending messages
			setTimeout(() => { this.readNextMessage(); }, 10);
			return;
		}
		
		const mess = new SpeechSynthesisUtterance(message.text);
		mess.rate = paramsTTS.rate;
		mess.pitch = paramsTTS.pitch;
		mess.volume = paramsTTS.volume;
		mess.voice = this.voices.find(x => x.name == paramsTTS.voice) || this.voices[0];
		mess.lang = mess.voice.lang;
		mess.onstart = (ev: SpeechSynthesisEvent) => {
			this.sTTS.speaking = true;
		}
		mess.onend = (ev: SpeechSynthesisEvent) => {
			this.pendingMessages.shift();
			clearTimeout(this.stopTimeout);
			this.sTTS.speaking = false;
			this.readNextMessage();
		}

		window.speechSynthesis.speak(mess);

		if(paramsTTS.maxDuration > 0) {
			this.stopTimeout = setTimeout(()=> {
				window.speechSynthesis.cancel();
			}, paramsTTS.maxDuration * 1000);
		}
	}

	/**
	 * Cleans up any existing message with the same ID
	 * @param id 
	 */
	private cleanupPrevIDs(id:string):void {
		//Only clean after the first one as it's the one currently playing
		for (let i = 1; i < this.pendingMessages.length; i++) {
			const m = this.pendingMessages[i];
			if(m.id === id) {
				console.log("SPLICE", this.pendingMessages[i]);
				this.pendingMessages.splice(i, 1);
				i--;
			}
		}
	}

}
