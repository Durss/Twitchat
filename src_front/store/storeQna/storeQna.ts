import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IQnaActions, IQnaGetters, IQnaState } from '../StoreProxy';
import Utils from '@/utils/Utils';
import Config from '@/utils/Config';

export const storeQna = defineStore('qna', {
	state: () => ({
		activeSessions:[],
	} as IQnaState),



	getters: {

	} as IQnaGetters
	& ThisType<UnwrapRef<IQnaState> & _StoreWithGetters<IQnaGetters> & PiniaCustomProperties>
	& _GettersTree<IQnaState>,



	actions: {
		createSession(command:string):TwitchatDataTypes.QnaSession | false{
			if(this.activeSessions.find(v=>v.command.toLowerCase() == command.toLowerCase())) {
				return false;
			}
			const session:TwitchatDataTypes.QnaSession = {
				id:Utils.getUUID(),
				command:command.toLowerCase(),
				messages:[],
				open:true,
			}
			this.activeSessions.push(session);
			return session;
		},
		
		stopSession(id:string):void{
			const index = this.activeSessions.findIndex(v=>v.id == id);
			if(index == -1) return;
			this.activeSessions[index].open = false;
		},
		
		deleteSession(id:string):void{
			const index = this.activeSessions.findIndex(v=>v.id == id);
			if(index == -1) return;
			this.activeSessions.splice(index, 1);
		},
		
		handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd:string):void{
			cmd = cmd.toLowerCase();
			const session = this.activeSessions.find(v=>v.command.toLowerCase() == cmd);
			//Ignore channel point rewards that are "highlight my message" as they are also
			//sent as standard image with the "highlight" flag
			const isHighlightReward = message.type == TwitchatDataTypes.TwitchatMessageType.REWARD
				&& (message as TwitchatDataTypes.MessageRewardRedeemData).reward.id == Config.instance.highlightMyMessageReward.id;
			if(session && session.open && !isHighlightReward) {
				session.messages.push(message);
			}
		},

	} as IQnaActions
	& ThisType<IQnaActions
		& UnwrapRef<IQnaState>
		& _StoreWithState<"timer", IQnaState, IQnaGetters, IQnaActions>
		& _StoreWithGetters<IQnaGetters>
		& PiniaCustomProperties
	>,
})