import MessengerProxy from "@/messaging/MessengerProxy";
import DataStore from "@/store/DataStore";
import StoreProxy from "@/store/StoreProxy";
import type { GoXLRTypes } from "@/types/GoXLRTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import gsap from "gsap";
import * as MathJS from 'mathjs';
import type { JsonObject } from "type-fest";
import TwitchatEvent from "../../events/TwitchatEvent";
import * as TriggerActionDataTypes from "../../types/TriggerActionDataTypes";
import { TriggerActionPlaceholders, TriggerEventPlaceholders, TriggerMusicTypes, TriggerTypes, TriggerTypesDefinitionList, type ITriggerPlaceholder, type TriggerData, type TriggerTypesKey, type TriggerTypesValue } from "../../types/TriggerActionDataTypes";
import type { SearchTrackItem } from "../../types/spotify/SpotifyDataTypes";
import ApiHelper from "../ApiHelper";
import Config from "../Config";
import type { LogTrigger, LogTriggerStep } from "../Logger";
import Logger from "../Logger";
import OBSWebsocket, { type SourceTransform } from "../OBSWebsocket";
import PublicAPI from "../PublicAPI";
import TTSUtils from "../TTSUtils";
import Utils from "../Utils";
import WebsocketTrigger from "../WebsocketTrigger";
import GoXLRSocket from "../goxlr/GoXLRSocket";
import SpotifyHelper from "../music/SpotifyHelper";
import { TwitchScopes } from "../twitch/TwitchScopes";
import TwitchUtils from "../twitch/TwitchUtils";
import VoicemodWebSocket from "../voice/VoicemodWebSocket";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";

/**
* Created : 22/04/2022
*/
export default class TriggerActionHandler {

	private static _instance:TriggerActionHandler;

	public emergencyMode:boolean = false;

