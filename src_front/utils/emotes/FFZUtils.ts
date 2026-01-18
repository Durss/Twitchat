import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";

/**
* Created : 02/05/2022 
*/
export default class FFZUtils {

	private static _instance:FFZUtils;

	private enabled = false;
	private emotesLoaded = false;
	private channelList:string[] = [];
	private globalEmotesHashmaps:{[key:string]:FFZEmote} = {};
	private channelEmotesHashmaps:{[key:string]:{[key:string]:FFZEmote}} = {};
	
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
				id: e.id.toString(),
				code: e.name,
				is_public:false,
				images: {
					url_1x: e.urls[1] || "",
					url_2x: e.urls[2] || e.urls[1] || "",
					url_4x: e.urls[4] || e.urls[2] || e.urls[1] || "",
				},
				platform:"twitch",
				source:"FFZ"
			});
		}
		for (const chanId in this.channelEmotesHashmaps) {
			const chan = this.channelEmotesHashmaps[chanId];
			for (const key in chan) {
				const e = chan[key]!;
				if(emotesDone[e.id]) continue;
				emotesDone[e.id] = true;
				res.push({
					id: e.id.toString(),
					code: e.name,
					is_public:false,
					images: {
						url_1x: e.urls[1] || "",
						url_2x: e.urls[2] || e.urls[1] || "",
						url_4x: e.urls[4] || e.urls[2] || e.urls[1] || "",
					},
					platform:"twitch",
					source:"FFZ"
				});
			}
		}
		return res;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Adds a channel to the list of FFZ emotes to load
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
		const allEmotes:FFZEmote[] = [];
		const emotesDone:{[key:string]:boolean} = {};
		const chunks = message.split(/\s/);
		for (const txt of chunks) {
			if(this.globalEmotesHashmaps[txt]) {
				const emote = this.globalEmotesHashmaps[txt];
				if(emote && emotesDone[emote.name] !== true) {
					allEmotes.push( emote );
					emotesDone[emote.name] = true;
				}
			}
			//TODO parse only the emotes from the channel the message was posted to
			for (const key in this.channelEmotesHashmaps) {
				const emote = this.channelEmotesHashmaps[key]![txt];
				if(emote && emotesDone[emote.name] !== true) {
					allEmotes.push( emote );
					emotesDone[emote.name] = true;
				}
			}
		}

		//Parse global emotes
		for (let i = 0; i < allEmotes.length; i++) {
			const e = allEmotes[i]!;
			const name = e.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
			const matches = [...message.matchAll(new RegExp(name, "gi"))];
			if(matches && matches.length > 0) {
				//Current emote has been found
				//Generate fake emotes data in the expected format:
				//  ID:start-end,start-end/ID:start-end,start-end
				// fakeTag += "FFZ_"+e.id+":";
				let tmpTag = "FFZ_"+e.id+":";
				let emoteCount = 0;
				for (let j = 0; j < matches.length; j++) {
					const start = (matches[j]!.index as number);
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
	 * Get a FFZ emote data from its code
	 * @param code 
	 * @returns 
	 */
	public getEmoteFromCode(code:string):FFZEmote|null {
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
	 * Enables FFZ emotes
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
				emotes.forEach(e => {
					this.globalEmotesHashmaps[e.name] = e;
				});
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
				this.channelEmotesHashmaps[channelId] = {};
				emotes.forEach(e => {
					this.channelEmotesHashmaps[channelId]![e.name] = e;
				});
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