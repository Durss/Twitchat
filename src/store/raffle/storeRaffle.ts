import MessengerProxy from '@/messaging/MessengerProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TriggerActionHandler from '@/utils/TriggerActionHandler';
import TwitchatEvent from '@/utils/TwitchatEvent';
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
			
			let overlayAvailable = false;
			const callback = (e:TwitchatEvent) => {overlayAvailable = true;}
			PublicAPI.instance.addEventListener(TwitchatEvent.WHEEL_OVERLAY_PRESENCE, callback);
			
			//Ask if the wheel overlay exists
			PublicAPI.instance.broadcast(TwitchatEvent.GET_WHEEL_OVERLAY_PRESENCE);
			await Utils.promisedTimeout(1000);//Give the overlay some time to answer
			PublicAPI.instance.removeEventListener(TwitchatEvent.WHEEL_OVERLAY_PRESENCE, callback);
			
			switch(payload.mode) {
				case "chat": {
					//Start countdown if requested
					if(payload.showCountdownOverlay) {
						StoreProxy.timer.startCountdown(payload.duration * 1000 * 60);
					}
					//Announce start on chat
					if(StoreProxy.chat.botMessages.raffleStart.enabled) {
						let message = StoreProxy.chat.botMessages.raffleStart.message;
						message = message.replace(/\{CMD\}/gi, payload.command);
						MessengerProxy.instance.sendMessage(message);
					}
					break;
				}

				case "sub": {
					const idToExists:{[key:string]:boolean} = {};
					let subs = await TwitchUtils.getSubsList();
					subs = subs.filter(v => {
						//Avoid duplicates
						if(idToExists[v.user_id] == true) return false;
						if(idToExists[v.gifter_id] == true && v.gifter_id) return false;
						idToExists[v.user_id] = true;
						idToExists[v.gifter_id] = true;
						//Filter based on params
						if(payload.subMode_includeGifters == true && subs.find(v2=> v2.gifter_id == v.user_id)) return true;
						if(payload.subMode_excludeGifted == true && v.is_gift) return false;
						if(v.user_id == v.broadcaster_id) return false;//Exclude self
						return true;
					});
					
					const items:TwitchatDataTypes.RaffleEntry[] = subs.map(v=>{
						return {
							id:v.user_id,
							label:v.user_name,
							score:1,
						}
					});
					this.data.entries = items;
					
					if(overlayAvailable) {
						//A wheel overlay exists, ask it to animate
						const winner = Utils.pickRand(items).id;
						const data:{items:TwitchatDataTypes.EntryItem[], winner:string} = { items, winner };
						PublicAPI.instance.broadcast(TwitchatEvent.WHEEL_OVERLAY_START, (data as unknown) as JsonObject);
					}else{
						//No wheel overlay found, announce on chat
						const winner:TwitchatDataTypes.EntryItem = Utils.pickRand(items);
						this.onRaffleComplete(winner, true)
					}
					break;
				}

				case "manual": {
					let id = 0;
					let customEntries:string[] = [];
					let customEntriesStr = payload.customEntries;
					if(customEntriesStr?.length > 0) {
						const splitter = customEntriesStr.split(/\r|\n/).length > 1? "\r|\n" : ",";
						customEntries = customEntriesStr.split(new RegExp(splitter, ""));
						customEntries = customEntries.map(v=> v.trim());
					}else{
						customEntries = ["invalid custom entries"];
					}
					const items:TwitchatDataTypes.RaffleEntry[] = customEntries.map(v=> {
						return {
							id:(id++).toString(),
							label:v,
							score:1,
						}
					});
					this.data.entries = items;
					
					if(overlayAvailable) {
						//A wheel overlay exists, ask it to animate
						const winner = Utils.pickRand(items).id;
						const data:{items:TwitchatDataTypes.EntryItem[], winner:string} = { items, winner };
						PublicAPI.instance.broadcast(TwitchatEvent.WHEEL_OVERLAY_START, (data as unknown) as JsonObject);
					}else{
						//No wheel overlay found, announce on chat
						const winner:TwitchatDataTypes.EntryItem = Utils.pickRand(items);
						this.onRaffleComplete(winner, true);
					}
					break;
				}
			}
		},

		stopRaffle() { this.data = null; },

		onRaffleComplete(winner:TwitchatDataTypes.EntryItem, publish:boolean = false) {
			// this.raffle = null;
			if(!this.data) return;

			const winnerLoc = this.data.entries.find(v=> v.id == winner.id);
			if(!winnerLoc) return;

			if(!this.data.winners) this.data.winners = [];
			this.data.winners.push(winnerLoc);
			
			//Execute triggers
			const message:TwitchatDataTypes.MessageRaffleData = {
				type:"raffle",
				platform:"twitchat",
				id:Utils.getUUID(),
				date:Date.now(),
				raffleData:this.data,
			}
			TriggerActionHandler.instance.onMessage(message);
			StoreProxy.chat.addMessage(message);

			//Post result on chat
			if(StoreProxy.chat.botMessages.raffle.enabled) {
				let message = StoreProxy.chat.botMessages.raffle.message;
				message = message.replace(/\{USER\}/gi, winner.label);
				MessengerProxy.instance.sendMessage(message);
			}

			//Publish the result on the public API
			if(publish !== false) {
				PublicAPI.instance.broadcast(TwitchatEvent.RAFFLE_COMPLETE, (winner as unknown) as JsonObject);
			}
		},

		async checkRaffleJoin(message:TwitchatDataTypes.MessageChatData):Promise<void> {
			if(!this.data) return;

			const sUsers = StoreProxy.users;
			const sChat = StoreProxy.chat;
			const raffle = this.data;
			const ellapsed = new Date().getTime() - new Date(raffle.created_at).getTime();
			//Check if within time frame and max users count isn't reached and that user
			//hasn't already entered
			if(ellapsed <= raffle.duration * 60000
			&& (raffle.maxEntries <= 0 || raffle.entries.length < raffle.maxEntries)
			&& !raffle.entries.find(v=>v.id == message.user.id)) {
				let score = 1;
				const user = message.user;
				//Apply ratios if any is defined
				if(raffle.vipRatio > 0 && user.is_vip)			score += raffle.vipRatio;
				if(raffle.subRatio > 0 && user.is_subscriber)	score += raffle.subRatio;
				if(raffle.subgitRatio > 0 && user.is_gifter)	score += raffle.subgitRatio;
				if(raffle.followRatio > 0) {
					//Check if user is following
					if(user.is_following === undefined) sUsers.checkFollowerState(user);
					if(user.is_following === true) score += raffle.followRatio;
				}
				raffle.entries.push( {
					score,
					label:user.displayName,
					id:user.id,
				} );
				
				if(sChat.botMessages.raffleJoin.enabled) {
					let message = sChat.botMessages.raffleJoin.message;
					message = message.replace(/\{USER\}/gi, user.displayName)
					MessengerProxy.instance.sendMessage(message, [user.platform]);
				}
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