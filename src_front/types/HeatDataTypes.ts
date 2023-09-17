export interface HeatScreen {
	id:string;
	areas:HeatArea[];
	enabled:boolean;
	activeOBSScene:string;
}

export interface HeatArea {
	id:string;
	points:{
		/**
		 * X position in percent
		 */
		x:number;
		/**
		 * Y position in percent
		 */
		y:number;
	}[];
}