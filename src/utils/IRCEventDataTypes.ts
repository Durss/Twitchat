import type { AnonSubGiftUpgradeUserstate, AnonSubGiftUserstate, ChatUserstate, DeleteUserstate, MsgID, SubGiftUpgradeUserstate, SubGiftUserstate, SubMethods, SubUserstate } from "tmi.js";
import type { PubSubDataTypes } from "./PubSubDataTypes";
import type { TwitchDataTypes } from "../types/TwitchDataTypes";
import type { BingoData, RaffleData } from "./CommonDataTypes";
import type { CountdownData, TimerData } from "@/types/TwitchatDataTypes";

export type ActivityFeedData = IRCEventDataList.Highlight
	| IRCEventDataList.PollResult
	| IRCEventDataList.PredictionResult
	| IRCEventDataList.BingoResult
	| IRCEventDataList.RaffleResult
	| IRCEventDataList.Message
	| IRCEventDataList.Commercial
	| IRCEventDataList.CountdownResult
	;
export type IRCEventData = IRCEventDataList.Message
	| IRCEventDataList.Timeout
	| IRCEventDataList.Ban
	| IRCEventDataList.MessageDeleted
	| IRCEventDataList.Automod
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
	| IRCEventDataList.JoinList
	;
export namespace IRCEventDataList {
	export interface Message {
		channel: string;
		message: string;
		tags: ChatUserstate;
		self: boolean;
		//Custom injected props
		firstMessage: boolean;
		automod?: PubSubDataTypes.AutomodData;
		reward?: PubSubDataTypes.RewardData;
		answerTo?: Message;
		answers?: Message[];
		cyphered?: boolean;
		markedAsRead?: boolean;
		lowTrust?: boolean;
		deleted?: boolean;
		deletedData?: PubSubDataTypes.DeletedMessage;
		occurrenceCount?: number;
		highlightWord?: string;
		hasMention?: boolean;
		type: "message";
	}

	export interface Timeout {
		channel: string;
		username: string;
		reason: string;
		duration: number;
		//custom data
		type: "notice";
	}

	export interface Ban {
		channel: string;
		username: string;
		reason: string;
		//custom data
		type: "notice";
	}

	export interface MessageDeleted {
		channel: string;
		username: string;
		deletedMessage: string;
		tags: DeleteUserstate;
		//custom data
		type: "message";
	}

	export interface Automod {
		channel: string;
		message: string;
		msgID: 'msg_rejected' | 'msg_rejected_mandatory';
		type: "message";
	}

	export interface Notice {
		channel: string;
		message?: string;
		msgid: MsgID | string;
		tags: ChatUserstate;
		username?: string;
		//custom data
		type: "notice";
	}

	export interface Hosted {
		channel: string;
		viewers: number;
		autohost: boolean;
		username?: string;
		tags: ChatUserstate;
		message: string;
		msgid: MsgID;
		//custom data
		type: "notice";
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
		//custom data
		firstMessage?: boolean;
		markedAsRead?: boolean;
		type: "highlight";
		subgiftAdditionalRecipents?: string[];
	}

	export interface TwitchatAd {
		channel: string;
		tags: {
			id: string
		};
		markedAsRead?: boolean;
		contentID: number;
		type: "ad";
		[paramater: string]: unknown;
	}

	export interface RoomState {
		type: "notice";
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
		type: "whisper";
		raw: string;
		channel: string;
		command: string;
		params: string[];//Contains user message
		tags: ChatUserstate;
		//custom data
		firstMessage: boolean;
		markedAsRead: boolean;
		timestamp: number;
		isAnswer?: boolean;
		occurrenceCount?: number;
		highlightWord?: string;
	}

	export interface PollResult {
		type: "poll";
		data: TwitchDataTypes.Poll;
		tags: { id: string, "tmi-sent-ts": string };
		[paramater: string]: unknown;
	}

	export interface PredictionResult {
		type: "prediction";
		data: TwitchDataTypes.Prediction;
		tags: { id: string, "tmi-sent-ts": string };
		[paramater: string]: unknown;
	}

	export interface BingoResult {
		type: "bingo";
		data: BingoData;
		tags: { id: string, "tmi-sent-ts": string };
		[paramater: string]: unknown;
	}

	export interface RaffleResult {
		type: "raffle";
		data: RaffleData;
		tags: { id: string, "tmi-sent-ts": string };
		[paramater: string]: unknown;
	}

	export interface CountdownResult {
		type: "countdown";
		started:boolean;
		data: CountdownData;
		tags: { id: string, "tmi-sent-ts": string };
		[paramater: string]: unknown;
	}

	export interface JoinList {
		type: "join";
		users:string[];
		[paramater: string]: unknown;
	}

	export interface TimerResult {
		type: "timer";
		started:boolean;
		data: TimerData;
		[paramater: string]: unknown;
	}

	export interface Commercial extends Notice {
		ended: boolean;
		tags: { id: string, "tmi-sent-ts": string, "msg-id": "commercial"; };
		[paramater: string]: unknown;
	}
}