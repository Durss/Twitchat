import ApiHelper from '@/utils/ApiHelper';
import { defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IDiscordActions, IDiscordGetters, IDiscordState } from '../StoreProxy';
import Utils from '@/utils/Utils';

export const storeDiscord = defineStore('discord', {
	state: () => ({
		chatCols:[],
		banLogTarget:"",
		banLogThread:true,
		chatCmdTarget:"",
		logChanTarget:"",
		linkedToGuild:"",
		reactionsEnabled:true,
		quickActions:[],
		channelList:[],

	} as IDiscordState),



	getters: {
		linked():boolean { return this.linkedToGuild != ""; }
	},



	actions: {
		async initialize():Promise<void> {
			const result = await ApiHelper.call("discord/link");
			if(result.json.linked === true) {
				this.linkedToGuild = result.json.guildName;
			}
			const channels = await ApiHelper.call("discord/channels");
			this.channelList = channels.json.channelList;
		},
		populateData(data:IDiscordState):void {
			this.chatCols = data.chatCols || [];
			this.banLogTarget = data.banLogTarget || "";
			this.chatCmdTarget = data.chatCmdTarget || "";
			this.logChanTarget = data.logChanTarget || "";
			this.banLogThread = data.banLogThread == true;
			this.reactionsEnabled = data.reactionsEnabled == true;
			this.quickActions = data.quickActions || [];
		},
		addQuickAction():void {
			this.quickActions.unshift({
				id:Utils.getUUID(),
				action:"message",
				name:"",
				message:""
			})
		},
		saveParams():void {
			DataStore.set(DataStore.DISCORD_PARAMS, {
				chatCols:this.chatCols,
				banLogTarget:this.banLogTarget,
				banLogThread:this.banLogThread,
				chatCmdTarget:this.chatCmdTarget,
				logChanTarget:this.logChanTarget,
				reactionsEnabled:this.reactionsEnabled,
				quickActions:this.quickActions,
			});
			DataStore.save();
		}
	} as IDiscordActions
	& ThisType<IDiscordActions
		& UnwrapRef<IDiscordState>
		& _StoreWithState<"Discord", IDiscordState, IDiscordGetters, IDiscordActions>
		& _StoreWithGetters<IDiscordGetters>
		& PiniaCustomProperties
	>,
})