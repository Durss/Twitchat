import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { ChatUserstate } from "tmi.js";

/**
 * These interfaces should be on TwitchatDataTypes.ts.
 * 
 * But to avoid circular imports i've exported them on a separate file.
 * Otherwise we would have a circular dependency between these files:
 * src\utils\IRCEventDataTypes.ts <===> src\types\TwitchDataTypes.ts
 * 
 * The only way to solve these circular import on types would be to have
 * all the types on one single file. But that would be a mess, i'm
 * trying to avoid that...
 */


export interface RaffleData {
	mode:"chat"|"sub"|"manual";
	command:string;
	duration:number;
	maxEntries:number;
	created_at:number;
	entries:RaffleEntry[];
	vipRatio:number;
	followRatio:number;
	subRatio:number;
	subgitRatio:number;
	subMode_includeGifters:boolean;
	subMode_excludeGifted:boolean;
	showCountdownOverlay:boolean;
	customEntries:string;
	winners?:RaffleEntry[];
}

export interface WheelItem {
	id:string;
	label:string;
}

export interface RaffleEntry extends WheelItem {
	score:number;
}
