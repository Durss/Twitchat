import type { ChatUserstate } from "tmi.js";

/**
 * These interfaces should be on TwitchatDataTypes.ts.
 * 
 * But to avoid circular imports i've exported them on a separate file.
 * Otherwise we would have a circular dependency between these files:
 * src\utils\IRCEventDataTypes.ts <===> src\types\TwitchDataTypes.ts
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
	command:string;
	duration:number;
	maxUsers:number;
	created_at:number;
	users:RaffleVote[];
	vipRatio:number;
	followRatio:number;
	subRatio:number;
	subgitRatio:number;
	winners:ChatUserstate[];
}

export interface RaffleVote {
	user:ChatUserstate;
	score:number;
}

export interface TrackedUser {
	user:ChatUserstate;
	messages:unknown[];//The proper  type should be IRCEventDataList.Message[]; but to avoid circular imports i've set it to unknown -_-
}
