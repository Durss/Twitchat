import StoreProxy from "./StoreProxy";

export default class TTSUtils {

	private static _instance:TTSUtils;

	private enabled:boolean = false;
	private voices:SpeechSynthesisVoice[] = [];
	private overflow: boolean = false;
	
	constructor() {
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():TTSUtils {
		if(!TTSUtils._instance) {
			TTSUtils._instance = new TTSUtils();
			window.speechSynthesis.onvoiceschanged = () => {
				this._instance.voices = window.speechSynthesis.getVoices();
				StoreProxy.store.state.params.tts.voice.listValues = this._instance.voices.map(x => { return {label:x.name, value:x.name} });
			};
		}
		
		return TTSUtils._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
    /**
     * Get voices list
     * 
     * @returns SpeechSynthesisVoice[]
     */
    public getVoices():SpeechSynthesisVoice[] {
		return this.voices;
    }

	public speakText(user: string | undefined, text: string):void {
		const paramsTTS = StoreProxy.store.state.params.tts;

		this.overflow = this.overflow && window.speechSynthesis.pending;
		if (this.overflow) {
			return;
		}
		
		let spokenText = user ? user + ' ' + paramsTTS.separator.value + ' ' + text : text;
		if (paramsTTS.removeURL.value) {
			spokenText = spokenText.replace(/(http[s]?|ftp):[^ ]*/g, paramsTTS.replaceURL.value);
		}

		spokenText = spokenText.substring(0, paramsTTS.maxLength.value || Number.MAX_VALUE);
		const mess = new SpeechSynthesisUtterance(spokenText);
		mess.rate = paramsTTS.rate.value;
		mess.pitch = paramsTTS.pitch.value;
		mess.volume = paramsTTS.volume.value;
		mess.voice = this.voices.find(x => x.name == paramsTTS.voice.value) || this.voices[0];
		mess.lang = mess.voice.lang;
		
		let wroteTime = performance.now();
		mess.onstart = (ev: SpeechSynthesisEvent) => {
			this.overflow = performance.now() - wroteTime > paramsTTS.overflow.value * 1000;
		};

		window.speechSynthesis.speak(mess);		
	}
	
}
