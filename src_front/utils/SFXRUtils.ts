import { JSFXRSoundPreset } from "@/types/jsfxr";
import SetTimeoutWorker from "./SetTimeoutWorker";

/**
* Created : 31/07/2025 
*/
export default class SFXRUtils {

	private static _instance:SFXRUtils;
	private static _scriptsLoaded: boolean = false;
	private static _loadingPromise: Promise<void> | null = null;
	
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
	 * Dynamically loads the required JSFXR and RiffWave scripts
	 * @returns Promise that resolves when both scripts are loaded
	 */
	public static async loadScripts(): Promise<void> {
		if (SFXRUtils._scriptsLoaded) {
			return Promise.resolve();
		}

		if (SFXRUtils._loadingPromise) {
			return SFXRUtils._loadingPromise;
		}

		SFXRUtils._loadingPromise = new Promise<void>((resolve, reject) => {
			const scriptsToLoad = ['/riffwave.js', '/jsfxr.js'];
			let loadedCount = 0;
			let hasError = false;

			const onScriptLoad = () => {
				loadedCount++;
				if (loadedCount === scriptsToLoad.length && !hasError) {
					SFXRUtils._scriptsLoaded = true;
					SFXRUtils._loadingPromise = null;
					resolve();
				}
			};

			const onScriptError = (error: any) => {
				if (!hasError) {
					hasError = true;
					SFXRUtils._loadingPromise = null;
					reject(new Error(`Failed to load JSFXR scripts: ${error}`));
				}
			};

			scriptsToLoad.forEach(src => {
				// Check if script is already loaded
				if (document.querySelector(`script[src="${src}"]`)) {
					onScriptLoad();
					return;
				}

				const script = document.createElement('script');
				script.src = src;
				script.type = 'text/javascript';
				script.onload = onScriptLoad;
				script.onerror = onScriptError;
				document.head.appendChild(script);
			});
		});

		return SFXRUtils._loadingPromise;
	}

	/**
	 * Plays a SFXR sound from a stringified JSON object or encoded string
	 * @param data 
	 * @param volume 0-100
	 * @returns 
	 */
	public static async playSFXRFromString(data:Exclude<typeof JSFXRSoundPreset[number], "custom"> | string, volume:number = 100, autoLoadScripts:boolean = true): Promise<{completePromise:Promise<boolean>, audio:AudioBufferSourceNode | null}> {
		if(autoLoadScripts) {
			console.log("Preloading JSFXR scripts before playing sound");
			try {
				// Ensure scripts are loaded before proceeding
				await SFXRUtils.loadScripts();
			} catch (error) {
				console.error('Failed to load JSFXR scripts:', error);
				return { 
					completePromise: Promise.resolve(false), 
					audio: null 
				};
			}
		}

		let duration_s = 0;
		let audio!: AudioBufferSourceNode

		if(JSFXRSoundPreset.includes(data as typeof JSFXRSoundPreset[number])) {
			console.log("Playing SFXR sound from preset:", data);
			const params = window.jsfxr.sfxr.generate(data as typeof JSFXRSoundPreset[number]);
			params.sound_vol = (params.sound_vol ||.25) * volume / 100;
			audio = window.jsfxr.sfxr.play(params);
			duration_s = audio.buffer?.duration || 0.1;
		}else{
			console.log("Playing SFXR sound from string data:", data);
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
				sound.setVolume(volume / 100);
				audio = sound.play();
				duration_s = audio.buffer?.duration || 0.1;
			}catch(e) {
				console.error(e);
			}
		}
		const promise = duration_s == 0? Promise.resolve<boolean>(false) : new Promise<boolean>((resolve, reject)=>{
			SetTimeoutWorker.instance.create(()=>resolve(true), duration_s * 1000);
		});

		return { completePromise: promise, audio };
	}

	/**
	 * Preloads the required JSFXR and RiffWave scripts
	 * Call this method early in your application lifecycle to avoid delays on first sound playback
	 * @returns Promise that resolves when both scripts are loaded
	 */
	public static async preloadScripts(): Promise<void> {
		return SFXRUtils.loadScripts();
	}
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}