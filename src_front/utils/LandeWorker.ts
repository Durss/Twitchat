import type { Language } from "lande";
import Utils from "./Utils";

/**
 * Executes Lande lib in a worker to avoid blocking main thread
* Created : 01/03/2024 
*/
export default class LandeWorker {

	private static _instance:LandeWorker;
	
	private _worker!:Worker;
	private _idToCallback:{[key:string]:(result:[Language, number][])=>void} = {};
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():LandeWorker {
		if(!LandeWorker._instance) {
			LandeWorker._instance = new LandeWorker();
			LandeWorker._instance.initialize();
		}
		return LandeWorker._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Starts an interval
	 */
	public lande(text:string, callback:(result:[Language, number][])=>void):string {
		const id = Utils.getUUID();
		this._idToCallback[id] = callback;
		this._worker.postMessage({ text, id });
		return id;
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		this._worker = new Worker("/lande_worker.js");
		this._worker.onmessage = (event) => {
			const message = event.data;
			if(!this._idToCallback[message.id]) return;
			this._idToCallback[message.id]!(message.result as [Language, number][]);
		};
		
	}
}