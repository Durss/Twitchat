import DataStore from "@/store/DataStore";
import StoreProxy from "@/store/StoreProxy";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { TriggerScheduleTypes, TriggerTypes, type TriggerData, type TriggerScheduleData } from "../types/TriggerActionDataTypes";
import TriggerActionHandler from "./TriggerActionHandler";

/**
* Created : 02/09/2022 
*/
export default class SchedulerHelper {

	private static _instance:SchedulerHelper;
	private _pendingTriggers:{messageCount:number, date:number, triggerKey:string}[] = [];
	private _prevExecute_ts:number = 0;
	private _adSchedule?:TriggerScheduleData;
	private _adScheduleTimeout?:number;
	
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
		const triggers:{[key:string]:TriggerData} = StoreProxy.triggers.triggers;
		for (const key in triggers) {
			const mainKey = key.split("_")[0];
			if(mainKey == TriggerTypes.SCHEDULE) {
				this.scheduleTrigger(key, triggers[key].scheduleParams!);
			}
		}
	}

	/**
	 * Called when a messages is sent on tchat (not from twitchat)
	 */
	public incrementMessageCount():void {
		for (let i = 0; i < this._pendingTriggers.length; i++) {
			this._pendingTriggers[i].messageCount++;
		}
	}

	/**
	 * Unschedule the requested trigger byt its key
	 * @param key 
	 * @returns 
	 */
	public unscheduleTrigger(key:string):void {
		const existingIndex = this._pendingTriggers.findIndex(v=>v.triggerKey == key);
		if(existingIndex > -1) {
			this._pendingTriggers.splice(existingIndex, 1);
		}
	}

	/**
	 * Schedules a trigger and reset its scheduling if already scheduled
	 * @param key 
	 * @param schedule 
	 * @returns 
	 */
	public scheduleTrigger(key:string, schedule:TriggerScheduleData):void {
		if(!schedule) return;

		//Cleanup any previously scheduled trigger
		this.unscheduleTrigger(key);

		switch(schedule.type) {
			case TriggerScheduleTypes.REGULAR_REPEAT:{
				let date = Date.now() + schedule.repeatDuration * 60 * 1000;
				if(key === TriggerTypes.TWITCHAT_AD) {
					//Check if a date is stored on store and load it back.
					//This avoids the possibility to have no ad by refreshing
					//the page before the timer ends.
					let sDate = parseInt(DataStore.get(DataStore.TWITCHAT_AD_NEXT_DATE));
					if(!isNaN(sDate)) {
						date = Math.max(60000, Math.min(date, sDate));
						DataStore.set(DataStore.TWITCHAT_AD_NEXT_DATE, date);
					}
				}
				this._pendingTriggers.push({
					messageCount:0,
					date,
					triggerKey:key,
				});
				break;
			}

			case TriggerScheduleTypes.SPECIFIC_DATES:{
				for (let i = 0; i < schedule.dates.length; i++) {
					const d = schedule.dates[i];
					const date = new Date(d.value);
					if(d.daily) date.setDate(new Date().getDate());
					if(d.yearly) date.setFullYear(new Date().getFullYear());
					if(Date.now() > date.getTime()) {
						//Date past
						if(d.daily) {
							//Schedule for next day if it's a daily event
							date.setDate(new Date().getDate()+1);
						}else {
							//ignore it
							continue;
						}
					}
					this._pendingTriggers.push({
						messageCount:0,
						date:date.getTime(),
						triggerKey:key,
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
		for (let i = 0; i < this._pendingTriggers.length; i++) {
			const e = this._pendingTriggers[i];
			//Search for the ad schedule
			if(e.triggerKey == TriggerTypes.TWITCHAT_AD) {
				const nextDate = e.date;
				// console.log("ASK RESET", new Date(nextDate));
				
				//Wait 5min before the schedule happens and check if the last
				//message at the origin of the reset has been deleted or not.
				//If the message has been deleted, ignore the schedule reset :)
				clearTimeout(this._adScheduleTimeout);
				this._adScheduleTimeout = setTimeout(()=> {
					// console.log("Do reset. Deleted?"+message.deleted);
					if(message.deleted) return;
					e.date = Date.now() + this._adSchedule!.repeatDuration! * 60 * 1000;
					e.messageCount = 0;
					DataStore.set(DataStore.TWITCHAT_AD_NEXT_DATE, e.date);
				}, Math.max(0,nextDate - Date.now() - 5*60*1000));
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
			type:TriggerScheduleTypes.REGULAR_REPEAT,
			repeatDuration:120,
			repeatMinMessages:100,
			dates:[],
		}

		//Just a fail safe to avoid deploying fucked up data on production !
		if(this._adSchedule.repeatDuration < 120) {
			StoreProxy.main.alertData = "Ad schedule duration set to "+this._adSchedule.repeatDuration+" minutes instead of 120!";
		}else
		if(this._adSchedule.repeatMinMessages < 100) {
			StoreProxy.main.alertData = "Ad schedule min message count set to "+this._adSchedule.repeatMinMessages+" instead of 100!";
		}
		this.scheduleTrigger(TriggerTypes.TWITCHAT_AD, this._adSchedule);
	}

	private computeFrame():void {
		requestAnimationFrame(()=>this.computeFrame());
		//Execute process only once every 60 frames
		//We could thechnically use a setInterval(...,1000) instead, but
		//its behavior isn't ideal when tab is put in background. All
		//pending intervals would be fired at once when bringing the tab
		//back to foreground. With a requestAnimationFrame() the process
		//is slowed down to 1 fps and tasks still executed in background
		if(Date.now() - this._prevExecute_ts < 5000) return;
		this._prevExecute_ts = Date.now();

		// const s = Date.now();
		const triggers:{[key:string]:TriggerData} = StoreProxy.triggers.triggers;
		// console.log("1 > ", Date.now() - s);

		for (let i = 0; i < this._pendingTriggers.length; i++) {
			const e = this._pendingTriggers[i];
			const trigger = triggers[e.triggerKey];
			let schedule = trigger?.scheduleParams;
			if(e.triggerKey == TriggerTypes.TWITCHAT_AD) {
				//No ad for donors unless requested
				if(StoreProxy.auth.twitch.user.donor.state
				&& !StoreProxy.chat.botMessages.twitchatAd.enabled) continue;
				schedule = this._adSchedule;
			}
			if(!schedule) continue;

			let execute = true;
			switch(schedule.type) {
				case TriggerScheduleTypes.REGULAR_REPEAT:{
					if(schedule.repeatDuration > 0 && Date.now() < e.date) execute = false;
					if(schedule.repeatMinMessages > 0 && e.messageCount < schedule.repeatMinMessages) execute = false;
					break;
				}

				case TriggerScheduleTypes.SPECIFIC_DATES:{
					if(schedule.repeatDuration > 0 && Date.now() < e.date) {
						execute = false;
					}else{
						this._pendingTriggers.splice(i, 1)
					}
					break;
				}
			}

			if(execute) {
				//[EDIT] don't do that reset, just wait for the message to come back
				//that will reset the schedule because it contains the link
				// let date = Date.now() + schedule!.repeatDuration * 60 * 1000;
				// if(e.triggerKey == TriggerTypes.TWITCHAT_AD) {
				// 	//This is a trick to avoid sending the ad message multiple times
				// 	//if the user is using multiple instances of twitchat.
				// 	//The first one sent will reset the timer on the other instances.
				// 	//There's still a slight risk 2 instances send it almost at the
				// 	//same time but that's the easiest solution to handle that.
				// 	date += Math.random()*60;
				// 	//Update anti-cheat
				// 	DataStore.set(DataStore.TWITCHAT_AD_NEXT_DATE, e.date);
				// }
				
				// e.date = date;
				// e.messageCount = 0;
				TriggerActionHandler.instance.parseScheduleTrigger(e.triggerKey);
			}
		}
		// console.log("2 > ", Date.now() - s);
	}
}