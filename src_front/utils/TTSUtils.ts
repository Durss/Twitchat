import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TwitchatEvent from "../events/TwitchatEvent";
import PublicAPI from "./PublicAPI";
import Utils from "./Utils";

interface SpokenMessage {
	message?: TwitchatDataTypes.ChatMessageTypes;
	text:string;
	date: number;
	id: string;
	force?: boolean;
	reading?: boolean;
	params?: TwitchatDataTypes.TTSVoiceParamsData;
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
	public static placeholderChatPolls:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderPredictions:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderRaffles:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderBingo:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholder1stMessageToday:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholder1stTimeChatters:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderMonitored:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderRestricted:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderAutomod:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderKofiTip:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderKofiMerch:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderKofiSub:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderStreamlabsTip:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderStreamlabsMerch:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderStreamlabsPatreon:TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderStreamelementsTip:TwitchatDataTypes.PlaceholderEntry[];

	public voiceList:(
			{platform:"system", name:string, id:string, voice:SpeechSynthesisVoice}
			| {platform:"elevenlabs", name:string, id:string}
		)[] = [];

	private static _instance:TTSUtils;

	private _enabled:boolean = false;
	private _pendingMessages:SpokenMessage[] = [];
	private _lastMessageTime:number = 0;
	private _stopTimeout:number = -1;
	private _readComplete:boolean = false;

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
			this._pendingMessages = [];
		}
		this._enabled = value;
	}

	/**
	 * Get avalaible voices
	 */
	public loadVoiceList():void {
		//Add system voices
		this.voiceList = window.speechSynthesis? window.speechSynthesis.getVoices().map(v=>{
			return {
				platform: "system",
				voice: v,
				id: v.voiceURI,
				name: v.name,
			}
		}) : [];

		if(window.speechSynthesis) {
			//Sometimes voices are not ready at this point.
			//We'll listen for the "voiceschanged" event to get them later as a fallback
			window.speechSynthesis.onvoiceschanged = () => {
				window.speechSynthesis.getVoices().forEach(v=> {
					//Add voices if missing from list
					if(!this.voiceList.find(w=>w.id == v.voiceURI)) {
						this.voiceList.push({platform:"system", id:v.voiceURI, name:v.name, voice:v});
					}
				});
			};
		}

		//Add ElevenLabs voices
		if(StoreProxy.elevenLabs.connected) {
			this.voiceList = this.voiceList.concat(StoreProxy.elevenLabs.voiceList.map(v=>{
				return {
					platform: "elevenlabs",
					name: "ElevenLabs - "+(v.name || v.voice_id),
					id: v.voice_id,
				}
			}));
		}


		const paramsTTS = StoreProxy.tts.params;
		if(paramsTTS) {
			if(typeof paramsTTS.voice === "string") {
				paramsTTS.voice = {
					platform: "system",
					id: this.voiceList.find(v=>v.id == paramsTTS.voice as unknown as string)?.id || paramsTTS.voice as string,
				}
			}
		}
	}


	/******************
	 * PUBLIC METHODS *
	 ******************/
	/**
	 * Stops currently playing speech
	 */
	public stop(clearQueue:boolean = false):void {
		if(clearQueue) {
			this._pendingMessages = [];
		}
		if(window.speechSynthesis) window.speechSynthesis.cancel();

		//This is a shit workaround a change in browsers behavior.
		//Before this, when calling "speechSynthesis.cancel()" the
		//"onend" event was fired which was doing necessary things
		//for proper twitchat behavior.
		//For some reasong it doesn't anymore (at least on Vivaldi)
		//Here we check if reading completed or not after a short
		//delay, if not, we execute necessary things.
		window.setTimeout(()=> {
			if(!this._readComplete) {
				this.onReadComplete();
			}
		}, 100);
	}

	/**
	 * Reads a message now.
	 * Stops any currently playing message and add it next on the queue
	 * @param message
	 */
	public async readNow(message:TwitchatDataTypes.ChatMessageTypes, id?:string, params?:TwitchatDataTypes.TTSVoiceParamsData):Promise<void> {
		if (!this._enabled) return;
		if(id) this.cleanupPrevIDs(id);
		if(!id) id = Utils.getUUID();


		const text = await this.parseMessage(message, true);
		if(text.trim().length === 0) return;

		const m:SpokenMessage = {message, id, params, text, force:true, date: Date.now()};
		this._pendingMessages.splice(1, 0, m);
		if(StoreProxy.tts.speaking) {
			this.stop();//This triggers the next message play
		}else
		if(this._pendingMessages.length == 1) {
			this.readNextMessage();
		}
	}

	/**
	 * Reads a string message after the current one.
	 * @param text
	 */
	public readNext(text: string, id?:string, params?:TwitchatDataTypes.TTSVoiceParamsData):void {
		if (!this._enabled) return;
		if(id) this.cleanupPrevIDs(id);
		if(!id) id = Utils.getUUID();
		if(text.trim().length === 0) return;

		const m:SpokenMessage = {text, id, params, date: Date.now()};
		if(this._pendingMessages.length == 0) {
			this._pendingMessages.push(m);
			this.readNextMessage();
		}else{
			this._pendingMessages.splice(1, 0, m);
		}
	}

	/**
	 * Adds a string message to the TTS queue
	 *
	 * @param text
	 * @param id
	 * @returns
	 */
	public async addMessageToQueue(message:TwitchatDataTypes.ChatMessageTypes, id?:string, params?:TwitchatDataTypes.TTSVoiceParamsData):Promise<void> {
		if (!this._enabled) return;
		if(id) this.cleanupPrevIDs(id);
		if(!id) id = Utils.getUUID();

		const paramsTTS = StoreProxy.tts.params;
		//If requested to only read after a certain inactivity duration and
		//that duration has not passed yet, don't read the message
		if (paramsTTS.inactivityPeriod > 0
		&& (Date.now() - this._lastMessageTime <= paramsTTS.inactivityPeriod * 1000 * 60)) {
			this._lastMessageTime = Date.now();
			return;
		}
		let force = false;
		if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			if(StoreProxy.tts.params.ttsPerms.usersAllowed.includes(message.user.login.toLowerCase())) {
				force = true;
			}
			if(StoreProxy.tts.params.ttsPerms.usersRefused.includes(message.user.login.toLowerCase())) {
				return;
			}
		}

		const text = await this.parseMessage(message, force);
		if(text.trim().length === 0) return;

		//Check if message is already scheduled
		const scheduledInstance = this._pendingMessages.find(m => m.message && m.message.id == message.id);
		if(scheduledInstance) return;

		const m:SpokenMessage = {message, id, text, params, force, date: Date.now()};
		if (this._pendingMessages.length == 0) {
			this._pendingMessages.push(m)
			this.readNextMessage();
		} else {
			this._pendingMessages.push(m);
		}
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
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

		TTSUtils.placeholderChatPolls = [
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

		TTSUtils.placeholderMonitored = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
		];

		TTSUtils.placeholderRestricted = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
		];

		TTSUtils.placeholderKofiTip = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"AMOUNT", descKey:"tts.placeholders.donation_amount" },
			{ tag:"MESSAGE", descKey:"tts.placeholders.message" },
		];

		TTSUtils.placeholderKofiMerch = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"AMOUNT", descKey:"tts.placeholders.merch_amount" },
			{ tag:"PRODUCT", descKey:"tts.placeholders.merch_product" },
			{ tag:"MESSAGE", descKey:"tts.placeholders.message" },
		];

		TTSUtils.placeholderKofiSub = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"MESSAGE", descKey:"tts.placeholders.message" },
			{ tag:"TIER", descKey:"tts.placeholders.kofi_tier" },
			{ tag:"AMOUNT", descKey:"tts.placeholders.merch_amount" },
		];

		TTSUtils.placeholderStreamlabsTip = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"AMOUNT", descKey:"tts.placeholders.donation_amount" },
			{ tag:"MESSAGE", descKey:"tts.placeholders.message" },
		];

		TTSUtils.placeholderStreamlabsMerch = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"PRODUCT", descKey:"tts.placeholders.merch_product" },
			{ tag:"MESSAGE", descKey:"tts.placeholders.message" },
		];

		TTSUtils.placeholderStreamlabsPatreon = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"AMOUNT", descKey:"tts.placeholders.donation_amount" },
		];

		TTSUtils.placeholderStreamelementsTip = [
			{ tag:"USER", descKey:"tts.placeholders.user" },
			{ tag:"AMOUNT", descKey:"tts.placeholders.donation_amount" },
			{ tag:"MESSAGE", descKey:"tts.placeholders.message" },
		];

		this.loadVoiceList();
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
				const is_monitored = paramsTTS.readMonitored === true && message.twitch_isSuspicious === true;
				const is_restricted = paramsTTS.readRestricted === true && message.twitch_isRestricted === true;
				const is_simpleMessage = (paramsTTS.readMessages && message.automod == undefined && message.twitch_automod == undefined && message.spoiler !== true);
				const canRead = is_simpleMessage
							|| is_firstToday
							|| is_1stTimeChatter
							|| is_automod
							|| is_monitored
							|| is_restricted;

				//Stop if didn't ask to read this kind of message
				if(!canRead && !force) return "";

				//Stop there if the user isn't part of the permissions and message isn't forced
				if(force !== true
				&& is_simpleMessage
				&& !is_firstToday
				&& !is_1stTimeChatter
				&& !is_automod
				&& !is_monitored
				&& !is_restricted
				&& !await Utils.checkPermissions(paramsTTS.ttsPerms, message.user, message.channel_id)) return "";

				let mess = "";
				let chunks = message.message_chunks;
				if(chunks) {
					mess = chunks.map(v=>{
						if(v.type == "url") {
							return paramsTTS.replaceURL || v.value
						}
						if(v.type == "emote" || v.type == "cheermote") {
							return paramsTTS.removeEmotes===true? "" : v.value;
						}
						return v.value;
					}).join("");
				}else{
					mess = message.message;
					if(paramsTTS.removeURL) {
						mess = Utils.parseURLs(mess, "", paramsTTS.replaceURL);
					}
				}
				mess = Utils.stripHTMLTags(mess);
				if(paramsTTS.maxLength > 0) {
					mess = mess.trim().substring(0, paramsTTS.maxLength);
				}

				//Remove unicode emotes
				if(paramsTTS.removeEmotes===true) {
					mess = mess.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
				}

				if(mess.trim().length == 0) return "";//Avoids reading empty message

				let pattern	= paramsTTS.readMessagePatern;
				if(is_automod)				pattern = paramsTTS.readAutomodPattern;
				else if(is_monitored)		pattern = paramsTTS.readMonitoredPattern;
				else if(is_restricted)		pattern = paramsTTS.readRestrictedPattern;
				else if(is_1stTimeChatter)	pattern = paramsTTS.read1stTimeChattersPattern;
				else if(is_firstToday)		pattern = paramsTTS.read1stMessageTodayPattern;

				let txt = pattern.replace(/\{USER\}/gi, message.user.displayName)
				txt = txt.replace(/\{MESSAGE\}/gi, mess)
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.WHISPER: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readWhispers && force!==true) return "";

				//Stop there if the user isn't part of the permissions
				// if(!await Utils.checkPermissions(paramsTTS.ttsPerms, message.user, message.channel_id)) return "";

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

						const checkCompleteInterval = window.setInterval(()=>checkComplete(), 500);
					})
				}
			}

			case TwitchatDataTypes.TwitchatMessageType.CHEER: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readBits && force!==true) return "";

				const bits = message.bits;

				//Has enough bits been sent ?
				if(bits < paramsTTS.readBitsMinAmount) return "";

				let mess: string = message.message || "";
				if(paramsTTS.removeEmotes===true) {
					mess = Utils.stripHTMLTags(message.message_html);
				}
				// if(mess.trim().length == 0) return "";//Avoids reading empty message
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

			case TwitchatDataTypes.TwitchatMessageType.CHAT_POLL: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readChatPolls && force!==true) return "";

				let winner = "";
				let max = 0;
				message.poll.choices.forEach(v =>{
					if(v.votes > max) {
						max = v.votes;
						winner = v.label;
					}
				})
				let txt = paramsTTS.readChatPollsPattern.replace(/\{TITLE\}/gi, message.poll.title);
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

			case TwitchatDataTypes.TwitchatMessageType.UNBAN: {
				//Stop if didn't ask to read this kind of message
				if(!paramsTTS.readUnbans && force!==true) return "";
				let txt = paramsTTS.readUnbansPattern.replace(/\{USER\}/gi, message.user.displayName);
				return txt;
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAMLABS: {
				switch(message.eventType) {
					case "donation": {
						//Stop if didn't ask to read this kind of message
						if(!paramsTTS.readStreamlabsTip && force!==true) return "";
						let txt = paramsTTS.readStreamlabsTipPattern.replace(/\{USER\}/gi, message.userName);
						txt = txt.replace(/\{AMOUNT\}/gi, message.amountFormatted);
						txt = txt.replace(/\{MESSAGE\}/gi, message.message);
						return txt;
					}
					case "merch": {
						//Stop if didn't ask to read this kind of message
						if(!paramsTTS.readStreamlabsMerch && force!==true) return "";
						let txt = paramsTTS.readStreamlabsMerchPattern.replace(/\{USER\}/gi, message.userName);
						txt = txt.replace(/\{PRODUCT\}/gi, message.product);
						txt = txt.replace(/\{MESSAGE\}/gi, message.message);
						return txt;
					}
					case "patreon_pledge": {
						//Stop if didn't ask to read this kind of message
						if(!paramsTTS.readStreamlabsPatreon && force!==true) return "";
						let txt = paramsTTS.readStreamlabsPatreonPattern.replace(/\{USER\}/gi, message.userName);
						txt = txt.replace(/\{AMOUNT\}/gi, message.amountFormatted);
						return txt;
					}
				}
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS: {
				switch(message.eventType) {
					case "donation": {
						//Stop if didn't ask to read this kind of message
						if(!paramsTTS.readStreamelementsTip && force!==true) return "";
						let txt = paramsTTS.readStreamelementsTipPattern.replace(/\{USER\}/gi, message.userName);
						txt = txt.replace(/\{AMOUNT\}/gi, message.amountFormatted);
						txt = txt.replace(/\{MESSAGE\}/gi, message.message);
						return txt;
					}
				}
			}

			case TwitchatDataTypes.TwitchatMessageType.KOFI: {
				switch(message.eventType) {
					case "donation": {
						//Stop if didn't ask to read this kind of message
						if(!paramsTTS.readKofiTip && force!==true) return "";
						let txt = paramsTTS.readKofiTipPattern.replace(/\{USER\}/gi, message.userName);
						txt = txt.replace(/\{AMOUNT\}/gi, message.amountFormatted);
						txt = txt.replace(/\{MESSAGE\}/gi, message.message);
						return txt;
					}
					case "merch": {
						//Stop if didn't ask to read this kind of message
						if(!paramsTTS.readKofiMerch && force!==true) return "";
						let txt = paramsTTS.readKofiMerchPattern.replace(/\{USER\}/gi, message.userName);
						txt = txt.replace(/\{AMOUNT\}/gi, message.amountFormatted);
						txt = txt.replace(/\{PRODUCT\}/gi, message.products.map(v=>v.name).join(","));
						txt = txt.replace(/\{MESSAGE\}/gi, message.message);
						return txt;
					}
					case "subscription": {
						//Stop if didn't ask to read this kind of message
						if(!paramsTTS.readKofiSub && force!==true) return "";
						let txt = paramsTTS.readKofiSubPattern.replace(/\{USER\}/gi, message.userName);
						txt = txt.replace(/\{MESSAGE\}/gi, message.message);
						txt = txt.replace(/\{TIER\}/gi, message.tier || "");
						txt = txt.replace(/\{AMOUNT\}/gi, message.amountFormatted);
						return txt;
					}
				}
			}
		}

		return "";
	}

	/**
	 * Read the next pending message
	 */
	private async readNextMessage():Promise<void> {
		if(this._pendingMessages.length === 0 || !this._enabled) return;

		const messageEntry = this._pendingMessages[0];
		let skipMessage = false;

		//Message deleted?
		if(messageEntry.message) {
			if(TwitchatDataTypes.DeletableMessageTypes.includes(messageEntry.message.type)) {
				const m = messageEntry.message as TwitchatDataTypes.MessageChatData;//Cast to one of the deletable types for the sake of typing. Couldn't find a cleaner way to achieve that :(
				if(m.deleted == true) skipMessage = true;
			}
		}
		const paramsTTS = StoreProxy.tts.params;
		this._lastMessageTime = Date.now();

		//Timeout reached for this message?
		if (paramsTTS.timeout > 0 && Date.now() - messageEntry.date > paramsTTS.timeout * 1000 * 60) {
			skipMessage = true;
		}

		if(skipMessage && messageEntry.force !== true) {
			//Ignore this message and process the next one
			//SetTimeout is here to avoid potential recursion overflow
			//if there are too many expired pending messages
			window.setTimeout(() => {
				this._pendingMessages.shift();
				this.readNextMessage();
			}, 0);
			return;
		}

		messageEntry.reading = true;
		const voice = this.voiceList.find(v => v.id == (messageEntry.params?.voice || paramsTTS.voice.id));
		let fallbackToSystem = false;
		if(voice?.platform == "elevenlabs") {
			this._readComplete = false;
			StoreProxy.tts.speaking = true;
			try {
				let settings:{
					similarity_boost?:number
					stability?:number
					style?:number
				} = {};
				if(messageEntry.params?.elevenlabs_similarity || paramsTTS.elevenlabs_similarity)	settings.similarity_boost	= messageEntry.params?.elevenlabs_similarity || paramsTTS.elevenlabs_similarity;
				if(messageEntry.params?.elevenlabs_stability || paramsTTS.elevenlabs_stability)		settings.stability			= messageEntry.params?.elevenlabs_stability || paramsTTS.elevenlabs_stability;
				if(messageEntry.params?.elevenlabs_style || paramsTTS.elevenlabs_style)				settings.style				= messageEntry.params?.elevenlabs_style || paramsTTS.elevenlabs_style;
				const audioUrl = await StoreProxy.elevenLabs.read(
									messageEntry.text,
									messageEntry.params?.voice || paramsTTS.voice.id,
									messageEntry.params?.elevenlabs_model || paramsTTS.elevenlabs_model,
									messageEntry.params?.elevenlabs_lang || paramsTTS.elevenlabs_lang,
									settings
								);
				if(audioUrl) {
					// Create an Audio object and play it
					const audio = new Audio(audioUrl);
					audio.volume = messageEntry.params?.volume || paramsTTS.volume;
					audio.play();

					// Optionally, clean up the object URL after the audio is done playing
					audio.onended = () => {
						URL.revokeObjectURL(audioUrl);
						this.onReadComplete();
					};
				}else{
					fallbackToSystem = true;
				}
			}catch(error) {
				this.onReadComplete();
			}
		}

		if(voice?.platform == "system" || fallbackToSystem) {
			const mess = new SpeechSynthesisUtterance(messageEntry.text);
			mess.rate = messageEntry.params?.rate || paramsTTS.rate;
			mess.pitch = messageEntry.params?.pitch || paramsTTS.pitch;
			mess.volume = messageEntry.params?.volume || paramsTTS.volume;
			if(voice) {
				mess.voice = voice?.platform == "system"? voice.voice : this.voiceList.find(v=>v.platform == "system")?.voice || null;
				mess.lang = voice?.platform == "system"? voice.voice.lang : navigator.language || (<any>navigator)['userLanguage'];
			}
			mess.onstart = (ev: SpeechSynthesisEvent) => {
				this._readComplete = false;
				StoreProxy.tts.speaking = true;
			}
			mess.onend = (ev: SpeechSynthesisEvent) => {
				this.onReadComplete();
			}

			if(window.speechSynthesis) window.speechSynthesis.speak(mess);
		}

		if(paramsTTS.maxDuration > 0) {
			this._stopTimeout = window.setTimeout(()=> {
				if(window.speechSynthesis) window.speechSynthesis.cancel();
				this.onReadComplete();
			}, paramsTTS.maxDuration * 1000);
		}
	}

	/**
	 * Cleans up any existing message with the same ID
	 * @param id
	 */
	private cleanupPrevIDs(id:string):void {
		//Only clean after the first one as it's the one currently playing
		for (let i = 1; i < this._pendingMessages.length; i++) {
			const m = this._pendingMessages[i];
			if(m.id === id) {
				this._pendingMessages.splice(i, 1);
				i--;
			}
		}
	}

	/**
	 * Called when reading of a message completes or is interrupted
	 */
	private onReadComplete():void {
		this._readComplete = true;
		this._pendingMessages.shift();
		clearTimeout(this._stopTimeout);
		StoreProxy.tts.speaking = false;
		this.readNextMessage();
	}

}
