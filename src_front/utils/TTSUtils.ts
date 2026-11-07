import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { replacePlaceholders } from "./PlaceholderModifiers";
import PublicAPI from "./PublicAPI";
import Utils from "./Utils";

interface SpokenMessage {
	message?: TwitchatDataTypes.ChatMessageTypes;
	text: string;
	date: number;
	id: string;
	force?: boolean;
	reading?: boolean;
	params?: TwitchatDataTypes.TTSVoiceParamsData;
}

export default class TTSUtils {
	public static placeholderMessages: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderNotices: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderTimeouts: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderBans: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderUnbans: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderFollows: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderSubs: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderSubgifts: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderRaids: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderRewards: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderBits: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderPolls: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderChatPolls: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderPredictions: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderRaffles: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderBingo: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholder1stMessageToday: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholder1stTimeChatters: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderMonitored: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderRestricted: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderAutomod: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderKofiTip: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderKofiMerch: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderKofiSub: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderStreamlabsTip: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderStreamlabsMerch: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderStreamlabsPatreon: TwitchatDataTypes.PlaceholderEntry[];
	public static placeholderStreamelementsTip: TwitchatDataTypes.PlaceholderEntry[];

	public voiceList: (
		| { platform: "system"; name: string; id: string; voice: SpeechSynthesisVoice }
		| { platform: "elevenlabs"; name: string; id: string }
	)[] = [];

	private static _instance: TTSUtils;

	private _enabled: boolean = false;
	private _pendingMessages: SpokenMessage[] = [];
	private _lastMessageTime: number = 0;
	private _stopTimeout: number = -1;
	private _readComplete: boolean = false;
	private _currentlyPlayingMessageId: string | null = null;
	private _cancelReadHandler: () => void = () => {};

	/***********
	 * HANDLERS *
	 ************/
	constructor() {
		this.initialize();
	}

