import Config from "@/utils/Config";
import type { JsonValue } from "type-fest";
import type { TriggerActionChatCommandData, TriggerActionTypes } from "../types/TwitchatDataTypes";
import { TriggerTypes } from "@/utils/TriggerActionData";

/**
 * Fallback to sessionStorage if localStorage isn't available
 * Created : 18/10/2020 
 */
export default class Store {
	
	public static access_token:string;

	private static store:Storage;
	private static dataPrefix = "twitchat_";
	private static saveTO = -1;
	private static rawStore:{[key:string]:(JsonValue|unknown)} = {};
	private static propToSavableState:{[key:string]:boolean} = {};
	
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public static get(key:string):string {
		if(!this.store) this.init();
		return this.store.getItem(this.dataPrefix + key) as string;
	}

	public static getAll():{[key:string]:string|null} {
		if(!this.store) this.init();
		const props:{[key:string]:string|null} = {};
		for (let i = 0; i < this.store.length; i++) {
			const key = this.store.key(i);
			if(!key || key.indexOf(this.dataPrefix) == -1) continue;
			const k = key.replace(this.dataPrefix, "");
			props[k] = this.store.getItem(key);
		}
		return props;
	}

	public static set(key:string, value:JsonValue|unknown, save = true):void {
		this.propToSavableState[key] = save;
		if(!this.store) this.init();
		if(value == undefined) return;
		this.rawStore[key] = value;
		const str = typeof value == "string"? value : JSON.stringify(value);
		this.store.setItem(this.dataPrefix + key, str);
		if(save) this.save();
	}

	public static remove(key:string):void {
		if(!this.store) this.init();
		this.store.removeItem(this.dataPrefix + key);
		this.save();
	}

