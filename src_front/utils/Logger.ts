import type { TriggerActionTypes, TriggerData } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { TwitchEventSubDataTypes } from "@/types/twitch/TwitchEventSubDataTypes";

/**
* Created : 30/11/2023
*/
export default class Logger {

	private static _instance:Logger;

    private logs:LogsHistory = {
        "ads": [],
        "obs": [],
        "irc": [],
        "heat": [],
        "youtube": [],
        "triggers": [],
        "subgifts": [],
    };

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
	public log<T extends LogsKey>(type: T, data: LogData[T]): void {
		const fullData = data as LogData[T] & {date:number};
		fullData.date = Date.now();
		this.logs[type].push(fullData as any);//Dirty typing... I gave up...
		//Limit histories sizes
		for (const key in this.logs) {
			type keyType = keyof typeof this.logs;
			if(this.logs[key as keyType].length > 500) this.logs[key as keyType].splice(1);
		}
	}

	public getLogs(type:LogsKey):any[] {
		return this.logs[type];
	}

	public clear(type:LogsKey):void{
		this.logs[type].splice(0);
	}

	public download(type:LogsKey):void{
		const data = JSON.stringify(this.logs[type]);
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

type LogsHistory = {
	ads: LogAds[],
	obs: LogOBS[],
	irc: LogIRC[],
	heat: LogHeat[],
	youtube: LogYoutube[],
	triggers: LogTrigger[],
	subgifts: LogSubGifts[],
}

type LogsKey = keyof LogsHistory;

type LogData = {
	ads: Omit<LogAds, 'date'>,
	obs: Omit<LogOBS, 'date'>,
	irc: Omit<LogIRC, 'date'>,
	heat: Omit<LogHeat, 'date'>,
	youtube: Omit<LogYoutube, 'date'>,
	triggers: Omit<LogTrigger, 'date'>,
	subgifts: Omit<LogSubGifts, 'date'>,
};

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
	liveID?:string[];
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

export interface LogSubGifts {
	id:string;
	merged:boolean;
	reason?:string;
	data?:unknown;
}
