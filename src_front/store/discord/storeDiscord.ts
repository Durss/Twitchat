import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IDiscordActions, IDiscordGetters, IDiscordState } from '../StoreProxy';
import DataStore from '../DataStore';

export const storeDiscord = defineStore('discord', {
	state: () => ({
		chatCols:[],
		logChanTarget:"",
		reactionsEnabled:true,

	} as IDiscordState),



	getters: {
	} as IDiscordGetters
	& ThisType<UnwrapRef<IDiscordState> & _StoreWithGetters<IDiscordGetters> & PiniaCustomProperties>
	& _GettersTree<IDiscordState>,



	actions: {
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