import type { Language } from "lande";
import Utils from "./Utils";

/**
 * Executes Lande lib in a worker to avoid blocking main thread
 * Created : 01/03/2024
 */
export default class LandeWorker {
	private static _instance: LandeWorker;

	private _worker: Worker | null = null;
	private _idToCallback: { [key: string]: (result: [Language, number][]) => void } = {};

	constructor() {}

	/********************
	 * GETTER / SETTERS *
	 ********************/
	static get instance(): LandeWorker {
		if (!LandeWorker._instance) {
			LandeWorker._instance = new LandeWorker();
		}
		return LandeWorker._instance;
	}

	/******************
	 * PUBLIC METHODS *
	 ******************/
	/**
	 * Starts an interval
	 */
	public lande(text: string, callback: (result: [Language, number][]) => void): string {
		const id = Utils.getUUID();
		this._idToCallback[id] = callback;
		this._worker ??= this.start();
		this._worker.postMessage({ text, id });
		return id;
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
	private start(): Worker {
		const worker = new Worker("/lande_worker.js");
		worker.onmessage = (event) => {
			const message = event.data;
			const callback = this._idToCallback[message.id];
			if (!callback) return;
			delete this._idToCallback[message.id];
			callback(message.result as [Language, number][]);
		};
		return worker;
	}
}
