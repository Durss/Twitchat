/**
* Created : 02/05/2022 
*/
export default class FFZUtils {

	private static _instance:FFZUtils;

	private enabled:boolean = false;
	private emotesLoaded:boolean = false;
	private channelList:string[] = [];
	private globalEmotes:FFZEmote[] = [];
	private channelEmotes:{[key:string]:FFZEmote[]} = {};
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():FFZUtils {
		if(!FFZUtils._instance) {
			FFZUtils._instance = new FFZUtils();
		}
		return FFZUtils._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Adds a channel to the list of FFZ emotes to load
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
			const name = e.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			const matches = [...message.matchAll(new RegExp(name, "gi"))];
			if(matches && matches.length > 0) {
				//Current emote has been found
				//Generate fake emotes data in the expected format:
				//  ID:start-end,start-end/ID:start-end,start-end
				fakeTag += "FFZ_"+e.id+":";
				for (let j = 0; j < matches.length; j++) {
					const start = (matches[j].index as number);
					const end = start+e.name.length-1;

					const prevOK = start == 0 || /\s/.test(message.charAt(start-1));
					const nextOK = end == message.length-1 || /\s/.test(message.charAt(end+1));
					//Emote has no space before and after or is not at the start or end of the message
					//ignore it.
					if(!prevOK || !nextOK) continue;
					fakeTag += start+"-"+end;

					if(j < matches.length-1) fakeTag+=",";
				}
				if(i < allEmotes.length -1 ) fakeTag +="/"
			}
		}

		return fakeTag;
	}

	/**
	 * Get a FFZ emote data from its code
	 * //TODO optimize accesses with a hashmap
	 * @param code 
	 * @returns 
	 */
	public getEmoteFromCode(code:string):FFZEmote|null {
		code = code.toLowerCase();
		for (let i = 0; i < this.globalEmotes.length; i++) {
			const e = this.globalEmotes[i];
			if(e.name.toLowerCase() == code) return e;
		}
		for (const key in this.channelEmotes) {
			const list = this.channelEmotes[key];
			for (let i = 0; i < list.length; i++) {
				const e = list[i];
				if(e.name.toLowerCase() == code) return e;
			}
		}
		return null;
	}

	/**
	 * Enables FFZ emotes
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
	 * Disable FFZ emotes
	 */
	public async disable():Promise<void> {
		this.enabled = false;
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	private async loadGlobalEmotes():Promise<void> {
		try {
			const res = await fetch("https://api.frankerfacez.com/v1/set/global");
			const json = await res.json();
			if(json.sets) {
				let emotes:FFZEmote[] = [];
				for (const key in json.sets) {
					if(json.sets[key]?.emoticons.length > 0) {
						emotes = emotes.concat(json.sets[key].emoticons)
					}
				}
				this.globalEmotes = emotes;
			}
		}catch(error) {
			//
		}
	}
	
	private async loadChannelEmotes(channelId:string):Promise<void> {
		try {
			const res = await fetch("https://api.frankerfacez.com/v1/room/id/"+channelId);
			const json = await res.json();
			if(json.sets) {
				let emotes:FFZEmote[] = [];
				for (const key in json.sets) {
					if(json.sets[key]?.emoticons.length > 0) {
						emotes = emotes.concat(json.sets[key].emoticons)
					}
				}
				this.channelEmotes[channelId] = emotes;
			}
		}catch(error) {
			//
		}
	}
}

interface FFZEmote {
	id: number;
	name: string;
	height: number;
	width: number;
	public: boolean;
	hidden: boolean;
	modifier: boolean;
	offset?: unknown;
	margins?: unknown;
	css?: unknown;
	owner: {
		_id: number;
		name: string;
		display_name: string;
	};
	urls: {
		1: string;
		2: string;
		4: string;
	};
	status: number;
	usage_count: number;
	created_at: Date;
	last_updated: Date;
}