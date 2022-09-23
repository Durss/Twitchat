import type { RaffleData, RaffleEntry, WheelItem } from '@/utils/CommonDataTypes';
import IRCClient from '@/utils/IRCClient';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TriggerActionHandler from '@/utils/TriggerActionHandler';
import TwitchatEvent from '@/utils/TwitchatEvent';
import TwitchUtils from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { defineStore } from 'pinia';
import type { JsonObject } from 'type-fest';
import StoreProxy from '../StoreProxy';

export const storeRaffle = defineStore('raffle', {
	state: () => ({
		data: null as RaffleData | null,
	}),



	getters: {
	},



	actions: {

		async startRaffle(payload:RaffleData) {
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
						IRCClient.instance.sendMessage(message);
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
					
					const items:RaffleEntry[] = subs.map(v=>{
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
						const data:{items:WheelItem[], winner:string} = { items, winner };
						PublicAPI.instance.broadcast(TwitchatEvent.WHEEL_OVERLAY_START, (data as unknown) as JsonObject);
					}else{
						//No wheel overlay found, announce on chat
						const winner:WheelItem = Utils.pickRand(items);
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
					const items:RaffleEntry[] = customEntries.map(v=> {
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
						const data:{items:WheelItem[], winner:string} = { items, winner };
						PublicAPI.instance.broadcast(TwitchatEvent.WHEEL_OVERLAY_START, (data as unknown) as JsonObject);
					}else{
						//No wheel overlay found, announce on chat
						const winner:WheelItem = Utils.pickRand(items);
						this.onRaffleComplete(winner, true);
					}
					break;
				}
			}
		},

		stopRaffle() { this.data = null; },

		onRaffleComplete(winner:WheelItem, publish:boolean = false) {
			// this.raffle = null;
			if(!this.data) return;
			const winnerLoc = this.data.entries.find(v=> v.id == winner.id);
			if(!winnerLoc) return;

			if(!this.data.winners) this.data.winners = [];
			this.data.winners.push(winnerLoc);
			
			//Execute triggers
			const message:IRCEventDataList.RaffleResult = {
				type:"raffle",
				data:this.data as RaffleData,
				winner:winnerLoc,
				tags:IRCClient.instance.getFakeTags(),
			}
			TriggerActionHandler.instance.onMessage(message);
			StoreProxy.chat.addChatMessage(message);

			//Post result on chat
			if(StoreProxy.chat.botMessages.raffle.enabled) {
				let message = StoreProxy.chat.botMessages.raffle.message;
				let label = winner.label;
				message = message.replace(/\{USER\}/gi, label);
				IRCClient.instance.sendMessage(message);
			}

			//Publish the result on the public API
			if(publish !== false) {
				PublicAPI.instance.broadcast(TwitchatEvent.RAFFLE_COMPLETE, (winner as unknown) as JsonObject);
			}
		},
	},
})