import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IQnaActions, IQnaGetters, IQnaState } from '../StoreProxy';
import Utils from '@/utils/Utils';
import Config from '@/utils/Config';
import StoreProxy from '../StoreProxy';
import MessengerProxy from '@/messaging/MessengerProxy';
import SSEHelper from '@/utils/SSEHelper';
import SSEEvent from '@/events/SSEEvent';
import ApiHelper from '@/utils/ApiHelper';

let shareDebounce = -1;
let deleteDebounce = -1;
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
		populateData():void {
			/**
			 * Called when a mod requests for currently shared 
			 */
			SSEHelper.instance.addEventListener(SSEEvent.SHARED_MOD_INFO_REQUEST, ()=> {
				this.shareSessionsWithMods();
			});
			/**
			 * Called when receiving Q&A states from streamer
			 */
			SSEHelper.instance.addEventListener(SSEEvent.QNA_STATE, (event)=> {
				console.log(event.data)
				if(!event.data || !event.data.sessions) return;
				event.data.sessions.forEach(session => {
					const localSession = this.activeSessions.find(v => v.id == session.id);
					if(!localSession) {
						this.activeSessions.push(session);
					}else{
						localSession.messages = session.messages;
					}
				});
			});
		},
		
		createSession(command:string, allowUpvotes:boolean, shareWithMods:boolean):TwitchatDataTypes.QnaSession | false{
			command = command.toLowerCase().trim();
			if(this.activeSessions.find(v=>v.command.toLowerCase() == command)) {
				return false;
			}
			const session:TwitchatDataTypes.QnaSession = {
				id:Utils.getUUID(),
				command:command,
				messages:[],
				open:true,
				allowUpvotes,
				shareWithMods,
				ownerId:StoreProxy.auth.twitch.user.id,
			}
			this.activeSessions.push(session);

			//Execute related triggers
			const m:TwitchatDataTypes.MessageQnaStartData = {
				channel_id:StoreProxy.auth.twitch.user.id,
				date:Date.now(),
				id:Utils.getUUID(),
				platform:"twitchat",
				qnaSession:session,
				type:TwitchatDataTypes.TwitchatMessageType.QNA_START,
			};
			StoreProxy.chat.addMessage(m);

			//Send start chat message if requested
			if(StoreProxy.chat.botMessages.qnaStart.enabled) {
				let message = StoreProxy.chat.botMessages.qnaStart.message;
				message = message.replace(/\{CMD\}/gi, command);
				MessengerProxy.instance.sendMessage(message);
			}
			if(shareWithMods) {
				this.shareSessionsWithMods();
			}
			return session;
		},

		stopSession(id:string):void{
			const index = this.activeSessions.findIndex(v=>v.id == id);
			if(index == -1) return;
			const session = this.activeSessions[index];
			session.open = false;

			//Execute related triggers
			const m:TwitchatDataTypes.MessageQnaStopData = {
				channel_id:StoreProxy.auth.twitch.user.id,
				date:Date.now(),
				id:Utils.getUUID(),
				platform:"twitchat",
				qnaSession:this.activeSessions[index],
				type:TwitchatDataTypes.TwitchatMessageType.QNA_STOP,
			};
			StoreProxy.chat.addMessage(m);
			if(session.shareWithMods) {
				this.shareSessionsWithMods();
			}
		},

		deleteSession(id:string):void{
			const index = this.activeSessions.findIndex(v=>v.id == id);
			if(index == -1) return;
			const [session] = this.activeSessions.splice(index, 1);

			//Execute related triggers
			const m:TwitchatDataTypes.MessageQnaDeleteData = {
				channel_id:StoreProxy.auth.twitch.user.id,
				date:Date.now(),
				id:Utils.getUUID(),
				platform:"twitchat",
				qnaSession:session,
				type:TwitchatDataTypes.TwitchatMessageType.QNA_DELETE,
			};
			StoreProxy.chat.addMessage(m);

			if(session.shareWithMods) {
				this.shareSessionsWithMods();
			}
		},

		async handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd:string):Promise<void>{
			cmd = cmd.toLowerCase();
			let upvoteMode = false;
			let session = this.activeSessions.find(v=>v.command.toLowerCase() == cmd);
			if(!session && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				const typedMessage = message as TwitchatDataTypes.MessageChatData;
				if(!typedMessage.answersTo) return;
				message = typedMessage.answersTo;
				cmd = (typedMessage.answersTo.message || "").trim().split(" ")[0].toLowerCase();
				session = this.activeSessions.find(v=>v.command.toLowerCase() == cmd);
				upvoteMode = true;
			}

			if(session && session.open) {
				if(upvoteMode) {
					const index = session.messages.findIndex(v => v.message.id == message.id);
					if(index > -1) {
						session.messages[index].votes ++;
					}
				}else{
					//Ignore channel point rewards that are "highlight my message" as they are also
					//sent as standard message with the "highlight" flag
					const isHighlightReward = message.type == TwitchatDataTypes.TwitchatMessageType.REWARD
					&& (message as TwitchatDataTypes.MessageRewardRedeemData).reward.id == Config.instance.highlightMyMessageReward.id;
					if(isHighlightReward) return;

					//Clone object.
					//The message will be modified to remove the Q&A command
					//and we don't want to modify the original message.
					//No need for a deep clone.
					const clone:any = {};
					const endlessLoopUnsafeKeys:(keyof TwitchatDataTypes.MessageChatData)[] = ["answersTo", "raw_data", "deletedData"];
					for (const key in message) {
						const typedKey = key as keyof TwitchatDataTypes.MessageChatData;
						if(endlessLoopUnsafeKeys.includes(typedKey)) continue;
						if(typedKey == "answers") {
							clone[key] = [];
							continue;
						}
						clone[key] = message[key as keyof typeof message];
					}
					const typedClone = clone as TwitchatDataTypes.TranslatableMessage;
					typedClone.message_chunks = JSON.parse(JSON.stringify(typedClone.message_chunks)) || [];
					//Remove command from messages
					for (let i = 0; i < typedClone.message_chunks!.length; i++) {
						const c = typedClone.message_chunks![i];
						if(c.type == "text") {
							c.value = c.value.replace(new RegExp(cmd, "i"), "").trimStart();
							if(c.value.length == 0) {
								typedClone.message_chunks?.splice(i, 1);
							}
							break;
						}
					}
					typedClone.message = (typedClone.message || "").replace(new RegExp(cmd, "i"), "").trim();
					typedClone.message_html = (typedClone.message_html || "").replace(new RegExp(cmd, "i"), "").trim();
					session.messages.push({message:typedClone, votes:1});
				} 
			
				if(session.shareWithMods) {
					this.shareSessionsWithMods();
				}
			}
		},

		deleteMessage(messageID:string):void {
			//Debounce updates to avoid lots of potential process
			//When banning a user this method is called for all their messages
			clearTimeout(deleteDebounce);
			deleteSpool.push(messageID);
			deleteDebounce = setTimeout(() => {
				for (let i = 0; i < this.activeSessions.length; i++) {
					const session = this.activeSessions[i];
					for (let j = 0; j < session.messages.length; j++) {
						const m = session.messages[j];
						const poolIndex = deleteSpool.indexOf(m.message.id);
						if(poolIndex > -1) {
							session.messages.splice(j, 1);
							deleteSpool.splice(poolIndex, 1);
							j --;
			
							if(session.shareWithMods) {
								this.shareSessionsWithMods();
							}
						}
					}
				}
				deleteSpool = [];
			}, 100);
		},

		shareSessionsWithMods():void {
			clearTimeout(shareDebounce);
			shareDebounce = setTimeout(() => {
				ApiHelper.call("mod/qna", "POST", {sessions:this.activeSessions.filter(v=>v.shareWithMods==true)});
			}, 1000);
		}

	} as IQnaActions
	& ThisType<IQnaActions
		& UnwrapRef<IQnaState>
		& _StoreWithState<"timer", IQnaState, IQnaGetters, IQnaActions>
		& _StoreWithGetters<IQnaGetters>
		& PiniaCustomProperties
	>,
})
