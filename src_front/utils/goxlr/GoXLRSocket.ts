import { EventDispatcher } from "@/events/EventDispatcher";
import GoXLRSocketEvent from "@/events/GoXLRSocketEvent";
import DataStore from "@/store/DataStore";
import type { GoXLRTypes } from "@/types/GoXLRTypes";
import { reactive } from "vue";

/**
* Created : 06/07/2023 
*/
export default class GoXLRSocket extends EventDispatcher {

	private static _instance:GoXLRSocket;
	
	public connected: boolean = false;
	
	private _initResolver!: Function;
	private _connecting!: boolean;
	private _socket!: WebSocket;
	private _autoReconnect: boolean = false;
	private _id:number = 1;
	private _idToPromiseResolver:{[id:number]:<T>(data:T) => void} = {};
	private _deviceId:string = "";
	private _status:GoXLRTypes.Status | null = null;
	private _currentFXIndex:number = 0;
	private _buttonStates:Partial<{[key in GoXLRTypes.ButtonTypesData]:boolean|number}> = {};
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

	public get status():GoXLRTypes.Mixer|null { return this._status? this._status.mixers[this._deviceId] : null; }

	public get isGoXLRMini():boolean { return this.status?.hardware.device_type == "Mini" || true; }
	
	public get fxEnabled():boolean { return this.status?.effects.is_enabled || false; }
	
	/**
	 * Sets the currently active preset index (0 <-> 5)
	 * @param name
	 */
	public set activeEffectPreset(index:number) {
		const name = ["Preset1","Preset2","Preset3","Preset4","Preset5","Preset6"][index];
		this.execCommand("SetActiveEffectPreset", name);
	}

