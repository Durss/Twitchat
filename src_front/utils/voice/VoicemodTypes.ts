export namespace VoicemodTypes {
	export interface SocketEvent {
		target: WebSocket;
		type: string;
		data: string;
	}

	export interface SocketData {
		action?: string;
		payload?: any;

		actionType: string;
		appVersion: string;
		actionID?: any;
		actionObject: ActionObject;
		context: string;
		server?: string;
	}

	export interface ActionObject {
		voices?: Voice[];
		listOfMemes?: Meme[];
		favoriteVoices?: Voice[];
		customVoices?: Voice[];
		currentVoice?: string;
		result?: Result;
		soundboards?: Soundboard[];
		voiceID?: string | "nofx";
		value?: boolean;
	}

	export interface Voice {
		id: string;
		friendlyName: string;
		enabled: boolean;
		isCustom: boolean;
		favorited: boolean;
		isNew: boolean;
		bitmapChecksum: string;
		//custom prop
		image?:string;
	}


	export interface Meme {
		FileName: string;
		Profile: string;
		Name: string;
		Type: string;
		Image: string;
		IsCore: boolean;
	}

	export interface Result {
		default: string;
		isSelected?: boolean;
		selected?: string;
		transparent?: string;
		[parameter: string | number]: unknown;
	}

	export interface Soundboard {
		id: string
		name: string
		isCustom: boolean
		enabled: boolean
		showProLogo: boolean
		sounds: (Sound|undefined)[]
	}

	export interface Sound {
		id: string
		name: string
		isCustom: boolean
		isEnabled: boolean
		playbackMode: string
		loop: boolean
		muteOtherSounds: boolean
		muteVoice: boolean
		stopOtherSounds: boolean
		showProLogo: boolean
		bitmapChecksum: string
	}
}
