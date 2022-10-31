import { Event } from '@/events/EventDispatcher';

export default class VoicemodEvent extends Event {

	public static VOICE_CHANGE = "VOICE_CHANGE";
	
	constructor(type:string, public voiceID?:string) {
		super(type);
	}
	
}