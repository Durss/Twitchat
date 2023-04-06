import DataStore from "@/store/DataStore";
import StoreProxy from "@/store/StoreProxy";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { TriggerScheduleTypes, TriggerTypes, type TriggerData, type TriggerScheduleData } from "../types/TriggerActionDataTypes";
import Config from "./Config";
import TriggerActionHandler from "./triggers/TriggerActionHandler";
import Utils from "./Utils";

/**
* Created : 02/09/2022 
*/
export default class SchedulerHelper {

	private static _instance:SchedulerHelper;
	private _started:boolean = false;
	private _pendingSchedules:{messageCount:number, date:number, trigger:TriggerData}[] = [];
	private _prevExecute_ts:number = 0;
	private _adScheduleTimeout?:number;
	private _adSchedule!:TriggerData;
	private _liveChannelsSchedule!:TriggerData;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():SchedulerHelper {
		if(!SchedulerHelper._instance) {
			SchedulerHelper._instance = new SchedulerHelper();
			SchedulerHelper._instance.initialize();
		}
		return SchedulerHelper._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Starts the scheduler
	 */
	public start():void {
		if(this._started) return;
		
		this._started = true;
		const triggers:TriggerData[] = StoreProxy.triggers.triggerList;
		//Schedule all schedule triggers
		for (let i = 0; i < triggers.length; i++) {
			const t = triggers[i];
			if(t.type == TriggerTypes.SCHEDULE) {
				this.scheduleTrigger(t);
			}
		}
	}

	/**
	 * Called when a messages is sent on tchat (not from twitchat)
	 */
	public incrementMessageCount():void {
		for (let i = 0; i < this._pendingSchedules.length; i++) {
			this._pendingSchedules[i].messageCount++;
		}
	}

	/**
	 * Unschedule the requested trigger byt its key
	 * @param key 
	 * @returns 
	 */
	public unscheduleTrigger(trigger:TriggerData):void {
		const existingIndex = this._pendingSchedules.findIndex(v=>v.trigger.id == trigger.id);
		if(existingIndex > -1) {
			this._pendingSchedules.splice(existingIndex, 1);
		}
	}

	/**
	 * Schedules a trigger and reset its scheduling if already scheduled
	 * @param key 
	 * @param trigger 
	 * @returns 
	 */
	public scheduleTrigger(trigger:TriggerData):void {
		if(!trigger || !trigger.scheduleParams) return;

		//Cleanup any previously scheduled trigger
		this.unscheduleTrigger(trigger);

		switch(trigger.scheduleParams.type) {
			case TriggerScheduleTypes.REGULAR_REPEAT:{
				let date = Date.now() + trigger.scheduleParams.repeatDuration * 60 * 1000;
				if(trigger.type === TriggerTypes.TWITCHAT_AD) {
					//Check if a date is stored on store and load it back.
					//This avoids the possibility to have no ad by refreshing
					//the page before the timer ends.
					const sDate = parseInt(DataStore.get(DataStore.TWITCHAT_AD_NEXT_DATE));
					if(!isNaN(sDate)) {
						date = Math.max(60000, Math.min(date, sDate));
						DataStore.set(DataStore.TWITCHAT_AD_NEXT_DATE, date);
					}
				}
				this._pendingSchedules.push({
					messageCount:0,
					date,
					trigger,
				});
				break;
			}

			case TriggerScheduleTypes.SPECIFIC_DATES:{
				for (let i = 0; i < trigger.scheduleParams.dates.length; i++) {
					const d = trigger.scheduleParams.dates[i];
					const date = new Date(d.value);
					if(d.daily===true || d.monthly===true || d.yearly===true) date.setDate(new Date().getDate());
					if(d.monthly===true || d.yearly===true) date.setMonth(new Date().getMonth());
					if(d.yearly===true) date.setFullYear(new Date().getFullYear());
					//Check if the date has past, in which case we stop there or
					//schedule for the next day in case of a daily event. No need
					//to do this for monthly and yearly, there's low chance a stream
					//lasts this long
					if(Date.now() > date.getTime()) {
						if(d.daily) {
							//Schedule for next day if it's a daily event
							date.setDate(new Date().getDate()+1);
						}else {
							//ignore it, low chance a stream lasts 1 moth or 1 year
							continue;
						}
					}
					this._pendingSchedules.push({
						messageCount:0,
						date:date.getTime(),
						trigger,
					})
				}
				break;
			}
		}
	}

	/**
	 * Resets the ad schedule
	 */
	public resetAdSchedule(message:TwitchatDataTypes.MessageChatData):void {
		for (let i = 0; i < this._pendingSchedules.length; i++) {
			const e = this._pendingSchedules[i];
			//Search for the ad schedule
			if(e.trigger.type == TriggerTypes.TWITCHAT_AD) {
				const nextDate = e.date;
				// console.log("ASK RESET", new Date(nextDate));
				
				//Wait 5min max and check if the message at the origin of the reset
				//has been deleted or not.
				//If the message has been deleted, ignore the schedule reset.
				//This makes sure the ad message is visible for at least 5min
				const timeFrame = 5*60*1000;
				const waitFor = Math.min(timeFrame, Math.max(0, nextDate - Date.now() - timeFrame));
				clearTimeout(this._adScheduleTimeout);
				this._adScheduleTimeout = setTimeout(()=> {
					// console.log("Do reset. Deleted?"+message.deleted, "date:"+(Date.now() + this._adSchedule!.repeatDuration! * 60 * 1000 - waitFor) );
					if(message.deleted === true) return;
					e.date = Date.now() + this._adSchedule.scheduleParams!.repeatDuration! * 60 * 1000 - waitFor;
					e.messageCount = 0;
					DataStore.set(DataStore.TWITCHAT_AD_NEXT_DATE, e.date);
				}, waitFor);
				// console.log("Wait for", Math.max(0,nextDate - Date.now() - 5*60*1000));
			}
		}
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		this.computeFrame();
		
		this._adSchedule = {
			type:TriggerTypes.SCHEDULE,
			enabled:true,
			id:Utils.getUUID(),
			actions: [],
			scheduleParams:{
				type:TriggerScheduleTypes.REGULAR_REPEAT,
				// repeatDuration:10,
				// repeatMinMessages:0,
				repeatDuration:120,
				repeatMinMessages:100,
				dates:[],
			}
		}
		
		this._liveChannelsSchedule = {
			type:TriggerTypes.SCHEDULE,
			enabled:true,
			id:Utils.getUUID(),
			actions: [],
			scheduleParams:{
				type:TriggerScheduleTypes.REGULAR_REPEAT,
				repeatDuration:5,
				repeatMinMessages:0,
				dates:[],
			}
		};

		//Just a fail safe to avoid deploying fucked up data on production !
		if(this._adSchedule.scheduleParams!.repeatDuration < 120) {
			StoreProxy.main.alert("Ad schedule duration set to "+this._adSchedule.scheduleParams!.repeatDuration+" minutes instead of 120!");
		}else
		if(this._adSchedule.scheduleParams!.repeatMinMessages < 100) {
			StoreProxy.main.alert("Ad schedule min message count set to "+this._adSchedule.scheduleParams!.repeatMinMessages+" instead of 100!");
		}
		this.scheduleTrigger(this._adSchedule);
		this.scheduleTrigger(this._liveChannelsSchedule);
	}

	private computeFrame():void {
		requestAnimationFrame(()=>this.computeFrame());
		//Execute process only once every 5s
		if(Date.now() - this._prevExecute_ts < 5000) return;
		this._prevExecute_ts = Date.now();

		// const s = Date.now();
		// console.log("1 > ", Date.now() - s);

		for (let i = 0; i < this._pendingSchedules.length; i++) {
			const e = this._pendingSchedules[i];
			let schedule = e.trigger.scheduleParams;

			//Special case for ad 
			if(e.trigger.type == TriggerTypes.TWITCHAT_AD) {
				//No ad for donors unless requested
				if(Config.instance.BETA_MODE) continue;//No ad on beta
				if(StoreProxy.auth.twitch.user.donor.state
				&& !StoreProxy.chat.botMessages.twitchatAd.enabled) continue;
				if(StoreProxy.auth.twitch.user.donor.noAd) continue;

				schedule = this._adSchedule.scheduleParams;
			}

			//Special case for "live friends" 
			if(e.trigger.type == TriggerTypes.TWITCHAT_LIVE_FRIENDS) {
				schedule = this._liveChannelsSchedule.scheduleParams;
			}

			if(!schedule) continue;

			let execute = true;
			switch(schedule.type) {
				case TriggerScheduleTypes.REGULAR_REPEAT:{
					//Check if min duration is reached
					if(schedule.repeatDuration > 0 && Date.now() < e.date) execute = false;
					//Check if min message count is reached
					if(schedule.repeatMinMessages > 0 && e.messageCount < schedule.repeatMinMessages) execute = false;
					//No min duration and no min message defined, ignore to avoid spam
					if(schedule.repeatDuration <= 0 && schedule.repeatMinMessages <= 0) execute = false;
					break;
				}

				case TriggerScheduleTypes.SPECIFIC_DATES:{
					if(schedule.repeatDuration > 0 && Date.now() < e.date) {
						execute = false;
					}else{
						this._pendingSchedules.splice(i, 1);
					}
					break;
				}
			}

			if(execute) {
				e.date = Date.now() + schedule!.repeatDuration * 60 * 1000;
				e.messageCount = 0;
				if(e.trigger.type == TriggerTypes.TWITCHAT_AD) {
					DataStore.set(DataStore.TWITCHAT_AD_NEXT_DATE, e.date);
				}
				TriggerActionHandler.instance.parseScheduleTrigger(e.trigger);
			}
		}
	}
}