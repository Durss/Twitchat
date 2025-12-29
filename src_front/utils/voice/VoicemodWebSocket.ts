import StoreProxy from "@/store/StoreProxy";
import { ref } from "vue";
import { EventDispatcher } from "../../events/EventDispatcher";
import PublicAPI from "../PublicAPI";
import Utils from "../Utils";
import VoicemodEvent from "./VoicemodEvent";
import type { VoicemodTypes } from "./VoicemodTypes";

/**
* Created : 25/07/2021
*/
export default class VoicemodWebSocket extends EventDispatcher {

	private static ACTION_REGISTER_CLIENT: string = "registerClient";
	private static ACTION_GET_VOICES: string = "getVoices";
	private static ACTION_GET_CURRENT_VOICE: string = "getCurrentVoice";
	private static ACTION_GET_SOUNDBOARDS: string = "getAllSoundboard";
	private static ACTION_SELECT_VOICE: string = "selectVoice";
	private static ACTION_PLAY_MEME: string = "playMeme";
	private static ACTION_STOP_ALL_MEME_SOUNDS: string = "stopAllMemeSounds";
	private static ACTION_BEEP_SOUND_ON_OFF: string = "setBeepSound";
	private static ACTION_GET_BITMAP: string = "getBitmap";
	private static ACTION_GET_HEAR_MYSELF: string = "getHearMyselfStatus";
	private static ACTION_TOGGLE_HEAR_MYSELF: string = "toggleHearMyVoice";
	private static ACTION_GET_VOICE_CHANGER: string = "getVoiceChangerStatus";
	private static ACTION_TOGGLE_VOICE_CHANGER: string = "toggleVoiceChanger";

	private static EVENT_VOICE_CHANGED_EVENT: string = "voiceLoadedEvent";
	private static EVENT_VOICE_CHANGED_EVENT_V3: string = "voiceChangedEvent";
	//Below events are captured but nothing is done with it so far
	private static EVENT_VOICE_CHANGER_ON: string = "voiceChangerEnabledEvent";
	private static EVENT_VOICE_CHANGER_OFF: string = "voiceChangerDisabledEvent";

	private static NO_FILTER_ID: string = "nofx";
	private static NO_FILTER_ID_V3: string = "df6454f1-8eb2-4092-9ccc-fb51219f6291";

	private static _instance:VoicemodWebSocket;

	public connected = ref(false);

	private _initResolver!: (value: void | PromiseLike<void>) => void;
	private _connecting!: boolean;
	private _socket!: WebSocket;
	private _voicesList: VoicemodTypes.Voice[] = [];
	private _soundsboards: VoicemodTypes.Soundboard[] = [];
	private _currentVoiceEffect!: VoicemodTypes.Voice|null;
	private _autoReconnect: boolean = false;
	private _resetVoiceTimeout:number = -1;
	private _reconnectTimeout: number = -1;
	private _voiceIdImageToPromise:{[key:string]:{resolve:(base64:string)=>void, reject:()=>void}} = {};
	private _voiceIdToImage:{[key:string]:string} = {};
	private _hearMyselfState:boolean = false;
	private _voiceChangerState:boolean = false;
	private _connectAttempts:number = 0;

