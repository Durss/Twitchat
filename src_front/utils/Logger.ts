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

    private logs: {
        "ads": LogAds[],
        "obs": LogOBS[],
        "irc": LogIRC[],
        "heat": LogHeat[],
        "youtube": LogYoutube[],
        "triggers": LogTrigger[]
    } = reactive({
        "ads": [],
        "obs": [],
        "irc": [],
        "heat": [],
        "youtube": [],
        "triggers": [],
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
	public log(type:"ads", data:Omit<LogAds, 'date'>):void;
	public log(type:"obs", data:Omit<LogOBS, 'date'>):void;
	public log(type:"irc", data:Omit<LogIRC, 'date'>):void;
	public log(type:"heat", data:Omit<LogHeat, 'date'>):void;
	public log(type:"youtube", data:Omit<LogYoutube, 'date'>):void;
	public log(type:"triggers", data:Omit<LogTrigger, 'date'>):void;
	public log(type:keyof typeof this.logs, data:Partial<LogAds|LogOBS|LogIRC|LogHeat|LogYoutube|LogTrigger>):void {
		data.date = Date.now();
		switch(type) {
			case "ads": {
				this.logs[type].push(data as LogAds);
				break;
			}
			case "irc": {
				this.logs[type].push(data as LogIRC);
				break;
			}
			case "obs": {
				this.logs[type].push(data as LogOBS);
				break;
			}
			case "heat": {
				this.logs[type].push(data as LogHeat);
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
	public getLogs(type:"irc"):LogIRC[];
	public getLogs(type:"heat"):LogHeat[];
	public getLogs(type:"youtube"):LogYoutube[];
	public getLogs(type:"triggers"):LogTrigger[];
	public getLogs(...args:any[]):any[] {
		const key = args[0] as keyof typeof this.logs;
		return this.logs[key];
	}

	public clear(type:"ads"):void;
	public clear(type:"obs"):void;
	public clear(type:"irc"):void;
	public clear(type:"heat"):void;
	public clear(type:"youtube"):void;
	public clear(type:"triggers"):void;
	public clear(...args:any[]):void{
		const key = args[0] as keyof typeof this.logs;
		this.logs[key].splice(0);
	}

	public download(type:"ads"):void;
	public download(type:"obs"):void;
	public download(type:"irc"):void;
	public download(type:"heat"):void;
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

interface AbstractLog {
	date:number;
}

interface LogAds extends AbstractLog {
	log?:string;
	api?:TwitchDataTypes.AdSchedule;
	es?:TwitchEventSubDataTypes.AdBreakEvent;
	internal?:TwitchatDataTypes.CommercialData;
	body?:any;
}

interface LogYoutube extends AbstractLog {
	log?:string;
	credits?:number;
	liveID?:string;
	error?:unknown;
}

interface LogOBS extends AbstractLog {
	info:string;
	data?:any;
}

interface LogIRC extends AbstractLog {
	info:string;
	data?:any;
}

export interface LogHeat extends AbstractLog {
	id:string;
	info:string;
	x:number;
	y:number;
	alt:boolean;
	ctrl:boolean;
	shift:boolean;
	anonymous:boolean;
	testMode:boolean;
	targets:{
		obsSource?:string;
		spotify?:boolean;
		ulule?:boolean;
		distortiontID?:string;
		customAreaID?:string;
		x:number;
		y:number;
	}[];
	user?:Pick<TwitchatDataTypes.TwitchatUser, "id" | "login" | "channelInfo" | "anonymous">;
}

export interface LogTrigger extends AbstractLog {
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