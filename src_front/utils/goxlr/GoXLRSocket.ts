import { EventDispatcher } from "@/events/EventDispatcher";
import GoXLRSocketEvent from "@/events/GoXLRSocketEvent";
import StoreProxy from "@/store/StoreProxy";
import type { GoXLRTypes } from "@/types/GoXLRTypes";
import { rebuildPlaceholdersCache } from "@/types/TriggerActionDataTypes";
import { reactive } from "vue";

/**
* Created : 06/07/2023 
*/
export default class GoXLRSocket extends EventDispatcher {

	private static _instance:GoXLRSocket;
	
	public connected: boolean = false;
	public status:GoXLRTypes.Mixer|null = null; 
	public isGoXLRMini:boolean = false; 
	public fxEnabled:boolean = false; 
	
	private _initResolver!: Function;
	private _connecting!: boolean;
	private _currentProfile!: string;
	private _profileList: string[] = [];
	private _connectingPromise: Promise<boolean>|null= null;
	private _socket!: WebSocket;
	private _autoReconnect: boolean = false;
	private _id:number = 1;
	private _idToPromiseResolver:{[id:number]:<T>(data:T) => void} = {};
	private _deviceId:string = "";
	private _status:GoXLRTypes.Status | null = null;
	private _currentFXIndex:number = 0;
	private _buttonStates:Partial<{[key in GoXLRTypes.ButtonTypesData]:boolean|number}> = {};
	private _toggleStates:Partial<{[key in GoXLRTypes.ButtonTypesData]:boolean|number}> = {};
	private _pitchMode:"Narrow"|"Medium"|"Wide" = "Narrow";
	private _genderMode:"Narrow"|"Medium"|"Wide" = "Narrow";
	
	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():GoXLRSocket {
		if(!GoXLRSocket._instance) {
			GoXLRSocket._instance = reactive(new GoXLRSocket()) as GoXLRSocket;
			GoXLRSocket._instance.initialize();
		}
		return GoXLRSocket._instance;
	}
	
	/**
	 * Sets the currently active preset index (0 => 5)
	 * @param name
	 */
	public set activeEffectPreset(index:number) {
		const name = ["Preset1","Preset2","Preset3","Preset4","Preset5","Preset6"][index];
		this.execCommand("SetActiveEffectPreset", name);
	}

	/**
	 * Gets the currently active preset index (0 => 5)
	 */
	public get activeEffectPreset():number { return this._currentFXIndex; }

	/**
	 * Get all available profiles
	 */
	public get profileList():string[] { return this._profileList; }

	/**
	 * Get current profile
	 */
	public get currentProfile():string { return this._currentProfile; }
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public connect(ip:string="127.0.0.1", port:number=14564): Promise<boolean> {
		if(!StoreProxy.auth.isPremium) {
			return Promise.reject("not premium");
		}

		if(this.connected) return Promise.resolve(true);
		if(this._connecting && this._connectingPromise) return this._connectingPromise;
		this._connecting = true;
		StoreProxy.params.setGoXLRConnectParams(ip, port);
		this._connectingPromise = new Promise((resolve, reject) => {
			this._initResolver = resolve;
			this._socket = new WebSocket(`ws://${ip}:${port}/api/websocket`);

			this._socket.onopen = () => {
				console.log("🎤 GoXLR connection succeed");
				this._connectingPromise = null;
				this.getDeviceStatus();
				rebuildPlaceholdersCache();
			};

			this._socket.onmessage = (event:any) => this.onSocketMessage(event);

			this._socket.onclose = (e) => {
				if(this.connected) {
					console.log("🎤 GoXLR connection lost");
				}
				this._connecting = false;
				this.connected = false;
				this._connectingPromise = null;
				rebuildPlaceholdersCache();
				if(this._autoReconnect) {
					try {
						window.setTimeout(()=> {
							this.connect(ip, port);
						}, 1000)
					}catch(error) {
						console.log(error);
						resolve(false);
					}
				}
			}
		
			this._socket.onerror = (e) => {
				this._connecting = false;
				console.log("🎤 GoXLR connection failed");
				resolve(false);
			}
		});
		return this._connectingPromise;
	}

