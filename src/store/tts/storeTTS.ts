import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import IRCClient from '@/utils/IRCClient';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import TTSUtils from '@/utils/TTSUtils';
import { defineStore } from 'pinia'

export const storeTTS = defineStore('tts', {
	state: () => ({
		speaking: false,
		params: {
			enabled:false,
			volume:1,
			rate:1,
			pitch:1,
			voice:'',
			maxLength:0,
			maxDuration:30,
			timeout:0,
			removeEmotes:true,
			removeURL:true,
			replaceURL:'link',
			inactivityPeriod:0,
			readMessages:false,
			readMessagePatern:'{USER} says: {MESSAGE}',
			readWhispers:false,
			readWhispersPattern:'{USER} whispers: {MESSAGE}',
			readNotices:false,
			readNoticesPattern:'{MESSAGE}',
			readRewards:false,
			readRewardsPattern:"{USER} redeemed reward {REWARD_NAME}",
			readSubs:false,
			readSubsPattern:"{USER} subscribed at tier {TIER}",
			readSubgifts:false,
			readSubgiftsPattern:"{USER} gifted {COUNT} sub tier {TIER} to {RECIPIENTS}",
			readBits:false,
			readBitsMinAmount:0,
			readBitsPattern:"{USER} sent {BITS} bits",
			readRaids:false,
			readRaidsPattern:"{USER} raided with {VIEWERS} viewers",
			readFollow:false,
			readFollowPattern:"{USER} is now following",
			readPolls:false,
			readPollsPattern:"Poll \"{TITLE}\" ended. Winning choice is, {WINNER}",
			readPredictions:false,
			readPredictionsPattern:"Prediction \"{TITLE}\" ended. Winning choice is, {WINNER}",
			readBingos:false,
			readBingosPattern:"{WINNER} won the bingo",
			readRaffle:false,
			readRafflePattern:"{WINNER} won the raffle",
			ttsPerms:{
				broadcaster:true,
				mods:true,
				vips:true,
				subs:true,
				all:true,
				users:""
			},
		} as TwitchatDataTypes.TTSParamsData,
	}),



	getters: {
	},



	actions: {

		ttsReadMessage(payload:IRCEventDataList.Message) {
			TTSUtils.instance.readNow(payload.message);
		},

		ttsReadUser(payload:{username:string, read:boolean}) {
			let list = this.params.ttsPerms.users.toLowerCase().split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9_]+/gi);
			payload.username = payload.username.toLowerCase().replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9_]+/gi, "").trim();
			const index = list.indexOf(payload.username)
			if(index > -1) {
				if(!payload.read) list.splice(index, 1);
			}else if(payload.read){
				list.push(payload.username);
			}
			list = list.filter(v => v.trim().length > 2);
			this.params.ttsPerms.users = list.join(",");
			if(payload.read) {
				IRCClient.instance.sendNotice("tts", "User <mark>"+payload.username+"</mark>'s messages will be read out loud.");
			}else{
				IRCClient.instance.sendNotice("tts", "User <mark>"+payload.username+"</mark>'s messages will not be read out loud anymore.");
			}
		},

		setTTSParams(params:TwitchatDataTypes.TTSParamsData) {
			this.params = params;
			DataStore.set(DataStore.TTS_PARAMS, params);
			TTSUtils.instance.enabled = params.enabled;
		},
	},
})