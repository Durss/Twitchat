import TwitchatEvent from '@/events/TwitchatEvent';
import MessengerProxy from '@/messaging/MessengerProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IRaffleActions, type IRaffleGetters, type IRaffleState } from '../StoreProxy';

export const storeRaffle = defineStore('raffle', {
	state: () => ({
		data: null,
	} as IRaffleState),



	getters: {
	} as IRaffleGetters
	& ThisType<UnwrapRef<IRaffleState> & _StoreWithGetters<IRaffleGetters> & PiniaCustomProperties>
	& _GettersTree<IRaffleState>,



	actions: {

		async startRaffle(payload:TwitchatDataTypes.RaffleData) {
			this.data = payload;
			
			payload.created_at = Date.now();
			
			switch(payload.mode) {
				case "chat": {
					//Start countdown if requested
					if(payload.showCountdownOverlay) {
						StoreProxy.timer.countdownStart(payload.duration_s * 1000);
					}
					//Announce start on chat
					if(StoreProxy.chat.botMessages.raffleStart.enabled && payload.command) {
						let message = StoreProxy.chat.botMessages.raffleStart.message;
						message = message.replace(/\{CMD\}/gi, payload.command);
						MessengerProxy.instance.sendMessage(message);
					}
					break;
				}

				case "sub": {
					this.pickWinner(payload);
					break;
				}

				case "manual": {
					this.pickWinner(payload);
					break;
				}
			}
		},

		stopRaffle() { this.data = null; },

		onRaffleComplete(winner:TwitchatDataTypes.RaffleEntry, publish:boolean = false) {
			// this.raffle = null;
			let data:TwitchatDataTypes.RaffleData|null = this.data;
			console.log("WINNER:", winner);
			console.log("      :", data);
			if(data) {
				const winnerLoc = data.entries.find(v=> v.id == winner.id);
				if(winnerLoc) {
					winner = winnerLoc;
					
					if(!data.winners) data.winners = [];
					data.winners.push(winnerLoc);

					if(winnerLoc.user) {
						if(StoreProxy.params.features.raffleHighlightUser.value) {
							const user = StoreProxy.users.getUserFrom(winnerLoc.user.platform, winnerLoc.user.channel_id, winnerLoc.user.id);
							console.log("RAFFLE WINNER:", user);
							StoreProxy.users.trackUser(user);
							setTimeout(()=> {
								StoreProxy.users.untrackUser(user);
							}, 5 * 60 * 1000);
						}
					}
				}

			}else{
				data = {
					command:"",
					created_at:Date.now(),
					entries:[winner],
					winners:[winner],
					customEntries:"",
					duration_s:0,
					followRatio:1,
					subgiftRatio:1,
					subRatio:1,
					vipRatio:1,
					subMode_excludeGifted:false,
					subMode_includeGifters:false,
					maxEntries:0,
					mode:"chat",
					showCountdownOverlay:false,
				};
			}
			
			//Execute triggers
			const message:TwitchatDataTypes.MessageRaffleData = {
				type:TwitchatDataTypes.TwitchatMessageType.RAFFLE,
				platform:"twitchat",
				id:Utils.getUUID(),
				date:Date.now(),
				raffleData:data,
				winner,
			}
			StoreProxy.chat.addMessage(message);

			//Post result on chat
			if(StoreProxy.chat.botMessages.raffle.enabled) {
				let message = StoreProxy.chat.botMessages.raffle.message;
				message = message.replace(/\{USER\}/gi, winner.label);
				MessengerProxy.instance.sendMessage(message);
			}

			//Publish the result on the public API
			if(publish !== false) {
				PublicAPI.instance.broadcast(TwitchatEvent.RAFFLE_RESULT, (winner as unknown) as JsonObject);
			}
		},

		async checkRaffleJoin(message:TwitchatDataTypes.ChatMessageTypes):Promise<void> {
			if(!this.data || this.data.mode != "chat") return;

			if(!("user" in message)) return;
			if(!("channel_id" in message)) return;

			const messageCast = message as TwitchatDataTypes.GreetableMessage;

			const sUsers = StoreProxy.users;
			const sChat = StoreProxy.chat;
			const raffle = this.data;
			const ellapsed = Date.now() - new Date(raffle.created_at).getTime();
			//Check if within time frame and max users count isn't reached and that user
			//hasn't already entered
			if(ellapsed <= raffle.duration_s * 1000
			&& (raffle.maxEntries <= 0 || raffle.entries.length < raffle.maxEntries)
			&& !raffle.entries.find(v=>v.id == messageCast.user.id)) {
				let score = 1;
				const user = messageCast.user;
				//Apply ratios if any is defined
				if(raffle.vipRatio > 0 && user.channelInfo[messageCast.channel_id].is_vip)			score += raffle.vipRatio;
				if(raffle.subRatio > 0 && user.channelInfo[messageCast.channel_id].is_subscriber)	score += raffle.subRatio;
				if(raffle.subgiftRatio > 0 && user.channelInfo[messageCast.channel_id].is_gifter)	score += raffle.subgiftRatio;
				if(raffle.followRatio > 0) {
					//Check if user is following
					if(user.channelInfo[messageCast.channel_id].is_following === undefined) sUsers.checkFollowerState(user, messageCast.channel_id);
					if(user.channelInfo[messageCast.channel_id].is_following === true) score += raffle.followRatio;
				}
				raffle.entries.push( {
					score,
					label:user.displayName,
					id:user.id,
					user:{
						id:messageCast.user.id,
						platform:messageCast.platform,
						channel_id:messageCast.channel_id,
					}
				} );
				
				if(sChat.botMessages.raffleJoin.enabled) {
					let message = sChat.botMessages.raffleJoin.message;
					message = message.replace(/\{USER\}/gi, user.displayName)
					MessengerProxy.instance.sendMessage(message, [user.platform]);
				}
			}
		},

		async pickWinner(forcedData?:TwitchatDataTypes.RaffleData, forcedWinner?:TwitchatDataTypes.RaffleEntry):Promise<void> {
			const data = forcedData ?? this.data;
			if(!data) {
				StoreProxy.main.alert(StoreProxy.i18n.t("error.raffle.pick_winner_no_raffle"));
				return;
			}

			let winner:TwitchatDataTypes.RaffleEntry;

			//Pick from a custom list
			if(data.mode == "manual") {
				let id = 0;
				let customEntries:string[] = [];
				const customEntriesStr = data.customEntries;
				if(customEntriesStr?.length > 0) {
					const splitter = customEntriesStr.split(/\r|\n/).length > 1? "\r|\n" : ",";
					customEntries = customEntriesStr.split(new RegExp(splitter, ""));
					customEntries = customEntries.map(v=> v.trim());
				}else{
					StoreProxy.main.alert(StoreProxy.i18n.t("error.raffle.pick_winner_no_entry"));
					return;
				}
				const items:TwitchatDataTypes.RaffleEntry[] = customEntries.map(v=> {
					return {
						id:(id++).toString(),
						label:v,
						score:1,
					}
				});
				data.entries = items;

			//Pick from subs
			}else if(data.mode == "sub") {
				const idToExists:{[key:string]:boolean} = {};
				let subs = await TwitchUtils.getSubsList();
				subs = subs.filter(v => {
					//Avoid duplicates
					if(idToExists[v.user_id] == true) return false;
					if(idToExists[v.gifter_id] == true && v.gifter_id) return false;
					idToExists[v.user_id] = true;
					idToExists[v.gifter_id] = true;
					//Filter based on params
					if(data.subMode_includeGifters == true && subs.find(v2=> v2.gifter_id == v.user_id)) return true;
					if(data.subMode_excludeGifted == true && v.is_gift) return false;
					if(v.user_id == v.broadcaster_id) return false;//Exclude self
					return true;
				});
				if(subs.length === 0) {
					StoreProxy.main.alert(StoreProxy.i18n.t("error.raffle.pick_winner_no_subs"));
					return;
				}
				
				const items:TwitchatDataTypes.RaffleEntry[] = subs.map(v=>{
					return {
						id:v.user_id,
						label:v.user_name,
						score:1,
					}
				});
				data.entries = items;
			}
			
			const list = [];
			//Ponderate votes by adding one user many times if their
			//score is greater than 1
			for (let i = 0; i < data.entries.length; i++) {
				const u = data.entries[i];
				if(u.score==1) list.push(u);
				else {
					for (let j = 0; j < u.score; j++) {
						list.push(u);
					}
				}
			}

			if(list.length === 0) {
				StoreProxy.main.alert(StoreProxy.i18n.t("error.raffle.pick_winner_no_entry"));
				return;
			}

			if(!data.winners) {
				data.winners = [];
			}
			
			//Pick a winner that has not already be picked
			if(forcedWinner) {
				winner = forcedWinner;
			}else{
				do{
					winner = Utils.pickRand(list);
				}while(data.winners.find(w => w.id == winner.id));
			}
			
			//Ask if a wheel overlay exists
			let wheelOverlayExists = false;

			const wheelOverlayPresenceHandler = ()=> { wheelOverlayExists = true; };
			PublicAPI.instance.addEventListener(TwitchatEvent.WHEEL_OVERLAY_PRESENCE, wheelOverlayPresenceHandler);

			PublicAPI.instance.broadcast(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE);
			await Utils.promisedTimeout(500);//Give the overlay some time to answer
			PublicAPI.instance.removeEventListener(TwitchatEvent.WHEEL_OVERLAY_PRESENCE, wheelOverlayPresenceHandler);
	
			//A wheel overlay exists, send its data and wait for it to complete
			if(wheelOverlayExists){
				const list:TwitchatDataTypes.EntryItem[] = data.entries.map((v:TwitchatDataTypes.RaffleEntry):TwitchatDataTypes.EntryItem=>{
											return {
												id:v.id,
												label:v.label,
											}
										});
				const apiData:TwitchatDataTypes.WheelData = {
					items:list,
					winner:winner.id,
				}
				PublicAPI.instance.broadcast(TwitchatEvent.WHEEL_OVERLAY_START, (apiData as unknown) as JsonObject);
	
			}else{
	
				//no wheel overlay found, just announce the winner
				this.onRaffleComplete(winner);
			}
	
		}
	} as IRaffleActions
	& ThisType<IRaffleActions
		& UnwrapRef<IRaffleState>
		& _StoreWithState<"raffle", IRaffleState, IRaffleGetters, IRaffleActions>
		& _StoreWithGetters<IRaffleGetters>
		& PiniaCustomProperties
	>,
})