	/**
	 * Disconnects socket
	 */
	public disconnect():void {
		this._autoReconnect = false;
		if(this.connected) {
			this._socket.close();
		}
		this._status = null;
		this._connecting = false;
		this.connected = false;
	}

	/**
	 * Get a button's value.
	 * Returns a boolean with true if the button is pressed.
	 * Returns a number for encoders
	 * @param buttonId 
	 */
	public getButtonState(buttonId:GoXLRTypes.ButtonTypesData):boolean|number {
		return this._buttonStates[buttonId] ?? false;
	}

	/**
	 * Get if a toggle button is active
	 * @param buttonId 
	 */
	public getIsToggleButtonActive(buttonId:GoXLRTypes.ButtonTypesData):boolean|number {
		return this._toggleStates[buttonId] ?? false;
	}

	/**
	 * Get an input's voluùe
	 * @param inputId 
	 */
	public getInputVolume(inputId:keyof GoXLRTypes.Volumes):number {
		if(!this.status) return 0;
		return this.status!.levels.volumes[inputId];
	}

	/**
	 * Enable/Disable FX
	 * @param enabled
	 */
	public async setFXEnabled(enabled:boolean):Promise<unknown> { return this.execCommand("SetFXEnabled", enabled); }

	/**
	 * Set the value of a encoder button in percent.
	 * 
	 * Actual values for reverb and echo knobs:
	 * ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
	 * 0 => 100
	 * 
	 * 
	 * Actual values for pitch knob:
	 * ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
	 * Narrow:	-12 => 12
	 * Wide:	-24 => 24
	 * Narrow + hard tune:	[-12, 0, 12]
	 * Wide + hard tune:	[-24, -12, 0, 12, 24]
	 * 
	 * 
	 * Actual values for gender knob:
	 * ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
	 * Narrow:	-12 => 12
	 * Medium:	-25 => 25
	 * Wide:	-50 => 50
	 * 
	 * @param id
	 * @param percent
	 */
	public async setEncoderPercentValue(id:Extract<GoXLRTypes.ButtonTypesData, "gender"|"echo"|"pitch"|"reverb">, percent:number):Promise<unknown> {
		const idToCommand:Partial<{[key in GoXLRTypes.ButtonTypesData]:GoXLRCommands}> = {
			gender:"SetGenderAmount",
			echo:"SetEchoAmount",
			pitch:"SetPitchAmount",
			reverb:"SetReverbAmount",
		}
		const cmd = idToCommand[id];
		if(!cmd) return Promise.reject("[GoXLRSocket] Command "+cmd+" not found");
		let min = 0;
		let max = 100;
		//Define custom ranges for pitch and gender depending on configurations.
		if(id === "pitch") {
			if(this._pitchMode == "Narrow") {
				min = -12;
				max = 12;
				//If HardTune is enabled it restrict possible values to only 3
				if(this._buttonStates.EffectHardTune) percent = Math.round(percent*2)/2;
			}
			if(this._pitchMode == "Wide") {
				min = -24;
				max = 24;
				//If HardTune is enabled it restrict possible values to only 5
				if(this._buttonStates.EffectHardTune) percent = Math.round(percent*4)/4;
			}
		}
		if(id === "gender") {
			if(this._genderMode == "Narrow") {
				min = -12;
				max = 12;
			}
			if(this._genderMode == "Medium") {
				min = -25;
				max = 25;
			}
			if(this._genderMode == "Wide") {
				min = -50;
				max = 50;
			}
		}
		const value = Math.round(percent * (max - min) + min);
		return this.execCommand(cmd, value);
	}

	/**
	 * Set the value of a encoder button.
	 * 
	 * Actual values for reverb and echo knobs:
	 * ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
	 * 0 => 100
	 * 
	 * 
	 * Actual values for pitch knob:
	 * ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
	 * Narrow:	-12 => 12
	 * Wide:	-24 => 24
	 * Narrow + hard tune:	[-12, 0, 12]
	 * Wide + hard tune:	[-24, -12, 0, 12, 24]
	 * 
	 * 
	 * Actual values for gender knob:
	 * ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
	 * Narrow:	-12 => 12
	 * Medium:	-25 => 25
	 * Wide:	-50 => 50
	 * 
	 * @param id
	 * @param value
	 */
	public async setEncoderValue(id:Extract<GoXLRTypes.ButtonTypesData, "gender"|"echo"|"pitch"|"reverb">, value:number):Promise<unknown> {
		const idToCommand:Partial<{[key in GoXLRTypes.ButtonTypesData]:GoXLRCommands}> = {
			gender:"SetGenderAmount",
			echo:"SetEchoAmount",
			pitch:"SetPitchAmount",
			reverb:"SetReverbAmount",
		}
		const cmd = idToCommand[id];
		if(!cmd) return Promise.reject("[GoXLRSocket] Command "+cmd+" not found");
		return this.execCommand(cmd, value);
	}

