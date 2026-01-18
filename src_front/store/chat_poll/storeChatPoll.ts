import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { PollOverlayParamStoreData } from '../poll/storePoll';
import StoreProxy, { type IChatPollActions, type IChatPollGetters, type IChatPollState } from '../StoreProxy';
import SetTimeoutWorker from '@/utils/SetTimeoutWorker';
import Utils from '@/utils/Utils';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';

let timeoutEnd = "";
export const storeChatPoll = defineStore('chatPoll', {
	state: () => ({
		data: null,
		presets: {
			duration_s: 2 * 60,
			voteCount: 1,
			permissions: Utils.getDefaultPermissions(),
			history:[],
		},
		overlayParams: {
			showTitle:true,
			listMode:true,
			listModeOnlyMore2:true,
			showLabels:true,
			showVotes:false,
			showPercent:false,
			showTimer:true,
			resultDuration_s:5,
			showOnlyResult:false,
			placement:"bl",
		},
	} as IChatPollState),



	getters: {
	} as IChatPollGetters
	& ThisType<UnwrapRef<IChatPollState> & _StoreWithGetters<IChatPollGetters> & PiniaCustomProperties>
	& _GettersTree<IChatPollState>,



	actions: {

		populateData(params?:PollOverlayParamStoreData):void {
			if(!params) {
				//Init poll overlay params
				const pollParams = DataStore.get(DataStore.CHAT_POLL_OVERLAY_PARAMS);
				if(pollParams) {
					params = JSON.parse(pollParams);
				}
				//Init poll presets
				const pollPresets = DataStore.get(DataStore.CHAT_POLL_PRESETS);
				if(pollPresets) {
					this.presets = JSON.parse(pollPresets) as TwitchatDataTypes.ChatPollPresets;
				}
			}else
			if(params) {
				this.overlayParams.showTitle =			params.showTitle !== false;
				this.overlayParams.listMode =			params.listMode !== false;
				this.overlayParams.listModeOnlyMore2 =	params.listModeOnlyMore2 !== false;
				this.overlayParams.showLabels =			params.showLabels !== false;
				this.overlayParams.showVotes =			params.showVotes !== false;
				this.overlayParams.showPercent =		params.showPercent !== false;
				this.overlayParams.showTimer =			params.showTimer !== false;
				this.overlayParams.showOnlyResult =		params.showOnlyResult !== false;
				this.overlayParams.resultDuration_s =	params.resultDuration_s || 5;
				this.overlayParams.placement =			params.placement || "bl";
			}

			/**
			 * Called when poll overlay request for its configs
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_CHAT_POLL_OVERLAY_PARAMETERS, (e:TwitchatEvent)=> {
				this.broadcastState();
			});
		},

		async handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd:string):Promise<void> {
			// Check if a poll is running
			if(!this.data) return;

			const voteMsg = (message.message || "").trim().split(" ")[0]!
			// Check if message matches a valid index
			const index = parseInt(voteMsg);
			if(index < 1 || index > this.data.choices.length || isNaN(index) || index.toString().trim() != voteMsg) return;

			// Check permission
			if(!await Utils.checkPermissions(this.data.permissions, message.user, message.channel_id)) return;

			if(this.data.votes[message.user.id]) {
				// Check if the user has already voted for this index
				if (this.data.votes[message.user.id]!.indices.includes(index)) return;

				// Check if the user has reached the maximum number of votes allowed
				if (this.data.votes[message.user.id]!.indices.length >= this.data.maxVotePerUser) return;
			}else{
				this.data.votes[message.user.id] = {
					indices: [],
					login: message.user.login,
					platform: message.platform,
				};
			}
			this.data.votes[message.user.id]!.indices.push(index);

			this.data.choices[index-1]!.votes ++;
			PublicAPI.instance.broadcast(TwitchatEvent.CHAT_POLL_PROGRESS, {poll: this.data});
		},

		setCurrentPoll(data:typeof this.data, replacePresets:boolean = false) {
			SetTimeoutWorker.instance.delete(timeoutEnd);
			if(data != null) {
				timeoutEnd = SetTimeoutWorker.instance.create(()=>this.setCurrentPoll(null), data.duration_s * 1000);

				const message:TwitchatDataTypes.MessageChatPollData = {
					id: Utils.getUUID(),
					type: TwitchatDataTypes.TwitchatMessageType.CHAT_POLL,
					channel_id: StoreProxy.auth.twitch.user.id,
					date: Date.now(),
					isStart: false,
					platform: "twitchat",
					poll: data,
				}

				//Executes the start poll trigger if there was no poll data before
				if(!this.data) {
					message.isStart = true;
					TriggerActionHandler.instance.execute(message);
				}

				this.data = data;

				PublicAPI.instance.broadcast(TwitchatEvent.CHAT_POLL_PROGRESS, {poll: (data as unknown) as JsonObject});

				if(replacePresets) {
					this.presets.duration_s = data.duration_s;
					this.presets.voteCount = data.maxVotePerUser;
					this.presets.permissions = data.permissions;
					this.presets.history.unshift(JSON.parse(JSON.stringify(data)));

					const done:{[key:string]:boolean} = {};
					this.presets.history = this.presets.history.map(v => {
						const options = v.choices.map(c=>c.label);
						let key = v.title+v.duration_s+v.maxVotePerUser+options.join(",");
						if(done[key]) return null;
						done[key] = true;
						return v;
					}).filter(v=> v != null);

					// Keep only the last 10 polls
					if(this.presets.history.length > 10) {
						this.presets.history.pop();
					}
					DataStore.set(DataStore.CHAT_POLL_PRESETS, this.presets);
				}

			}else if(this.data){
				this.data.winner = this.data.choices.reduce((prev, curr) => {
					return (prev.votes > curr.votes) ? prev : curr;
				});
				const message:TwitchatDataTypes.MessageChatPollData = {
					id: Utils.getUUID(),
					type: TwitchatDataTypes.TwitchatMessageType.CHAT_POLL,
					channel_id: StoreProxy.auth.twitch.user.id,
					date: Date.now(),
					isStart: false,
					platform: "twitchat",
					poll: this.data,
				}

				//Post result on chat
				StoreProxy.chat.addMessage(message);

				//Clear overlay
				PublicAPI.instance.broadcast(TwitchatEvent.CHAT_POLL_PROGRESS, {});
			}

			this.data = data;
		},

		setOverlayParams(params:PollOverlayParamStoreData):void {
			this.populateData(params);
			DataStore.set(DataStore.CHAT_POLL_OVERLAY_PARAMS, this.overlayParams);
			PublicAPI.instance.broadcast(TwitchatEvent.CHAT_POLL_OVERLAY_PARAMETERS, {parameters: (this.overlayParams as unknown) as JsonObject});
		},

		broadcastState():void {
			if(this.data) {
				PublicAPI.instance.broadcast(TwitchatEvent.CHAT_POLL_PROGRESS, {poll: (this.data as unknown) as JsonObject});
			}
			PublicAPI.instance.broadcast(TwitchatEvent.CHAT_POLL_OVERLAY_PARAMETERS, {parameters: (this.overlayParams as unknown) as JsonObject});
		},
	} as IChatPollActions
	& ThisType<IChatPollActions
		& UnwrapRef<IChatPollState>
		& _StoreWithState<"chatPoll", IChatPollState, IChatPollGetters, IChatPollActions>
		& _StoreWithGetters<IChatPollGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeChatPoll, import.meta.hot))
}
