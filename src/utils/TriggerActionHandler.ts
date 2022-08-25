import type { BanTriggerData, ChatAlertInfo, ChatHighlightInfo, EmergencyModeInfo as EmergencyModeUpdate, HypeTrainTriggerData, MusicMessage, MusicTriggerData, ShoutoutTriggerData, StreamInfoUpdate, TimeoutTriggerData, TriggerData, UnbanTriggerData, VoicemodTriggerData, VIPTriggerData, UnVIPTriggerData, ModTriggerData, UnmodTriggerData } from "@/types/TwitchatDataTypes";
import type { JsonObject } from "type-fest";
import Config from "./Config";
import DeezerHelper from "./DeezerHelper";
import IRCClient from "./IRCClient";
import { getTwitchatMessageType, TwitchatMessageType, type IRCEventDataList } from "./IRCEventDataTypes";
import OBSWebsocket from "./OBSWebsocket";
import PublicAPI from "./PublicAPI";
import type { SearchTrackItem } from "./SpotifyDataTypes";
import SpotifyHelper from "./SpotifyHelper";
import StoreProxy from "./StoreProxy";
import { TriggerActionHelpers, TriggerMusicTypes, TriggerTypes } from "./TriggerActionData";
import TTSUtils from "./TTSUtils";
import TwitchatEvent from "./TwitchatEvent";
import TwitchUtils from "./TwitchUtils";
import Utils from "./Utils";
import VoicemodWebSocket from "./VoicemodWebSocket";

/**
* Created : 22/04/2022 
*/
export default class TriggerActionHandler {

	private static _instance:TriggerActionHandler;

