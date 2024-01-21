import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IQnaActions, IQnaGetters, IQnaState } from '../StoreProxy';
import Utils from '@/utils/Utils';
import Config from '@/utils/Config';

let deleteTimeout = -1;
let deleteSpool:string[] = [];

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
			command = command.toLowerCase().trim();
			if(this.activeSessions.find(v=>v.command.toLowerCase() == command)) {
				return false;
			}
			const session:TwitchatDataTypes.QnaSession = {
				id:Utils.getUUID(),
				command:command,
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

		deleteMessage(messageID:string):void {
			//Debounce updates to avoid lots of potential process
			//When banning a user this method is called for all their messages
			clearTimeout(deleteTimeout);
			deleteSpool.push(messageID);
			deleteTimeout = setTimeout(() => {
				for (let i = 0; i < this.activeSessions.length; i++) {
					const sess = this.activeSessions[i];
					for (let j = 0; j < sess.messages.length; j++) {
						const m = sess.messages[j];
						const poolIndex = deleteSpool.indexOf(m.id);
						if(poolIndex > -1) {
							sess.messages.splice(j, 1);
							deleteSpool.splice(poolIndex, 1);
							j --;
						}
					}
				}
				deleteSpool = [];
			}, 100);
		},

	} as IQnaActions
	& ThisType<IQnaActions
		& UnwrapRef<IQnaState>
		& _StoreWithState<"timer", IQnaState, IQnaGetters, IQnaActions>
		& _StoreWithGetters<IQnaGetters>
		& PiniaCustomProperties
	>,
})