	/**
	 * Gets the currently active preset index (0 <-> 5)
	 * @param name
	 */
	public get activeEffectPreset():number { return this._currentFXIndex; }
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public connect(ip:string="127.0.0.1", port:number=14564): Promise<void> {
		if(this.connected) return Promise.resolve();
		if(this._connecting) return Promise.resolve();
		this._connecting = true;
		DataStore.set(DataStore.GOXLR_IP, ip);
		DataStore.set(DataStore.GOXLR_PORT, port);
		return new Promise((resolve, reject) => {
			this._initResolver = resolve;
			this._socket = new WebSocket(`ws://${ip}:${port}/api/websocket`);

			this._socket.onopen = () => {
				console.log("🎤 GoXLR connection succeed");
				this.getDeviceStatus();
			};

			this._socket.onmessage = (event:any) => this.onSocketMessage(event);

			this._socket.onclose = (e) => {
				if(this.connected) {
					console.log("🎤 GoXLR connection lost");
				}
				this._connecting = false;
				this.connected = false;
				if(this._autoReconnect) {
					try {
						this.connect(ip, port);
					}catch(error) {
						console.log(error);
						reject(error);
					}
				}
			}
		
			this._socket.onerror = (e) => {
				this._connecting = false;
				reject(e);
			}
		});
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
	 * Enable/Disable FX
	 * @param enabled
	 */
	public setFXEnabled(enabled:boolean):Promise<unknown> { return this.execCommand("SetFXEnabled", enabled); }

	/**
	 * Set the value of a rotary button in percent.
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
	public setRotaryValue(id:Extract<GoXLRTypes.ButtonTypesData, "gender"|"echo"|"pitch"|"reverb">, percent:number):Promise<unknown> {
		const idToCommand:Partial<{[key in GoXLRTypes.ButtonTypesData]:GoXLRCommands}> = {
			gender:"SetGenderAmount",
			echo:"SetEchoAmount",
			pitch:"SetPitchAmount",
			reverb:"SetReverbAmount",
		}
		const cmd = idToCommand[id];
		if(!cmd) return Promise.reject();
		let min = 0;
		let max = 100;
		//Define custom ranges for pitch and gender depending on configurations.
		if(id === "pitch") {
			if(this._pitchMode == "Narrow") {
				min = -12;
				max = 12;
				//If HardTune is enabled it restrict possible values to only 3
				if(this._buttonStates.HardTune) percent = Math.round(percent*2)/2;
			}
			if(this._pitchMode == "Wide") {
				min = -24;
				max = 24;
				//If HardTune is enabled it restrict possible values to only 5
				if(this._buttonStates.HardTune) percent = Math.round(percent*4)/4;
			}
		}
		if(id === "gender") {
			if(this._pitchMode == "Narrow") {
				min = -12;
				max = 12;
			}
			if(this._pitchMode == "Medium") {
				min = -25;
				max = 25;
			}
			if(this._pitchMode == "Wide") {
				min = -50;
				max = 50;
			}
		}
		let value = Math.round(percent * (max - min) + min);
		return this.execCommand(cmd, value);
	}

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

					//Handle FX enable/disable
					if(c == "effects" && chunks[j+1] === "is_enabled") {
						const isEnabled = patch.value == true;
						const type = isEnabled? GoXLRSocketEvent.FX_ENABLED : GoXLRSocketEvent.FX_DISABLED;
						this.dispatchEvent(new GoXLRSocketEvent(type, this._currentFXIndex));
					}

					//Handle button press/release
					if(c == "button_down") {
						const isPressed = patch.value == true;
						const type = isPressed? GoXLRSocketEvent.BUTTON_PRESSED : GoXLRSocketEvent.BUTTON_RELEASED;
						const buttonId = chunks[j+1] as GoXLRTypes.ButtonTypesData;
						this._buttonStates[buttonId] = isPressed;
						this.dispatchEvent(new GoXLRSocketEvent(type, buttonId));
					}
					
					//Handle rotary buttons
					if(["echo","gender","reverb","pitch"].indexOf(c)) {
						const value = patch.value;
						this.dispatchEvent(new GoXLRSocketEvent(GoXLRSocketEvent.ROTARY, c as GoXLRTypes.ButtonTypesData, value));
					}

					//Handle sampler playback complete
					if(c == "sampler" && path.indexOf("is_playing") > -1) {
						if(patch.value === true) continue;
						const bankId = "Bank"+chunks[j+2] as Extract<GoXLRTypes.ButtonTypesData, "BankA"|"BankB"|"BankC">;
						const buttonId = chunks[j+3] as Extract<GoXLRTypes.ButtonTypesData, "TopLeft"|"TopRight"|"BottomLeft"|"BottomRight">;
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
		const prom = new Promise<{Status:GoXLRTypes.Status}>((resolve, reject) => {
			this._idToPromiseResolver[id] = <T>(data:T) => resolve(data as {Status:GoXLRTypes.Status});
		});
		prom.then(result => {
			console.log(result.Status);
			this._deviceId = Object.keys(result.Status.mixers)[0];
			if(!this._deviceId) {
				console.error("🎤 No GoXLR device found");
			}else{
				console.error("🎤 GoXLR device ID is", this._deviceId);
			}
			//If no status was loaded yet, execute init promise resolver
			if(!this._status) {
				this._connecting = false;
				this.connected = true;
				this._autoReconnect = true;
				const mixer = result.Status.mixers[this._deviceId];
				if(mixer) {
					this._currentFXIndex = parseInt(mixer.effects.active_preset.replace(/\D/gi, "") || "1") - 1;
					//Initialize buttons states
					this._buttonStates.Bleep = mixer.button_down.Bleep;
					this._buttonStates.Cough = mixer.button_down.Cough;
					this._buttonStates.BankA = mixer.button_down.SamplerSelectA;
					this._buttonStates.BankB = mixer.button_down.SamplerSelectB;
					this._buttonStates.BankC = mixer.button_down.SamplerSelectA;
					this._buttonStates.BottomLeft = mixer.button_down.SamplerBottomLeft;
					this._buttonStates.BottomRight = mixer.button_down.SamplerBottomRight;
					this._buttonStates.TopLeft = mixer.button_down.SamplerTopLeft;
					this._buttonStates.TopRight = mixer.button_down.SamplerTopRight;
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
					this._buttonStates.FX = mixer.button_down.EffectFx;
					this._buttonStates.HardTune = mixer.button_down.EffectHardTune;
					this._buttonStates.Robot = mixer.button_down.EffectRobot;
					this._buttonStates.Megaphone = mixer.button_down.EffectMegaphone;
					this._buttonStates.Clear = mixer.button_down.SamplerClear;
					this._buttonStates.pitch = mixer.effects.current.pitch.amount;
					this._buttonStates.gender = mixer.effects.current.gender.amount;
					this._buttonStates.reverb = mixer.effects.current.reverb.amount;
					this._buttonStates.echo = mixer.effects.current.echo.amount;
					this._genderMode = mixer.effects.current.gender.style as "Narrow"|"Medium"|"Wide";
					this._pitchMode = mixer.effects.current.pitch.style as "Narrow"|"Medium"|"Wide";
				}
				this._initResolver();
			}
			this._status = reactive(result.Status);
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