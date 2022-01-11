/**
 * EventDispatcher (TypeScript)
 * - Simple extendable event dispatching class
 *
 * @version 0.1.5
 * @author John Vrbanac
 * @license MIT License
 **/
export class Event {
	private _type:string;
	private _target:unknown;

	constructor(type:string, targetObj?:unknown) {
		this._type = type;
		this._target = targetObj;
	}
	
	public getTarget():unknown {
		return this._target;
	}

	public getType():string {
		return this._type;
	}
}

export class EventDispatcher {
	private _listeners:{type:string, listener:(e:Event)=>void}[];
	constructor() {
		this._listeners = [];
	}

	public hasEventListener(type:string, listener:(e:Event)=>void):boolean {
		let exists:boolean = false;
		for (let i = 0; i < this._listeners.length; i++) {
			if (this._listeners[i].type === type && this._listeners[i].listener === listener) {
				exists = true;
			}
		}

		return exists;
	}

	public addEventListener (typeStr:string, listenerFunc:(e:Event)=>void):void {
		if (this.hasEventListener(typeStr, listenerFunc)) {
			return;
		}

		this._listeners.push({type: typeStr, listener: listenerFunc});
	}

	public removeEventListener (typeStr:string, listenerFunc:(e:Event)=>void):void {
		for (let i = 0; i < this._listeners.length; i++) {
			if (this._listeners[i].type === typeStr && this._listeners[i].listener === listenerFunc) {
				this._listeners.splice(i, 1);
			}
		}
	}

	public dispatchEvent (evt:Event):void {
		for (let i = 0; i < this._listeners.length; i++) {
			if (this._listeners[i].type === evt.getType()) {
				this._listeners[i].listener.call(this, evt);
			}
		}
	}
}