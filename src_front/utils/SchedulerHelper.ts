import DataStore from "@/store/DataStore";
import StoreProxy from "@/store/StoreProxy";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { TriggerScheduleTypes, TriggerTypes, type TriggerData } from "../types/TriggerActionDataTypes";
import Utils from "./Utils";
import TriggerActionHandler from "./triggers/TriggerActionHandler";
import SetIntervalWorker from "./SetIntervalWorker";

/**
* Created : 02/09/2022 
*/
export default class SchedulerHelper {

	private static _instance:SchedulerHelper;
	private _started:boolean = false;
	private _pendingSchedules:{messageCount:number, date:number, trigger:TriggerData}[] = [];
	private _adScheduleTimeout?:number;
	private _adSchedule!:TriggerData;
	
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
		for (let i = 0; i < this._pendingSchedules.length; i++) {
			const element = this._pendingSchedules[i];
			if(element.trigger.id == trigger.id) {
				this._pendingSchedules.splice(i, 1);
				i--;
			}
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
				let date = Date.now() + trigger.scheduleParams.repeatDuration * 1000;
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
					
					//Date has past and not daily,monthly or yearly, skip it
					if(Date.now() > date.getTime() && !d.daily && !d.monthly && !d.yearly) continue;

					//Schedule for next closest date time
					while(Date.now() > date.getTime()) {
						if(d.daily) {
							//Schedule for next day if it's a daily event
							date.setDate(date.getDate()+1);
						}else
						if(d.monthly) {
							//Schedule for next month if it's a monthly event
							date.setMonth(date.getMonth()+1);
						}else
						if(d.yearly) {
							//Schedule for next year if it's a yearly event
							date.setFullYear(date.getFullYear()+1);
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
				this._adScheduleTimeout = window.setTimeout(()=> {
					// console.log("Do reset. Deleted?"+message.deleted, "date:"+(Date.now() + this._adSchedule!.repeatDuration! * 1000 - waitFor) );
					if(message.deleted === true) return;
					e.date = Date.now() + this._adSchedule.scheduleParams!.repeatDuration! * 1000;
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
		
		this._adSchedule = {
			type:TriggerTypes.TWITCHAT_AD,
			enabled:true,
			id:Utils.getUUID(),
			actions: [],
			scheduleParams:{
				type:TriggerScheduleTypes.REGULAR_REPEAT,
				// repeatDuration:10,
				// repeatMinMessages:0,
				repeatDuration:2 * 60 * 60,
				repeatMinMessages:100,
				dates:[],
			}
		}
		
		const liveChannelsSchedule = {
			type:TriggerTypes.TWITCHAT_LIVE_FRIENDS,
			enabled:true,
			id:Utils.getUUID(),
			actions: [],
			scheduleParams:{
				type:TriggerScheduleTypes.REGULAR_REPEAT,
				repeatDuration:5 * 60,
				repeatMinMessages:0,
				dates:[],
			}
		};
		
		const shoutoutQueueSchedule = {
			type:TriggerTypes.TWITCHAT_SHOUTOUT_QUEUE,
			enabled:true,
			id:Utils.getUUID(),
			actions: [],
			scheduleParams:{
				type:TriggerScheduleTypes.REGULAR_REPEAT,
				repeatDuration:1,//Every seconds
				repeatMinMessages:0,
				dates:[],
			}
		};

		//Just a fail safe to avoid deploying fucked up data on production !
		if(this._adSchedule.scheduleParams!.repeatDuration < 2 * 60 * 60) {
			StoreProxy.common.alert("Ad schedule duration set to "+this._adSchedule.scheduleParams!.repeatDuration+" seconds instead of 7200 (2h)!");
		}else
		if(this._adSchedule.scheduleParams!.repeatMinMessages < 100) {
			StoreProxy.common.alert("Ad schedule min message count set to "+this._adSchedule.scheduleParams!.repeatMinMessages+" instead of 100!");
		}
		this.scheduleTrigger(this._adSchedule);
		this.scheduleTrigger(liveChannelsSchedule);
		this.scheduleTrigger(shoutoutQueueSchedule);
		SetIntervalWorker.instance.create(()=>this.computeFrame(), 5000);
	}

	private computeFrame():void {
		// const s = Date.now();
		// console.log("1 > ", Date.now() - s);

		for (let i = 0; i < this._pendingSchedules.length; i++) {
			const e = this._pendingSchedules[i];
			const schedule = e.trigger.scheduleParams;

			if(!schedule) continue;

			//Special case for ad 
			if(e.trigger.type == TriggerTypes.TWITCHAT_AD) {
				// if(Config.instance.BETA_MODE) continue;//No ad on beta
				//No ad for donors unless requested
				if((StoreProxy.auth.isPremium || StoreProxy.auth.donorLevel > -1) && !StoreProxy.chat.botMessages.twitchatAd.enabled) continue;
				
				//A premium user (also a big streamer) emptied the message instead of disabling it.
				//This condition is here to make it possible to disable the ad this way. If "twitchat.fr"
				//isn't found on the message and the user is part of donors/premium members, don't send
				//the ad on chat.
				if((StoreProxy.auth.isPremium || StoreProxy.auth.donorLevel > -1)
				&& !/(^|\s|https?:\/\/)twitchat\.fr($|\s)/gi.test(StoreProxy.chat.botMessages.twitchatAd.message)) continue;
				
				//Special case for users that have too few followers
				if(StoreProxy.auth.noAd) continue;
			}

			let execute = true;
			switch(schedule.type) {
				case TriggerScheduleTypes.REGULAR_REPEAT:{
					//Check if min duration is reached
					if(schedule.repeatDuration > 0 && Date.now() < e.date) execute = false;
					//Check if min message count is reached
					if(schedule.repeatMinMessages > 0 && e.messageCount < schedule.repeatMinMessages) execute = false;
					//No min duration and no min message defined, ignore to avoid spam
					if(schedule.repeatDuration <= 0 && schedule.repeatMinMessages <= 0) execute = false;
					//schedule next repeat
					if(execute && schedule.repeatDuration) e.date = Date.now() + schedule.repeatDuration * 1000;
					break;
				}

				case TriggerScheduleTypes.SPECIFIC_DATES:{
					if(Date.now() < e.date) {
						execute = false;
					}else{
						this._pendingSchedules.splice(i, 1);
					}
					break;
				}
			}

			if(execute) {
				e.messageCount = 0;
				if(e.trigger.type == TriggerTypes.TWITCHAT_AD) {
					DataStore.set(DataStore.TWITCHAT_AD_NEXT_DATE, e.date);
				}
				TriggerActionHandler.instance.parseScheduleTrigger(e.trigger);
			}
		}
	}
}