	/********************
	 * GETTER / SETTERS *
	 ********************/
	static get instance(): TTSUtils {
		if (!TTSUtils._instance) {
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
	public loadVoiceList(): void {
		//Add system voices
		this.voiceList = window.speechSynthesis
			? window.speechSynthesis.getVoices().map((v) => {
					return {
						platform: "system",
						voice: v,
						id: v.voiceURI,
						name: v.name,
					};
				})
			: [];

		if (window.speechSynthesis) {
			//Sometimes voices are not ready at this point.
			//We'll listen for the "voiceschanged" event to get them later as a fallback
			window.speechSynthesis.onvoiceschanged = () => {
				window.speechSynthesis.getVoices().forEach((v) => {
					//Add voices if missing from list
					if (!this.voiceList.find((w) => w.id == v.voiceURI)) {
						this.voiceList.push({
							platform: "system",
							id: v.voiceURI,
							name: v.name,
							voice: v,
						});
					}
				});
			};
		}

		//Add ElevenLabs voices
		if (StoreProxy.elevenLabs.connected) {
			this.voiceList = this.voiceList.concat(
				StoreProxy.elevenLabs.voiceList.map((v) => {
					return {
						platform: "elevenlabs",
						name: "ElevenLabs - " + (v.name || v.voice_id),
						id: v.voice_id,
					};
				}),
			);
		}

		const paramsTTS = StoreProxy.tts.params;
		if (paramsTTS) {
			if (typeof paramsTTS.voice === "string") {
				paramsTTS.voice = {
					platform: "system",
					id:
						this.voiceList.find((v) => v.id == (paramsTTS.voice as unknown as string))
							?.id || (paramsTTS.voice as string),
				};
			}
		}
	}

	/******************
	 * PUBLIC METHODS *
	 ******************/
	/**
	 * Stops currently playing speech
	 */
	public stop(clearQueue: boolean = false): void {
		if (clearQueue) {
			this._pendingMessages = [];
		}
		this._cancelReadHandler();

		//This is a shit workaround a change in browsers behavior.
		//Before this, when calling "speechSynthesis.cancel()" the
		//"onend" event was fired which was doing necessary things
		//for proper twitchat behavior.
		//For some reason it doesn't anymore (at least on Vivaldi)
		//Here we check if reading completed or not after a short
		//delay, if not, we execute necessary things.
		window.setTimeout(() => {
			if (!this._readComplete) {
				this.onReadComplete();
			}
		}, 100);
	}

	/**
	 * Reads a message now.
	 * Stops any currently playing message and add it next on the queue
	 * @param message
	 */
	public async readNow(
		message: TwitchatDataTypes.ChatMessageTypes,
		id?: string,
		params?: TwitchatDataTypes.TTSVoiceParamsData,
	): Promise<void> {
		if (!this._enabled) return;
		if (id) this.cleanupPrevIDs(id);
		if (!id) id = Utils.getUUID();

		const text = await this.parseMessage(message, true);
		if (text.trim().length === 0) return;

		const m: SpokenMessage = { message, id, params, text, force: true, date: Date.now() };
		this._pendingMessages.splice(1, 0, m);
		if (StoreProxy.tts.speaking) {
			this.stop(); //This triggers the next message play
		} else if (this._pendingMessages.length == 1) {
			void this.readNextMessage();
		}
	}

	/**
	 * Reads a string message after the current one.
	 * @param text
	 */
	public readNext(
		text: string,
		id?: string,
		params?: TwitchatDataTypes.TTSVoiceParamsData,
	): void {
		if (!this._enabled) return;
		if (id) this.cleanupPrevIDs(id);
		if (!id) id = Utils.getUUID();
		if (text.trim().length === 0) return;

		const m: SpokenMessage = { text, id, params, date: Date.now() };
		if (this._pendingMessages.length == 0) {
			this._pendingMessages.push(m);
			void this.readNextMessage();
		} else {
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
	public async addMessageToQueue(
		message: TwitchatDataTypes.ChatMessageTypes,
		id?: string,
		params?: TwitchatDataTypes.TTSVoiceParamsData,
	): Promise<void> {
		if (!this._enabled) return;
		if (id) this.cleanupPrevIDs(id);
		if (!id) id = Utils.getUUID();

		const paramsTTS = StoreProxy.tts.params;
		//If requested to only read after a certain inactivity duration and
		//that duration has not passed yet, don't read the message
		if (
			paramsTTS.inactivityPeriod > 0 &&
			Date.now() - this._lastMessageTime <= paramsTTS.inactivityPeriod * 1000 * 60
		) {
			this._lastMessageTime = Date.now();
			return;
		}
		let force = false;
		if (message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			if (
				StoreProxy.tts.params.ttsPerms.usersAllowed.includes(
					message.user.login.toLowerCase(),
				)
			) {
				force = true;
			}
			if (
				StoreProxy.tts.params.ttsPerms.usersRefused.includes(
					message.user.login.toLowerCase(),
				)
			) {
				return;
			}
		}

		const text = await this.parseMessage(message, force);
		if (text.trim().length === 0) return;

		//Check if message is already scheduled
		const scheduledInstance = this._pendingMessages.find(
			(m) => m.message && m.message.id == message.id,
		);
		if (scheduledInstance) return;

		// For first messages, we wait a little before adding them to the queue
		// to avoid reading messages that are quickly deleted by the user or a bot, or caught by automod
		if (
			message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE &&
			message.twitch_isFirstMessage
		) {
			await Utils.promisedTimeout(2000);
			if (message.deleted) return;
		}

		const m: SpokenMessage = { message, id, text, params, force, date: Date.now() };
		if (this._pendingMessages.length == 0) {
			this._pendingMessages.push(m);
			void this.readNextMessage();
		} else {
			this._pendingMessages.push(m);
		}
	}

	public cancelMessage(message: TwitchatDataTypes.ChatMessageTypes): void {
		const index = this._pendingMessages.findIndex(
			(m) => m.message && m.message.id == message.id,
		);
		if (index !== -1) {
			this._pendingMessages.splice(index, 1);
		}
		if (this._currentlyPlayingMessageId == message.id) {
			this._cancelReadHandler();
		}
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/
	private initialize(): void {
		PublicAPI.instance.addEventListener("SET_STOP_CURRENT_TTS_AUDIO", () => {
			this.stop();
		});

		TTSUtils.placeholderMessages = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{
				tag: "MESSAGE",
				descKey: "tts.placeholders.message",
				example: "I love twitchat very much!",
			},
		];

		TTSUtils.placeholderNotices = [
			{
				tag: "MESSAGE",
				descKey: "tts.placeholders.message",
				example: "I love twitchat very much!",
			},
		];

		TTSUtils.placeholderFollows = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
		];

		TTSUtils.placeholderSubs = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{ tag: "TIER", descKey: "tts.placeholders.sub_tier", example: "prime" },
			{
				tag: "MESSAGE",
				descKey: "tts.placeholders.message",
				example: "I love twitchat very much!",
			},
		];

		TTSUtils.placeholderSubgifts = [
			{ tag: "USER", descKey: "tts.placeholders.sub_gifter", example: "Durss" },
			{ tag: "TIER", descKey: "tts.placeholders.sub_tier", example: "1" },
			{ tag: "COUNT", descKey: "tts.placeholders.subgift_count", example: "10" },
			{
				tag: "RECIPIENTS",
				descKey: "tts.placeholders.subgift_recipients",
				example: "Durssbot, LuckyViewer, sup3rH4ck3r",
			},
		];

		TTSUtils.placeholderRaids = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{ tag: "VIEWERS", descKey: "tts.placeholders.viewers_count", example: "10" },
		];

		TTSUtils.placeholderRewards = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{
				tag: "REWARD_NAME",
				descKey: "tts.placeholders.reward_name",
				example: "Highlight my message",
			},
			{
				tag: "REWARD_DESC",
				descKey: "tts.placeholders.reward_description",
				example: "Highlight your message on chat",
			},
		];

		TTSUtils.placeholderBits = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{ tag: "BITS", descKey: "tts.placeholders.bits_amount", example: "1000" },
			{
				tag: "MESSAGE",
				descKey: "tts.placeholders.message",
				example: "I love twitchat very much!",
			},
		];

