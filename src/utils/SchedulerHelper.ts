import type { TriggerData } from "@/types/TwitchatDataTypes";
import StoreProxy from "./StoreProxy";
import { TriggerScheduleTypes, TriggerTypes } from "./TriggerActionData";
import TriggerActionHandler from "./TriggerActionHandler";

/**
* Created : 02/09/2022 
*/
export default class SchedulerHelper {

	private static _instance:SchedulerHelper;
	private _pendingTriggers:{messageCount:number, date:number, triggerKey:string}[] = [];
	private _frameIndex:number = 0;
	
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
		const triggers:{[key:string]:TriggerData} = StoreProxy.store.state.triggers;
		for (const key in triggers) {
			const mainKey = key.split("_")[0];
			if(mainKey == TriggerTypes.SCHEDULE) {
				const trigger = triggers[key];
				if(!trigger.scheduleParams) continue;

				switch(trigger.scheduleParams.type) {
					case TriggerScheduleTypes.REGULAR_REPEAT:{
						this._pendingTriggers.push({
							messageCount:0,
							date:Date.now() + trigger.scheduleParams.repeatDuration * 60 * 1000,
							triggerKey:key,
						})
						break;
					}

					case TriggerScheduleTypes.SPECIFIC_DATES:{
						break;
					}
				}
			}
		}
	}

	public incrementMessageCount():void {
		for (let i = 0; i < this._pendingTriggers.length; i++) {
			this._pendingTriggers[i].messageCount++;
		}
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		this.computeFrame();
	}

	private computeFrame():void {
		requestAnimationFrame(()=>this.computeFrame());
		//Execute process only once every 60 frames
		//We could thechnically use a setInterval(...,1000) instead, but
		//its behavior isn't ideal when tab is put in background. All
		//pending intervals would be fired at once when bringing the tab
		//to the front. With a requestAnimationFrame() the process is
		//slowed down to 1fps and tasks still executed in background
		if(this._frameIndex++<60) return;
		this._frameIndex = 0;
		const triggers:{[key:string]:TriggerData} = StoreProxy.store.state.triggers;

		for (let i = 0; i < this._pendingTriggers.length; i++) {
			const e = this._pendingTriggers[i];
			const trigger = triggers[e.triggerKey];
			if(!trigger) continue;
			const schedule = trigger.scheduleParams!;

			let execute = true;
			switch(schedule.type) {
				case TriggerScheduleTypes.REGULAR_REPEAT:{
					if(schedule.repeatDuration > 0 && Date.now() < e.date) execute = false;
					if(schedule.repeatMinMessages > 0 && e.messageCount < schedule.repeatMinMessages) execute = false;
					break;
				}

				case TriggerScheduleTypes.SPECIFIC_DATES:{
					if(schedule.repeatDuration > 0 && Date.now() < e.date) execute = false;
					break;
				}
			}

			if(execute) {
				e.date = Date.now() + trigger.scheduleParams!.repeatDuration * 60 * 1000,
				e.messageCount = 0,
				TriggerActionHandler.instance.parseScheduleTrigger(e.triggerKey);
			}
		}
	}
}