	/**
	 * Get all possible values for the specified encoder.
	 * Values can change depending on the "hard tune" state
	 * @param id 
	 */
	public getEncoderPossibleValues(id:Extract<GoXLRTypes.ButtonTypesData, "gender"|"echo"|"pitch"|"reverb">):{step:number, values:number[]} {
		let min = 0;
		let max = 100;
		let step = 1;
		if(id == "echo") step = 4;
		if(id == "reverb") step = 5;
		//Define custom ranges for pitch and gender depending on configurations.
		if(id === "pitch") {
			if(this._pitchMode == "Narrow") {
				min = -24;
				max = 24;
				step = 2;
				//If HardTune is enabled it restrict possible values to only 3
				if(this._buttonStates.EffectHardTune) {
					min = -1;
					max = 1;
					step = 1;
				}
			}
			if(this._pitchMode == "Wide") {
				min = -24;
				max = 24;
				step = 1;
				//If HardTune is enabled it restrict possible values to only 5
				if(this._buttonStates.EffectHardTune) {
					min = -2;
					max = 2;
					step = 1;
				}
			}
		}
		if(id === "gender") {
			if(this._genderMode == "Narrow") {
				min = -12;
				max = 12;
				step = 1;
			}
			if(this._genderMode == "Medium") {
				min = -25;
				max = 25;
				step = 1;
			}
			if(this._genderMode == "Wide") {
				min = -50;
				max = 50;
				step = 2;
			}
		}

		const res:number[] = [];
		for (let i = min; i < max; i ++) res.push(i);
		return {step, values:res};
	}

	/**
	 * Play a sample
	 * @param bank 
	 * @param sample 
	 */
	public async playSample(bank:"A"|"B"|"C", sample:"BottomLeft"|"TopLeft"|"BottomRight"|"TopRight"):Promise<unknown> { return this.execCommand("PlaySampleByIndex", [bank, sample, 0]); }

	/**
	 * Sets the cough state
	 * @param state 
	 */
	public async setCoughState(state:boolean):Promise<unknown> { return this.execCommand("SetCoughIsHold", state); }

	/**
	 * Set active FX preset
	 * @param index 0->5
	 */
	public async setActiveFxPreset(index:number):Promise<unknown> { return this.execCommand("SetActiveEffectPreset", "Preset"+(index+1)); }

	/**
	 * Sets the gender style
	 * @param style 
	 */
	public setGenderStyle(style:"Narrow"|"Medium"|"Wide"):Promise<unknown> { return this.execCommand("SetGenderStyle", style); }

	/**
	 * Sets the echo effect amount
	 * Between 0 and 100
	 * @param style 
	 */
	public setEchoStyle(style:"Quarter"|"Eighth"|"MultiTap"|"Triplet"|"PingPong"|"ClassicSlap"):Promise<unknown> { return this.execCommand("SetEchoStyle", style); }

	/**
	 * Sets the echo effect left delay in milliseconds
	 * Between 0 and 2500
	 * @param millis 
	 */
	public setEchoDelayLeft(millis:number):Promise<unknown> { return this.execCommand("SetEchoDelayLeft", millis); }

	/**
	 * Sets the echo effect right delay in milliseconds
	 * Between 0 and 2500
	 * @param millis 
	 */
	public setEchoDelayRight(millis:number):Promise<unknown> { return this.execCommand("SetEchoDelayRight", millis); }

	/**
	 * Sets the echo effect feedback
	 * Between 0 and 100
	 * @param percent 
	 */
	public setEchoFeedback(percent:number):Promise<unknown> { return this.execCommand("SetEchoFeedback", percent); }

