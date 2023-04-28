import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TwitchatEvent from "../events/TwitchatEvent";
import PublicAPI from "./PublicAPI";
import Utils from "./Utils";

interface SpokenMessage {
	message?: TwitchatDataTypes.ChatMessageTypes;
	text?:string;
	date: number;
	id: string;
	force?: boolean;
}

export default class TTSUtils {

	public static placeholderMessages:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderNotices:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderTimeouts:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderBans:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderUnbans:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderFollows:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderSubs:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderSubgifts:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderRaids:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderRewards:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderBits:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderPolls:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderPredictions:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderRaffles:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderBingo:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholder1stMessageToday:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholder1stTimeChatters:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderAutomod:TwitchatDataTypes.PlaceholderEntry[];

	private static _instance:TTSUtils;

	private _enabled:boolean = false;
	private voices:SpeechSynthesisVoice[] = [];
	private pendingMessages:SpokenMessage[] = [];
	private lastMessageTime:number = 0;
	private stopTimeout:number = -1;
	private readComplete:boolean = false;

	/***********
	* HANDLERS *
	************/
	constructor() {
		this.initialize()
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
	public stop(clearQueue:boolean = false):void {
		if(clearQueue) {
			this.pendingMessages = [];
		}
		window.speechSynthesis.cancel();

		//This is a shit workaround a change in browsers behavior.
		//Before this, when calling "speechSynthesis.cancel()" the
		//"onend" event was fired which was doing necessary things
		//for proper twitchat behavior.
		//For some reasong it doesn't anymore (at least on Vivaldi)
		//Here we check if reading completed or not after a short
		//delay, if not, we execute necessary things.
		setTimeout(()=> {
			if(!this.readComplete) {
				this.onReadComplete();
			}
		}, 100);
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
		if(StoreProxy.tts.speaking) {
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
	public readNext(text: string, id?:string):void {
		if (!this._enabled) return;
		if(id) this.cleanupPrevIDs(id);
		if(!id) id = Utils.getUUID();

		const m:SpokenMessage = {text, id, date: Date.now()};
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

		const paramsTTS = StoreProxy.tts.params;
		//If requested to only read after a certain inactivity duration and
		//that duration has not passed yet, don't read the message
		if (paramsTTS.inactivityPeriod > 0
		&& (Date.now() - this.lastMessageTime <= paramsTTS.inactivityPeriod * 1000 * 60)) {
			this.lastMessageTime = Date.now();
			return;
		}

		const m:SpokenMessage = {message, id, date: Date.now()};
		if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			if(StoreProxy.tts.params.ttsPerms.usersAllowed.includes(message.user.login.toLowerCase())) {
				m.force = true;
			}
			if(StoreProxy.tts.params.ttsPerms.usersRefused.includes(message.user.login.toLowerCase())) {
				return;
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
	private initialize():void {
		this.voices = window.speechSynthesis.getVoices();
		window.speechSynthesis.onvoiceschanged = () => { // in case they are not yet loaded
			this.voices = window.speechSynthesis.getVoices();
		};
		
		PublicAPI.instance.addEventListener(TwitchatEvent.STOP_TTS, ()=> {
			this.stop();
		});

		TTSUtils.placeholderMessages = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"MESSAGE", descKey:"tts.placeholders.message" },
		];

		TTSUtils.placeholderNotices = [
			{ tag:"MESSAGE", descKey:"tts.placeholders.message" },
		];

		TTSUtils.placeholderFollows = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
		];

		TTSUtils.placeholderSubs = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"TIER", descKey:"tts.placeholders.sub_tier" },
			{ tag:"MESSAGE", descKey:"tts.placeholders.message" },
		];

		TTSUtils.placeholderSubgifts = [
			{ tag:"USER", descKey:"tts.placeholders.sub_gifter" },
			{ tag:"TIER", descKey:"tts.placeholders.sub_tier" },
			{ tag:"COUNT", descKey:"tts.placeholders.subgift_count" },
			{ tag:"RECIPIENTS", descKey:"tts.placeholders.subgift_recipients" },
		];

		TTSUtils.placeholderRaids = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"VIEWERS", descKey:"tts.placeholders.viewers_count" },
		];

		TTSUtils.placeholderRewards = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"REWARD_NAME", descKey:"tts.placeholders.reward_name" },
			{ tag:"REWARD_DESC", descKey:"tts.placeholders.reward_description" },
		];

		TTSUtils.placeholderBits = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"BITS", descKey:"tts.placeholders.bits_amount" },
			{ tag:"MESSAGE", descKey:"tts.placeholders.message" },
		];

		TTSUtils.placeholderPolls = [
			{ tag:"TITLE", descKey:"tts.placeholders.poll_title" },
			{ tag:"WINNER", descKey:"tts.placeholders.winning_choice" },
		];

		TTSUtils.placeholderPredictions = [
			{ tag:"TITLE", descKey:"tts.placeholders.prediction_title" },
			{ tag:"WINNER", descKey:"tts.placeholders.winning_choice" },
		];

		TTSUtils.placeholderRaffles = [
			{ tag:"WINNER", descKey:"tts.placeholders.winning_user" },
		];

		TTSUtils.placeholderBingo = [
			{ tag:"WINNER", descKey:"tts.placeholders.winning_user" },
		];

		TTSUtils.placeholder1stTimeChatters = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"MESSAGE", descKey:"tts.placeholders.message" },
		];

		TTSUtils.placeholder1stMessageToday = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"MESSAGE", descKey:"tts.placeholders.message" },
		];

		TTSUtils.placeholderAutomod = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"MESSAGE", descKey:"tts.placeholders.message" },
		];

		TTSUtils.placeholderBans = 
		TTSUtils.placeholderUnbans = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
		];

		TTSUtils.placeholderTimeouts = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"DURATION", descKey:"tts.placeholders.timeout" },
		];
	}

	/**
	 * Parse a message and add it to the queue
	 * 
	 * @param message 
	 * @returns 
	 */
	private async parseMessage(message:TwitchatDataTypes.ChatMessageTypes, force?:boolean):Promise<string> {
		const paramsTTS = StoreProxy.tts.params;

		// console.log("Read message type", message.type);
		// console.log(message);

		switch(message.type) {
			case TwitchatDataTypes.TwitchatMessageType.MESSAGE:{
				const is_automod = paramsTTS.readAutomod == true && (message.twitch_automod != undefined || message.automod != undefined);
				const is_firstToday = paramsTTS.read1stMessageToday === true && message.todayFirst === true;
				const is_1stTimeChatter = paramsTTS.read1stTimeChatters === true && message.twitch_isFirstMessage === true;
				const canRead = (paramsTTS.readMessages && message.automod == undefined && message.twitch_automod == undefined)
							|| is_firstToday
							|| is_1stTimeChatter
							|| is_automod;
					
				if(is_firstToday || is_1stTimeChatter || is_automod) {
					force = true;
				}
				
				//Stop if didn't ask to read this kind of message
				if(!canRead && force !== true) return "";

				//Stop there if the user isn't part of the permissions and message isn't forced
				if(force !== true && !await Utils.checkPermissions(paramsTTS.ttsPerms, message.user, message.channel_id)) return "";

				let mess: string = message.message;
				if(paramsTTS.removeEmotes===true) {
					mess = Utils.stripHTMLTags(message.message_html);
				}
				if(paramsTTS.removeURL) {
					mess = Utils.parseURLs(mess, "", paramsTTS.replaceURL);
				}
				if(paramsTTS.maxLength > 0) {
					mess = mess.substring(0, paramsTTS.maxLength);
				}
				if(mess.trim().length == 0) return "";//Avoids reading empty message
				
				let pattern	= paramsTTS.readMessagePatern;
				if(!force) {
					if(message.twitch_automod)				pattern = paramsTTS.readAutomodPattern;
					else if(message.automod)				pattern = paramsTTS.readAutomodPattern;
					else if(message.twitch_isFirstMessage)	pattern = paramsTTS.read1stTimeChattersPattern;
					else if(message.todayFirst)				pattern = paramsTTS.read1stMessageTodayPattern;
				}

				let txt = pattern.replace(/\{USER\}/gi, message.user.displayName)
				txt = txt.replace(/\{MESSAGE\}/gi, mess)
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.WHISPER: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readWhispers && force!==true) return "";

				//Stop there if the user isn't part of the permissions
				if(!await Utils.checkPermissions(paramsTTS.ttsPerms, message.user, message.channel_id)) return "";

				//Don't read our answers
				if(message.user.id === StoreProxy.auth.twitch.user.id) return "";

				let mess: string = message.message;
				if(paramsTTS.removeEmotes===true) {
					mess = Utils.stripHTMLTags(message.message_html);
				}
				if(paramsTTS.removeURL) {
					mess = Utils.parseURLs(mess, "", paramsTTS.replaceURL);
				}
				if(paramsTTS.maxLength > 0) {
					mess = mess.substring(0, paramsTTS.maxLength);
				}
				if(mess.trim().length == 0) return "";//Avoids reading empty message
				let txt = paramsTTS.readWhispersPattern.replace(/\{USER\}/gi, message.user.displayName)
				txt = txt.replace(/\{MESSAGE\}/gi, mess)
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.NOTICE: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readNotices && force!==true) return "";

				if(!message.message) return "";

				const mess: string = Utils.stripHTMLTags(message.message);
				if(mess.trim().length == 0) return "";//Avoids reading empty message
				const txt = paramsTTS.readNoticesPattern.replace(/\{MESSAGE\}/gi, mess);
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readFollow && force!==true) return "";

				const txt = paramsTTS.readFollowPattern.replace(/\{USER\}/gi, message.user.displayName);
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
							const recipients = message.gift_recipients ?? [];
							
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
					mess = Utils.stripHTMLTags(message.message_html);
				}
				if(mess.trim().length == 0) return "";//Avoids reading empty message
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
					if(v.id == message.winner?.id) {
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

				const txt = paramsTTS.readBingosPattern.replace(/\{WINNER\}/gi, message.user.displayName);
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAFFLE: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readRaffle && force!==true) return "";
				if(!message.raffleData.winners) return "";
				if(message.raffleData.winners.length === 0) return "";

				const txt = paramsTTS.readRafflePattern.replace(/\{WINNER\}/gi, message.raffleData.winners[0].label);
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.BAN: {
				//Stop if didn't ask to read this kind of message
				if(!message.duration_s && !paramsTTS.readBans && force!==true) return "";
				if(message.duration_s && !paramsTTS.readTimeouts && force!==true) return "";
				let txt = "";

				if(message.duration_s) {
					txt = paramsTTS.readTimeoutsPattern.replace(/\{USER\}/gi, message.user.displayName);
					txt = txt.replace(/\{DURATION\}/gi, message.duration_s.toString());
				}else{
					txt = paramsTTS.readBansPattern.replace(/\{USER\}/gi, message.user.displayName);
				}
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.UNBAN: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readUnbans && force!==true) return "";
				let txt = paramsTTS.readUnbansPattern.replace(/\{USER\}/gi, message.user.displayName);
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
		if(message.message) {
			if(TwitchatDataTypes.DeletableMessageTypes.includes(message.message.type)) {
				const m = message.message as TwitchatDataTypes.MessageChatData;//Cast to one of the deletable types for the sake of typing. Couldn't find a cleaner way to achieve that :(
				if(m.deleted == true) skipMessage = true;
			}
		}
		const paramsTTS = StoreProxy.tts.params;
		this.lastMessageTime = Date.now();
		
		//Timeout reached for this message?
		if (paramsTTS.timeout > 0 && Date.now() - message.date > paramsTTS.timeout * 1000 * 60) {
			skipMessage = true;
		}

		if(skipMessage && message.force !== true) {
			//Ignore this message and process the next one
			//SetTimeout is here to avoid potential recursion overflow
			//if there are too many expired pending messages
			setTimeout(() => {
				this.pendingMessages.shift();
				this.readNextMessage();
			}, 0);
			return;
		}
		
		const text = message.message? await this.parseMessage(message.message, message.force) : message.text ?? "";
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
				this.readComplete = false;
				StoreProxy.tts.speaking = true;
			}
			mess.onend = (ev: SpeechSynthesisEvent) => {
				this.onReadComplete();
			}
	
			window.speechSynthesis.speak(mess);
	
			if(paramsTTS.maxDuration > 0) {
				this.stopTimeout = setTimeout(()=> {
					window.speechSynthesis.cancel();
					this.onReadComplete();
				}, paramsTTS.maxDuration * 1000);
			}
		}else{
			//SetTimeout is here to avoid potential recursion overflow
			//if there are too many expired pending messages
			setTimeout(() => {
				this.onReadComplete();
			}, 0);
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

	/**
	 * Called when reading of a message completes or is interrupted
	 */
	private onReadComplete():void {
		this.readComplete = true;
		this.pendingMessages.shift();
		clearTimeout(this.stopTimeout);
		StoreProxy.tts.speaking = false;
		this.readNextMessage();
	}

}
