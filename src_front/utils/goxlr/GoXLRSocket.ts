import type { GoXLRTypes } from "@/types/GoXLRTypes";
import { reactive } from "vue";

/**
* Created : 06/07/2023 
*/
export default class GoXLRSocket {

	private static _instance:GoXLRSocket;
	
	public connected: boolean = false;
	
	private _initResolver!: Function;
	private _connecting!: boolean;
	private _socket!: WebSocket;
	private _autoReconnect: boolean = false;
	private _id:number = 1;
	private _idToPromise:{[id:number]:(data:unknown) => void} = {};
	private _deviceId:string = "";
	private _status:GoXLRTypes.Status | null = null;
	
	constructor() {
	
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
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public connect(ip:string="127.0.0.1", port:number=14564): Promise<void> {
		if(this.connected) return Promise.resolve();
		if(this._connecting) return Promise.resolve();
		this._connecting = true;
		return new Promise((resolve, reject) => {
			this._initResolver = resolve;
			this._socket = new WebSocket(`ws://${ip}:${port}/api/websocket`);

			this._socket.onopen = () => {
				console.log("🎤 GoXLR connection succeed");
				this._connecting = false;
				this.connected = true;
				this._autoReconnect = true;

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

	/**
	 * Disconnects socket
	 */
	public disconnect():void {
		this._autoReconnect = false;
		if(this.connected) {
			this._socket.close();
		}
		this.connected = false;
	}

	/**
	 * Sets the gender style
	 * @param style 
	 */
	public setGenderStyle(style:"Narrow"|"Medium"|"Wide"):Promise<unknown> { return this.execCommand("SetGenderStyle", style); }

	/**
	 * Sets the gender effect amount
	 * Between -12 and 12 for "Narrow" style
	 * Between -25 and 25 for "Medium" style
	 * Between -50 and 50 for "Wide" style
	 * @param style 
	 */
	public setGenderAmount(style:number):Promise<unknown> { return this.execCommand("SetGenderAmount", style); }

	/**
	 * Sets the echo effect amount
	 * Between 0 and 100
	 * @param style 
	 */
	public setEchoStyle(style:"Quarter"|"Eighth"|"MultiTap"|"Triplet"|"PingPong"|"ClassicSlap"):Promise<unknown> { return this.execCommand("SetEchoStyle", style); }

	/**
	 * Sets the echo effect amount
	 * Between 0 and 100
	 * @param amount 
	 */
	public setEchoAmount(amount:number):Promise<unknown> { return this.execCommand("SetEchoAmount", amount); }

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
			const cmdChunks:unknown[] = [this._deviceId];
			if(data) {
				const values:{[id:string]:unknown} = {};
				values[command] = data;
				cmdChunks.push(values);
			}
			const json = {id,"data":{"Command":cmdChunks}};
			this._socket.send(JSON.stringify(json));
			this._idToPromise[id] = resolve;
		})
	}

	/**
	 * Called when a message is received from Voicemod app
	 */
	private onSocketMessage(event:any):void {
		const json:any = JSON.parse(event.data).data;

		if(json.Error) {
			console.error("🎤 GoXLR error status", json);
		}else
		if (json.id && this._idToPromise[json.id]) {
			//Resolve related promise
			this._idToPromise[json.id](json);
		}
	}

	/**
	 * Get the current device status
	 */
	private getDeviceStatus():Promise<GoXLRTypes.Status> {
		//Request connected device list
		const id = this._id ++;
		this._socket.send(JSON.stringify({"id":id,"data":"GetStatus"}));
		return new Promise((resolve) => {
			new Promise((resolve, reject)=> {
				this._idToPromise[id] = resolve;
			}).then(result => {
				const castResult = result as {Status:GoXLRTypes.Status};
				this._deviceId = Object.keys(castResult.Status.mixers)[0];
				//If no status was loaded yet, execute init promise resolver
				if(!this._status) {
					this._initResolver();
				}
				this._status = castResult.Status;
				resolve(this._status);
			})
		})

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