	/**
	 * Sets the echo effect left feedback
	 * Between 0 and 100
	 * @param percent 
	 */
	public setEchoFeedbackLeft(percent:number):Promise<unknown> { return this.execCommand("SetEchoFeedbackLeft", percent); }

	/**
	 * Sets the echo effect right feedback
	 * Between 0 and 100
	 * @param percent 
	 */
	public setEchoFeedbackRight(percent:number):Promise<unknown> { return this.execCommand("SetEchoFeedbackRight", percent); }

	/**
	 * Sets the echo effect XFB left to right
	 * Between 0 and 100
	 * @param percent 
	 */
	public setEchoFeedbackXFBLtoR(percent:number):Promise<unknown> { return this.execCommand("SetEchoFeedbackRight", percent); }

	/**
	 * Sets the echo effect XFB right to left
	 * Between 0 and 100
	 * @param percent 
	 */
	public setEchoFeedbackXFBRtoL(percent:number):Promise<unknown> { return this.execCommand("SetEchoFeedbackXFBRtoL", percent); }

	/**
	 * Sets the echo effect tempo in BPMs
	 * Between 45 and 300
	 * @param bmp
	 */
	public setEchoTempo(bpm:number):Promise<unknown> { return this.execCommand("SetEchoTempo", bpm); }

	/**
	 * Sets a fader's value
	 * Between 0 and 254
	 * @param fader
	 * @param value (0 => 254)
	 */
	public setFaderValue(fader:GoXLRTypes.InputTypesData, value:number):Promise<unknown> { return this.execCommand("SetVolume", [fader, Math.min(254, Math.max(0, value))]); }

