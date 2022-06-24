import { Event } from '@/utils/EventDispatcher';

/**
* Created : 07/12/2020 
*/
export default class PubSubEvent extends Event {

	public static DELETE_MESSAGE = "DELETE_MESSAGE";
	
	constructor(type:string, public data?:string) {
		super(type);
	}
	
}