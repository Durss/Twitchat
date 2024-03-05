import StoreProxy from "@/store/StoreProxy";
import Config from "./Config";
import { TriggerTypes } from "@/types/TriggerActionDataTypes";
import MessengerProxy from "@/messaging/MessengerProxy";
import TwitchUtils from "./twitch/TwitchUtils";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "./Utils";
import TriggerActionHandler from "./triggers/TriggerActionHandler";

/**
* Created : 29/02/2024 
*/
export default class SSEHelper {

	private static _instance:SSEHelper;
	private _sse!:EventSource;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():SSEHelper {
		if(!SSEHelper._instance) {
			SSEHelper._instance = new SSEHelper();
		}
		return SSEHelper._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public initialize():void {
		this.connect();
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Open SSE pipe
	 */
	private connect():void {
		this._sse = new EventSource(Config.instance.API_PATH+"/sse/register?token=Bearer "+StoreProxy.auth.twitch.access_token);
		this._sse.onmessage = (event) => this.onMessage(event);
		// this._sse.onopen = (event) => { }
	}

	/**
	 * Called when receiving a message
	 */
	private onMessage(event:MessageEvent<string>):void {
		try {
			let json = JSON.parse(event.data) as {code:string, data:any};
			if(json.code == "AUTHENTICATION_FAILED") {
				//Avoid autoreconnect
				this._sse.close();
			}else

			if(json.code == "TRIGGER_SLASH_COMMAND") {
				this.onTriggerSlashCommand(json.data);
			}else
			
			if(json.code == "NOTIFICATION") {
				this.onNotification(json.data);
			}else
			
			if(json.code == "KO_FI_EVENT") {
				this.onKofiEvent(json.data);
			}
		}catch(error) {
			//ignore
		}
	}

	/**
	 * Called when someone used a Twitchat /command from Discord
	 * @param data 
	 * @returns 
	 */
	private onTriggerSlashCommand(data:{command:string, params:{name:string, value:string}[]}):void {
		
		//Search for the matchin trigger
		const trigger = StoreProxy.triggers.triggerList.find(v=>{
			return v.type == TriggerTypes.SLASH_COMMAND && v.chatCommand == "/"+data.command;
		});
		if(!trigger) return;
		let text:string[] = [];
		//Set params in the expected order
		if(trigger.chatCommandParams) {
			trigger.chatCommandParams.forEach(cmdParam => {
				const param = (data.params||[]).find(v=>(v.name||"").toLowerCase() == cmdParam.tag.toLowerCase())
				// if(param?.value) text.push(param.value);
				if(param?.value) text.push("{"+param.name+"}");
			})
		}
		//Send message to be executed by the triggers
		// MessengerProxy.instance.sendMessage(message.join(" "));

		const placeholders:{[key: string]: string | number} = {};
		const message:TwitchatDataTypes.MessageChatData =  {
			id:Utils.getUUID(),
			date:Date.now(),
			channel_id:StoreProxy.auth.twitch.user.id,
			answers:[],
			is_short:false,
			message:text.join(" "),
			message_chunks:[],
			message_html:"",
			message_size:0,
			platform:"twitchat",
			type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			user:StoreProxy.auth.twitch.user,
		};
		data.params.forEach(p => {
			placeholders[p.name.toUpperCase()] = TwitchUtils.messageChunksToHTML(TwitchUtils.parseMessageToChunks(p.value, undefined, true, "twitch"));
		})
		TriggerActionHandler.instance.executeTrigger(trigger, message, false, undefined, undefined, placeholders);
	}

	/**
	 * Called when someone used /say or /ask commands on Discord
	 * @param data 
	 * @returns 
	 */
	private onNotification(data:{messageId:string, col:number[], message:string, quote:string, highlightColor:string, style:TwitchatDataTypes.MessageCustomData["style"], username:string, actions:TwitchatDataTypes.MessageCustomData["actions"]}):void {
		const chunksMessage = TwitchUtils.parseMessageToChunks(data.message || "", undefined, true);
		const chunksQuote = !data.quote? [] : TwitchUtils.parseMessageToChunks(data.quote, undefined, true);
		const message:TwitchatDataTypes.MessageCustomData = {
			id: Utils.getUUID(),
			channel_id:StoreProxy.auth.twitch.user.id,
			date: Date.now(),
			platform: "twitchat",
			col: data.col,
			type: TwitchatDataTypes.TwitchatMessageType.CUSTOM,
			actions: data.actions,
			message: data.message,
			message_chunks: chunksMessage,
			message_html: TwitchUtils.messageChunksToHTML(chunksMessage),
			quote: data.quote,
			quote_chunks: chunksQuote,
			quote_html: TwitchUtils.messageChunksToHTML(chunksQuote),
			highlightColor: data.highlightColor,
			style:data.style,
			icon:"discord",
			user:{
				name:data.username,
			},
		};
		StoreProxy.chat.addMessage(message);
	}

	/**
	 * Called when receiving an event from Ko-fi
	 * @param data 
	 * @returns 
	 */
	private onKofiEvent(data:any):void {
		StoreProxy.kofi.onEvent(data);
	}
}