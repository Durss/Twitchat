import { EventDispatcher } from "./EventDispatcher";

/**
* Created : 31/10/2022 
*/
export default class EventBus extends EventDispatcher{

	private static _instance:EventBus;
	
	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():EventBus {
		if(!EventBus._instance) {
			EventBus._instance = new EventBus();
		}
		return EventBus._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}