	/**
	 * Switch to the given profile
	 * @param profile
	 */
	public setProfile(profile:string):Promise<unknown> { return this.execCommand("LoadProfile", [profile, true]); }
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
	}

	/**
	 * Execute a command
	 * 
	 * @param command 
	 * @param data 
	 */
	private execCommand(command:GoXLRCommands, data?:unknown):Promise<unknown> {
		return new Promise((resolve, reject) => {
			const id = this._id ++;
			this._idToPromiseResolver[id] = resolve;

			const cmdChunks:unknown[] = [this._deviceId];
			if(data != undefined) {
				const values:{[id:string]:unknown} = {};
				values[command] = data;
				cmdChunks.push(values);
			}
			const json = {id, data:{Command:cmdChunks}};
			this._socket.send(JSON.stringify(json));
		})
	}

	/**
	 * Called when a message is received from Voicemod app
	 */
	private onSocketMessage(event:any):void {
		const json:any = JSON.parse(event.data);

		if(json.Error) {
			console.error("🎤 GoXLR error", json);
		}else
		if (json.id && this._idToPromiseResolver[json.id]) {
			//Resolve related promise
			this._idToPromiseResolver[json.id](json.data);
			delete this._idToPromiseResolver[json.id];
		}
		if(json.id && json.data?.Patch) {
			for (let i = 0; i < json.data.Patch.length; i++) {
				const patch = json.data.Patch[i];
				const path = patch.path as string;
				const chunks = path.split("/");
				for (let j = 0; j < chunks.length; j++) {
					const c = chunks[j];

					//Handle profile update
					if(c == "profile_name") {
						this._currentProfile = patch.value;
					}else

					//Handle profile update
					if(c == "profiles") {
						this.getDeviceStatus();
					}else

					//Handle FX enable/disable
					if(c == "effects" && chunks[j+1] === "is_enabled") {
						const isEnabled = patch.value == true;
						this.fxEnabled = isEnabled;
						this._toggleStates.EffectFx = isEnabled;
						const type = isEnabled? GoXLRSocketEvent.FX_ENABLED : GoXLRSocketEvent.FX_DISABLED;
						this.dispatchEvent(new GoXLRSocketEvent(type, this._currentFXIndex));
					}else

					//Handle FX enable/disable
					if(c == "effects" && chunks[j+3] === "is_enabled") {
						const id = chunks[j+2]
						let btId:GoXLRTypes.ButtonTypesData|null = null;
						switch(id) {
							case "megaphone": btId = "EffectMegaphone"; break;
							case "robot": btId = "EffectRobot"; break;
							case "hard_tune": btId = "EffectHardTune"; break;
						}
						if(btId) this._toggleStates[btId] = patch.value;
					}else

					//Handle current FX preset change
					if(c == "effects" && chunks[j+1] === "active_preset") {
						this._currentFXIndex = ["Preset1", "Preset2", "Preset3", "Preset4", "Preset5", "Preset6"].indexOf(patch.value);
					}else

					//Handle fader mute/unmute
					if(c == "fader_status" && chunks[j+2] === "mute_state") {
						const muted = patch.value !== "Unmuted";
						const key = chunks[j+1] as "A"|"B"|"C"|"D";
						const hashmap:{[key in "A"|"B"|"C"|"D"]:1|2|3|4} = { A:1, B:2, C:3, D:4 };
						const faderIndex = hashmap[key];
						const type = muted? GoXLRSocketEvent.FADER_MUTE : GoXLRSocketEvent.FADER_UNMUTE;
						const hashmap2:{[key in "A"|"B"|"C"|"D"]:GoXLRTypes.ButtonTypesData} = { A:"Fader1Mute", B:"Fader2Mute", C:"Fader3Mute", D:"Fader4Mute" };
						const faderId = hashmap2[key] as GoXLRTypes.ButtonTypesData;
						this._toggleStates[faderId] = muted
						this.dispatchEvent(new GoXLRSocketEvent(type, faderIndex));
					}else

					//Handle fader value update
					if(c == "levels" && chunks[j+1] === "volumes") {
						const input = chunks[j+2] as GoXLRTypes.InputTypesData
						this.status!.levels.volumes[input] = patch.value;
						this.dispatchEvent(new GoXLRSocketEvent(GoXLRSocketEvent.FADER_VOLUME, input, patch.value));
					}else

					//Handle button press/release
					if(c == "button_down") {
						const isPressed = patch.value == true;
						const type = isPressed? GoXLRSocketEvent.BUTTON_PRESSED : GoXLRSocketEvent.BUTTON_RELEASED;
						const buttonId = chunks[j+1] as GoXLRTypes.ButtonTypesData;
						this._buttonStates[buttonId] = isPressed;
						this.dispatchEvent(new GoXLRSocketEvent(type, buttonId));
					}else
					
					//Handle encoders
					if(["echo","gender","reverb","pitch"].indexOf(c) > -1 && chunks[j+1] === "amount") {
						const bt = c as GoXLRTypes.ButtonTypesData;
						const value = patch.value;
						const prevValue = this.getButtonState(bt) as number;
						this._buttonStates[bt] = value;
						this.dispatchEvent(new GoXLRSocketEvent(GoXLRSocketEvent.ENCODER, bt, value, prevValue, this._currentFXIndex));
					}else

					//Handle sampler playback complete
					if(c == "sampler" && path.indexOf("is_playing") > -1) {
						if(patch.value === true) continue;
						const bankId = "SamplerSelect"+chunks[j+2] as Extract<GoXLRTypes.ButtonTypesData, "SamplerSelectA"|"SamplerSelectB"|"SamplerSelectC">;
						const buttonId = "Sampler"+chunks[j+3] as Extract<GoXLRTypes.ButtonTypesData, "SamplerTopLeft"|"SamplerTopRight"|"SamplerBottomLeft"|"SamplerBottomRight">;
						this.dispatchEvent(new GoXLRSocketEvent(GoXLRSocketEvent.SAMPLE_PLAYBACK_COMPLETE, bankId, buttonId));
					}
				}
			}
		}
	}

	/**
	 * Get the current device status
	 */
	private getDeviceStatus():Promise<{Status:GoXLRTypes.Status}> {
		//Request connected device list
		const id = this._id ++;
		const prom = new Promise<{Error?:string, Status:GoXLRTypes.Status}>((resolve, reject) => {
			this._idToPromiseResolver[id] = <T>(data:T) => resolve(data as {Status:GoXLRTypes.Status});
		});
		prom.then(result => {
			if(result.Error || !result.Status) {
				console.error("🎤 No GoXLR device found");
				console.log(result);
				this.connected = true;
				return
			}

			this._deviceId = Object.keys(result.Status.mixers ?? {})[0];
			if(!this._deviceId) {
				console.error("🎤 No GoXLR device found");
				console.log(result);
				this.connected = true;
				return
			}

			console.log("🎤 GoXLR device ID is", this._deviceId);
			const mixer = result.Status.mixers[this._deviceId];
			if(mixer) {
				this._currentFXIndex = parseInt(mixer.effects.active_preset.replace(/\D/gi, "") || "1") - 1;
				//Initialize buttons states
				this._buttonStates.Bleep = mixer.button_down.Bleep;
				this._buttonStates.Cough = mixer.button_down.Cough;
				this._buttonStates.SamplerSelectA = mixer.button_down.SamplerSelectA;
				this._buttonStates.SamplerSelectB = mixer.button_down.SamplerSelectB;
				this._buttonStates.SamplerSelectC = mixer.button_down.SamplerSelectA;
				this._buttonStates.SamplerBottomLeft = mixer.button_down.SamplerBottomLeft;
				this._buttonStates.SamplerBottomRight = mixer.button_down.SamplerBottomRight;
				this._buttonStates.SamplerTopLeft = mixer.button_down.SamplerTopLeft;
				this._buttonStates.SamplerTopRight = mixer.button_down.SamplerTopRight;
				this._buttonStates.EffectSelect1 = mixer.button_down.EffectSelect1;
				this._buttonStates.EffectSelect2 = mixer.button_down.EffectSelect2;
				this._buttonStates.EffectSelect3 = mixer.button_down.EffectSelect3;
				this._buttonStates.EffectSelect4 = mixer.button_down.EffectSelect4;
				this._buttonStates.EffectSelect5 = mixer.button_down.EffectSelect5;
				this._buttonStates.EffectSelect6 = mixer.button_down.EffectSelect6;
				this._buttonStates.Fader1Mute = mixer.button_down.Fader1Mute;
				this._buttonStates.Fader2Mute = mixer.button_down.Fader2Mute;
				this._buttonStates.Fader3Mute = mixer.button_down.Fader3Mute;
				this._buttonStates.Fader4Mute = mixer.button_down.Fader4Mute;
				this._buttonStates.EffectFx = mixer.button_down.EffectFx;
				this._buttonStates.EffectHardTune = mixer.button_down.EffectHardTune;
				this._buttonStates.EffectRobot = mixer.button_down.EffectRobot;
				this._buttonStates.EffectMegaphone = mixer.button_down.EffectMegaphone;
				this._buttonStates.SamplerClear = mixer.button_down.SamplerClear;
				this._buttonStates.pitch = mixer.effects.current.pitch.amount;
				this._buttonStates.gender = mixer.effects.current.gender.amount;
				this._buttonStates.reverb = mixer.effects.current.reverb.amount;
				this._buttonStates.echo = mixer.effects.current.echo.amount;
				this._genderMode = mixer.effects.current.gender.style as "Narrow"|"Medium"|"Wide";
				this._pitchMode = mixer.effects.current.pitch.style as "Narrow"|"Medium"|"Wide";
				
				this._toggleStates.EffectHardTune = mixer.effects.current.hard_tune.is_enabled;
				this._toggleStates.EffectRobot = mixer.effects.current.robot.is_enabled;
				this._toggleStates.EffectMegaphone = mixer.effects.current.megaphone.is_enabled;
				this._toggleStates.Fader1Mute = mixer.fader_status.A.mute_state !== "Unmuted";
				this._toggleStates.Fader2Mute = mixer.fader_status.B.mute_state !== "Unmuted";
				this._toggleStates.Fader3Mute = mixer.fader_status.C.mute_state !== "Unmuted";
				this._toggleStates.Fader4Mute = mixer.fader_status.D.mute_state !== "Unmuted";
			}
			//If no status was loaded yet, execute init promise resolver
			if(!this._status) {
				this._connecting = false;
				this.connected = true;
				this._autoReconnect = true;
				this._initResolver(true);
			}
			this._status = reactive(result.Status)!;
			this.status = this._status? this._status.mixers[this._deviceId] : null;
			if(this.status) {
				this.isGoXLRMini = this.status?.hardware.device_type == "Mini";
				this.fxEnabled = this.status.effects.is_enabled || false;
				this._currentProfile = this.status.profile_name;
			}
			this._profileList = this._status.files.profiles;
		});

		this._socket.send(JSON.stringify({id, data:"GetStatus"}));

		return prom;

	}
}


