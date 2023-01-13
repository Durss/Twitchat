import MessengerProxy from "@/messaging/MessengerProxy";
import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { JsonObject } from "type-fest";
import TwitchatEvent from "../../events/TwitchatEvent";
import { TriggerActionHelpers, TriggerMusicTypes, TriggerTypes, type TriggerData, type TriggerTypesValue } from "../../types/TriggerActionDataTypes";
import Config from "../Config";
import DeezerHelper from "../music/DeezerHelper";
import type { SearchTrackItem } from "../music/SpotifyDataTypes";
import SpotifyHelper from "../music/SpotifyHelper";
import OBSWebsocket from "../OBSWebsocket";
import PublicAPI from "../PublicAPI";
import TTSUtils from "../TTSUtils";
import TwitchUtils from "../twitch/TwitchUtils";
import Utils from "../Utils";
import VoicemodWebSocket from "../voice/VoicemodWebSocket";

/**
* Created : 22/04/2022 
*/
export default class TriggerActionHandler {

	private static _instance:TriggerActionHandler;

	private actionsSpool:TwitchatDataTypes.ChatMessageTypes[] = [];
	private userCooldowns:{[key:string]:number} = {};
	private globalCooldowns:{[key:string]:number} = {};
	private currentSpoolGUID = 0;
	private triggers:{[key:string]:TriggerData} = {};
	private lastAnyMessageSent:string = "";

