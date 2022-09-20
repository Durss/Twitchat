import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { AnonSubGiftUpgradeUserstate, AnonSubGiftUserstate, ChatUserstate, MsgID, SubGiftUpgradeUserstate, SubGiftUserstate, SubMethods, SubUserstate } from "tmi.js";
import type { TwitchDataTypes } from "../types/TwitchDataTypes";
import type { BingoData, RaffleData, RaffleEntry } from "./CommonDataTypes";
import type { PubSubDataTypes } from "./PubSubDataTypes";

export type ChatMessageTypes = IRCEventDataList.Message|IRCEventDataList.Highlight|IRCEventDataList.TwitchatAd|IRCEventDataList.Whisper;

export type ActivityFeedData = IRCEventDataList.Highlight
	| IRCEventDataList.PollResult
	| IRCEventDataList.PredictionResult
	| IRCEventDataList.BingoResult
	| IRCEventDataList.RaffleResult
	| IRCEventDataList.Message
	| IRCEventDataList.Commercial
	| IRCEventDataList.CountdownResult
	| IRCEventDataList.Notice
	| IRCEventDataList.HypeTrainResult
	;
export type IRCEventData = IRCEventDataList.Message
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
	| IRCEventDataList.HypeTrainResult
	;
export namespace IRCEventDataList {
	export interface Message {
		type: "message";
		channel: string;
		message: string;
		tags: ChatUserstate;
		self: boolean;
		//Custom injected props
		firstMessage: boolean;
		automod?: PubSubDataTypes.AutomodData;
		ttAutomod?: TwitchatDataTypes.AutomodParamsKeywordFilterData;
		reward?: PubSubDataTypes.RewardData;
		answerTo?: Message;
		answers?: Message[];
		cyphered?: boolean;
		markedAsRead?:boolean;
		blockedUser?: boolean;
		lowTrust?: boolean;
		deleted?: boolean;
		deletedData?: PubSubDataTypes.DeletedMessage;
		occurrenceCount?: number;
		highlightWord?: string;
		hasMention?: boolean;
		sentLocally?: boolean;//True if message is sent from the current IRC clien
		msgID?: 'msg_rejected' | 'msg_rejected_mandatory';
	}

	export interface Highlight {
		channel: string;
		message?: string;
		tags: ChatUserstate | SubUserstate | SubGiftUserstate | SubGiftUpgradeUserstate | AnonSubGiftUpgradeUserstate | AnonSubGiftUserstate;
		months?: number;
		username?: string;
		sender?: string;
		recipient?: string;
		methods?: SubMethods;
		viewers?: number;
		"msg-id"?: MsgID;
		reward?: PubSubDataTypes.RewardData;
		contribution?: PubSubDataTypes.ChannelPointChallengeContribution;
		//custom data
		firstMessage?: boolean;
		markedAsRead?:boolean;
		blockedUser?: boolean;
		followBlocked?: boolean;
		type: "highlight";
		subgiftAdditionalRecipents?: string[];
		ttAutomod?: TwitchatDataTypes.AutomodParamsKeywordFilterData;
	}

	export interface TwitchatAd {
		channel: string;
		tags: {
			id: string
		};
		markedAsRead?:boolean;
		contentID: TwitchatDataTypes.TwitchatAdStringTypes;
		type: "ad";
		[parameter: string]: unknown;
	}

	export interface RoomState {
		type: "notice";
		raw: string;
		prefix: string;
		command: string;
		params: string[];
		msgid:"followers_on"|"followers_off"|"subs_on"|"subs_off"|"emote_only_on"|"emote_only_off"|"slow_on"|"slow_off"
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
		markedAsRead?:boolean;
	}

	export interface Whisper {
		type: "whisper";
		raw: string;
		channel: string;
		command: "WHISPER";
		params: string[];//Contains user message
		tags: ChatUserstate;
		//custom data
		firstMessage: boolean;
		markedAsRead?:boolean;
		timestamp: number;
		isAnswer?: boolean;
		occurrenceCount?: number;
		highlightWord?: string;
		blockedUser?: boolean;
		sentLocally?: boolean;
	}

