import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import BTTVUtils from '@/utils/emotes/BTTVUtils';
import FFZUtils from '@/utils/emotes/FFZUtils';
import SevenTVUtils from '@/utils/emotes/SevenTVUtils';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IParamsActions, IParamsGetters, IParamsState } from '../StoreProxy';

export const storeParams = defineStore('params', {
	state: () => ({
		features: {
			spoilersEnabled: 			{save:true, type:"toggle", value:true, label:"Enable spoiler tag", id:216, icon:"show_purple.svg"},
			alertMode: 					{save:true, type:"toggle", value:true, label:"Enable chat alert", id:217, icon:"alert_purple.svg"},
			firstMessage: 				{save:true, type:"toggle", value:true, label:"Show the first message of every viewer on a seperate list so you don't forget to say hello", id:201, icon:"firstTime_purple.svg", example:"greetThem.png"},
			markAsRead: 				{save:true, type:"toggle", value:true, label:"Click a message to remember where you stopped reading", id:204, icon:"read_purple.svg"},
			conversationsEnabled: 		{save:true, type:"toggle", value:true, label:"Group conversations<br>(allows to display conversations between users seperately)", id:202, icon:"conversation_purple.svg", example:"conversation.gif"},
			userHistoryEnabled: 		{save:true, type:"toggle", value:true, label:"See all user's messages when hovering their name", id:203, icon:"conversation_purple.svg", example:"userHistory.gif"},
			lockAutoScroll: 			{save:true, type:"toggle", value:false, label:"Pause chat on hover", id:205, icon:"pause_purple.svg"},
			showModTools: 				{save:true, type:"toggle", value:true, label:"Show mod tools (TO,ban,delete)", id:206, icon:"ban_purple.svg"},
			raidHighlightUser: 			{save:true, type:"toggle", value:true, label:"Highlight raider's messages for 5 minutes", id:209, icon:"raid_purple.svg", example:"raidHighlightUser.png"},
			groupIdenticalMessage:		{save:true, type:"toggle", value:true, label:"Group identical messages of a user<br>(sending the exact same message less than 30s later brings it back to bottom and increments a counter on it)", id:208, icon:"increment_purple.svg", example:"groupIdenticalMessage.gif"},
			offlineEmoteOnly:			{save:true, type:"toggle", value:false, label:"Set chat on emote-only when not live", id:214, icon:"emote_purple.svg"},
			stopStreamOnRaid:			{save:true, type:"toggle", value:false, label:"Cut OBS stream after a raid", id:212, icon:"obs_purple.svg"},
			showUserPronouns:			{save:true, type:"toggle", value:false, label:"Show user pronouns", id:213, icon:"user_purple.svg"},
			chatShoutout:				{save:true, type:"toggle", value:false, label:"Chat message shoutout", id:215, icon:"shoutout_purple.svg"},
		},
		appearance: {
			censorDeletedMessages: 		{save:true, type:"toggle", value:true, label:"Censor deleted messages", id:25, icon:"hide_purple.svg"},
			highlightMods: 				{save:true, type:"toggle", value:true, label:"Highlight Mods", id:9, icon:"mod_purple.svg"},
			highlightVips: 				{save:true, type:"toggle", value:false, label:"Highlight VIPs", id:10, icon:"vip_purple.svg"},
			highlightSubs: 				{save:true, type:"toggle", value:false, label:"Highlight Subs", id:11, icon:"sub_purple.svg"},
			highlightPartners: 			{save:true, type:"toggle", value:false, label:"Highlight partners", id:26, icon:"partner_purple.svg"},
			highlightMentions: 			{save:true, type:"toggle", value:true, label:"Highlight messages mentioning me", id:1, icon:"broadcaster_purple.svg"},
			highlightNonFollowers: 		{save:true, type:"toggle", value:false, label:"Indicate non-followers (network intensive)", id:16, icon:"unfollow_purple.svg", example:"nofollow.png"},
			translateNames:				{save:true, type:"toggle", value:true, label:"Translate user names", id:22, icon:"translate_purple.svg", example:"translate.png"},
			showRewardsInfos: 			{save:true, type:"toggle", value:false, label:"Show reward's details", id:23,example:"rewardDetails.png"},
			showViewersCount: 			{save:true, type:"toggle", value:true, label:"Show viewers count", id:17, icon:"user_purple.svg"},
			showEmotes: 				{save:true, type:"toggle", value:true, label:"Show emotes", id:2, icon:"emote_purple.svg"},
			bttvEmotes: 				{save:true, type:"toggle", value:false, label:"Show BTTV emotes", id:3, icon:"emote_purple.svg", parent:2},
			ffzEmotes: 					{save:true, type:"toggle", value:false, label:"Show FFZ emotes", id:19, icon:"emote_purple.svg", parent:2},
			sevenTVEmotes: 				{save:true, type:"toggle", value:false, label:"Show 7TV emotes", id:20, icon:"emote_purple.svg", parent:2},
			showBadges: 				{save:true, type:"toggle", value:true, label:"Show badges", id:4, icon:"badge_purple.svg"},
			minimalistBadges: 			{save:true, type:"toggle", value:false, label:"Minified badges", id:5, parent:4, example:"minibadges.png"},
			displayTime: 				{save:true, type:"toggle", value:false, label:"Display time", id:6, icon:"timeout_purple.svg"},
			splitViewVertical: 			{save:true, type:"toggle", value:false, label:"Vertical layout", id:21, tooltip:"Order message lists vertically"},
			dyslexicFont: 				{save:true, type:"toggle", value:false, label:"Use dyslexic-friendly font", id:24},
			defaultSize: 				{save:true, type:"slider", value:2, label:"Text size ({VALUE})", min:1, max:7, step:1, id:12},
		},
		chatColumnsConfig:[
			{
				id: Utils.getUUID(),
				order: 0,
				size: 0.6,
				liveLockCount: 3,
				commandsBlockList: "",
				userBlockList: "",
				filters: {
					join: false,
					message: true,
					whisper: true,
					raid: false,
					poll: false,
					leave: false,
					cheer: false,
					bingo: false,
					raffle: false,
					reward: false,
					notice: false,
					shoutout: false,
					following: false,
					countdown: false,
					prediction: false,
					twitchat_ad: true,
					subscription: false,
					hype_train_summary: false,
					hype_train_cooled_down: false,
					community_boost_complete: false,
					community_challenge_contribution: false
				},
				messageFilters: {
					automod: false,
					suspiciousUsers: false,
					deleted: false,
					bots: true,
					commands: true,
					moderators: true,
					subs: true,
					viewers: true,
					vips: true,
					partners: true,
					short: true
				}
			},
			{
				id: Utils.getUUID(),
				order: 1,
				size: 0.4,
				liveLockCount: 3,
				commandsBlockList: "",
				userBlockList: "",
				filters: {
					join: false,
					message: true,
					whisper: false,
					raid: true,
					poll: true,
					leave: false,
					cheer: true,
					bingo: true,
					raffle: true,
					reward: true,
					notice: true,
					shoutout: true,
					following: true,
					countdown: true,
					prediction: true,
					twitchat_ad: false,
					subscription: true,
					hype_train_summary: true,
					hype_train_cooled_down: true,
					community_boost_complete: true,
					community_challenge_contribution: true
				},
				messageFilters: {
					automod: true,
					suspiciousUsers: true,
					deleted: true,
					bots: false,
					commands: false,
					moderators: false,
					subs: false,
					viewers: false,
					vips: false,
					partners: false,
					short: false
				}
			}
		],
	} as IParamsState),



	getters: {
	} as IParamsGetters
	& ThisType<UnwrapRef<IParamsState> & _StoreWithGetters<IParamsGetters> & PiniaCustomProperties>
	& _GettersTree<IParamsState>,



	actions: {
		updateParams() {
			for (const cat in this.$state) {
				const c = cat as TwitchatDataTypes.ParameterCategory;
				for (const key in this[c]) {
					/* eslint-disable-next-line */
					const v = this[c][key as TwitchatDataTypes.ParameterCategory].value;
					DataStore.set("p:"+key, v);
					if(key=="bttvEmotes") {
						if(v === true) {
							BTTVUtils.instance.enable();
						}else{
							BTTVUtils.instance.disable();
						}
					}
					if(key=="ffzEmotes") {
						if(v === true) {
							FFZUtils.instance.enable();
						}else{
							FFZUtils.instance.disable();
						}
					}
					if(key=="sevenTVEmotes") {
						if(v === true) {
							SevenTVUtils.instance.enable();
						}else{
							SevenTVUtils.instance.disable();
						}
					}
				}
			}
		},

		addChatColumn(after?:TwitchatDataTypes.ChatColumnsConfig):TwitchatDataTypes.ChatColumnsConfig {
			let order = 0;
			if(this.chatColumnsConfig?.length > 0) {
				order = this.chatColumnsConfig[this.chatColumnsConfig.length-1].order + 1;
			}
			const col:TwitchatDataTypes.ChatColumnsConfig = {
				id:Utils.getUUID(),
				order,
				size:1/2,
				liveLockCount:3,
				commandsBlockList:"",
				userBlockList:"",
				filters:{
					join:false,
					message:false,
					whisper:false,
					raid:false,
					poll:false,
					leave:false,
					cheer:false,
					bingo:false,
					raffle:false,
					reward:false,
					notice:false,
					shoutout:false,
					following:false,
					countdown:false,
					prediction:false,
					twitchat_ad:false,
					subscription:false,
					hype_train_summary:false,
					hype_train_cooled_down:false,
					community_boost_complete:false,
					community_challenge_contribution:false,
				},
				messageFilters:{
					automod:true,
					suspiciousUsers:true,
					deleted:true,
					bots:true,
					commands:true,
					moderators:true,
					subs:true,
					viewers:true,
					vips:true,
					partners:true,
					short:true,
				}
			}
			if(after) {
				const index = this.chatColumnsConfig.findIndex(v=>v.order==after.order);
				this.chatColumnsConfig.splice(index+1, 0, col);
				for (let i = 0; i < this.chatColumnsConfig.length; i++) {
					this.chatColumnsConfig[i].order = i;
				}
			}else{
				this.chatColumnsConfig.push(col);
			}
			DataStore.set(DataStore.CHAT_COLUMNS_CONF, this.chatColumnsConfig, true);
			return col;
		},

		delChatColumn(column:TwitchatDataTypes.ChatColumnsConfig):void {
			let decrement = false;
			for (let i = 0; i < this.chatColumnsConfig.length; i++) {
				const e = this.chatColumnsConfig[i];
				if(e == column) {
					this.chatColumnsConfig.splice(i, 1);
					decrement = true;
					i--;
				}else
				if(decrement) e.order--;
			}
			this.saveChatColumnConfs();
		},

		saveChatColumnConfs():void {
			DataStore.set(DataStore.CHAT_COLUMNS_CONF, this.chatColumnsConfig, true);
		},
	} as IParamsActions
	& ThisType<IParamsActions
		& UnwrapRef<IParamsState>
		& _StoreWithState<"params", IParamsState, IParamsGetters, IParamsActions>
		& _StoreWithGetters<IParamsGetters>
		& PiniaCustomProperties
	>,
})