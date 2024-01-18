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
				//Clone object
				const clone:any = {};
				for (const key in message) {
					clone[key] = message[key as keyof typeof message];
				}
				const typedClone = clone as TwitchatDataTypes.TranslatableMessage;
				typedClone.message_chunks = JSON.parse(JSON.stringify(typedClone.message_chunks)) || [];
				//Remove command from messages
				for (let i = 0; i < typedClone.message_chunks!.length; i++) {
					const c = typedClone.message_chunks![i];
					if(c.type == "text") {
						c.value = c.value.replace(new RegExp(cmd, "i"), "").trim();
						if(c.value.length == 0) {
							typedClone.message_chunks?.splice(i, 1);
						}
						break;
					}
				}
				typedClone.message = (typedClone.message || "").replace(new RegExp(cmd, "i"), "").trim();
				typedClone.message_html = (typedClone.message_html || "").replace(new RegExp(cmd, "i"), "").trim();
				session.messages.push(typedClone);
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