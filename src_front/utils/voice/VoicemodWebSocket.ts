import { reactive } from "vue";
import { EventDispatcher } from "../../events/EventDispatcher";
import Utils from "../Utils";
import VoicemodEvent from "./VoicemodEvent";

/**
* Created : 25/07/2021 
*/
export default class VoicemodWebSocket extends EventDispatcher {

	private static ACTION_REGISTER_PLUGIN: string = "registerPlugin";
	private static ACTION_GET_VOICES: string = "getVoices";
	private static ACTION_GET_MEMES: string = "getMemes";
	private static ACTION_SELECT_VOICE: string = "selectVoice";
	private static ACTION_PLAY_MEME: string = "playMeme";
	private static ACTION_STOP_ALL_MEME_SOUNDS: string = "stopAllMemeSounds";
	private static ACTION_BEEP_SOUND_ON_OFF: string = "beepSound_OnOff";

	//Bellow events are captured but nothing is done with it so far
	private static EVENT_TOGGLE_MUTE: string = "toggleMute";
	private static EVENT_TOGGLE_VOICE_CHANGER: string = "toggleVoiceChanger";
	private static EVENT_TOGGLE_BACKGROUND: string = "toggleBackground";
	private static EVENT_TOGGLE_HEAR_MY_VOICE: string = "toggleHearMyVoice";
	private static EVENT_VOICE_CHANGED_EVENT: string = "voiceChangedEvent";
	private static ACTION_GET_BITMAP: string = "getBitmap";

	//Bellow actions are not implemented
	private static ACTION_SELECT_RANDOM_VOICE: string = "selectRandomVoice";
	private static ACTION_VOICE_CHANGER_ON_OFF: string = "voiceChanger_OnOff";
	private static ACTION_HEAR_MY_VOICE_ON_OFF: string = "hearMyVoice_OnOff";
	private static ACTION_BACKGROUND_ON_OFF: string = "background_OnOff";
	private static ACTION_GET_HEAR_MYSELF_STATUS: string = "getHearMyselfStatus";
	private static ACTION_GET_VOICE_CHANGER_STATUS: string = "getVoiceChangerStatus";
	private static ACTION_GET_MUTE_MIC_STATUS: string = "getMuteMicStatus";
	private static ACTION_GET_BACKGROUND_EFFECT_STATUS: string = "getBackgroundEffectStatus";
	private static ACTION_DATA_STOP_ALL_SOUNDS: string = "stopAllSounds";

	private static _instance:VoicemodWebSocket;
	
	public connected: boolean = false;
	
	private _initResolver!: Function;
	private _connecting!: boolean;
	private _socket!: WebSocket;
	private _voicesList: VoicemodTypes.Voice[] = [];
	private _memesList: VoicemodTypes.Meme[] = [];
	private _currentVoiceEffect!: VoicemodTypes.Voice|null;
	private _autoReconnect: boolean = false;
	private _resetTimeout:number = -1;
	private _voiceIdImageToPromise:{[key:string]:{resolve:(base64:string)=>void, reject:()=>void}} = {};
	private _voiceIdToImage:{[key:string]:string} = {};

	static get instance():VoicemodWebSocket {
		if(!VoicemodWebSocket._instance) {
			VoicemodWebSocket._instance = reactive(new VoicemodWebSocket()) as VoicemodWebSocket;
		}
		return VoicemodWebSocket._instance;
	}

	/********************
	* GETTER / SETTERS *
	********************/

	/**
	 * Get all the available voice effects
	 */
	public get voices():VoicemodTypes.Voice[] {
		return JSON.parse(JSON.stringify(this._voicesList));
	}

	/**
	 * Get all the available memes list
	 */
	public get memes():VoicemodTypes.Meme[] {
		return JSON.parse(JSON.stringify(this._memesList));
	}

	/**
	 * Get all the available memes list
	 */
	public get currentVoiceEffect():VoicemodTypes.Voice|null {
		return this._currentVoiceEffect;
	}



