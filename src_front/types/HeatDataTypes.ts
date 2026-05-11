export interface HeatScreen {
	id: string;
	areas: HeatArea[];
	enabled: boolean;
	active?: boolean;
	activeOBSScene: string;
}

export interface HeatArea {
	id: string;
	showAreaOnExtension?: boolean;
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
