import MessengerProxy from "@/messaging/MessengerProxy";
import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import * as MathJS from 'mathjs';
import type { JsonObject } from "type-fest";
import { reactive } from "vue";
import TwitchatEvent from "../../events/TwitchatEvent";
import * as TriggerActionDataTypes from "../../types/TriggerActionDataTypes";
import { TriggerActionPlaceholders, TriggerEventPlaceholders, TriggerMusicTypes, TriggerTypes, TriggerTypesDefinitionList, type ITriggerPlaceholder, type TriggerData, type TriggerLog, type TriggerTypesKey, type TriggerTypesValue } from "../../types/TriggerActionDataTypes";
import Config from "../Config";
import OBSWebsocket from "../OBSWebsocket";
import PublicAPI from "../PublicAPI";
import TTSUtils from "../TTSUtils";
import Utils from "../Utils";
import WebsocketTrigger from "../WebsocketTrigger";
import DeezerHelper from "../music/DeezerHelper";
import type { SearchTrackItem } from "../music/SpotifyDataTypes";
import SpotifyHelper from "../music/SpotifyHelper";
import { TwitchScopes } from "../twitch/TwitchScopes";
import TwitchUtils from "../twitch/TwitchUtils";
import VoicemodWebSocket from "../voice/VoicemodWebSocket";

/**
* Created : 22/04/2022 
*/
export default class TriggerActionHandler {

	private static _instance:TriggerActionHandler;

	public emergencyMode:boolean = false;
	public logHistory:TriggerLog[] = reactive([]);

	// private actionsSpool:TwitchatDataTypes.ChatMessageTypes[] = [];
	private userCooldowns:{[key:string]:number} = {};
	private globalCooldowns:{[key:string]:number} = {};
	private lastAnyMessageSent:string = "";
	private obsSourceNameToQueue:{[key:string]:Promise<void>} = {};
	private triggerTypeToQueue:{[key:string]:Promise<void>} = {};
	private liveChannelCache:{[key:string]:TwitchatDataTypes.StreamInfo}|null = null;
	private triggerType2Triggers:{[key:string]:TriggerData[]} = {};
	private HASHMAP_KEY_SPLITTER:string = "_";
	
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
	public populate(triggers:TriggerData[]):void {
		this.cleanupTriggers(triggers);
		this.buildHashmap(triggers);
	}