	public static clear():void {
		if(!this.store) this.init();
		//Remove only the data with the proper prefix
		for (let i = 0; i < this.store.length; i++) {
			const key = this.store.key(i);
			if(!key || key.indexOf(this.dataPrefix) == -1) continue;
			this.store.removeItem(key);
		}
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private static init():void {
		this.store = localStorage? localStorage : sessionStorage;
		let v = this.get("v");
		if(!v) {
			this.fixBackslashes();
			v = "1"
		}
		if(v=="1" || v=="2") {
			this.cleanupOldData();
			v = "3";
		}
		if(v=="3") {
			this.migrateBotMessages();
			v = "4";
		}
		if(v=="4") {
			this.migrateSOMessage();
			v = "5";
		}
		if(v=="5") {
			Store.remove("p:showPollPredResults");
			v = "6";
		}
		if(v=="6") {
			this.migrateTriggers();
			v = "7";
		}
		if(v=="7") {
			//Because of my stupid version check, users could skip updates
			//Trying to fix this here...
			Store.remove("p:showPollPredResults");
			v = "8";
		}
		if(v=="8") {
			this.fixTriggersCase()
			v = "9";
		}

		this.set("v", v);

		const items = this.getAll();
		for (const key in items) {
			try{
				items[key] = JSON.parse(items[key] as string);
			}catch(error) {
				//parsing failed, that's because it's a simple string, just keep it
			}
		}
		this.rawStore = items;
		this.save();
	}

	private static save():void {
		clearTimeout(this.saveTO);
		if(!this.access_token) return;
		
		this.saveTO = window.setTimeout(async () => {
			const data = JSON.parse(JSON.stringify(this.rawStore));
			//Do not save sensitive data to server
			delete data.obsPass;
			delete data.oAuthToken;
			delete data.spotifyAuthToken;
			delete data.spotifyAppParams;
			//Do not save this to the server to avoid config to be erased
			//on one of the instances
			delete data.hideChat;
			delete data["p:shoutoutLabel"];
			delete data.deezerEnabled;

			let json = {
				access_token:this.access_token,
				data:data,
			};
			const res = await fetch(Config.instance.API_PATH+"/user", {method:"POST", body:JSON.stringify(json)});
			json = await res.json();
		}, 1000);
	}

	/**
	 * Temporary fix after making a mistake.
	 * I was doing JSON.stringofy(value) when setting a value, even if
	 * the value was already sa string wich made all double quotes
	 * escaped potentially hunderds of times.
	 * JSON.stringify('hello "world"!') => "hello \\"world\\"!"
	 * Can be removed after some updates.
	 */
	private static fixBackslashes():void {
		let v = this.get("p:shoutoutLabel");
		if(!v) return;
		v = v.replace(/(^"\\"|\\|"$)/gi, "");
		v = v.replace(/("|\\){2,}/gi, "$1");
		v = v.replace(/(^"|"$)/gi, "");
		v = v.trim();
		this.set("p:shoutoutLabel", v);
	}

	/**
	 * Temporary utility to cleanup some old storage data
	 * Can be removed after some updates.
	 */
	private static cleanupOldData():void {
		//rename "raffle_postOnChat" to "raffle_messageEnabled" ofr more consistency
		if(this.get("raffle_postOnChat") != null) {
			this.set("raffle_messageEnabled", this.get("raffle_postOnChat"));
			this.remove("raffle_postOnChat");
		}
		this.remove("p:emotesOnly");
		this.remove("p:modsSize");
		this.remove("p:vipsSize");
		this.remove("p:followersOnly");
		this.remove("p:subsSize");
		this.remove("p:subsOnly");
		this.remove("p:slowMode");
		this.remove("p:ignoreSelf");
		this.remove("p:hideEmotes");
		this.remove("tmiToken");
		this.remove("authToken");
		this.remove("p:hideBadges");
		this.remove("p:hideBot");
	}

	/**
	 * Move raffle and bingo messages inside a more generic "botMessage"
	 * prop instead of having one prop for each field.
	 */
	private static migrateBotMessages():void {
		const raffle_message =this.get("raffle_message");
		const raffle_messageEnabled =this.get("raffle_messageEnabled");
		const bingo_message =this.get("bingo_message");
		const bingo_messageEnabled =this.get("bingo_messageEnabled");

		const botMessages = {
			raffle: {
				enabled:raffle_message,
				message:raffle_messageEnabled,
			},
			bingo: {
				enabled:bingo_message,
				message:bingo_messageEnabled,
			}
		}
		//Save new data format
		this.set("botMessages", botMessages);
		
		//Cleanup old data
		this.remove("raffle_message");
		this.remove("bingo_messageEnabled");
		this.remove("raffle_messageEnabled");
		this.remove("bingo_message");
	}

	/**
	 * Shoutout message has been moved inside "botMessages" property.
	 */
	private static migrateSOMessage():void {
		let label = this.get("p:shoutoutLabel");
		if(!label) return;
		label = label.replace("$USER", "{USER}");
		label = label.replace("$STREAM", "{TITLE}");
		label = label.replace("$TITLE", "{TITLE}");
		label = label.replace("$URL", "{URL}");
		label = label.replace("$CATEGORY", "{CATEGORY}");
		// store.dispatch("updateBotMessage", {key:"shoutout", enabled:true, message:label})
		this.remove("p:shoutoutLabel");
	}

	/**
	 * Flags all obs sources as "obs" types and move them to a new key while
	 * cleaning up uncessary keys.
	 */
	private static migrateTriggers():void {
		const sources = this.get("obsConf_sources");
		if(sources) {
			const actions:(TriggerActionTypes[]|TriggerActionChatCommandData)[] = JSON.parse(sources);
			for (const key in actions) {
				const a = actions[key];
				let list = a;
				//Is chat command trigger ?
				if(!Array.isArray(a)) {
					list = (a as TriggerActionChatCommandData).actions;
				}
				const typedList = list as TriggerActionTypes[];
				for (let i = 0; i < typedList.length; i++) {
					typedList[i].type = "obs";

					//Cleanup unnecessary data
					for (const prop in typedList[i]) {
						//@ts-ignore
						const v = typedList[i][prop];
						if(v === "") {
							//@ts-ignore
							delete typedList[i][prop];
						}
					}
				}
			}
			this.set("triggers", actions);
			this.remove("obsConf_sources");
		}
	}

	/**
	 * Lowercasing all chat command keys so the commands work
	 * properly no matter how the user writes it.
	 */
	private static fixTriggersCase():void {
		const txt = this.get("triggers");
		if(!txt) return;
		const triggers = JSON.parse(txt);
		for (const key in triggers) {
			if(key.indexOf(TriggerTypes.CHAT_COMMAND) === 0) {
				//Check if it's not full lowercased
				if(key != key.toLowerCase()) {
					triggers[key.toLowerCase()] = triggers[key];
					delete triggers[key];
				}
			}
		}
		
		this.set("triggers", triggers);
	}
}