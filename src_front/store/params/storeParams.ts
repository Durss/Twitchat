import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import {TwitchatDataTypes} from '@/types/TwitchatDataTypes';
import BTTVUtils from '@/utils/emotes/BTTVUtils';
import FFZUtils from '@/utils/emotes/FFZUtils';
import SevenTVUtils from '@/utils/emotes/SevenTVUtils';
import PublicAPI from '@/utils/PublicAPI';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IParamsActions, IParamsGetters, IParamsState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import type { GoXLRTypes } from '@/types/GoXLRTypes';
import GoXLRSocket from '@/utils/goxlr/GoXLRSocket';
import { TranslatableLanguagesMap } from '@/TranslatableLanguages';
import Config from '@/utils/Config';

export const storeParams = defineStore('params', {
	state: () => ({
		currentPage:"",
		currentParamSearch:"",
		currentPageSubContent:"",
		currentModal:"",
		donationReminderEnabled:false,
		updatesReminderEnabled:false,
		greetThemAutoDelete: 600,
		pinnedMenuItems:["chatters", "rewards"],
		features: {
			spoilersEnabled: 			{type:"boolean", value:true, labelKey:"params.spoilersEnabled", id:216, icon:"spoiler", storage:{vnew:{date:1693519200000, id:'params_chatspoiler'}}},
			alertMode: 					{type:"boolean", value:true, labelKey:"params.alertMode", id:217, icon:"alert"},
			firstMessage: 				{type:"boolean", value:true, labelKey:"params.firstMessage", id:201, icon:"hand", example:"greetThem.png"},
			saveHistory: 				{type:"boolean", value:true, labelKey:"params.saveHistory", id:224, icon:"history", storage:{vnew:{date:1693519200000, id:'params_chathistory'}}},
			antiHateRaid: 				{type:"boolean", value:false, labelKey:"params.antiHateRaid", id:232, icon:"block", storage:{vnew:{date:Config.instance.NEW_FLAGS_DATE_V13, id:'params_antihateraid'}}, twitch_scopes:[TwitchScopes.BLOCKED_TERMS] },
			antiHateRaidDeleteMessage: 	{type:"boolean", value:false, labelKey:"params.antiHateRaidDeleteMessage", id:234, parent:232, icon:"trash", storage:{vnew:{date:Config.instance.NEW_FLAGS_DATE_V13, id:'params_antihateraiddelete'}}},
			antiHateRaidEmergency:	 	{type:"boolean", value:false, labelKey:"params.antiHateRaidEmergency", id:235, parent:232, icon:"emergency", storage:{vnew:{date:Config.instance.NEW_FLAGS_DATE_V13, id:'params_antihateraidemergency'}}},
			autoTranslateFirst: 		{type:"boolean", value:false, labelKey:"params.autoTranslateFirst", id:229, icon:"translate", storage:{vnew:{date:Config.instance.NEW_FLAGS_DATE_V11, id:'params_translate'}}, premiumOnly:true, example:"translate_messages.png"},
			autoTranslateFirstLang:		{type:"list", value:["en"] as string[], multiple:true, max:1, listValues:Object.values(TranslatableLanguagesMap).map(v=> {return {value:v.iso1, flag:v.flag, label:v.name}}), labelKey:"params.autoTranslateFirst_lang", id:231, parent:229, icon:"voice"},
			autoTranslateFirstSpoken:	{type:"list", value:["en"] as string[], multiple:true, listValues:Object.values(TranslatableLanguagesMap).map(v=> {return {value:v.iso1, flag:v.flag, label:v.name}}), labelKey:"params.autoTranslateFirst_spoken", id:230, parent:229, icon:"voice"},
			mergeConsecutive:	 		{type:"boolean", value:true, labelKey:"params.mergeConsecutive", id:225, icon:"merge", example:"merge_messages.gif", storage:{vnew:{date:1693519200000, id:'params_chatmerge'}}},
			mergeConsecutive_maxSize:	{type:"number", value:100, labelKey:"params.mergeConsecutive_maxSize", id:226, parent:225, min:1, max:500},
			mergeConsecutive_maxSizeTotal:{type:"number", value:1000, labelKey:"params.mergeConsecutive_maxSizeTotal", id:227, parent:225, min:10, max:2000},
			mergeConsecutive_minDuration:{type:"duration", value:10, max:30*60, labelKey:"params.mergeConsecutive_minDuration", id:228, parent:225, min:0},
			groupIdenticalMessage:		{type:"boolean", value:true, labelKey:"params.groupIdenticalMessage", id:208, icon:"increment", example:"groupIdenticalMessage.gif"},
			markAsRead: 				{type:"boolean", value:true, labelKey:"params.markAsRead", id:204, icon:"read"},
			conversationsEnabled: 		{type:"boolean", value:true, labelKey:"params.conversationsEnabled", id:202, icon:"conversation", example:"conversation.gif"},
			userHistoryEnabled: 		{type:"boolean", value:true, labelKey:"params.userHistoryEnabled", id:203, icon:"conversation"},
			lockAutoScroll: 			{type:"boolean", value:false, labelKey:"params.lockAutoScroll", id:205, icon:"pause"},
			liveMessages:				{type:"boolean", value:true, labelKey:"params.liveMessages", id:219, icon:"whispers", example:"liveMessages.png"},
			liveAlerts:					{type:"boolean", value:false, labelKey:"params.liveAlerts", id:220, icon:"online", twitch_scopes:[TwitchScopes.LIST_FOLLOWINGS]},
			autoRemod: 					{type:"boolean", value:false, labelKey:"params.autoRemod", id:222, icon:"mod", twitch_scopes:[TwitchScopes.EDIT_MODS]},
			showModTools: 				{type:"boolean", value:true, labelKey:"params.showModTools", id:206, icon:"ban", twitch_scopes:[TwitchScopes.EDIT_BANNED, TwitchScopes.EDIT_BLOCKED, TwitchScopes.DELETE_MESSAGES]},
			raffleHighlightUser:		{type:"boolean", value:true, labelKey:"params.raffleHighlightUser", id:218, icon:"ticket", example:"trackUser.png"},
			raffleHighlightUserDuration:{type:"number", value:5, labelKey:"params.raffleHighlightUserDuration", id:223, icon:"timer", parent:218, min:1, max:60*24*30},
			offlineEmoteOnly:			{type:"boolean", value:false, labelKey:"params.offlineEmoteOnly", id:214, icon:"emote", twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS]},
			stopStreamOnRaid:			{type:"boolean", value:false, labelKey:"params.stopStreamOnRaid", id:212, icon:"obs", twitch_scopes:[TwitchScopes.START_RAID]},
			showUserPronouns:			{type:"boolean", value:false, labelKey:"params.showUserPronouns", id:213, icon:"user"},
			chatShoutout:				{type:"boolean", value:false, labelKey:"params.chatShoutout", id:215, icon:"shoutout"},
		},
		appearance: {
			splitViewVertical: 			{type:"boolean", value:false, labelKey:"params.splitViewVertical", id:21, icon:"layout", example:"verticalLayout.png"},
			censorDeletedMessages: 		{type:"boolean", value:true, labelKey:"params.censorDeletedMessages", id:25, icon:"hide"},
			multiChatAvatar: 			{type:"boolean", value:false, labelKey:"params.multiChatAvatar", id:47, icon:"avatar", example:"multichat.png", storage:{vnew:{date:Config.instance.NEW_FLAGS_DATE_V13, id:'params_multiChatAvatar'}}},
			sharedChatHide: 			{type:"boolean", value:false, labelKey:"params.sharedChatHide", id:49, icon:"sharedChat", storage:{vnew:{date:Config.instance.NEW_FLAGS_DATE_V15, id:'params_sharedChat'}}},
			highlightusernames: 		{type:"boolean", value:true, labelKey:"params.highlightusernames", id:44, icon:"user", example:"clickable_mentions.png", storage:{vnew:{date:1693519200000, id:'params_chathighlightmentions'}}},
			highlightMods: 				{type:"boolean", value:false, labelKey:"params.highlightMods", id:9, icon:"mod"},
			highlightMods_color:		{type:"color", value:"#00a865", labelKey:"params.highlightColor", id:29, parent:9},
			highlightVips: 				{type:"boolean", value:false, labelKey:"params.highlightVips", id:10, icon:"vip"},
			highlightVips_color:		{type:"color", value:"#db00b3", labelKey:"params.highlightColor", id:30, parent:10},
			highlightSubs: 				{type:"boolean", value:false, labelKey:"params.highlightSubs", id:11, icon:"sub"},
			highlightSubs_color:		{type:"color", value:"#528bff", labelKey:"params.highlightColor", id:31, parent:11},
			highlightPartners: 			{type:"boolean", value:false, labelKey:"params.highlightPartners", id:26, icon:"partner"},
			highlightPartners_color:	{type:"color", value:"#9147ff", labelKey:"params.highlightColor", id:32, parent:26},
			highlightMentions: 			{type:"boolean", value:true, labelKey:"params.highlightMentions", id:1, icon:"broadcaster"},
			highlightMentions_color:	{type:"color", value:"#adadb8", labelKey:"params.highlightColor", id:33, parent:1},
			highlightMentions_custom:	{type:"editablelist", value:[], labelKey:"params.highlightCustom", id:48, parent:1, placeholderKey:"params.highlightCustom_placeholder", maxLength:20, max:10},
			raidHighlightUser: 			{type:"boolean", value:true, labelKey:"params.raidHighlightUser", id:34, icon:"raid"},
			raidHighlightUser_color:	{type:"color", value:"#f5f500", labelKey:"params.highlightColor", id:36, parent:34},
			raidHighlightUserDuration:	{type:"number", value:5, labelKey:"params.raidHighlightUserDuration", id:35, icon:"timer", parent:34, min:1, max:60*24*30},
			raidHighlightUserTrack:		{type:"boolean", value:false, labelKey:"params.raidHighlightUserTrack", id:42, icon:"magnet", parent:34, example:"trackUser.png"},
			highlight1stEver: 			{type:"boolean", value:true, labelKey:"params.highlight1stEver", id:37, icon:"firstTime"},
			highlight1stEver_color:		{type:"color", value:"#ff75e6", labelKey:"params.highlightColor", id:38, parent:37},
			highlight1stToday: 			{type:"boolean", value:false, labelKey:"params.highlight1stToday", id:28, icon:"hand"},
			highlight1stToday_color:	{type:"color", value:"#82D408", labelKey:"params.highlightColor", id:39, parent:28},
			highlightNonFollowers: 		{type:"boolean", value:false, labelKey:"params.highlightNonFollowers", id:16, icon:"unfollow", example:"nofollow.png", twitch_scopes:[TwitchScopes.LIST_FOLLOWERS]},
			firstUserBadge: 			{type:"boolean", value:true, labelKey:"params.firstUserBadge", id:45, icon:"sub", example:"firstUserBadge.png"},
			recentAccountUserBadge: 	{type:"boolean", value:false, labelKey:"params.recentAccountUserBadge", id:46, icon:"date", example:"recent_account.png", storage:{vnew:{date:1693519200000, id:'params_chatrecentbadge'}}},
			translateNames:				{type:"boolean", value:true, labelKey:"params.translateNames", id:22, icon:"translate", example:"translate_username.png"},
			showRewardsInfos: 			{type:"boolean", value:false, labelKey:"params.showRewardsInfos", id:23, icon:"channelPoints", example:"rewardDetails.png"},
			showViewersCount: 			{type:"boolean", value:true, labelKey:"params.showViewersCount", id:17, icon:"user"},
			showRaidViewersCount: 		{type:"boolean", value:true, labelKey:"params.showRaidViewersCount", id:40, icon:"raid", example:"raid_count.png"},
			showRaidStreamInfo: 		{type:"boolean", value:true, labelKey:"params.showRaidStreamInfo", id:43, icon:"raid", example:"raid_infos.png", storage:{vnew:{date:1693519200000, id:'params_chatraidinfo'}}},
			alternateMessageBackground:	{type:"boolean", value:true, labelKey:"params.alternateMessageBackground", id:41, icon:"whispers"},
			showEmotes: 				{type:"boolean", value:true, labelKey:"params.showEmotes", id:2, icon:"emote"},
			bttvEmotes: 				{type:"boolean", value:false, labelKey:"params.bttvEmotes", id:3, icon:"emote", parent:2},
			ffzEmotes: 					{type:"boolean", value:false, labelKey:"params.ffzEmotes", id:19, icon:"emote", parent:2},
			sevenTVEmotes: 				{type:"boolean", value:false, labelKey:"params.sevenTVEmotes", id:20, icon:"emote", parent:2},
			showBadges: 				{type:"boolean", value:true, labelKey:"params.showBadges", id:4, icon:"badge"},
			minimalistBadges: 			{type:"boolean", value:false, labelKey:"params.minimalistBadges", id:5, parent:4, example:"minibadges.png"},
			displayTime: 				{type:"boolean", value:false, labelKey:"params.displayTime", id:6, icon:"timeout"},
			displayTimeRelative: 		{type:"boolean", value:false, labelKey:"params.displayTimeRelative", id:27, parent:6},
			dyslexicFont: 				{type:"boolean", value:false, labelKey:"params.dyslexicFont", id:24, icon:"font"},
			adhdFont: 					{type:"boolean", value:false, labelKey:"params.adhdFont", id:50, icon:"font", storage:{vnew:{date:Config.instance.NEW_FLAGS_DATE_V16_5, id:'params_adhdFont'}}},
			defaultSize: 				{type:"slider", value:4, labelKey:"params.defaultSize", min:1, max:20, step:1, id:12},
		},
		chatColumnsConfig:[
			{
				id: Utils.getUUID(),
				order: 0,
				size: 0.6,
				liveLockCount: 3,
				showPanelsHere:false,
				showGreetHere:false,
				commandsBlockList: [],
				userBlockList: [],
				whispersPermissions:Utils.getDefaultPermissions(),
				filters: {
					ban:false,
					unban:false,
					join: false,
					leave: false,
					message: true,
					whisper: true,
					kofi:false,
					raid: false,
					poll: false,
					cheer: false,
					bingo: false,
					tipeee: false,
					tiltify: false,
					raffle: false,
					reward: false,
					notice: false,
					pinned: false,
					patreon:false,
					shoutout: false,
					following: false,
					countdown: false,
					streamlabs:false,
					hype_chat: false,
					prediction: false,
					tiktok_gift:false,
					tiktok_like:false,
					tiktok_share:false,
					twitchat_ad: false,
					unban_request:false,
					subscription: false,
					streamelements:false,
					stream_online: false,
					user_watch_streak:false,
					hype_train_summary: false,
					private_mod_message:false,
					ad_break_start_chat:false,
					music_added_to_queue:false,
					streamsocket_action: false,
					hype_train_cooled_down: false,
					twitch_charity_donation:false,
					community_boost_complete: false,
					community_challenge_contribution: false,
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
				showGreetHere:true,
				commandsBlockList: [],
				userBlockList: [],
				whispersPermissions:Utils.getDefaultPermissions(),
				filters: {
					ban:true,
					unban:true,
					join: false,
					leave: false,
					message: true,
					whisper: false,
					kofi:true,
					raid: true,
					poll: true,
					cheer: true,
					bingo: true,
					tipeee: true,
					tiltify: true,
					raffle: true,
					reward: true,
					notice: true,
					pinned: true,
					patreon:true,
					shoutout: true,
					following: true,
					countdown: true,
					streamlabs:true,
					prediction: true,
					twitchat_ad: true,
					tiktok_gift:true,
					tiktok_like:true,
					tiktok_share:true,
					unban_request:true,
					subscription: true,
					streamelements:true,
					stream_online: true,
					user_watch_streak:true,
					private_mod_message:true,
					hype_train_summary: true,
					ad_break_start_chat:true,
					streamsocket_action:true,
					music_added_to_queue:true,
					hype_train_cooled_down: true,
					twitch_charity_donation:true,
					community_boost_complete: true,
					community_challenge_contribution: true,
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
		goxlrConfig: {
			enabled:false,
			ip:"127.0.0.1",
			port:14564,
			chatScrollSources:[],
			chatReadMarkSources:[],
		}
	} as IParamsState),



	getters: {
	} as IParamsGetters
	& ThisType<UnwrapRef<IParamsState> & _StoreWithGetters<IParamsGetters> & PiniaCustomProperties>
	& _GettersTree<IParamsState>,



	actions: {
		populateData() {
			//Loading parameters from local storage and pushing them to current store
			const props = DataStore.getAll();
			for (const cat in this.$state) {
				const c = cat as TwitchatDataTypes.ParameterCategory;
				for (const key in props) {
					const k = key.replace(/^p:/gi, "");
					if(props[key] == null) continue;
					const t = typeof this.$state[c];
					if(t == "object" && /^p:/gi.test(key) && k in this.$state[c]) {
						const v:string = props[key] as string;
						/* eslint-disable-next-line */
						const pointer = this.$state[c][k as TwitchatDataTypes.ParameterCategory];
						if(typeof pointer.value === 'boolean') {
							pointer.value = (v == "true");
						}else
						if(typeof pointer.value === 'string') {
							pointer.value = v;
						}else
						if(typeof pointer.value === 'number') {
							pointer.value = parseFloat(v);
						}else{
							try {
								pointer.value = JSON.parse(v);
							}catch(error) {
								console.log("[STORE:PARAMS]Cannot JSON parse value:", v);
							}
						}
					}
				}
			}

			//Init chat cols
			const chatColConfs = DataStore.get(DataStore.CHAT_COLUMNS_CONF);
			if(chatColConfs) {
				this.chatColumnsConfig = JSON.parse(chatColConfs);
				for (let i = 0; i < this.chatColumnsConfig.length; i++) {
					this.chatColumnsConfig[i].id = Utils.getUUID();
				}
				DataStore.set(DataStore.CHAT_COLUMNS_CONF, this.chatColumnsConfig);
			}

			//If no col is defined to receive the "greet them" section, force it
			if(this.chatColumnsConfig.findIndex(v=>v.showGreetHere === true) == -1) {
				let col = this.chatColumnsConfig.find(v=>v.showPanelsHere === true);
				if(!col) {
					col = this.chatColumnsConfig[0];
					col.showPanelsHere = true;
				}
				col.showGreetHere = true;
			}

			//Init goxlr params
			const goXLRParams = DataStore.get(DataStore.GOXLR_CONFIG);
			if(goXLRParams) {
				this.goxlrConfig = JSON.parse(goXLRParams);
				const ip = this.goxlrConfig.ip;
				const port = this.goxlrConfig.port;
				if(ip && port && this.goxlrConfig.enabled) {
					GoXLRSocket.instance.connect(ip, port).catch(error=>{});
				}
			}

			//Init pinned menu items
			const pinnedMenuConfs = DataStore.get(DataStore.PINNED_CHAT_MENU_ITEM);
			if(pinnedMenuConfs) {
				this.pinnedMenuItems = JSON.parse(pinnedMenuConfs);
			}

		},
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
				showGreetHere:false,
				commandsBlockList:[],
				userBlockList:[],
				whispersPermissions:Utils.getDefaultPermissions(),
				filters:{
					ban:false,
					unban:false,
					join:false,
					leave:false,
					message:false,
					whisper:false,
					kofi:false,
					raid:false,
					poll:false,
					cheer:false,
					bingo:false,
					raffle:false,
					reward:false,
					notice:false,
					tipeee:false,
					tiltify:false,
					pinned:false,
					patreon:false,
					shoutout:false,
					following:false,
					countdown:false,
					prediction:false,
					streamlabs:false,
					twitchat_ad:false,
					tiktok_gift:false,
					tiktok_like:false,
					tiktok_share:false,
					subscription:false,
					unban_request:false,
					stream_online:false,
					streamelements:false,
					user_watch_streak:false,
					hype_train_summary:false,
					private_mod_message:true,
					ad_break_start_chat:false,
					streamsocket_action:false,
					music_added_to_queue:false,
					hype_train_cooled_down:false,
					twitch_charity_donation:false,
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
			//Move "greet them" and "panels" to the last col if they were enabled
			//on the deleted col
			if(column.showPanelsHere) this.chatColumnsConfig[this.chatColumnsConfig.length-1].showPanelsHere = true;
			if(column.showGreetHere) this.chatColumnsConfig[this.chatColumnsConfig.length-1].showGreetHere = true;

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
			const category = chunks[0];
			let root = this.$state;
			while(chunks.length > 0) {
				//@ts-ignore
				root = root[chunks.shift()];
			}
			const param = (root as unknown) as TwitchatDataTypes.ParameterData<unknown>;
			StoreProxy.main.tempStoreValue = param.id;
			switch(category) {
				case "features": {
					this.openParamsPage(TwitchatDataTypes.ParameterPages.FEATURES);
					break;
				}
				case "appearance": {
					this.openParamsPage(TwitchatDataTypes.ParameterPages.APPEARANCE);
					break;
				}
			}
			// this.currentParamSearch = StoreProxy.i18n.t(param.labelKey!);
		},

		openModal(modal:TwitchatDataTypes.ModalTypes, noToggle:boolean = false):void {
			if(this.currentModal == modal && !noToggle) this.closeModal();
			else this.currentModal = modal;
			this.currentPage = "";
		},

		closeModal():void { this.currentModal = "" },

		setGoXLRChatColScrollParams(colIndex:number, encoderPath:GoXLRTypes.ButtonTypesData[]):void {
			this.goxlrConfig.chatScrollSources[colIndex] = encoderPath;
			DataStore.set(DataStore.GOXLR_CONFIG, this.goxlrConfig);
		},

		setGoXLRChatColReadMarkParams(colIndex:number, encoderPath:GoXLRTypes.ButtonTypesData[]):void {
			this.goxlrConfig.chatReadMarkSources[colIndex] = encoderPath;
			DataStore.set(DataStore.GOXLR_CONFIG, this.goxlrConfig);
		},

		setGoXLREnabled(enabled:boolean):void {
			this.goxlrConfig.enabled = enabled;
			DataStore.set(DataStore.GOXLR_CONFIG, this.goxlrConfig);
			if(enabled === true) {
				if(!this.goxlrConfig.ip || !this.goxlrConfig.port) return;
				GoXLRSocket.instance.connect(this.goxlrConfig.ip, this.goxlrConfig.port).catch(error=>{});
			}else{
				GoXLRSocket.instance.disconnect();
			}
		},

		setGoXLRConnectParams(ip:string, port:number):void {
			this.goxlrConfig.ip = ip;
			this.goxlrConfig.port = port;
			DataStore.set(DataStore.GOXLR_CONFIG, this.goxlrConfig);
		},

		toggleChatMenuPin(pinId:typeof TwitchatDataTypes.PinnableMenuItems[number]["id"]):void {
			const index = this.pinnedMenuItems.findIndex(v=>v == pinId);
			if(index > -1) this.pinnedMenuItems.splice(index, 1);
			else this.pinnedMenuItems.push(pinId);

			this.saveChatMenuPins();
		},

		saveChatMenuPins():void {
			DataStore.set(DataStore.PINNED_CHAT_MENU_ITEM, this.pinnedMenuItems);
		}
	} as IParamsActions
	& ThisType<IParamsActions
		& UnwrapRef<IParamsState>
		& _StoreWithState<"params", IParamsState, IParamsGetters, IParamsActions>
		& _StoreWithGetters<IParamsGetters>
		& PiniaCustomProperties
	>,
})


if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeParams, import.meta.hot))
}