	export interface PollResult {
		type: "poll";
		markedAsRead?:boolean;
		data: TwitchDataTypes.Poll;
		tags: { id: string, "tmi-sent-ts": string };
		winner?:string;
	}

	export interface PredictionResult {
		type: "prediction";
		markedAsRead?:boolean;
		data: TwitchDataTypes.Prediction;
		tags: { id: string, "tmi-sent-ts": string };
		winner?:string;
	}

	export interface BingoResult {
		type: "bingo";
		markedAsRead?:boolean;
		data: BingoData;
		tags:ChatUserstate;
		winner?:string;
	}

	export interface RaffleResult {
		type: "raffle";
		markedAsRead?:boolean;
		data: RaffleData;
		winner:RaffleEntry;
		tags:ChatUserstate;
	}

	export interface CountdownResult {
		type: "countdown";
		markedAsRead?:boolean;
		started:boolean;
		data: TwitchatDataTypes.CountdownData;
		tags: { id: string, "tmi-sent-ts": string };
		start?:string;
		start_ms?:number;
		duration?:string;
		duration_ms?:number;
	}

	export interface TimerResult {
		type: "timer";
		markedAsRead?:boolean;
		started:boolean;
		data: TwitchatDataTypes.TimerData;
		duration?:string;
		duration_ms?:number;
	}

	export interface HypeTrainResult {
		type: "hype_train_end";
		tags: { id: string, "tmi-sent-ts": string };
		markedAsRead?: boolean;
		train: TwitchatDataTypes.HypeTrainStateData;
		activities: ActivityFeedData[];
	}

	export interface JoinLeaveList {
		type: "leave"|"join";
		users:string[];
		channel:string;
	}

	export interface Notice {
		type: "notice";
		markedAsRead?:boolean;
		channel: string;
		message?: string;
		msgid: MsgID | string;
		tags: ChatUserstate;
		username?: string;
	}

	export interface Hosted extends Notice {
		msgid: "usage_host";
		viewers: number;
		autohost: boolean;
	}

	export interface Timeout extends Notice {
		msgid: "timeout_success";
		reason: string;
		duration: number;
	}

	export interface Ban extends Notice {
		msgid: "ban_success";
		reason: string;
	}

	export interface Join extends Notice {
		msgid:"online";
	}

	export interface Leave extends Notice {
		msgid:"offline";
	}
	export interface Emergency extends Notice {
		msgid:"emergencyMode";
		enabled:boolean;
	}

	export interface Commercial extends Notice {
		msgid: "commercial";
		ended: boolean;
	}
}

//The following should be on TwitchatDataTypes.ts but as it's using a ref to
//ActivityFeedData from here, and this class is using a reference to TwitchatDataTypes,
//if these types were on TwitchatDataTypes.ts we would get a circular dependency issue.
//The only way to fix these circular import issues would be to have ALL types declared
//on one single file. But i'd rather not do that.
export const TwitchatMessageType = {
	BAN:"ban",
	SUB:"sub",
	BITS:"bits",
	RAID:"raid",
	POLL:"poll",
	HOST:"host",
	JOIN:"join",
	LEAVE:"leave",
	BINGO:"bingo",
	RAFFLE:"raffle",
	NOTICE:"notice",
	REWARD:"reward",
	FOLLOW:"follow",
	MESSAGE:"message",
	WHISPER:"whisper",
	SUBGIFT:"subgift",
	TIMEOUT:"timeout",
	SUB_PRIME:"prime",
	COUNTDOWN:"countdown",
	COMMERCIAL:"commercial",
	ROOM_STATE:"roomState",
	PREDICTION:"prediction",
	AUTOBAN_JOIN:"autoban_join",
	HYPE_TRAIN_END:"hype_train_end",
	SUBGIFT_UPGRADE:"subgiftUpgrade",
	CHALLENGE_CONTRIBUTION:"challengeContribution",
	HYPE_TRAIN_COOLDOWN_EXPIRED:"hype_cooldown_expired",
	COMMUNITY_BOOST_COMPLETE:"community_boost_complete",
} as const;