	public emergencyMode:boolean = false;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():TriggerActionHandler {
		if(!TriggerActionHandler._instance) {
			TriggerActionHandler._instance = new TriggerActionHandler();
			TriggerActionHandler._instance.initialize();
		}
		return TriggerActionHandler._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public populate(triggers:{[key:string]:TriggerData}):void {
		this.triggers = triggers;
	}

	public onMessage(message:TwitchatDataTypes.ChatMessageTypes, testMode = false):void {
		if(testMode) {
			this.actionsSpool = [message];
			this.executeNext(testMode);
		}else{
			this.actionsSpool.push(message);
			if(this.actionsSpool.length == 1) {
				this.executeNext();
			}
		}
	}

	public async parseScheduleTrigger(key:string):Promise<boolean> {
		//This fake message is just here to comply with parseSteps() signature.
		//It's actually not used. I could only set the second param as optional
		//but I prefer keeping it mandatory as the only exception to that is this call.
		const fakeMessage:TwitchatDataTypes.MessageNoticeData = { id:"x", date:Date.now(), type:"notice", noticeId:"error", message:"",platform:"twitchat" };
		return await this.parseSteps(key, fakeMessage, false, ++this.currentSpoolGUID, undefined, "schedule");
	}

	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {

	}
	
	/**
	 * Executes the next pending trigger
	 * 
	 * @param testMode 
	 * @returns 
	 */
	private async executeNext(testMode = false):Promise<void>{
		this.currentSpoolGUID ++;
		const message = this.actionsSpool[0];
		if(!message) return;

		// console.log("Execute next", message);

		switch(message.type) {
			case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
				//Only trigger one of "first ever", "first today" or "returning" trigger
				if(message.twitch_isPresentation === true) {
					await this.parseSteps(TriggerTypes.PRESENTATION, message, testMode, this.currentSpoolGUID);
				}else
				if(message.twitch_isFirstMessage === true) {
					await this.parseSteps(TriggerTypes.FIRST_ALL_TIME, message, testMode, this.currentSpoolGUID);
				}else
				if(message.todayFirst === true) {
					await this.parseSteps(TriggerTypes.FIRST_TODAY, message, testMode, this.currentSpoolGUID);
				}else
				if(message.twitch_isReturning === true) {
					await this.parseSteps(TriggerTypes.RETURNING_USER, message, testMode, this.currentSpoolGUID);
				}

				if(message.message) {
					const cmd = message.message.trim().split(" ")[0].toLowerCase();
					await this.parseSteps(TriggerTypes.CHAT_COMMAND, message, testMode, this.currentSpoolGUID, cmd);
				}
				
				if(message.user.id != StoreProxy.auth.twitch.user.id
				|| this.lastAnyMessageSent != message.message) {
					//Only parse this trigger if the message receive isn't sent by us
					//or if the text is different than the last one sent by this trigger
					await this.parseSteps(TriggerTypes.ANY_MESSAGE, message, testMode, this.currentSpoolGUID);
				}
				break;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
				if(await this.parseSteps(TriggerTypes.FOLLOW, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
				if(message.is_gift) {
					if(await this.parseSteps(TriggerTypes.SUBGIFT, message, testMode, this.currentSpoolGUID)) {
						return;
					}
				}else
				if(await this.parseSteps(TriggerTypes.SUB, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.RAID: {
				if(await this.parseSteps(TriggerTypes.RAID, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.REWARD: {
				const id = message.reward.id;
				if(await this.parseSteps(TriggerTypes.REWARD_REDEEM, message, testMode, this.currentSpoolGUID, id)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION: {
				const complete = message.challenge.goal === message.challenge.progress;
				const event = complete? TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE : TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS;
				if(await this.parseSteps(event, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.CHEER: {
				if(await this.parseSteps(TriggerTypes.CHEER, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.PREDICTION: {
				if(await this.parseSteps(TriggerTypes.PREDICTION_RESULT, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.POLL: {
				if(await this.parseSteps(TriggerTypes.POLL_RESULT, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.BINGO: {
				if(await this.parseSteps(TriggerTypes.BINGO_RESULT, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAFFLE: {
				if(await this.parseSteps(TriggerTypes.RAFFLE_RESULT, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.COUNTDOWN: {
				const event = message.countdown.endAt? TriggerTypes.COUNTDOWN_STOP : TriggerTypes.COUNTDOWN_START;
				if(await this.parseSteps(event, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.TIMER: {
				const event = message.started? TriggerTypes.TIMER_START : TriggerTypes.TIMER_STOP;
				if(await this.parseSteps(event, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.BINGO: {
				if(await this.parseSteps(TriggerTypes.BINGO_RESULT, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.CHAT_ALERT: {
				if(await this.parseSteps(TriggerTypes.CHAT_ALERT, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.MUSIC_START:
			case TwitchatDataTypes.TwitchatMessageType.MUSIC_STOP: {
				const event = message.type == TwitchatDataTypes.TwitchatMessageType.MUSIC_START? TriggerTypes.MUSIC_START : TriggerTypes.MUSIC_STOP;
				if(await this.parseSteps(event, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.VOICEMOD: {
				if(await this.parseSteps(TriggerTypes.VOICEMOD, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.SHOUTOUT_TWITCHAT: {
				if(await this.parseSteps(TriggerTypes.SHOUTOUT, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.SHOUTOUT: {
				if(message.received && await this.parseSteps(TriggerTypes.SHOUTOUT_IN, message, testMode, this.currentSpoolGUID)) {
					return;
				}
				if(!message.received && await this.parseSteps(TriggerTypes.SHOUTOUT_OUT, message, testMode, this.currentSpoolGUID)) {
					return;
				}
				break;
			}

			case TwitchatDataTypes.TwitchatMessageType.CHAT_HIGHLIGHT: {
				if(await this.parseSteps(TriggerTypes.HIGHLIGHT_CHAT_MESSAGE, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.OBS_SCENE_CHANGE: {
				if(await this.parseSteps(TriggerTypes.OBS_SCENE, message, testMode, this.currentSpoolGUID, message.sceneName.toLowerCase())) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.OBS_SOURCE_TOGGLE: {
				const event = message.visible? TriggerTypes.OBS_SOURCE_ON : TriggerTypes.OBS_SOURCE_OFF;
				if(await this.parseSteps(event, message, testMode, this.currentSpoolGUID, message.sourceName.toLowerCase())) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.PINNED: {
				if(await this.parseSteps(TriggerTypes.PIN_MESSAGE, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.UNPINNED: {
				if(await this.parseSteps(TriggerTypes.UNPIN_MESSAGE, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.BAN:{
				const event = message.duration_s? TriggerTypes.TIMEOUT : TriggerTypes.BAN
				if(await this.parseSteps(event, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.UNBAN:{
				if(await this.parseSteps(TriggerTypes.UNBAN, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN:
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_APPROACHING:
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_START:
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_PROGRESS:
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_CANCEL:
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COMPLETE:
				{
				const map:Partial<{[key in TwitchatDataTypes.TwitchatMessageStringType]:TriggerTypesValue}> = {}
				map[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN] = TriggerTypes.HYPE_TRAIN_COOLDOWN;
				map[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_APPROACHING] = TriggerTypes.HYPE_TRAIN_APPROACHING;
				map[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_START] = TriggerTypes.HYPE_TRAIN_START;
				map[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_PROGRESS] = TriggerTypes.HYPE_TRAIN_PROGRESS;
				map[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_CANCEL] = TriggerTypes.HYPE_TRAIN_CANCELED;
				map[TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COMPLETE] = TriggerTypes.HYPE_TRAIN_END;
				if(await this.parseSteps(map[message.type]!, message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}


			case TwitchatDataTypes.TwitchatMessageType.NOTICE: {
				switch(message.noticeId) {
					case TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE:{
						if(await this.parseSteps(TriggerTypes.STREAM_INFO_UPDATE, message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE:{
						const m = message as TwitchatDataTypes.MessageEmergencyModeInfo;
						const event = m.enabled? TriggerTypes.EMERGENCY_MODE_START : TriggerTypes.EMERGENCY_MODE_STOP;
						if(await this.parseSteps(event, message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.MOD:{
						if(await this.parseSteps(TriggerTypes.MOD, message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.UNMOD:{
						if(await this.parseSteps(TriggerTypes.UNMOD, message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.VIP:{
						if(await this.parseSteps(TriggerTypes.VIP, message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.UNVIP:{
						if(await this.parseSteps(TriggerTypes.UNVIP, message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE:{
						const m = message as TwitchatDataTypes.MessageShieldMode;
						const event = m.enabled? TriggerTypes.SHIELD_MODE_ON : TriggerTypes.SHIELD_MODE_OFF;
						if(await this.parseSteps(event, message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
				}
				break;
			}
		}

		// console.log("Message not matching any trigger", message);
		this.actionsSpool.shift();
		this.executeNext();
	}


	/**
	 * Executes the steps of the trigger
	 * 
	 * @param eventType 
	 * @param message 
	 * 
	 * @returns true if the trigger was executed
	 */
	private async parseSteps(eventType:string, message:TwitchatDataTypes.ChatMessageTypes, testMode:boolean, guid:number, subEvent?:string, ttsID?:string, autoExecuteNext:boolean = true):Promise<boolean> {
		if(subEvent) eventType += "_"+subEvent
		let trigger:TriggerData = this.triggers[ eventType ];
		
		//Special case for twitchat's ad, generate trigger data
		if(eventType == TriggerTypes.TWITCHAT_AD) {
			let text:string = StoreProxy.chat.botMessages.twitchatAd.message;
			//If no link is found on the message, force it at the begining
			if(!/(^|\s|https?:\/\/)twitchat\.fr($|\s)/gi.test(text)) {
				text = "Checkout twitchat.fr : "+text;
			}
			trigger = {
				enabled:true,
				name:"ad",
				actions:[
					{
						id:Utils.getUUID(),
						type:"chat",
						delay:0,
						text,
					}
				]
			}
		}
		
		if(!trigger || (!trigger.enabled && !testMode) || !trigger.actions || trigger.actions.length == 0) {
			return false;
		}else{
			// console.log("PARSE STEPS", eventType, trigger, message);
			let canExecute = true;

			if(trigger.permissions && trigger.cooldown && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				const key = eventType+"_"+message.user.id;
				const now = Date.now();
				
				//check permissions
				if(!Utils.checkPermissions(trigger.permissions, message.user, message.channel_id)) {
					canExecute = false;
				}else{
					//Apply cooldowns if any
					if(this.globalCooldowns[eventType] > 0 && this.globalCooldowns[eventType] > now) {
						const remaining_s = Utils.formatDuration(this.globalCooldowns[eventType] - now + 1000) + "s";
						canExecute = false;
						if(trigger.cooldown.alert !== false) {
							const text = StoreProxy.i18n.t("global.cooldown", {USER:message.user.login, DURATION:remaining_s});
							MessengerProxy.instance.sendMessage(text, [message.platform], message.channel_id);
						}
					}
					else if(trigger.cooldown.global > 0) this.globalCooldowns[eventType] = now + trigger.cooldown.global * 1000;
	
					if(this.userCooldowns[key] > 0 && this.userCooldowns[key] > now) {
						const remaining_s = Utils.formatDuration(this.userCooldowns[key] - now + 1000) + "s";
						canExecute = false;
						if(trigger.cooldown.alert !== false) {
							const text = StoreProxy.i18n.t("global.cooldown", {USER:message.user.login, DURATION:remaining_s});
							MessengerProxy.instance.sendMessage(text, [message.platform], message.channel_id);
						}
					}
					else if(canExecute && trigger.cooldown.user > 0) this.userCooldowns[key] = now + trigger.cooldown.user * 1000;
				}
			}

			if(testMode) canExecute = true;
			
			if(!trigger || trigger.actions.length == 0) canExecute = false;
			// console.log(trigger);
			// console.log(message);
			// console.log(canExecute);

			if(canExecute) {
				for (let i = 0; i < trigger.actions.length; i++) {
					if(autoExecuteNext && guid != this.currentSpoolGUID) {
						return true;//Stop there, something asked to override the current exec sequence
					}
					const step = trigger.actions[i];
					// console.log("	Parse step", step);
					//Handle OBS action
					if(step.type == "obs") {
						if(step.text) {
							try {
								const text = await this.parseText(eventType, message, step.text as string, subEvent);
								await OBSWebsocket.instance.setTextSourceContent(step.sourceName, text);
							}catch(error) {
								console.error(error);
							}
						}
						if(step.url) {
							try {
								const url = await this.parseText(eventType, message, step.url as string, subEvent);
								// console.log("URL", url);
								await OBSWebsocket.instance.setBrowserSourceURL(step.sourceName, url);
							}catch(error) {
								console.error(error);
							}
						}
						if(step.mediaPath) {
							try {
								let url = await this.parseText(eventType, message, step.mediaPath as string, subEvent, true, true);
								await OBSWebsocket.instance.setMediaSourceURL(step.sourceName, url);
							}catch(error) {
								console.error(error);
							}
						}
			
						if(step.filterName) {
							try {
								await OBSWebsocket.instance.setFilterState(step.sourceName, step.filterName, step.show);
							}catch(error) {
								console.error(error);
							}
						}else{
							let show = step.show;
							//If requesting to show an highlighted message but the message
							//is empty, force source to hide
							if(eventType == TriggerTypes.HIGHLIGHT_CHAT_MESSAGE
							&& message.type == "chat_highlight"
							&& (!message.info.message || message.info.message.length===0)) {
								show = false;
							}
							try {
								await OBSWebsocket.instance.setSourceState(step.sourceName, show);
							}catch(error) {
								console.error(error);
							}
						}
					}else
					
					//Handle Chat action
					if(step.type == "chat") {
						// console.log("CHAT ACTION");
						const text = await this.parseText(eventType, message, step.text as string, subEvent);
						const platforms:TwitchatDataTypes.ChatPlatform[] = [];
						if(message.platform != "twitchat") platforms.push(message.platform);
						// console.log(platforms, text);
						MessengerProxy.instance.sendMessage(text, platforms);
						if(eventType == TriggerTypes.ANY_MESSAGE) {
							this.lastAnyMessageSent = text;
						}
					}else
					
					//Handle highlight action
					if(step.type == "highlight") {
						if(step.show) {
							let text = await this.parseText(eventType, message, step.text as string, subEvent, true);
							let info:TwitchatDataTypes.ChatHighlightInfo = {
								message:text,
								user:message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE? message.user : undefined,
								params:StoreProxy.chat.chatHighlightOverlayParams,
							};
							PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, (info as unknown) as JsonObject)
						}else{
							PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, {})
							StoreProxy.chat.isChatMessageHighlighted = false;
						}
					}else
					
					//Handle TTS action
					if(step.type == "tts" && message) {
						let text = await this.parseText(eventType, message, step.text, subEvent);
						TTSUtils.instance.readNext(text, ttsID ?? eventType);
					}else
					
					//Handle poll action
					if(step.type == "poll") {
						try {
							await TwitchUtils.createPoll(StoreProxy.auth.twitch.user.id,
							step.pollData.title,
							step.pollData.answers.concat(),
							step.pollData.voteDuration * 60,
							step.pollData.pointsPerVote);
						}catch(error:any) {
							const message = error.message ?? error.toString()
							StoreProxy.main.alert(StoreProxy.i18n.t("error.poll_error", {MESSAGE:message}))
						}
					}else
					
					//Handle poll action
					if(step.type == "prediction") {
						try {
							await TwitchUtils.createPrediction(StoreProxy.auth.twitch.user.id,
								step.predictionData.title,
								step.predictionData.answers.concat(),
								step.predictionData.voteDuration * 60);
						}catch(error:any) {
							const message = error.message ?? error.toString()
							StoreProxy.main.alert(StoreProxy.i18n.t("error.prediction_error", {MESSAGE:message}))
						}
					}else
					
					//Handle raffle action
					if(step.type == "raffle") {
						StoreProxy.raffle.startRaffle(JSON.parse(JSON.stringify(step.raffleData)));
					}else
					
					//Handle bingo action
					if(step.type == "bingo") {
						StoreProxy.bingo.startBingo(JSON.parse(JSON.stringify(step.bingoData)));
					}else
					
					//Handle voicemod action
					if(step.type == "voicemod") {
						if(step.voiceID) {
							VoicemodWebSocket.instance.enableVoiceEffect(step.voiceID)
						}
					}else
					
					//Handle sub trigger action
					if(step.type == "trigger") {
						if(step.triggerKey) {
							const trigger = this.triggers[step.triggerKey];
							if(trigger) {
								// console.log("Exect sub trigger", step.triggerKey);
								await this.parseSteps(step.triggerKey, message, testMode, guid, undefined, undefined, false);
							}
						}
					}else
					
					//Handle sub trigger action
					if(step.type == "http") {
						console.log("HTTP CALL");
						const options = {
							method:step.method,
						};
						const url = new URL(step.url);
						for (let i = 0; i < step.queryParams.length; i++) {
							const tag = step.queryParams[i];
							const text = await this.parseText(eventType, message, "{"+tag+"}", subEvent);
							url.searchParams.append(tag.toLowerCase(), text);
						}
						console.log("HTTP CALL > ", url);
						try {
							await fetch(url, options);
						}catch(error) {
							console.error(error);
						}
					}else

					//Handle music actions
					if(step.type == "music") {
						try {
							//Adding a track to the queue
							if(step.musicAction == TriggerMusicTypes.ADD_TRACK_TO_QUEUE) {
								//Convert placeholders if any
								const m = await this.parseText(eventType, message, step.track, subEvent);
								let data:TwitchatDataTypes.MusicTrackData|null = null;
								if(Config.instance.SPOTIFY_CONNECTED) {
									let track:SearchTrackItem|null = null;
									if(/open\.spotify\.com\/track\/.*/gi.test(m)) {
										//Full URL specified, extract the ID from it
										const chunks = m.replace(/https?:\/\//gi,"").split(/\/|\?/gi)
										const id = chunks[2];
										track = await SpotifyHelper.instance.getTrackByID(id);
									}else{
										//No URL given, send earch to API
										track = await SpotifyHelper.instance.searchTrack(m);
									}
									if(track) {
										if(await SpotifyHelper.instance.addToQueue(track.uri)) {
											data = {
												title:track.name,
												artist:track.artists[0].name,
												album:track.album.name,
												cover:track.album.images[0].url,
												duration:track.duration_ms,
												url:track.external_urls.spotify,
											};
										}
									}
								}
								if(Config.instance.DEEZER_CONNECTED) {
									const tracks = await DeezerHelper.instance.searchTracks(m);
									if(tracks) {
										const track = tracks[0];
										DeezerHelper.instance.addToQueue(track);
										data = {
											title:track.title,
											artist:track.artist.name,
											album:track.album.title,
											cover:track.album.cover_medium,
											duration:track.duration,
											url:track.link,
										};
									}
								}

								//A track has been found and added
								if(data) {
									const trigger:TwitchatDataTypes.MessageMusicAddedToQueueData = {
										id:Utils.getUUID(),
										date:Date.now(),
										platform:"twitchat",
										type:TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE,
										track:data,
									}
									PublicAPI.instance.broadcast(TwitchatEvent.TRACK_ADDED_TO_QUEUE, (data as unknown) as JsonObject);
									//Execute "TRACK_ADDED_TO_QUEUE" trigger
									this.parseSteps(TriggerTypes.TRACK_ADDED_TO_QUEUE, trigger, false, guid);

									//The step is requesting to confirm on chat when a track has been added
									if(step.confirmMessage) {
										const messageLoc = message as TwitchatDataTypes.MessageChatData;
										const trigger:TwitchatDataTypes.MessageMusicAddedToQueueData = {
											id:Utils.getUUID(),
											date:Date.now(),
											platform:"twitchat",
											type:TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE,
											track:data,
											message:messageLoc.message,
											user:messageLoc.user,
										}
										//First pass to inject track info
										let chatMessage = await this.parseText(eventType, trigger, step.confirmMessage, subEvent, false);
										//Second pass to inject trigger specifics
										chatMessage = await this.parseText(eventType, message, chatMessage, subEvent);
										MessengerProxy.instance.sendMessage(chatMessage);
									}
								}
							}else
							
							if(step.musicAction == TriggerMusicTypes.NEXT_TRACK) {
								if(Config.instance.SPOTIFY_CONNECTED) {
									SpotifyHelper.instance.nextTrack();
								}
								if(Config.instance.DEEZER_CONNECTED) {
									DeezerHelper.instance.nextTrack();
								}
							}else
							
							if(step.musicAction == TriggerMusicTypes.PAUSE_PLAYBACK) {
								if(Config.instance.SPOTIFY_CONNECTED) {
									SpotifyHelper.instance.pause();
								}
								if(Config.instance.DEEZER_CONNECTED) {
									DeezerHelper.instance.pause();
								}
							}else
							
							if(step.musicAction == TriggerMusicTypes.RESUME_PLAYBACK) {
								if(Config.instance.SPOTIFY_CONNECTED) {
									SpotifyHelper.instance.resume();
								}
								if(Config.instance.DEEZER_CONNECTED) {
									DeezerHelper.instance.resume();
								}
							}else
							
							if(step.musicAction == TriggerMusicTypes.START_PLAYLIST) {
								let m:string = step.playlist;
								if(message.type == "message") {
									m = await this.parseText(eventType, message, m, subEvent);
								}
								if(Config.instance.SPOTIFY_CONNECTED) {
									let id:string|null = null;
									if(/open\.spotify\.com\/playlist\/.*/gi.test(m)) {
										const chunks = m.replace(/https?:\/\//gi,"").split(/\/|\?/gi)
										id = chunks[2];
									}
									const success = await SpotifyHelper.instance.startPlaylist(id, m);
									if(!success) {
										const platforms:TwitchatDataTypes.ChatPlatform[] = [];
										if(message.platform) platforms.push(message.platform);
										MessengerProxy.instance.sendMessage("Playlist not found", platforms);
									}
								}
								// if(Config.instance.DEEZER_CONNECTED) {
								// 	DeezerHelper.instance.resume();
								// }
							}
						}catch(error) {
							console.error(error);
						}
					}

					if(step.delay > 0){
						await Utils.promisedTimeout(step.delay * 1000);
					}
				}
			}
			// console.log("Steps parsed", actions);
		}


		if(autoExecuteNext) {
			//Remove item done
			this.actionsSpool.shift();
			if(this.actionsSpool.length > 0) {
				this.executeNext();
			}
		}

		return true;
	}

	/**
	 * Replaces placeholders by their values on the message
	 */
	private async parseText(eventType:string, message:TwitchatDataTypes.ChatMessageTypes, src:string, subEvent?:string|null, removeRemainingTags:boolean = true, removeFolderNavigation:boolean = false):Promise<string> {
		let res = src;

		try {
			// console.log("===== PARSE TEXT =====");
			// console.log(eventType);
			// console.log(message);
			// console.log(src);
			// console.log(subEvent);

			eventType = eventType.replace(/_.*$/gi, "");//Remove suffix to get helper for the global type
			const helpers = TriggerActionHelpers(eventType);
			// console.log(helpers);
			//No placeholders for this event type, just send back the source text
			if(!helpers) return res;
			
			for (let i = 0; i < helpers.length; i++) {
				const h = helpers[i];
				const chunks:string[] = h.pointer.split(".");
				let root = message as unknown;
				let value:string = "";
				h.tag = h.tag.toUpperCase();

				try {
					//Dynamically search for the requested prop's value within the object
					for (let i = 0; i < chunks.length; i++) {
						let isArray = false;
						//key ends by [] it's because it's an array
						if(/\[\]$/g.test(chunks[i])){
							chunks[i] = chunks[i].replace("[]", "");
							isArray = true;
						}
						root = (root as {[key:string]:unknown})[chunks[i]];
						if(isArray) {
							root = (root as {[key:string]:string}[]).map(v=> v[chunks[i+1]]).join(", ");
							break;
						}
					}
					if(typeof root === "number") root = root.toString();
					value = root as string;
				}catch(error) {
					//If the placeholder requests for the current track and we're ending up here
					//this means that the message does not contain the actual track.
					//In this case we go get the currently playing track
					if(h.tag.indexOf("current_track") == 0) {
						//That replace() is dirty but I'm too lazy to do that in a more generic way :(
						const pointer = h.pointer.replace('track.', '') as TwitchatDataTypes.MusicTrackDataKeys
						if(Config.instance.SPOTIFY_CONNECTED && SpotifyHelper.instance.currentTrack) {
							value = SpotifyHelper.instance.currentTrack[pointer]?.toString();
						}else if(Config.instance.DEEZER_CONNECTED && DeezerHelper.instance.currentTrack) {
							value = DeezerHelper.instance.currentTrack[pointer]?.toString();
						}
						if(!value) value = "-none-";
					}else{
						console.warn("Unable to find pointer for helper", h);
						value = "";
					}
				}

				// console.log("Pointer:", h.tag, "=>", h.pointer, "=> value:", value);

				//Remove command from final text
				if(typeof value == "string" && subEvent) {
					subEvent = subEvent.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
					value = value.replace(new RegExp(subEvent, "i"), "").trim();
				}
			
				if(typeof value == "string" && removeFolderNavigation) {
					value = value.replace(/(\.\.|\/|\\)/gi, "");//Avoid folders navigation
				}
				
				res = res.replace(new RegExp("\\{"+h.tag+"\\}", "gi"), value ?? "");
			}

			if(removeRemainingTags) {
				res = res.replace(/\{[^ }]+\}/g, "");
			}
			
			// console.log("RESULT = ",res);
			return Utils.stripHTMLTags(res);
			
		}catch(error) {
			console.error(error);
			return res;
		}
	}
}