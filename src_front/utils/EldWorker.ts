import { TranslatableLanguagesMap } from "@/TranslatableLanguages";

export type EldModel = "extrasmall" | "small" | "medium" | "large";

export type Language = (typeof TranslatableLanguagesMap)[keyof typeof TranslatableLanguagesMap];

//ELD returns iso1 codes. Its "ku" is Kurdish in arabic script, which is Sorani
const ISO1_TO_LANGUAGE: { [iso1: string]: Language } = {
	...Object.fromEntries(Object.values(TranslatableLanguagesMap).map((v) => [v.iso1, v])),
	ku: TranslatableLanguagesMap.ckb,
};

/**
 * Executes ELD lib in a worker to avoid blocking main thread
 * Created : 02/11/2026
 */
export default class EldWorker {
	private static _instance: EldWorker;

	private _model: EldModel = "extrasmall";
	private _worker: Worker | null = null;
	private _increment: number = 0;
	private _idToCallback: {
		[key: string]: (language: Language | undefined, reliable: boolean) => void;
	} = {};

	constructor() {}

	/********************
	 * GETTER / SETTERS *
	 ********************/
	static get instance(): EldWorker {
		if (!EldWorker._instance) {
			EldWorker._instance = new EldWorker();
		}
		return EldWorker._instance;
	}

	/******************
	 * PUBLIC METHODS *
	 ******************/
	/**
	 * Changes the model used by next detections.
	 * Frees the current one from memory and drops pending detections.
	 */
	public setModel(model: EldModel): void {
		if (model == this._model) return;
		this._model = model;
		this.stop();
	}

	/**
	 * Detects the language of a text.
	 * "language" is undefined if nothing was found or if it's not a translatable language.
	 * It's only a guess if "reliable" is false.
	 */
	public detect(
		text: string,
		callback: (language: Language | undefined, reliable: boolean) => void,
	): void {
		const id = "eld_" + this._increment++;
		this._idToCallback[id] = callback;
		this._worker ??= this.start();
		this._worker.postMessage({ text, id });
	}

	/**
	 * Frees the worker from memory and drops pending detections.
	 * It's started back on next detection.
	 */
	public stop(): void {
		this._worker?.terminate();
		this._worker = null;
		this._idToCallback = {};
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/
	/**
	 * Only called on first detection as loading a model is expensive
	 * and it may be changed before that
	 */
	private start(): Worker {
		const worker = new Worker(`/eld_worker_${this._model}.js`);
		worker.onmessage = (event) => {
			const message = event.data;
			const callback = this._idToCallback[message.id];
			if (!callback) return;
			delete this._idToCallback[message.id];
			callback(ISO1_TO_LANGUAGE[message.result[0]?.[0]], message.reliable as boolean);
		};
		//No reply will ever come if it failed, release callbacks and retry on next detection
		worker.onerror = (event) => {
			console.error("ELD worker failed:", event.message);
			this.stop();
		};
		return worker;
	}
}
