/**
 * This provides a way to get a setInterval that keeps executing even when
 * the tab is in the background
* Created : 01/03/2024
*/
export default class SetTimeoutWorker {

	private static _instance:SetTimeoutWorker;

	private _worker!:Worker;
	private _increment:number = 0;
	private _idToCallback:{[key:string]:()=>void} = {};

	constructor() {

	}

	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():SetTimeoutWorker {
		if(!SetTimeoutWorker._instance) {
			SetTimeoutWorker._instance = new SetTimeoutWorker();
			SetTimeoutWorker._instance.initialize();
		}
		return SetTimeoutWorker._instance;
	}



	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Starts an interval
	 */
	public create(callback:()=>void, duration:number):string {
		const id = "tow_"+(this._increment ++);
		this._idToCallback[id] = callback;
		this._worker.postMessage({ command: "startTimeout", timeout: duration, id });
		return id;
	}

	/**
	 * Stops an interval by id
	 */
	public delete(id:string):void {
		this._worker.postMessage({ command: "stopTimeout", id });
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		this._worker = new Worker("/timeout_worker.js");
		this._worker.onmessage = (event) => {
			const message = event.data;
			if (message.type === "timeoutMessage") {
				if(!this._idToCallback[message.data]) return;
				this._idToCallback[message.data]!();
			}
		};

	}
}
