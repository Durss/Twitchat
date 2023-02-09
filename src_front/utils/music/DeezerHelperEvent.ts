import { Event } from '@/events/EventDispatcher';

export default class DeezerHelperEvent extends Event {

	public static CONNECTED = "CONNECTED";
	public static DISCONNECTED = "DISCONNECTED";
	public static CONNECT_ERROR = "CONNECT_ERROR";
	
	constructor(type:string) {
		super(type);
	}
	
}