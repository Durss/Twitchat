import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { JsonObject } from "type-fest";
import Config from "./Config";
import DeezerHelper from "./music/DeezerHelper";
import OBSWebsocket from "./OBSWebsocket";
import PublicAPI from "./PublicAPI";
import type { SearchTrackItem } from "./music/SpotifyDataTypes";
import SpotifyHelper from "./music/SpotifyHelper";
import { TriggerActionHelpers, TriggerMusicTypes, TriggerTypes, type TriggerTypesValue } from "../types/TriggerActionDataTypes";
import TTSUtils from "./TTSUtils";
import TwitchatEvent from "./TwitchatEvent";
import TwitchUtils from "./twitch/TwitchUtils";
import Utils from "./Utils";
import VoicemodWebSocket from "./voice/VoicemodWebSocket";
import MessengerProxy from "@/messaging/MessengerProxy";

/**
* Created : 22/04/2022 
*/
export default class TriggerActionHandler {

	private static _instance:TriggerActionHandler;

	private actionsSpool:TwitchatDataTypes.ChatMessageTypes[] = [];
	private userCooldowns:{[key:string]:number} = {};
	private globalCooldowns:{[key:string]:number} = {};
	private currentSpoolGUID = 0;

	public triggers:{[key:string]:TwitchatDataTypes.TriggerData} = {};
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
		return await this.parseSteps(key, null, false, this.currentSpoolGUID, undefined, "schedule");
	}

	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		PublicAPI.instance.addEventListener(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, (e:TwitchatEvent)=> {
			const data = (e.data as unknown) as TwitchatDataTypes.ChatHighlightInfo;
			if(data.message) {
				data.type = "chatOverlayHighlight";
				this.handleHighlightOverlay(data, false, ++this.currentSpoolGUID);
			}
		});
	}
	
	private async executeNext(testMode = false):Promise<void>{
		this.currentSpoolGUID ++;
		const message = this.actionsSpool[0];
		if(!message) return;

		// console.log("Execute next", message);

		switch(message.type) {
			case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
				//Only trigger one of "first ever", "first today" or "returning" trigger
				if(message.twitch_isFirstMessage === true) {
					await this.handleFirstMessageEver(message, testMode, this.currentSpoolGUID);
				}else
				if(message.todayFirst === true) {
					await this.handleFirstMessageToday(message, testMode, this.currentSpoolGUID);
				}else
				if(message.twitch_isReturning === true) {
					await this.handleReturningChatter(message, testMode, this.currentSpoolGUID);
				}

				if(message.message) {
					await this.handleChatCmd(message, testMode, this.currentSpoolGUID);
				}

				await this.handleChatMessage(message, testMode, this.currentSpoolGUID);
				break;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
				if(await this.handleFollower(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
				if(message.is_gift) {
					if(await this.handleSubgift(message, testMode, this.currentSpoolGUID)) {
						return;
					}
				}else
				if(await this.handleSub(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.RAID: {
				if(await this.handleRaid(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.REWARD: {
				if(await this.handleReward(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION: {
				if(await this.handleChallengeContribution(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.CHEER: {
				if(await this.handleCheer(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.PREDICTION: {
				if(await this.handlePrediction(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.POLL: {
				if(await this.handlePoll(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.BINGO: {
				if(await this.handleBingo(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAFFLE: {
				if(await this.handleRaffle(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.COUNTDOWN: {
				if(await this.handleCountdown(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.TIMER: {
				if(await this.handleTimer(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.BINGO: {
				if(await this.handleBingo(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.CHAT_ALERT: {
				if(await this.handleChatAlert(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}

			// case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY: {
			// 	if(await this.handleHypeTrainEvent(message, testMode, this.currentSpoolGUID)) {
			// 		return;
			// 	}break;
			// }

			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_APPROACHING:
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_START:
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_PROGRESS:
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_CANCEL:
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COMPLETE: {
				if(await this.handleHypeTrainEvent(message, testMode, this.currentSpoolGUID)) {
					return;
				}break;
			}


			case TwitchatDataTypes.TwitchatMessageType.NOTICE: {
				switch(message.noticeId) {
					case TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE:{
						if(await this.handleStreamInfoUpdate(message as TwitchatDataTypes.MessageStreamInfoUpdate, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE:{
						if(await this.handleEmergencyMode(message as TwitchatDataTypes.MessageEmergencyModeInfo, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.BAN:{
						if(await this.handleBanEvent(message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.UNBAN:{
						if(await this.handleUnbanEvent(message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.MOD:{
						if(await this.handleModEvent(message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.UNMOD:{
						if(await this.handleUnmodEvent(message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.VIP:{
						if(await this.handleVIPEvent(message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.UNVIP:{
						if(await this.handleUnVIPEvent(message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.TIMEOUT:{
						if(await this.handleTimeoutEvent(message, testMode, this.currentSpoolGUID)) {
							return;
						}break;
					}
				}
				break;
			}
		}


		if(message.type == "musicEvent") {
			if(await this.handleMusicEvent(message, testMode, this.currentSpoolGUID)) {
				return;
			}

		}else if(message.type == "voicemod") {
			if(await this.handleVoicemodEvent(message, testMode, this.currentSpoolGUID)) {
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

	private async handleFirstMessageEver(message:TwitchatDataTypes.MessageChatData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.FIRST_ALL_TIME, message, testMode, guid);
	}
	
	private async handleFirstMessageToday(message:TwitchatDataTypes.MessageChatData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.FIRST_TODAY, message, testMode, guid);
	}
	
	private async handleReturningChatter(message:TwitchatDataTypes.MessageChatData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.RETURNING_USER, message, testMode, guid);
	}
	
	private async handleCheer(message:TwitchatDataTypes.MessageCheerData, testMode:boolean, guid:number):Promise<boolean> {
		if(this.emergencyMode && StoreProxy.emergency.params.noTriggers) return true;
		return await this.parseSteps(TriggerTypes.BITS, message, testMode, guid);
	}
	
	private async handleFollower(message:TwitchatDataTypes.MessageFollowingData, testMode:boolean, guid:number):Promise<boolean> {
		if(this.emergencyMode && StoreProxy.emergency.params.noTriggers) return true;
		return await this.parseSteps(TriggerTypes.FOLLOW, message, testMode, guid);
	}
	
	private async handleSub(message:TwitchatDataTypes.MessageSubscriptionData, testMode:boolean, guid:number):Promise<boolean> {
		if(this.emergencyMode && StoreProxy.emergency.params.noTriggers) return true;
		return await this.parseSteps(TriggerTypes.SUB, message, testMode, guid);
	}
	
	private async handleSubgift(message:TwitchatDataTypes.MessageSubscriptionData, testMode:boolean, guid:number):Promise<boolean> {
		if(this.emergencyMode && StoreProxy.emergency.params.noTriggers) return true;
		return await this.parseSteps(TriggerTypes.SUBGIFT, message, testMode, guid);
	}
	
	private async handlePoll(message:TwitchatDataTypes.MessagePollData, testMode:boolean, guid:number):Promise<boolean> {
		// let winnerVotes = -1;
		// message.data.choices.forEach(v=>{
		// 	if(v.votes > winnerVotes) {
		// 		winnerVotes = v.votes;
		// 		message.winner = v.title;
		// 	}
		// });
		//TODO remap the above
		return await this.parseSteps(TriggerTypes.POLL_RESULT, message, testMode, guid);
	}
	
	private async handlePrediction(message:TwitchatDataTypes.MessagePredictionData, testMode:boolean, guid:number):Promise<boolean> {
		// message.data.outcomes.forEach(v=>{
		// 	if(v.id == message.data.winning_outcome_id) {
		// 		message.winner = v.title;
		// 	}
		// });
		//TODO remap the above
		return await this.parseSteps(TriggerTypes.PREDICTION_RESULT, message, testMode, guid);
	}
	
	private async handleBingo(message:TwitchatDataTypes.MessageBingoData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.BINGO_RESULT, message, testMode, guid);
	}
	
	private async handleRaffle(message:TwitchatDataTypes.MessageRaffleData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.RAFFLE_RESULT, message, testMode, guid);
	}
	
	private async handleCountdown(message:TwitchatDataTypes.MessageCountdownData, testMode:boolean, guid:number):Promise<boolean> {
		const type = message.countdown? TriggerTypes.COUNTDOWN_START : TriggerTypes.COUNTDOWN_STOP;
		//Create placeholder pointers
		// message.start = Utils.formatDate(new Date(message.countdown.startAt));
		// message.start_ms = message.countdown.startAt;
		// message.duration = Utils.formatDuration(message.countdown.duration);
		// message.duration_ms = message.countdown.duration;
		//TODO remap the above
		return await this.parseSteps(type, message, testMode, guid);
	}
	
	private async handleStreamInfoUpdate(message:TwitchatDataTypes.MessageStreamInfoUpdate, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.STREAM_INFO_UPDATE, message, testMode, guid);
	}
	
	private async handleEmergencyMode(message:TwitchatDataTypes.MessageEmergencyModeInfo, testMode:boolean, guid:number):Promise<boolean> {
		const type = message.enabled? TriggerTypes.EMERGENCY_MODE_START : TriggerTypes.EMERGENCY_MODE_STOP;
		return await this.parseSteps(type, message, testMode, guid);
	}
	
	private async handleTimer(message:TwitchatDataTypes.MessageTimerData, testMode:boolean, guid:number):Promise<boolean> {
		const type = message.started? TriggerTypes.TIMER_START : TriggerTypes.TIMER_STOP;
		//Create placeholder pointers
		// message.duration = Utils.formatDuration(message.data.duration as number);
		// message.duration_ms = message.data.duration;
		//TODO remap the above
		return await this.parseSteps(type, message, testMode, guid);
	}
	
	private async handleChatAlert(message:TwitchatDataTypes.MessageChatAlert, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.CHAT_ALERT, message, testMode, guid);
	}
	
	private async handleRaid(message:TwitchatDataTypes.MessageRaidData, testMode:boolean, guid:number):Promise<boolean> {
		if(this.emergencyMode) return true;
		return await this.parseSteps(TriggerTypes.RAID, message, testMode, guid);
	}
	
	private async handleChatCmd(message:TwitchatDataTypes.MessageChatData, testMode:boolean, guid:number):Promise<boolean> {
		const cmd = message.message.trim().split(" ")[0].toLowerCase();
		return await this.parseSteps(TriggerTypes.CHAT_COMMAND, message, testMode, guid, cmd);
	}
	
	private async handleChatMessage(message:TwitchatDataTypes.MessageChatData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.ANY_MESSAGE, message, testMode, guid);
	}
	
	private async handleReward(message:TwitchatDataTypes.MessageRewardRedeemData, testMode:boolean, guid:number):Promise<boolean> {
		if(message.reward) {
			let id = message.reward.id;
			// if(id == "TEST_ID") {
			// 	id = TriggerTypes.REWARD_REDEEM;
			// }else{
				id = TriggerTypes.REWARD_REDEEM+"_"+id;
			// }
			return await this.parseSteps(id, message, testMode, guid);
		}
		return false;
	}
	
	private async handleChallengeContribution(message:TwitchatDataTypes.MessageCommunityChallengeContributionData, testMode:boolean, guid:number):Promise<boolean> {
		const complete = message.challenge.goal === message.challenge.progress;
		const event = complete? TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE : TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS;
		return await this.parseSteps(event, message, testMode, guid);
	}

	private async handleBanEvent(message:TwitchatDataTypes.MessageNoticeData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.BAN, message, testMode, guid);
	}

	private async handleUnbanEvent(message:TwitchatDataTypes.MessageNoticeData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.UNBAN, message, testMode, guid);
	}

	private async handleModEvent(message:TwitchatDataTypes.MessageNoticeData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.MOD, message, testMode, guid);
	}

	private async handleUnmodEvent(message:TwitchatDataTypes.MessageNoticeData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.UNMOD, message, testMode, guid);
	}

	private async handleVIPEvent(message:TwitchatDataTypes.MessageNoticeData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.VIP, message, testMode, guid);
	}

	private async handleUnVIPEvent(message:TwitchatDataTypes.MessageNoticeData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.UNVIP, message, testMode, guid);
	}

	private async handleTimeoutEvent(message:TwitchatDataTypes.MessageNoticeData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.TIMEOUT, message, testMode, guid);
	}
	
	private async handleHypeTrainEvent(message:TwitchatDataTypes.MessageHypeTrainEventData, testMode:boolean, guid:number):Promise<boolean> {
		let triggerType!:TriggerTypesValue;
		switch(message.type) {
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_APPROACHING: triggerType = TriggerTypes.HYPE_TRAIN_APPROACH; break;
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_START: triggerType = TriggerTypes.HYPE_TRAIN_START; break;
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_PROGRESS: triggerType = TriggerTypes.HYPE_TRAIN_PROGRESS; break;
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_CANCEL: triggerType = TriggerTypes.HYPE_TRAIN_CANCELED; break;
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COMPLETE: triggerType = TriggerTypes.HYPE_TRAIN_END; break;
		}
		if(triggerType) {
			return await this.parseSteps(triggerType, message, testMode, guid, undefined, "hypetrain");
		}
		return false;
	}
	
	private async handleShoutoutEvent(message:TwitchatDataTypes.ShoutoutTriggerData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.SHOUTOUT, message, testMode, guid);
	}
	
	private async handleHighlightOverlay(message:TwitchatDataTypes.ChatHighlightInfo, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.HIGHLIGHT_CHAT_MESSAGE, message, testMode, guid);
	}
	
	private async handleMusicEvent(message:TwitchatDataTypes.MusicTriggerData, testMode:boolean, guid:number):Promise<boolean> {
		const event = message.start? TriggerTypes.MUSIC_START : TriggerTypes.MUSIC_STOP;
		return await this.parseSteps(event, message, testMode, guid);
	}
	
	private async handleVoicemodEvent(message:TwitchatDataTypes.VoicemodTriggerData, testMode:boolean, guid:number):Promise<boolean> {
		return await this.parseSteps(TriggerTypes.VOICEMOD, message, testMode, guid);
	}

	/**
	 * Executes the steps of the trigger
	 * 
	 * @param eventType 
	 * @param message 
	 * 
	 * @returns true if the trigger was executed
	 */
	private async parseSteps(eventType:string, message:TwitchatDataTypes.ChatMessageTypes|null, testMode:boolean, guid:number, subEvent?:string, ttsID?:string, autoExecuteNext:boolean = true):Promise<boolean> {
		if(subEvent) eventType += "_"+subEvent
		let trigger:TwitchatDataTypes.TriggerData = this.triggers[ eventType ];
		
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
						id:Math.random().toString(),
						type:"chat",
						delay:0,
						text,
					} as TwitchatDataTypes.TriggerActionChatData
				]
			}
		}
		
		if(!trigger || !trigger.enabled || !trigger.actions || trigger.actions.length == 0) {
			return false;
		}else{
			// console.log("PARSE STEPS", eventType);
			// console.log("PARSE STEPS", eventType, trigger, message);
			const data = trigger as TwitchatDataTypes.TriggerData;
			if(!data.enabled) return false;
			let canExecute = true;

			if(data.permissions && data.cooldown && message?.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				const key = eventType+"_"+message.user.id;
				const now = Date.now();
				
				//check permissions
				if(!Utils.checkPermissions(data.permissions, message.user)) {
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
							&& message?.type == "chatOverlayHighlight"
							&& (!message.message || message.message.length===0)) {
								show = false;
							}
							await OBSWebsocket.instance.setSourceState(step.sourceName, show);
						}
					}else
					
					//Handle Chat action
					if(step.type == "chat") {
						const text = await this.parseText(eventType, message, step.text as string, false, subEvent);
						const platforms:TwitchatDataTypes.ChatPlatform[] = [];
						if(message?.platform) platforms.push(message.platform);
						MessengerProxy.instance.sendMessage(text, platforms);
					}else
					
					//Handle highlight action
					if(step.type == "highlight") {
						if(step.show) {
							let text = await this.parseText(eventType, message, step.text as string, false, subEvent, true);
							//Remove command name from message
							if(subEvent) text = text.replace(subEvent, "").trim();
							let user = null;
							const m = message as TwitchatDataTypes.Message;
							if(m?.tags?.["user-id"]) {
								[user] = await TwitchUtils.loadUserInfo([m.tags?.["user-id"] as string]);
							}
							const data = {
											message: text,
											user,
											params:StoreProxy.chat.chatHighlightOverlayParams,
										}
							PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, (data as unknown) as JsonObject)
							StoreProxy.chat.isChatMessageHighlighted = true;
						}else{
							PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, {})
							StoreProxy.chat.isChatMessageHighlighted = false;
						}
					}else
					
					//Handle TTS action
					if(step.type == "tts") {
						const text = await this.parseText(eventType, message, step.text as string, false, subEvent);
						TTSUtils.instance.readNext(text, ttsID ?? eventType);
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
						if(step.musicAction == TriggerMusicTypes.ADD_TRACK_TO_QUEUE && message?.type == "message") {
							const m = message.message.split(" ").splice(1).join(" ");
							const data:TwitchatDataTypes.MusicMessage = {
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
									//Remove command name from message
									if(subEvent) m = m.replace(subEvent, "").trim();
									data.message = m;
									const chatMessage = await this.parseText(eventType, data, step.confirmMessage);
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
							if(message?.type == "message") {
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
	private async parseText(eventType:string, message:MessageTypes|null, src:string, urlEncode = false, subEvent?:string|null, keepEmotes:boolean = false):Promise<string> {
		if(!message) return src;
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

			// console.log("Pointer:", h, "_ value:", value);
			
			h.tag = h.tag.toUpperCase();

			if(h.tag === "SUB_TIER") {
				if(!isNaN(value as number) && (value as number) > 0) {
					value = Math.round((value as number)/1000)
				}else{
					value = 1;//Fallback just in case but shouldn't be necessary
				}
			}else

			if(h.tag === "MESSAGE" && value) {
				const m = message as TwitchatDataTypes.Message;
				//Parse emotes
				const isReward = (message as TwitchatDataTypes.Highlight).reward != undefined;
				const customParsing = m.sentLocally === true || isReward;
				const chunks = TwitchUtils.parseEmotesToChunks(value as string, m.tags?.['emotes-raw'], !keepEmotes && !isReward, customParsing);
				let cleanMessage = ""
				//only keep text chunks to remove emotes
				for (let i = 0; i < chunks.length; i++) {
					const v = chunks[i];
					if(v.type == "text") {
						cleanMessage += v.value+" ";
					}else
					if((keepEmotes === true || isReward) && v.type == "emote") {
						cleanMessage += "<img src=\""+v.value+"\" class=\"emote\">";
					}
				}
				if(!subEvent) subEvent = "";
				//Remove command from final text
				value = cleanMessage.replace(new RegExp(subEvent, "i"), "").trim();
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
				const m = message as TwitchatDataTypes.MessageCheerData;
				value = await TwitchUtils.parseCheermotes(value as string, m.channel_id);
			}

			if(value && typeof value == "string") {
				//Strip HTML tags (removes emotes and cheermotes)
				if(!keepEmotes) {
					value = (value as string).replace(/<\/?\w+(?:\s+[^\s/>"'=]+(?:\s*=\s*(?:".*?[^"\\]"|'.*?[^'\\]'|[^\s>"']+))?)*?>/gi, "");
				}
				
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