		TTSUtils.placeholderPolls = [
			{
				tag: "TITLE",
				descKey: "tts.placeholders.poll_title",
				example: "Do you like twitchat?",
			},
			{ tag: "WINNER", descKey: "tts.placeholders.winning_choice", example: "yes a lot" },
		];

		TTSUtils.placeholderChatPolls = [
			{
				tag: "TITLE",
				descKey: "tts.placeholders.poll_title",
				example: "Do you like twitchat?",
			},
			{ tag: "WINNER", descKey: "tts.placeholders.winning_choice", example: "yes a lot" },
		];

		TTSUtils.placeholderPredictions = [
			{ tag: "TITLE", descKey: "tts.placeholders.prediction_title", example: "Will i win?" },
			{ tag: "WINNER", descKey: "tts.placeholders.winning_choice", example: "yes" },
		];

		TTSUtils.placeholderRaffles = [
			{ tag: "WINNER", descKey: "tts.placeholders.winning_user", example: "Durss" },
		];

		TTSUtils.placeholderBingo = [
			{ tag: "WINNER", descKey: "tts.placeholders.winning_user", example: "Durss" },
		];

		TTSUtils.placeholder1stTimeChatters = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{
				tag: "MESSAGE",
				descKey: "tts.placeholders.message",
				example: "I love twitchat very much!",
			},
		];

		TTSUtils.placeholder1stMessageToday = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{
				tag: "MESSAGE",
				descKey: "tts.placeholders.message",
				example: "I love twitchat very much!",
			},
		];

		TTSUtils.placeholderAutomod = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{
				tag: "MESSAGE",
				descKey: "tts.placeholders.message",
				example: "I love twitchat very much!",
			},
		];

		TTSUtils.placeholderBans = TTSUtils.placeholderUnbans = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
		];

		TTSUtils.placeholderTimeouts = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{ tag: "DURATION", descKey: "tts.placeholders.timeout", example: "300" },
		];

		TTSUtils.placeholderMonitored = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
		];

		TTSUtils.placeholderRestricted = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
		];

		TTSUtils.placeholderKofiTip = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{ tag: "AMOUNT", descKey: "tts.placeholders.donation_amount", example: "150" },
			{
				tag: "MESSAGE",
				descKey: "tts.placeholders.message",
				example: "I love twitchat very much!",
			},
		];

		TTSUtils.placeholderKofiMerch = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{ tag: "AMOUNT", descKey: "tts.placeholders.merch_amount", example: "150" },
			{
				tag: "PRODUCT",
				descKey: "tts.placeholders.merch_product",
				example: "Spongebob underwears",
			},
			{
				tag: "MESSAGE",
				descKey: "tts.placeholders.message",
				example: "I love twitchat very much!",
			},
		];

		TTSUtils.placeholderKofiSub = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{
				tag: "MESSAGE",
				descKey: "tts.placeholders.message",
				example: "I love twitchat very much!",
			},
			{ tag: "TIER", descKey: "tts.placeholders.kofi_tier", example: "Awesome supporter" },
			{ tag: "AMOUNT", descKey: "tts.placeholders.merch_amount", example: "20" },
		];

		TTSUtils.placeholderStreamlabsTip = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{ tag: "AMOUNT", descKey: "tts.placeholders.donation_amount", example: "150" },
			{
				tag: "MESSAGE",
				descKey: "tts.placeholders.message",
				example: "I love twitchat very much!",
			},
		];

		TTSUtils.placeholderStreamlabsMerch = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{
				tag: "PRODUCT",
				descKey: "tts.placeholders.merch_product",
				example: "Spongebob underwear",
			},
			{
				tag: "MESSAGE",
				descKey: "tts.placeholders.message",
				example: "I love twitchat very much!",
			},
		];

		TTSUtils.placeholderStreamlabsPatreon = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{ tag: "AMOUNT", descKey: "tts.placeholders.donation_amount", example: "150" },
		];

		TTSUtils.placeholderStreamelementsTip = [
			{ tag: "USER", descKey: "tts.placeholders.user", example: "Durss" },
			{ tag: "AMOUNT", descKey: "tts.placeholders.donation_amount", example: "150" },
			{
				tag: "MESSAGE",
				descKey: "tts.placeholders.message",
				example: "I love twitchat very much!",
			},
		];

		this.loadVoiceList();
	}

	/**
	 * Parse a message and add it to the queue
	 *
	 * @param message
	 * @returns
	 */
	private async parseMessage(
		message: TwitchatDataTypes.ChatMessageTypes,
		force?: boolean,
	): Promise<string> {
		const paramsTTS = StoreProxy.tts.params;

		// console.log("Read message type", message.type);
		// console.log(message);

		switch (message.type) {
			case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
				const is_automod =
					paramsTTS.readAutomod == true &&
					(message.twitch_automod != undefined || message.automod != undefined);
				const is_firstToday =
					paramsTTS.read1stMessageToday === true && message.todayFirst === true;
				const is_1stTimeChatter =
					paramsTTS.read1stTimeChatters === true &&
					message.twitch_isFirstMessage === true;
				const is_monitored =
					paramsTTS.readMonitored === true && message.twitch_isSuspicious === true;
				const is_restricted =
					paramsTTS.readRestricted === true && message.twitch_isRestricted === true;
				const is_simpleMessage =
					paramsTTS.readMessages &&
					message.automod == undefined &&
					message.twitch_automod == undefined &&
					message.spoiler !== true;
				const canRead =
					is_simpleMessage ||
					is_firstToday ||
					is_1stTimeChatter ||
					is_automod ||
					is_monitored ||
					is_restricted;

				//Stop if didn't ask to read this kind of message
				if (!canRead && !force) return "";

				//Stop there if the user isn't part of the permissions and message isn't forced
				if (
					force !== true &&
					is_simpleMessage &&
					!is_firstToday &&
					!is_1stTimeChatter &&
					!is_automod &&
					!is_monitored &&
					!is_restricted &&
					!(await Utils.checkPermissions(
						paramsTTS.ttsPerms,
						message.user,
						message.channel_id,
					))
				)
					return "";

				let mess = "";
				let chunks = message.message_chunks;
				if (chunks) {
					mess = chunks
						.map((v) => {
							if (v.type == "url") {
								return paramsTTS.replaceURL || v.value;
							}
							if (v.type == "emote" || v.type == "cheermote") {
								return paramsTTS.removeEmotes === true ? "" : v.value;
							}
							return v.value;
						})
						.join("");
				} else {
					mess = message.message;
					if (paramsTTS.removeURL) {
						mess = Utils.parseURLs(mess, "", paramsTTS.replaceURL);
					}
				}
				mess = Utils.stripHTMLTags(mess);
				if (paramsTTS.maxLength > 0) {
					mess = mess.trim().substring(0, paramsTTS.maxLength);
				}

				//Remove unicode emotes
				if (paramsTTS.removeEmotes === true) {
					mess = mess.replace(
						/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
						"",
					);
				}

				if (mess.trim().length == 0) return ""; //Avoids reading empty message

				let pattern = paramsTTS.readMessagePatern;
				if (is_automod) pattern = paramsTTS.readAutomodPattern;
				else if (is_monitored) pattern = paramsTTS.readMonitoredPattern;
				else if (is_restricted) pattern = paramsTTS.readRestrictedPattern;
				else if (is_1stTimeChatter) pattern = paramsTTS.read1stTimeChattersPattern;
				else if (is_firstToday) pattern = paramsTTS.read1stMessageTodayPattern;

				return replacePlaceholders(pattern, {
					USER: message.user.displayNameOriginal,
					MESSAGE: mess,
				});
			}

			case TwitchatDataTypes.TwitchatMessageType.WHISPER: {
				//Stop if didn't ask to read this kind of message
				if (!paramsTTS.readWhispers && force !== true) return "";

				//Stop there if the user isn't part of the permissions
				// if(!await Utils.checkPermissions(paramsTTS.ttsPerms, message.user, message.channel_id)) return "";

				//Don't read our answers
				if (message.user.id === StoreProxy.auth.twitch.user.id) return "";

				let mess: string = message.message;
				if (paramsTTS.removeEmotes === true) {
					mess = Utils.stripHTMLTags(message.message_html);
				}
				if (paramsTTS.removeURL) {
					mess = Utils.parseURLs(mess, "", paramsTTS.replaceURL);
				}
				if (paramsTTS.maxLength > 0) {
					mess = mess.substring(0, paramsTTS.maxLength);
				}
				if (mess.trim().length == 0) return ""; //Avoids reading empty message
				return replacePlaceholders(paramsTTS.readWhispersPattern, {
					USER: message.user.displayNameOriginal,
					MESSAGE: mess,
				});
			}

			case TwitchatDataTypes.TwitchatMessageType.NOTICE: {
				//Stop if didn't ask to read this kind of message
				if (!paramsTTS.readNotices && force !== true) return "";

				if (!message.message) return "";

				const mess: string = Utils.stripHTMLTags(message.message);
				if (mess.trim().length == 0) return ""; //Avoids reading empty message
				return replacePlaceholders(paramsTTS.readNoticesPattern, { MESSAGE: mess });
			}

			case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
				//Stop if didn't ask to read this kind of message
				if (!paramsTTS.readFollow && force !== true) return "";

				return replacePlaceholders(paramsTTS.readFollowPattern, {
					USER: message.user.displayNameOriginal,
				});
			}

			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
				if (!message.is_gift) {
					//Stop if didn't ask to read this kind of message
					if (!paramsTTS.readSubs && force !== true) return "";

					return replacePlaceholders(paramsTTS.readSubsPattern, {
						USER: message.user.displayNameOriginal,
						MESSAGE: message.message ?? "",
						TIER: message.tier.toString(),
					});
				} else {
					//Stop if didn't ask to read this kind of message
					if (!paramsTTS.readSubgifts && force !== true) return "";

					return new Promise((resolve) => {
						let prevCount = (message.gift_recipients?.length ?? 0) + 1;

						//Wait a little for potential subgift streak to complete
						const checkComplete = () => {
							const recipients = message.gift_recipients ?? [];

							//If count has changed, wait a little there might be more subgifts coming
							if (prevCount != recipients.length) {
								prevCount = recipients.length;
								return;
							}

							clearInterval(checkCompleteInterval);

							resolve(
								replacePlaceholders(paramsTTS.readSubgiftsPattern, {
									USER: message.user.displayNameOriginal,
									RECIPIENTS: recipients
										.map((v) => v.displayName)
										.join(", ")
										.replace(/,\s([^,]*)$/, " and$1"),
									TIER: message.tier.toString(),
									COUNT: recipients.length,
								}),
							);
						};

						const checkCompleteInterval = window.setInterval(
							() => checkComplete(),
							500,
						);
					});
				}
			}

			case TwitchatDataTypes.TwitchatMessageType.CHEER: {
				//Stop if didn't ask to read this kind of message
				if (!paramsTTS.readBits && force !== true) return "";

				const bits = message.bits;

				//Has enough bits been sent ?
				if (bits < paramsTTS.readBitsMinAmount) return "";

				let mess: string = message.message || "";
				if (paramsTTS.removeEmotes === true) {
					mess = Utils.stripHTMLTags(message.message_html);
				}
				// if(mess.trim().length == 0) return "";//Avoids reading empty message
				return replacePlaceholders(paramsTTS.readBitsPattern, {
					USER: message.user.displayNameOriginal,
					BITS: bits,
					MESSAGE: mess,
				});
			}

			case TwitchatDataTypes.TwitchatMessageType.RAID: {
				//Stop if didn't ask to read this kind of message
				if (!paramsTTS.readRaids && force !== true) return "";

				return replacePlaceholders(paramsTTS.readRaidsPattern, {
					USER: message.user.displayNameOriginal,
					VIEWERS: message.viewers,
				});
			}

			case TwitchatDataTypes.TwitchatMessageType.REWARD: {
				//Stop if didn't ask to read this kind of message
				if (!paramsTTS.readRewards && force !== true) return "";

				return replacePlaceholders(paramsTTS.readRewardsPattern, {
					USER: message.user.displayNameOriginal,
					REWARD_NAME: message.reward.title,
					REWARD_DESC: message.reward.description,
				});
			}

			case TwitchatDataTypes.TwitchatMessageType.POLL: {
				//Stop if didn't ask to read this kind of message
				if (!paramsTTS.readPolls && force !== true) return "";

				let winner = "";
				let max = 0;
				message.choices.forEach((v) => {
					if (v.votes > max) {
						max = v.votes;
						winner = v.label;
					}
				});
				return replacePlaceholders(paramsTTS.readPollsPattern, {
					TITLE: message.title,
					WINNER: winner,
				});
			}

			case TwitchatDataTypes.TwitchatMessageType.CHAT_POLL: {
				//Stop if didn't ask to read this kind of message
				if (!paramsTTS.readChatPolls && force !== true) return "";

				let winner = "";
				let max = 0;
				message.poll.choices.forEach((v) => {
					if (v.votes > max) {
						max = v.votes;
						winner = v.label;
					}
				});
				return replacePlaceholders(paramsTTS.readChatPollsPattern, {
					TITLE: message.poll.title,
					WINNER: winner,
				});
			}

			case TwitchatDataTypes.TwitchatMessageType.PREDICTION: {
				//Stop if didn't ask to read this kind of message
				if (!paramsTTS.readPredictions && force !== true) return "";

				let winner = "";
				message.outcomes.forEach((v) => {
					if (v.id == message.winner?.id) {
						winner = v.label;
					}
				});

				return replacePlaceholders(paramsTTS.readPredictionsPattern, {
					TITLE: message.title,
					WINNER: winner,
				});
			}

			case TwitchatDataTypes.TwitchatMessageType.BINGO: {
				//Stop if didn't ask to read this kind of message
				if (!paramsTTS.readBingos && force !== true) return "";

				return replacePlaceholders(paramsTTS.readBingosPattern, {
					WINNER: message.user.displayNameOriginal,
				});
			}

			case TwitchatDataTypes.TwitchatMessageType.RAFFLE: {
				//Stop if didn't ask to read this kind of message
				if (!paramsTTS.readRaffle && force !== true) return "";
				if (!message.raffleData.winners) return "";
				if (message.raffleData.winners.length === 0) return "";

				return replacePlaceholders(paramsTTS.readRafflePattern, {
					WINNER: message.raffleData.winners[0]!.label,
				});
			}

			case TwitchatDataTypes.TwitchatMessageType.BAN: {
				//Stop if didn't ask to read this kind of message
				if (!message.duration_s && !paramsTTS.readBans && force !== true) return "";
				if (message.duration_s && !paramsTTS.readTimeouts && force !== true) return "";
				if (message.duration_s) {
					return replacePlaceholders(paramsTTS.readTimeoutsPattern, {
						USER: message.user.displayNameOriginal,
						DURATION: message.duration_s,
					});
				}
				return replacePlaceholders(paramsTTS.readBansPattern, {
					USER: message.user.displayNameOriginal,
				});
			}

			case TwitchatDataTypes.TwitchatMessageType.UNBAN: {
				//Stop if didn't ask to read this kind of message
				if (!paramsTTS.readUnbans && force !== true) return "";
				return replacePlaceholders(paramsTTS.readUnbansPattern, {
					USER: message.user.displayNameOriginal,
				});
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAMLABS: {
				switch (message.eventType) {
					case "donation": {
						//Stop if didn't ask to read this kind of message
						if (!paramsTTS.readStreamlabsTip && force !== true) return "";
						return replacePlaceholders(paramsTTS.readStreamlabsTipPattern, {
							USER: message.userName,
							AMOUNT: message.amountFormatted,
							MESSAGE: message.message,
						});
					}
					case "merch": {
						//Stop if didn't ask to read this kind of message
						if (!paramsTTS.readStreamlabsMerch && force !== true) return "";
						return replacePlaceholders(paramsTTS.readStreamlabsMerchPattern, {
							USER: message.userName,
							PRODUCT: message.product,
							MESSAGE: message.message,
						});
					}
					case "patreon_pledge": {
						//Stop if didn't ask to read this kind of message
						if (!paramsTTS.readStreamlabsPatreon && force !== true) return "";
						return replacePlaceholders(paramsTTS.readStreamlabsPatreonPattern, {
							USER: message.userName,
							AMOUNT: message.amountFormatted,
						});
					}
				}
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS: {
				switch (message.eventType) {
					case "donation": {
						//Stop if didn't ask to read this kind of message
						if (!paramsTTS.readStreamelementsTip && force !== true) return "";
						return replacePlaceholders(paramsTTS.readStreamelementsTipPattern, {
							USER: message.userName,
							AMOUNT: message.amountFormatted,
							MESSAGE: message.message,
						});
					}
				}
			}

			case TwitchatDataTypes.TwitchatMessageType.KOFI: {
				switch (message.eventType) {
					case "donation": {
						//Stop if didn't ask to read this kind of message
						if (!paramsTTS.readKofiTip && force !== true) return "";
						return replacePlaceholders(paramsTTS.readKofiTipPattern, {
							USER: message.userName,
							AMOUNT: message.amountFormatted,
							MESSAGE: message.message,
						});
					}
					case "merch": {
						//Stop if didn't ask to read this kind of message
						if (!paramsTTS.readKofiMerch && force !== true) return "";
						return replacePlaceholders(paramsTTS.readKofiMerchPattern, {
							USER: message.userName,
							AMOUNT: message.amountFormatted,
							PRODUCT: message.products.map((v) => v.name).join(","),
							MESSAGE: message.message,
						});
					}
					case "subscription": {
						//Stop if didn't ask to read this kind of message
						if (!paramsTTS.readKofiSub && force !== true) return "";
						return replacePlaceholders(paramsTTS.readKofiSubPattern, {
							USER: message.userName,
							MESSAGE: message.message,
							TIER: message.tier || "",
							AMOUNT: message.amountFormatted,
						});
					}
				}
			}
		}

		return "";
	}

	/**
	 * Read the next pending message
	 */
	private async readNextMessage(): Promise<void> {
		if (this._pendingMessages.length === 0 || !this._enabled) return;

		const messageEntry = this._pendingMessages[0]!;
		let skipMessage = false;
		//Message deleted?
		if (messageEntry.message) {
			if (TwitchatDataTypes.DeletableMessageTypes.includes(messageEntry.message.type)) {
				const m = messageEntry.message as TwitchatDataTypes.MessageChatData; //Cast to one of the deletable types for the sake of typing. Couldn't find a cleaner way to achieve that :(
				if (m.deleted == true) skipMessage = true;
			}
		}
		const paramsTTS = StoreProxy.tts.params;
		this._lastMessageTime = Date.now();

		//Timeout reached for this message?
		if (
			paramsTTS.timeout > 0 &&
			Date.now() - messageEntry.date > paramsTTS.timeout * 1000 * 60
		) {
			skipMessage = true;
		}

		if (skipMessage && messageEntry.force !== true) {
			//Ignore this message and process the next one
			//SetTimeout is here to avoid potential recursion overflow
			//if there are too many expired pending messages
			window.setTimeout(() => {
				this._pendingMessages.shift();
				void this.readNextMessage();
			}, 0);
			return;
		}

		messageEntry.reading = true;
		const voice = this.voiceList.find(
			(v) => v.id == (messageEntry.params?.voice || paramsTTS.voice.id),
		);
		let fallbackToSystem = false;
		if (voice?.platform == "elevenlabs") {
			this._readComplete = false;
			StoreProxy.tts.setSpeakingState(true);
			try {
				let settings: {
					similarity_boost?: number;
					stability?: number;
					style?: number;
				} = {};
				if (messageEntry.params?.elevenlabs_similarity || paramsTTS.elevenlabs_similarity)
					settings.similarity_boost =
						messageEntry.params?.elevenlabs_similarity ||
						paramsTTS.elevenlabs_similarity;
				if (messageEntry.params?.elevenlabs_stability || paramsTTS.elevenlabs_stability)
					settings.stability =
						messageEntry.params?.elevenlabs_stability || paramsTTS.elevenlabs_stability;
				if (messageEntry.params?.elevenlabs_style || paramsTTS.elevenlabs_style)
					settings.style =
						messageEntry.params?.elevenlabs_style || paramsTTS.elevenlabs_style;
				const audioUrl = await StoreProxy.elevenLabs.read(
					messageEntry.text,
					messageEntry.params?.voice || paramsTTS.voice.id,
					messageEntry.params?.elevenlabs_model || paramsTTS.elevenlabs_model,
					messageEntry.params?.elevenlabs_lang || paramsTTS.elevenlabs_lang,
					settings,
				);
				if (audioUrl) {
					// Create an Audio object and play it
					const audio = new Audio(audioUrl);
					audio.volume = messageEntry.params?.volume || paramsTTS.volume;
					void audio.play();

					// Optionally, clean up the object URL after the audio is done playing
					audio.onended = () => {
						URL.revokeObjectURL(audioUrl);
						this.onReadComplete();
					};
					this._cancelReadHandler = () => {
						audio.pause();
						URL.revokeObjectURL(audioUrl);
						this.onReadComplete();
					};
				} else {
					fallbackToSystem = true;
				}
			} catch (_error) {
				this.onReadComplete();
			}
		}

		if (voice?.platform == "system" || fallbackToSystem) {
			this._currentlyPlayingMessageId = messageEntry.message?.id || null;
			const mess = new SpeechSynthesisUtterance(messageEntry.text);
			mess.rate = messageEntry.params?.rate || paramsTTS.rate;
			mess.pitch = messageEntry.params?.pitch || paramsTTS.pitch;
			mess.volume = messageEntry.params?.volume || paramsTTS.volume;
			if (voice) {
				mess.voice =
					voice?.platform == "system"
						? voice.voice
						: this.voiceList.find((v) => v.platform == "system")?.voice || null;
				mess.lang =
					voice?.platform == "system"
						? voice.voice.lang
						: navigator.language || (<any>navigator)["userLanguage"];
			}
			mess.onstart = (_ev: SpeechSynthesisEvent) => {
				this._readComplete = false;
				StoreProxy.tts.setSpeakingState(true);
			};
			mess.onend = (_ev: SpeechSynthesisEvent) => {
				this.onReadComplete();
			};

			if (window.speechSynthesis) window.speechSynthesis.speak(mess);
			this._cancelReadHandler = () => {
				if (window.speechSynthesis) window.speechSynthesis.cancel();
				this.onReadComplete();
			};
		}

		if (paramsTTS.maxDuration > 0) {
			this._stopTimeout = window.setTimeout(() => {
				if (window.speechSynthesis) window.speechSynthesis.cancel();
				this.onReadComplete();
			}, paramsTTS.maxDuration * 1000);
		}
	}

	/**
	 * Cleans up any existing message with the same ID
	 * @param id
	 */
	private cleanupPrevIDs(id: string): void {
		//Only clean after the first one as it's the one currently playing
		for (let i = 1; i < this._pendingMessages.length; i++) {
			const m = this._pendingMessages[i]!;
			if (m.id === id) {
				this._pendingMessages.splice(i, 1);
				i--;
			}
		}
	}

	/**
	 * Called when reading of a message completes or is interrupted
	 */
	private onReadComplete(): void {
		this._currentlyPlayingMessageId = null;
		this._cancelReadHandler = () => {};
		this._readComplete = true;
		this._pendingMessages.shift();
		clearTimeout(this._stopTimeout);
		StoreProxy.tts.setSpeakingState(false);
		void this.readNextMessage();
	}
}
