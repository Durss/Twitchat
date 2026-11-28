import type { TwitchatDataTypes } from "./TwitchatDataTypes";

export interface HeatScreen {
	id: string;
	areas: HeatArea[];
	enabled: boolean;
	title?: string;
	active?: boolean;
	activeOBSScene: string;
}

export interface HeatArea {
	id: string;
	/**
	 * Is area enabled?
	 */
	enabled?: boolean;
	/**
	 * Area title, shown on twitchat companion
	 */
	title?: string;
	/**
	 * Show this area on the extension?
	 * (only for twitchat companion)
	 */
	showAreaOnExtension?: boolean;
	/**
	 * Cooldown in seconds
	 * Areas will be disabled
	 */
	cooldown_s?: number;
	/**
	 * Users allowed to click this area.
	 * Area will be shown on extension only if they have the permissions
	 */
	permissions?: TwitchatDataTypes.PermissionsData;
	/**
	 * Areas points
	 */
	points: {
		/**
		 * X position in percent
		 */
		x: number;
		/**
		 * Y position in percent
		 */
		y: number;
	}[];
}
