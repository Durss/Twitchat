import { Event } from '@/utils/EventDispatcher';
import type { SpotifyAuthToken } from './SpotifyDataTypes';

export default class SpotifyHelperEvent extends Event {

	public static CONNECTED = "CONNECTED";
	public static DISCONNECTED = "DISCONNECTED";
	public static ERROR = "CONNECT_ERROR";
	
	constructor(type:string, public token?:SpotifyAuthToken|null, public error?:string) {
		super(type);
	}
	
}