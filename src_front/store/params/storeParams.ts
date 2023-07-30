import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import type {TwitchatDataTypes} from '@/types/TwitchatDataTypes';
import BTTVUtils from '@/utils/emotes/BTTVUtils';
import FFZUtils from '@/utils/emotes/FFZUtils';
import SevenTVUtils from '@/utils/emotes/SevenTVUtils';
import PublicAPI from '@/utils/PublicAPI';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IParamsActions, IParamsGetters, IParamsState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

export const storeParams = defineStore('params', {
	state: () => ({
		currentPage:"",
		currentParamSearch:"",
		currentPageSubContent:"",
		currentModal:"",
		greetThemAutoDelete: 600,
		features: {
			spoilersEnabled: 			{save:true, type:"boolean", value:true, labelKey:"params.spoilersEnabled", id:216, icon:"show"},
			alertMode: 					{save:true, type:"boolean", value:true, labelKey:"params.alertMode", id:217, icon:"alert"},
			firstMessage: 				{save:true, type:"boolean", value:true, labelKey:"params.firstMessage", id:201, icon:"hand", example:"greetThem.png"},
			markAsRead: 				{save:true, type:"boolean", value:true, labelKey:"params.markAsRead", id:204, icon:"read"},
			groupIdenticalMessage:		{save:true, type:"boolean", value:true, labelKey:"params.groupIdenticalMessage", id:208, icon:"increment", example:"groupIdenticalMessage.gif"},
			saveHistory: 				{save:true, type:"boolean", value:true, labelKey:"params.saveHistory", id:224, icon:"history"},
			mergeConsecutive:	 		{save:true, type:"boolean", value:true, labelKey:"params.mergeConsecutive", id:225, icon:"merge"},
			mergeConsecutive_maxSize:	{save:true, type:"number", value:100, labelKey:"params.mergeConsecutive_maxSize", id:226, parent:225, min:1, max:500},
			mergeConsecutive_maxSizeTotal:{save:true, type:"number", value:1000, labelKey:"params.mergeConsecutive_maxSizeTotal", id:227, parent:225, min:10, max:2000},
			mergeConsecutive_minDuration:{save:true, type:"number", value:30, labelKey:"params.mergeConsecutive_minDuration", id:228, parent:225, min:0, max:3600},
			conversationsEnabled: 		{save:true, type:"boolean", value:true, labelKey:"params.conversationsEnabled", id:202, icon:"conversation", example:"conversation.gif"},
			userHistoryEnabled: 		{save:true, type:"boolean", value:true, labelKey:"params.userHistoryEnabled", id:203, icon:"conversation"},
			lockAutoScroll: 			{save:true, type:"boolean", value:false, labelKey:"params.lockAutoScroll", id:205, icon:"pause"},
			liveMessages:				{save:true, type:"boolean", value:true, labelKey:"params.liveMessages", id:219, icon:"whispers", example:"liveMessages.png"},
			liveAlerts:					{save:true, type:"boolean", value:false, labelKey:"params.liveAlerts", id:220, icon:"online", twitch_scopes:[TwitchScopes.LIST_FOLLOWINGS]},
			autoRemod: 					{save:true, type:"boolean", value:false, labelKey:"params.autoRemod", id:222, icon:"mod", twitch_scopes:[TwitchScopes.EDIT_MODS]},
			showModTools: 				{save:true, type:"boolean", value:true, labelKey:"params.showModTools", id:206, icon:"ban", twitch_scopes:[TwitchScopes.EDIT_BANNED, TwitchScopes.EDIT_BLOCKED, TwitchScopes.DELETE_MESSAGES]},
			firstUserBadge: 			{save:true, type:"boolean", value:true, labelKey:"params.firstUserBadge", id:221, icon:"sub", example:"firstUserBadge.png"},
			raffleHighlightUser:		{save:true, type:"boolean", value:true, labelKey:"params.raffleHighlightUser", id:218, icon:"ticket", example:"trackUser.png"},
			raffleHighlightUserDuration:{save:true, type:"number", value:5, labelKey:"params.raffleHighlightUserDuration", id:223, icon:"timer", parent:218, min:1, max:60*24*30},
			offlineEmoteOnly:			{save:true, type:"boolean", value:false, labelKey:"params.offlineEmoteOnly", id:214, icon:"emote", twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS]},
			stopStreamOnRaid:			{save:true, type:"boolean", value:false, labelKey:"params.stopStreamOnRaid", id:212, icon:"obs", twitch_scopes:[TwitchScopes.START_RAID]},
			showUserPronouns:			{save:true, type:"boolean", value:false, labelKey:"params.showUserPronouns", id:213, icon:"user"},
			chatShoutout:				{save:true, type:"boolean", value:false, labelKey:"params.chatShoutout", id:215, icon:"shoutout"},
		},
		appearance: {
			splitViewVertical: 			{save:true, type:"boolean", value:false, labelKey:"params.splitViewVertical", id:21, icon:"layout", example:"verticalLayout.png"},
			censorDeletedMessages: 		{save:true, type:"boolean", value:true, labelKey:"params.censorDeletedMessages", id:25, icon:"hide"},
			highlightMods: 				{save:true, type:"boolean", value:true, labelKey:"params.highlightMods", id:9, icon:"mod"},
			highlightMods_color:		{save:true, type:"color", value:"#00a865", labelKey:"params.highlightColor", id:29, parent:9},
			highlightVips: 				{save:true, type:"boolean", value:false, labelKey:"params.highlightVips", id:10, icon:"vip"},
			highlightVips_color:		{save:true, type:"color", value:"#db00b3", labelKey:"params.highlightColor", id:30, parent:10},
			highlightSubs: 				{save:true, type:"boolean", value:false, labelKey:"params.highlightSubs", id:11, icon:"sub"},
			highlightSubs_color:		{save:true, type:"color", value:"#528bff", labelKey:"params.highlightColor", id:31, parent:11},
			highlightPartners: 			{save:true, type:"boolean", value:false, labelKey:"params.highlightPartners", id:26, icon:"partner"},
			highlightPartners_color:	{save:true, type:"color", value:"#9147ff", labelKey:"params.highlightColor", id:32, parent:26},
			highlightMentions: 			{save:true, type:"boolean", value:true, labelKey:"params.highlightMentions", id:1, icon:"broadcaster"},
			highlightMentions_color:	{save:true, type:"color", value:"#adadb8", labelKey:"params.highlightColor", id:33, parent:1},
			raidHighlightUser: 			{save:true, type:"boolean", value:true, labelKey:"params.raidHighlightUser", id:34, icon:"raid"},
			raidHighlightUser_color:	{save:true, type:"color", value:"#f5f500", labelKey:"params.highlightColor", id:36, parent:34},
			raidHighlightUserDuration:	{save:true, type:"number", value:5, labelKey:"params.raidHighlightUserDuration", id:35, icon:"timer", parent:34, min:1, max:60*24*30},
			raidHighlightUserTrack:		{save:true, type:"boolean", value:false, labelKey:"params.raidHighlightUserTrack", id:42, icon:"magnet", parent:34, example:"trackUser.png"},
			highlight1stEver: 			{save:true, type:"boolean", value:true, labelKey:"params.highlight1stEver", id:37, icon:"firstTime"},
			highlight1stEver_color:		{save:true, type:"color", value:"#ff75e6", labelKey:"params.highlightColor", id:38, parent:37},
			highlight1stToday: 			{save:true, type:"boolean", value:true, labelKey:"params.highlight1stToday", id:28, icon:"hand"},
			highlight1stToday_color:	{save:true, type:"color", value:"#82D408", labelKey:"params.highlightColor", id:39, parent:28},
			highlightNonFollowers: 		{save:true, type:"boolean", value:false, labelKey:"params.highlightNonFollowers", id:16, icon:"unfollow", example:"nofollow.png", twitch_scopes:[TwitchScopes.LIST_FOLLOWERS]},
			translateNames:				{save:true, type:"boolean", value:true, labelKey:"params.translateNames", id:22, icon:"translate", example:"translate.png"},
			showRewardsInfos: 			{save:true, type:"boolean", value:false, labelKey:"params.showRewardsInfos", id:23, icon:"channelPoints", example:"rewardDetails.png"},
			showViewersCount: 			{save:true, type:"boolean", value:true, labelKey:"params.showViewersCount", id:17, icon:"user"},
			showRaidViewersCount: 		{save:true, type:"boolean", value:true, labelKey:"params.showRaidViewersCount", id:40, icon:"raid"},
			showRaidStreamInfo: 		{save:true, type:"boolean", value:true, labelKey:"params.showRaidStreamInfo", id:43, icon:"raid"},
			alternateMessageBackground:	{save:true, type:"boolean", value:true, labelKey:"params.alternateMessageBackground", id:41, icon:"whispers"},
			showEmotes: 				{save:true, type:"boolean", value:true, labelKey:"params.showEmotes", id:2, icon:"emote"},
			bttvEmotes: 				{save:true, type:"boolean", value:false, labelKey:"params.bttvEmotes", id:3, icon:"emote", parent:2},
			ffzEmotes: 					{save:true, type:"boolean", value:false, labelKey:"params.ffzEmotes", id:19, icon:"emote", parent:2},
			sevenTVEmotes: 				{save:true, type:"boolean", value:false, labelKey:"params.sevenTVEmotes", id:20, icon:"emote", parent:2},
			showBadges: 				{save:true, type:"boolean", value:true, labelKey:"params.showBadges", id:4, icon:"badge"},
			minimalistBadges: 			{save:true, type:"boolean", value:false, labelKey:"params.minimalistBadges", id:5, parent:4, example:"minibadges.png"},
			displayTime: 				{save:true, type:"boolean", value:false, labelKey:"params.displayTime", id:6, icon:"timeout"},
			displayTimeRelative: 		{save:true, type:"boolean", value:false, labelKey:"params.displayTimeRelative", id:27, icon:"timeout", parent:6},
			dyslexicFont: 				{save:true, type:"boolean", value:false, labelKey:"params.dyslexicFont", id:24, icon:"font"},
			defaultSize: 				{save:true, type:"slider", value:4, labelKey:"params.defaultSize", min:1, max:20, step:1, id:12},
		},
		chatColumnsConfig:[
			{
				id: Utils.getUUID(),
				order: 0,
				size: 0.6,
				liveLockCount: 3,
				showPanelsHere:false,
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
					leave: false,
					message: true,
					whisper: true,
					raid: false,
					poll: false,
					cheer: false,
					bingo: false,
					raffle: false,
					reward: false,
					notice: false,
					pinned: false,
					shoutout: false,
					following: false,
					countdown: false,
					hype_chat: false,
					prediction: false,
					twitchat_ad: false,
					subscription: false,
					stream_online: false,
					user_watch_streak:false,
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
				showPanelsHere:true,
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
					hype_chat: true,
					prediction: true,
					twitchat_ad: true,
					subscription: true,
					stream_online: true,
					user_watch_streak:true,
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
						if(v === true && this.appearance.showEmotes.value === true) {
							BTTVUtils.instance.enable();
						}else{
							BTTVUtils.instance.disable();
						}
					}
					if(key=="ffzEmotes") {
						if(v === true && this.appearance.showEmotes.value === true) {
							FFZUtils.instance.enable();
						}else{
							FFZUtils.instance.disable();
						}
					}
					if(key=="sevenTVEmotes") {
						if(v === true && this.appearance.showEmotes.value === true) {
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
				showPanelsHere:false,
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
					leave:false,
					message:false,
					whisper:false,
					raid:false,
					poll:false,
					cheer:false,
					bingo:false,
					raffle:false,
					reward:false,
					notice:false,
					pinned: false,
					shoutout:false,
					following:false,
					countdown:false,
					hype_chat:false,
					prediction:false,
					twitchat_ad:false,
					subscription:false,
					stream_online: false,
					user_watch_streak:false,
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

		moveChatColumn(column:TwitchatDataTypes.ChatColumnsConfig, direction:-1|1):void {
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

		closeParameters():void { this.currentPage = ""; this.currentParamSearch = ""; },

		openParamsPage(value:TwitchatDataTypes.ParameterPagesStringType, subContent?:TwitchatDataTypes.ParamDeepSectionsStringType):void {
			this.currentPageSubContent = subContent ?? "";
			this.currentPage = value;
		},

		searchParam(search:string):void { this.currentParamSearch = search; },

		searchParamByPath(path:string):void {
			const chunks = path.split(".");
			let root = this.$state;
			while(chunks.length > 0) {
				//@ts-ignore
				root = root[chunks.shift()];
			}
			this.currentParamSearch = StoreProxy.i18n.t(((root as unknown) as TwitchatDataTypes.ParameterData<unknown>).labelKey!);
		},

		openModal(modal:TwitchatDataTypes.ModalTypes, noToggle:boolean = false):void {
			if(this.currentModal == modal && !noToggle) this.closeModal();
			else this.currentModal = modal;
		},

		closeModal():void { this.currentModal = "" },
	} as IParamsActions
	& ThisType<IParamsActions
		& UnwrapRef<IParamsState>
		& _StoreWithState<"params", IParamsState, IParamsGetters, IParamsActions>
		& _StoreWithGetters<IParamsGetters>
		& PiniaCustomProperties
	>,
})