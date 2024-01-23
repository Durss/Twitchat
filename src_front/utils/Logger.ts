import type { TriggerActionTypes, TriggerData } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { TwitchEventSubDataTypes } from "@/types/twitch/TwitchEventSubDataTypes";
import { reactive } from "vue";

/**
* Created : 30/11/2023 
*/
export default class Logger {

	private static _instance:Logger;

	private logs:{"ads":LogAds[], "obs":LogOBS[], "youtube":LogYoutube[], "triggers":LogTrigger[]} = reactive({
		"ads":[],
		"obs":[],
		"youtube":[],
		"triggers":[],
	});
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():Logger {
		if(!Logger._instance) {
			Logger._instance = new Logger();
			Logger._instance.initialize();
		}
		return Logger._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public log(type:"ads", data:Partial<LogAds>):void;
	public log(type:"obs", data:Partial<LogOBS>):void;
	public log(type:"youtube", data:Partial<LogYoutube>):void;
	public log(type:"triggers", data:Partial<LogTrigger>):void;
	public log(type:keyof typeof this.logs, data:Partial<LogAds|LogOBS|LogYoutube|LogTrigger>):void {
		data.date = Date.now();
		switch(type) {
			case "ads": {
				this.logs[type].push(data as LogAds);
				break;
			}
			case "obs": {
				this.logs[type].push(data as LogOBS);
				break;
			}
			case "youtube": {
				this.logs[type].push(data as LogYoutube);
				break;
			}
			case "triggers": {
				this.logs[type].push(data as LogTrigger);
				break;
			}
		}

		//Limit histories sizes
		for (const key in this.logs) {
			type keyType = keyof typeof this.logs;
			if(this.logs[key as keyType].length > 1000) this.logs[key as keyType].splice(1);
		}
	}

	public getLogs(type:"ads"):LogAds[];
	public getLogs(type:"obs"):LogOBS[];
	public getLogs(type:"youtube"):LogYoutube[];
	public getLogs(type:"triggers"):LogTrigger[];
	public getLogs(...args:any[]):any[] {
		const key = args[0] as keyof typeof this.logs;
		return this.logs[key];
	}

	public clear(type:"ads"):void;
	public clear(type:"obs"):void;
	public clear(type:"youtube"):void;
	public clear(type:"triggers"):void;
	public clear(...args:any[]):void{
		const key = args[0] as keyof typeof this.logs;
		this.logs[key].splice(0);
	}

	public download(type:"ads"):void;
	public download(type:"obs"):void;
	public download(type:"youtube"):void;
	public download(type:"triggers"):void;
	public download(...args:any[]):void{
		const key = args[0] as keyof typeof this.logs;
		
		const data = JSON.stringify(this.logs[key]);
		const blob = new Blob([data], { type: 'application/json' });
		const url = window.URL.createObjectURL(blob);
		window.open(url, "_blank");
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
	}
}

interface LogAds {
	date:number;
	log?:string;
	api?:TwitchDataTypes.AdSchedule;
	es?:TwitchEventSubDataTypes.AdBreakEvent;
	internal?:TwitchatDataTypes.CommercialData;
	body?:any;
}

interface LogYoutube {
	date:number;
	log?:string;
	credits?:number;
	liveID?:string;
	error?:unknown;
}

interface LogOBS {
	date:number;
	info:string;
	data?:any;
}

export interface LogTrigger {
	date:number;
	id:string;
	trigger:TriggerData;
	testMode:boolean;
	complete:boolean;
	skipped:boolean;
	error:boolean;
	criticalError:boolean;
	data:TwitchatDataTypes.ChatMessageTypes;
	entries:({date:number, type:"message", value:string}|LogTriggerStep)[];
}

export interface LogTriggerStep {
	type:"step",
	id:string;
	date:number;
	error:boolean;
	data:TriggerActionTypes;
	messages:{date:number, value:string}[];
}