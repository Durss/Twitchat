export interface HeatScreen {
	id:string;
	areas:HeatArea[];
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