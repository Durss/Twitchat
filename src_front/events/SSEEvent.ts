import type { KofiEventData } from '@/store/kofi/storeKofi';
import { Event } from './EventDispatcher';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

/**
* Created : 21/06/2023 
*/
export default class SSEEvent<T extends keyof EventTypeMap> extends Event {

	public static ON_CONNECT = "ON_CONNECT" as const;
	public static KO_FI_EVENT = "KO_FI_EVENT" as const;
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
	AUTHENTICATION_FAILED: void;
	KO_FI_EVENT: KofiEventData;
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
			login:string;
			count:number;
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
}