	private actionsSpool:MessageTypes[] = [];
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
	public onMessage(message:MessageTypes, testMode = false):void {
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
	
	private async executeNext(testMode = false):Promise<void>{
		this.currentSpoolGUID ++;
		const message = this.actionsSpool[0];
		if(!message) return;

		// console.log("Execute next", message);

		if((message.type == "message" || message.type == "highlight")) {
			const type = getTwitchatMessageType(message);
			switch(type) {
				case TwitchatMessageType.FOLLOW: {
					if(await this.handleFollower(message, testMode, this.currentSpoolGUID)) {
						return;
					}
					break;
				}

				case TwitchatMessageType.SUB: 
				case TwitchatMessageType.SUB_PRIME: 
				case TwitchatMessageType.SUBGIFT_UPGRADE: {
					if(await this.handleSub(message, testMode, this.currentSpoolGUID)) {
						return;
					}
					break;
				}
				
				case TwitchatMessageType.SUBGIFT: {
					if(await this.handleSubgift(message, testMode, this.currentSpoolGUID)) {
						return;
					}
					break;
				}

				case TwitchatMessageType.RAID: {
					if(await this.handleRaid(message, testMode, this.currentSpoolGUID)) {
						return;
					}
					break;
				}

				case TwitchatMessageType.REWARD: {
					if(await this.handleReward(message as IRCEventDataList.Highlight, testMode, this.currentSpoolGUID)) {
						return;
					}
					break;
				}

				case TwitchatMessageType.BITS: {
					if(await this.handleBits(message, testMode, this.currentSpoolGUID)) {
						return;
					}
					break;
				}

				case TwitchatMessageType.BITS: {
					if(await this.handleBits(message, testMode, this.currentSpoolGUID)) {
						return;
					}
					break;
				}
			}

			if(message.tags["first-msg"] === true) {
				await this.handleFirstMessageEver(message, testMode, this.currentSpoolGUID);
			}else
			if(message.firstMessage === true) {
				await this.handleFirstMessageToday(message, testMode, this.currentSpoolGUID);
			}else
			if(message.tags["returning-chatter"] === true) {
				await this.handleReturningChatter(message, testMode, this.currentSpoolGUID);
			}

			if(message.message) {
				await this.handleChatCmd(message as IRCEventDataList.Message, testMode, this.currentSpoolGUID);
			}

		}else if(message.type == "prediction") {
			if(await this.handlePrediction(message, testMode, this.currentSpoolGUID)) {
				return;
			}
		
		}else if(message.type == "poll") {
			if(await this.handlePoll(message, testMode, this.currentSpoolGUID)) {
				return;
			}
		
		}else if(message.type == "bingo") {
			if(await this.handleBingo(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "raffle") {
			if(await this.handleRaffle(message, testMode, this.currentSpoolGUID)) {
				return;
			}
			
		}else if(message.type == "countdown") {
			if(await this.handleCountdown(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "streamInfoUpdate") {
			if(await this.handleStreamInfoUpdate(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "emergencyMode") {
			if(await this.handleEmergencyMode(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "timer") {
			if(await this.handleTimer(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "chatOverlayHighlight") {
			if(await this.handleHighlightOverlay(message, testMode, this.currentSpoolGUID)) {
				return;
			}
		
		}else if(message.type == "chatAlert") {
			if(await this.handleChatAlert(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "musicEvent") {
			if(await this.handleMusicEvent(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "voicemod") {
			if(await this.handleVoicemodEvent(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "ban") {
			if(await this.handleBanEvent(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "unban") {
			if(await this.handleUnbanEvent(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "mod") {
			if(await this.handleModEvent(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "unmod") {
			if(await this.handleUnmodEvent(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "vip") {
			if(await this.handleVIPEvent(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "unvip") {
			if(await this.handleUnVIPEvent(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "timeout") {
			if(await this.handleTimeoutEvent(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "shoutout") {
			if(await this.handleShoutoutEvent(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "hypeTrainApproach" || message.type == "hypeTrainStart"
		|| message.type == "hypeTrainProgress" || message.type == "hypeTrainEnd") {
			if(await this.handleHypeTrainEvent(message, testMode, this.currentSpoolGUID)) {
				return;
			}
		}

		// console.log("Message not matching any trigger", message);
		this.actionsSpool.shift();
		this.executeNext();
	}

	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		PublicAPI.instance.addEventListener(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, (e:TwitchatEvent)=> {
			const data = (e.data as unknown) as ChatHighlightInfo;
			data.type = "chatOverlayHighlight";
			this.onMessage(data, false)
		});
	}

	private async handleFirstMessageEver(message:IRCEventDataList.Message|IRCEventDataList.Highlight, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.FIRST_ALL_TIME, message, testMode, guid);
	}
	
	private async handleFirstMessageToday(message:IRCEventDataList.Message|IRCEventDataList.Highlight, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.FIRST_TODAY, message, testMode, guid);
	}
	
	private async handleReturningChatter(message:IRCEventDataList.Message|IRCEventDataList.Highlight, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.RETURNING_USER, message, testMode, guid);
	}
	
	private async handleBits(message:IRCEventDataList.Message|IRCEventDataList.Highlight, testMode:boolean, guid:number):Promise<boolean> {
		if(this.emergencyMode && StoreProxy.store.state.emergencyParams.noTriggers) return true;
		return await this.parseSteps(TriggerTypes.BITS, message, testMode, guid);
	}
	
	private async handleFollower(message:IRCEventDataList.Message|IRCEventDataList.Highlight, testMode:boolean, guid:number):Promise<boolean> {
		if(this.emergencyMode && StoreProxy.store.state.emergencyParams.noTriggers) return true;
		return await this.parseSteps(TriggerTypes.FOLLOW, message, testMode, guid);
	}
	
	private async handleSub(message:IRCEventDataList.Message|IRCEventDataList.Highlight, testMode:boolean, guid:number):Promise<boolean> {
		if(this.emergencyMode && StoreProxy.store.state.emergencyParams.noTriggers) return true;
		return await this.parseSteps(TriggerTypes.SUB, message, testMode, guid);
	}
	
	private async handleSubgift(message:IRCEventDataList.Message|IRCEventDataList.Highlight, testMode:boolean, guid:number):Promise<boolean> {
		if(this.emergencyMode && StoreProxy.store.state.emergencyParams.noTriggers) return true;
		return await this.parseSteps(TriggerTypes.SUBGIFT, message, testMode, guid);
	}
	
	private async handlePoll(message:IRCEventDataList.PollResult, testMode:boolean, guid:number):Promise<boolean> {
		let winnerVotes = -1;
		message.data.choices.forEach(v=>{
			if(v.votes > winnerVotes) {
				winnerVotes = v.votes;
				message.winner = v.title;
			}
		});
		return await this.parseSteps(TriggerTypes.POLL_RESULT, message, testMode, guid);
	}
	
	private async handlePrediction(message:IRCEventDataList.PredictionResult, testMode:boolean, guid:number):Promise<boolean> {
		message.data.outcomes.forEach(v=>{
			if(v.id == message.data.winning_outcome_id) {
				message.winner = v.title;
			}
		});
		return await this.parseSteps(TriggerTypes.PREDICTION_RESULT, message, testMode, guid);
	}
	
	private async handleBingo(message:IRCEventDataList.BingoResult, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.BINGO_RESULT, message, testMode, guid);
	}
	
	private async handleRaffle(message:IRCEventDataList.RaffleResult, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.RAFFLE_RESULT, message, testMode, guid);
	}
	
	private async handleCountdown(message:IRCEventDataList.CountdownResult, testMode:boolean, guid:number):Promise<boolean> {
		const type = message.started? TriggerTypes.COUNTDOWN_START : TriggerTypes.COUNTDOWN_STOP;
		//Create placeholder pointers
		message.start = Utils.formatDate(new Date(message.data.startAt));
		message.start_ms = message.data.startAt;
		message.duration = Utils.formatDuration(message.data.duration);
		message.duration_ms = message.data.duration;
		return await this.parseSteps(type, message, testMode, guid);
	}
	
	private async handleStreamInfoUpdate(message:StreamInfoUpdate, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.STREAM_INFO_UPDATE, message, testMode, guid);
	}
	
	private async handleEmergencyMode(message:EmergencyModeUpdate, testMode:boolean, guid:number):Promise<boolean> {
		const type = message.enabled? TriggerTypes.EMERGENCY_MODE_START : TriggerTypes.EMERGENCY_MODE_STOP;
		return await this.parseSteps(type, message, testMode, guid);
	}
	
	private async handleTimer(message:IRCEventDataList.TimerResult, testMode:boolean, guid:number):Promise<boolean> {
		const type = message.started? TriggerTypes.TIMER_START : TriggerTypes.TIMER_STOP;
		//Create placeholder pointers
		message.duration = Utils.formatDuration(message.data.duration as number);
		message.duration_ms = message.data.duration;
		return await this.parseSteps(type, message, testMode, guid);
	}
	
	private async handleHighlightOverlay(message:ChatHighlightInfo, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.HIGHLIGHT_CHAT_MESSAGE, message, testMode, guid);
	}
	
	private async handleChatAlert(message:ChatAlertInfo, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.CHAT_ALERT, message, testMode, guid);
	}
	
	private async handleRaid(message:IRCEventDataList.Message|IRCEventDataList.Highlight, testMode:boolean, guid:number):Promise<boolean> {
		if(this.emergencyMode) return true;
		return await this.parseSteps(TriggerTypes.RAID, message, testMode, guid);
	}
	
	private async handleChatCmd(message:IRCEventDataList.Message, testMode:boolean, guid:number):Promise<boolean> {
		const cmd = message.message.trim().split(" ")[0].toLowerCase();
		return await this.parseSteps(TriggerTypes.CHAT_COMMAND, message, testMode, guid, cmd);
	}
	
	private async handleReward(message:IRCEventDataList.Highlight, testMode:boolean, guid:number):Promise<boolean> {
		if(message.reward) {
			let id = message.reward.redemption.reward.id;
			if(id == "TEST_ID") {
				id = TriggerTypes.REWARD_REDEEM;
			}else{
				id = TriggerTypes.REWARD_REDEEM+"_"+id;
			}
			return await this.parseSteps(id, message, testMode, guid);
		}
		return false;
	}
	
	private async handleMusicEvent(message:MusicTriggerData, testMode:boolean, guid:number):Promise<boolean> {
		const event = message.start? TriggerTypes.MUSIC_START : TriggerTypes.MUSIC_STOP;
		return await this.parseSteps(event, message, testMode, guid);
	}
	
	private async handleVoicemodEvent(message:VoicemodTriggerData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.VOICEMOD, message, testMode, guid);
	}

	private async handleBanEvent(message:BanTriggerData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.BAN, message, testMode, guid);
	}

	private async handleUnbanEvent(message:UnbanTriggerData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.UNBAN, message, testMode, guid);
	}

	private async handleModEvent(message:ModTriggerData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.MOD, message, testMode, guid);
	}

	private async handleUnmodEvent(message:UnmodTriggerData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.UNMOD, message, testMode, guid);
	}

	private async handleVIPEvent(message:VIPTriggerData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.VIP, message, testMode, guid);
	}

	private async handleUnVIPEvent(message:UnVIPTriggerData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.UNVIP, message, testMode, guid);
	}

	private async handleTimeoutEvent(message:TimeoutTriggerData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.TIMEOUT, message, testMode, guid);
	}
	
	private async handleShoutoutEvent(message:ShoutoutTriggerData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.SHOUTOUT, message, testMode, guid);
	}
	
	private async handleHypeTrainEvent(message:HypeTrainTriggerData, testMode:boolean, guid:number):Promise<boolean> {
		const idToType = {
			hypeTrainApproach:TriggerTypes.HYPE_TRAIN_APPROACH,
			hypeTrainStart:TriggerTypes.HYPE_TRAIN_START,
			hypeTrainProgress:TriggerTypes.HYPE_TRAIN_PROGRESS,
			hypeTrainEnd:TriggerTypes.HYPE_TRAIN_END,
		}
		if(message.state == "EXPIRE") {
			idToType.hypeTrainEnd = TriggerTypes.HYPE_TRAIN_CANCELED;
		}
		const event = idToType[message.type];
		if(event) {
			return await this.parseSteps(event, message, testMode, guid, undefined, "hypetrain");
		}
		return false;
	}

	/**
	 * Executes the steps of the trigger
	 * 
	 * @param eventType 
	 * @param message 
	 * 
	 * @returns true if the trigger was executed
	 */
	private async parseSteps(eventType:string, message:MessageTypes, testMode:boolean, guid:number, subEvent?:string, ttsID?:string):Promise<boolean> {
		if(subEvent) eventType += "_"+subEvent
		const trigger = this.triggers[ eventType ];
		// console.log("PARSE STEPS", eventType, trigger, message);
		
		if(!trigger || !trigger.enabled || !trigger.actions || trigger.actions.length == 0) {
			return false;
		}else{
			const data = trigger as TriggerData;
			if(!data.enabled) return false;
			let canExecute = true;

			if(data.permissions && data.cooldown) {
				const m = message as IRCEventDataList.Message;
				const uid = m.tags['user-id'];
				const key = eventType+"_"+uid;
				const now = Date.now();
				
				//check permissions
				if(!Utils.checkPermissions(data.permissions, m.tags)) {
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
			// console.log(steps);
			// console.log(message);
			// console.log(canExecute);
			
			if(canExecute) {
				for (let i = 0; i < data.actions.length; i++) {
					if(guid != this.currentSpoolGUID) return true;//Stop there, something asked to override the current exec sequence
					const step = data.actions[i];
					//Handle OBS action
					if(step.type == "obs") {
						if(step.text) {
							// console.log("TEXT");
							const text = await this.parseText(eventType, message, step.text as string);
							await OBSWebsocket.instance.setTextSourceContent(step.sourceName, text);
						}
						if(step.url) {
							const url = await this.parseText(eventType, message, step.url as string, true);
							// console.log("URL", url);
							await OBSWebsocket.instance.setBrowserSourceURL(step.sourceName, url);
						}
						if(step.mediaPath) {
							// console.log("MEDIA");
							const url = await this.parseText(eventType, message, step.mediaPath as string);
							await OBSWebsocket.instance.setMediaSourceURL(step.sourceName, url);
						}
			
						if(step.filterName) {
							await OBSWebsocket.instance.setFilterState(step.sourceName, step.filterName, step.show);
						}else{
							let show = step.show;
							//If requesting to show an highlighted message but the message
							//is empty, force source to hide
							if(eventType == TriggerTypes.HIGHLIGHT_CHAT_MESSAGE
							&& message.type == "chatOverlayHighlight" && (!message.message || message.message.length===0)) {
								show = false;
							}
							await OBSWebsocket.instance.setSourceState(step.sourceName, show);
						}
					}else
					
					//Handle Chat action
					if(step.type == "chat") {
						const text = await this.parseText(eventType, message, step.text as string, false, subEvent);
						IRCClient.instance.sendMessage(text);
					}else
					
					//Handle TTS action
					if(step.type == "tts") {
						const text = await this.parseText(eventType, message, step.text as string, false, subEvent);
						TTSUtils.instance.readNext(text, ttsID ?? eventType);
					}else
					
					//Handle raffle action
					if(step.type == "raffle") {
						StoreProxy.store.dispatch("startRaffle", JSON.parse(JSON.stringify(step.raffleData)));
					}else
					
					//Handle bingo action
					if(step.type == "bingo") {
						StoreProxy.store.dispatch("startBingo", JSON.parse(JSON.stringify(step.bingoData)));
					}else
					
					//Handle voicemod action
					if(step.type == "voicemod") {
						if(step.voiceID) {
							VoicemodWebSocket.instance.enableVoiceEffect(step.voiceID)
						}
					}else

					//Handle music actions
					if(step.type == "music") {
						if(step.musicAction == TriggerMusicTypes.ADD_TRACK_TO_QUEUE && message.type == "message") {
							const m = message.message.split(" ").splice(1).join(" ");
							const data:MusicMessage = {
								type:"music",
								title:"",
								artist:"",
								album:"",
								cover:"",
								duration:0,
								url:"",
								tags:message.tags,
							};
							if(Config.instance.SPOTIFY_CONNECTED) {
								let track:SearchTrackItem|null = null;
								if(/open\.spotify\.com\/track\/.*/gi.test(m)) {
									const chunks = m.replace(/https?:\/\//gi,"").split(/\/|\?/gi)
									const id = chunks[2];
									track = await SpotifyHelper.instance.getTrackByID(id);
								}else{
									track = await SpotifyHelper.instance.searchTrack(m);
								}
								if(track) {
									if(await SpotifyHelper.instance.addToQueue(track.uri)) {
										data.title = track.name;
										data.artist = track.artists[0].name;
										data.album = track.album.name;
										data.cover = track.album.images[0].url;
										data.duration = track.duration_ms;
										data.url = track.external_urls.spotify;
									}
								}
							}
							if(Config.instance.DEEZER_CONNECTED) {
								const tracks = await DeezerHelper.instance.searchTracks(m);
								if(tracks) {
									const track = tracks[0];
									DeezerHelper.instance.addToQueue(track);
									data.title = track.title;
									data.artist = track.artist.name;
									data.album = track.album.title;
									data.cover = track.album.cover_medium;
									data.duration = track.duration;
									data.url = track.link;
								}
							}
							if(data.title) {
								PublicAPI.instance.broadcast(TwitchatEvent.TRACK_ADDED_TO_QUEUE, data as JsonObject);
								this.parseSteps(TriggerTypes.TRACK_ADDED_TO_QUEUE, data, false, guid);
								if(step.confirmMessage) {
									let m = message.message;
									if(subEvent) {
										m = m.replace(subEvent, "").trim();
									}
									data.message = m;
									const chatMessage = await this.parseText(eventType, data, step.confirmMessage);
									IRCClient.instance.sendMessage(chatMessage);
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
									IRCClient.instance.sendMessage("Playlist not found");
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

		//Remove item done
		this.actionsSpool.shift();
		if(this.actionsSpool.length > 0) {
			this.executeNext();
		}

		return true;
	}

	/**
	 * Replaces placeholders by their values on the message
	 */
	private async parseText(eventType:string, message:MessageTypes, src:string, urlEncode = false, subEvent?:string|null):Promise<string> {
		let res = src;
		eventType = eventType.replace(/_.*$/gi, "");//Remove suffix to get helper for the global type
		const helpers = TriggerActionHelpers(eventType);
		if(!helpers) return res;
		
		for (let i = 0; i < helpers.length; i++) {
			const h = helpers[i];
			const chunks:string[] = h.pointer.split(".");
			let value = message as unknown;
			try {
				for (let i = 0; i < chunks.length; i++) {
					value = (value as {[key:string]:unknown})[chunks[i]];
				}
			}catch(error) {
				console.warn("Unable to find pointer for helper", h);
				value = "";
			}
			// console.log("Pointer:", h.pointer, "_ value:", value);
			
			if(h.tag === "SUB_TIER") {
				if(!isNaN(value as number) && (value as number) > 0) {
					value = Math.round((value as number)/1000)
				}else{
					value = 1;//Fallback just in case but shouldn't be necessary
				}
			}

			if(h.tag === "MESSAGE") {
				const m = message as IRCEventDataList.Message;
				if(m.message && m.tags) {
					//Parse emotes
					const chunks = TwitchUtils.parseEmotes(m.message as string, m.tags['emotes-raw'], true);
					let cleanMessage = ""
					//only keep text chunks to remove emotes
					for (let i = 0; i < chunks.length; i++) {
						const v = chunks[i];
						if(v.type == "text") {
							cleanMessage += v.value+" ";
						}
					}
					if(!subEvent) subEvent = "";
					//Remove command from final text
					value = cleanMessage.replace(new RegExp(subEvent, "i"), "").trim();
				}else{
					value = m.message;
				}
			}

			//If it's a music placeholder for the ADDED TO QUEUE event
			//replace it by the current music info
			if(eventType == TriggerTypes.TRACK_ADDED_TO_QUEUE && h.tag.indexOf("CURRENT_TRACK") == 0) {
				if(message.type == "music") {
					value = message[h.pointer];
				}else{

					if(Config.instance.SPOTIFY_CONNECTED && SpotifyHelper.instance.currentTrack) {
						value = SpotifyHelper.instance.currentTrack[h.pointer];
					}else if(Config.instance.DEEZER_CONNECTED && DeezerHelper.instance.currentTrack) {
						value = DeezerHelper.instance.currentTrack[h.pointer];
					}else{
						value = "-none-";
					}
				}
			}
			
			if(value && eventType === TriggerTypes.BITS && h.tag === "MESSAGE") {
				//Parse cheermotes
				const m = message as IRCEventDataList.Highlight;
				value = await TwitchUtils.parseCheermotes(value as string, m.tags['room-id'] as string);
			}

			if(value && typeof value == "string") {
				//Strip HTML tags (removes emotes and cheermotes)
				value = (value as string).replace(/<\/?\w+(?:\s+[^\s/>"'=]+(?:\s*=\s*(?:".*?[^"\\]"|'.*?[^'\\]'|[^\s>"']+))?)*?>/gi, "");
				
				if(urlEncode) {
					value = encodeURIComponent(value as string);
				}
			}
			if(value == undefined) value = "";
			res = res.replace(new RegExp("\\{"+h.tag+"\\}", "gi"), value as string);
		}
		return res;
	}
}
type MessageTypes = IRCEventDataList.Message
| IRCEventDataList.Timeout
| IRCEventDataList.Ban
| IRCEventDataList.Notice
| IRCEventDataList.Highlight
| IRCEventDataList.Hosted
| IRCEventDataList.RoomState
| IRCEventDataList.Whisper
| IRCEventDataList.PollResult
| IRCEventDataList.PredictionResult
| IRCEventDataList.BingoResult
| IRCEventDataList.RaffleResult
| IRCEventDataList.Commercial
| IRCEventDataList.CountdownResult
| IRCEventDataList.Join
| IRCEventDataList.Leave
| IRCEventDataList.TimerResult
| IRCEventDataList.HypeTrainResult
| MusicMessage
| StreamInfoUpdate
| EmergencyModeUpdate
| ChatHighlightInfo
| ChatAlertInfo
| MusicTriggerData
| HypeTrainTriggerData
| VoicemodTriggerData
| ShoutoutTriggerData
| BanTriggerData
| UnbanTriggerData
| ModTriggerData
| UnmodTriggerData
| TimeoutTriggerData
| VIPTriggerData
| UnVIPTriggerData
;