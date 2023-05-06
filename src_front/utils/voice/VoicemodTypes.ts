export namespace VoicemodTypes {
	export interface SocketEvent {
		target:WebSocket;
		type:string;
		data:string;
	}

	export interface SocketData {
		actionType: string;
		appVersion: string;
		actionID?: any;
		actionObject: ActionObject;
		context: string;
		server?: string;
	}

	export interface ActionObject {
		allVoices?: Voice[];
		listOfMemes?: Meme[];
		favoriteVoices?: Voice[];
		customVoices?: Voice[];
		selectedVoice?: string;
		result?: Result;
		voiceID?: string | "nofx";
	}

	export interface Voice {
		voiceID: string;
		friendlyName: string;
		image?: string;
	}

	export interface Meme {
		FileName:string;
		Profile:string;
		Name:string;
		Type:string;
		Image:string;
		IsCore:boolean;
	}

	export interface Result {
		default: string;
		isSelected?:boolean;
		selected?:string;
		transparent?:string;
		[parameter: string|number]: unknown;
	}
}