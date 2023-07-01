export interface HeatScreen {
	id:string;
	zones:HeatArea[];
}

export interface HeatArea {
	id:string;
	points:{
		x:number;
		y:number;
	}
}