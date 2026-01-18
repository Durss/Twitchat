import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IQnaActions, IQnaGetters, IQnaState } from '../StoreProxy';
import Utils from '@/utils/Utils';
import Config from '@/utils/Config';
import StoreProxy from '../StoreProxy';
import MessengerProxy from '@/messaging/MessengerProxy';
import SSEHelper from '@/utils/SSEHelper';
import SSEEvent from '@/events/SSEEvent';
import ApiHelper from '@/utils/ApiHelper';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import TwitchUtils from '@/utils/twitch/TwitchUtils';

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
			/**
			 * Called when a mod requests to perform an action on a Q&A session.
			 * Could be:
			 * - adding message
			 * - removing a message
			 * - closing the session
			 */
			SSEHelper.instance.addEventListener(SSEEvent.QNA_ACTION, async (event)=> {
				if(!event.data || !event.data.action) return;
				const data = event.data;
				const me = StoreProxy.auth.twitch.user;
				const moderator = await StoreProxy.users.getUserFrom("twitch", me.id, data.moderatorId, undefined, undefined, undefined, undefined, false, undefined, false);

				//Make sure user is a moderator
				if(!moderator.channelInfo[me.id]!.is_moderator) return;

				switch(data.action) {
					case "add_message": {
						const session = this.activeSessions.find(v=>v.id == data.sessionId);
						//Make sure session is shared and message isn't already there
						if(session && session.shareWithMods && session.messages.findIndex(v=>v.message.id == data.message.message.id)==-1) {
							session.messages.push(data.message);
							this.shareSessionsWithMods();
						}
						break;
					}
					case "del_message": {
						const session = this.activeSessions.find(v=>v.id == data.sessionId);
						//Make sure session is shared and message isn't already there
						if(session && session.shareWithMods) {
							const index = session.messages.findIndex(v=>v.message.id == data.messageId);
							if(index > -1) {
								session.messages.splice(index, 1);
							}
							this.shareSessionsWithMods();
						}
						break;
					}
				}
			});

			PublicAPI.instance.addEventListener(TwitchatEvent.QNA_HIGHLIGHT, (event:TwitchatEvent<{qnaId:string}>) => {
				const session = this.activeSessions.find(v=>v.id == event.data?.qnaId);
				console.log("Highlighting", event.data?.qnaId, session);
				if(session) {
					this.highlightEntry(session.messages[0]!);
				}
			});

			PublicAPI.instance.addEventListener(TwitchatEvent.QNA_SKIP, (event:TwitchatEvent<{qnaId:string}>) => {
				const session = this.activeSessions.find(v=>v.id == event.data?.qnaId);
				if(session) {
					this.removeMessageFromSession(session.messages[0]!, session);
				}
			});

			PublicAPI.instance.addEventListener(TwitchatEvent.QNA_SESSION_GET_ALL, (event:TwitchatEvent) => {
				this.broadcastQnaList();

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
			this.broadcastQnaList();
			return session;
		},

		stopSession(id:string):void{
			const index = this.activeSessions.findIndex(v=>v.id == id);
			if(index == -1) return;
			const session = this.activeSessions[index]!;
			session.open = false;

			//Execute related triggers
			const m:TwitchatDataTypes.MessageQnaStopData = {
				channel_id:StoreProxy.auth.twitch.user.id,
				date:Date.now(),
				id:Utils.getUUID(),
				platform:"twitchat",
				qnaSession:this.activeSessions[index]!,
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
			const session = this.activeSessions.splice(index, 1)[0]!;

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
			this.broadcastQnaList();
		},

		async addMessageToSession(message:TwitchatDataTypes.TranslatableMessage, session:TwitchatDataTypes.QnaSession):Promise<void>{
			if(session.messages.find(v=>v.message.id === message.id)) return;//Message already added

			let chunks = (JSON.parse(JSON.stringify(message.message_chunks)) || []) as NonNullable<typeof message.message_chunks>;
			for (const c of chunks) {
				if(c.type == "text") {
					c.value = c.value.replace(session.command, "");
					break;
				}
			}

			const qnaMessage:TwitchatDataTypes.QnaSession["messages"][number] = {
				channelId: message.channel_id,
				message: {
					id: message.id,
					chunks
				},
				votes: 1,
				platform: message.platform,
				user: {
					id: message.user.id,
					name: message.user.displayNameOriginal,
				}
			};
			session.messages.push(qnaMessage);

			if(session.shareWithMods) {
				if(session.ownerId != StoreProxy.auth.twitch.user.id) {
					//If remotely moderating session, tell the broadcaster the message must be
					//added to the list
					ApiHelper.call("mod/qna/message", "PUT", {
						entry:qnaMessage,
						sessionId:session.id,
						ownerId:session.ownerId,
					}).catch(error=>{
						StoreProxy.common.alert(StoreProxy.i18n.t("error.qna_action"));
						const index = session.messages.findIndex(v=>v.message.id == qnaMessage.message.id);
						session.messages.splice(index, 1);
					})
				}else{
					this.shareSessionsWithMods();
				}
			}
		},

		async removeMessageFromSession(message:TwitchatDataTypes.QnaSession["messages"][number], session:TwitchatDataTypes.QnaSession):Promise<void>{
			const messageIndex = session.messages.findIndex(v=>v.message.id == message.message.id);
			session.messages.splice(messageIndex, 1);

			if(session.shareWithMods) {
				if(session.ownerId != StoreProxy.auth.twitch.user.id) {
					//If remotely moderating session, tell the broadcaster the message must be
					//removed from the list
					ApiHelper.call("mod/qna/message", "DELETE", {
						messageId:message.message.id,
						sessionId:session.id,
						ownerId:session.ownerId,
					}).catch(error=>{
						StoreProxy.common.alert(StoreProxy.i18n.t("error.qna_action"));
					})
				}else{
					this.shareSessionsWithMods();
				}
			}
		},

		async handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd:string):Promise<void>{
			cmd = cmd.toLowerCase();
			let upvoteMode = false;
			let session = this.activeSessions.find(v=>v.command.toLowerCase() == cmd);

			//If message does not contain a Q&A command but is answer to another message
			//check if the message it answers to has a command so it gets upvoted later
			if(!session && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				const typedMessage = message as TwitchatDataTypes.MessageChatData;
				if(!typedMessage.answersTo) return;
				message = typedMessage.answersTo;
				cmd = (typedMessage.answersTo.message || "").trim().split(" ")[0]!.toLowerCase();
				session = this.activeSessions.find(v=>v.command.toLowerCase() == cmd);
				upvoteMode = true;
			}

			if(session && session.open) {
				if(upvoteMode) {
					const index = session.messages.findIndex(v => v.message.id == message.id);
					if(index > -1) {
						session.messages[index]!.votes ++;
					}
					if(session.shareWithMods && session.ownerId == StoreProxy.auth.twitch.user.id) {
						this.shareSessionsWithMods();
					}
				}else{
					//Ignore channel point rewards that are "highlight my message" as they are also
					//sent as standard message with the "highlight" flag
					const isHighlightReward = message.type == TwitchatDataTypes.TwitchatMessageType.REWARD
					&& (message as TwitchatDataTypes.MessageRewardRedeemData).reward.id == Config.instance.highlightMyMessageReward.id;
					if(isHighlightReward) return;

					this.addMessageToSession(message, session);
				}
			}
		},

		onDeleteMessage(messageID:string):void {
			//Debounce updates to avoid lots of potential process
			//When banning a user this method is called for all their messages
			clearTimeout(deleteDebounce);
			deleteSpool.push(messageID);
			deleteDebounce = window.setTimeout(() => {
				for (let i = 0; i < this.activeSessions.length; i++) {
					const session = this.activeSessions[i]!;
					for (let j = 0; j < session.messages.length; j++) {
						const m = session.messages[j]!;
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
			shareDebounce = window.setTimeout(() => {
				ApiHelper.call("mod/qna", "POST", {sessions:this.activeSessions.filter(v=>v.shareWithMods==true)});
			}, 500);
		},

		highlightEntry(entry:TwitchatDataTypes.QnaSession["messages"][0]):void {
			const fakeMessage:TwitchatDataTypes.MessageChatData = {
				id: entry.message.id,
				platform: entry.platform,
				channel_id: entry.channelId,
				type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				date: Date.now(),
				answers: [],
				is_short: false,
				message: entry.message.chunks.map(v=>v.value)+" ",
				message_chunks: entry.message.chunks,
				message_html: TwitchUtils.messageChunksToHTML(entry.message.chunks),
				message_size: TwitchUtils.computeMessageSize(entry.message.chunks),
				user: StoreProxy.users.getUserFrom(entry.platform, entry.channelId, entry.user.id, undefined, entry.user.name),
			};
			StoreProxy.chat.highlightChatMessageOverlay(fakeMessage);
		},

		broadcastQnaList():void {
			PublicAPI.instance.broadcast(TwitchatEvent.QNA_SESSION_LIST, {qnaSessions:this.activeSessions.map(v=>({id:v.id, command:v.command, open:v.open}))});
		}


	} as IQnaActions
	& ThisType<IQnaActions
		& UnwrapRef<IQnaState>
		& _StoreWithState<"timer", IQnaState, IQnaGetters, IQnaActions>
		& _StoreWithGetters<IQnaGetters>
		& PiniaCustomProperties
	>,
})


if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeQna, import.meta.hot))
}
