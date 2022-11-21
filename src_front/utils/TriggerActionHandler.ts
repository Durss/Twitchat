import MessengerProxy from "@/messaging/MessengerProxy";
import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { JsonObject } from "type-fest";
import TwitchatEvent from "../events/TwitchatEvent";
import { TriggerActionHelpers, TriggerMusicTypes, TriggerTypes, type TriggerData, type TriggerTypesValue } from "../types/TriggerActionDataTypes";
import Config from "./Config";
import DeezerHelper from "./music/DeezerHelper";
import type { SearchTrackItem } from "./music/SpotifyDataTypes";
import SpotifyHelper from "./music/SpotifyHelper";
import OBSWebsocket from "./OBSWebsocket";
import PublicAPI from "./PublicAPI";
import TTSUtils from "./TTSUtils";
import Utils from "./Utils";
import VoicemodWebSocket from "./voice/VoicemodWebSocket";

/**
* Created : 22/04/2022 
TODO remove the mapping message type => trigger type via method calls and replace it by a hashmap
*/
export default class TriggerActionHandler {

	private static _instance:TriggerActionHandler;

	private actionsSpool:TwitchatDataTypes.ChatMessageTypes[] = [];
	private userCooldowns:{[key:string]:number} = {};
	private globalCooldowns:{[key:string]:number} = {};
	private currentSpoolGUID = 0;

