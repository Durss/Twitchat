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
