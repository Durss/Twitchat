import { JSFXRSoundPreset } from "@/types/jsfxr";
import SetTimeoutWorker from "./SeTimeoutWorker";

/**
* Created : 31/07/2025 
*/
export default class SFXRUtils {

	private static _instance:SFXRUtils;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():SFXRUtils {
		if(!SFXRUtils._instance) {
			SFXRUtils._instance = new SFXRUtils();
		}
		return SFXRUtils._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/

	/**
	 * Plays a SFXR sound from a stringified JSON object or encoded string
	 * @param data 
	 * @returns 
	 */
	public static playSFXRFromString(data:typeof JSFXRSoundPreset[number] | string): {promise:Promise<boolean>, audio:AudioBufferSourceNode} {
		let duration_s = 0;
		let audio!: AudioBufferSourceNode

		if(JSFXRSoundPreset.includes(data as typeof JSFXRSoundPreset[number])) {
			const params = window.jsfxr.sfxr.generate(data as typeof JSFXRSoundPreset[number]);
			audio = window.jsfxr.sfxr.play(params);
			duration_s = audio.buffer?.duration || 0.1;
		}else{
			let parsed = "";
			// If a sharable URL is given, extract the sound data
			if(data.indexOf("http") === 0) {
				parsed = data.split("#")[1];
			}
			if(!parsed) {
				// Check if it's a JSON string and parse it
				try {
					parsed = JSON.parse(data);
				}catch(e) {
					// Not a JSON string, assume it's an encoded string
					parsed = data;
				}
			}
			try {
				const sound = window.jsfxr.sfxr.toAudio(parsed);
				audio = sound.play();
				duration_s = audio.buffer?.duration || 0.1;
			}catch(e) {
				console.error(e);
			}
		}
		const promise = duration_s == 0? Promise.resolve<boolean>(false) : new Promise<boolean>((resolve, reject)=>{
			SetTimeoutWorker.instance.create(()=>resolve(true), duration_s * 1000);
		});

		return { promise, audio };
	}
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}