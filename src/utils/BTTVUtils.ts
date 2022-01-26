import { TwitchTypes } from "./TwitchUtils";

/**
* Created : 25/01/2022 
*/
export default class BTTVUtils {

	private static _instance:BTTVUtils;

	private enabled:boolean = false;
	private emotesLoaded:boolean = false;
	private channelList:string[] = [];
	private globalEmotes:BTTVEmote[] = [];
	private channelEmotes:{[key:string]:BTTVEmote[]} = {};
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():BTTVUtils {
		if(!BTTVUtils._instance) {
			BTTVUtils._instance = new BTTVUtils();
		}
		return BTTVUtils._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Adds a channel to the list of BTTV emotes to load
	 */
	public addChannel(channelId:string):void {
		this.channelList.push(channelId);
		this.emotesLoaded = false;
	}

	/**
	 * Generates a fake IRC emote tag for future emotes parsing.
	 * 
	 * @param message 
	 * @returns string
	 */
	public generateEmoteTag(message:string):string {
		if(!this.enabled) return "";

		let fakeTag = "";
		let allEmotes = this.globalEmotes.concat();
		//TODO parse only the emotes from the channel the message was posted to
		for (const key in this.channelEmotes) {
			allEmotes = allEmotes.concat(this.channelEmotes[key]);
		}

		//Parse global emotes
		for (let i = 0; i < allEmotes.length; i++) {
			const e = allEmotes[i];
			const name = e.code.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			const matches = [...message.matchAll(new RegExp("(^|\\s?)"+name+"(\\s|$)", "g"))];
			if(matches && matches.length > 0) {
				//Current emote has been found
				//Generate fake emotes data in the expected format:
				//  ID:start-end,start-end/ID:start-end,start-end
				fakeTag += "BTTV_"+e.id+":";
				for (let i = 0; i < matches.length; i++) {
					const index = (matches[i].index as number);
					fakeTag += index+"-"+(index+e.code.length);
					if(i < matches.length-1) fakeTag+=",";
				}
			}
		}

		return fakeTag;
	}

	/**
	 * Get a BTTV emote data from its code
	 * //TODO optimize accesses with a hashmap
	 * @param code 
	 * @returns 
	 */
	public getEmoteFromCode(code:string):BTTVEmote|null {
		for (let i = 0; i < this.globalEmotes.length; i++) {
			const e = this.globalEmotes[i];
			if(e.code == code) return e;
		}
		for (const key in this.channelEmotes) {
			const list = this.channelEmotes[key];
			for (let i = 0; i < list.length; i++) {
				const e = list[i];
				if(e.code == code) return e;
			}
		}
		console.log("Code", code);
		return null;
	}

	/**
	 * Enables BTTV emotes
	 * Loads up the necessary emotes
	 */
	public async enable():Promise<void> {
		if(!this.emotesLoaded) {
			await this.loadGlobalEmotes();
			for (let i = 0; i < this.channelList.length; i++) {
				await this.loadChannelEmotes( this.channelList[i] );
			}
		}
		this.enabled = true;
		this.emotesLoaded = true;
	}

	/**
	 * Disable BTTV emotes
	 */
	public async disable():Promise<void> {
		this.enabled = false;
	}
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	private async loadGlobalEmotes():Promise<void> {
		try {
			const res = await fetch("https://api.betterttv.net/3/cached/emotes/global");
			const json = await res.json();
			this.globalEmotes = json;
		}catch(error) {
			//
		}
	}
	
	private async loadChannelEmotes(channelId:string):Promise<void> {
		try {
			const res = await fetch("https://api.betterttv.net/3/cached/users/twitch/"+channelId);
			const json = await res.json();
			if(json.channelEmotes) {
				this.channelEmotes[channelId] = json.channelEmotes;
			}
		}catch(error) {
			//
		}
	}
}

interface BTTVEmote {
	code:string;
	id:string;
	imageType:string;
	userId:string;
}