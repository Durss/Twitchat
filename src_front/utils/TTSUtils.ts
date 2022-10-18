import { storeChat } from "@/store/chat/storeChat";
import StoreProxy from "@/store/StoreProxy";
import { storeTTS } from "@/store/tts/storeTTS";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { watch } from "vue";
import PublicAPI from "./PublicAPI";
import TwitchatEvent from "./TwitchatEvent";
import Utils from "./Utils";

interface SpokenMessage {
	message: TwitchatDataTypes.ChatMessageTypes,
	date: number,
	id: string,
	force?: boolean,
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
	constructor() {
		this.voices = window.speechSynthesis.getVoices();
		window.speechSynthesis.onvoiceschanged = () => { // in case they are not yet loaded
			this.voices = window.speechSynthesis.getVoices();
		};
		
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
						this.addMessageToQueue(m);
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
						this.addMessageToQueue(m);
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
		if (!value && this._enabled) {
			this.stop();
			this.pendingMessages = [];
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
	 * Reads a message now.
	 * Stops any currently playing message and add it next on the queue
	 * @param message 
	 */
	public readNow(message:TwitchatDataTypes.ChatMessageTypes, id?:string):void {
		if (!this._enabled) return;
		if(id) this.cleanupPrevIDs(id);
		if(!id) id = Utils.getUUID();

		const m:SpokenMessage = {message, id, force:true, date: Date.now()};
		this.pendingMessages.splice(1, 0, m);
		if(this.sTTS.speaking) {
			this.stop();//This triggers the next message play
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
		if(!id) id = Utils.getUUID();
		
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
		if(!id) id = Utils.getUUID();

		const paramsTTS = this.sTTS.params;
		//If requested to only read after a certain inactivity duration and
		//that duration has not passed yet, don't read the message
		if (paramsTTS.inactivityPeriod > 0
		&& (Date.now() - this.lastMessageTime <= paramsTTS.inactivityPeriod * 1000 * 60)) {
			this.lastMessageTime = Date.now();
			return;
		}

		const m:SpokenMessage = {message, id, date: Date.now()};
		if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			if(StoreProxy.tts.params.ttsPerms.users.toLowerCase().split(",").includes(message.user.login.toLowerCase())) {
				m.force = true;
			}
		}

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
	private async parseMessage(message:TwitchatDataTypes.ChatMessageTypes, force?:boolean):Promise<string> {
		const paramsTTS = this.sTTS.params;

		// console.log("Read message type", message.type);
		// console.log(message);

		switch(message.type) {
			case TwitchatDataTypes.TwitchatMessageType.MESSAGE:{
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readMessages && force!==true) return "";

				//Stop there if the user isn't part of the permissions
				if(!Utils.checkPermissions(paramsTTS.ttsPerms, message.user, message.channel_id)) return "";
				//Ignore automoded messages
				if(message.twitch_automod) return "";

				let mess: string = message.message;
				if(paramsTTS.removeEmotes===true) {
					mess = message.message_html.replace(/<[^>]*?>/gi, "");//Remove all HTML tags
				}
				if(paramsTTS.removeURL) {
					mess = Utils.parseURLs(mess, "", paramsTTS.replaceURL);
				}
				if(paramsTTS.maxLength > 0) {
					mess = mess.substring(0, paramsTTS.maxLength);
				}
				let txt = paramsTTS.readMessagePatern.replace(/\{USER\}/gi, message.user.displayName)
				txt = txt.replace(/\{MESSAGE\}/gi, mess)
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.WHISPER: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readWhispers && force!==true) return "";

				//Stop there if the user isn't part of the permissions
				if(!Utils.checkPermissions(paramsTTS.ttsPerms, message.user, message.channel_id)) return "";

				//Don't read our answers
				if(message.user.id === StoreProxy.auth.twitch.user.id) return "";

				let mess: string = message.message;
				if(paramsTTS.removeEmotes===true) {
					mess = message.message_html.replace(/<[^>]*?>/gi, "");//Remove all HTML tags
				}
				if(paramsTTS.removeURL) {
					mess = Utils.parseURLs(mess, "", paramsTTS.replaceURL);
				}
				if(paramsTTS.maxLength > 0) {
					mess = mess.substring(0, paramsTTS.maxLength);
				}
				let txt = paramsTTS.readWhispersPattern.replace(/\{USER\}/gi, message.user.displayName)
				txt = txt.replace(/\{MESSAGE\}/gi, mess)
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.NOTICE: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readNotices && force!==true) return "";

				if(!message.message) return "";

				let mess: string = message.message.replace(/<[^>]*>/gim, "");//Strip HTML tags;
				let txt = paramsTTS.readNoticesPattern.replace(/\{MESSAGE\}/gi, mess);
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readFollow && force!==true) return "";

				let txt = paramsTTS.readFollowPattern.replace(/\{USER\}/gi, message.user.displayName);
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
				if(!message.is_gift) {
					//Stop if didn't ask to read this kind of message
					if(!paramsTTS.readSubs && force!==true) return "";
					
					let txt = paramsTTS.readSubsPattern.replace(/\{USER\}/gi, message.user.displayName);
					txt = txt.replace(/\{MESSAGE\}/gi, message.message ?? "");
					txt = txt.replace(/\{TIER\}/gi, message.tier.toString());
					return txt;
				}else{
					//Stop if didn't ask to read this kind of message
					if(!paramsTTS.readSubgifts && force!==true) return "";
	
					return new Promise((resolve) => {
						let prevCount = (message.gift_recipients?.length ?? 0) + 1;
		
						//Wait a little for potential subgift streak to complete
						const checkComplete = () => {
							let recipients = message.gift_recipients ?? [];
							
							//If count has changed, wait a little there might be more subgifts coming
							if(prevCount != recipients.length) {
								prevCount = recipients.length;
								return;
							}
			
							clearInterval(checkCompleteInterval);

							let txt = paramsTTS.readSubgiftsPattern.replace(/\{USER\}/gi, message.user.displayName);
							txt = txt.replace(/\{RECIPIENTS\}/gi, recipients.map(v=>v.displayName).join(', ').replace(/,\s([^,]*)$/, " and$1"));
							txt = txt.replace(/\{TIER\}/gi, message.tier.toString());
							txt = txt.replace(/\{COUNT\}/gi, recipients.length.toString());
							resolve(txt);
						}
		
						const checkCompleteInterval = setInterval(()=>checkComplete(), 500);
					})
				}
			}

			case TwitchatDataTypes.TwitchatMessageType.CHEER: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readBits && force!==true) return "";