	// private actionsSpool:TwitchatDataTypes.ChatMessageTypes[] = [];
	private userCooldowns:{[key:string]:number} = {};
	private globalCooldowns:{[key:string]:number} = {};
	private lastAnyMessageSent:string = "";
	private obsSourceNameToQueue:{[key:string]:Promise<void>} = {};
	private triggerTypeToQueue:{[key:string]:{promise:Promise<void>, resolver:()=>void, name:string}[]} = {};
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
	public async execute(message:TwitchatDataTypes.ChatMessageTypes, testMode = false, forcedTriggerId?:string):Promise<void> {

		//Check if it's a greetable message
		if(TwitchatDataTypes.GreetableMessageTypesString[message.type as TwitchatDataTypes.GreetableMessageTypes] === true) {
			const mLoc = message as TwitchatDataTypes.GreetableMessage;
			if(mLoc.todayFirst === true) {
				await this.executeTriggersByType(TriggerTypes.FIRST_TODAY, message, testMode, undefined, undefined, forcedTriggerId);
			}
		}

		switch(message.type) {
			case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
				//Only trigger one of "first ever", "first today" or "returning" trigger
				if(message.twitch_isPresentation === true) {
					await this.executeTriggersByType(TriggerTypes.PRESENTATION, message, testMode, undefined, undefined, forcedTriggerId);
				}else
				if(message.twitch_isFirstMessage === true) {
					await this.executeTriggersByType(TriggerTypes.FIRST_ALL_TIME, message, testMode, undefined, undefined, forcedTriggerId);
				}else
				if(message.todayFirst === true) {
					//Do nothing, it's already done before the switch
					//Keep this condition to avoid aving both returning and today first triggerd
				}else
				if(message.twitch_isReturning === true) {
					await this.executeTriggersByType(TriggerTypes.RETURNING_USER, message, testMode, undefined, undefined, forcedTriggerId);
				}
				if(message.twitch_announcementColor) {
					await this.executeTriggersByType(TriggerTypes.ANNOUNCEMENTS, message, testMode, undefined, undefined, forcedTriggerId);
				}

				if(message.message) {
					const cmd = message.message.trim().split(" ")[0].toLowerCase();
					await this.executeTriggersByType(TriggerTypes.CHAT_COMMAND, message, testMode, cmd, undefined, forcedTriggerId);
					const cmdall = message.message.trim().toLowerCase();
					if(cmdall != cmd) {
						await this.executeTriggersByType(TriggerTypes.CHAT_COMMAND, message, testMode, cmdall, undefined, forcedTriggerId);
					}
				}

				if(message.user.id != StoreProxy.auth.twitch.user.id
				|| this.lastAnyMessageSent != message.message) {
					//Only parse this trigger if the message receive isn't sent by us
					//or if the text is different than the last one sent by this trigger
					await this.executeTriggersByType(TriggerTypes.ANY_MESSAGE, message, testMode, undefined, undefined, forcedTriggerId);
				}
				break;
			}

			case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
				if(this.emergencyMode && StoreProxy.emergency.params.noTriggers === true) return;

				if(await this.executeTriggersByType(TriggerTypes.FOLLOW, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
				if(this.emergencyMode && StoreProxy.emergency.params.noTriggers === true) return;

				if(message.is_gift) {
					if(await this.executeTriggersByType(TriggerTypes.SUBGIFT, message, testMode, undefined, undefined, forcedTriggerId)) {
						return;
					}
				}else
				if(await this.executeTriggersByType(TriggerTypes.SUB, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAID: {
				if(this.emergencyMode && StoreProxy.emergency.params.noTriggers === true) return;

				if(await this.executeTriggersByType(TriggerTypes.RAID, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.REWARD: {
				const id = message.reward.id;
				await this.executeTriggersByType(TriggerTypes.REWARD_REDEEM, message, testMode, "*", undefined, forcedTriggerId)
				if(await this.executeTriggersByType(TriggerTypes.REWARD_REDEEM, message, testMode, id, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION: {
				const complete = message.challenge.goal === message.challenge.progress;
				const event = complete? TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE : TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS;
				if(await this.executeTriggersByType(event, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.CHEER: {
				if(this.emergencyMode && StoreProxy.emergency.params.noTriggers === true) return;

				if(await this.executeTriggersByType(TriggerTypes.CHEER, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.PREDICTION: {
				const eventType = message.isStart === true? TriggerTypes.PREDICTION_START : TriggerTypes.PREDICTION_RESULT;
				if(await this.executeTriggersByType(eventType, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.POLL: {
				const eventType = message.isStart === true? TriggerTypes.POLL_START : TriggerTypes.POLL_RESULT;
				if(await this.executeTriggersByType(eventType, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.BINGO: {
				if(await this.executeTriggersByType(TriggerTypes.BINGO_RESULT, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAFFLE: {
				if(await this.executeTriggersByType(TriggerTypes.RAFFLE_RESULT, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.COUNTDOWN: {
				const event = message.countdown.endAt? TriggerTypes.COUNTDOWN_STOP : TriggerTypes.COUNTDOWN_START;
				if(await this.executeTriggersByType(event, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.TIMER: {
				const event = message.started? TriggerTypes.TIMER_START : TriggerTypes.TIMER_STOP;
				if(await this.executeTriggersByType(event, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.CHAT_ALERT: {
				if(await this.executeTriggersByType(TriggerTypes.CHAT_ALERT, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.MUSIC_START:
			case TwitchatDataTypes.TwitchatMessageType.MUSIC_STOP: {
				const event = message.type == TwitchatDataTypes.TwitchatMessageType.MUSIC_START? TriggerTypes.MUSIC_START : TriggerTypes.MUSIC_STOP;
				if(await this.executeTriggersByType(event, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}
			case TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE: {
				const event = message.failCode? TriggerTypes.TRACK_ADD_TO_QUEUE_FAILED : TriggerTypes.TRACK_ADDED_TO_QUEUE;
				if(await this.executeTriggersByType(event, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.VOICEMOD: {
				if(await this.executeTriggersByType(TriggerTypes.VOICEMOD, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.SHOUTOUT: {
				if(message.received && await this.executeTriggersByType(TriggerTypes.SHOUTOUT_IN, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}
				if(!message.received && await this.executeTriggersByType(TriggerTypes.SHOUTOUT_OUT, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}
				break;
			}

			case TwitchatDataTypes.TwitchatMessageType.CHAT_HIGHLIGHT: {
				if(await this.executeTriggersByType(TriggerTypes.HIGHLIGHT_CHAT_MESSAGE, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.OBS_SCENE_CHANGE: {
				if(await this.executeTriggersByType(TriggerTypes.OBS_SCENE, message, testMode, message.sceneName.toLowerCase(), undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.OBS_SOURCE_TOGGLE: {
				const event = message.visible? TriggerTypes.OBS_SOURCE_ON : TriggerTypes.OBS_SOURCE_OFF;
				if(await this.executeTriggersByType(event, message, testMode, message.sourceName.toLowerCase(), undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.OBS_FILTER_TOGGLE: {
				const event = message.enabled? TriggerTypes.OBS_FILTER_ON : TriggerTypes.OBS_FILTER_OFF;
				const subEvent = message.sourceName.toLowerCase() + this.HASHMAP_KEY_SPLITTER + message.filterName.toLowerCase();
				if(await this.executeTriggersByType(event, message, testMode, subEvent, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.OBS_INPUT_MUTE_TOGGLE: {
				const event = message.muted? TriggerTypes.OBS_INPUT_MUTE : TriggerTypes.OBS_INPUT_UNMUTE;
				if(await this.executeTriggersByType(event, message, testMode, message.inputName.toLowerCase(), undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.OBS_START_STREAM: {
				if(await this.executeTriggersByType(TriggerTypes.OBS_START_STREAM, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.OBS_STOP_STREAM: {
				if(await this.executeTriggersByType(TriggerTypes.OBS_STOP_STREAM, message, testMode, undefined, undefined, forcedTriggerId)) {
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
				if(await this.executeTriggersByType(stateToType[message.state], message, testMode, message.inputName.toLowerCase(), undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.PINNED: {
				if(await this.executeTriggersByType(TriggerTypes.PIN_MESSAGE, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.UNPINNED: {
				if(await this.executeTriggersByType(TriggerTypes.UNPIN_MESSAGE, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.BAN:{
				const event = message.duration_s? TriggerTypes.TIMEOUT : TriggerTypes.BAN
				if(await this.executeTriggersByType(event, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.UNBAN:{
				if(await this.executeTriggersByType(TriggerTypes.UNBAN, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE:{
				const event = message.info.user.id == StoreProxy.auth.twitch.user.id? TriggerTypes.STREAM_ONLINE : TriggerTypes.FOLLOWED_STREAM_ONLINE;
				if(await this.executeTriggersByType(event, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE:{
				const event = message.info.user.id == StoreProxy.auth.twitch.user.id? TriggerTypes.STREAM_OFFLINE : TriggerTypes.FOLLOWED_STREAM_OFFLINE;
				if(await this.executeTriggersByType(event, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAID_STARTED:{
				if(await this.executeTriggersByType(TriggerTypes.RAID_STARTED, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK:{
				if(await this.executeTriggersByType(TriggerTypes.USER_WATCH_STREAK, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			// case TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT:{
			// 	if(await this.executeTriggersByType(TriggerTypes.HYPE_CHAT, message, testMode, undefined, undefined, forcedTriggerId)) {
			// 		return;
			// 	}break;
			// }

			case TwitchatDataTypes.TwitchatMessageType.HEAT_CLICK:{
				let subEvent:string|undefined = undefined;
				if(message.areaId) subEvent = message.areaId;
				if(message.obsSource) subEvent = message.obsSource;
				if(await this.executeTriggersByType(TriggerTypes.HEAT_CLICK, message, testMode, subEvent, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.CLIP_CREATION_COMPLETE:{
				if(await this.executeTriggersByType(TriggerTypes.CLIP_CREATED, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.GOXLR_BUTTON:{
				const eventType = message.pressed? TriggerTypes.GOXLR_BUTTON_PRESSED : TriggerTypes.GOXLR_BUTTON_RELEASED;
				if(await this.executeTriggersByType(eventType, message, testMode, message.button, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.GOXLR_FX_STATE:{
				const eventType = message.enabled? TriggerTypes.GOXLR_FX_ENABLED : TriggerTypes.GOXLR_FX_DISABLED;
				if(await this.executeTriggersByType(eventType, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.GOXLR_SAMPLE_COMPLETE:{
				if(await this.executeTriggersByType(TriggerTypes.GOXLR_SAMPLE_COMPLETE, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.GOXLR_SOUND_INPUT:{
				const eventType = message.mute? TriggerTypes.GOXLR_INPUT_MUTE : TriggerTypes.GOXLR_INPUT_UNMUTE;
				if(await this.executeTriggersByType(eventType, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE:{
				let executed = false;
				if(message.added > 0) {
					const result = await this.executeTriggersByType(TriggerTypes.COUNTER_ADD, message, testMode, message.counter.id, undefined, forcedTriggerId);
					executed ||= result;
				}
				if(message.added < 0) {
					const result = await this.executeTriggersByType(TriggerTypes.COUNTER_DEL, message, testMode, message.counter.id, undefined, forcedTriggerId);
					executed ||= result;
				}
				if(message.maxed) {
					const result = await this.executeTriggersByType(TriggerTypes.COUNTER_MAXED, message, testMode, message.counter.id, undefined, forcedTriggerId);
					executed ||= result;
				}
				if(message.mined) {
					const result = await this.executeTriggersByType(TriggerTypes.COUNTER_MINED, message, testMode, message.counter.id, undefined, forcedTriggerId);
					executed ||= result;
				}
				if(message.looped) {
					const result = await this.executeTriggersByType(TriggerTypes.COUNTER_LOOPED, message, testMode, message.counter.id, undefined, forcedTriggerId)
					executed ||= result;
				}
				const result = await this.executeTriggersByType(TriggerTypes.COUNTER_EDIT, message, testMode, message.counter.id, undefined, forcedTriggerId);
				executed ||= result;
				if(executed) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.VALUE_UPDATE:{
				if(await this.executeTriggersByType(TriggerTypes.VALUE_UPDATE, message, testMode, message.value.id, undefined, forcedTriggerId)) {
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
				if(await this.executeTriggersByType(map[message.type]!, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.AD_BREAK_START:
			case TwitchatDataTypes.TwitchatMessageType.AD_BREAK_START_CHAT:{
				if(await this.executeTriggersByType(TriggerTypes.AD_STARTED, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.AD_BREAK_APPROACHING:{
				if(await this.executeTriggersByType(TriggerTypes.AD_APPROACHING, message, testMode, message.delay_ms.toString(), undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.AD_BREAK_COMPLETE:{
				if(await this.executeTriggersByType(TriggerTypes.AD_COMPLETE, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.JOIN:{
				if(await this.executeTriggersByType(TriggerTypes.USER_JOIN, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.LEAVE:{
				if(await this.executeTriggersByType(TriggerTypes.USER_LEAVE, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.QNA_START:
			case TwitchatDataTypes.TwitchatMessageType.QNA_STOP:
			case TwitchatDataTypes.TwitchatMessageType.QNA_DELETE:{
				let type:TriggerActionDataTypes.TriggerTypesValue = TriggerTypes.QNA_START;
				if(message.type == TwitchatDataTypes.TwitchatMessageType.QNA_STOP) type = TriggerTypes.QNA_STOP;
				if(message.type == TwitchatDataTypes.TwitchatMessageType.QNA_DELETE) type = TriggerTypes.QNA_DELETE;
				if(await this.executeTriggersByType(type, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.CREDITS_COMPLETE:{
				if(await this.executeTriggersByType(TriggerTypes.CREDITS_COMPLETE, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAMLABS:{
				const eventType:{[key in TwitchatDataTypes.MessageStreamlabsData["eventType"]]:TriggerTypesValue} = {
						"donation":TriggerTypes.STREAMLABS_DONATION,
						"merch":TriggerTypes.STREAMLABS_MERCH,
						"patreon_pledge":TriggerTypes.STREAMLABS_PATREON_PLEDGE,
					} as const;
				if(await this.executeTriggersByType(eventType[message.eventType], message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS:{
				const eventType:{[key in TwitchatDataTypes.MessageStreamelementsData["eventType"]]:TriggerTypesValue} = {
						"donation":TriggerTypes.STREAMELEMENTS_DONATION,
					} as const;
				if(await this.executeTriggersByType(eventType[message.eventType], message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.KOFI:{
				const eventType:{[key in TwitchatDataTypes.MessageKofiData["eventType"]]:TriggerTypesValue} = {
						"donation":TriggerTypes.KOFI_DONATION,
						"merch":TriggerTypes.KOFI_MERCH,
						"subscription":TriggerTypes.KOFI_SUBSCRIPTION,
					} as const;
				if(await this.executeTriggersByType(eventType[message.eventType], message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.TIPEEE:{
				let eventType:TriggerTypesValue = TriggerTypes.TIPEEE_DONATION;
				if(message.recurring && message.recurringCount > 1) eventType = TriggerTypes.TIPEEE_RESUB;
				else if(message.recurring) eventType = TriggerTypes.TIPEEE_SUB;
				if(await this.executeTriggersByType(eventType, message, testMode, undefined, undefined, forcedTriggerId)) {
					return;
				}break;
			}

			case TwitchatDataTypes.TwitchatMessageType.NOTICE: {
				switch(message.noticeId) {
					case TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE:{
						if(await this.executeTriggersByType(TriggerTypes.STREAM_INFO_UPDATE, message, testMode, undefined, undefined, forcedTriggerId)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE:{
						const m = message as TwitchatDataTypes.MessageEmergencyModeInfo;
						const event = m.enabled? TriggerTypes.EMERGENCY_MODE_START : TriggerTypes.EMERGENCY_MODE_STOP;
						if(await this.executeTriggersByType(event, message, testMode, undefined, undefined, forcedTriggerId)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.MOD:{
						if(await this.executeTriggersByType(TriggerTypes.MOD, message, testMode, undefined, undefined, forcedTriggerId)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.UNMOD:{
						if(await this.executeTriggersByType(TriggerTypes.UNMOD, message, testMode, undefined, undefined, forcedTriggerId)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.VIP:{
						if(await this.executeTriggersByType(TriggerTypes.VIP, message, testMode, undefined, undefined, forcedTriggerId)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.UNVIP:{
						if(await this.executeTriggersByType(TriggerTypes.UNVIP, message, testMode, undefined, undefined, forcedTriggerId)) {
							return;
						}break;
					}
					case TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE:{
						const m = message as TwitchatDataTypes.MessageShieldMode;
						const event = m.enabled? TriggerTypes.SHIELD_MODE_ON : TriggerTypes.SHIELD_MODE_OFF;
						if(await this.executeTriggersByType(event, message, testMode, undefined, undefined, forcedTriggerId)) {
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
		const fakeMessage:TwitchatDataTypes.MessageNoticeData = { id:"fake_schedule_message", date:Date.now(), type:"notice", noticeId:"generic", message:"", platform:"twitchat", channel_id:"" };
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
			if(!t || !t.type) continue;
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

				case TriggerTypes.AD_APPROACHING: keys[0] += this.HASHMAP_KEY_SPLITTER + (t.adBreakDelay || 0).toString(); break;

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

				case TriggerTypes.COUNTER_EDIT:
				case TriggerTypes.COUNTER_ADD:
				case TriggerTypes.COUNTER_DEL:
				case TriggerTypes.COUNTER_LOOPED:
				case TriggerTypes.COUNTER_MAXED:
				case TriggerTypes.COUNTER_MINED: keys[0] += this.HASHMAP_KEY_SPLITTER + t.counterId; break;

				case TriggerTypes.VALUE_UPDATE: keys[0] += this.HASHMAP_KEY_SPLITTER + t.valueId; break;

				case TriggerTypes.HEAT_CLICK: {
					if((!t.heatClickSource || t.heatClickSource == "obs") && t.heatObsSource) {
						keys[0] += this.HASHMAP_KEY_SPLITTER + t.heatObsSource;
					}else if(t.heatClickSource == "area" && t.heatAreaIds){
						keys = [];
						for (let i = 0; i < t.heatAreaIds.length; i++) {
							keys.push(t.type + this.HASHMAP_KEY_SPLITTER + t.heatAreaIds[i]);
						}
					}
					break;
				}

				case TriggerTypes.GOXLR_BUTTON_PRESSED:
				case TriggerTypes.GOXLR_BUTTON_RELEASED: {
					if(t.goxlrButtons) {
						keys = [];
						for (let i = 0; i < t.goxlrButtons.length; i++) {
							keys.push(t.type + this.HASHMAP_KEY_SPLITTER + t.goxlrButtons[i]);
						}
					}
				}
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
	private async executeTriggersByType(triggerType:TriggerTypesValue, message:TwitchatDataTypes.ChatMessageTypes, testMode:boolean, subEvent?:string, ttsID?:string, forcedTriggerId?:string):Promise<boolean> {
		let key = triggerType as string;
		let executed = false;
		if(subEvent) key += this.HASHMAP_KEY_SPLITTER + subEvent;
		key = key.toLowerCase();

		const triggers = this.triggerType2Triggers[ key ];
		if(!triggers || triggers.length == 0) return false;

		//Execute all triggers related to the current trigger event type
		for (const trigger of triggers) {
			if(forcedTriggerId && trigger.id != forcedTriggerId) continue;
			if(await this.executeTrigger(trigger, message, testMode, subEvent, ttsID)) {
				executed = true;
			}
		}

		return executed;
	}

	/**
	 * Execute a specific trigger
	 */
	public async executeTrigger(trigger:TriggerData, message:TwitchatDataTypes.ChatMessageTypes, testMode:boolean, subEvent?:string, ttsID?:string, dynamicPlaceholders:{[key:string]:string|number} = {}, ignoreDisableState:boolean = false):Promise<boolean> {
		if(!trigger.enabled && !testMode && !ignoreDisableState) return false;

		const log:LogTrigger = {
			date:Date.now(),
			id:Utils.getUUID(),
			trigger,
			complete:false,
			skipped:false,
			error:false,
			criticalError:false,
			data: message,
			testMode,
			entries:[],
		};

		const sTriggers = StoreProxy.triggers;
		//Check if trigger is within a disabled folder, stop there if so
		if(sTriggers.triggerIdToFolderEnabled[trigger.id] === false) {
			log.entries.push({date:Date.now(), type:"message", value:"❌ Trigger is within a disabled folder. Ignore it."});
			log.error = true;
			Logger.instance.log("triggers", log);
			return false;
		}

		//Do not execute triggers for ko-fi events if users made their donation private
		if(message.type == TwitchatDataTypes.TwitchatMessageType.KOFI && message.isPublic !== true) {
			log.entries.push({date:Date.now(), type:"message", value:"❌ User made their Ko-fi transaction private. Don't execute the related triggers to respect their choice."});
			log.error = true;
			Logger.instance.log("triggers", log);
			return false;
		}

		const isPremium = StoreProxy.auth.isPremium;

		//Avoid polluting trigger execution history for Twitchat internal triggers
		const noLogs:TriggerTypesValue[] = [TriggerTypes.TWITCHAT_SHOUTOUT_QUEUE,TriggerTypes.TWITCHAT_AD,TriggerTypes.TWITCHAT_LIVE_FRIENDS,TriggerTypes.TWITCHAT_MESSAGE]
		if(!noLogs.includes(trigger.type))	Logger.instance.log("triggers", log);

		//Special case for friends stream start/stop notifications
		if(trigger.type == TriggerTypes.TWITCHAT_LIVE_FRIENDS) {
			this.checkLiveFollowings().catch(()=>{});
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

		//Wait for potential previous trigger of the exact same type to finish their execution
		const queueKey = trigger.queue;// || trigger.id;
		let queue:typeof this.triggerTypeToQueue[string] = [];

		if(queueKey) {
			log.entries.push({date:Date.now(), type:"message", value:"Execute trigger in queue \""+queueKey+"\""});

			if(!this.triggerTypeToQueue[queueKey]) this.triggerTypeToQueue[queueKey] = [];
			queue = this.triggerTypeToQueue[queueKey];
			const eventBusy = queue.length > 0;

			let resolver!: ()=>void;
			const promise = new Promise<void>(async (resolve, reject)=> { resolver = resolve });
			queue.push( {promise, resolver, name:Utils.getTriggerDisplayInfo(trigger).label} );

			if(eventBusy) {
				const queueItem = queue[queue.length-2];
				const prom = queueItem?.promise;
				log.entries.push({date:Date.now(), type:"message", value:"A trigger is already executing in this queue, wait for it to complete: "+ queueItem.name});
				if(prom) await prom;
				log.entries.push({date:Date.now(), type:"message", value:"Pending trigger complete, continue process: "+ queueItem.name});
			}
		}

		// console.log("PARSE STEPS", eventType, trigger, message);
		let canExecute = true;
		let executingUser:TwitchatDataTypes.TwitchatUser|undefined = undefined;

		//If it's a chat message check for permissions and cooldowns
		if(!testMode) {
			const triggerId = trigger.id;
			const now = Date.now();

			//If message contains a user and a channel_id properties, check for permissions and cooldowns
			//Channel ID is necessary for follower check and chat message feedback is user is cooling down
			if("user" in message && message.user
			&& "channel_id" in message && message.channel_id
			&& message.type !== TwitchatDataTypes.TwitchatMessageType.CUSTOM) {
				if(message.type == TwitchatDataTypes.TwitchatMessageType.HEAT_CLICK) {
					//Heat click messages have a limited type definition.
					//Get the full user from those limited data
					executingUser = await StoreProxy.users.getUserFrom(message.platform, message.channel_id, message.user.id, message.user.login);
				}else{
					executingUser = message.user;
				}
				//check user's permissions
				if(trigger.permissions) {
					log.entries.push({date:Date.now(), type:"message", value:"Checking if "+message.user.login+" has the permission to use this trigger"});
				}
				if(trigger.permissions && !await Utils.checkPermissions(trigger.permissions, message.user, message.channel_id)) {
					log.entries.push({date:Date.now(), type:"message", value:"❌ User "+message.user.login+" is not allowed"});
					canExecute = false;
				}else if(trigger.cooldown){
					log.entries.push({date:Date.now(), type:"message", value:"Checking if "+message.user.login+" is on cooldown or not"});
					//User cooldown
					const key = triggerId+this.HASHMAP_KEY_SPLITTER+message.user.id;
					if(this.userCooldowns[key] > 0 && this.userCooldowns[key] > now) {
						const remaining_s = Utils.formatDuration(this.userCooldowns[key] - now + 1000) + "s";
						canExecute = false;
						if(trigger.cooldown.alert !== false) {
							const text = StoreProxy.i18n.t("global.cooldown", {USER:message.user.login, DURATION:remaining_s});
							MessengerProxy.instance.sendMessage(text, [message.platform], message.channel_id);
						}
						log.entries.push({date:Date.now(), type:"message", value:"❌ User "+message.user.login+" is on cooldown for "+remaining_s});
						log.error = true;
					}
					else if(canExecute && trigger.cooldown.user > 0) this.userCooldowns[key] = now + trigger.cooldown.user * 1000;
				}

				//Global cooldown
				if(canExecute && trigger.cooldown && this.globalCooldowns[triggerId] > 0 && this.globalCooldowns[triggerId] > now) {
					canExecute = false;
					const remaining_s = Utils.formatDuration(this.globalCooldowns[triggerId] - now + 1000) + "s";
					if(trigger.cooldown.alert !== false) {
						const text = StoreProxy.i18n.t("global.cooldown", {USER:message.user.login, DURATION:remaining_s});
						MessengerProxy.instance.sendMessage(text, [message.platform], message.channel_id);
					}
					log.entries.push({date:Date.now(), type:"message", value:"❌ Trigger is on global cooldown for "+remaining_s});
					log.error = true;
				}
				else if(trigger.cooldown && trigger.cooldown.global > 0) this.globalCooldowns[triggerId] = now + trigger.cooldown.global * 1000;
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
					if(!dynamicPlaceholders[param.tag.toUpperCase()]) {
						dynamicPlaceholders[param.tag.toUpperCase()] = params[i] || "";
						log.entries.push({date:Date.now(), type:"message", value:"Add dynamic placeholder \"{"+param.tag.toUpperCase()+"}\" => \""+params[i]+"\""});
					}
				}
			}
		}

		let actions = trigger.actions;

		let passesCondition = true;
		//If trigger has conditions, check if the condition passes or not
		if(trigger.conditions && trigger.conditions.conditions.length > 0) {
			log.entries.push({date:Date.now(), type:"message", value:"Checking if conditions are fulfilled or not"});
			if(!testMode
			&& !await this.checkConditions(trigger.conditions!.operator, [trigger.conditions!], trigger, message, log, dynamicPlaceholders, subEvent)) {
				log.entries.push({date:Date.now(), type:"message", value:"❌ Conditions not fulfilled"});
				passesCondition = false;
			}else if(testMode){
				log.entries.push({date:Date.now(), type:"message", value:"✔ Trigger is being tested, force condition to pass"});
			}else{
				log.entries.push({date:Date.now(), type:"message", value:"✔ Conditions fulfilled"});
			}

			//Filter actions to execute based on whether the condition is matched or not
			actions = trigger.actions.filter(t=> {
				return t.condition == passesCondition || (t.condition !== false && passesCondition);
			});
		}

		if(!trigger || !actions || actions.length == 0) {
			canExecute = false;
			log.entries.push({date:Date.now(), type:"message", value:"Trigger has no child actions"});
			if(!passesCondition) log.error = true;
		}

		log.skipped = !canExecute;

		//Stop there if previous conditions (permissions, cooldown, conditions) aren't matched
		if(!canExecute) {
			log.entries.push({date:Date.now(), type:"message", value:"❌ Trigger is not allowed to execute"});
			passesCondition = false;
			log.error = true;
			if(queue.length > 0) {
				const item = queue.shift();
				if(item) item.resolver();
			}
			return false;
		}

		let channel_id = StoreProxy.auth.twitch.user.id;
		if(TwitchatDataTypes.GreetableMessageTypesString[message.type as TwitchatDataTypes.GreetableMessageTypes] === true) {
			channel_id = (message as TwitchatDataTypes.GreetableMessage).channel_id;
		}

		if(!passesCondition) {
			log.entries.push({date:Date.now(), type:"message", value:"Executing failed condition actions"});
		}

		for (const step of actions) {
			const logStep:LogTriggerStep = {id:Utils.getUUID(), type:"step", date:Date.now(), data:step, messages:[] as {date:number, value:string}[], error:false};
			log.entries.push(logStep);

			const actionPlaceholders = TriggerActionPlaceholders(step.type);

			logStep.messages.push({date:Date.now(), value:"Start step execution"});

			try {
				// console.log("	Parse step", step);
				//Handle delay action
				if(step.type == "delay") {
					let delay = 0;
					if(typeof step.delay == "string") {
						logStep.messages.push({date:Date.now(), value:"Delay value is the placeholder "+step.delay+", parse it."});
						const text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.delay, subEvent);
						delay = parseFloat(text) || 0;
					}else{
						delay = step.delay;
					}
					logStep.messages.push({date:Date.now(), value:"Wait for "+ delay+"s..."});
					await Utils.promisedTimeout(delay * 1000);
				}else

				//Handle OBS action
				if(step.type == "obs") {
					//Wait for potential OBS action in progress for the exact same source
					//to complete its execution
					const sourceBusy = this.obsSourceNameToQueue[step.sourceName] != undefined;
					if(sourceBusy) {
						logStep.messages.push({date:Date.now(), value:"OBS source \""+step.sourceName+"\" is busy, wait for its release"});
					}
					const prom = this.obsSourceNameToQueue[step.sourceName] ?? Promise.resolve();
					let resolverOBS!: ()=>void;
					this.obsSourceNameToQueue[step.sourceName] = new Promise<void>(async (resolve, reject)=> { resolverOBS = resolve });
					await prom;
					if(sourceBusy) {
						logStep.messages.push({date:Date.now(), value:"OBS source \""+step.sourceName+"\" has been released, continue process"});
					}

					logStep.messages.push({date:Date.now(), value:"Execute OBS action \""+step.action+"\" on source \""+step.sourceName+"\""});

					if(!OBSWebsocket.instance.connected) {
						logStep.messages.push({date:Date.now(), value:"❌ OBS-Websocket NOT CONNECTED! Cannot execute requested action."});
						log.error = true;
						logStep.error = true;
					}else{

						if(step.text) {
							try {
								const text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.text as string, subEvent);
								logStep.messages.push({date:Date.now(), value:"Update text to \""+text+"\""});
								await OBSWebsocket.instance.setTextSourceContent(step.sourceName, text);
							}catch(error) {
								console.error(error);
							}
						}
						if(step.url) {
							try {
								const url = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.url as string, subEvent);
								logStep.messages.push({date:Date.now(), value:"Update browser source URL to \""+url+"\""});
								await OBSWebsocket.instance.setBrowserSourceURL(step.sourceName, url);
							}catch(error) {
								console.error(error);
							}
						}
						if(step.mediaPath) {
							try {
								const url = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.mediaPath as string, subEvent, true, true);
								logStep.messages.push({date:Date.now(), value:"Update Media source url to \""+url+"\""});
								await OBSWebsocket.instance.setMediaSourceURL(step.sourceName, url);
							}catch(error) {
								console.error(error);
							}
						}

						if(step.filterName) {
							try {
								logStep.messages.push({date:Date.now(), value:"Set filter \""+step.filterName+"\" visibility to \""+(step.action == 'show'? "visible" : "hidden")+"\""});
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
									case "stop": await OBSWebsocket.instance.stopMedia(step.sourceName); break;
									case "mute": await OBSWebsocket.instance.setMuteState(step.sourceName, true); break;
									case "next": await OBSWebsocket.instance.nextMedia(step.sourceName); break;
									case "prev": await OBSWebsocket.instance.prevMedia(step.sourceName); break;
									case "unmute": await OBSWebsocket.instance.setMuteState(step.sourceName, false); break;
									case "switch_to": await OBSWebsocket.instance.setCurrentScene(step.sourceName); break;
									case "move":
									case "rotate":
									case "resize": {
										const items = await OBSWebsocket.instance.getSourceOnCurrentScene(step.sourceName);
										if(!items || items.length == 0) {
											logStep.messages.push({date:Date.now(), value:"❌ source \""+step.sourceName+"\" not found"});
											log.error = true;
											logStep.error = true;
										}else{
											for (let i = 0; i < items.length; i++) {
												const item = items[i];
												const transform = await OBSWebsocket.instance.getSceneItemTransform(item.scene, item.source.sceneItemId);
												type ReducedType = Partial<Pick<SourceTransform, "positionX" | "positionY" | "width" | "height" | "rotation" | "scaleX" | "scaleY">>;
												const result:ReducedType = {};
												if(action == "move") {
													//Move source
													if(step.pos_x) {
														let text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.pos_x, subEvent);
														text = text.replace(/,/gi, ".");
														result.positionX = MathJS.evaluate(text);
													}
													if(step.pos_y) {
														let text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.pos_y, subEvent);
														text = text.replace(/,/gi, ".");
														result.positionY = MathJS.evaluate(text);
													}
												}else if(action == "resize") {
													//Resize source
													if(step.width) {
														let text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.width, subEvent);
														text = text.replace(/,/gi, ".");
														result.width = MathJS.evaluate(text);
													}
													if(step.height) {
														let text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.height, subEvent);
														text = text.replace(/,/gi, ".");
														result.height = MathJS.evaluate(text);
													}
												}else if(action == "rotate" && step.angle) {
													//Rotate source
														let text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.angle, subEvent);
														text = text.replace(/,/gi, ".");
														result.rotation = MathJS.evaluate(text);
												}

												//Handle relative transform mode
												if(step.relativeTransform === true) {
													if(result.positionX) result.positionX += transform.positionX;
													if(result.positionY) result.positionY += transform.positionY;
													if(result.width) result.width += transform.width;
													if(result.height) result.height += transform.height;
													if(result.rotation) result.rotation += transform.rotation;
												}

												//OBS-WS does not allow to change the source's sizes.
												//Instead we compute the equivalent scale values.
												if(result.width) {
													result.scaleX = result.width/transform.sourceWidth;
													delete result.width;
												}
												if(result.height) {
													result.scaleY = result.height/transform.sourceHeight;
													delete result.height;
												}
												logStep.messages.push({date:Date.now(), value:"Set source transform to "+JSON.stringify(result)});

												if(step.animate === true) {
													logStep.messages.push({date:Date.now(), value:"Animate transformation. Duration: "+step.animateDuration+". Easing: "+step.animateEasing});
													const params:{[key:string]:number|string|(()=>void)} = {};
													for (const key in result) params[key] = result[key as keyof ReducedType]!;
													params.duration = step.animateDuration! / 1000;
													params.ease = step.animateEasing!;
													const lastFrame = Date.now();
													params.onUpdate = ()=> {
														//Limit to 30fps to avoid destroying OBS-WS
														if(Date.now() - lastFrame < 30/1000) return;
														const localTransform:{[key:string]:number|string} = {};
														//Remove invalid props
														for (const key in params) {
															if(["positionX", "positionY", "rotation", "scaleX", "scaleY"].includes(key)) localTransform[key] = transform[key as keyof ReducedType]!;
														}
														OBSWebsocket.instance.setSourceTransform(item.scene, item.source.sceneItemId, localTransform);
													}
													gsap.to(transform, params);
												}else{
													await OBSWebsocket.instance.setSourceTransform(item.scene, item.source.sceneItemId, result);
												}
											}
										}
									}
								}
								if(step.waitMediaEnd === true && (action == "show" || action == "replay")) {
									logStep.messages.push({date:Date.now(), value:"Wait for media \""+step.sourceName+"\" to complete playing..."});
									await new Promise<void>((resolve, reject)=> {
										const handler = (e:TwitchatEvent) => {
											const d = e.data as {inputName:string};
											logStep.messages.push({date:Date.now(), value:"Playback complete "+d.inputName});
											if(d.inputName != step.sourceName) return;
											logStep.messages.push({date:Date.now(), value:"Media \""+step.sourceName+"\" playing complete."});
											OBSWebsocket.instance.removeEventListener(TwitchatEvent.OBS_PLAYBACK_ENDED, handler);
											logStep.messages.push({date:Date.now(), value:"Resolve "+resolve});
											resolve();
										}
										logStep.messages.push({date:Date.now(), value:"Handler created..."});
										OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_PLAYBACK_ENDED, handler);
									})
								}
							}catch(error:any) {
								console.error(error);
								log.criticalError = true;
								logStep.error = true;
								logStep.messages.push({date:Date.now(), value:"❌ [EXCEPTION] OBS step execution thrown an error: "+(error.message || JSON.stringify(error))});
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
					logStep.messages.push({date:Date.now(), value:"Send Message \""+text+"\""});
					MessengerProxy.instance.sendMessage(text, platforms, undefined, undefined, true);
					if(trigger.type == TriggerTypes.ANY_MESSAGE) {
						this.lastAnyMessageSent = text;
					}
				}else

				//Handle highlight action
				if(step.type == "highlight") {
					if(step.show) {
						const text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.text as string, subEvent, true, false, false);
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
						|| message.type == TwitchatDataTypes.TwitchatMessageType.REWARD
						|| message.type == TwitchatDataTypes.TwitchatMessageType.PINNED
						|| message.type == TwitchatDataTypes.TwitchatMessageType.UNPINNED) {
							if(message.type == TwitchatDataTypes.TwitchatMessageType.PINNED
							|| message.type == TwitchatDataTypes.TwitchatMessageType.UNPINNED){
								user = message.chatMessage.user;
							}else{
								user = message.user;
							}
							if(!user.displayName || !user.avatarPath || !user.login) {
								//Get user info
								const [twitchUser] = await TwitchUtils.loadUserInfo([user.id]);
								user.avatarPath = twitchUser.profile_image_url;
								//Populate more info just in case some are missing
								user.login = twitchUser.login;
								user.displayName = twitchUser.display_name;
							}
							logStep.messages.push({date:Date.now(), value:"Loaded user \""+user.displayName+"\""});
						}


						//If it has a clip link, get its info and highlight the message
						//as a clip
						let clipId = "";
						if(/twitch\.tv\/[^/]+\/clip\//gi.test(text)) {
							const matches = text.match(/twitch\.[^/]{2,10}\/[^/]+\/clip\/([^/?\s\\"<']+)/i);
							clipId = matches? matches[1] : "";
						}else
						if(/clips\.twitch\.tv\//gi.test(text)) {
							const matches = text.match(/clips\.twitch\.[^/]{2,10}\/([^/?\s\\"<']+)/i);
							clipId = matches? matches[1] : "";
						}
						if(clipId) {
							const clip = await TwitchUtils.getClipById(clipId);

							const data:TwitchatDataTypes.ChatHighlightInfo = {
								clip:{
									url: clip!.embed_url+"&autoplay=true&parent=twitchat.fr&parent=localhost",
									mp4: clip!.thumbnail_url.replace(/-preview.*\.jpg/gi, ".mp4"),
									duration: clip!.duration,
								},
								params:StoreProxy.chat.chatHighlightOverlayParams,
							}
							logStep.messages.push({date:Date.now(), value:"Highlight clip ID \""+clipId+"\""});
							PublicAPI.instance.broadcast(TwitchatEvent.SHOW_CLIP, (data as unknown) as JsonObject);

						}else{
							//Highlight user message as text
							const info:TwitchatDataTypes.ChatHighlightInfo = {
								message:text,
								user,
								params:StoreProxy.chat.chatHighlightOverlayParams,
							};
							logStep.messages.push({date:Date.now(), value:"Highlight message \""+text+"\""});
							PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, (info as unknown) as JsonObject)
						}
						StoreProxy.chat.isChatMessageHighlighted = true;
					}else{
						PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, {})
						StoreProxy.chat.isChatMessageHighlighted = false;
					}
				}else

				//Handle TTS action
				if(step.type == "tts" && message) {
					const text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.text, subEvent);
					logStep.messages.push({date:Date.now(), value:"TTS read message \""+text+"\""});
					TTSUtils.instance.readNext(text, ttsID ?? trigger.id);
				}else

				//Handle poll action
				if(step.type == "poll") {
					try {
						if(step.pollData.title && step.pollData.answers.length >= 2) {
							const answers:string[] = [];
							for (const a of step.pollData.answers) {
								answers.push(await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, a))
							}
							await TwitchUtils.createPoll(StoreProxy.auth.twitch.user.id,
								await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.pollData.title),
								answers,
								step.pollData.voteDuration,
								step.pollData.pointsPerVote);
						}else{
							logStep.messages.push({date:Date.now(), value:"❌ Cannot create poll as it's missing either the title or answers"});
							log.error = true;
							logStep.error = true;
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
							const answers:string[] = [];
							for (const a of step.predictionData.answers) {
								answers.push(await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, a))
							}
							await TwitchUtils.createPrediction(StoreProxy.auth.twitch.user.id,
								await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.predictionData.title),
								answers,
								step.predictionData.voteDuration);
						}else{
							logStep.messages.push({date:Date.now(), value:"❌ Cannot create prediction as it's missing either the title or answers"});
							log.error = true;
							logStep.error = true;
						}
					}catch(error:any) {
						const message = error.message ?? error.toString()
						StoreProxy.main.alert(StoreProxy.i18n.t("error.prediction_error", {MESSAGE:message}))
					}
				}else

				//Handle raffle action
				if(step.type == "raffle") {
					const data:TwitchatDataTypes.RaffleData = JSON.parse(JSON.stringify(step.raffleData));
					if(data.customEntries) {
						//Parse placeholders on custom erntries
						data.customEntries = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, data.customEntries);
					}
					logStep.messages.push({date:Date.now(), value:"✔ Starting \""+data.mode+"\" raffle"});
					StoreProxy.raffle.startRaffle(data);
				}else

				//Handle raffle enter action
				if(step.type == "raffle_enter") {
					if(Object.prototype.hasOwnProperty.call(TwitchatDataTypes.TranslatableMessageTypesString, message.type) && StoreProxy.raffle.checkRaffleJoin(message as TwitchatDataTypes.TranslatableMessage)) {
						logStep.messages.push({date:Date.now(), value:"❌ Cannot join raffle. Either user already entered or no raffle has been started, or raffle entries are closed"});
						log.error = true;
						logStep.error = true;
					}else{
						logStep.messages.push({date:Date.now(), value:"✔ User joined the raffle"});
					}
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
					switch(step.action) {
						case "beepOn":
						case "beepOff":{
							const state = step.action === "beepOn";
							logStep.messages.push({date:Date.now(), value:"[VOICEMOD] Set beep state to \""+state+"\""});
							if(state) {
								VoicemodWebSocket.instance.beepOn();
							}else{
								VoicemodWebSocket.instance.beepOff();
							}
							break;
						}
						case "sound":{
							if(step.soundID) {
								//Select a voice by its ID
								logStep.messages.push({date:Date.now(), value:"[VOICEMOD] Play sound with ID \""+step.soundID+"\""});
								VoicemodWebSocket.instance.playSound(undefined, step.soundID);
							}else
							if(step.placeholder) {
								//Select a voice by its name
								const voiceName = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, "{"+step.placeholder+"}", subEvent);
								logStep.messages.push({date:Date.now(), value:"[VOICEMOD] play sound with name \""+voiceName+"\""});
								VoicemodWebSocket.instance.playSound(voiceName);
							}
							break;
						}

						default:
						case "voice": {
							if(step.voiceID) {
								//Select a voice by its ID
								logStep.messages.push({date:Date.now(), value:"[VOICEMOD] Enable filter with ID \""+step.voiceID+"\""});
								VoicemodWebSocket.instance.enableVoiceEffect(undefined, step.voiceID);
							}else
							if(step.placeholder) {
								//Select a voice by its name
								const voiceName = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, "{"+step.placeholder+"}", subEvent);
								logStep.messages.push({date:Date.now(), value:"[VOICEMOD] Enable filter with name \""+voiceName+"\""});
								VoicemodWebSocket.instance.enableVoiceEffect(voiceName);
							}
						}
					}
				}else

				//Handle sub trigger action
				if(step.type == "trigger") {
					if(step.triggerId) {
						const trigger = sTriggers.triggerList.find(v=>v.id == step.triggerId);
						if(trigger) {
							if(trigger.enabled) {
								// console.log("Exect sub trigger", step.triggerKey);
								logStep.messages.push({date:Date.now(), value:"Call trigger \""+step.triggerId+"\""});
								await this.executeTrigger(trigger, message, false, undefined, undefined, dynamicPlaceholders);
							}else{
								logStep.messages.push({date:Date.now(), value:"❌ Call trigger: trigger is disabled"});
								log.error = true;
								logStep.error = true;
							}
						}else{
							logStep.messages.push({date:Date.now(), value:"❌ Call trigger: trigger \""+step.triggerId+"\" not found"});
						}
					}else{
						logStep.messages.push({date:Date.now(), value:"❌ Call trigger: no trigger defined"});
						log.error = true;
						logStep.error = true;
					}
				}else

				//Handle sub trigger toggle action
				if(step.type == "triggerToggle") {
					if(step.triggerId) {
						const trigger = sTriggers.triggerList.find(v=>v.id == step.triggerId);
						if(trigger) {
							if((step.action == "enable" || (step.action == "toggle" && !trigger.enabled))
							&& !isPremium
							&& sTriggers.triggerList.filter(v=>v.enabled !== false).length >= Config.instance.MAX_TRIGGERS) {
								logStep.messages.push({date:Date.now(), value:step.action + "❌ Cannot enable trigger \""+step.triggerId+"\". Premium limit reached."});
								log.error = true;
								logStep.error = true;
							}else{
								switch(step.action) {
									case "enable": trigger.enabled = true; break;
									case "disable": trigger.enabled = false; break;
									case "toggle": trigger.enabled = !trigger.enabled; break;
								}
								sTriggers.saveTriggers();
								// console.log("Exect sub trigger", step.triggerKey);
								logStep.messages.push({date:Date.now(), value:step.action + " trigger \""+step.triggerId+"\". New State is: "+trigger.enabled});
							}
						}
					}
				}else

				//Handle http call trigger action
				if(step.type == "http") {
					const options:RequestInit = {method:step.method};
					let body:{[key:string]:string} = {};
					let customBody:string = "";
					if(step.customBody) {
						customBody = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.customBody, subEvent, false, false, false, true);
						if(step.sendAsBody) {
							try {
								body = JSON.parse(customBody);
							}catch(error) {
								log.error = true;
								logStep.error = true;
								logStep.messages.push({date:Date.now(), value:"Failed parsing custom body as JSON: "+customBody});
							}
						}
					}
					const headers:{[key:string]:string} = {};
					let uri = step.url;
					if(!/https?:\/\//gi.test(uri) && !/.*:\/\/.*/gi.test(uri)) uri = "https://"+uri;
					const url = new URL(uri);
					for (const tag of step.queryParams) {
						const text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, "{"+tag+"}", subEvent);
						if((step.method == "POST" || step.method == "PATCH") && step.sendAsBody == true) {
							body[tag.toLowerCase()] = text;
						}else{
							url.searchParams.append(tag.toLowerCase(), text);
						}
					}
					if(step.method == "POST" || step.method == "PATCH") {
						if(step.sendAsBody == true) {
							options.body = JSON.stringify(body);
						}else if(customBody) {
							options.body = customBody;
						}
					}
					if(step.customHeaders === true) {
						for (let i = 0; i < (step.headers || []).length; i++) {
							const h = step.headers![i];
							const value = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, h.value, subEvent);
							headers[h.key] = value;
						}
						options.headers = headers;
					}
					try {
						logStep.messages.push({date:Date.now(), value:"Calling HTTP: "+url});
						const res = await fetch(url, options);
						if(res.status >= 200 && res.status <= 208) {
							if(step.outputPlaceholder) {
								logStep.messages.push({date:Date.now(), value:"Store result to placeholder: "+step.outputPlaceholder});
								dynamicPlaceholders[step.outputPlaceholder] = await res.text();
							}
						}else{
							log.error = true;
							logStep.error = true;
							logStep.messages.push({date:Date.now(), value:"HTTP call failed with status "+res.status+": "+await res.text()});
						}
					}catch(error) {
						console.error(error);
					}
				}else

				//Handle WS message trigger action
				if(step.type == "ws") {
					const json:{[key:string]:number|string|boolean} = {};
					for (const tag of step.params) {
						const value = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, "{"+tag+"}", subEvent, false, false, false);
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
							logStep.messages.push({date:Date.now(), value:"❌ Websocket not connected. Cannot send data: "+json});
							log.error = true;
							logStep.error = true;
						}
					}catch(error) {
						console.error(error);
					}
				}else

				//Handle counter update trigger action
				if(step.type == "count") {
					let text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.addValue as string, subEvent);
					text = text.replace(/,/gi, ".");
					logStep.messages.push({date:Date.now(), value:"Executing arithmetic operation: \""+step.addValue+"\" => \""+text+"\""});
					let value:any = "";
					try {
						value = MathJS.evaluate(text);
					}catch(error) {
						const logMessage = "❌ Invalid arithmetic operation: \""+step.addValue+"\"";
						logStep.messages.push({date:Date.now(), value:logMessage});
						log.error = true;
						logStep.error = true;

					}
					if(!step.action) step.action = "ADD";

					if(!isNaN(value) && value != null && value != Infinity) {
						const ids = step.counters;
						for (const c of StoreProxy.counters.counterList) {
							if(ids.indexOf(c.id) > -1) {
								//Check if we can update the counter
								if(c.enabled == false && !isPremium) {
									const logMessage = "❌ Not premium and counter \""+c.name+"\" is disabled. Counter not updated.";
									logStep.messages.push({date:Date.now(), value:logMessage});
									log.error = true;
									logStep.error = true;
								}else
								//Check if this step requests that this counter should update a user
								//different than the default one (the one executing the command)
								if(c.perUser
								&& step.counterUserSources
								&& step.counterUserSources[c.id]
								&& step.counterUserSources[c.id] != TriggerActionDataTypes.COUNTER_EDIT_SOURCE_SENDER
								&& step.counterUserSources[c.id] != TriggerActionDataTypes.COUNTER_EDIT_SOURCE_EVERYONE
								&& step.counterUserSources[c.id] != TriggerActionDataTypes.COUNTER_EDIT_SOURCE_CHATTERS) {
									logStep.messages.push({date:Date.now(), value:"Load custom user from placeholder \"{"+step.counterUserSources[c.id].toUpperCase()+"}\"..."})

									const users = await this.extractUserFromPlaceholder(channel_id, step.counterUserSources[c.id], dynamicPlaceholders, actionPlaceholders, trigger, message, log);
									for (let i = 0; i < users.length; i++) {
										const user = users[i];
										if(!c.perUser || (user && !user.temporary && !user.errored && !user.anonymous)) {
											StoreProxy.counters.increment(c.id, step.action, value, user);
											let logMessage = "Update counter \""+c.name+"\", \""+step.action+"\" "+value+" ("+text+")";
											if(user) logMessage += " (for @"+user.displayNameOriginal+")";
											logStep.messages.push({date:Date.now(), value:logMessage});
										}else{
											let reason = "";
											if(!c.perUser && user) reason = "counter is not a per user counter";
											if(c.perUser && (!user || user.temporary || user.errored || user.anonymous)) reason = "counter is a per-user counter but given user is not loaded or anonymous";
											log.error = true;
											logStep.error = true;
											logStep.messages.push({date:Date.now(), value:"❌ Cannot update requested counter because "+reason});
										}
									}

								//Check if requested to edit all users of a counter
								}else if(c.perUser
								&& c.users
								&& step.counterUserSources
								&& step.counterUserSources[c.id]
								&& step.counterUserSources[c.id] == TriggerActionDataTypes.COUNTER_EDIT_SOURCE_EVERYONE){
									logStep.messages.push({date:Date.now(), value:"Update all existing users, \""+step.action+"\" "+value+" ("+text+")"});
									for (const uid in c.users) {
										StoreProxy.counters.increment(c.id, step.action, value, undefined, uid);
									}

								//Check if requested to edit all current chatters of a counter
								}else if(c.perUser
								&& c.users
								&& step.counterUserSources
								&& step.counterUserSources[c.id]
								&& step.counterUserSources[c.id] == TriggerActionDataTypes.COUNTER_EDIT_SOURCE_CHATTERS){
									logStep.messages.push({date:Date.now(), value:"Update all chatters, \""+step.action+"\" "+value+" ("+text+")"});
									const list = StoreProxy.users.users
									for (let i = 0; i < list.length; i++) {
										const user = list[i];
										if(user.channelInfo[channel_id]
										//If user is online or their last acitivity on chat was less than 10min ago
										&& (user.channelInfo[channel_id].online || Date.now() - (user.channelInfo[channel_id].lastActivityDate || 0) < 10 * 60000)) {
											StoreProxy.counters.increment(c.id, step.action, value, undefined, user.id);
										}
									}

								//Standard counter edition (either current user or a non-per-user counter)
								}else{
									const user = c.perUser? this.extractUserFromTrigger(trigger, message) : undefined;
									if(!c.perUser || (user && !user.temporary && !user.errored && !user.anonymous)) {
										const newValue = StoreProxy.counters.increment(c.id, step.action, value, user);
										let logMessage = "";
										if(step.action == "ADD") logMessage = "Add "+value+" ("+text+") to \""+c.name+"\"";
										if(step.action == "DEL") logMessage = "Substract "+value+" ("+text+") from \""+c.name+"\"";
										if(step.action == "SET") logMessage = "Set \""+c.name+"\" value to "+value+" ("+text+")";
										if(user) logMessage += " (for @"+user.displayNameOriginal+")";
										logMessage += ". New value is "+newValue;
										logStep.messages.push({date:Date.now(), value:logMessage});
									}else{
										let reason = "";
										if(!c.perUser && user) reason = "counter is not a per user counter";
										if(c.perUser && (!user || user.temporary || user.errored || user.anonymous)) reason = "counter is a per-user counter but given user is not loaded or anonymous";
										log.error = true;
										logStep.error = true;
										logStep.messages.push({date:Date.now(), value:"❌ Cannot update requested counter because "+reason});
									}
								}
							}
						}
					}else{
						logStep.messages.push({date:Date.now(), value:"New value is invalid: \""+value+"\""});
						logStep.error = true;
						log.error = true;
					}
				}else

				//Handle Value update trigger action
				if(step.type == "value") {
					const text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.newValue as string, subEvent);
					const ids = step.values;
					for (const v of StoreProxy.values.valueList) {
						if(ids.indexOf(v.id) > -1) {
							if(v.enabled == false && !isPremium) {
								const logMessage = "❌ Not premium and value \""+v.name+"\" is disabled. Not updated to: "+text;
								logStep.messages.push({date:Date.now(), value:logMessage});
								log.error = true;
								logStep.error = true;
							} else
							//Check if this step requests that this value should update a user
							//different than the default one (the one executing the command)
							if(v.perUser
							&& step.valueUserSources
							&& step.valueUserSources[v.id]
							&& step.valueUserSources[v.id] != TriggerActionDataTypes.VALUE_EDIT_SOURCE_SENDER
							&& step.valueUserSources[v.id] != TriggerActionDataTypes.VALUE_EDIT_SOURCE_EVERYONE
							&& step.valueUserSources[v.id] != TriggerActionDataTypes.VALUE_EDIT_SOURCE_CHATTERS) {
								logStep.messages.push({date:Date.now(), value:"Load custom user from placeholder \"{"+step.valueUserSources[v.id].toUpperCase()+"}\"..."})

								const users = await this.extractUserFromPlaceholder(channel_id, step.valueUserSources[v.id], dynamicPlaceholders, actionPlaceholders, trigger, message, log);
								for (let i = 0; i < users.length; i++) {
									const user = users[i];
									if(!v.perUser || (user && !user.temporary && !user.errored && !user.anonymous)) {
										StoreProxy.values.updateValue(v.id, text, user);
										let logMessage = "Update value \""+v.name+"\", "+text;
										if(user) logMessage += " (for @"+user.displayNameOriginal+")";
										logStep.messages.push({date:Date.now(), value:logMessage});
									}else{
										let reason = "";
										if(!v.perUser && user) reason = "value is not a per user value";
										if(v.perUser && (!user || user.temporary || user.errored || user.anonymous)) reason = "value is a per-user value but given user is not loaded or anonymous";
										log.error = true;
										logStep.error = true;
										logStep.messages.push({date:Date.now(), value:"❌ Cannot update requested value because "+reason});
									}
								}

							//Check if requested to edit all users of a value
							}else if(v.perUser
							&& v.users
							&& step.valueUserSources
							&& step.valueUserSources[v.id]
							&& step.valueUserSources[v.id] == TriggerActionDataTypes.VALUE_EDIT_SOURCE_EVERYONE){
								logStep.messages.push({date:Date.now(), value:"Update all existing users, "+text});
								for (const uid in v.users) {
									StoreProxy.values.updateValue(v.id, text, undefined, uid);
								}

							//Check if requested to edit all current chatters of a value
							}else if(v.perUser
							&& v.users
							&& step.valueUserSources
							&& step.valueUserSources[v.id]
							&& step.valueUserSources[v.id] == TriggerActionDataTypes.VALUE_EDIT_SOURCE_CHATTERS){
								logStep.messages.push({date:Date.now(), value:"Update all chatters, "+text});
								const list = StoreProxy.users.users
								for (let i = 0; i < list.length; i++) {
									const user = list[i];
									if(user.channelInfo[channel_id]
									//If user is online or their last acitivity on chat was less than 10min ago
									&& (user.channelInfo[channel_id].online
									|| Date.now() - (user.channelInfo[channel_id].lastActivityDate || 0) < 10 * 60000)) {
										StoreProxy.values.updateValue(v.id, text, undefined, user.id);
									}
								}

							//Standard value edition (either current user or a non-per-user value)
							}else {
								const user = v.perUser? this.extractUserFromTrigger(trigger, message) : undefined;
								if(!v.perUser || (user && !user.temporary && !user.errored && !user.anonymous)) {
									StoreProxy.values.updateValue(v.id, text, user);
									let logMessage = "Update \""+v.name+"\" to \""+text+"\"";
									if(user) logMessage += " (for @"+user.displayNameOriginal+")";
									logStep.messages.push({date:Date.now(), value:logMessage});
								}else{
									let reason = "";
									if(!v.perUser && user) reason = "value is not a per user value";
									if(v.perUser && (!user || user.temporary || user.errored || user.anonymous)) reason = "value is a per-user value but given user is not loaded or anonymous";
									log.error = true;
									logStep.error = true;
									logStep.messages.push({date:Date.now(), value:"❌ Cannot update requested value because "+reason});
								}
							}
						}
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
						const triggerList = sTriggers.triggerList;
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
								const trigger = sTriggers.triggerList.find(v=>v.id == triggerId);
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
						let title:string|undefined = undefined;
						let tags:string[]|undefined = undefined;
						let branded:boolean|undefined = undefined;
						let labels:TriggerActionDataTypes.TriggerActionStreamInfoData["labels"]|undefined = undefined;
						if(step.labels) labels = step.labels;
						if(step.branded === true) branded = true;
						if(step.branded === false) branded = false;
						if(step.title) {
							title = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.title, subEvent);
						}
						if(step.tags) {
							tags = [];
							for (const tag of step.tags) {
								tags.push(await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, tag, subEvent));
							}
						}
						logStep.messages.push({date:Date.now(), value:"Set stream infos. Title:\""+title+"\" Tags:\""+tags+"\" CategoryID:\""+step.categoryId+"\""});
						await StoreProxy.stream.updateStreamInfos("twitch", StoreProxy.auth.twitch.user.id, title, step.categoryId, tags, branded, labels);
					}
				}else

				//Handle mobile device vibration action
				if(step.type == "vibrate") {
					if(step.pattern) {
						const pattern:number[] = TriggerActionDataTypes.VIBRATION_PATTERNS.find(v=>v.id == step.pattern)?.pattern || [];
						logStep.messages.push({date:Date.now(), value:"Vibrate device with pattern \""+step.pattern+"\" => \"["+pattern+"]\""});
						window.navigator.vibrate(pattern);
					}
				}else

				//Handle GoXLR actions
				if(step.type == "goxlr") {
					if(!isPremium) {
						const logMessage = "❌ Not premium, cannot control GoXLR ";
						logStep.messages.push({date:Date.now(), value:logMessage});
						log.error = true;
						logStep.error = true;
					}else{
						logStep.messages.push({date:Date.now(), value:"GoXLR action \""+step.action+"\""});
						switch(step.action) {
							case "fx_on":
							case "fx_off": {
								if(step.fxPresetIndex !== undefined && step.fxPresetIndex > -1) {
									logStep.messages.push({date:Date.now(), value:"GoXLR set active preset index \""+step.fxPresetIndex});
									await GoXLRSocket.instance.setActiveFxPreset(step.fxPresetIndex);
								}
								GoXLRSocket.instance.setFXEnabled(step.action == "fx_on");
								break;
							}
							case "sample_play": {
								if(step.sampleIndex) {
									logStep.messages.push({date:Date.now(), value:"GoXLR play sample at \""+step.sampleIndex[0] + " "+ step.sampleIndex[1]});
									GoXLRSocket.instance.playSample(step.sampleIndex[0], step.sampleIndex[1]);
								}
								break;
							}
							case "set_fader": {
								if(step.faderId) {
									logStep.messages.push({date:Date.now(), value:"GoXLR set fader \""+step.faderId + "\" volume to "+ step.faderValue});
									const value = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.faderValue!);
									GoXLRSocket.instance.setFaderValue(step.faderId, parseInt(value) || 0);
								}
								break;
							}
							case "profile": {
								if(step.profile) {
									logStep.messages.push({date:Date.now(), value:"GoXLR set profile \""+step.profile + "\""});
									GoXLRSocket.instance.setProfile(step.profile!);
								}
								break;
							}
						}
					}
				}else

				//Handle music actions
				if(step.type == "music") {
					try {
						let failCode:TwitchatDataTypes.MessageMusicAddedToQueueData["failCode"] = undefined;
						logStep.messages.push({date:Date.now(), value:"[MUSIC] Execute music action: "+step.musicAction});
						if(SpotifyHelper.instance.connected) {
							logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Spotify connected"});
						}else{
							logStep.messages.push({date:Date.now(), value:"❌ [SPOTIFY] Spotify NOT connected"});
							log.error = true;
							logStep.error = true;
							failCode = "spotify_not_connected";
						}

						//Adding a track to the queue
						if(step.musicAction == TriggerMusicTypes.ADD_TRACK_TO_QUEUE) {
							const maxDuration = (step.maxDuration || 0)*1000;
							//Convert placeholders if any
							const m = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.track, subEvent);
							let data:TwitchatDataTypes.MusicTrackData|undefined = undefined;
							if(SpotifyHelper.instance.connected) {
								let track:SearchTrackItem|null = null;
								if(/open\.spotify\.[a-z]{2,}\/.*track\/.*/gi.test(m)) {
									//Full URL specified, extract the ID from it
									const chunks = new URL(m).pathname.split(/\//gi);
									const id = chunks.pop()!;
									track = await SpotifyHelper.instance.getTrackByID(id);
									logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Get track by ID success: "+(track != null)+" : TRACK ID "+id});
								}else if(/spotify\..[a-z]{2,}\/.*/gi.test(m)) {
									logStep.messages.push({date:Date.now(), value:"❌ [SPOTIFY] Unsupported track URL : "+m});
									log.error = true;
									logStep.error = true;
									failCode = "wrong_url";
								}else{
									//No URL given, search with API
									const tracks = await SpotifyHelper.instance.searchTrack(m);
									if(tracks && tracks.length > 0) {
										switch(step.musicSelectionType) {
											case "2": track = tracks.length > 1? tracks[1] : tracks.pop()!; break;
											case "3": track = tracks.length > 2? tracks[2] : tracks.pop()!; break;
											case "top3": track = Utils.pickRand(tracks.splice(0, 3)); break;
											case "top5": track = Utils.pickRand(tracks.splice(0, 5)); break;
											case "top10": track = Utils.pickRand(tracks.splice(0, 10)); break;
											case "top15": track = Utils.pickRand(tracks.splice(0, 15)); break;
											case "top20": track = Utils.pickRand(tracks.splice(0, 20)); break;
											case "top25": track = Utils.pickRand(tracks.splice(0, 25)); break;
											case "top30": track = Utils.pickRand(tracks.splice(0, 30)); break;
											case "top40": track = Utils.pickRand(tracks.splice(0, 40)); break;
											case "top50": track = Utils.pickRand(tracks.splice(0, 50)); break;
											default:
											case "1": track = tracks[0]; break;
										}
									}
									logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Search track with selection \""+(step.musicSelectionType || "1")+"\": "+(track != null? 'success' : 'failed')});
								}
								if(track) {
									if(step.limitDuration === true && track.duration_ms > maxDuration) {
										logStep.messages.push({date:Date.now(), value:"❌ [SPOTIFY] Track is longer than the allowed "+Utils.formatDuration(maxDuration)+"s"});
										failCode = "max_duration";
									}else {
										const success = await SpotifyHelper.instance.addToQueue(track.uri);
										if(success === true) {
											logStep.messages.push({date:Date.now(), value:"✔ [SPOTIFY] Add to queue success"});
											data = {
												title:track.name,
												artist:track.artists[0].name,
												album:track.album.name,
												cover:track.album.images[0].url,
												duration:track.duration_ms,
												url:track.external_urls.spotify,
											};
										}else if(success == "NO_ACTIVE_DEVICE") {
											logStep.messages.push({date:Date.now(), value:"❌ [SPOTIFY] No active device found"});
											log.error = true;
											logStep.error = true;
											failCode = "no_active_device";

										}else{
											logStep.messages.push({date:Date.now(), value:"❌ [SPOTIFY] Add to queue failed"});
											log.error = true;
											logStep.error = true;
											failCode = "api";
										}
									}
								}else{
									logStep.messages.push({date:Date.now(), value:"❌ [SPOTIFY] Searching track failed, nor result found for search \""+m+"\""});
									log.error = true;
									logStep.error = true;
									failCode = "no_result";
								}
							}

							const trackAddedMesssageData:TwitchatDataTypes.MessageMusicAddedToQueueData = {
								id:Utils.getUUID(),
								date:Date.now(),
								platform:"twitchat",
								type:TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE,
								trackAdded:data,
								message:m,
								user:executingUser,
								triggerIdSource:trigger.id,
								failCode,
								failReason:StoreProxy.i18n.t("triggers.actions.music.fail_reasons."+failCode, {DURATION:Utils.formatDuration(maxDuration)+"s", SEARCH:m}),
								search:m,
								maxDuration:step.maxDuration,
								channel_id:message.channel_id,
							};
							StoreProxy.chat.addMessage(trackAddedMesssageData);

							//A track has been found and added
							if(data) {
								PublicAPI.instance.broadcast(TwitchatEvent.TRACK_ADDED_TO_QUEUE, (data as unknown) as JsonObject);

								//The step is requesting to confirm on chat when a track has been added
								if(step.confirmMessage) {
									const confirmPH = TriggerEventPlaceholders(TriggerTypes.TRACK_ADDED_TO_QUEUE);
									const chatMessage = await this.parsePlaceholders(dynamicPlaceholders, confirmPH, trigger, trackAddedMesssageData, step.confirmMessage, subEvent, false);
									MessengerProxy.instance.sendMessage(chatMessage);
								}
							}else{

								//The step is requesting to send message if track failed to be added
								if(step.failMessage) {
									const confirmPH = TriggerEventPlaceholders(TriggerTypes.TRACK_ADDED_TO_QUEUE);
									let chatMessage = await this.parsePlaceholders(dynamicPlaceholders, confirmPH, trigger, trackAddedMesssageData, step.failMessage, subEvent, false);
									chatMessage = chatMessage.replace(/\{FAIL_REASON\}/gi, StoreProxy.i18n.t("triggers.actions.music.fail_reasons."+failCode, {DURATION:Utils.formatDuration((step.maxDuration || 0)*1000), SEARCH:m}));
									MessengerProxy.instance.sendMessage(chatMessage);
								}

							}
						}else

						if(step.musicAction == TriggerMusicTypes.NEXT_TRACK) {
							if(SpotifyHelper.instance.connected) {
								SpotifyHelper.instance.nextTrack().then(res=>{
									logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Next track success: "+res});
								});
							}
						}else

						if(step.musicAction == TriggerMusicTypes.PAUSE_PLAYBACK) {
							if(SpotifyHelper.instance.connected) {
								SpotifyHelper.instance.pause().then(res=> {
									logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Pause success: "+res});
								});
							}
						}else

						if(step.musicAction == TriggerMusicTypes.RESUME_PLAYBACK) {
							if(SpotifyHelper.instance.connected) {
								SpotifyHelper.instance.resume().then(res=> {
									logStep.messages.push({date:Date.now(), value:"[SPOTIFY] Resume success: "+res});
								});
							}
						}else

						if(step.musicAction == TriggerMusicTypes.START_PLAYLIST) {
							let m:string = step.playlist;
							if(message.type == "message") {
								m = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, m, subEvent);
							}
							if(SpotifyHelper.instance.connected) {
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
						}
					}catch(error) {
						console.error(error);
						logStep.messages.push({date:Date.now(), value:"❌ [SPOTIFY] Exception: "+ error});
						log.error = true;
						logStep.error = true;
					}
				}else

				//Handle custom badges
				if(step.type == "customBadges") {
					let users:TwitchatDataTypes.TwitchatUser[] = [];

					//if requested to update badges of the user executing the trigger
					if(step.customBadgeUserSource == TriggerActionDataTypes.COUNTER_EDIT_SOURCE_SENDER) {
						const user = this.extractUserFromTrigger(trigger, message);
						if(user) users.push(user);
					}else{
						users = await this.extractUserFromPlaceholder(channel_id, step.customBadgeUserSource, dynamicPlaceholders, actionPlaceholders, trigger, message, log);
					}
					if(users) {
						for (let i = 0; i < users.length; i++) {
							const user = users[i];

							step.customBadgeAdd.forEach(v=> {
								if(StoreProxy.users.giveCustomBadge(user, v, channel_id)) {
									logStep.messages.push({date:Date.now(), value:"➕ Badge \""+v+"\" given to "+user.login});
								}else{
									logStep.messages.push({date:Date.now(), value:"❌ Failed giving badge \""+v+"\" to "+user.login+". Limit reached."});
									log.error = true;
									logStep.error = true;
								}
							});
							step.customBadgeDel.forEach(v=> {
								StoreProxy.users.removeCustomBadge(user, v, channel_id);
								logStep.messages.push({date:Date.now(), value:"➖ Removed badge \""+v+"\" from "+user.login});
							});
						}
					}
				}else

				//Handle custom badges
				if(step.type == "customUsername") {
					let users:TwitchatDataTypes.TwitchatUser[] = [];
					//if requested to update badges of the user executing the trigger
					if(step.customUsernameUserSource == TriggerActionDataTypes.COUNTER_EDIT_SOURCE_SENDER) {
						const user = this.extractUserFromTrigger(trigger, message);
						if(user) users.push(user);
					}else{
						users = await this.extractUserFromPlaceholder(channel_id, step.customUsernameUserSource, dynamicPlaceholders, actionPlaceholders, trigger, message, log);
					}

					const newUsername:string = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.customUsername);
					for (let i = 0; i < users.length; i++) {
						const user = users[i];
						if(StoreProxy.users.setCustomUsername(user, newUsername, channel_id)) {
							logStep.messages.push({date:Date.now(), value:"✔ Set "+user.login+"'s username to \""+(newUsername || user.displayNameOriginal)+"\""});
						}else{
							logStep.messages.push({date:Date.now(), value:"❌ Failed to set "+user.login+"'s username to \""+(newUsername || user.displayNameOriginal)+"\""});
							log.error = true;
							logStep.error = true;
						}
					}
				}else

				//Handle custom chat messages
				if(step.type == "customChat") {
					const text = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.customMessage?.message || "", subEvent);
					const chunks = TwitchUtils.parseMessageToChunks(text, undefined, true);
					const actions = (JSON.parse(JSON.stringify(step.customMessage?.actions)) || []) as NonNullable<typeof step.customMessage.actions>;
					for (let i = 0; i < actions.length; i++) {
						const a = actions[i];
						if(a.label) {
							a.label = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, a.label, subEvent);
						}
						switch(a.actionType) {
							case "message":{
								a.message = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, a.message || "", subEvent);
								break;
							}
							case "url":{
								a.url = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, a.url || "", subEvent);
								break;
							}
						}
					}
					const customMessage:TwitchatDataTypes.MessageCustomData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
						actions,
						user:step.customMessage.user,
						icon:step.customMessage.icon,
						highlightColor:step.customMessage.highlightColor,
						message:text,
						message_chunks:chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						col:step.customMessage.col,
						style:step.customMessage.style,
						channel_id:message.channel_id,
					};

					logStep.messages.push({date:Date.now(), value:"Send message type \""+customMessage.style+"\": \""+text+"\""});

					StoreProxy.chat.addMessage(customMessage);
				}else

				//Handle custom chat messages
				if(step.type == "heat_click") {
					let x = "0";
					let y = "0";
					let ctrl = false;
					let alt = false;
					let shift = false;
					if(step.heatClickData.forward === true && message.type == TwitchatDataTypes.TwitchatMessageType.HEAT_CLICK) {
						x = message.coords.x.toString();
						y = message.coords.y.toString();
						ctrl = message.ctrl;
						alt = message.alt;
						shift = message.shift;
					}else{
						try {
							x = MathJS.evaluate(await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.heatClickData.x, subEvent));
						}catch(error){
							logStep.messages.push({date:Date.now(), value:"❌ Failed to interpret arithmetic expression for X coordinate \""+step.heatClickData.x+"\""});
							log.error = true;
							logStep.error = true;
						}
						try {
							y = MathJS.evaluate(await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.heatClickData.y, subEvent));
						}catch(error){
							logStep.messages.push({date:Date.now(), value:"❌ Failed to interpret arithmetic expression for Y coordinate \""+step.heatClickData.y+"\""});
							log.error = true;
							logStep.error = true;
						}
						if(isNaN(parseFloat(x))) {
							x = "50"
							logStep.messages.push({date:Date.now(), value:"❌ Invalid X coordinate. Fallback to 50%"});
							log.error = true;
							logStep.error = true;
						}
						if(isNaN(parseFloat(y))) {
							y = "50"
							logStep.messages.push({date:Date.now(), value:"❌ Invalid Y coordinate. Fallback to 50%"});
							log.error = true;
							logStep.error = true;
						}
						ctrl = step.heatClickData.ctrl;
						alt = step.heatClickData.alt;
						shift = step.heatClickData.shift;
					}
					const clickEventData:{requestType:string, vendorName:string, requestData:{event_name:string, event_data:TwitchatDataTypes.HeatClickData}} = {
						requestType:"emit_event",
						vendorName:"obs-browser",
						requestData:{
							event_name:"heat-click",
							event_data: {
								id:Utils.getUUID(),
								anonymous:true,
								x:parseFloat(x)/100,
								y:parseFloat(y)/100,
								channelId:channel_id,
								uid:executingUser?.id || "",
								login:executingUser?.login || "",
								testMode:true,
								alt,
								ctrl,
								shift,
								twitchatOverlayID:step.heatClickData.overlayId,
								page:"",
								followDate:0,
								isBan:false,
								isBroadcaster:false,
								isFollower:false,
								isMod:false,
								isSub:false,
								isVip:false,
								rotation:1,
								scaleX:1,
								scaleY:1,
							}
						}
					};
					logStep.messages.push({date:Date.now(), value:`Send click to ${clickEventData.requestData.event_data.twitchatOverlayID}: x=${clickEventData.requestData.event_data.x} y=${clickEventData.requestData.event_data.y}`});
					if(OBSWebsocket.instance.connected) {
						OBSWebsocket.instance.socket.call("CallVendorRequest", clickEventData);
					}
				}else

				//Handle channel point reward action
				if(step.type == "reward") {
					logStep.messages.push({date:Date.now(), value:"Executing reward action \""+step.rewardAction.action+"\""});
					let rewardData:TwitchDataTypes.RewardEdition | undefined;
					//Parse placeholders on title, prompt and cost
					if(step.rewardAction.rewardEdit) {
						rewardData = JSON.parse(JSON.stringify(step.rewardAction.rewardEdit));
						if(rewardData!.title) {
							rewardData!.title = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, rewardData!.title, subEvent);
						}
						if(rewardData!.prompt) {
							rewardData!.prompt = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, rewardData!.prompt, subEvent);
						}
						if(rewardData!.cost) {
							const cost = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, rewardData!.cost.toString(), subEvent);
							try {
								const num = MathJS.evaluate(cost);
								if(!isNaN(num)) {
									rewardData!.cost = num;
								}
							}catch(error) {}
						}
					}
					switch(step.rewardAction.action) {
						case "toggle": {
							if(step.rewardAction.rewardId) {
								let enabled = (await TwitchUtils.getRewards()).find(v => v.id === step.rewardAction.rewardId)?.is_enabled || false;
								switch(step.rewardAction.state) {
									case "enable": enabled = true; break;
									case "disable": enabled = false; break;
									case "toggle": enabled = !enabled; break;
								}
								const res = await TwitchUtils.updateReward(step.rewardAction.rewardId, {is_enabled:enabled});
								if(!res) {
									logStep.messages.push({date:Date.now(), value:"❌ An error occured when updating the reward's ID ID \""+step.rewardAction.rewardId+"\" state"});
									log.error = true;
									logStep.error = true;
								}else{
									logStep.messages.push({date:Date.now(), value:"✔ Reward is now "+(enabled? 'enabled' : 'disabled')});
								}
							}
							break;
						}
						case "edit": {
							if(step.rewardAction.rewardId && rewardData!) {
								const res = await TwitchUtils.updateReward(step.rewardAction.rewardId, rewardData!);
								if(!res) {
									logStep.messages.push({date:Date.now(), value:"❌ An error occured when updating the reward's ID \""+step.rewardAction.rewardId+"\" data "});
									log.error = true;
									logStep.error = true;
								}else{
									logStep.messages.push({date:Date.now(), value:"✔ Reward data upated succesfully"});
								}
							}
							break;
						}
						case "create": {
							if(rewardData!) {
								const res = await TwitchUtils.createReward(rewardData!);
								if(res !== true) {
									logStep.messages.push({date:Date.now(), value:"❌ An error occured creating the reward. "+res});
									log.error = true;
									logStep.error = true;
								}else{
									logStep.messages.push({date:Date.now(), value:"✔ Reward created successfully"});
								}
							}
							break;
						}
						case "delete": {
							if(step.rewardAction.rewardId) {
								const res = await TwitchUtils.deleteReward(step.rewardAction.rewardId);
								if(!res) {
									logStep.messages.push({date:Date.now(), value:"❌ An error occured when deleting the reward ID \""+step.rewardAction.rewardId+"\""});
									log.error = true;
									logStep.error = true;
								}else{
									logStep.messages.push({date:Date.now(), value:"✔ Reward deleted succesfully"});
								}
							}
							break;
						}
						case "refund": {
							if(message.type == TwitchatDataTypes.TwitchatMessageType.REWARD && message.redeemId) {
								const res = await TwitchUtils.refundRedemptions([message.redeemId], message.reward.id);
								if(!res) {
									logStep.messages.push({date:Date.now(), value:"❌ An error occured when refunding the redeem ID \""+message.redeemId+"\""});
									const manageableList = await TwitchUtils.getRewards(false, true);
									if(manageableList.findIndex(v=>v.id == message.reward.id) == -1) {
										logStep.messages.push({date:Date.now(), value:"❌ Reward \""+message.reward.title+"\" has not been created by Twitchat. Redeem cannot be refund."});
									}
									log.error = true;
									logStep.error = true;
								}else{
									logStep.messages.push({date:Date.now(), value:"✔ Reward redeem succesfully refund"});
								}
							}
							break;
						}
					}
				}else

				//Handle twitch extension action
				if(step.type == "extension") {
					logStep.messages.push({date:Date.now(), value:"Change state for extension ID \""+step.extension.id+"\" to: "+(step.extension.enable? 'Enabled' : "Disabled")});
					const extension = StoreProxy.extension.availableExtensions.find(v=>v.id == step.extension.id);
					if(!extension) {
						logStep.messages.push({date:Date.now(), value:"❌ Requested extension not found"});
						log.error = true;
						logStep.error = true;
					}else{
						logStep.messages.push({date:Date.now(), value:"Extension found: \""+extension.name+"\""});
						if(!await TwitchUtils.updateExtension(extension.id, extension.version, step.extension.enable, step.extension.slotIndex, step.extension.slotType)) {
							logStep.messages.push({date:Date.now(), value:"❌ Something went wrong when updating extension state"});
							log.error = true;
							logStep.error = true;
						}else{
							logStep.messages.push({date:Date.now(), value:"✔ Extension updated successfuly"});
						}
					}
				}else

				//Handle Discord action
				if(step.type == "discord") {
					logStep.messages.push({date:Date.now(), value:"Execute discord action \""+step.discordAction.action+"\""});
					const messageText = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, step.discordAction.message, subEvent, false, false, false);
					logStep.messages.push({date:Date.now(), value:"Sending message: "+messageText});
					try {
						const res = await ApiHelper.call("discord/message", "POST", {message:messageText, channelId:step.discordAction.channelId});
						if(res.json.success) {
							logStep.messages.push({date:Date.now(), value:"✔ Message posted to discord"});
						}else{
							throw (new Error("posting failed"));
						}
					}catch(error) {
						logStep.messages.push({date:Date.now(), value:"❌ Posting message to Discord failed. Make sure Twitchat bot has permissions to write on the given channel"});
					}
				}else

				//Handle Lumia Stream action
				if(step.type == "lumia") {
					logStep.messages.push({date:Date.now(), value:"Execute lumia action \""+step.lumia.action+"\""});
					switch(step.lumia.action) {
						case "color": {
							logStep.messages.push({date:Date.now(), value:`Set color to "#${step.lumia.color}", brigtness:${step.lumia.colorBrightness}%, duration:${step.lumia.colorDuration_s}s, transition:${step.lumia.colorTransition_s}s`});
							StoreProxy.lumia.setColor(step.lumia.color!, step.lumia.colorBrightness!, step.lumia.colorDuration_s! * 1000, step.lumia.colorTransition_s! * 1000);
						}
					}
				}

			}catch(error:any) {
				console.error(error);
				logStep.messages.push({date:Date.now(), value:"❌ [EXCEPTION] step execution thrown an error: "+error.message+" "+error.stack});
				log.criticalError = true;
				logStep.error = true;
			}
			logStep.messages.push({date:Date.now(), value:"✔ Step execution complete"});
		}

		if(queue) {
			const item = queue.shift();
			if(item) {
				log.entries.push({date:Date.now(), type:"message", value:"✔ Resolve queue "+queueKey});
				item.resolver();//Proceed to next trigger in current queue
			}
		}
		log.entries.push({date:Date.now(), type:"message", value:"✔ Trigger execution complete"});
		log.complete = true;

		// console.log("Steps parsed", actions);
		return true;
	}

	/**
	 * Replaces placeholders by their values on the message
	 */
	public async parsePlaceholders(dynamicPlaceholders:{[key:string]:string|number}, actionPlaceholder:ITriggerPlaceholder<any>[], trigger:TriggerData, message:TwitchatDataTypes.ChatMessageTypes, src:string, subEvent?:string|null, removeRemainingTags:boolean = true, removeFolderNavigation:boolean = false, removeHTMLtags:boolean = true, escapeDoubleQuotes:boolean = false):Promise<string> {
		let res = src.toString();
		if(!res) return "";
		let subEvent_regSafe = "";
		if(subEvent) subEvent_regSafe = subEvent.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

		const ululeProject = DataStore.get(DataStore.ULULE_PROJECT);
		const isPremium = StoreProxy.auth.isPremium;
		const channelId = StoreProxy.auth.twitch.user.id;
		const me = StoreProxy.auth.twitch.user;
		// const channelId = message.hasOwnProperty("channel_id")? message.channel_id : StoreProxy.auth.twitch.user.id;

		//Replace dynamic placeholders. These are user defined placeholders.
		//Ex: to read a counter value, user must define a placeholder name that
		//will be populated with the counter's value so this value can be used
		//in subsequent actions.
		//Here we use that value
		for (const key in dynamicPlaceholders) {
			const keySafe = key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			res = res.replace(new RegExp("\\{"+keySafe+"\\}", "gi"), dynamicPlaceholders[key].toString() ?? "");
		}

		try {
			// console.log("===== PARSE TEXT =====");
			// console.log(trigger);
			// console.log(message);
			// console.log(src);
			// console.log(subEvent);

			let placeholders = TriggerEventPlaceholders(trigger.type).concat() ?? [];//Clone it to avoid modifying original
			if(actionPlaceholder.length > 0) placeholders = placeholders.concat(actionPlaceholder);
			// console.log(placeholders);
			//No placeholders for this event type, just send back the source text
			if(placeholders.length == 0) return res;

			const srcU = src.toUpperCase();
			const streamInfos = StoreProxy.stream.currentStreamInfo[channelId];
			for (const placeholder of placeholders) {
				let value = "";
				let cleanSubevent = true;
				placeholder.tag = placeholder.tag.toUpperCase();
				if(srcU.indexOf("{"+placeholder.tag+"}") == -1) continue;

				//Special pointers parsing.
				//Pointers starting with "__" are parsed here
				if(placeholder.pointer.indexOf("__")==0) {
					const pointer = placeholder.pointer.toLowerCase();
					/**
					 * If the placeholder requests for the current stream info
					 */
					if(pointer.indexOf("__me__") == 0) {
						const pointerLocal = pointer.replace('__me__.', '') as keyof Pick<TwitchatDataTypes.TwitchatUser, "id" | "login">;
						value = me[pointerLocal];
					}
					/**
					 * If the placeholder requests for the current stream info
					 */
					if(pointer.indexOf("__my_stream__") == 0 && streamInfos) {
						const pointerLocal = pointer.replace('__my_stream__.', '') as keyof TwitchatDataTypes.StreamInfo | "duration" | "duration_ms";
						const startDate = (streamInfos.started_at || Date.now());
						if(pointerLocal == "duration") {
							value = Utils.formatDuration(Date.now() - startDate);
						}else if(pointerLocal == "duration_ms") {
							value = (Date.now() - startDate).toString();
						}else{
							value = streamInfos[pointerLocal]?.toString() || "";
						}
						if(!value) value = (pointerLocal == "viewers")? "0" : "-none-";

					/**
					 * If the placeholder requests for Ulule info
					 */
					}else if(pointer.indexOf("__ulule__") == 0 && ululeProject) {
						const pointerLocal = pointer.replace('__ulule__.', '');
						switch(pointerLocal) {
							case "url": value = ululeProject; break;
							case "name": {
								//This is a dirty duplicate of what's in OverlayParamsUlule.
								//Think about a cleaner way to do this
								const project = ululeProject.replace(/.*ulule.[a-z]{2,3}\/([^?\/]+).*/gi, "$1");
								try {
									const apiRes = await ApiHelper.call("ulule/project", "GET", {project});
									if(apiRes.status == 200) {
										value = Utils.getQueryParameterByName("title") || apiRes.json.name_en || apiRes.json.name_fr || apiRes.json.name_ca || apiRes.json.name_de || apiRes.json.name_es || apiRes.json.name_it || apiRes.json.name_pt || apiRes.json.name_nl;
									}
								}catch(error){
									value = "";
								}
								break;
							}
						}

					/**
					 * If the placeholder requests for trigger's info
					 */
					}else if(pointer.indexOf("__trigger__") == 0) {
						const pointerLocal = pointer.replace('__trigger__.', '');
						switch(pointerLocal) {
							case "name":{
								value = trigger.name ?? Utils.getTriggerDisplayInfo(trigger).label;
								if(!value) value = "-no name-";
								break;
							}
							case "id":{
								value = trigger.id;
								break;
							}
						}

					/**
					 * If the placeholder requests for the current OBS scene
					 */
					}else if(pointer.indexOf("__obs__") == 0) {
						const pointerLocal = pointer.replace('__obs__.', '');
						switch(pointerLocal) {
							case "scene": value = StoreProxy.main.currentOBSScene || "-none-"; break;
						}

					/**
					 * If the placeholder requests for the current command
					 */
					}else if(pointer === "__command__") {
						value = subEvent || "-none-";
						cleanSubevent = false;

					/**
					 * If the placeholder requests for the current timer value
					 */
					}else if(pointer.indexOf("__timer__") == 0) {
						const pointerLocal = pointer.replace('__timer__.', '');
						const timer = StoreProxy.timer.timer;
						if(timer) {
							const start = timer.startAt_ms;
							let elapsed = Math.floor((Date.now() - start + timer.offset_ms)/1000)*1000;
							if(timer.paused) {
								elapsed -= Date.now() - timer.pausedAt!;
							}
							if(pointerLocal == "value") {
								value = Math.round(elapsed / 1000).toString();
							}else
							if(pointerLocal == "value_formated") {
								value = Utils.formatDuration(elapsed);
							}
						}else{
							value = "0";
						}

					/**
					 * If the placeholder requests for the current countdown value
					 */
					}else if(pointer.indexOf("__countdown__") == 0) {
						const pointerLocal = pointer.replace('__countdown__.', '');
						const cd = StoreProxy.timer.countdown;
						if(cd) {
							let elapsed = Date.now() - cd.startAt_ms;
							if(cd.paused) {
								elapsed -= Date.now() - cd.pausedAt!;
							}
							const remaining = Math.ceil((cd.duration_ms - elapsed)/1000)*1000;
							if(pointerLocal == "value") {
								value = Math.round(remaining / 1000).toString();
							}else
							if(pointerLocal == "value_formated") {
								value = Utils.formatDuration(remaining);
							}else
							if(pointerLocal == "duration") {
								value = Math.round(cd.duration_ms / 1000).toString();
							}else
							if(pointerLocal == "duration_formated") {
								value = Utils.formatDuration(cd.duration_ms);
							}
						}else{
							value = "0";
						}

					/**
					 * If the placeholder requests for a goxlr value
					 */
					}else if(pointer.indexOf("__goxlr__") == 0) {
						const pointerLocal = pointer.split(".").splice(1);
						if(pointerLocal[0] == "cough") {
							value = GoXLRSocket.instance.getButtonState( "Cough" ) === true ? "true" : "false";
						}else
						if(pointerLocal[0] == "profile") {
							value = GoXLRSocket.instance.currentProfile;
						}else
						if(pointerLocal[0] == "input") {
							type keys = "mic"|"chat"|"music"|"game"|"console"|"linein"|"system"|"sample";
							const input = pointerLocal[1] as keys;
							const hashmap:{[key in keys]:keyof GoXLRTypes.Volumes} = {
								mic:"Mic",
								chat:"Chat",
								music:"Music",
								game:"Game",
								console:"Console",
								linein:"LineIn",
								system:"System",
								sample:"Sample",
							}
							if(hashmap[input]) {
								value = GoXLRSocket.instance.getInputVolume( hashmap[input] ).toString();
							}else{
								value = "0";
							}
						}else
						if(pointerLocal[0] == "fx") {
							switch(pointerLocal[1]) {
								case "enabled": value = GoXLRSocket.instance.fxEnabled===true? "true" : "false"; break;
								case "preset": value = (GoXLRSocket.instance.activeEffectPreset + 1).toString(); break;
								case "megaphone": value = GoXLRSocket.instance.getIsToggleButtonActive("EffectMegaphone")===true? "true" : "false"; break;
								case "robot": value = GoXLRSocket.instance.getIsToggleButtonActive("EffectRobot")===true? "true" : "false"; break;
								case "hardtune": value = GoXLRSocket.instance.getIsToggleButtonActive("EffectHardTune")===true? "true" : "false"; break;
								case "reverb": value = GoXLRSocket.instance.getButtonState("reverb").toString(); break;
								case "pitch": value = GoXLRSocket.instance.getButtonState("pitch").toString(); break;
								case "echo": value = GoXLRSocket.instance.getButtonState("echo").toString(); break;
								case "gender": value = GoXLRSocket.instance.getButtonState("gender").toString(); break;
							}
						}else
						if(pointerLocal[0] == "fader") {
							switch(pointerLocal[1]) {
								case "a": value = GoXLRSocket.instance.getIsToggleButtonActive("Fader1Mute")===true? "true" : "false"; break;
								case "b": value = GoXLRSocket.instance.getIsToggleButtonActive("Fader2Mute")===true? "true" : "false"; break;
								case "c": value = GoXLRSocket.instance.getIsToggleButtonActive("Fader3Mute")===true? "true" : "false"; break;
								case "d": value = GoXLRSocket.instance.getIsToggleButtonActive("Fader4Mute")===true? "true" : "false"; break;
							}
						}

					/**
					 * If the placeholder requests for a counter's value
					 */
					}else if(pointer.indexOf("__counter__") == 0) {
						const counterPH = placeholder.tag.toLowerCase().replace(TriggerActionDataTypes.COUNTER_VALUE_PLACEHOLDER_PREFIX.toLowerCase(), "");
						const counter = StoreProxy.counters.counterList.find(v=>v.placeholderKey && v.placeholderKey.toLowerCase() === counterPH.toLowerCase());
						if(counter) {
							if(!isPremium && counter.enabled == false) {
								value = "NOT_PREMIUM"
							}else
							if(counter.perUser === true) {
								//If it's a per-user counter, get the user's value
								const user = this.extractUserFromTrigger(trigger, message);
								if(user && counter.users && counter.users[user.id]) {
									value = counter.users[user.id].toString();
								}else{
									value = "0";
								}
							}else{
								//Simple counter, just get its value
								value = counter.value.toString();
							}
						}

					/**
					 * If the placeholder requests for a value's value
					 */
					}else if(pointer.indexOf("__value__") == 0) {
						const valuePH = placeholder.tag.toLowerCase().replace(TriggerActionDataTypes.VALUE_PLACEHOLDER_PREFIX.toLowerCase(), "");
						const valueEntry = StoreProxy.values.valueList.find(v=>v.placeholderKey && v.placeholderKey.toLowerCase() === valuePH.toLowerCase());
						if(valueEntry) {
							if(!isPremium && valueEntry.enabled == false) {
								value = "NOT_PREMIUM"
							}else
							if(valueEntry.perUser === true) {
								//If it's a per-user counter, get the user's value
								const user = this.extractUserFromTrigger(trigger, message);
								if(user && valueEntry.users && valueEntry.users[user.id]) {
									value = valueEntry.users[user.id].toString();
								}else{
									value = "";
								}
							}else{
								value = valueEntry.value.toString();
							}
						}

					/**
					 * If the placeholder requests for currently playing music track
					 */
					}else if(pointer.indexOf("__current_track__") == 0 && SpotifyHelper.instance.currentTrack) {
						const pointerLocal = pointer.replace('__current_track__.', '') as TwitchatDataTypes.MusicTrackDataKeys | "spotify_is_playing" | "playlist.url" | "playlist.title" | "playlist.cover";
						switch(pointerLocal) {
							case "title": value = SpotifyHelper.instance.currentTrack.title; break;
							case "artist": value = SpotifyHelper.instance.currentTrack.artist; break;
							case "album": value = SpotifyHelper.instance.currentTrack.album; break;
							case "cover": value = SpotifyHelper.instance.currentTrack.cover; break;
							case "url": value = SpotifyHelper.instance.currentTrack.url; break;
							case "spotify_is_playing": value = SpotifyHelper.instance.isPlaying? "true" : "false"; break;
							case "playlist.title": value = SpotifyHelper.instance.currentPlaylist?.name || ""; break;
							case "playlist.url": value = SpotifyHelper.instance.currentPlaylist?.external_urls.spotify || ""; break;
							case "playlist.cover": value = SpotifyHelper.instance.currentPlaylist?.images[0].url || ""; break;
						}

					/**
					 * If the placeholder requests for date
					 */
					}else if(pointer.indexOf("__date__") == 0) {
						const pointerLocal = pointer.replace('__date__.', '');
						switch(pointerLocal) {
							case "now": value = Date.now().toString(); break;
						}

					/**
					 * If the placeholder requests for a twitch global data
					 */
					}else if(pointer.indexOf("__twitch__") == 0) {
						const pointerLocal = pointer.replace('__twitch__.', '');
						switch(pointerLocal) {
							case "lastsub_login": value = StoreProxy.auth.lastSubscriber[channelId].login; break;
							case "lastsub_id": value = StoreProxy.auth.lastSubscriber[channelId].id; break;
							case "lastsubgifter_login": value = StoreProxy.auth.lastSubgifter[channelId].user.login; break;
							case "lastsubgifter_id": value = StoreProxy.auth.lastSubgifter[channelId].user.id; break;
							case "totalsubs": value = (StoreProxy.auth.totalSubscribers[channelId] || 0).toString(); break;
							case "partnerpluspoints": value = (StoreProxy.auth.partnerPoints[channelId] || 0).toString(); break;
							case "lastfollow_login": value = StoreProxy.auth.lastFollower[channelId].login; break;
							case "lastfollow_id": value = StoreProxy.auth.lastFollower[channelId].id; break;
							case "totalfollowers": value = (StoreProxy.auth.totalFollowers[channelId] || 0).toString(); break;
							case "lastcheer_login": value = StoreProxy.auth.lastCheer[channelId].user.login; break;
							case "lastcheer_id": value = StoreProxy.auth.lastCheer[channelId].user.id; break;
							case "lastcheer_amount": value = (StoreProxy.auth.lastCheer[channelId].bits || 0).toString(); break;
						}
					}
				}else{
					const chunks:string[] = placeholder.pointer.split(".");
					let root = message as unknown;

					//Dynamic parsing of the pointer
					try {
						//Dynamically search for the requested prop's value within the object
						const rebuilt:string[] = [];
						chunks: for (let i = 0; i < chunks.length; i++) {
							rebuilt.push(chunks[i])
							root = (root as {[key:string]:unknown})[chunks[i]];
							if(Array.isArray(root) && i < chunks.length - 1) {
								root = (root as {[key:string]:string}[]).map(v=> v[chunks[i+2]]).join(", ");
								break chunks;
							}
						}

						//Spacial case for followage placeholders.
						//Dynamically request for follow date if necessary
						if(message.platform == "twitch" &&
						(placeholder.tag == TriggerActionDataTypes.USER_FOLLOWAGE
						|| placeholder.tag == TriggerActionDataTypes.USER_FOLLOWAGE_MS)) {
							let user = root as TwitchatDataTypes.TwitchatUser;
							let chanInfos = user.channelInfo[message.channel_id] as TwitchatDataTypes.UserChannelInfo;
							//Follow date not loaded yet for this user, asynchronously load it
							if(chanInfos.following_date_ms == 0)  {
								let res = await TwitchUtils.getFollowerState(user.id);
								if(res) {
									chanInfos.following_date_ms = new Date(res.followed_at).getTime();
								}else{
									chanInfos.following_date_ms = -1;
								}
							}

							if(placeholder.tag == TriggerActionDataTypes.USER_FOLLOWAGE) {
								value = chanInfos.following_date_ms == 0? "" : Utils.formatDate(new Date(chanInfos.following_date_ms), true);
							}
							if(placeholder.tag == TriggerActionDataTypes.USER_FOLLOWAGE_MS) {
								value = chanInfos.following_date_ms == 0? "0" : chanInfos.following_date_ms.toString();
							}
						}else{
							if(typeof root === "number") root = root.toString();
							value = root as string;
						}
					}catch(error) {
						console.warn("Unable to find pointer for helper", placeholder);
						value = "";
					}
				}

				// console.log("Pointer:", h.tag, "=>", h.pointer, "=> value:", value);

				//Remove command from final text
				if(cleanSubevent && typeof value == "string" && subEvent_regSafe
				&& (trigger.type == TriggerActionDataTypes.TriggerTypes.CHAT_COMMAND || trigger.type == TriggerActionDataTypes.TriggerTypes.SLASH_COMMAND)) {
					value = value.replace(new RegExp(subEvent_regSafe, "i"), "").trim();
				}

				if(typeof value == "string" && removeFolderNavigation) {
					value = value.replace(/(\.\.|\/|\\)/gi, "");//Avoid folders navigation
				}

				if(typeof value != "string") value = JSON.stringify(value);

				if(escapeDoubleQuotes) value = value.replace(/\"/g, "\\\"");

				res = res.replace(new RegExp("\\{"+placeholder.tag+"\\}", "gi"), value ?? "");
			}

			if(removeRemainingTags) {
				res = res.replace(/\{[^ }]+\}/g, "");
			}

			// console.log("RESULT = ",res);
			return removeHTMLtags? Utils.stripHTMLTags(res) : res;

		}catch(error) {
			console.error(error);
			return res;
		}
	}

	/**
	 * Extracts a user from a trigger message based on the available placeholders
	 */
	private extractUserFromTrigger(trigger:TriggerData, message:TwitchatDataTypes.ChatMessageTypes):TwitchatDataTypes.TwitchatUser|undefined {
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
	 * Converts a placeholder to a user by search a user from their display name
	 */
	private async extractUserFromPlaceholder(channel_id:string, placeholder:string, dynamicPlaceholders:{[key:string]:string|number}, actionPlaceholders:TriggerActionDataTypes.ITriggerPlaceholder<any>[], trigger:TriggerData, message:TwitchatDataTypes.ChatMessageTypes, log:Omit<LogTrigger, "date">):Promise<TwitchatDataTypes.TwitchatUser[]> {
		const displayName = await this.parsePlaceholders(dynamicPlaceholders, actionPlaceholders, trigger, message, "{"+placeholder.toUpperCase()+"}");

		//Not ideal but if there are multiple users they're concatenated in
		//a single coma seperated string (placeholder parsing is made for display :/).
		//Here we split it on comas just in case there are multiple user names
		const list = displayName.split(",");
		const result:TwitchatDataTypes.TwitchatUser[] = [];
		for (const displayName of list) {
			//Load user details
			const user = await new Promise<TwitchatDataTypes.TwitchatUser|undefined>((resolve, reject)=> {
				//FIXME that hardcoded platform "twitch" will break if adding a new platform
				//I can't just use "message.platform" as this contains "twitchat" for messages
				//like raffle and bingo results. Full user loading only happens if "twitch"
				//platform is specified, the user would remain in a temporary state otherwise
				//[EDIT] basic workaround applied bellow
				const platform = message.platform == "twitchat"? "twitch" : message.platform;
				StoreProxy.users.getUserFrom(platform, channel_id, undefined, undefined, displayName.trim(), (userData)=>{
					let user:TwitchatDataTypes.TwitchatUser|undefined;
					if(userData.errored || userData.temporary) {
						log.entries.push({date:Date.now(), type:"message", value:"❌ Custom user loading failed!"});
						user = undefined;
					}else{
						user = userData;
						log.entries.push({date:Date.now(), type:"message", value:"✔ Custom user loading complete: "+user.displayName+"(#"+user.id+")"});
					}
					resolve(user);
				});
			});
			if(user) result.push(user);
		}

		return result;
	}

	/**
	 * Check if any of our followings are live and notify on tchat
	 * if requested
	 */
	private async checkLiveFollowings(notify:boolean = true):Promise<boolean> {
		//User requested not to be alerted, stop there
		if(StoreProxy.params.features.liveAlerts.value !== true) return false;
		if(!TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWINGS])) return false;

		try {
			const channels = await TwitchUtils.getActiveFollowedStreams();
			const liveChannels:{[key:string]:TwitchatDataTypes.StreamInfo} = {};
			const channel_id:string = StoreProxy.auth.twitch.user.id;
			for (let i = 0; i < channels.length; i++) {
				const c = channels[i];
				liveChannels[c.user_id] = {
					user:StoreProxy.users.getUserFrom("twitch", channel_id, c.user_id, c.user_login, c.user_name),
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
				//than the message itself. This is necessary to properly handle filter change or message
				//deletion properly. If the message currently marked as read is removed from the list
				//the marker will automatically move the the nearest message date.
				//But if multiple messages have the exact same date, clicking one may mark another one
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
							channel_id,
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
							channel_id,
						}
						StoreProxy.chat.addMessage(message);
						dateOffset ++;
					}
				}
			}

			this.liveChannelCache = liveChannels;
		}catch(error) {}
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
	public async checkConditions(operator:"AND"|"OR", conditions:(TriggerActionDataTypes.TriggerConditionGroup|TriggerActionDataTypes.TriggerCondition)[], trigger:TriggerData, message:TwitchatDataTypes.ChatMessageTypes, log:Omit<LogTrigger, "date">, dynamicPlaceholders:{[key:string]:string|number}, subEvent?:string|null):Promise<boolean> {
		//If there are no conditions consider it passes check
		if(!conditions || !Array.isArray(conditions)) return true;

		let res = false;
		let index = 0;
		for (const c of conditions) {
			let localRes = false;
			if(c.type == "group") {
				localRes = await this.checkConditions(c.operator, c.conditions, trigger, message, log, dynamicPlaceholders, subEvent);
			}else{
				//Some user got corrupted data where those 3 values were missing
				//This is a fail-safe
				if(c.operator == undefined || c.value == undefined || c.placeholder == undefined) continue;
				const value = await this.parsePlaceholders(dynamicPlaceholders, [], trigger, message, "{"+c.placeholder+"}", subEvent);
				const expectation = await this.parsePlaceholders(dynamicPlaceholders, [], trigger, message, c.value.toString(), subEvent);
				let valueNum = null;
				try {
					const num = MathJS.evaluate(expectation);
					if(!isNaN(num)) valueNum = num;
				}catch(error) {
					valueNum = value;
				}
				switch(c.operator) {
					case "<": localRes = parseInt(value) < valueNum; break;
					case "<=": localRes = parseInt(value) <= valueNum; break;
					case ">": localRes = parseInt(value) > valueNum; break;
					case ">=": localRes = parseInt(value) >= valueNum; break;
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
				log.entries.push({date:Date.now(), type:"message", value:"Executing operator \""+c.operator+"\" between \""+value+"\" and \""+expectation+"\" => "+localRes.toString()});
			}

			if(index == 0) res = localRes;
			else if(operator == "AND") res &&= localRes;
			else if(operator == "OR") res ||= localRes;
			index ++
		}
		return res;
	}
}