	/**
	 * Executes trigger(s) related to the specified message
	 * 
	 * @param message 
	 * @param testMode 
	 */
	public async execute(message:TwitchatDataTypes.ChatMessageTypes, testMode = false):Promise<void> {

		switch(message.type) {
			case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
				//Only trigger one of "first ever", "first today" or "returning" trigger
				if(message.twitch_isPresentation === true) {
					await this.executeTriggersByType(TriggerTypes.PRESENTATION, message, testMode);
				}else
				if(message.twitch_isFirstMessage === true) {
					await this.executeTriggersByType(TriggerTypes.FIRST_ALL_TIME, message, testMode);
				}else
				if(message.todayFirst === true) {
					await this.executeTriggersByType(TriggerTypes.FIRST_TODAY, message, testMode);
				}else
				if(message.twitch_isReturning === true) {
					await this.executeTriggersByType(TriggerTypes.RETURNING_USER, message, testMode);
				}

				if(message.message) {
					const cmd = message.message.trim().split(" ")[0].toLowerCase();
					await this.executeTriggersByType(TriggerTypes.CHAT_COMMAND, message, testMode, cmd);
				}
				
				if(message.user.id != StoreProxy.auth.twitch.user.id
				|| this.lastAnyMessageSent != message.message) {
					//Only parse this trigger if the message receive isn't sent by us
					//or if the text is different than the last one sent by this trigger
					await this.executeTriggersByType(TriggerTypes.ANY_MESSAGE, message, testMode);
				}
				break;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
				if(this.emergencyMode && StoreProxy.emergency.params.noTriggers === true) return;

				if(await this.executeTriggersByType(TriggerTypes.FOLLOW, message, testMode)) {
					return;
				}break;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
				if(this.emergencyMode && StoreProxy.emergency.params.noTriggers === true) return;
				
				if(message.is_gift) {
					if(await this.executeTriggersByType(TriggerTypes.SUBGIFT, message, testMode)) {
						return;
					}
				}else
				if(await this.executeTriggersByType(TriggerTypes.SUB, message, testMode)) {
					return;
				}break;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.RAID: {
				if(this.emergencyMode && StoreProxy.emergency.params.noTriggers === true) return;
				
				if(await this.executeTriggersByType(TriggerTypes.RAID, message, testMode)) {
					return;
				}break;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.REWARD: {
				const id = message.reward.id;
				if(await this.executeTriggersByType(TriggerTypes.REWARD_REDEEM, message, testMode, id)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION: {
				const complete = message.challenge.goal === message.challenge.progress;
				const event = complete? TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE : TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS;
				if(await this.executeTriggersByType(event, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.CHEER: {
				if(this.emergencyMode && StoreProxy.emergency.params.noTriggers === true) return;
				
				if(await this.executeTriggersByType(TriggerTypes.CHEER, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.PREDICTION: {
				if(await this.executeTriggersByType(TriggerTypes.PREDICTION_RESULT, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.POLL: {
				if(await this.executeTriggersByType(TriggerTypes.POLL_RESULT, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.BINGO: {
				if(await this.executeTriggersByType(TriggerTypes.BINGO_RESULT, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAFFLE: {
				if(await this.executeTriggersByType(TriggerTypes.RAFFLE_RESULT, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.COUNTDOWN: {
				const event = message.countdown.endAt? TriggerTypes.COUNTDOWN_STOP : TriggerTypes.COUNTDOWN_START;
				if(await this.executeTriggersByType(event, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.TIMER: {
				const event = message.started? TriggerTypes.TIMER_START : TriggerTypes.TIMER_STOP;
				if(await this.executeTriggersByType(event, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.BINGO: {
				if(await this.executeTriggersByType(TriggerTypes.BINGO_RESULT, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.CHAT_ALERT: {
				if(await this.executeTriggersByType(TriggerTypes.CHAT_ALERT, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.MUSIC_START:
			case TwitchatDataTypes.TwitchatMessageType.MUSIC_STOP: {
				const event = message.type == TwitchatDataTypes.TwitchatMessageType.MUSIC_START? TriggerTypes.MUSIC_START : TriggerTypes.MUSIC_STOP;
				if(await this.executeTriggersByType(event, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.VOICEMOD: {
				if(await this.executeTriggersByType(TriggerTypes.VOICEMOD, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.SHOUTOUT: {
				if(message.received && await this.executeTriggersByType(TriggerTypes.SHOUTOUT_IN, message, testMode)) {
					return;
				}
				if(!message.received && await this.executeTriggersByType(TriggerTypes.SHOUTOUT_OUT, message, testMode)) {
					return;
				}
				break;
			}

			case TwitchatDataTypes.TwitchatMessageType.CHAT_HIGHLIGHT: {
				if(await this.executeTriggersByType(TriggerTypes.HIGHLIGHT_CHAT_MESSAGE, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.OBS_SCENE_CHANGE: {
				if(await this.executeTriggersByType(TriggerTypes.OBS_SCENE, message, testMode, message.sceneName.toLowerCase())) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.OBS_SOURCE_TOGGLE: {
				const event = message.visible? TriggerTypes.OBS_SOURCE_ON : TriggerTypes.OBS_SOURCE_OFF;
				if(await this.executeTriggersByType(event, message, testMode, message.sourceName.toLowerCase())) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.OBS_FILTER_TOGGLE: {
				const event = message.enabled? TriggerTypes.OBS_FILTER_ON : TriggerTypes.OBS_FILTER_OFF;
				const subKey = message.sourceName.toLowerCase() + this.HASHMAP_KEY_SPLITTER + message.filterName.toLowerCase();
				console.log(event, subKey);
				if(await this.executeTriggersByType(event, message, testMode, subKey)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.OBS_INPUT_MUTE_TOGGLE: {
				const event = message.muted? TriggerTypes.OBS_INPUT_MUTE : TriggerTypes.OBS_INPUT_UNMUTE;
				if(await this.executeTriggersByType(event, message, testMode, message.inputName.toLowerCase())) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE: {
				const stateToType:{[key in TwitchatDataTypes.MessageOBSPlaybackStateValue]:TriggerTypesValue} = {
					"complete": TriggerTypes.OBS_PLAYBACK_ENDED,
					"start": TriggerTypes.OBS_PLAYBACK_STARTED,
					"pause": TriggerTypes.OBS_PLAYBACK_PAUSED,
					"next": TriggerTypes.OBS_PLAYBACK_NEXT,
					"prev": TriggerTypes.OBS_PLAYBACK_PREVIOUS,
					"restart": TriggerTypes.OBS_PLAYBACK_RESTARTED,
				};
				if(await this.executeTriggersByType(stateToType[message.state], message, testMode, message.inputName.toLowerCase())) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.PINNED: {
				if(await this.executeTriggersByType(TriggerTypes.PIN_MESSAGE, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.UNPINNED: {
				if(await this.executeTriggersByType(TriggerTypes.UNPIN_MESSAGE, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.BAN:{
				const event = message.duration_s? TriggerTypes.TIMEOUT : TriggerTypes.BAN
				if(await this.executeTriggersByType(event, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.UNBAN:{
				if(await this.executeTriggersByType(TriggerTypes.UNBAN, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE:{
				if(await this.executeTriggersByType(TriggerTypes.STREAM_ONLINE, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE:{
				if(await this.executeTriggersByType(TriggerTypes.STREAM_OFFLINE, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAID_STARTED:{
				if(await this.executeTriggersByType(TriggerTypes.RAID_STARTED, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK:{
				if(await this.executeTriggersByType(TriggerTypes.USER_WATCH_STREAK, message, testMode)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE:{
				let type:TriggerTypesValue = message.added > 0? TriggerTypes.COUNTER_ADD : TriggerTypes.COUNTER_DEL;
				if(message.maxed) type = TriggerTypes.COUNTER_MAXED;
				if(message.mined) type = TriggerTypes.COUNTER_MINED;
				if(message.looped) type = TriggerTypes.COUNTER_LOOPED;
				if(await this.executeTriggersByType(type, message, testMode, message.counter.id)) {
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
				if(await this.executeTriggersByType(map[message.type]!, message, testMode)) {
					return;
				}break;
			}


			case TwitchatDataTypes.TwitchatMessageType.NOTICE: {
				switch(message.noticeId) {
					case TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE:{
						if(await this.executeTriggersByType(TriggerTypes.STREAM_INFO_UPDATE, message, testMode)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE:{
						const m = message as TwitchatDataTypes.MessageEmergencyModeInfo;
						const event = m.enabled? TriggerTypes.EMERGENCY_MODE_START : TriggerTypes.EMERGENCY_MODE_STOP;
						if(await this.executeTriggersByType(event, message, testMode)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.MOD:{
						if(await this.executeTriggersByType(TriggerTypes.MOD, message, testMode)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.UNMOD:{
						if(await this.executeTriggersByType(TriggerTypes.UNMOD, message, testMode)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.VIP:{
						if(await this.executeTriggersByType(TriggerTypes.VIP, message, testMode)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.UNVIP:{
						if(await this.executeTriggersByType(TriggerTypes.UNVIP, message, testMode)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE:{
						const m = message as TwitchatDataTypes.MessageShieldMode;
						const event = m.enabled? TriggerTypes.SHIELD_MODE_ON : TriggerTypes.SHIELD_MODE_OFF;
						if(await this.executeTriggersByType(event, message, testMode)) {
							return;
						}break;
					}
				}
				break;
			}
		}
	}

	public async parseScheduleTrigger(trigger:TriggerData, testMode:boolean = false):Promise<boolean> {
		//This fake message is just here to comply with parseSteps() signature.
		//It's actually not used. I could only set the second param as optional
		//but I prefer keeping it mandatory as the only exception to that is this call.
		const fakeMessage:TwitchatDataTypes.MessageNoticeData = { id:"fake_schedule_message", date:Date.now(), type:"notice", noticeId:"generic", message:"", platform:"twitchat" };
		return await this.executeTrigger(trigger, fakeMessage, testMode, undefined, "schedule");
	}

	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		this.checkLiveFollowings(false);
		this.buildHashmap(StoreProxy.triggers.triggerList);
	}
	
	/**
	 * Builds a hashmap to access trigger types faster
	 * This is probably not a very necessary optimisation unless a user
	 * Has hundreds if not thousands of triggers, but it doesnt costs
	 * much to implement!
	 */
	private buildHashmap(triggers:TriggerData[]):void {
		this.triggerType2Triggers = {};
		
		if(!triggers || !Array.isArray(triggers)) return;

		for (let i = 0; i < triggers.length; i++) {
			const t = triggers[i];
			let keys:string[] = [t.type as string];
			switch(t.type) {
				case TriggerTypes.CHAT_COMMAND: {
					keys[0] += this.HASHMAP_KEY_SPLITTER + t.chatCommand;
					if(t.chatCommandAliases) {
						for (let i = 0; i < t.chatCommandAliases.length; i++) {
							keys.push(t.type + this.HASHMAP_KEY_SPLITTER + t.chatCommandAliases[i]);
						}
					}
					break;
				}

				case TriggerTypes.REWARD_REDEEM: keys[0] += this.HASHMAP_KEY_SPLITTER + t.rewardId; break;

				case TriggerTypes.OBS_SCENE: keys[0] += this.HASHMAP_KEY_SPLITTER + t.obsScene; break;

				case TriggerTypes.OBS_SOURCE_ON:
				case TriggerTypes.OBS_SOURCE_OFF: keys[0] += this.HASHMAP_KEY_SPLITTER + t.obsSource; break;

				case TriggerTypes.OBS_FILTER_ON:
				case TriggerTypes.OBS_FILTER_OFF: keys[0] += this.HASHMAP_KEY_SPLITTER + t.obsSource + this.HASHMAP_KEY_SPLITTER + t.obsFilter; break;

				case TriggerTypes.OBS_PLAYBACK_STARTED:
				case TriggerTypes.OBS_PLAYBACK_ENDED:
				case TriggerTypes.OBS_PLAYBACK_PAUSED:
				case TriggerTypes.OBS_PLAYBACK_RESTARTED:
				case TriggerTypes.OBS_PLAYBACK_NEXT:
				case TriggerTypes.OBS_PLAYBACK_PREVIOUS:
				case TriggerTypes.OBS_INPUT_MUTE:
				case TriggerTypes.OBS_INPUT_UNMUTE: keys[0] += this.HASHMAP_KEY_SPLITTER + t.obsInput; break;

				case TriggerTypes.COUNTER_ADD:
				case TriggerTypes.COUNTER_DEL:
				case TriggerTypes.COUNTER_LOOPED:
				case TriggerTypes.COUNTER_MAXED:
				case TriggerTypes.COUNTER_MINED: keys[0] += this.HASHMAP_KEY_SPLITTER + t.counterId; break;
			}

			for (let i = 0; i < keys.length; i++) {
				keys[i] = keys[i].toLowerCase();
				if(!this.triggerType2Triggers[ keys[i] ]) {
					this.triggerType2Triggers[ keys[i] ] = [];
				}
				this.triggerType2Triggers[ keys[i] ]!.push(t);
			}
		}
	}

	/**
	 * Cleans up the triggers
	 * @param triggers 
	 */
	private cleanupTriggers(triggers:TriggerData[]):void {
		for (let i = 0; i < triggers.length; i++) {
			const t = triggers[i];
			let found = false;
			for (const key in TriggerTypes) {
				if(t.type === TriggerTypes[key as TriggerTypesKey]
				&& TriggerTypesDefinitionList().findIndex(v=> v.value == t.type) > -1) {
					found = true;
					break;
				}
			}
			if(!found) {
				console.log("delete trigger", triggers[i]);
				triggers.splice(i, 1);
				i--;
			}
		}
	}
	

	/**
	 * Executes triggers by their type
	 * 
	 * @param triggerType	type of triggers to execute
	 * @param message 		message at the origin of the execution
	 * @param testMode 		is it a test execution ?
	 * @param subEvent 		sub event value (reward ID, counter ID, )
	 * @param ttsID 
	 * 
	 * @returns true if the trigger was executed
	 */
	private async executeTriggersByType(triggerType:TriggerTypesValue, message:TwitchatDataTypes.ChatMessageTypes, testMode:boolean, subEvent?:string, ttsID?:string):Promise<boolean> {
		let key = triggerType as string;
		if(subEvent) key += this.HASHMAP_KEY_SPLITTER + subEvent;
		key = key.toLowerCase();

		let triggers = this.triggerType2Triggers[ key ];
		if(!triggers || triggers.length == 0) return false;
		
		let isAnExecution = false;
		//Execute all triggers related to the current trigger event type
		for (const trigger of triggers) {
			if(await this.executeTrigger(trigger, message, testMode, subEvent, ttsID)) {
				isAnExecution = true;
			}
		}

		return isAnExecution;
	}

	/**
	 * Execute a specific trigger
	 */
	public async executeTrigger(trigger:TriggerData, message:TwitchatDataTypes.ChatMessageTypes, testMode:boolean, subEvent?:string, ttsID?:string, dynamicPlaceholders:{[key:string]:string|number} = {}, ignoreDisableState:boolean = false):Promise<boolean> {
		let log:TriggerLog = {
			id:Utils.getUUID(),
			trigger,
			date:Date.now(),
			complete:false,
			skipped:false,
			data: message,
			testMode,
			steps:[],
			messages:[],
		};

		//Avoid polluting trigger execution history for Twitchat internal triggers
		const noLogs:TriggerTypesValue[] = [TriggerTypes.TWITCHAT_SHOUTOUT_QUEUE,TriggerTypes.TWITCHAT_AD,TriggerTypes.TWITCHAT_LIVE_FRIENDS]
		if(!noLogs.includes(trigger.type))	this.logHistory.unshift(log);
		//Only keep last 100 triggers
		if(this.logHistory.length > 100)	this.logHistory.pop();
	
		//Special case for friends stream start/stop notifications
		if(trigger.type == TriggerTypes.TWITCHAT_LIVE_FRIENDS) {
			await this.checkLiveFollowings().catch(()=>{});
			return true;
		}
	
		//Special case for pending shoutouts
		if(trigger.type == TriggerTypes.TWITCHAT_SHOUTOUT_QUEUE) {
			StoreProxy.users.executePendingShoutouts();
			return true;
		}
		
		//Special case for twitchat's ad
		if(trigger.type == TriggerTypes.TWITCHAT_AD) {
			let text:string = StoreProxy.chat.botMessages.twitchatAd.message;
			//If no link is found on the message, send default message
			if(!/(^|\s|https?:\/\/)twitchat\.fr($|\s)/gi.test(text)) {
				text = StoreProxy.i18n.t("global.ad_default", {USER_MESSAGE:text});
			}
			MessengerProxy.instance.sendMessage(text);
			return true;
		}

		// console.log("PARSE STEPS", eventType, trigger, message);
		let canExecute = true;

		if(!testMode && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			const triggerId = trigger.id;
			const now = Date.now();
			
			//check permissions
			if(trigger.permissions && !await Utils.checkPermissions(trigger.permissions, message.user, message.channel_id)) {
				log.messages.push({date:Date.now(), value:"User is not allowed"});
				canExecute = false;
			}else if(trigger.cooldown){
				//Apply cooldowns if any

				//Global cooldown
				if(this.globalCooldowns[triggerId] > 0 && this.globalCooldowns[triggerId] > now) {
					const remaining_s = Utils.formatDuration(this.globalCooldowns[triggerId] - now + 1000) + "s";
					canExecute = false;
					if(trigger.cooldown.alert !== false) {
						const text = StoreProxy.i18n.t("global.cooldown", {USER:message.user.login, DURATION:remaining_s});
						MessengerProxy.instance.sendMessage(text, [message.platform], message.channel_id);
					}
				}
				else if(trigger.cooldown.global > 0) this.globalCooldowns[triggerId] = now + trigger.cooldown.global * 1000;

				//User cooldown
				const key = triggerId+this.HASHMAP_KEY_SPLITTER+message.user.id;
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

		//Create dynamic placeholders only if trigger is planned for execution so far.
		//These are necessary to check for conditions.
		//For example, if there's a custom chat command param, it may be used on the
		//trigger's condition system, in which case we need it before checking if the
		//conditions are matched
		if(canExecute) {
			//Handle optional chat command custom params
			if((message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE || message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER)
			&& trigger.chatCommandParams && trigger.chatCommandParams.length > 0) {
				let res = message.message.trim()

				//Remove sub event from the text (the command)
				let subEvent_regSafe = "";
				if(subEvent) subEvent_regSafe = subEvent.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
				res = res.replace(new RegExp(subEvent_regSafe, "i"), "").trim();

				res = res.replace(/\s+/gi, ' ');//replace consecutive white spaces
				const params = res.split(" ");

				//Add all params in the dynamic placeholders
				for (let i = 0; i < trigger.chatCommandParams.length; i++) {
					const param = trigger.chatCommandParams[i];
					dynamicPlaceholders[param.tag] = params[i] || "";
					log.messages.push({date:Date.now(), value:"Add dynamic placeholder \"{"+param.tag+"}\" => \""+params[i]+"\""});
				}
			}
		}
		
		//check execution conditions
		if(!testMode
		&& trigger.conditions
		&& trigger.conditions.conditions.length > 0
		&& !await this.checkConditions(trigger.conditions.operator, [trigger.conditions], trigger, message, log, dynamicPlaceholders, subEvent)) {
			log.messages.push({date:Date.now(), value:"Execution conditions not fulfilled"});
			canExecute = false;
		}

		if(!trigger || !trigger.actions || trigger.actions.length == 0) {
			canExecute = false;
			log.messages.push({date:Date.now(), value:"Trigger has no child actions"});
		}
		if(!trigger.enabled && !testMode && !ignoreDisableState) {
			canExecute = false;
			log.messages.push({date:Date.now(), value:"Trigger is disabled"});
		}
		
		log.skipped = !canExecute;

		//Stop there if previous conditions aren't matched
		if(!canExecute) return false;
			
		//Wait for potential previous trigger of the exact same type to finish its execution
		const queueKey = trigger.queue || trigger.id;
		const eventBusy = this.triggerTypeToQueue[queueKey] != undefined;
		log.messages.push({date:Date.now(), value:"Execute trigger in queue \""+queueKey+"\""});
		if(eventBusy) {
			log.messages.push({date:Date.now(), value:"A trigger is already executing in this queue, wait for it to complete"});
		}
		let prom = this.triggerTypeToQueue[queueKey] ?? Promise.resolve();
		let resolverTriggerType!: ()=>void;
		this.triggerTypeToQueue[queueKey] = new Promise<void>(async (resolve, reject)=> { resolverTriggerType = resolve });
		await prom;
		if(eventBusy) {
			log.messages.push({date:Date.now(), value:"Pending trigger complete, continue process"});
		}

		for (const step of trigger.actions) {
			const logStep = {id:Utils.getUUID(), date:Date.now(), data:step, messages:[] as {date:number, value:string}[]};
			log.steps.push(logStep);

			const actionPlaceholders = TriggerActionPlaceholders(step.type);
				
			logStep.messages.push({date:Date.now(), value:"Start step execution"});

			try {
				// console.log("	Parse step", step);
				//Handle delay action
				if(step.type == "delay") {
					logStep.messages.push({date:Date.now(), value:"Wait for "+ step.delay.toString()+"s..."});
					await Utils.promisedTimeout(step.delay * 1000);
				}else
				
				//Handle OBS action
				if(step.type == "obs") {
					//Wait for potential OBS action in progress for the exact same source
					//to complete its execution
					const sourceBusy = this.obsSourceNameToQueue[step.sourceName] != undefined;
					if(sourceBusy) {
						logStep.messages.push({date:Date.now(), value:"OBS source \""+step.sourceName+"\" is busy, wait for its release"});
					}
					let prom = this.obsSourceNameToQueue[step.sourceName] ?? Promise.resolve();
					let resolverOBS!: ()=>void;
					this.obsSourceNameToQueue[step.sourceName] = new Promise<void>(async (resolve, reject)=> { resolverOBS = resolve });
					await prom;
					if(sourceBusy) {
						logStep.messages.push({date:Date.now(), value:"OBS source \""+step.sourceName+"\" has been released, continue process"});
					}
					
					logStep.messages.push({date:Date.now(), value:"Execute OBS action on source \""+step.sourceName+"\""});
					
					if(!OBSWebsocket.instance.connected) {
						logStep.messages.push({date:Date.now(), value:"OBS-Websocket NOT CONNECTED! Cannot execute requested action."});
					}else{

						if(step.text) {
							try {
								const text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.text as string, subEvent);
								await OBSWebsocket.instance.setTextSourceContent(step.sourceName, text);
							}catch(error) {
								console.error(error);
							}
						}
						if(step.url) {
							try {
								const url = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.url as string, subEvent);
								await OBSWebsocket.instance.setBrowserSourceURL(step.sourceName, url);
							}catch(error) {
								console.error(error);
							}
						}
						if(step.mediaPath) {
							try {
								let url = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.mediaPath as string, subEvent, true, true);
								await OBSWebsocket.instance.setMediaSourceURL(step.sourceName, url);
							}catch(error) {
								console.error(error);
							}
						}
			
						if(step.filterName) {
							try {
								await OBSWebsocket.instance.setFilterState(step.sourceName, step.filterName, step.action === "show");
							}catch(error) {
								console.error(error);
							}
						}else{
							let action = step.action;
							//If requesting to show an highlighted message but the message
							//is empty, force source to hide
							if(trigger.type == TriggerTypes.HIGHLIGHT_CHAT_MESSAGE
							&& message.type == "chat_highlight"
							&& (!message.info.message || message.info.message.length===0)) {
								action = "hide";
							}
							try {
								switch(action) {
									case "hide": await OBSWebsocket.instance.setSourceState(step.sourceName, false); break;
									case "show": await OBSWebsocket.instance.setSourceState(step.sourceName, true); break;
									case "replay": await OBSWebsocket.instance.replayMedia(step.sourceName); break;
									case "mute": await OBSWebsocket.instance.setMuteState(step.sourceName, true); break;
									case "unmute": await OBSWebsocket.instance.setMuteState(step.sourceName, false); break;
								}
							}catch(error) {
								console.error(error);
							}
						}
						
						logStep.messages.push({date:Date.now(), value:"OBS action executed on source \""+step.sourceName+"\""});
					}

					resolverOBS();
					delete this.obsSourceNameToQueue[step.sourceName];
				}else
				
				//Handle Chat action
				if(step.type == "chat") {
					// console.log("CHAT ACTION");
					const text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.text as string, subEvent);
					const platforms:TwitchatDataTypes.ChatPlatform[] = [];
					if(message.platform != "twitchat") platforms.push(message.platform);
					// console.log(platforms, text);
					MessengerProxy.instance.sendMessage(text, platforms);
					if(trigger.type == TriggerTypes.ANY_MESSAGE) {
						this.lastAnyMessageSent = text;
					}
				}else
				
				//Handle highlight action
				if(step.type == "highlight") {
					if(step.show) {
						let text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.text as string, subEvent, true);
						let user:TwitchatDataTypes.TwitchatUser|undefined = undefined;
						if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
						|| message.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING
						|| message.type == TwitchatDataTypes.TwitchatMessageType.CHEER
						|| message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION
						|| message.type == TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION
						|| message.type == TwitchatDataTypes.TwitchatMessageType.RAID
						|| message.type == TwitchatDataTypes.TwitchatMessageType.RAID_STARTED
						|| message.type == TwitchatDataTypes.TwitchatMessageType.BINGO
						|| message.type == TwitchatDataTypes.TwitchatMessageType.SHOUTOUT
						|| message.type == TwitchatDataTypes.TwitchatMessageType.REWARD) {
							user = message.user;
							if(!message.user.displayName || !message.user.avatarPath || !message.user.login) {
								//Get user info
								const [twitchUser] = await TwitchUtils.loadUserInfo([message.user.id]);
								message.user.avatarPath = twitchUser.profile_image_url;
								//Populate more info just in case some are missing
								message.user.login = twitchUser.login;
								message.user.displayName = twitchUser.display_name;
							}
						}
						let info:TwitchatDataTypes.ChatHighlightInfo = {
							message:text,
							user,
							params:StoreProxy.chat.chatHighlightOverlayParams,
						};
						log.messages.push({date:Date.now(), value:"Highlight message \""+text+"\""});
						PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, (info as unknown) as JsonObject)
						StoreProxy.chat.isChatMessageHighlighted = true;
					}else{
						PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, {})
						StoreProxy.chat.isChatMessageHighlighted = false;
					}
				}else
				
				//Handle TTS action
				if(step.type == "tts" && message) {
					let text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.text, subEvent);
					log.messages.push({date:Date.now(), value:"TTS read message \""+text+"\""});
					TTSUtils.instance.readNext(text, ttsID ?? trigger.id);
				}else
				
				//Handle poll action
				if(step.type == "poll") {
					try {
						if(step.pollData.title && step.pollData.answers.length >= 2) {
							let answers:string[] = [];
							for (const a of step.pollData.answers) {
								answers.push(await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, a))
							}
							await TwitchUtils.createPoll(StoreProxy.auth.twitch.user.id,
								await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.pollData.title),
								answers,
								step.pollData.voteDuration * 60,
								step.pollData.pointsPerVote);
						}else{
							logStep.messages.push({date:Date.now(), value:"Cannot create poll as it's missing either the title or answers"});
						}
					}catch(error:any) {
						const message = error.message ?? error.toString()
						StoreProxy.main.alert(StoreProxy.i18n.t("error.poll_error", {MESSAGE:message}))
					}
				}else
				
				//Handle poll action
				if(step.type == "prediction") {
					try {
						if(step.predictionData.title && step.predictionData.answers.length >= 2) {
							let answers:string[] = [];
							for (const a of step.predictionData.answers) {
								answers.push(await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, a))
							}
							await TwitchUtils.createPrediction(StoreProxy.auth.twitch.user.id,
								await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.predictionData.title),
								answers,
								step.predictionData.voteDuration * 60);
						}else{
							logStep.messages.push({date:Date.now(), value:"Cannot create prediction as it's missing either the title or answers"});
						}
					}catch(error:any) {
						const message = error.message ?? error.toString()
						StoreProxy.main.alert(StoreProxy.i18n.t("error.prediction_error", {MESSAGE:message}))
					}
				}else
				
				//Handle raffle action
				if(step.type == "raffle") {
					let data:TwitchatDataTypes.RaffleData = JSON.parse(JSON.stringify(step.raffleData));
					if(data.customEntries) {
						//Parse placeholders on custom erntries
						data.customEntries = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, data.customEntries);
					}
					StoreProxy.raffle.startRaffle(data);
				}else
				
				//Handle raffle enter action
				if(step.type == "raffle_enter") {
					StoreProxy.raffle.checkRaffleJoin(message);
				}else
				
				//Handle bingo action
				if(step.type == "bingo") {
					const data:TwitchatDataTypes.BingoConfig = JSON.parse(JSON.stringify(step.bingoData));
					if(data.customValue) {
						data.customValue = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, data.customValue);
					}
					StoreProxy.bingo.startBingo(data);
				}else
				
				//Handle chat suggesiton action
				if(step.type == "chatSugg") {
					const data:TwitchatDataTypes.ChatSuggestionData = JSON.parse(JSON.stringify(step.suggData));
					data.startTime = Date.now();
					data.choices = [];
					data.winners = [];
					StoreProxy.chatSuggestion.setChatSuggestion(data);
				}else
				
				//Handle voicemod action
				if(step.type == "voicemod") {
					if(step.voiceID) {
						VoicemodWebSocket.instance.enableVoiceEffect(step.voiceID)
					}
				}else
				
				//Handle sub trigger action
				if(step.type == "trigger") {
					if(step.triggerId) {
						const trigger = StoreProxy.triggers.triggerList.find(v=>v.id == step.triggerId);
						if(trigger) {
							// console.log("Exect sub trigger", step.triggerKey);
							logStep.messages.push({date:Date.now(), value:"Call trigger \""+step.triggerId+"\""});
							await this.executeTrigger(trigger, message, testMode, undefined, undefined, dynamicPlaceholders);
						}else{
							logStep.messages.push({date:Date.now(), value:"❌ Call trigger, trigger \""+step.triggerId+"\" not found"});
						}
					}else{
						logStep.messages.push({date:Date.now(), value:"❌ Call trigger, no trigger defined"});
					}
				}else
				
				//Handle sub trigger toggle action
				if(step.type == "triggerToggle") {
					if(step.triggerId) {
						const trigger = StoreProxy.triggers.triggerList.find(v=>v.id == step.triggerId);
						if(trigger) {
							switch(step.action) {
								case "enable": trigger.enabled = true; break;
								case "disable": trigger.enabled = false; break;
								case "toggle": trigger.enabled = !trigger.enabled; break;
							}
							// console.log("Exect sub trigger", step.triggerKey);
							logStep.messages.push({date:Date.now(), value:step.action + " trigger \""+step.triggerId+"\". New State is: "+trigger.enabled});
						}
					}
				}else
				
				//Handle http call trigger action
				if(step.type == "http") {
					const options = {
						method:step.method,
					};
					let uri = step.url;
					if(!/https?:\/\//gi.test(uri)) uri = "https://"+uri;
					const url = new URL(uri);
					for (const tag of step.queryParams) {
						const text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, "{"+tag+"}", subEvent);
						url.searchParams.append(tag.toLowerCase(), text);
					}
					try {
						logStep.messages.push({date:Date.now(), value:"Calling HTTP: "+url});
						const res = await fetch(url, options);
						if(step.outputPlaceholder && res.status >= 200 && res.status <= 208) {
							dynamicPlaceholders[step.outputPlaceholder] = await res.text();
						}
					}catch(error) {
						console.error(error);
					}
				}else
				
				//Handle WS message trigger action
				if(step.type == "ws") {
					const json:{[key:string]:number|string|boolean} = {};
					for (const tag of step.params) {
						const value = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, "{"+tag+"}", subEvent);
						json[tag.toLowerCase()] = value;
						if(step.topic) {
							json.topic = step.topic;
						}
					}
					try {
						if(WebsocketTrigger.instance.connected) {
							logStep.messages.push({date:Date.now(), value:"Sending WS message: "+json});
							WebsocketTrigger.instance.sendMessage(json);
						}else{
							logStep.messages.push({date:Date.now(), value:"Websocket not connected. Cannot send data: "+json});
						}
					}catch(error) {
						console.error(error);
					}
				}else
				
				//Handle counter update trigger action
				if(step.type == "count") {
					let text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.addValue as string, subEvent);
					text = text.replace(/,/gi, ".");
					const value = MathJS.evaluate(text);
					if(!step.action) step.action = "ADD";

					if(!isNaN(value)) {
						const ids = step.counters;
						for (const c of StoreProxy.counters.counterList) {
							if(ids.indexOf(c.id) > -1) {
								let user = c.perUser? this.extractUser(trigger, message) : undefined;
								//Check if this step requests that this counter should update a user
								//different than the default one (the one executing the command)
								if(c.perUser
								&& step.counterUserSources
								&& step.counterUserSources[c.id]
								&& step.counterUserSources[c.id] != TriggerActionDataTypes.COUNTER_EDIT_SOURCE_SENDER
								&& step.counterUserSources[c.id] != TriggerActionDataTypes.COUNTER_EDIT_SOURCE_EVERYONE) {
									log.messages.push({date:Date.now(), value:"Load custom user from placeholder \"{"+step.counterUserSources[c.id].toUpperCase()+"}\"..."})
									//Convert placeholder to a string value
									const login = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, "{"+step.counterUserSources[c.id].toUpperCase()+"}")
									log.messages.push({date:Date.now(), value:"...extracted user is \""+login+"\""});
									if(login) {
										//Not ideal but if there are multiple users they're concatenated in
										//a single coma seperated string (placeholder parsing is made for display :/).
										//Here we split it on comas just in case there are multiple user names
										let list = login.split(",");
										for (let displayName of list) {
											displayName = displayName.trim();
											let channelId = StoreProxy.auth.twitch.user.id;
											if(TwitchatDataTypes.GreetableMessageTypesString[message.type as TwitchatDataTypes.GreetableMessageTypes] === true) {
												channelId = (message as TwitchatDataTypes.GreetableMessage).channel_id;
											}
											//Load user details
											await new Promise<void>((resolve, reject)=> {
												//FIXME that hardcoded platform "twitch" will break if adding a new platform
												//I can't just use "message.platform" as this contains "twitchat" for messages
												//like raffle and bingo results. Full user loading only happens if "twitch"
												//platform is specified, the user would remain in a temporary state otherwise
												StoreProxy.users.getUserFrom("twitch", channelId, undefined, undefined, displayName, (userData)=>{
													if(userData.errored || userData.temporary) {
														log.messages.push({date:Date.now(), value:"❌ Custom user loading failed!"});
														user = undefined;
													}else{
														user = userData;
														log.messages.push({date:Date.now(), value:"✔ Custom user loading complete: "+user.displayName+"(#"+user.id+")"});
													}
													resolve();
												});
											});

											if(!c.perUser || (user && !user.temporary && !user.errored)) StoreProxy.counters.increment(c.id, step.action, value, user);
											let logMessage = "Update \""+c.name+"\", \""+step.action+"\" "+value+" ("+text+")";
											if(user) logMessage += " (for @"+user.displayName+")";
											logStep.messages.push({date:Date.now(), value:logMessage});
										}
									}

								//Check if requested to edit all users of a counter
								}else if(c.perUser
								&& c.users
								&& step.counterUserSources
								&& step.counterUserSources[c.id]
								&& step.counterUserSources[c.id] == TriggerActionDataTypes.COUNTER_EDIT_SOURCE_EVERYONE){
									logStep.messages.push({date:Date.now(), value:"Update all users, \""+step.action+"\" "+value+" ("+text+")"});
									console.log("counter", c);
									for (const uid in c.users) {
										StoreProxy.counters.increment(c.id, step.action, value, undefined, uid);
									}

								//Standard counter edition (either current user or a non-per-user counter)
								}else{

									if(!c.perUser || (user && !user.temporary && !user.errored)) StoreProxy.counters.increment(c.id, step.action, value, user);
									let logMessage = "Increment \""+c.name+"\" by "+value+" ("+text+")";
									if(user) logMessage += " (for @"+user.displayName+")";
									logStep.messages.push({date:Date.now(), value:logMessage});
								}
							}
						}
					}
				}else

				//Handle counter read trigger actions
				if(step.type == "countget") {
					const counter = StoreProxy.counters.counterList.find(v => v.id == step.counter);
					if(counter) {
						let value = counter.value || 0;
						if(counter.perUser) {
							let user = this.extractUser(trigger, message);
							if(user && counter.users) {
								value = counter.users[user.id] || 0;
							}
						}
						logStep.messages.push({date:Date.now(), value:"Add dynamic placeholder \"{"+step.placeholder+"\"} with value \""+value+"\""});
						dynamicPlaceholders[step.placeholder] = value;
					}
					
				}else

				//Handle random generator trigger action
				if(step.type == "random") {
					if(step.mode == "number" && step.placeholder) {
						//Generate random number
						const min = Math.min(step.min, step.max);
						const max = Math.max(step.min, step.max);
						let value = Math.random() * (max-min) + min;
						if(step.float !== true) {
							value = Math.round(value);
						}
						dynamicPlaceholders[step.placeholder] = value;
						logStep.messages.push({date:Date.now(), value:"Add dynamic placeholder \"{"+step.placeholder+"}\" with value \""+value+"\""});
						
					}else if(step.mode == "list" && step.placeholder) {
						//Pick an item from a custom list
						const value = Utils.pickRand(step.list);
						dynamicPlaceholders[step.placeholder] = value;
						logStep.messages.push({date:Date.now(), value:"Add dynamic placeholder \"{"+step.placeholder+"}\" with value \""+value+"\""});
					
					}else if(step.mode == "trigger") {
						//Pick an item from a custom list
						const triggerList = StoreProxy.triggers.triggerList;
						const hashmap:{[key:string]:TriggerData} = {};
						triggerList.forEach(t => hashmap[t.id] = t);

						let triggers = step.triggers;
						//If requesting to ignore disabled triggers, filter them out
						//Testing with "!== false" because the prop was added later and might be
						//missing and I want it to be "true" by default
						if(step.skipDisabled !== false) triggers = triggers.filter(t => hashmap[t].enabled);
						if(triggers.length === 0) {
							logStep.messages.push({date:Date.now(), value:"Empty trigger list or all triggers disabled"});
						}else{
							//Pick a random trigger
							const triggerId = Utils.pickRand(triggers);
							if(triggerId) {
								const trigger = StoreProxy.triggers.triggerList.find(v=>v.id == triggerId);
								if(trigger) {
									// console.log("Exec sub trigger", step.triggerKey);
									logStep.messages.push({date:Date.now(), value:"Call random trigger \""+triggerId+"\""});
									await this.executeTrigger(trigger, message, testMode, undefined, undefined, dynamicPlaceholders, true);
									if(step.disableAfterExec === true) {
										trigger.enabled = false;
									}
								}else{
									logStep.messages.push({date:Date.now(), value:"Random trigger not found for ID \""+triggerId+"\""});
								}
							}
						}
					}
				}else

				//Handle stream info update trigger action
				if(step.type == "stream_infos") {
					if(step.title) {
						let title = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.title);
						let tags = [];
						for (const tag of step.tags) {
							tags.push(await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, tag));
						}
						logStep.messages.push({date:Date.now(), value:"Set stream infos. Title:\""+title+"\" Tags:\""+tags+"\" CategoryID:\""+step.categoryId+"\""});
						await StoreProxy.stream.setStreamInfos("twitch", title, step.categoryId, StoreProxy.auth.twitch.user.id, tags);
					}
				}else

				//Handle mobile device vibration action
				if(step.type == "vibrate") {
					if(step.pattern) {
						let pattern:number[] = TriggerActionDataTypes.VIBRATION_PATTERNS.find(v=>v.id == step.pattern)?.pattern || [];
						logStep.messages.push({date:Date.now(), value:"Vibrate device with pattern \""+step.pattern+"\" => \"["+pattern+"]\""});
						window.navigator.vibrate(pattern);
					}
				}else

				//Handle music actions
				if(step.type == "music") {
					try {
						logStep.messages.push({date:Date.now(), value:"[MUSIC] Execute music action: "+step.musicAction});
						logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Spotify connected? "+Config.instance.SPOTIFY_CONNECTED});
						//Adding a track to the queue
						if(step.musicAction == TriggerMusicTypes.ADD_TRACK_TO_QUEUE) {
							//Convert placeholders if any
							const m = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.track, subEvent);
							let data:TwitchatDataTypes.MusicTrackData|null = null;
							if(Config.instance.SPOTIFY_CONNECTED) {
								let track:SearchTrackItem|null = null;
								if(/open\.spotify\.com\/track\/.*/gi.test(m)) {
									//Full URL specified, extract the ID from it
									const chunks = m.replace(/https?:\/\//gi,"").split(/\/|\?/gi)
									const id = chunks[2];
									track = await SpotifyHelper.instance.getTrackByID(id);
									logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Get track by ID success: "+(track != null)});
								}else{
									//No URL given, search with API
									track = await SpotifyHelper.instance.searchTrack(m);
									logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Search track success: "+(track != null)});
								}
								if(track) {
									if(await SpotifyHelper.instance.addToQueue(track.uri)) {
										logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Add to queue success: true"});
										data = {
											title:track.name,
											artist:track.artists[0].name,
											album:track.album.name,
											cover:track.album.images[0].url,
											duration:track.duration_ms,
											url:track.external_urls.spotify,
										};
									}else{
										logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Add to queue success: false"});
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
								const addedToQueueMessage:TwitchatDataTypes.MessageMusicAddedToQueueData = {
									id:Utils.getUUID(),
									date:Date.now(),
									platform:"twitchat",
									type:TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE,
									trackAdded:data,
								}
								PublicAPI.instance.broadcast(TwitchatEvent.TRACK_ADDED_TO_QUEUE, (data as unknown) as JsonObject);
								//Execute "TRACK_ADDED_TO_QUEUE" trigger
								this.executeTriggersByType(TriggerTypes.TRACK_ADDED_TO_QUEUE, addedToQueueMessage, false);

								//The step is requesting to confirm on chat when a track has been added
								if(step.confirmMessage) {
									const messageLoc = message as TwitchatDataTypes.MessageChatData;
									const triggerData:TwitchatDataTypes.MessageMusicAddedToQueueData = {
										id:Utils.getUUID(),
										date:Date.now(),
										platform:"twitchat",
										type:TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE,
										trackAdded:data,
										message:messageLoc.message,
										user:messageLoc.user,
									}
									//First pass to inject track info
									let chatMessage = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, triggerData, step.confirmMessage, subEvent, false);
									//Second pass to inject trigger specifics
									//TODO was this necessary ? Not sure i understand what it's for
									// chatMessage = await this.parseText(dynamicPlaceholders, actionPlaceholders, trigger, addedToQueueMessage, chatMessage, subEvent);
									MessengerProxy.instance.sendMessage(chatMessage);
								}
							}
						}else
						
						if(step.musicAction == TriggerMusicTypes.NEXT_TRACK) {
							if(Config.instance.SPOTIFY_CONNECTED) {
								SpotifyHelper.instance.nextTrack().then(res=>{
									logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Next track success: "+res});
								});
							}
							if(Config.instance.DEEZER_CONNECTED) {
								DeezerHelper.instance.nextTrack();
							}
						}else
						
						if(step.musicAction == TriggerMusicTypes.PAUSE_PLAYBACK) {
							if(Config.instance.SPOTIFY_CONNECTED) {
								SpotifyHelper.instance.pause().then(res=> {
									logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Pause success: "+res});
								});
							}
							if(Config.instance.DEEZER_CONNECTED) {
								DeezerHelper.instance.pause();
							}
						}else
						
						if(step.musicAction == TriggerMusicTypes.RESUME_PLAYBACK) {
							if(Config.instance.SPOTIFY_CONNECTED) {
								SpotifyHelper.instance.resume().then(res=> {
									logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Resume success: "+res});
								});
							}
							if(Config.instance.DEEZER_CONNECTED) {
								DeezerHelper.instance.resume();
							}
						}else
						
						if(step.musicAction == TriggerMusicTypes.START_PLAYLIST) {
							let m:string = step.playlist;
							if(message.type == "message") {
								m = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, m, subEvent);
							}
							if(Config.instance.SPOTIFY_CONNECTED) {
								let id:string|null = null;
								if(/open\.spotify\.com\/playlist\/.*/gi.test(m)) {
									const chunks = m.replace(/https?:\/\//gi,"").split(/\/|\?/gi)
									id = chunks[2];
								}
								const success = await SpotifyHelper.instance.startPlaylist(id, m);
								logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Start playlist: "+success});
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
						logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Exception: "+ error});
					}
				}
					
			}catch(error) {
				logStep.messages.push({date:Date.now(), value:"[EXCEPTION] step execution thrown an error: "+JSON.stringify(error)});
			}
			logStep.messages.push({date:Date.now(), value:"Step execution complete"});

			delete this.triggerTypeToQueue[queueKey];
		}

		resolverTriggerType();
		log.complete = true;

		// console.log("Steps parsed", actions);
		return true;
	}

	/**
	 * Replaces placeholders by their values on the message
	 */
	private async parsePlaceholders(dynamicPlaceholders:{[key:string]:string|number}, actionPlaceholder:ITriggerPlaceholder[], trigger:TriggerData, message:TwitchatDataTypes.ChatMessageTypes, src:string, subEvent?:string|null, removeRemainingTags:boolean = true, removeFolderNavigation:boolean = false):Promise<string> {
		let res = src;
		if(!res) return "";
		let subEvent_regSafe = "";
		if(subEvent) subEvent_regSafe = subEvent.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

		try {
			// console.log("===== PARSE TEXT =====");
			// console.log(eventType);
			// console.log(message);
			// console.log(src);
			// console.log(subEvent);

			let placeholders = TriggerEventPlaceholders(trigger.type).concat() ?? [];//Clone it to avoid modifying original
			if(actionPlaceholder.length > 0) placeholders = placeholders.concat(actionPlaceholder);
			// console.log(placeholders);
			// console.log(helpers);
			//No placeholders for this event type, just send back the source text
			if(placeholders.length == 0) return res;
			
			for (const h of placeholders) {
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
					/**
					 * If the placeholder requests for the current track and we're ending up here
					 * this means that the message does not contain the actual track.
					 * In this case we go get the currently playing track
					 */
					if(h.tag.toLowerCase().indexOf("current_track") == 0) {
						//That replace() is dirty but I'm too lazy to do that in a more generic way :(
						const pointer = h.pointer.replace('track.', '') as TwitchatDataTypes.MusicTrackDataKeys
						if(Config.instance.SPOTIFY_CONNECTED && SpotifyHelper.instance.currentTrack) {
							value = SpotifyHelper.instance.currentTrack[pointer]?.toString();
						}else if(Config.instance.DEEZER_CONNECTED && DeezerHelper.instance.currentTrack) {
							value = DeezerHelper.instance.currentTrack[pointer]?.toString();
						}
						if(!value) value = "-none-";

					/**
					 * If the placeholder requests for the current stream info
					 */
					}else if(h.pointer.toLowerCase().indexOf("__my_stream__") == 0 && StoreProxy.stream.currentStreamInfo[StoreProxy.auth.twitch.user.id]) {
						const pointer = h.pointer.replace('__my_stream__.', '') as TwitchatDataTypes.StreamInfoKeys
						value = StoreProxy.stream.currentStreamInfo[StoreProxy.auth.twitch.user.id]?.[pointer]?.toString() || "";
						if(!value) value = pointer == "viewers"? "0" : "-none-";

					/**
					 * If the placeholder requests for the current stream info
					 */
					}else if(h.pointer.toLowerCase().indexOf("__trigger__") == 0) {
						value = trigger.name ?? Utils.getTriggerDisplayInfo(trigger).label;
						if(!value) value = "-no name-";

					/**
					 * If the placeholder requests for the current OBS scene
					 */
					}else if(h.pointer.toLowerCase().indexOf("__obs__") == 0) {
						value = StoreProxy.main.currentOBSScene;
						if(!value) value = "-none-";

					/**
					 * If the placeholder requests for a counter's value
					 */
					}else if(h.tag.toLowerCase().indexOf(TriggerActionDataTypes.COUNTER_VALUE_PLACEHOLDER_PREFIX.toLowerCase()) == 0) {
						const counterPH = h.tag.toLowerCase().replace(TriggerActionDataTypes.COUNTER_VALUE_PLACEHOLDER_PREFIX.toLowerCase(), "");
						const counter = StoreProxy.counters.counterList.find(v=>v.placeholderKey && v.placeholderKey.toLowerCase() === counterPH.toLowerCase());
						if(counter) {
							if(counter.perUser === true) {
								//If it's a per-user counter, get the user's value
								let user = this.extractUser(trigger, message);
								if(user && counter.users && counter.users[user.id]) {
									value = counter.users[user.id].toString();
								}
							}else{
								//Simple counter, just get its value
								value = counter.value.toString();
							}
						}

					}else{
						console.warn("Unable to find pointer for helper", h);
						value = "";
					}
				}

				// console.log("Pointer:", h.tag, "=>", h.pointer, "=> value:", value);

				//Remove command from final text
				if(typeof value == "string" && subEvent_regSafe) {
					value = value.replace(new RegExp(subEvent_regSafe, "i"), "").trim();
				}
			
				if(typeof value == "string" && removeFolderNavigation) {
					value = value.replace(/(\.\.|\/|\\)/gi, "");//Avoid folders navigation
				}
				
				res = res.replace(new RegExp("\\{"+h.tag+"\\}", "gi"), value ?? "");
			}

			//Replace dynamic placeholders. These are user defined placeholders.
			//Ex: to read a counter value, user must define a placeholder name that
			//will be populated with the counter's value so this value can be used
			//in subsequent actions.
			//Here we use that value
			for (const key in dynamicPlaceholders) {
				const keySafe = key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
				res = res.replace(new RegExp("\\{"+keySafe+"\\}", "gi"), dynamicPlaceholders[key].toString() ?? "");
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

	/**
	 * Extracts a user from a message based on the available placeholders
	 */
	private extractUser(trigger:TriggerData, message:TwitchatDataTypes.ChatMessageTypes):TwitchatDataTypes.TwitchatUser|undefined {
		let user:TwitchatDataTypes.TwitchatUser | undefined = undefined;
		const helpers = TriggerEventPlaceholders(trigger.type);
		const userIdHelper = helpers.find(v => v.isUserID === true);
		if(userIdHelper) {
			const chunks:string[] = userIdHelper.pointer.split(".");
			let root = message as unknown;
			try {
				//Dynamically search for the requested prop's value within the object
				for (let i = 0; i < chunks.length-1; i++) {
					root = (root as {[key:string]:unknown})[chunks[i]];
				}
				const u = root as TwitchatDataTypes.TwitchatUser;
				if(u && u.id && u.login) {
					user = u;
				}
			}catch(error) {/*ignore*/}
		}
		return user;
	}

	/**
	 * Check if any of our followings are live and notify on tchat
	 * if requested
	 */
	private async checkLiveFollowings(notify:boolean = true):Promise<boolean> {
		//User requested not to be alerted, stop there
		if(StoreProxy.params.features.liveAlerts.value !== true) return false;
		if(!TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWINGS])) return false;

		const channels = await TwitchUtils.getActiveFollowedStreams();
		const liveChannels:{[key:string]:TwitchatDataTypes.StreamInfo} = {};
		for (let i = 0; i < channels.length; i++) {
			const c = channels[i];
			liveChannels[c.user_id] = {
				user:StoreProxy.users.getUserFrom("twitch", StoreProxy.auth.twitch.user.id, c.user_id, c.user_login, c.user_name),
				category:c.game_name,
				title:c.title,
				tags: c.tags,
				live:true,
				viewers:c.viewer_count,
				started_at:new Date(c.started_at).getTime(),
				lastSoDoneDate:0,
			}
		}

		if(notify && this.liveChannelCache) {
			//This makes sure messages have a different date.
			//Bit dirty workaround an issue with the way i handle the "read mark" that is based
			//on the message date. When clicking a message it actually marks the "date" rather
			//than the message itself so we can find it back faster.
			//If multiple messages have the exact same date, clicking one may mark another one
			//as read.
			let dateOffset = 0;

			//Check if any user went offline
			for (const uid in this.liveChannelCache) {
				if(!liveChannels[uid]) {
					//User went offline
					const message:TwitchatDataTypes.MessageStreamOfflineData = {
						date:Date.now()+dateOffset,
						id:Utils.getUUID(),
						platform:"twitch",
						type:TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE,
						info: this.liveChannelCache[uid],
					}
					this.liveChannelCache[uid].viewers = 0;
					this.liveChannelCache[uid].live = false;
					StoreProxy.chat.addMessage(message);
					dateOffset ++;
				}
			}
	
			//Check if any user went online
			for (const uid in liveChannels) {
				if(!this.liveChannelCache[uid]) {
					//User went online
					const message:TwitchatDataTypes.MessageStreamOnlineData = {
						date:Date.now()+dateOffset,
						id:Utils.getUUID(),
						platform:"twitch",
						type:TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE,
						info: liveChannels[uid],
					}
					StoreProxy.chat.addMessage(message);
					dateOffset ++;
				}
			}
		}

		this.liveChannelCache = liveChannels;
		return true;
	}

	/**
	 * Checks if message matches given execution conditions
	 * 
	 * @param conditions 
	 * @param trigger 
	 * @param message 
	 * @param src 
	 * @param log 
	 * @param subEvent 
	 */
	public async checkConditions(operator:"AND"|"OR", conditions:(TriggerActionDataTypes.TriggerConditionGroup|TriggerActionDataTypes.TriggerCondition)[], trigger:TriggerData, message:TwitchatDataTypes.ChatMessageTypes, log:TriggerLog, dynamicPlaceholders:{[key:string]:string|number}, subEvent?:string|null):Promise<boolean> {
		let res = false;
		let index = 0;
		for (const c of conditions) {
			let localRes = false;
			if(c.type == "group") {
				localRes = await this.checkConditions(c.operator, c.conditions, trigger, message, log, dynamicPlaceholders, subEvent);
			}else{
				const value = await this.parsePlaceholders(dynamicPlaceholders, [], trigger, message, "{"+c.placeholder+"}", subEvent);
				const expectation = await this.parsePlaceholders(dynamicPlaceholders, [], trigger, message, c.value, subEvent);
				switch(c.operator) {
					case "<": localRes = parseInt(value) < parseInt(expectation); break;
					case "<=": localRes = parseInt(value) <= parseInt(expectation); break;
					case ">": localRes = parseInt(value) > parseInt(expectation); break;
					case ">=": localRes = parseInt(value) >= parseInt(expectation); break;
					case "=": localRes = value.toLowerCase() == expectation.toLowerCase(); break;
					case "!=": localRes = value.toLowerCase() != expectation.toLowerCase(); break;
					case "contains": localRes = value.toLowerCase().indexOf(expectation.toLowerCase()) > -1; break;
					case "not_contains": localRes = value.toLowerCase().indexOf(expectation.toLowerCase()) == -1; break;
					case "ends_with": localRes = value.toLowerCase().endsWith(expectation.toLowerCase()); break;
					case "not_ends_with": localRes = !value.toLowerCase().endsWith(expectation.toLowerCase()); break;
					case "starts_with": localRes = value.toLowerCase().startsWith(expectation.toLowerCase()); break;
					case "not_starts_with": localRes = !value.toLowerCase().startsWith(expectation.toLowerCase()); break;
					default: localRes = false;
				}
				log.messages.push({date:Date.now(), value:"Executing operator \""+c.operator+"\" between \""+value+"\" and \""+expectation+"\" => "+localRes.toString()});
			}
			
			if(index == 0) res = localRes;
			else if(operator == "AND") res &&= localRes;
			else if(operator == "OR") res ||= localRes;
			index ++
		}
		return res;
	}
}