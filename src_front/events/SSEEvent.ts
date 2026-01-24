import type { KofiEventData } from '@/store/kofi/storeKofi';
import type { TiltifyCauseEventData, TiltifyDonationEventData } from '@/store/tiltify/storeTiltify';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Event } from './EventDispatcher';

/**
* Created : 21/06/2023
*/
export default class SSEEvent<T extends keyof EventTypeMap> extends Event {

	public static ON_CONNECT = "ON_CONNECT" as const;
	public static FAILED_CONNECT = "FAILED_CONNECT" as const;
	public static KO_FI_EVENT = "KO_FI_EVENT" as const;
	public static KO_FI_DELETE_WEBHOOK = "KO_FI_DELETE_WEBHOOK" as const;
	public static KO_FI_FAILED_WEBHOOK = "KO_FI_FAILED_WEBHOOK" as const;
	public static TILTIFY_EVENT = "TILTIFY_EVENT" as const;
	public static NOTIFICATION = "NOTIFICATION" as const;
	public static BINGO_GRID_UPDATE = "BINGO_GRID_UPDATE" as const;
	public static BINGO_GRID_BINGO_COUNT = "BINGO_GRID_BINGO_COUNT" as const;
	public static BINGO_GRID_CELL_STATES = "BINGO_GRID_CELL_STATES" as const;
	public static TRIGGER_SLASH_COMMAND = "TRIGGER_SLASH_COMMAND" as const;
	public static AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED" as const;
	public static BINGO_GRID_UNTICK_ALL = "BINGO_GRID_UNTICK_ALL" as const;
	public static BINGO_GRID_MODERATOR_TICK = "BINGO_GRID_MODERATOR_TICK" as const;
	public static SHARED_MOD_INFO_REQUEST = "SHARED_MOD_INFO_REQUEST" as const;
	public static QNA_STATE = "QNA_STATE" as const;
	public static QNA_ACTION = "QNA_ACTION" as const;
	public static LABELS_UPDATE = "LABELS_UPDATE" as const;
	public static SPOIL_MESSAGE = "SPOIL_MESSAGE" as const;
	public static PATREON_MEMBER_CREATE = "PATREON_MEMBER_CREATE" as const;
	public static PRIVATE_MOD_MESSAGE = "PRIVATE_MOD_MESSAGE" as const;
	public static PRIVATE_MOD_MESSAGE_ANSWER = "PRIVATE_MOD_MESSAGE_ANSWER" as const;
	public static SERVER_UPDATE = "SERVER_UPDATE" as const;
	public static TWITCHEXT_CLICK = "TWITCHEXT_CLICK" as const;
	public static TWITCHEXT_QUIZ_ANSWER = "TWITCHEXT_QUIZ_ANSWER" as const;

	constructor(eventType:T, public data?:EventTypeMap[T]) {
		super(eventType);
	}

	/********************
	* GETTER / SETTERS *
	********************/



	/******************
	* PUBLIC METHODS *
	******************/



	/*******************
	* PRIVATE METHODS *
	*******************/
}

export type EventTypeMap = {
	ON_CONNECT: void;
	FAILED_CONNECT: void;
	AUTHENTICATION_FAILED: void;
	LABELS_UPDATE: void;
	KO_FI_EVENT: KofiEventData;
	KO_FI_DELETE_WEBHOOK: string;
	KO_FI_FAILED_WEBHOOK: string;
	TILTIFY_EVENT: TiltifyDonationEventData | TiltifyCauseEventData;
	NOTIFICATION: {
			messageId:string;
			col:number[];
			message:string;
			quote:string;
			highlightColor:string;
			style:TwitchatDataTypes.MessageCustomData["style"];
			username:string;
			actions:TwitchatDataTypes.MessageCustomData["actions"];
		};
	BINGO_GRID_UPDATE:{
		force:true;
	} | {
		force:false;
		grid:{
			enabled:boolean;
			title:string;
			cols:number;
			rows:number;
			entries:TwitchatDataTypes.BingoGridConfig["entries"];
			additionalEntries?:TwitchatDataTypes.BingoGridConfig["entries"];
		};
	};
	BINGO_GRID_BINGO_COUNT: {
			gridId:string;
			uid:string;
			count:number;
			login?:string;
		};
	BINGO_GRID_CELL_STATES: {
			gridId:string;
			states:{[cellId:string]:boolean};
		}
	TRIGGER_SLASH_COMMAND: {
			command:"link" | "say" | "ask";
			params: {
				name:string;
				value:string;
			}[];
		};
	BINGO_GRID_UNTICK_ALL: void;
	BINGO_GRID_MODERATOR_TICK: {
			gridId:string;
			uid:string;
			states:{[cellid:string]:boolean};
		};
	SHARED_MOD_INFO_REQUEST: void;
	QNA_STATE: {
		sessions:TwitchatDataTypes.QnaSession[];
	};
	QNA_ACTION: IQnaAddMessageAction
			| IQnaDelMessageAction
			| IQnaCloseAction
			| IQnaDeleteAction
			| IQnaHighlightMessageAction;
	SPOIL_MESSAGE: {
		messageId:string;
		moderatorId:string;
	};
	PATREON_MEMBER_CREATE: {
		uid:string;
		user: {
			username: string;
			avatar: string;
			url: string;
		},
		tier: {
			amount: number;
			title: string;
			description: string;
		}
	};
	PRIVATE_MOD_MESSAGE: {
		from_uid:string;
		from_login:string;
		message:TwitchatDataTypes.ParseMessageChunk[];
		action:TwitchatDataTypes.MessagePrivateModeratorData["action"];
		messageId:string;
		messageIdParent:string;
		messageParentFallback?: TwitchatDataTypes.MessagePrivateModeratorData["parentMessageFallback"];
	};
	PRIVATE_MOD_MESSAGE_ANSWER: {
		messageId:string;
		answer:boolean;
	};
	SERVER_UPDATE: {
		delay:number;
	};
	TWITCHEXT_CLICK: {
		px: number;
		py: number;
		alt: boolean;
		ctrl: boolean;
		shift: boolean;
		user_id?: string;
	};
	TWITCHEXT_QUIZ_ANSWER: {
		questionId: string;
		answerId: string;
		user_id?: string;
	};
}

interface AbstractQnaAciton {
	moderatorId:string;
}

interface IQnaAddMessageAction extends AbstractQnaAciton {
	action:"add_message";
	message:TwitchatDataTypes.QnaSession["messages"][number];
	sessionId:string;
}

interface IQnaHighlightMessageAction extends AbstractQnaAciton {
	action:"highlight_message";
	messageId:string;
	sessionId:string;
}

interface IQnaDelMessageAction extends AbstractQnaAciton {
	action:"del_message";
	messageId:string;
	sessionId:string;
}
interface IQnaCloseAction extends AbstractQnaAciton {
	action:"close_session";
	sessionId:string;
}
interface IQnaDeleteAction extends AbstractQnaAciton {
	action:"delete_session";
	sessionId:string;
}
