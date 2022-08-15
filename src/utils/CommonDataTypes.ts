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

export interface BingoData {
	guessNumber:boolean;
	guessEmote:boolean;
	numberValue:number;
	emoteValue: {
		id: string;
		name: string;
		images: {
			url_1x: string;
			url_2x: string;
			url_4x: string;
		};
		emote_type: string;
		emote_set_id: string;
		owner_id: string;
		format: "static" | "animated";
		scale: "1.0" | "2.0" | "3.0";
		theme_mode: "light" | "dark";
	};
	winners:ChatUserstate[];
}

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
	winners:RaffleEntry[];
	subMode_includeGifters:boolean;
	subMode_excludeGifted:boolean;
	showCountdownOverlay:boolean;
	customEntries:string;
}

export interface WheelItem {
	id:string;
	label:string;
}

export interface RaffleEntry extends WheelItem {
	score:number;
}

export interface TrackedUser {
	user:ChatUserstate;
	messages:unknown[];//The proper type should be IRCEventDataList.Message[]; but to avoid circular imports i've set it to unknown -_-
}
