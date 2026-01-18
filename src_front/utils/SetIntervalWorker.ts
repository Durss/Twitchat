import Utils from "./Utils";

/**
 * This provides a way to get a setInterval that keeps executing even when
 * the tab is in the background
* Created : 01/03/2024 
*/
export default class SetIntervalWorker {

	private static _instance:SetIntervalWorker;
	
	private _worker!:Worker;
	private _idToCallback:{[key:string]:()=>void} = {};
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():SetIntervalWorker {
		if(!SetIntervalWorker._instance) {
			SetIntervalWorker._instance = new SetIntervalWorker();
			SetIntervalWorker._instance.initialize();
		}
		return SetIntervalWorker._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Starts an interval
	 */
	public create(callback:()=>void, duration:number):string {
		const id = Utils.getUUID();
		this._idToCallback[id] = callback;
		this._worker.postMessage({ command: "startInterval", interval: duration, id });
		return id;
	}

	/**
	 * Stops an interval by id
	 */
	public delete(id:string):void {
		this._worker.postMessage({ command: "stopInterval", id });
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		this._worker = new Worker("/interval_worker.js");
		this._worker.onmessage = (event) => {
			const message = event.data;
			if (message.type === "intervalMessage") {
				if(!this._idToCallback[message.data]) return;
				this._idToCallback[message.data]!();
			}
		};
		
	}
}