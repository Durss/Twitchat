import { BingoData, RaffleData } from '@/store';
import { Event } from '@/utils/EventDispatcher';
import { AnonSubGiftUpgradeUserstate, AnonSubGiftUserstate, ChatUserstate, DeleteUserstate, MsgID, SubGiftUpgradeUserstate, SubGiftUserstate, SubMethods, SubUserstate } from 'tmi.js';
import { PubSubTypes } from './PubSub';
import { TwitchTypes } from './TwitchUtils';

/**
* Created : 07/12/2020 
*/
export default class IRCEvent extends Event {

	public static MESSAGE:string = "MESSAGE";
	public static UNFILTERED_MESSAGE:string = "UNFILTERED_MESSAGE";
	public static CONNECTED:string = "CONNECTED";
	public static DISCONNECTED:string = "DISCONNECTED";
	public static BADGES_LOADED:string = "BADGES_LOADED";
	public static TIMEOUT:string = "TIMEOUT";
	public static NOTICE:string = "NOTICE";
	public static HIGHLIGHT:string = "HIGHLIGHT";
	public static BAN:string = "BAN";
	public static CLEARCHAT:string = "CLEARCHAT";
	public static DELETE_MESSAGE:string = "DELETE_MESSAGE";
	public static AUTOMOD:string = "AUTOMOD";
	public static ROOMSTATE:string = "ROOMSTATE";
	public static WHISPER:string = "WHISPER";
	
	constructor(type:string, public data?:IRCEventData) {
		super(type);
	}
	
}

export type ActivityFeedData = IRCEventDataList.Highlight
							|  IRCEventDataList.PollResult
							|  IRCEventDataList.PredictionResult
							|  IRCEventDataList.BingoResult
							|  IRCEventDataList.RaffleResult
							|  IRCEventDataList.Message
							|  IRCEventDataList.Commercial
							;
export type IRCEventData = IRCEventDataList.Message
						|  IRCEventDataList.Timeout
						|  IRCEventDataList.Ban
						|  IRCEventDataList.MessageDeleted
						|  IRCEventDataList.Automod
						|  IRCEventDataList.Notice
						|  IRCEventDataList.Highlight
						|  IRCEventDataList.Hosted
						|  IRCEventDataList.RoomState
						|  IRCEventDataList.Whisper
						|  IRCEventDataList.PollResult
						|  IRCEventDataList.PredictionResult
						|  IRCEventDataList.BingoResult
						|  IRCEventDataList.RaffleResult
						|  IRCEventDataList.Commercial
						;
export namespace IRCEventDataList {
	export interface Message {
		channel:string;
		message:string;
		tags:ChatUserstate;
		self:boolean;
		//Custom injected props
		firstMessage:boolean;
		automod?:PubSubTypes.AutomodData;
		reward?:PubSubTypes.RewardData;
		answerTo?:Message;
		answers?:Message[];
		cyphered?:boolean;
		markedAsRead?:boolean;
		lowTrust?:boolean;
		deleted?:boolean;
		deletedData?:PubSubTypes.DeletedMessage;
		occurrenceCount?:number;
		highlightWord?:string;
		hasMention?:boolean;
		type:"message";
	}

	export interface Timeout {
		channel: string;
		username: string;
		reason: string;
		duration: number;
		//custom data
		type:"notice";
	}

	export interface Ban {
		channel: string;
		username: string;
		reason: string;
		//custom data
		type:"notice";
	}

	export interface MessageDeleted {
		channel: string;
		username: string;
		deletedMessage: string;
		tags: DeleteUserstate;
		//custom data
		type:"message";
	}

	export interface Automod {
		channel: string;
		message: string;
		msgID: 'msg_rejected' | 'msg_rejected_mandatory';
		type:"message";
	}

	export interface Notice {
		channel: string;
		message?: string;
		msgid: MsgID|string;
		tags:ChatUserstate;
		username?: string;
		//custom data
		type:"notice";
	}

	export interface Hosted {
		channel: string;
		viewers: number;
		autohost:boolean;
		username?: string;
		tags:ChatUserstate;
		message:string;
		msgid: MsgID;
		//custom data
		type:"notice";
	}

	export interface Highlight {
		channel: string;
		message?: string;
		tags:ChatUserstate | SubUserstate | SubGiftUserstate | SubGiftUpgradeUserstate | AnonSubGiftUpgradeUserstate | AnonSubGiftUserstate;
		months?:number;
		username?: string;
		sender?: string;
		recipient?: string;
		methods?: SubMethods;
		viewers?: number;
		"msg-id"?: MsgID;
		reward?: PubSubTypes.RewardData;
		//custom data
		firstMessage?:boolean;
		markedAsRead?:boolean;
		type:"highlight";
		subgiftAdditionalRecipents?:string[];
	}

	export interface TwitchatAd {
		channel: string;
		tags:{
			id:string
		};
		markedAsRead?:boolean;
		contentID:number;
		type:"ad";
		[paramater: string]: unknown;
	}

	export interface RoomState {
		type:"notice";
		raw: string;
		prefix: string;
		command: string;
		params: string[];
		tags: {
			"emote-only": boolean;
			"followers-only": string;
			r9k: boolean;
			rituals: boolean;
			"room-id": string;
			slow: boolean;
			"subs-only": boolean;
			channel: string;
		};
	}

	export interface Whisper {
		type:"whisper";
		raw: string;
		channel: string;
		command: string;
		params: string[];//Contains user message
		tags: ChatUserstate;
		//custom data
		firstMessage:boolean;
		markedAsRead:boolean;
		timestamp:number;
		isAnswer?:boolean;
		occurrenceCount?:number;
		highlightWord?:string;
	}

	export interface PollResult {
		type:"poll";
		data:TwitchTypes.Poll;
		tags: { id:string, "tmi-sent-ts":string };
		[paramater: string]: unknown;
	}
	
	export interface PredictionResult {
		type:"prediction";
		data:TwitchTypes.Prediction;
		tags: { id:string, "tmi-sent-ts":string };
		[paramater: string]: unknown;
	}

	export interface BingoResult {
		type:"bingo";
		data:BingoData;
		tags: { id:string, "tmi-sent-ts":string };
		[paramater: string]: unknown;
	}

	export interface RaffleResult {
		type:"raffle";
		data:RaffleData;
		tags: { id:string, "tmi-sent-ts":string };
		[paramater: string]: unknown;
	}

	export interface Commercial extends Notice {
		ended:boolean;
		tags: { id:string, "tmi-sent-ts":string, "msg-id":"commercial"; };
		[paramater: string]: unknown;
	}
}