	public triggers:{[key:string]:TriggerData} = {};
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
		PublicAPI.instance.addEventListener(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, (e:TwitchatEvent)=> {
			const data = (e.data as unknown) as TwitchatDataTypes.ChatHighlightInfo;
			if(data.message) {
				const message:TwitchatDataTypes.MessageChatHighlightData = {
					date:Date.now(),
					id:Utils.getUUID(),
					platform:"twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.CHAT_HIGHLIGHT,
					info:data,
				}
				this.parseSteps(TriggerTypes.HIGHLIGHT_CHAT_MESSAGE, message, false, ++this.currentSpoolGUID);
			}
		});
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
					await this.parseSteps(TriggerTypes.FIRST_ALL_TIME, message, testMode, this.currentSpoolGUID, cmd);
				}

				await this.parseSteps(TriggerTypes.ANY_MESSAGE, message, testMode, this.currentSpoolGUID);
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
				const event = message.countdown? TriggerTypes.COUNTDOWN_START : TriggerTypes.COUNTDOWN_STOP;
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

			case TwitchatDataTypes.TwitchatMessageType.SHOUTOUT: {
				if(await this.parseSteps(TriggerTypes.SHOUTOUT, message, testMode, this.currentSpoolGUID)) {
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
					case TwitchatDataTypes.TwitchatNoticeType.BAN:{
						if(await this.parseSteps(TriggerTypes.BAN, message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.UNBAN:{
						if(await this.parseSteps(TriggerTypes.UNBAN, message, testMode, this.currentSpoolGUID)) {
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
					case TwitchatDataTypes.TwitchatNoticeType.TIMEOUT:{
						if(await this.parseSteps(TriggerTypes.TIMEOUT, message, testMode, this.currentSpoolGUID)) {
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
		
		if(!trigger || !trigger.enabled || !trigger.actions || trigger.actions.length == 0) {
			return false;
		}else{
			// console.log("PARSE STEPS", eventType);
			// console.log("PARSE STEPS", eventType, trigger, message);
			const data = trigger as TriggerData;
			if(!data.enabled) return false;
			let canExecute = true;

			if(data.permissions && data.cooldown && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				const key = eventType+"_"+message.user.id;
				const now = Date.now();
				
				//check permissions
				if(!Utils.checkPermissions(data.permissions, message.user, message.channel_id)) {
					canExecute = false;
				}else{
					//Apply cooldowns if any
					if(this.globalCooldowns[eventType] > 0 && this.globalCooldowns[eventType] > now) canExecute = false;
					else if(data.cooldown.global > 0) this.globalCooldowns[eventType] = now + data.cooldown.global * 1000;
	
					if(this.userCooldowns[key] > 0 && this.userCooldowns[key] > now) canExecute = false;
					else if(canExecute && data.cooldown.user > 0) this.userCooldowns[key] = now + data.cooldown.user * 1000;
				}
			}

			if(testMode) canExecute = true;
			
			if(!trigger || data.actions.length == 0) canExecute = false;
			// console.log(data);
			// console.log(message);
			// console.log(canExecute);

			if(canExecute) {
				for (let i = 0; i < data.actions.length; i++) {
					if(autoExecuteNext && guid != this.currentSpoolGUID) {
						return true;//Stop there, something asked to override the current exec sequence
					}
					const step = data.actions[i];
					// console.log("	Parse step", step);
					//Handle OBS action
					if(step.type == "obs") {
						if(step.text) {
							// console.log("TEXT");
							const text = await this.parseText(eventType, message, step.text as string);
							await OBSWebsocket.instance.setTextSourceContent(step.sourceName, text);
						}
						if(step.url) {
							//Last param of the parseText() forces urlEncode of the placeholder values to
							//avoid URL injections.
							const url = await this.parseText(eventType, message, step.url as string, true);
							// console.log("URL", url);
							await OBSWebsocket.instance.setBrowserSourceURL(step.sourceName, url);
						}
						if(step.mediaPath) {
							// console.log("MEDIA");
							let url = await this.parseText(eventType, message, step.mediaPath as string);
							url = url.replace(/(\.\.|\/|\\)/gi, "");//Avoid folders navigation
							await OBSWebsocket.instance.setMediaSourceURL(step.sourceName, url);
						}
			
						if(step.filterName) {
							await OBSWebsocket.instance.setFilterState(step.sourceName, step.filterName, step.show);
						}else{
							let show = step.show;
							//If requesting to show an highlighted message but the message
							//is empty, force source to hide
							if(eventType == TriggerTypes.HIGHLIGHT_CHAT_MESSAGE
							&& message.type == "chat_highlight"
							&& (!message.info.message || message.info.message.length===0)) {
								show = false;
							}
							await OBSWebsocket.instance.setSourceState(step.sourceName, show);
						}
					}else
					
					//Handle Chat action
					if(step.type == "chat") {
						const text = await this.parseText(eventType, message, step.text as string, false, subEvent);
						const platforms:TwitchatDataTypes.ChatPlatform[] = [];
						if(message.platform) platforms.push(message.platform);
						MessengerProxy.instance.sendMessage(text, platforms);
					}else
					
					//Handle highlight action
					if(step.type == "highlight") {
						if(step.show) {
							let text = await this.parseText(eventType, message, step.text as string, false, subEvent, true);
							//Remove command name from message
							if(subEvent) text = text.replace(subEvent, "").trim();
							const user = null;
							const m = message as TwitchatDataTypes.MessageChatHighlightData;
							//TODO this event is probably broken
							PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, (m as unknown) as JsonObject)
							StoreProxy.chat.isChatMessageHighlighted = true;
						}else{
							PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, {})
							StoreProxy.chat.isChatMessageHighlighted = false;
						}
					}else
					
					//Handle TTS action
					if(step.type == "tts" && message) {
						TTSUtils.instance.readNext(message, ttsID ?? eventType);
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

					//Handle music actions
					if(step.type == "music") {
						//Adding a track to the queue
						if(step.musicAction == TriggerMusicTypes.ADD_TRACK_TO_QUEUE) {
							//Convert placeholders if any
							const m = await this.parseText(eventType, message, step.track);
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
								PublicAPI.instance.broadcast(TwitchatEvent.TRACK_ADDED_TO_QUEUE, (message as unknown) as JsonObject);
								//Execute "TRACK_ADDED_TO_QUEUE" to queue trigger
								this.parseSteps(TriggerTypes.TRACK_ADDED_TO_QUEUE, trigger, false, guid);

								//The step is requesting to confirm on chat when a track has been added
								if(step.confirmMessage) {
									const m = step.confirmMessage;
									const trigger:TwitchatDataTypes.MessageMusicAddedToQueueData = {
										id:Utils.getUUID(),
										date:Date.now(),
										platform:"twitchat",
										type:TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE,
										track:data,
									}
									const chatMessage = await this.parseText(eventType, trigger, step.confirmMessage, false, subEvent);
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
								m = await this.parseText(eventType, message, m);
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
	private async parseText(eventType:string, message:TwitchatDataTypes.ChatMessageTypes, src:string, urlEncode = false, subEvent?:string|null, keepEmotes:boolean = false):Promise<string> {
		let res = src;
		eventType = eventType.replace(/_.*$/gi, "");//Remove suffix to get helper for the global type
		const helpers = TriggerActionHelpers(eventType);
		//No placeholders for this event type, just send back the source text
		if(!helpers) return res;
		
		for (let i = 0; i < helpers.length; i++) {
			const h = helpers[i];
			const chunks:string[] = h.pointer.split(".");
			let root = message as unknown;
			let value:string;
			try {
				//Dynamically search for the requested prop's value within the object
				for (let i = 0; i < chunks.length; i++) {
					root = (root as {[key:string]:unknown})[chunks[i]];
				}
				value = root as string;
			}catch(error) {
				console.warn("Unable to find pointer for helper", h);
				value = "";
			}

			// console.log("Pointer:", h, "_ value:", value);
			
			h.tag = h.tag.toUpperCase();

			// if(h.tag === "SUB_TIER") {
			// 	if(!isNaN(value as number) && (value as number) > 0) {
			// 		value = Math.round((value as number)/1000)
			// 	}else{
			// 		value = 1;//Fallback just in case but shouldn't be necessary
			// 	}
			// }else

			// if(h.tag === "MESSAGE" && value) {
			// 	const m = message as TwitchatDataTypes.Message;
			// 	//Parse emotes
			// 	const isReward = (message as TwitchatDataTypes.Highlight).reward != undefined;
			// 	const customParsing = m.sentLocally === true || isReward;
			// 	const chunks = TwitchUtils.parseEmotesToChunks(value as string, m.tags?.['emotes-raw'], !keepEmotes && !isReward, customParsing);
			// 	let cleanMessage = ""
			// 	//only keep text chunks to remove emotes
			// 	for (let i = 0; i < chunks.length; i++) {
			// 		const v = chunks[i];
			// 		if(v.type == "text") {
			// 			cleanMessage += v.value+" ";
			// 		}else
			// 		if((keepEmotes === true || isReward) && v.type == "emote") {
			// 			cleanMessage += "<img src=\""+v.value+"\" class=\"emote\">";
			// 		}
			// 	}
			// 	if(!subEvent) subEvent = "";
			// 	//Remove command from final text
			// 	value = cleanMessage.replace(new RegExp(subEvent, "i"), "").trim();
			// }

			//If it's a music placeholder for the ADDED TO QUEUE event
			//replace it by the current music info
			if(eventType == TriggerTypes.TRACK_ADDED_TO_QUEUE && h.tag.indexOf("CURRENT_TRACK") == 0) {
				if(message.type === TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE && message.track != null) {
					//If we just added a track to the queue, we already have the track info and
					//want to use that instead of the currently playing one
					value = message.track[h.pointer as TwitchatDataTypes.MusicTrackDataKeys].toString();
				}else{
					//Go get currently playing track
					if(Config.instance.SPOTIFY_CONNECTED && SpotifyHelper.instance.currentTrack) {
						value = SpotifyHelper.instance.currentTrack[h.pointer as TwitchatDataTypes.MusicTrackDataKeys].toString();
					}else if(Config.instance.DEEZER_CONNECTED && DeezerHelper.instance.currentTrack) {
						value = DeezerHelper.instance.currentTrack[h.pointer as TwitchatDataTypes.MusicTrackDataKeys].toString();
					}else{
						value = "-none-";
					}
				}
			}
			
			// if(value && eventType === TriggerTypes.CHEER && h.tag === "MESSAGE") {
			// 	//Parse cheermotes
			// 	const m = message as TwitchatDataTypes.MessageCheerData;
			// 	value = await TwitchUtils.parseCheermotes(value as string, m.channel_id);
			// }

			// if(value && typeof value == "string") {
			// 	//Strip HTML tags (removes emotes and cheermotes)
			// 	if(!keepEmotes) {
			// 		value = (value as string).replace(/<\/?\w+(?:\s+[^\s/>"'=]+(?:\s*=\s*(?:".*?[^"\\]"|'.*?[^'\\]'|[^\s>"']+))?)*?>/gi, "");
			// 	}
				
			// 	if(urlEncode) {
			// 		value = encodeURIComponent(value as string);
			// 	}
			// }
			//TODO test what all the commented stuff above breaks. Because it will :(
			res = res.replace(new RegExp("\\{"+h.tag+"\\}", "gi"), value ?? "");
		}
		return res;
	}
}