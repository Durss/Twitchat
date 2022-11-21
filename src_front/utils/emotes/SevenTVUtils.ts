import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";

/**
* Created : 25/01/2022 
*/
export default class SevenTVUtils {

	private static _instance:SevenTVUtils;

	private enabled = false;
	private emotesLoaded = false;
	private channelList:string[] = [];
	private globalEmotesHashmaps:{[key:string]:SevenTVEmote} = {};
	private channelEmotesHashmaps:{[key:string]:{[key:string]:SevenTVEmote}} = {};
	
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

	/**
	 * Get full emotes list
	 */
	public get emotes():TwitchatDataTypes.Emote[] {
		const res:TwitchatDataTypes.Emote[] = [];
		for (const key in this.globalEmotesHashmaps) {
			const e = this.globalEmotesHashmaps[key];
			res.push({
				id: e.id,
				code: e.name,
				is_public:false,
				images: {
					url_1x: e.urls[0]?.[1] ?? "",
					url_2x: e.urls[1]?.[1] ?? e.urls[0]?.[1] ?? "",
					url_4x: e.urls[e.urls.length-1][0]?.[1],
				},
				platform:"twitch",
			});
		}
		for (const chanId in this.channelEmotesHashmaps) {
			const chan = this.channelEmotesHashmaps[chanId];
			for (const key in chan) {
				const e = chan[key];
				res.push({
					id: e.id,
					code: e.name,
					is_public:false,
					images: {
						url_1x: e.urls[0]?.[1] ?? "",
						url_2x: e.urls[1]?.[1] ?? e.urls[0]?.[1] ?? "",
						url_4x: e.urls[e.urls.length-1][0]?.[1],
					},
					platform:"twitch",
				});
			}
		}
		return res;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Adds a channel to the list of SevenTV emotes to load
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
		const allEmotes:SevenTVEmote[] = [];
		const emotesDone:{[key:string]:boolean} = {};
		const chunks = message.split(/\s/);
		for (let i = 0; i < chunks.length; i++) {
			const txt = chunks[i];
			if(this.globalEmotesHashmaps[txt]) {
				const emote = this.globalEmotesHashmaps[txt];
				if(emote && emotesDone[emote.name] !== true) {
					allEmotes.push( emote );
					emotesDone[emote.name] = true;
				}
			}
			//TODO parse only the emotes from the channel the message was posted to
			for (const key in this.channelEmotesHashmaps) {
				const emote = this.channelEmotesHashmaps[key][txt];
				if(emote && emotesDone[emote.name] !== true) {
					allEmotes.push( emote );
					emotesDone[emote.name] = true;
				}
			}
		}

		//Parse global emotes
		for (let i = 0; i < allEmotes.length; i++) {
			const e = allEmotes[i];
			if(!e.name) continue;//apparently some emotes have no name...
			const name = e.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");//Escape regexp specific cahrs
			const matches = [...message.matchAll(new RegExp(name, "gi"))];
			
			if(matches && matches.length > 0) {
				//Current emote has been found
				//Generate fake emotes data in the expected format:
				//  ID:start-end,start-end/ID:start-end,start-end
				let tmpTag = "7TV_"+e.id+":";
				let emoteCount = 0;
				for (let j = 0; j < matches.length; j++) {
					const start = (matches[j].index as number);
					const end = start+e.name.length-1;

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
	 * Get a SevenTV emote data from its code
	 * @param code 
	 * @returns 
	 */
	public getEmoteFromCode(code:string):SevenTVEmote|null {
		if(this.globalEmotesHashmaps[code]) {
			return this.globalEmotesHashmaps[code];
		}
		for (const key in this.channelEmotesHashmaps) {
			const list = this.channelEmotesHashmaps[key];
			if(this.channelEmotesHashmaps[key][code]) {
				return this.channelEmotesHashmaps[key][code];
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
			const json = (await res.json()) as SevenTVEmote[];
			json.forEach(e => {
				this.globalEmotesHashmaps[e.name] = e;
			});
		}catch(error) {
			//
		}
	}
	
	private async loadChannelEmotes(channelId:string):Promise<void> {
		try {
			const res = await fetch("https://api.7tv.app/v2/users/"+channelId+"/emotes");
			const json = (await res.json()) as SevenTVEmote[];
			this.channelEmotesHashmaps[channelId] = {};
			json.forEach(e => {
				this.channelEmotesHashmaps[channelId][e.name] = e;
			});
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