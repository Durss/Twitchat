import ApiHelper from '@/utils/ApiHelper';
import { defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IDiscordActions, IDiscordGetters, IDiscordState } from '../StoreProxy';
import Utils from '@/utils/Utils';
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import StoreProxy from '../StoreProxy';
import SSEHelper from '@/utils/SSEHelper';
import SSEEvent from '@/events/SSEEvent';
import TwitchUtils from '@/utils/twitch/TwitchUtils';

export const storeDiscord = defineStore('discord', {
	state: () => ({
		discordLinked:true,
		chatCols:[],
		banLogTarget:"",
		banLogThread:true,
		chatCmdTarget:"",
		logChanTarget:"",
		ticketChanTarget:"",
		linkedToGuild:"",
		reactionsEnabled:true,
		quickActions:[],
		channelList:[],

	} as IDiscordState),



	getters: {
	},



	actions: {
		populateData():void {
			//Init discord params
			const discordParams = DataStore.get(DataStore.DISCORD_PARAMS);
			if(discordParams) {
				const data = JSON.parse(discordParams);
				this.chatCols = data.chatCols || [];
				this.banLogTarget = data.banLogTarget || "";
				this.chatCmdTarget = data.chatCmdTarget || "";
				this.logChanTarget = data.logChanTarget || "";
				this.ticketChanTarget = data.ticketChanTarget || "";
				this.banLogThread = data.banLogThread == true;
				this.reactionsEnabled = data.reactionsEnabled == true;
				this.quickActions = data.quickActions || [];
			}

			SSEHelper.instance.addEventListener(SSEEvent.NOTIFICATION, (event)=>{
				const data = event.data!;
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
			});
		},

		async initialize():Promise<void> {
			const result = await ApiHelper.call("discord/link", "GET");
			if(result.json.linked === true) {
				this.linkedToGuild = result.json.guildName;
				await this.loadChannelList();
				this.discordLinked = true;
			}
		},

		async validateCode(code:string):Promise<{success:boolean, errorCode?:string, guildName?:string}> {
			try {
				const result = await ApiHelper.call("discord/code", "GET", {code}, false);
				if(result.json.success) {
					return {success:true, guildName:result.json.guildName};
				}else if(result.status == 401){
					return {success:false, errorCode:result.json.errorCode || "UNAUTHORIZED"};
				}else{
					return {success:false, errorCode:result.json.errorCode || "UNKNOWN"};
				}
			}catch(error){};
			return {success:false, errorCode:"UNKNOWN"};
		},

		async submitCode(code:string):Promise<true|{code:string, channelName?:string}> {
			try {
				const result = await ApiHelper.call("discord/code", "POST", {code}, false);
				if(result.json.success === true) {
					await this.initialize();
					return true;
				}else if(result.status == 401){
					return {code:result.json.errorCode || "UNAUTHORIZED", channelName:result.json.channelName};
				}else{
					return {code:result.json.errorCode || "UNKNOWN", channelName:result.json.channelName};
				}
			}catch(error){};
			return {code:"UNKNOWN"};
		},

		async unlinkDiscord():Promise<true|string> {
			try {
				const result = await ApiHelper.call("discord/link", "DELETE");
				if(result.json.success) {
					this.discordLinked = false;
					return true;
				}else if(result.status == 401){
					return result.json.errorCode || "UNAUTHORIZED";
				}else{
					return result.json.errorCode || "UNKNOWN";
				}
			}catch(error) {
			}
			return "UNKNOWN"
		},

		addQuickAction():void {
			this.quickActions.unshift({
				id:Utils.getUUID(),
				action:"message",
				name:"",
				message:""
			});
			this.saveParams();
		},

		delQuickAction(action:TwitchatDataTypes.DiscordQuickActionData):void{
			StoreProxy.main.confirm(StoreProxy.i18n.t("discord.quick_delete"))
			.then(v=> {
				const index = this.quickActions.findIndex(v=>v.id == action.id);
				this.quickActions.splice(index, 1);
				this.saveParams();
			}).catch(error=>{})
		},

		saveParams():void {
			const data:DiscordStoreData = {
				chatCols:this.chatCols,
				banLogTarget:this.banLogTarget,
				banLogThread:this.banLogThread,
				chatCmdTarget:this.chatCmdTarget,
				logChanTarget:this.logChanTarget,
				ticketChanTarget:this.ticketChanTarget,
				reactionsEnabled:this.reactionsEnabled,
				quickActions:this.quickActions,
			};
			DataStore.set(DataStore.DISCORD_PARAMS, data);
		},

		async loadChannelList():Promise<void> {
			const channels = await ApiHelper.call("discord/channels", "GET");
			this.channelList = channels.json.channelList;
		}
	} as IDiscordActions
	& ThisType<IDiscordActions
		& UnwrapRef<IDiscordState>
		& _StoreWithState<"Discord", IDiscordState, IDiscordGetters, IDiscordActions>
		& _StoreWithGetters<IDiscordGetters>
		& PiniaCustomProperties
	>,
})

export interface DiscordStoreData {
	chatCols:number[];
	banLogThread:boolean;
	banLogTarget:string;
	chatCmdTarget:string;
	logChanTarget:string;
	ticketChanTarget:string;
	reactionsEnabled:boolean;
	quickActions:TwitchatDataTypes.DiscordQuickActionData[];
}