	/******************
	* PUBLIC METHODS *
	******************/
	public connect(ip:string="127.0.0.1", port:number=59129): Promise<void> {
		if(this.connected) return Promise.resolve();
		if(this._connecting) return Promise.resolve();
		this._connecting = true;
		return new Promise((resolve, reject) => {
			this._initResolver = resolve;
			this._socket = new WebSocket(`ws://${ip}:${port}/vmsd/`);

			this._socket.onopen = () => {
				console.log('🎤 Voicemod connection succeed');
				this._connecting = false;
				this.connected = true;
				this._autoReconnect = true;
			};

			this._socket.onmessage = (event:any) => this.onSocketMessage(event);

			this._socket.onclose = (e) => {
				if(this.connected) {
					console.log('🎤 Voicemod connection lost');
				}
				this._connecting = false;
				this.connected = false;
				if(this._autoReconnect) {
					try {
						this.connect(ip, port);
					}catch(error) {
						console.log(error);
						reject();
					}
				}
			}
		
			this._socket.onerror = (e) => {
				this._connecting = false;
				reject();
			}
		});
	}
	public disconnect():void {
		this._autoReconnect = false;
		this._socket.close();
	}

	/**
	 * Activate a voice effect by its name.
	 * There's a tolerence on the name matching.
	 * If the actual voice effect name is "Game Over", you can activate
	 * it with "gameover".
	 * 
	 * @param name		the name of the voice effect to activate
	 * @param id		(optional) The ID of the voice effect to activate
	 */
	public async enableVoiceEffect(id:string, autoRemoveDelay:number = -1):Promise<void> {
		let voice!:VoicemodTypes.Voice;
		if(!this._voicesList || !this._voicesList.length) {
			console.log("🎤 VoicemodWebSocket not connected");
			return;
		}
		//Search for a voice effect with the requested name
		for (let i = 0; i < this._voicesList.length; i++) {
			if (id === this._voicesList[i].voiceID) {
				voice = this._voicesList[i];
				break;
			}
		}

		if(!voice) {
			console.log("🎤Voicemod: voice effect "+id? id : name+" not found");
		}else{
			this._currentVoiceEffect = voice;
			this.send(VoicemodWebSocket.ACTION_SELECT_VOICE, {voiceID:voice.voiceID});
		}

		clearTimeout(this._resetTimeout);

		if(autoRemoveDelay > -1) {
			this._resetTimeout = setTimeout(async ()=> {
				this.enableVoiceEffect("nofx");
			}, autoRemoveDelay);
		}
	}

	/**
	 * Disables the current voice effect
	 */
	public disableVoiceEffect():void {
		this.enableVoiceEffect("nofx");
		this._currentVoiceEffect = null;
	}

	/**
	 * Makes a beep sound
	 * If a duration is specified the beep will be stoped after this amoutn of milliseconds.
	 * 
	 * @param duration		beep duration. Set to 0 if you don't want it to stop automatically.
	 * @param forcedState	set to 1 to force it to beep, or 0 to force it to not beep
	 */
	public beep(duration:number = 500, forcedState:1|0|null = null):void {
		let data = {badLanguage:forcedState != null? forcedState : 1};
		this.send(VoicemodWebSocket.ACTION_BEEP_SOUND_ON_OFF, data);

		//If asked to beep for a specific duration,
		//stop the beep sound after that duration
		if(duration > 0) {
			setTimeout(()=> {
				data.badLanguage = 0;
				this.send(VoicemodWebSocket.ACTION_BEEP_SOUND_ON_OFF, data);
			}, duration);
		}
	}

	/**
	 * Activate a meme sound by its name.
	 * There's a tolerence on the name matching.
	 * If the actual meme name is "Game Over", you can activate
	 * it with "gameover".
	 * 
	 * @param name		the name of the meme sound to activate
	 * @param id		(optional) The "FileName" of the meme to activate
	 */
	public playMeme(name:string, id?:string):void {
		if(!this._memesList || this._memesList.length == 0) return;
		let fileID = "";
		const rawName = name;
		name = name.trim().toLowerCase().replace(/[^\w\s]/g, '')
		//Search for a voice effect with the requested name
		for (let i = 0; i < this._memesList.length; i++) {
			if(id) {
				if (id === this._memesList[i].FileName) {
					fileID = this._memesList[i].FileName;
					break;
				}
			}else{
				const nameRef = this._memesList[i].Name;
				//Check if the requested name is exactly the same
				if(rawName == nameRef) {
					fileID = this._memesList[i].FileName;
					//As this exactly matches the requested name, we can stop searching
					break;
				}
				//Check if requested name is more or less the same
				if (nameRef.trim().toLowerCase().replace(/[^\w\s]/g, '') === name) {
					fileID = this._memesList[i].FileName;
				}
			}
		}

		if(!fileID) {
			console.log("🎤Voicemod: meme sound "+id? id : name+" not found");
		}else{
			this.send(VoicemodWebSocket.ACTION_PLAY_MEME, {FileName:fileID, IsKeyDown:true});
		}
	}

