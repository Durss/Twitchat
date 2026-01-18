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
		const emotesDone:{[key:string]:boolean} = {};
		for (const key in this.globalEmotesHashmaps) {
			const e = this.globalEmotesHashmaps[key]!;
			if(emotesDone[e.id]) continue;
			emotesDone[e.id] = true;
			const rootURL = e.host.url+"/";
			const urls = e.host.files.filter(v=> v.format == "WEBP");
			res.push({
				id: e.id,
				code: e.name,
				is_public:false,
				images: {
					url_1x: (rootURL + urls[0]!.name) || "",
					url_2x: (rootURL + urls[1]!.name) || (rootURL + urls[0]!.name) || "",
					url_4x: rootURL + urls[urls.length-1]!.name,
				},
				platform:"twitch",
				source:"7TV"
			});
		}
		for (const chanId in this.channelEmotesHashmaps) {
			const chan = this.channelEmotesHashmaps[chanId];
			for (const key in chan) {
				const e = chan[key]!;
				if(emotesDone[e.id]) continue;
				emotesDone[e.id] = true;
				const rootURL = e.host.url+"/";
				const urls = e.host.files.filter(v=> v.format == "WEBP");
				res.push({
					id: e.id,
					code: e.name,
					is_public:false,
					images: {
						url_1x: (rootURL + urls[0]!.name) || "",
						url_2x: (rootURL + urls[1]!.name) || (rootURL + urls[0]!.name) || "",
						url_4x: rootURL + urls[urls.length-1]!.name,
					},
					platform:"twitch",
					source:"7TV"
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
			if(!e.name) continue;//apparently some emotes have no name...
			const name = e.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");//Escape regexp specific chars
			const matches = [...message.matchAll(new RegExp(name, "gi"))];

			if(matches && matches.length > 0) {
				//Current emote has been found
				//Generate fake emotes data in the expected format:
				//  ID:start-end,start-end/ID:start-end,start-end
				let tmpTag = "7TV_"+e.id+":";
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
	 * Get a SevenTV emote data from its code
	 * @param code
	 * @returns
	 */
	public getEmoteFromCode(code:string):SevenTVEmote|null {
		if(this.globalEmotesHashmaps[code]) {
			return this.globalEmotesHashmaps[code];
		}
		for (const key in this.channelEmotesHashmaps) {
			const list = this.channelEmotesHashmaps[key]!;
			if(list[code]) return list[code];
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
				await this.loadChannelEmotes( this.channelList[i]! );
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
			const res = await fetch("https://7tv.io/v3/emote-sets/global");
			const json = (await res.json()) as SevenTVEmoteSet;
			json.emotes.forEach(e => {
				e.data.name = e.name;
				this.globalEmotesHashmaps[e.name] = e.data;
			});
		}catch(error) {
			//
		}
	}

	private async loadChannelEmotes(channelId:string):Promise<void> {
		try {
			const res = await fetch("https://7tv.io/v3/users/twitch/"+channelId);
			const json = (await res.json()) as SevenTVResult;
			this.channelEmotesHashmaps[channelId] = {};
			json.emote_set.emotes.forEach(e => {
				e.data.name = e.name;
				this.channelEmotesHashmaps[channelId]![e.name] = e.data;
			});
		}catch(error) {
			//
		}
	}
}

// id:string;
// name:string;
// width:number[];
// height:number[];
// urls:[string, string][];


interface SevenTVResult {
	id: string;
	platform: string;
	username: string;
	display_name: string;
	linked_at: number;
	emote_capacity: number;
	emote_set_id?: any;
	emote_set: SevenTVEmoteSet
	user: SeventTVUser;
}

interface SeventTVUser {
	id: string;
	username: string;
	display_name: string;
	created_at: number;
	avatar_url: string;
	biography: string;
	style: unknown;
	roles: string[];
	connections: {
		id: string;
		platform: string;
		username: string;
		display_name: string;
		linked_at: number;
		emote_capacity: number;
		emote_set_id?: any;
		emote_set: SevenTVEmoteSet;
	}[];
}

interface SeventTVOwner {
	id: string;
	username: string;
	display_name: string;
	avatar_url: string;
	style: unknown;
	roles: string[];
}

interface SevenTVEmote {
	id: string;
	name: string;
	flags: number;
	lifecycle: number;
	state: string[];
	listed: boolean;
	animated: boolean;
	owner: SeventTVOwner;
	host: {
		url: string;
		files: SevenTVFile[];
	};
}

interface SevenTVEmoteSet {
	id: string;
	name: string;
	flags: number;
	tags: any[];
	immutable: boolean;
	privileged: boolean;
	emotes: {
		id: string;
		name: string;
		flags: number;
		timestamp: number;
		actor_id?: any;
		data: SevenTVEmote;
	}[];
	emote_count: number;
	capacity: number;
	owner: SeventTVOwner
}

interface SevenTVFile {
	name: string;
	static_name: string;
	width: number;
	height: number;
	frame_count: number;
	size: number;
	format: string;
}
