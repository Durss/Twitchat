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
	
	public get target():unknown {
		return this._target;
	}

	public get type():string {
		return this._type;
	}
}

export class EventDispatcher {
	private _listeners:{type:string, listener:(e:Event)=>void}[];
	constructor() {
		this._listeners = [];
	}

	public hasEventListener(type:string, listener:(e:Event)=>void):boolean {
		let exists = false;
		for (const listenerObj of this._listeners) {
			if (listenerObj.type === type && listenerObj.listener === listener) {
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
			const listener = this._listeners[i]!;
			if (listener.type === typeStr && listener.listener === listenerFunc) {
				this._listeners.splice(i, 1);
			}
		}
	}

	public dispatchEvent (evt:Event):void {
		for (const listenerObj of this._listeners) {
			if (listenerObj.type === evt.type) {
				listenerObj.listener.call(this, evt);
			}
		}
	}
}