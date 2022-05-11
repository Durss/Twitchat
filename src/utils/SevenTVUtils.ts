
/**
* Created : 25/01/2022 
*/
export default class SevenTVUtils {

	private static _instance:SevenTVUtils;

	private enabled:boolean = false;
	private emotesLoaded:boolean = false;
	private channelList:string[] = [];
	private globalEmotes:SevenTVEmote[] = [];
	private channelEmotes:{[key:string]:SevenTVEmote[]} = {};
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():SevenTVUtils {
		if(!SevenTVUtils._instance) {
			SevenTVUtils._instance = new SevenTVUtils();
		}
		return SevenTVUtils._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Adds a channel to the list of SevenTV emotes to load
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
			if(!e.name) continue;//apparently some emotes have no name...
			const name = e.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			const matches = [...message.matchAll(new RegExp("(^|\\s?)"+name+"(\\s|$)", "g"))];
			
			if(matches && matches.length > 0) {
				//Current emote has been found
				//Generate fake emotes data in the expected format:
				//  ID:start-end,start-end/ID:start-end,start-end
				fakeTag += "7TV_"+e.id+":";
				for (let j = 0; j < matches.length; j++) {
					const index = (matches[j].index as number);
					fakeTag += index+"-"+(index+e.name.length);
					if(j < matches.length-1) fakeTag+=",";
				}
				if(i < allEmotes.length -1 ) fakeTag +="/"
			}
		}

		return fakeTag;
	}

	/**
	 * Get a SevenTV emote data from its code
	 * //TODO optimize accesses with a hashmap
	 * @param code 
	 * @returns 
	 */
	public getEmoteFromCode(code:string):SevenTVEmote|null {
		for (let i = 0; i < this.globalEmotes.length; i++) {
			const e = this.globalEmotes[i];
			if(e.name == code) return e;
		}
		for (const key in this.channelEmotes) {
			const list = this.channelEmotes[key];
			for (let i = 0; i < list.length; i++) {
				const e = list[i];
				if(e.name == code) return e;
			}
		}
		return null;
	}

	/**
	 * Enables SevenTV emotes
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
	 * Disable SevenTV emotes
	 */
	public async disable():Promise<void> {
		this.enabled = false;
	}
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	private async loadGlobalEmotes():Promise<void> {
		try {
			const res = await fetch("https://api.7tv.app/v2/emotes/global");
			const json = await res.json();
			this.globalEmotes = json;
		}catch(error) {
			//
		}
	}
	
	private async loadChannelEmotes(channelId:string):Promise<void> {
		try {
			const res = await fetch("https://api.7tv.app/v2/users/"+channelId+"/emotes");
			const json:SevenTVEmote[] = await res.json();
			this.channelEmotes[channelId] = json;
		}catch(error) {
			//
		}
	}
}

interface SevenTVEmote {
	id:string;
	name:string;
	width:number[];
	height:number[];
	urls:[string, string][];
}