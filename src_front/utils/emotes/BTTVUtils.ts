import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";

/**
* Created : 25/01/2022 
*/
export default class BTTVUtils {

	private static _instance:BTTVUtils;

	private enabled = false;
	private emotesLoaded = false;
	private channelList:string[] = [];
	private globalEmotesHashmaps:{[key:string]:BTTVEmote} = {};
	private channelEmotesHashmaps:{[key:string]:{[key:string]:BTTVEmote}} = {};
	
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

	/**
	 * Get full emotes list
	 */
	public get emotes():TwitchatDataTypes.Emote[] {
		const res:TwitchatDataTypes.Emote[] = [];
		const emotesDone:{[key:string]:boolean} = {};
		for (const key in this.globalEmotesHashmaps) {
			const e = this.globalEmotesHashmaps[key]!;
			if(emotesDone[e.id]) continue;
			emotesDone[e.id] = true;
			res.push({
				id: e.id,
				code: e.code,
				is_public:false,
				images: {
					url_1x: "https://cdn.betterttv.net/emote/"+e.id+"/1x",
					url_2x: "https://cdn.betterttv.net/emote/"+e.id+"/2x",
					url_4x: "https://cdn.betterttv.net/emote/"+e.id+"/3x",
				},
				platform:"twitch",
				source:"BTTV"
			});
		}
		for (const chanId in this.channelEmotesHashmaps) {
			const chan = this.channelEmotesHashmaps[chanId];
			for (const key in chan) {
				const e = chan[key]!;
				if(emotesDone[e.id]) continue;
				emotesDone[e.id] = true;
				res.push({
					id: e.id,
					code: e.code,
					is_public:false,
					images: {
						url_1x: "https://cdn.betterttv.net/emote/"+e.id+"/1x",
						url_2x: "https://cdn.betterttv.net/emote/"+e.id+"/2x",
						url_4x: "https://cdn.betterttv.net/emote/"+e.id+"/3x",
					},
					platform:"twitch",
					source:"BTTV"
				});
			}
		}
		return res;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Adds a channel to the list of BTTV emotes to load
	 */
	public addChannel(channelId:string):void {
		this.channelList.push(channelId);
		if(this.enabled) {
			this.loadChannelEmotes(channelId);
		}
	}

	/**
	 * Generates a fake IRC emote tag for future emotes parsing.
	 * 
	 * @param message 
	 * @returns string
	 */
	public generateEmoteTag(message:string, protectedRanges:boolean[]):string {
		if(!this.enabled) return "";

		let fakeTag = "";
		const allEmotes:BTTVEmote[] = [];
		const emotesDone:{[key:string]:boolean} = {};
		const chunks = message.split(/\s/);
		for (const txt of chunks) {
			if(this.globalEmotesHashmaps[txt]) {
				const emote = this.globalEmotesHashmaps[txt];
				if(emote && emotesDone[emote.code] !== true) {
					allEmotes.push( emote );
					emotesDone[emote.code] = true;
				}
			}
			//TODO parse only the emotes from the channel the message was posted to
			for (const key in this.channelEmotesHashmaps) {
				const emote = this.channelEmotesHashmaps[key]![txt];
				if(emote && emotesDone[emote.code] !== true) {
					allEmotes.push( emote );
					emotesDone[emote.code] = true;
				}
			}
		}

		//Parse all emotes
		for (let i = 0; i < allEmotes.length; i++) {
			const e = allEmotes[i]!;
			const name = e.code.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			const matches = [...message.matchAll(new RegExp(name, "gi"))];
			if(matches && matches.length > 0) {
				//Current emote has been found
				//Generate fake emotes data in the expected format:
				//  ID:start-end,start-end/ID:start-end,start-end
				// fakeTag += "BTTV_"+e.id+":";
				let tmpTag = "BTTV_"+e.id+":";
				let emoteCount = 0;
				for (let j = 0; j < matches.length; j++) {
					const start = (matches[j]!.index as number);
					const end = start+e.code.length-1;

					if(protectedRanges[start] === true) continue;
					if(protectedRanges[end] === true) continue;

					const prevOK = start == 0 || /\s/.test(message.charAt(start-1));
					const nextOK = end == message.length-1 || /\s/.test(message.charAt(end+1));
					//Emote has no space before and after or is not at the start or end of the message
					//ignore it.
					if(!prevOK || !nextOK) continue;
					emoteCount++;
					tmpTag += start+"-"+end;

					if(j < matches.length-1) tmpTag+=",";
				}
				if(emoteCount) {
					fakeTag += tmpTag;
					if(i < allEmotes.length -1 ) fakeTag +="/";
				}
			}
		}

		return fakeTag;
	}

	/**
	 * Get a BTTV emote data from its code
	 * @param code 
	 * @returns 
	 */
	public getEmoteFromCode(code:string):BTTVEmote|null {
		if(this.globalEmotesHashmaps[code]) {
			return this.globalEmotesHashmaps[code];
		}
		for (const key in this.channelEmotesHashmaps) {
			const list = this.channelEmotesHashmaps[key]!;
			if(list[code]) {
				return list[code];
			}
		}
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
				await this.loadChannelEmotes( this.channelList[i]! );
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
			const json = (await res.json()) as BTTVEmote[];
			json.forEach(e => {
				this.globalEmotesHashmaps[e.code] = e;
			});
		}catch(error) {
			//
		}
	}
	
	private async loadChannelEmotes(channelId:string):Promise<void> {
		try {
			const res = await fetch("https://api.betterttv.net/3/cached/users/twitch/"+channelId);
			const json = await res.json();
			let emotes:BTTVEmote[] = [];
			if(json.channelEmotes) {
				emotes = emotes.concat(json.channelEmotes);
			}
			if(json.sharedEmotes) {
				emotes = emotes.concat(json.sharedEmotes);
			}
			this.channelEmotesHashmaps[channelId] = {};
			emotes.forEach(e => {
				this.channelEmotesHashmaps[channelId]![e.code] = e;
			});
		}catch(error) {
			//
		}
	}
}

interface BTTVEmote {
	id:string;
	code:string;
	userId?:string;
	animated:boolean;
	imageType:string;
	user?: {
		id:string;
		name:string;
		displayName:string;
		providerId:string;
	}
}