	static get instance():VoicemodWebSocket {
		if(!VoicemodWebSocket._instance) {
			VoicemodWebSocket._instance = new VoicemodWebSocket();
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
	 * Get all the available soundboards list
	 */
	public get soundboards():VoicemodTypes.Soundboard[] {
		return JSON.parse(JSON.stringify(this._soundsboards));
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
	public connect(ip:string="127.0.0.1", port:number=59129, isRetry:boolean = false): Promise<void> {
		if(this.connected.value) return Promise.resolve();
		if(this._connecting) return Promise.resolve();
		this._connecting = true;
		if(!isRetry) {
			this._connectAttempts = 0;
		}
		return new Promise((resolve, reject) => {
			this._initResolver = resolve;
			this._socket = new WebSocket(`ws://${ip}:${port}/v1/`);

			this._socket.onopen = () => {
				// console.log('🎤 Voicemod connection succeed');
				this._connecting = false;
				this._autoReconnect = true;
				this.register();
			};

			this._socket.onmessage = (event:any) => this.onSocketMessage(event);

			this._socket.onclose = (e) => {
				// if(this.connected.value) {
				// 	console.log('🎤 Voicemod connection lost');
				// }
				this._connecting = false;
				this.connected.value = false;
				// Attempt to connect 300 times which roughly corresponds to 10min
				if(this._autoReconnect || ++this._connectAttempts < 300) {
					try {
						window.setTimeout(()=> {
							this.connect(ip, port, true);
						}, 1000)
					}catch(error) {
						console.log(error);
						reject("[-][VoicemodWebSocket] Reconnection failed");
					}
				}
			}

			this._socket.onerror = (e) => {
				this._connecting = false;
				reject("[-][VoicemodWebSocket] Socket error");
			}
		});
	}

	/**
	 * Disconnects socket
	 */
	public disconnect():void {
		// console.log("🎤 VoicemodWebSocket: disconnecting");
		this._voicesList = [];
		this._soundsboards = [];
		this._voiceIdToImage = {};
		this._voiceIdImageToPromise = {};
		this._autoReconnect = false;
		this._connectAttempts = Number.MAX_SAFE_INTEGER
		clearTimeout(this._reconnectTimeout);
		if(this.connected.value) {
			this._socket.close();
		}
		this.connected.value = false;
	}

	/**
	 * Activate a voice effect by its ID or its name.
	 * There's a tolerence on the name matching.
	 * If the actual voice effect name is "Game Over", you can activate
	 * it with "gameover".
	 *
	 * @param name		the name of the voice effect to activate
	 * @param id		(optional) The ID of the voice effect to activate
	 */
	public async enableVoiceEffect(name?:string, id?:string|"DISABLE_EFFECT", autoRemoveDelay:number = -1):Promise<void> {
		if(!this._voicesList || !this._voicesList.length) {
			// console.log("🎤 VoicemodWebSocket not connected");
			return;
		}

		let voice:VoicemodTypes.Voice|undefined;
		if(name) {
			name = name.toLowerCase().replace(/[^\w\s]/g, '').trim();
			voice = VoicemodWebSocket.instance.voices.find(v=> v.friendlyName.toLowerCase().replace(/[^\w\s]/g, '').trim() === name);
		}
		if(!name && id) {
			if(id == "DISABLE_EFFECT") {
				voice = this._voicesList.find(v=>v.id == VoicemodWebSocket.NO_FILTER_ID || v.id == VoicemodWebSocket.NO_FILTER_ID_V3);
			}else{
				voice = this._voicesList.find(v=>v.id == id);
			}
		}

		if(!voice) {
			console.log("🎤Voicemod: voice effect "+(id? id : name)+" not found");
		}else{
			this._currentVoiceEffect = (voice.id != VoicemodWebSocket.NO_FILTER_ID && voice.friendlyName.toLowerCase() != VoicemodWebSocket.NO_FILTER_ID_V3)? voice : null;
			this.send(VoicemodWebSocket.ACTION_SELECT_VOICE, {voiceID:voice.id});
		}

		clearTimeout(this._resetVoiceTimeout);

		if(autoRemoveDelay > -1) {
			this._resetVoiceTimeout = window.setTimeout(async ()=> {
				this.enableVoiceEffect(undefined, "DISABLE_EFFECT");
			}, autoRemoveDelay);
		}
	}

	/**
	 * Disables the current voice effect
	 */
	public disableVoiceEffect():void {
		this.enableVoiceEffect(undefined, "DISABLE_EFFECT");
		this._currentVoiceEffect = null;
	}

	/**
	 * Makes a beep sound
	 */
	public async beepOn():Promise<void> {
		this.send(VoicemodWebSocket.ACTION_BEEP_SOUND_ON_OFF, {badLanguage:1});
	}

	/**
	 * Stops beeping
	 */
	public beepOff():void {
		this.send(VoicemodWebSocket.ACTION_BEEP_SOUND_ON_OFF, {badLanguage:0});
	}

	/**
	 * Activate a sound by its name.
	 * There's a tolerence on the name matching.
	 * If the actual meme name is "Game Over", you can activate
	 * it with "gameover".
	 *
	 * @param name		the name of the meme sound to activate
	 * @param id		(optional) The "FileName" of the meme to activate
	 */
	public playSound(name?:string, id?:string):void {
		if(!this._soundsboards || this._soundsboards.length == 0) return;

		if(name) {
			const rawName = name;
			name = name.trim().toLowerCase().replace(/[^\w\s]/g, '')
			for (const board of this._soundsboards) {
				for (const sound of board.sounds) {
					if(!sound) continue;
					//Check if the requested name is exactly the same
					if(rawName == sound.name) {
						//As this exactly matches the requested name, we can stop searching
						id = sound.id;
						break;
					}
					//Check if requested name is more or less the same
					if (sound.name.trim().toLowerCase().replace(/[^\w\s]/g, '') === name) {
						id = sound.id;
					}
				}
			}
		}

		if(!id) {
			console.log("🎤Voicemod: meme sound "+name+" not found");
		}else{
			this.send(VoicemodWebSocket.ACTION_PLAY_MEME, {FileName:id, IsKeyDown:true});
		}
	}

	/**
	 * Stops any playing meme sound
	 */
	public stopSound():void {
		this.send(VoicemodWebSocket.ACTION_STOP_ALL_MEME_SOUNDS);
	}

	/**
	 * Stops any playing meme sound
	 */
	public getCurrentVoice():void {
		this.send(VoicemodWebSocket.ACTION_GET_CURRENT_VOICE);
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

	/**
	 * Enable or disable the voice changer
	 * @param state
	 */
	public setVoiceChangerState(state:boolean):void {
		if(this._voiceChangerState != state) {
			this.send(VoicemodWebSocket.ACTION_TOGGLE_VOICE_CHANGER);
		}
	}

	public setHearMyselfState(state:boolean):void {
		if(this._hearMyselfState != state) {
			this.send(VoicemodWebSocket.ACTION_TOGGLE_HEAR_MYSELF);
		}
	}



	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Sends a data to Voicemod
	 */
	private send(actionType: string, payload?:any):void {
		const uuid = Utils.getUUID();
		const json:any = {
			"id": uuid,
			"action": actionType,
		};
		if(payload) {
			json.payload = payload;
		}

		if(this._socket.readyState == WebSocket.OPEN) {
			this._socket.send( JSON.stringify(json) );
		}
	}

	private register():void {
		const json = {clientKey: "controlapi-uzur23999"};
		this.send(VoicemodWebSocket.ACTION_REGISTER_CLIENT, json)
	}

	/**
	 * Called when a message is received from Voicemod app
	 */
	private async onSocketMessage(event:VoicemodTypes.SocketEvent):Promise<void> {
		const json:VoicemodTypes.SocketData = JSON.parse(event.data);

		// console.log("🎤Voicemod: received message: " + json);

		//Special case for "registerClient" event that's returned in an "action"
		//field instead of "actionType" like every other events -_-
		if(json.action == VoicemodWebSocket.ACTION_REGISTER_CLIENT) {
			if(json.payload.status.code != 200) {
				StoreProxy.common.alert("[Voicemod] Connection failed with reason: "+json.payload.status.description)
				return;
			}
			//Request all available voice effect list
			this.send(VoicemodWebSocket.ACTION_GET_VOICES);
			//Request all available sound list
			this.send(VoicemodWebSocket.ACTION_GET_SOUNDBOARDS);
			//Request current "hear myself" state
			this.send(VoicemodWebSocket.ACTION_GET_HEAR_MYSELF);
			//Get current voice changer state
			this.send(VoicemodWebSocket.ACTION_GET_VOICE_CHANGER);
			// this.send(VoicemodWebSocket.ACTION_GET_BITMAP, {voiceID:"nofx"});
			return;
		}

		switch(json.actionType) {

			case VoicemodWebSocket.ACTION_GET_VOICES:{
				this._voicesList = json.actionObject.voices ?? [];
				this._currentVoiceEffect = this._voicesList.find(v=> v.id === json.actionObject.currentVoice)!;
				if(this.currentVoiceEffect) this.onVoiceChange(this.currentVoiceEffect);
				this.checkInitComplete();
				break;
			}

			case VoicemodWebSocket.ACTION_GET_CURRENT_VOICE:{
				this._currentVoiceEffect = this._voicesList.find(v=> v.id === json.actionObject.voiceID)!;
				break;
			}

			case VoicemodWebSocket.ACTION_GET_SOUNDBOARDS:{
				if(json.payload) {
					this._soundsboards = json.payload.soundboards as VoicemodTypes.Soundboard[];
				}
				if(json.actionObject && json.actionObject.soundboards) {
					this._soundsboards = json.actionObject.soundboards;
				}
				this.checkInitComplete();
				break;
			}

			case VoicemodWebSocket.ACTION_GET_BITMAP:{
				//Called after requesting the image of a voice effect
				const data = json.actionObject.result;
				if(data) {
					const img = data.transparent ?? data.default ?? data.selected;
					const voiceID = json.actionObject.voiceID as string;
					const prom = this._voiceIdImageToPromise[voiceID];
					if(prom?.resolve) prom.resolve(img);
					this._voiceIdToImage[voiceID] = img;
				}
				break;

			}
			case VoicemodWebSocket.EVENT_VOICE_CHANGED_EVENT_V3:
			case VoicemodWebSocket.EVENT_VOICE_CHANGED_EVENT:{
				const voice = this._voicesList.find(v=>v.id == json.actionObject.voiceID as string);
				if(voice) {
					this.onVoiceChange(voice);
				}
				break;
			}

			case VoicemodWebSocket.ACTION_TOGGLE_VOICE_CHANGER: {
				this._voiceChangerState = json.actionObject.value === true;
				break;
			}
			case VoicemodWebSocket.EVENT_VOICE_CHANGER_ON: {
				this._voiceChangerState = true;
				break;
			}
			case VoicemodWebSocket.EVENT_VOICE_CHANGER_OFF: {
				this._voiceChangerState = false;
				break;
			}

			case VoicemodWebSocket.ACTION_TOGGLE_HEAR_MYSELF:
				//This is called both when we request the status and when we change it
				this._hearMyselfState = json.actionObject.value === true;
				break;

			default:
				// console.log("🎤Voicemod: unhandled actionType "+json.actionType);
				// console.log(json);
		}
	}

	/**
	 * Check if voices and memes list are laoded and resolves the
	 * connect promise.
	 */
	private checkInitComplete():void {
		if(this._voicesList.length > 0 && this._soundsboards.length > 0) {
			this._initResolver();
			this.connected.value = true;
		}
	}

	/**
	 * Populates given voice image
	 * @param voice
	 */
	private async populateImageProp(voice:VoicemodTypes.Voice):Promise<void> {
		for (const v of this.voices) {
			if(v.id == voice.id) {
				try {
					const img = await this.getBitmapForVoice(v.id);
					v.image = voice.image = img;
				}catch(error){}
			}
		}
	}

	private async onVoiceChange(voice:VoicemodTypes.Voice):Promise<void> {
		await this.populateImageProp(voice);
		this._currentVoiceEffect = (voice.id != VoicemodWebSocket.NO_FILTER_ID && voice.id != VoicemodWebSocket.NO_FILTER_ID_V3)? voice : null;
		StoreProxy.voice.voicemodCurrentVoice = this._currentVoiceEffect;
		StoreProxy.labels.updateLabelValue("VOICEMOD_EFFECT_TITLE", voice.friendlyName);
		StoreProxy.labels.updateLabelValue("VOICEMOD_EFFECT_ICON",  "data:image/png;base64,"+voice.image || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");
		PublicAPI.instance.broadcast("VOICEMOD_VOICE_CHANGE", {voice:voice.id});
		this.dispatchEvent(new VoicemodEvent(VoicemodEvent.VOICE_CHANGE, voice.id, voice.friendlyName));
	}

}