				const bits = message.bits;
				
				//Has enough bits been sent ?
				if(bits < paramsTTS.readBitsMinAmount) return "";
				
				let mess: string = message.message;
				if(paramsTTS.removeEmotes===true) {
					mess = message.message_html.replace(/<[^>]*>/gim, "");//Strip HTML tags;
				}
				let txt = paramsTTS.readBitsPattern.replace(/\{USER\}/gi, message.user.displayName);
				txt = txt.replace(/\{BITS\}/gi, bits.toString());
				txt = txt.replace(/\{MESSAGE\}/gi, mess);
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAID: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readRaids && force!==true) return "";

				let txt = paramsTTS.readRaidsPattern.replace(/\{USER\}/gi, message.user.displayName);
				txt = txt.replace(/\{VIEWERS\}/gi, (message.viewers).toString());
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.REWARD: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readRewards && force!==true) return "";

				let txt = paramsTTS.readRewardsPattern.replace(/\{USER\}/gi, message.user.displayName);
				txt = txt.replace(/\{REWARD_NAME\}/gi, message.reward.title);
				txt = txt.replace(/\{REWARD_DESC\}/gi, message.reward.description);
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.POLL: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readPolls && force!==true) return "";

				let winner = "";
				let max = 0;
				message.choices.forEach(v =>{
					if(v.votes > max) {
						max = v.votes;
						winner = v.label;
					}
				})
				let txt = paramsTTS.readPollsPattern.replace(/\{TITLE\}/gi, message.title);
				txt = txt.replace(/\{WINNER\}/gi, winner);
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.PREDICTION: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readPredictions && force!==true) return "";

				let winner = "";
				message.outcomes.forEach(v =>{
					if(v.id == message.winning_outcome_id) {
						winner = v.label;
					}
				})
				
				let txt = paramsTTS.readPredictionsPattern.replace(/\{TITLE\}/gi, message.title);
				txt = txt.replace(/\{WINNER\}/gi, winner);
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.BINGO: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readBingos && force!==true) return "";

				let txt = paramsTTS.readBingosPattern.replace(/\{WINNER\}/gi, message.user.displayName);
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAFFLE: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readRaffle && force!==true) return "";
				if(!message.raffleData.winners) return "";
				if(message.raffleData.winners.length === 0) return "";

				let txt = paramsTTS.readRafflePattern.replace(/\{WINNER\}/gi, message.raffleData.winners[0].label);
				return txt;
			}
		}
		
		return "";
	}

	/**
	 * Read the next pending message
	 */
	private async readNextMessage():Promise<void> {
		if(this.pendingMessages.length === 0 || !this._enabled) return;

		const message = this.pendingMessages[0];
		let skipMessage = false;

		//Message deleted?
		if(TwitchatDataTypes.DeletableMessageTypes.includes(message.message.type)) {
			const m = message.message as TwitchatDataTypes.MessageChatData;//Cast to one of the deletable types for the sake of typing.Couldn't find a cleaner way
			if(m.deleted == true) skipMessage = true;
		}
		const paramsTTS = this.sTTS.params;
		this.lastMessageTime = Date.now();
		
		//Timeout reached for this message?
		if (paramsTTS.timeout > 0 && Date.now() - message.date > paramsTTS.timeout * 1000 * 60) {
			skipMessage = true;
		}

		if(skipMessage && message.force !== true) {
			//Ignore this message and process the next one
			this.pendingMessages.shift();
			//SetTimeout is here to avoid potential recursion overflow
			//if there are too many expired pending messages
			setTimeout(() => { this.readNextMessage(); }, 0);
			return;
		}
		
		const text = await this.parseMessage(message.message, message.force);
		if(text.length > 0) {
			const voice = this.voices.find(x => x.name == paramsTTS.voice);
			const mess = new SpeechSynthesisUtterance(text);
			mess.rate = paramsTTS.rate;
			mess.pitch = paramsTTS.pitch;
			mess.volume = paramsTTS.volume;
			if(voice) {
				mess.voice = voice;
				mess.lang = voice.lang;
			}
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
		}else{
			this.pendingMessages.shift();
			//SetTimeout is here to avoid potential recursion overflow
			//if there are too many expired pending messages
			setTimeout(() => { this.readNextMessage(); }, 0);
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
				this.pendingMessages.splice(i, 1);
				i--;
			}
		}
	}

}
