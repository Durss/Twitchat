import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import BTTVUtils from '@/utils/emotes/BTTVUtils';
import FFZUtils from '@/utils/emotes/FFZUtils';
import SevenTVUtils from '@/utils/emotes/SevenTVUtils';
import PublicAPI from '@/utils/PublicAPI';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IParamsActions, IParamsGetters, IParamsState } from '../StoreProxy';

export const storeParams = defineStore('params', {
	state: () => ({
		greetThemAutoDelete: 600,
		features: {
			spoilersEnabled: 			{save:true, type:"toggle", value:true, labelKey:"params.spoilersEnabled", id:216, icon:"show_purple.svg"},
			alertMode: 					{save:true, type:"toggle", value:true, labelKey:"params.alertMode", id:217, icon:"alert_purple.svg"},
			firstMessage: 				{save:true, type:"toggle", value:true, labelKey:"params.firstMessage", id:201, icon:"firstTime_purple.svg", example:"greetThem.png"},
			markAsRead: 				{save:true, type:"toggle", value:true, labelKey:"params.markAsRead", id:204, icon:"read_purple.svg"},
			conversationsEnabled: 		{save:true, type:"toggle", value:true, labelKey:"params.conversationsEnabled", id:202, icon:"conversation_purple.svg", example:"conversation.gif"},
			userHistoryEnabled: 		{save:true, type:"toggle", value:true, labelKey:"params.userHistoryEnabled", id:203, icon:"conversation_purple.svg", example:"userHistory.gif"},
			lockAutoScroll: 			{save:true, type:"toggle", value:false, labelKey:"params.lockAutoScroll", id:205, icon:"pause_purple.svg"},
			liveMessages:				{save:true, type:"toggle", value:false, labelKey:"params.liveMessages", id:219, icon:"whispers_purple.svg", example:"liveMessages.png"},
			liveAlerts:					{save:true, type:"toggle", value:false, labelKey:"params.liveAlerts", id:220, icon:"online_purple.svg", twitch_scopes:[TwitchScopes.LIST_FOLLOWINGS]},
			showModTools: 				{save:true, type:"toggle", value:true, labelKey:"params.showModTools", id:206, icon:"ban_purple.svg", twitch_scopes:[TwitchScopes.MODERATE]},
			raidHighlightUser: 			{save:true, type:"toggle", value:true, labelKey:"params.raidHighlightUser", id:209, icon:"raid_purple.svg", example:"raidHighlightUser.png"},
			firstUserBadge: 			{save:true, type:"toggle", value:true, labelKey:"params.firstUserBadge", id:221, icon:"new_purple.svg", example:"firstUserBadge.png"},
			raffleHighlightUser:		{save:true, type:"toggle", value:true, labelKey:"params.raffleHighlightUser", id:218, icon:"ticket_purple.svg", example:"raidHighlightUser.png"},
			groupIdenticalMessage:		{save:true, type:"toggle", value:true, labelKey:"params.groupIdenticalMessage", id:208, icon:"increment_purple.svg", example:"groupIdenticalMessage.gif"},
			offlineEmoteOnly:			{save:true, type:"toggle", value:false, labelKey:"params.offlineEmoteOnly", id:214, icon:"emote_purple.svg", twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS]},
			stopStreamOnRaid:			{save:true, type:"toggle", value:false, labelKey:"params.stopStreamOnRaid", id:212, icon:"obs_purple.svg", twitch_scopes:[TwitchScopes.START_RAID]},
			showUserPronouns:			{save:true, type:"toggle", value:false, labelKey:"params.showUserPronouns", id:213, icon:"user_purple.svg"},
			chatShoutout:				{save:true, type:"toggle", value:false, labelKey:"params.chatShoutout", id:215, icon:"shoutout_purple.svg"},
		},
		appearance: {
			splitViewVertical: 			{save:true, type:"toggle", value:false, labelKey:"params.splitViewVertical", id:21, icon:"layout_purple.svg", example:"verticalLayout.png"},
			censorDeletedMessages: 		{save:true, type:"toggle", value:true, labelKey:"params.censorDeletedMessages", id:25, icon:"hide_purple.svg"},
			highlightMods: 				{save:true, type:"toggle", value:true, labelKey:"params.highlightMods", id:9, icon:"mod_purple.svg"},
			highlightVips: 				{save:true, type:"toggle", value:false, labelKey:"params.highlightVips", id:10, icon:"vip_purple.svg"},
			highlightSubs: 				{save:true, type:"toggle", value:false, labelKey:"params.highlightSubs", id:11, icon:"sub_purple.svg"},
			highlightPartners: 			{save:true, type:"toggle", value:false, labelKey:"params.highlightPartners", id:26, icon:"partner_purple.svg"},
			highlightMentions: 			{save:true, type:"toggle", value:true, labelKey:"params.highlightMentions", id:1, icon:"broadcaster_purple.svg"},
			highlightNonFollowers: 		{save:true, type:"toggle", value:false, labelKey:"params.highlightNonFollowers", id:16, icon:"unfollow_purple.svg", example:"nofollow.png"},
			translateNames:				{save:true, type:"toggle", value:true, labelKey:"params.translateNames", id:22, icon:"translate_purple.svg", example:"translate.png"},
			showRewardsInfos: 			{save:true, type:"toggle", value:false, labelKey:"params.showRewardsInfos", id:23, icon:"channelPoints_purple.svg", example:"rewardDetails.png"},
			showViewersCount: 			{save:true, type:"toggle", value:true, labelKey:"params.showViewersCount", id:17, icon:"user_purple.svg"},
			showEmotes: 				{save:true, type:"toggle", value:true, labelKey:"params.showEmotes", id:2, icon:"emote_purple.svg"},
			bttvEmotes: 				{save:true, type:"toggle", value:false, labelKey:"params.bttvEmotes", id:3, icon:"emote_purple.svg", parent:2},
			ffzEmotes: 					{save:true, type:"toggle", value:false, labelKey:"params.ffzEmotes", id:19, icon:"emote_purple.svg", parent:2},
			sevenTVEmotes: 				{save:true, type:"toggle", value:false, labelKey:"params.sevenTVEmotes", id:20, icon:"emote_purple.svg", parent:2},
			showBadges: 				{save:true, type:"toggle", value:true, labelKey:"params.showBadges", id:4, icon:"badge_purple.svg"},
			minimalistBadges: 			{save:true, type:"toggle", value:false, labelKey:"params.minimalistBadges", id:5, parent:4, example:"minibadges.png"},
			displayTime: 				{save:true, type:"toggle", value:false, labelKey:"params.displayTime", id:6, icon:"timeout_purple.svg"},
			displayTimeRelative: 		{save:true, type:"toggle", value:false, labelKey:"params.displayTimeRelative", id:27, icon:"timeout_purple.svg", parent:6},
			dyslexicFont: 				{save:true, type:"toggle", value:false, labelKey:"params.dyslexicFont", id:24, icon:"font_purple.svg"},
			defaultSize: 				{save:true, type:"slider", value:4, labelKey:"params.defaultSize", min:1, max:20, step:1, id:12},
		},
		chatColumnsConfig:[
			{
				id: Utils.getUUID(),
				order: 0,
				size: 0.6,
				liveLockCount: 3,
				commandsBlockList: [],
				userBlockList: [],
				whispersPermissions:{
					broadcaster:true,
					mods:true,
					vips:true,
					subs:true,
					all:true,
					follower:true,
					follower_duration_ms:0,
					usersAllowed:[],
					usersRefused:[],
				},
				filters: {
					ban:false,
					unban:false,
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
					pinned: false,
					shoutout: false,
					following: false,
					countdown: false,
					prediction: false,
					twitchat_ad: false,
					subscription: false,
					stream_online: false,
					hype_train_summary: false,
					hype_train_cooled_down: false,
					community_boost_complete: false,
					community_challenge_contribution: false
				},
				messageFilters: {
					automod: false,
					suspiciousUsers: false,
					deleted: true,
					bots: true,
					commands: true,
					moderators: true,
					subs: true,
					viewers: true,
					vips: true,
					partners: true,
					short: true,
					tracked: true,
					pinned: true,
				}
			},
			{
				id: Utils.getUUID(),
				order: 1,
				size: 0.4,
				liveLockCount: 3,
				commandsBlockList: [],
				userBlockList: [],
				whispersPermissions:{
					broadcaster:true,
					mods:true,
					vips:true,
					subs:true,
					all:true,
					follower:true,
					follower_duration_ms:0,
					usersAllowed:[],
					usersRefused:[],
				},
				filters: {
					ban:true,
					unban:true,
					join: false,
					leave: false,
					message: true,
					whisper: false,
					raid: true,
					poll: true,
					cheer: true,
					bingo: true,
					raffle: true,
					reward: true,
					notice: true,
					pinned: true,
					shoutout: true,
					following: true,
					countdown: true,
					prediction: true,
					twitchat_ad: true,
					subscription: true,
					stream_online: true,
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
					short: false,
					tracked: true,
					pinned:true,
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
				commandsBlockList:[],
				userBlockList:[],
				whispersPermissions:{
					broadcaster:true,
					mods:true,
					vips:true,
					subs:true,
					all:true,
					follower:true,
					follower_duration_ms:0,
					usersAllowed:[],
					usersRefused:[],
				},
				filters:{
					ban:false,
					unban:false,
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
					pinned: false,
					shoutout:false,
					following:false,
					countdown:false,
					prediction:false,
					twitchat_ad:false,
					subscription:false,
					stream_online: false,
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
					tracked: true,
					pinned: true,
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
			
			PublicAPI.instance.broadcast(TwitchatEvent.SET_COLS_COUNT, {count:this.chatColumnsConfig.length});
			return col;
		},

		delChatColumn(column:TwitchatDataTypes.ChatColumnsConfig):void {
			//Some magicien succeed to remove all their columns, here is
			//a fail safe to prevent that.
			if(this.chatColumnsConfig.length == 1) return;

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
			PublicAPI.instance.broadcast(TwitchatEvent.SET_COLS_COUNT, {count:this.chatColumnsConfig.length});
		},

		moveChatColumn(column:TwitchatDataTypes.ChatColumnsConfig, direction:number):void {
			const newPos = column.order + direction;
			for (let i = 0; i < this.chatColumnsConfig.length; i++) {
				const c = this.chatColumnsConfig[i];
				if(c.order == newPos) {
					c.order -= direction;
					break;
				}
			}
			column.order = newPos;
			this.saveChatColumnConfs();
		},

		saveChatColumnConfs():void {
			DataStore.set(DataStore.CHAT_COLUMNS_CONF, this.chatColumnsConfig, true);
		},

		setGreetThemAutoDelete(value:number):void {
			//Rounding the value to the nearest minute so the selector doesn't endup with
			//two identical entries as it only displays minutes, not seconds
			this.greetThemAutoDelete = Math.round(value/60)*60;
		},
	} as IParamsActions
	& ThisType<IParamsActions
		& UnwrapRef<IParamsState>
		& _StoreWithState<"params", IParamsState, IParamsGetters, IParamsActions>
		& _StoreWithGetters<IParamsGetters>
		& PiniaCustomProperties
	>,
})