type GoXLRCommands = "NewMicProfile" |
"SaveMicProfile" |
"SaveMicProfileAs" |
"NewProfile" |
"SaveProfile" |
"SaveProfileAs" |
"SetActiveEffectPreset" |
"SetActiveSamplerBank" |
"SetCoughMuteState" |
"SetFaderMuteState" |
"SetFXEnabled" |
"SetHardTuneEnabled" |
"SetMegaphoneEnabled" |
"SetRobotEnabled" |
"SetCoughIsHold" |
"SetCoughMuteFunction" |
"LoadEffectPreset" |
"RenameActivePreset" |
"SaveActivePreset" |
"SetEchoAmount" |
"SetEchoDelayLeft" |
"SetEchoDelayRight" |
"SetEchoFeedback" |
"SetEchoFeedbackLeft" |
"SetEchoFeedbackRight" |
"SetEchoFeedbackXFBLtoR" |
"SetEchoFeedbackXFBRtoL" |
"SetEchoStyle" |
"SetEchoTempo" |
"SetGenderAmount" |
"SetGenderStyle" |
"SetHardTuneAmount" |
"SetHardTuneRate" |
"SetHardTuneSource" |
"SetHardTuneStyle" |
"SetHardTuneWindow" |
"SetMegaphoneAmount" |
"SetMegaphonePostGain" |
"SetMegaphoneStyle" |
"SetPitchAmount" |
"SetPitchCharacter" |
"SetPitchStyle" |
"SetReverbAmount" |
"SetReverbDecay" |
"SetReverbDiffuse" |
"SetReverbEarlyLevel" |
"SetReverbHighColour" |
"SetReverbHighFactor" |
"SetReverbLowColour" |
"SetReverbModDepth" |
"SetReverbModSpeed" |
"SetReverbPreDelay" |
"SetReverbStyle" |
"SetReverbTailLevel" |
"SetRobotDryMix" |
"SetRobotFreq" |
"SetRobotGain" |
"SetRobotPulseWidth" |
"SetRobotThreshold" |
"SetRobotWaveform" |
"SetRobotWidth" |
"SetFader" |
"SetFaderMuteFunction" |
"SetScribbleIcon" |
"SetScribbleInvert" |
"SetScribbleNumber" |
"SetScribbleText" |
"SetSwearButtonVolume" |
"SetDeeser" |
"SetMonitorMix" |
"SetSubMixEnabled" |
"SetSubMixLinked" |
"SetSubMixOutputMix" |
"SetSubMixVolume" |
"SetVolume" |
"SetButtonColours" |
"SetButtonGroupColours" |
"SetButtonOffStyle" |
"SetButtonGroupOffStyle" |
"SetEncoderColour" |
"SetAllFaderColours" |
"SetAllFaderDisplayStyle" |
"SetFaderColours" |
"SetAnimationMode" |
"SetAnimationMod1" |
"SetAnimationMod2" |
"SetAnimationWaterfall" |
"SetFaderDisplayStyle" |
"SetSampleColour" |
"SetSampleOffStyle" |
"SetSimpleColour" |
"SetMicrophoneGain" |
"SetMicrophoneType" |
"SetCompressorAttack" |
"SetCompressorMakeupGain" |
"SetCompressorRatio" |
"SetCompressorReleaseTime" |
"SetCompressorThreshold" |
"SetEqFreq" |
"SetEqGain" |
"SetEqMiniFreq" |
"SetEqMiniGain" |
"SetGateActive" |
"SetGateAttack" |
"SetGateAttenuation" |
"SetGateRelease" |
"SetGateThreshold" |
"SetRouter" |
"AddSample" |
"PlaySampleByIndex" |
"RemoveSampleByIndex" |
"SetSamplerFunction" |
"SetSamplerOrder" |
"SetSampleStartPercent" |
"SetSampleStopPercent" |
"SetSamplerPreBufferDuration" |
"ClearSampleProcessError" |
"SetMuteHoldDuration" |
"SetVCMuteAlsoMuteCM" |
"SetElementDisplayMode" |
"LoadMicProfile" |
"DeleteMicProfile" |
"LoadProfile" |
"DeleteProfile" |
"SetShutdownCommands" |
"SetShutdownCommands";