//Dynamically type TwitchatMessageStringType from TwitchatMessageType values
type TwitchatMessageStringType = typeof TwitchatMessageType[keyof typeof TwitchatMessageType]|null;
export function getTwitchatMessageType(m: IRCEventData):TwitchatMessageStringType {
	let type:TwitchatMessageStringType = null;
	if(m.type == "poll") {
		type = TwitchatMessageType.POLL;
	}else if(m.type == "message") {
		type = TwitchatMessageType.MESSAGE;
	}else if(m.type == "whisper") {
		type = TwitchatMessageType.WHISPER;
	}else if(m.type == "prediction") {
		type = TwitchatMessageType.PREDICTION;
	}else if(m.type == "bingo") {
		type = TwitchatMessageType.BINGO;
	}else if(m.type == "raffle") {
		type = TwitchatMessageType.RAFFLE;
	}else if(m.type == "countdown") {
		type = TwitchatMessageType.COUNTDOWN;
	}else if(m.type == "hype_train_end") {
		type = TwitchatMessageType.HYPE_TRAIN_END;
	}else if(m.type == "notice") {
		if(m.msgid == "timeout_success") {
			type = TwitchatMessageType.TIMEOUT;
		}else
		if(m.msgid == "ban_success") {
			type = TwitchatMessageType.BAN;
		}else
		if(m.msgid == "commercial") {
			type = TwitchatMessageType.COMMERCIAL;
		}else
		if(m.msgid == "online") {
			type = TwitchatMessageType.JOIN;
		}else
		if(m.msgid == "offline") {
			type = TwitchatMessageType.LEAVE;
		}else
		if(m.msgid == "usage_host") {
			type = TwitchatMessageType.HOST;
		}else
		if(["followers_on","followers_off","subs_on","subs_off","emote_only_on","emote_only_off","slow_on","slow_off"]
		.indexOf((m as IRCEventDataList.RoomState).msgid) > -1) {
			type = TwitchatMessageType.ROOM_STATE;
		}else{
			type = TwitchatMessageType.NOTICE;
		}
	}else if(m.tags.bits) {
		type = TwitchatMessageType.BITS;
	}else if(m.type == "highlight") {
		if(m.recipient) {
			type = TwitchatMessageType.SUBGIFT;
		}else if(m.methods?.prime) {
			type = TwitchatMessageType.SUB_PRIME;
		}else if(m.methods?.plan) {
			type = TwitchatMessageType.SUB;
		}else if(m.tags['message-type'] == "giftpaidupgrade") {
			type = TwitchatMessageType.SUBGIFT_UPGRADE;
		}else if(m.contribution) {
			type = TwitchatMessageType.CHALLENGE_CONTRIBUTION;
		}else if(m.reward) {
			type = TwitchatMessageType.REWARD;
		}else if(m.tags['msg-id'] == "follow") {
			type = TwitchatMessageType.FOLLOW;
		}else if(m.tags['msg-id'] == "raid") {
			type = TwitchatMessageType.RAID;
		}else if(m.tags['msg-id'] == "hype_cooldown_expired") {
			type = TwitchatMessageType.HYPE_TRAIN_COOLDOWN_EXPIRED;
		}else if(m.tags['msg-id'] == "community_boost_complete") {
			type = TwitchatMessageType.COMMUNITY_BOOST_COMPLETE;
		}else if(m.tags['msg-id'] == "autoban_join") {
			type = TwitchatMessageType.AUTOBAN_JOIN;
		}
	}
	return type;
}