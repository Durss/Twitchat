import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IDiscordActions, IDiscordGetters, IDiscordState } from '../StoreProxy';
import DataStore from '../DataStore';
import ApiHelper from '@/utils/ApiHelper';

export const storeDiscord = defineStore('discord', {
	state: () => ({
		chatCols:[],
		chatCmdTarget:"",
		logChanTarget:"",
		linkedToGuild:"",
		quickActions:"",
		reactionsEnabled:true,

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
		},
		populateData(data:IDiscordState):void {
			this.chatCols = data.chatCols;
			this.logChanTarget = data.logChanTarget;
			this.reactionsEnabled = data.reactionsEnabled;
		},
		saveParams():void {
			DataStore.set(DataStore.DISCORD_PARAMS, {
				chatCols:this.chatCols,
				logChanTarget:this.logChanTarget,
				reactionsEnabled:this.reactionsEnabled,
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