	/**
	 * Stops any playing meme sound
	 */
	public stopMeme():void {
		this.send(VoicemodWebSocket.ACTION_STOP_ALL_MEME_SOUNDS);
	}

	/**
	 * Request the image of a voice effect
	 */
	public async getBitmapForVoice(id:string):Promise<string> {
		return new Promise((resolve, reject)=> {
			if(this._voiceIdToImage[id]) {
				resolve(this._voiceIdToImage[id]);
			}else{
				this._voiceIdImageToPromise[id] = {resolve, reject};
				this.send(VoicemodWebSocket.ACTION_GET_BITMAP, {voiceID:id});
			}
		});
	}



	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Sends a data to Voicemod
	 */
	private send(actionType: string, data?:any):void {
		const uuid = Utils.getUUID();
		const json:any = {
			"actionID": uuid,
			"actionType": actionType,
			"context": "request:" + actionType + ":" + uuid,
			"pluginVersion": "2.0.0",
		};
		if(data) {
			json.actionObject = data;
		}
		
		if(this._socket.readyState == WebSocket.OPEN) {
			this._socket.send( JSON.stringify(json) );
		}
	}

	/**
	 * Called when a message is received from Voicemod app
	 */
	private onSocketMessage(event:VoicemodTypes.SocketEvent):void {
		const json:VoicemodTypes.SocketData = JSON.parse(event.data);

		// console.log("🎤Voicemod: received message: " + json);

		if (json.server) {
			if(!json.appVersion) { 
				console.log("🎤VoicemodWebSocket: missing \"appVersion\" prop from json");
				const opts = {
					method:"GET",
					headers:{
						"Content-Type": "application/json",
					},
				}
			}
			this.send(VoicemodWebSocket.ACTION_REGISTER_PLUGIN);
			return;
		}
		
		switch(json.actionType) {
			case VoicemodWebSocket.ACTION_REGISTER_PLUGIN:
				//Request all available voice effect list
				this.send(VoicemodWebSocket.ACTION_GET_VOICES);
				//Request all available meme sound list
				this.send(VoicemodWebSocket.ACTION_GET_MEMES);
				this.send(VoicemodWebSocket.ACTION_GET_BITMAP, {voiceID:"nofx"});
				this.send
				break;

			case VoicemodWebSocket.ACTION_GET_VOICES:
				this._voicesList = json.actionObject.allVoices ?? [];
				this.dispatchEvent(new VoicemodEvent(VoicemodEvent.VOICE_CHANGE, json.actionObject.selectedVoice as string))
				this.checkInitComplete();
			break;
			
			case VoicemodWebSocket.ACTION_GET_MEMES:
				this._memesList = json.actionObject.listOfMemes ?? [];
				this.checkInitComplete();
				break;

			case VoicemodWebSocket.ACTION_GET_BITMAP:
				//Called after requesting the image of a voice effect
				const data = json.actionObject.result;
				if(data) {
					const img = data.transparent ?? data.default;
					const voiceID = json.actionObject.voiceID as string;
					const prom = this._voiceIdImageToPromise[voiceID];
					if(prom?.resolve) prom.resolve(img);
					this._voiceIdToImage[voiceID] = img;
				}
				break;

			case VoicemodWebSocket.EVENT_TOGGLE_MUTE:
				break;

			case VoicemodWebSocket.EVENT_TOGGLE_BACKGROUND:
				break;

			case VoicemodWebSocket.EVENT_TOGGLE_HEAR_MY_VOICE:
				break;

			case VoicemodWebSocket.EVENT_VOICE_CHANGED_EVENT:
				this.dispatchEvent(new VoicemodEvent(VoicemodEvent.VOICE_CHANGE, json.actionObject.voiceID as string))
				break;

			case VoicemodWebSocket.EVENT_TOGGLE_VOICE_CHANGER:
				break;

			case "licenseTypeChanged":
				//What is that ?? I received it without doing anything...
				break;

			default:
				console.log("🎤Voicemod: unhandled actionType "+json.actionType);
				// console.log(json);
		}
	}

	/**
	 * Check if voices and memes list are laoded and resolves the
	 * connect promise.
	 */
	private checkInitComplete():void {
		if(this._voicesList && this._memesList) {
			this._initResolver();
		}
	}

}

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

