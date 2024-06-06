import { TranslatableLanguagesMap } from '@/TranslatableLanguages';
import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';
import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import ChatCypherPlugin from '@/utils/ChatCypherPlugin';
import PublicAPI from '@/utils/PublicAPI';
import SchedulerHelper from '@/utils/SchedulerHelper';
import TTSUtils from '@/utils/TTSUtils';
import Utils from '@/utils/Utils';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import type { PubSubDataTypes } from '@/utils/twitch/PubSubDataTypes';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import YoutubeHelper from '@/utils/youtube/YoutubeHelper';
import lande from 'lande';
import { defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonArray, JsonObject } from 'type-fest';
import { reactive, watch, type UnwrapRef } from 'vue';
import Database from '../Database';
import StoreProxy, { type IChatActions, type IChatGetters, type IChatState } from '../StoreProxy';
import MessengerProxy from '@/messaging/MessengerProxy';

//Don't make this reactive, it kills performances on the long run
let messageList:TwitchatDataTypes.ChatMessageTypes[] = [];
let greetedUsersExpire_at:{[key:string]:number} = {};
let greetedUsersInitialized:boolean = false;

export const storeChat = defineStore('chat', {
	state: () => ({
		searchMessages: "",
		realHistorySize: 20000,
		whispersUnreadCount: 0,
		pinedMessages: [],
		whispers: {},
		emoteSelectorCache: [],
		replyTo: null,
		spamingFakeMessages: false,

		botMessages: {
			raffleStart: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.raffleStart"),
			},
			raffle: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.raffle"),
			},
			raffleJoin: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.raffleJoin"),
			},
			bingoStart: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.bingoStart"),
			},
			bingo: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.bingo"),
			},
			shoutout: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.shoutout"),
			},
			twitchatAd: {
				enabled:false,
				message:StoreProxy.i18n.tm("params.botMessages.twitchatAd"),
			},
			chatSuggStart: {
				enabled:false,
				message:StoreProxy.i18n.tm("params.botMessages.chatSuggStart"),
			},
			heatSpotify: {
				enabled:false,
				message:StoreProxy.i18n.tm("params.botMessages.heatSpotify"),
				cooldown:10,
				allowAnon:true,
			},
			heatUlule: {
				enabled:false,
				message:StoreProxy.i18n.tm("params.botMessages.heatUlule"),
				cooldown:10,
				allowAnon:true,
			},
			qnaStart: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.qnaStart"),
			},
		},
		commands: [
			{
				id:"updates",
				cmd:"/updates",
				alias:"/changelog",
				detailsKey:"params.commands.updates",
			},
			{
				id:"tip",
				cmd:"/tip",
				detailsKey:"params.commands.tip",
			},
			{
				id:"timerStart",
				cmd:"/timerStart",
				detailsKey:"params.commands.timerStart",
			},
			{
				id:"timerPause",
				cmd:"/timerPause",
				detailsKey:"params.commands.timerPause",
			},
			{
				id:"timerUnpause",
				cmd:"/timerUnpause",
				detailsKey:"params.commands.timerUnpause",
			},
			{
				id:"timerAdd",
				cmd:"/timerAdd {(hh:)(mm:)ss}",
				detailsKey:"params.commands.timerAdd",
			},
			{
				id:"timerRemove",
				cmd:"/timerRemove {(hh:)(mm:)ss}",
				detailsKey:"params.commands.timerRemove",
			},
			{
				id:"timerStop",
				cmd:"/timerStop",
				detailsKey:"params.commands.timerStop",
			},
			{
				id:"countdown",
				cmd:"/countdown {(hh:)(mm:)ss}",
				detailsKey:"params.commands.countdown",
			},
			{
				id:"countdownAdd",
				cmd:"/countdownAdd {(hh:)(mm:)ss}",
				detailsKey:"params.commands.countdownAdd",
			},
			{
				id:"countdownRemove",
				cmd:"/countdownRemove {(hh:)(mm:)ss}",
				detailsKey:"params.commands.countdownRemove",
			},
			{
				id:"countdownPause",
				cmd:"/countdownPause",
				detailsKey:"params.commands.countdownPause",
			},
			{
				id:"countdownUnpause",
				cmd:"/countdownUnpause",
				detailsKey:"params.commands.countdownUnpause",
			},
			{
				id:"countdownStop",
				cmd:"/countdownStop",
				detailsKey:"params.commands.countdownStop",
			},
			{
				id:"search",
				cmd:"/search {text}",
				detailsKey:"params.commands.search",
			},
			{
				id:"userinfo",
				cmd:"/user {username}",
				alias:"/userinfo {user}",
				detailsKey:"params.commands.userinfo",
			},
			{
				id:"userfromid",
				cmd:"/userFromID {userID}",
				alias:"/uid {user}",
				detailsKey:"params.commands.userfromid",
			},
			{
				id:"raffle",
				cmd:"/raffle",
				detailsKey:"params.commands.raffle",
			},
			{
				id:"bingoemote",
				cmd:"/bingo emote",
				detailsKey:"params.commands.bingo",
			},
			{
				id:"bingonumber",
				cmd:"/bingo number {min} {max}",
				detailsKey:"params.commands.bingo",
			},
			{
				id:"bingocustom",
				cmd:"/bingo custom {message}",
				detailsKey:"params.commands.bingo",
			},
			{
				id:"raid",
				cmd:"/raid {user}",
				detailsKey:"params.commands.raid",
				needModerator:true,
				twitchCmd:true,
				twitch_scopes:[TwitchScopes.START_RAID],
			},
			{
				id:"shoutout",
				cmd:"/shoutout {user}",
				detailsKey:"params.commands.so",
				alias:"/so {user}",
				needModerator:true,
				twitchCmd:true,
				twitch_scopes:[TwitchScopes.SHOUTOUT],
			},
			{
				id:"poll",
				cmd:"/poll {title}",
				detailsKey:"params.commands.poll",
				needChannelPoints:true,
				needModerator:true,
				twitchCmd:true,
				twitch_scopes:[TwitchScopes.MANAGE_POLLS],
			},
			{
				id:"chatsugg",
				cmd:"/suggestion",
				detailsKey:"params.commands.chatsugg",
			},
			{
				id:"prediction",
				cmd:"/prediction {title}",
				detailsKey:"params.commands.prediction",
				needChannelPoints:true,
				needModerator:true,
				twitchCmd:true,
				twitch_scopes:[TwitchScopes.MANAGE_PREDICTIONS],
			},
			{
				id:"tts",
				cmd:"/tts {user}",
				detailsKey:"params.commands.tts",
				needTTS:true,
			},
			{
				id:"ttsoff",
				cmd:"/ttsoff {user}",
				detailsKey:"params.commands.ttsoff",
				needTTS:true,
			},
			{
				id:"simulatechat",
				cmd:"/simulateChat",
				detailsKey:"params.commands.simulatechat",
			},
			{
				id:"announce",
				cmd:"/announce {message}",
				detailsKey:"params.commands.announce",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SEND_ANNOUNCE],
			},
			{
				id:"announceblue",
				cmd:"/announceblue {message}",
				detailsKey:"params.commands.announceblue",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SEND_ANNOUNCE],
			},
			{
				id:"announcegreen",
				cmd:"/announcegreen {message}",
				detailsKey:"params.commands.announcegreen",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SEND_ANNOUNCE],
			},
			{
				id:"announceorange",
				cmd:"/announceorange {message}",
				detailsKey:"params.commands.announceorange",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SEND_ANNOUNCE],
			},
			{
				id:"announcepurple",
				cmd:"/announcepurple {message}",
				detailsKey:"params.commands.announcepurple",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SEND_ANNOUNCE],
			},
			{
				id:"commercial",
				cmd:"/commercial {duration}",
				detailsKey:"params.commands.commercial",
				twitchCmd:true,
				needChannelPoints:false,
				needModerator:true,
				twitch_scopes:[TwitchScopes.START_COMMERCIAL],
			},
			{
				id:"to",
				cmd:"/timeout {user} {duration} {reason}",
				detailsKey:"params.commands.to",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.EDIT_BANNED],
			},
			{
				id:"ban",
				cmd:"/ban {user}",
				detailsKey:"params.commands.ban",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.EDIT_BANNED],
			},
			{
				id:"unban",
				cmd:"/unban {user}",
				detailsKey:"params.commands.unban",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.EDIT_BANNED],
			},
			{
				id:"block",
				cmd:"/block {user}",
				detailsKey:"params.commands.block",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.EDIT_BLOCKED],
			},
			{
				id:"unblock",
				cmd:"/unblock {user}",
				detailsKey:"params.commands.unblock",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.EDIT_BLOCKED],
			},
			{
				id:"emoteonly",
				cmd:"/emoteonly",
				detailsKey:"params.commands.emoteonly",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS],
			},
			{
				id:"emoteonlyoff",
				cmd:"/emoteonlyoff",
				detailsKey:"params.commands.emoteonlyoff",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS],
			},
			{
				id:"followers",
				cmd:"/followers {minutes}",
				detailsKey:"params.commands.followers",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS],
			},
			{
				id:"followersoff",
				cmd:"/followersoff",
				detailsKey:"params.commands.followersoff",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS],
			},
			{
				id:"slow",
				cmd:"/slow {seconds}",
				detailsKey:"params.commands.slow",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS],
			},
			{
				id:"slowoff",
				cmd:"/slowoff",
				detailsKey:"params.commands.slowoff",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS],
			},
			{
				id:"subscribers",
				cmd:"/subscribers {seconds}",
				detailsKey:"params.commands.subscribers",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS],
			},
			{
				id:"subscribersoff",
				cmd:"/subscribersoff",
				detailsKey:"params.commands.subscribersoff",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SET_ROOM_SETTINGS],
			},
			{
				id:"whisper",
				cmd:"/w {recipient} {message}",
				detailsKey:"params.commands.whisper",
				alias:"/whisper {recipient} {message}",
				twitchCmd:true,
				twitch_scopes:[TwitchScopes.WHISPER_WRITE, TwitchScopes.WHISPER_READ],
			},
			{
				id:"shieldOn",
				cmd:"/shield",
				detailsKey:"params.commands.shieldOn",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SHIELD_MODE],
			},
			{
				id:"shieldOff",
				cmd:"/shieldoff",
				detailsKey:"params.commands.shieldOff",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SHIELD_MODE],
			},
			{
				id:"mod",
				cmd:"/mod {user}",
				detailsKey:"params.commands.mod",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.EDIT_MODS],
			},
			{
				id:"unmod",
				cmd:"/unmod {user}",
				detailsKey:"params.commands.unmod",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.EDIT_MODS],
			},
			{
				id:"vip",
				cmd:"/vip {user}",
				detailsKey:"params.commands.vip",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.EDIT_VIPS],
			},
			{
				id:"unvip",
				cmd:"/unvip {user}",
				detailsKey:"params.commands.unvip",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.EDIT_VIPS],
			},
			{
				id:"clip",
				cmd:"/clip",
				detailsKey:"params.commands.clips",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.CLIPS],
			},
			{
				id:"marker",
				cmd:"/marker {comment}",
				detailsKey:"params.commands.marker",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.SET_STREAM_INFOS],
			},
			{
				id:"clear",
				cmd:"/clear",
				detailsKey:"params.commands.clear",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.DELETE_MESSAGES],
			},
			{
				id:"snooze",
				cmd:"/snooze",
				detailsKey:"params.commands.snooze_ad_break",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.ADS_SNOOZE],
			},
			{
				id:"streamtitle",
				cmd:"/setStreamTitle {title}",
				detailsKey:"params.commands.streamTitle",
				needModerator:true,
				twitchCmd:true,
				twitch_scopes:[TwitchScopes.SET_STREAM_INFOS],
			},
			{
				id:"streamcategory",
				cmd:"/setStreamCategory {category}",
				detailsKey:"params.commands.streamCategory",
				needModerator:true,
				twitchCmd:true,
				twitch_scopes:[TwitchScopes.SET_STREAM_INFOS],
			},
			{
				id:"streamtags",
				cmd:"/setStreamTags {tag1} {tag2}",
				detailsKey:"params.commands.streamTags",
				needModerator:true,
				twitchCmd:true,
				twitch_scopes:[TwitchScopes.SET_STREAM_INFOS],
			},
			{
				id:"betaadd",
				cmd:"/betaAdd {user}",
				detailsKey:"params.commands.betaadd",
				needAdmin:true,
			},
			{
				id:"betadel",
				cmd:"/betaDel {user}",
				detailsKey:"params.commands.betadel",
				needAdmin:true,
			},
			{
				id:"betamigrate",
				cmd:"/betaMigrate {user}",
				detailsKey:"params.commands.betamigrate",
				needAdmin:true,
			},
			{
				id:"betaclose",
				cmd:"/betaClose",
				detailsKey:"params.commands.betareset",
				needAdmin:true,
			},
			{
				id:"devmode",
				cmd:"/devmode",
				detailsKey:"params.commands.devmode",
				needAdmin:true,
			},
			{
				id:"userlist",
				cmd:"/userlist",
				detailsKey:"params.commands.userlist",
				needAdmin:true,
			},
			{
				id:"userdata",
				cmd:"/userdata {login}",
				detailsKey:"params.commands.userdata",
				needAdmin:true,
			},
			{
				id:"greetduration",
				cmd:"/greetDuration {(hh:)(mm:)ss}",
				detailsKey:"params.commands.greetduration",
			},
			{
				id:"pin",
				cmd:"/pin {message}",
				detailsKey:"params.commands.pin",
			},
			{
				id:"triggerlogs",
				cmd:"/triggerlogs",
				detailsKey:"params.commands.triggerlogs",
			},
			{
				id:"heatlogs",
				cmd:"/heatlogs",
				detailsKey:"params.commands.heatlogs",
			},
			{
				id:"discord",
				cmd:"/discord {message}",
				detailsKey:"params.commands.discord",
				needDiscordChan:true,
			},
		],

		spoilerParams: {
			permissions:{
				broadcaster:true,
				mods:true,
				vips:false,
				subs:false,
				all:false,
				follower:false,
				follower_duration_ms:0,
				usersAllowed:[],
				usersRefused:[],
			},
			autoSpoilNewUsers:false,
		},

		isChatMessageHighlighted: false,
		chatHighlightOverlayParams: {
			position:"bl",
		},
	} as IChatState),



	getters: {
		messages():TwitchatDataTypes.ChatMessageTypes[] { return messageList; },
	},



	actions: {
		populateData():void {
			//Init spoiler param
			const spoiler = DataStore.get(DataStore.SPOILER_PARAMS);
			if(spoiler) {
				Utils.mergeRemoteObject(JSON.parse(spoiler), (this.spoilerParams as unknown) as JsonObject);
			}

			//Init chat highlight params
			const chatHighlight = DataStore.get(DataStore.CHAT_HIGHLIGHT_PARAMS);
			if(chatHighlight) {
				Utils.mergeRemoteObject(JSON.parse(chatHighlight), (this.chatHighlightOverlayParams as unknown) as JsonObject);
			}

			//Init bot messages
			const botMessages = DataStore.get(DataStore.BOT_MESSAGES);
			if(botMessages) {
				//Merge remote and local to avoid losing potential new
				//default values on local data
				Utils.mergeRemoteObject(JSON.parse(botMessages), (this.botMessages as unknown) as JsonObject, false);
			}
		},

		async preloadMessageHistory():Promise<void> {
			if(StoreProxy.params.features.saveHistory.value === false) return;
			Database.instance.getMessageList().then(res=>{
				if(res.length === 0) return;
				const splitter:TwitchatDataTypes.MessageHistorySplitterData = {
					id:Utils.getUUID(),
					date:messageList.length > 0? messageList[0].date-.1 : Date.now(),
					platform:"twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.HISTORY_SPLITTER,
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				messageList.unshift(splitter);

				let lastCheer!:TwitchatDataTypes.MessageCheerData;
				let lastSub!:TwitchatDataTypes.MessageSubscriptionData;
				let lastSubgift!:TwitchatDataTypes.MessageSubscriptionData;
				const uid = StoreProxy.auth.twitch.user.id;

				//Force reactivity so merging feature works on old messages
				for (let i = res.length-1; i >= 0; i--) {
					const m = res[i];
					if(!lastCheer && m.type === TwitchatDataTypes.TwitchatMessageType.CHEER) {
						lastCheer = m;
						StoreProxy.auth.lastCheer[uid] = {user:m.user, bits:m.bits};
					}
					if(m.type === TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION) {
						if(!lastSub && !m.is_gift) {
							lastSub = m;
							StoreProxy.auth.lastSubscriber[uid] = m.user;
						}
						if(!lastSubgift && m.is_gift) {
							lastSubgift = m;
							StoreProxy.auth.lastSubgifter[uid] = {user:m.user, giftCount:m.gift_count || 1};
						}
					}
					messageList.unshift(reactive(m));
				}

				EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.RELOAD_MESSAGES));
			}).catch(error=>{
				console.log("DATABASE ERROR");
				console.log(error);
			})
		},

		clearHistory():void {
			StoreProxy.main.confirm(StoreProxy.i18n.t("params.clearHistory"), StoreProxy.i18n.t("params.clearHistory_confirm"))
			.then(()=> {
				Database.instance.clear();
			}).catch(error=>{});
		},

		sendTwitchatAd(adType:TwitchatDataTypes.TwitchatAdStringTypes = -1) {
			if(adType == TwitchatDataTypes.TwitchatAdTypes.DONATE
			|| adType == TwitchatDataTypes.TwitchatAdTypes.DONATE_REMINDER
			|| adType == TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_AD_WARNING) {
				//Don't send donation related messages if premium
				if(StoreProxy.auth.isPremium) return;
			}
			if(adType == TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_AD_WARNING && StoreProxy.auth.isDonor) {
				return;
			}
			if(adType == TwitchatDataTypes.TwitchatAdTypes.NONE) {
				const possibleAds:TwitchatDataTypes.TwitchatAdStringTypes[] = [];
				if(!StoreProxy.auth.isDonor) {
					possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.DONATE);
				}
				//Give more chances to have anything but the "sponsor" ad
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.DISCORD);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.DISCORD);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.DISCORD);
				// else{
					//Add 10 empty slots for every content type available
					//to reduce chances to actually get an "ad"
					const len = 10 * possibleAds.length;
					for (let i = 0; i < len; i++) possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.NONE);
				// }

				adType = Utils.pickRand(possibleAds);
				// adType = TwitchatDataTypes.TwitchatAdTypes.SPONSOR;//TODO comment this line
				if(adType == TwitchatDataTypes.TwitchatAdTypes.NONE) return;
			}

			//Check if current ad has alrady been sent within the last 50 message
			for (let i = messageList.length-1; i >= Math.max(0, messageList.length - 50); i--) {
				const mess = messageList[i];
				if(mess.type != TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD) continue;
				if(mess.adType == adType) return;//Avoid sending 2 consecutive ad of the same type
			}

			this.addMessage( {
				platform:"twitch",
				id:Utils.getUUID(),
				date:Date.now(),
				type:TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD,
				adType,
				channel_id:StoreProxy.auth.twitch.user.id,
			} );
		},

		sendRightClickHint():void {
			StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageChatData>(TwitchatDataTypes.TwitchatMessageType.MESSAGE,(message)=> {
				const m = message as TwitchatDataTypes.MessageChatData;
				const str = StoreProxy.i18n.t("chat.right_click_hint");
				const chunks = TwitchUtils.parseMessageToChunks(str, undefined, true);
				//Highlight word
				TwitchUtils.highlightChunks( chunks, [StoreProxy.i18n.t("chat.right_click_hint_highlight")]);
				m.message = str;
				m.message_chunks = chunks;
				m.message_html = TwitchUtils.messageChunksToHTML(chunks)
				m.message_size = TwitchUtils.computeMessageSize(chunks);
				m.user = StoreProxy.users.getUserFrom("twitch", StoreProxy.auth.twitch.user.id, "40203552", "twitchat", "Twitchat");
				m.user.avatarPath = "logo.png";
				m.user.color = "#bb8eff";
			});
		},


		async addMessage(message:TwitchatDataTypes.ChatMessageTypes) {
			const sParams = StoreProxy.params;
			const sStream = StoreProxy.stream;
			const sUsers = StoreProxy.users;
			const sAutomod = StoreProxy.automod;
			const sRaffle = StoreProxy.raffle;
			const sBingo = StoreProxy.bingo;
			const sQna = StoreProxy.qna;
			const sChatSuggestion = StoreProxy.chatSuggestion;
			const sOBS = StoreProxy.obs;
			const sEmergency = StoreProxy.emergency;
			const sMain = StoreProxy.main;
			const sVoice = StoreProxy.voice;
			const sAuth = StoreProxy.auth;
			const s = Date.now();

			message = reactive(message);

			if(!greetedUsersInitialized) {
				greetedUsersInitialized = true;
				const history = DataStore.get(DataStore.GREET_HISTORY);
				greetedUsersExpire_at = JSON.parse(history ?? "{}");
				//Previously they were stored in an array instead of an object, convert it
				if(Array.isArray(greetedUsersExpire_at)) greetedUsersExpire_at = {};
				const now = Date.now();
				for (const key in greetedUsersExpire_at) {
					if(greetedUsersExpire_at[key] < now - 24 * 60 * 60 * 1000) {
						//Old entry, delete it
						delete greetedUsersExpire_at[key];
					}
				}
				DataStore.set(DataStore.GREET_HISTORY, greetedUsersExpire_at);
			}

			//Check if it's a greetable message
			let isTodaysFirst = false;
			if(TwitchatDataTypes.GreetableMessageTypesString.hasOwnProperty(message.type)) {
				const greetable = message as TwitchatDataTypes.GreetableMessage;
				this.flagMessageAsFirstToday(greetable);
				isTodaysFirst = greetable.todayFirst === true;
			}

			//Live translation if first message ever on the channel
			if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
			&& message.twitch_isFirstMessage
			&& sAuth.isPremium
			&& sParams.features.autoTranslateFirst.value === true
			&& sParams.features.autoTranslateFirstLang.value
			&& (sParams.features.autoTranslateFirstLang.value as string[]).length > 0) {
				const spokenLanguages = sParams.features.autoTranslateFirstSpoken.value as string[] || [];
				const translatable = message as TwitchatDataTypes.TranslatableMessage;
				const text = translatable.message_chunks?.filter(v=>v.type == 'text').map(v=>v.value).join("").trim() || "";
				if(text.length >= 4 && spokenLanguages.length > 0) {
					const res = lande ( text );
					const iso3 = res[0][0] as keyof typeof TranslatableLanguagesMap;
					//Force to english if confidence is too low as it tends to detect weird languages for basic english messages
					//Also force english if first returned lang is Affrikaan and second is english.
					//It detects most english messages as Afrikaan.
					const lang = (res[0][1] < .6 || (res[0][0] == "afr" && res[1][0] == "eng"))? TranslatableLanguagesMap["eng"] : TranslatableLanguagesMap[iso3];
					if(lang && !spokenLanguages.includes(lang.iso1)) {
						const langTarget = (sParams.features.autoTranslateFirstLang.value as string[])[0];
						ApiHelper.call("google/translate", "GET", {langSource:lang.iso1, langTarget, text:text}, false)
						.then(res=>{
							if(res.json.data.translation) {
								translatable.translation = {
									flagISO:lang.flag,
									languageCode:lang.iso1,
									languageName:lang.name,
									translation:res.json.data.translation,
								}
								Database.instance.updateMessage(message);
							}
						}).catch((error)=>{
							translatable.translation_failed = true;
							Database.instance.updateMessage(message);
						});
					}
				}
			}

			switch(message.type) {
				case TwitchatDataTypes.TwitchatMessageType.MESSAGE:
				case TwitchatDataTypes.TwitchatMessageType.WHISPER: {
					if(message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
						const correspondantId = message.user.id == sAuth.twitch.user.id? message.to.id : message.user.id
						if(!this.whispers[correspondantId]) this.whispers[correspondantId] = [];
						this.whispers[correspondantId].push(message);
						this.whispersUnreadCount ++;
						const wsUser = {
							id:message.user.id,
							login:message.user.login,
							displayName:message.user.displayNameOriginal,
						};
						PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_WHISPER, {unreadCount:this.whispersUnreadCount, user:wsUser, message:"<not set for privacy reasons>"});

					}else {

						//Check if it's an "ad" message
						if(message.user.id == sAuth.twitch.user.id
						//Remove eventual /command from the reference message
						&& this.botMessages.twitchatAd.message.trim().replace(/(\s)+/g, "$1").replace(/\/.*? /gi, "") == message.message.trim().replace(/(\s)+/g, "$1")) {
							message.is_ad = true;
						}

						if(message.twitch_hypeChat) {
							//Push a dedicated hype chat message
							const hypeChatMessage:TwitchatDataTypes.MessageHypeChatData = {
								date:Date.now(),
								id:Utils.getUUID(),
								message,
								platform:message.platform,
								type:TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT,
								channel_id:message.channel_id,
							}
							this.addMessage(hypeChatMessage);
						}
					}

					//Check if the message contains a mention
					if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
					&& StoreProxy.params.appearance.highlightMentions.value === true) {
						const login = StoreProxy.auth.twitch.user.login;
						message.hasMention = login != null
											&& new RegExp("\\b"+login+"\\b", "gim")
											.test(message.message ?? "");
					}

					//Custom secret feature hehehe ( ͡~ ͜ʖ ͡°)
					if(ChatCypherPlugin.instance.isCyperCandidate(message.message)) {
						const original = message.message;
						message.message = message.message_html = await ChatCypherPlugin.instance.decrypt(message.message);
						message.message_chunks = TwitchUtils.parseMessageToChunks(message.message);
						message.message_size = TwitchUtils.computeMessageSize(message.message_chunks);
						message.cyphered = message.message != original;
					}

					//Search in the last 30 messages if this message has already been sent
					//If so, just increment the previous one
					if(sParams.features.groupIdenticalMessage.value === true) {
						const len = messageList.length;
						const end = Math.max(0, len - 30);
						for (let i = len-1; i > end; i--) {
							const m = messageList[i];
							if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE && m.type != TwitchatDataTypes.TwitchatMessageType.WHISPER) continue;
							if(message.type != m.type) continue;
							if(m.user.id != message.user.id) continue;
							if(m.date < Date.now() - 30000 || i < len-30) continue;//"i < len-0" more or less means "if message is still visible on screen"
							if(message.message.toLowerCase() != m.message.toLowerCase()) continue;
							if(message.spoiler != m.spoiler) continue;
							if(message.deleted != m.deleted) continue;
							if(message.channel_id != m.channel_id) continue;
							//If whisper target isn't the same, skip it
							if(message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER
								&& m.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
								if(m.to.id != message.to.id) continue;
							}

							if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
							&& m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
								//If highlight state isn't the same, skip it
								if(m.twitch_isHighlighted != message.twitch_isHighlighted) continue;
								//Don't merge automoded
								if(message.automod || m.automod) continue;
								if(message.twitch_automod || m.twitch_automod) continue;
								//Don't merge answers to messages
								if(message.answersTo || m.answersTo) continue;
							}
							if(!m.occurrenceCount) m.occurrenceCount = 0;
							//Remove message
							messageList.splice(i, 1);
							await Database.instance.deleteMessage(m);
							EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, {message:m, force:true}));
							m.occurrenceCount ++;
							//Update timestamp
							m.date = Date.now();
							message = m;
							break;
						}
					}



					if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
						//Reset ad schedule if necessary
						if(!message.user.channelInfo[message.channel_id].is_broadcaster) {
							SchedulerHelper.instance.incrementMessageCount();
						}
						if(/(^|\s|https?:\/\/)twitchat\.fr($|\s)/gi.test(message.message)) {
							SchedulerHelper.instance.resetAdSchedule(message);
						}

						const wsMessage = {
							channel:message.channel_id,
							message:message.message,
							user: {
								id:message.user.id,
								login:message.user.login,
								displayName:message.user.displayNameOriginal,
							}
						}

						//If it's a text message and user isn't a follower, broadcast to WS
						if(message.user.channelInfo[message.channel_id].is_following === false) {
							PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_NON_FOLLOWER, wsMessage);
						}

						//Check if the message contains a mention
						if(message.hasMention) {
							PublicAPI.instance.broadcast(TwitchatEvent.MENTION, wsMessage);
						}

						//If it's the first message today for this user
						if(message.todayFirst === true) {
							PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FIRST, wsMessage);
						}

						//If it's the first message all time of the user
						if(message.twitch_isFirstMessage) {
							//Flag user as new chatter
							message.user.channelInfo[message.channel_id].is_new = true;
							PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FIRST_ALL_TIME, wsMessage);
						}

						//Handle spoiler command
						if(message.answersTo && await Utils.checkPermissions(this.spoilerParams.permissions, message.user, message.channel_id)) {
							const cmd = message.message.replace(/@[^\s]+\s?/, "").trim().toLowerCase();
							if(cmd.indexOf("!spoiler") === 0) {
								message.answersTo.spoiler = true;
							}
						}

						//Flag as spoiler
						if(message.message.indexOf("||") == 0 || (message.answersTo && /^@[0-9a-z]+ \|\|/gi.test(message.message))) message.spoiler = true;

						//check if it's a chat alert command
						if(sParams.features.alertMode.value === true &&
						await Utils.checkPermissions(sMain.chatAlertParams.permissions, message.user, message.channel_id)) {
							if(message.message.trim().toLowerCase().indexOf(sMain.chatAlertParams.chatCmd.trim().toLowerCase()) === 0) {
								//Execute alert
								sMain.chatAlert = message;

								//Execute trigger
								const trigger:TwitchatDataTypes.MessageChatAlertData = {
									date:Date.now(),
									id:Utils.getUUID(),
									platform:message.platform,
									type:TwitchatDataTypes.TwitchatMessageType.CHAT_ALERT,
									message:message,
									channel_id:message.channel_id,
								}
								TriggerActionHandler.instance.execute(trigger);
							}
						}

						//If there's a mention, search for last messages within
						//a max timeframe to find if the message may be a reply to
						//a message that was sent by the mentionned user
						if(/@\w/gi.test(message.message) && !message.answersTo) {
							// console.log("Mention found");
							const ts = Date.now();
							const messages = this.messages;
							const timeframe = 5*60*1000;//Check if a massage answers another within this timeframe
							const matches = message.message.match(/@\w+/gi) as RegExpMatchArray;
							for (let i = 0; i < matches.length; i++) {
								const match = matches[i].replace("@", "").toLowerCase();
								// console.log("Search for message from ", match);
								for (let j = messages.length-1; j >= 0; j--) {
									const m = messages[j];
									//Not a user message, ignore it
									if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) continue;
									//Not sent from the mentionned user, ignore it
									if(m.user.login != match && m.user.displayNameOriginal.toLowerCase() != match) continue;
									//If message is too old, stop there
									if(ts - m.date > timeframe) break;

									if(m.answers) {
										//If it's the root message of a conversation
										m.answers.push( message );
										message.answersTo = m;
									}else if(m.answersTo && m.answersTo.answers) {
										//If the messages answers to a message itself
										//answering to another message
										m.answersTo.answers.push( message );
										message.answersTo = m.answersTo;
									}else{
										//If message answers to a message not from a conversation
										message.answersTo = m;
										if(!m.answers) m.answers = [];
										m.answers.push( message );
									}
									break;
								}
							}
						}

						//If it's a new user and "autospoil new users" option is enabled,
						//set the message as a spoiler
						if(message.user.channelInfo[message.channel_id].is_new === true
						&& this.spoilerParams.autoSpoilNewUsers === true
						&& message.user.noAutospoil !== true) {
							message.spoiler = true;
							message.autospoiled = true;
						}
					}
					break;
				}

				//Reward redeem
				case TwitchatDataTypes.TwitchatMessageType.REWARD: {

					//If a raffle is in progress, check if the user can enter
					const raffle = sRaffle.data;
					if(raffle
					&& raffle.mode == "chat"
					&& raffle.reward_id
					&& message.reward.id === raffle.reward_id) {
						sRaffle.checkRaffleJoin(message);
					}

					const wsMessage = {
						channel:message.channel_id,
						message:message.message,
						message_chunks:(message.message_chunks as unknown) as JsonArray,
						user: {
							id:message.user.id,
							login:message.user.login,
							displayName:message.user.displayNameOriginal,
						},
						reward:{
							id:message.reward.id,
							cost:message.reward.cost,
							title:message.reward.title,
						},
					} as JsonObject;
					PublicAPI.instance.broadcast(TwitchatEvent.REWARD_REDEEM, wsMessage);
					break;
				}

				//Incomming raid
				case TwitchatDataTypes.TwitchatMessageType.RAID: {
					sStream.lastRaider = message.user;
					message.user.channelInfo[message.channel_id].is_raider = true;
					if(sParams.appearance.raidHighlightUser.value
					&& sParams.appearance.raidHighlightUserTrack.value === true) {
						StoreProxy.users.trackUser(message.user);
					}
					setTimeout(()=> {
						const localMess = message as TwitchatDataTypes.MessageRaidData;
						localMess.user.channelInfo[localMess.channel_id].is_raider = false;
						if(sParams.appearance.raidHighlightUser.value
						&& sParams.appearance.raidHighlightUserTrack.value === true) {
							StoreProxy.users.untrackUser(localMess.user);
						}
					}, (sParams.appearance.raidHighlightUserDuration.value as number ?? 0) * 1000 * 60);

					break;
				}

				//New cheer
				case TwitchatDataTypes.TwitchatMessageType.CHEER: {
					message = message as TwitchatDataTypes.MessageCheerData;
					StoreProxy.auth.lastCheer[message.channel_id] = {user:message.user, bits:message.bits};
					break;
				}

				//New sub
				case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
					PublicAPI.instance.broadcast(TwitchatEvent.SUBSCRIPTION, {
						tier:message.tier,
						months:message.months,
						user:{
							id:message.user.id,
							login:message.user.login,
						},
						message:message.message || "",
						message_chunks:(message.message_chunks as unknown) as JsonObject || [],
						recipients:message.gift_recipients?.map(u=>{return {uid:u.id, login:u.login}}) || [],
						streakMonths:message.streakMonths,
						totalSubDuration:message.totalSubDuration,
						giftCount:message.gift_count || 0,
						isPrimeUpgrade:message.is_primeUpgrade,
						isGift:message.is_gift,
						isGiftUpgrade:message.is_giftUpgrade,
						isResub:message.is_resub,
					});
					StoreProxy.auth.totalSubscribers[message.channel_id] ++;
					//If it's a subgift, merge it with potential previous ones
					if(message.is_gift) {
						StoreProxy.auth.lastSubgifter[message.channel_id] = {user:message.user, giftCount:1};
						// console.log("Merge attempt");
						const len = Math.max(0, messageList.length-30);//Only check within the last 30 messages
						for (let i = messageList.length-1; i > len; i--) {
							const m = messageList[i];
							if(m.type != TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION
							|| !message.is_gift
							|| !message.gift_recipients
							|| message.channel_id != m.channel_id) {
								if(m.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION) {
									const json = {
										isGift1:message.is_gift,
										isGift2:m.is_gift,
										ischannelID1:message.channel_id,
										ischannelID2:m.channel_id,
										recipients1:message.gift_recipients,
										recipients2:m.gift_recipients,
									}
									console.log("[SUBSCRIPTION MERGE] cannot merge gift:", json);
								}
								continue;
							}
							// console.log("Found sub ", m);
							//If the message is a subgift from the same user with the same tier on
							//the same channel and happened in the last 5s, merge it.
							if(m.tier == message.tier && m.user.id == message.user.id
							&& Math.abs(message.date - m.date) < 5000) {
								// console.log("MERGE IT !");
								if(!m.gift_recipients) m.gift_recipients = [];
								m.date = Date.now();//Update timestamp
								for (let j = 0; j < message.gift_recipients.length; j++) {
									m.gift_recipients.push(message.gift_recipients[j]);
								}
								m.gift_count = m.gift_recipients.length;
								StoreProxy.auth.lastSubgifter[message.channel_id].giftCount = m.gift_count;
								return;
							}
							console.log("[SUBSCRIPTION MERGE] Don't merge", m.tier == message.tier, m.user.id == message.user.id, Date.now() - m.date < 5000);
						}
					}else{
						StoreProxy.auth.lastSubscriber[message.channel_id] = message.user;
					}
					break;
				}

				//Users joined, check if any need to be autobanned
				case TwitchatDataTypes.TwitchatMessageType.JOIN: {
					for (let i = 0; i < message.users.length; i++) {
						const user = message.users[i];
						const rule = Utils.isAutomoded(user.displayNameOriginal, user, message.channel_id);
						if(rule != null) {
							if(user.platform == "twitch") {
								TwitchUtils.banUser(user, message.channel_id, undefined, `banned by Twitchat's automod because nickname matched an automod rule`);
							}
							//Most message on chat to alert the stream
							const mess:TwitchatDataTypes.MessageAutobanJoinData = {
								platform:user.platform,
								channel_id: message.channel_id,
								type:TwitchatDataTypes.TwitchatMessageType.AUTOBAN_JOIN,
								date:Date.now(),
								id:Utils.getUUID(),
								user,
								rule:rule,
							};
							this.addMessage(mess);
						}
					}
					break;
				}

				//New follower
				case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
					StoreProxy.auth.lastFollower[message.channel_id] = message.user;
					StoreProxy.auth.totalFollowers[message.channel_id] ++;
					sUsers.flagAsFollower(message.user, message.channel_id);

					//Merge all followbot events into one
					if(message.followbot === true) {
						const prevFollowbots:TwitchatDataTypes.MessageFollowingData[] = [];
						const deletedMessages:(TwitchatDataTypes.MessageFollowingData|TwitchatDataTypes.MessageFollowbotData)[] = [];
						let bulkMessage!:TwitchatDataTypes.MessageFollowbotData;

						//Search for any existing followbot event, delete them and group
						//them into a single followbot alert with all the users in it
						//Only search within the last 100 messages
						const maxIndex = Math.max(0, messageList.length - 100);
						let postMessage = true;
						for (let i = messageList.length-1; i >= maxIndex; i--) {
							const m = messageList[i];
							//Found a follow event, delete it
							if(m.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING
							&& m.followbot === true
							&& m.platform == message.platform) {
								m.deleted = true;
								deletedMessages.push(m);
								prevFollowbots.push(m);
								messageList.splice(i, 1);
								i--;
							}else
							//Found an existing bulk message not older than 1min, keep it aside
							if(m.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWBOT_LIST
							&& m.date > Date.now() - 1 * 60 * 1000
							&& m.platform == message.platform) {
								bulkMessage = m;
								postMessage = false;
							}
						}
						if(!bulkMessage) {
							bulkMessage = reactive({
								id:Utils.getUUID(),
								date:Date.now(),
								platform:message.platform,
								type:TwitchatDataTypes.TwitchatMessageType.FOLLOWBOT_LIST,
								users:[],
								channel_id:message.channel_id,
							});
						}
						if(prevFollowbots.length > 0) {
							bulkMessage.users = bulkMessage.users.concat(prevFollowbots.map(v=>v.user));
						}
						bulkMessage.date = Date.now();
						bulkMessage.users.push(message.user);
						message = bulkMessage;

						//Broadcast DELETE events
						while(deletedMessages.length > 0) {
							const m = deletedMessages.pop();
							if(!m) continue;
							EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, {message:m, force:false}));
						}
						if(!postMessage) return;
					}else{
						const wsMessage = {
							user:{
								id: message.user.id,
								login: message.user.login,
								displayName: message.user.displayNameOriginal,
							}
						}
						PublicAPI.instance.broadcast(TwitchatEvent.FOLLOW, wsMessage);
					}
					break;
				}

				//Request to clear chat
				case TwitchatDataTypes.TwitchatMessageType.CLEAR_CHAT: {
					if(message.channel_id) this.delChannelMessages(message.channel_id);
					break;
				}

				//Ban user
				case TwitchatDataTypes.TwitchatMessageType.BAN: {
					this.delUserMessages((message as TwitchatDataTypes.MessageBanData).user.id, (message as TwitchatDataTypes.MessageBanData).channel_id);
					break;
				}
			}


			if(TwitchatDataTypes.TranslatableMessageTypesString.hasOwnProperty(message.type)) {
				const typedMessage = message as TwitchatDataTypes.TranslatableMessage;
				const cmd = (typedMessage.message || "").trim().split(" ")[0].toLowerCase();

				//If a raffle is in progress, check if the user can enter
				const raffle = sRaffle.data;
				if(raffle
				&& raffle.mode == "chat"
				&& raffle.command
				&& cmd == raffle.command.trim().toLowerCase()) {
					sRaffle.checkRaffleJoin(typedMessage);
				}

				//If there's a suggestion poll and the timer isn't over
				const suggestionPoll = sChatSuggestion.data;
				if(suggestionPoll && cmd == suggestionPoll.command.toLowerCase().trim()) {
					sChatSuggestion.addChatSuggestion(typedMessage);
				}

				//Check if it's the winning choice of a bingo
				await sBingo.checkBingoWinner(typedMessage);

				//Handle OBS commands
				await sOBS.handleChatCommand(typedMessage, cmd);

				//Handle Emergency commands
				await sEmergency.handleChatCommand(typedMessage, cmd);

				//Handle Emergency commands
				await sQna.handleChatCommand(typedMessage, cmd);

				//Handle Voicemod commands
				await sVoice.handleChatCommand(typedMessage, cmd);

				//TODO remove this once T4P ends
				const elapsed = Date.now() - StoreProxy.main.t4pLastDate;
				if(elapsed > 60000 && StoreProxy.main.t4p && cmd == StoreProxy.main.t4p) {
					ApiHelper.call("t4p", "GET").then(result => {
						if(result.status == 200 && result.json.data) {
							const name = StoreProxy.i18n.locale == "fr"? result.json.data.campaignNameFr : result.json.data.campaignName
							MessengerProxy.instance.sendMessage(name+": "+result.json.data.url);
						}
					})
				}
			}


			//Apply automod rules if requested
			if(sAutomod.params.enabled === true) {
				if( message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
				|| message.type == TwitchatDataTypes.TwitchatMessageType.CHEER
				|| message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION
				|| message.type == TwitchatDataTypes.TwitchatMessageType.REWARD
				|| message.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING
				|| message.type == TwitchatDataTypes.TwitchatMessageType.RAID) {
					if(sAutomod.params.banUserNames === true && !message.user.channelInfo[message.channel_id].is_banned) {
						//Check if nickname passes the automod
						const rule = Utils.isAutomoded(message.user.displayNameOriginal, message.user, message.channel_id);
						if(rule) {
							//User blocked by automod
							if(message.user.platform == "twitch") {
								message.user.channelInfo[message.channel_id].is_banned = true;
								TwitchUtils.banUser(message.user, message.channel_id, undefined, "banned by Twitchat's automod because nickname matched an automod rule");
							}
							//Post message on chat to alert the streamer
							const mess:TwitchatDataTypes.MessageAutobanJoinData = {
								platform:"twitchat",
								channel_id: message.channel_id,
								type:TwitchatDataTypes.TwitchatMessageType.AUTOBAN_JOIN,
								date:Date.now(),
								id:Utils.getUUID(),
								user:message.user,
								rule:rule,
							};
							this.addMessage(mess);
							return;
						}
					}

					//Check if message passes the automod
					if(message.type != TwitchatDataTypes.TwitchatMessageType.FOLLOWING
					&& message.type != TwitchatDataTypes.TwitchatMessageType.RAID
					&& message.message) {
						const rule = Utils.isAutomoded(message.message, message.user, message.channel_id);
						if(rule) {
							if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
								//If rule does not requests to be applied only to first time chatters
								//or if it's a first time chatter
								if(rule.firstTimeChatters !== true ||
									(rule.firstTimeChatters === true &&
										(
										message.twitch_isFirstMessage ||
										message.twitch_isPresentation
										)
									)
								) {
									message.automod = rule;
									if(message.user.platform == "twitch") {
										TwitchUtils.deleteMessages(message.channel_id, message.id);
										//No need to call this.deleteMessageByID(), IRC will call it when request completes
									}

									//Start emergency if requested
									if(rule.emergency === true && sEmergency.params.enabled === true) {
										sEmergency.setEmergencyMode(true);
									}
								}
							}
						}
					}
				}
			}

			//Only save messages to history if requested
			if(TwitchatDataTypes.DisplayableMessageTypes[message.type] === true) {
				messageList.push( message );
				if(StoreProxy.params.features.saveHistory.value === true && message.fake !== true) {
					Database.instance.addMessage(message).catch((error)=>{
						console.error("Database addMessage() error");
						console.log(error);
					});
					//If user isn't fully loaded yet, wait for it to be loaded
					if("user" in message && message.user) {
						const u = (message.user as TwitchatDataTypes.TwitchatUser)
						if(u.temporary === true) {
							watch(()=> u.temporary, ()=> {
								Database.instance.updateMessage(message).catch((error)=>{
									console.error("Database updateMessage() error");
									console.log(error);
								})
							})
						}
					}
				}

				//Limit history size
				while(messageList.length >= this.realHistorySize) {
					messageList.shift();
				}

				EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.ADD_MESSAGE, message));
			}

			const e = Date.now();
			// console.log(messageList.length, e-s);
			if(e-s > 50) console.log("Message #"+ message.id, "took more than 50ms ("+(e-s)+") to be processed! - Type:\""+message.type+"\"", " - Sent at:"+message.date, message);

			if(message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION && message.is_gift) {
				//If it's a subgift, wait a little before proceeding as subgifts do not
				//come all at once but sequentially.
				//We wait a second and check if the count changed, if nothing changed after a second
				//consider that everything arrived and proceed
				let recipientCount = -1;
				while(recipientCount != message.gift_recipients!.length){
					recipientCount = message.gift_recipients!.length;
					await Utils.promisedTimeout(1000);
				}
			}

			if(message.type == TwitchatDataTypes.TwitchatMessageType.CHEER) {
				//If it's a cheer, wait a little before proceeding as PubSub may send a "pinned" event after
				//if user sent a "pinned cheer".
				await Utils.promisedTimeout(1000);
				const wsMessage = {
					channel:message.channel_id,
					message:message.message,
					message_chunks:(message.message_chunks as unknown) as JsonArray,
					user: {
						id:message.user.id,
						login:message.user.login,
						displayName:message.user.displayNameOriginal,
					},
					bits:message.bits,
					pinned:message.pinned,
					pinLevel:message.pinLevel,
				} as JsonObject;
				PublicAPI.instance.broadcast(TwitchatEvent.BITS, wsMessage);
			}

			TriggerActionHandler.instance.execute(message);
			TTSUtils.instance.addMessageToQueue(message);
		},

		deleteMessageByID(messageID:string, deleter?:TwitchatDataTypes.TwitchatUser, callEndpoint:boolean = true) {
			//Start from most recent messages to find it faster
			for (let i = messageList.length-1; i > -1; i--) {
				const m = messageList[i];
				if(messageID == m.id && !m.deleted) {
					this.deleteMessage(m, deleter, callEndpoint);
					break;
				}
			}
		},

		deleteMessage(message:TwitchatDataTypes.ChatMessageTypes, deleter?:TwitchatDataTypes.TwitchatUser, callEndpoint = true) {
			message.deleted = true;
			const i = messageList.findIndex(v=>v.id === message.id);

			//If message doesn't exist, stop there
			if(i == -1) return;

			if(message.type == TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD
			|| message.type == TwitchatDataTypes.TwitchatMessageType.SCOPE_REQUEST
			|| (message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE && message.is_ad)) {
				messageList.splice(i, 1);
				if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE && message.is_ad) Database.instance.deleteMessage(message);
				EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, {message:message, force:false}));

			}else if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				let shouldUpdateDB = false;
				const wsMessage = {
					channel:message.channel_id,
					message:message.message,
					user:{
						id:message.user.id,
						login:message.user.login,
						displayName:message.user.displayNameOriginal,
					}
				}
				PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_DELETED, wsMessage);

				//Don't keep automod accept/reject message
				if(message.twitch_automod) {
					messageList.splice(i, 1);
					Database.instance.deleteMessage(message);
				}

				if(deleter) {
					message.deletedData = { deleter };
					shouldUpdateDB = true;
				}

				if(callEndpoint && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
					switch(message.platform) {
						case "twitch":{
							TwitchUtils.deleteMessages(message.channel_id, message.id);
							break;
						}
						case "youtube":{
							YoutubeHelper.instance.deleteMessage(message.id);
							break;
						}
					}
					shouldUpdateDB = true;
				}
				if(shouldUpdateDB) {
					StoreProxy.qna.deleteMessage(message.id);
					Database.instance.updateMessage(message);
				}
			}else{
				messageList.splice(i, 1);
				Database.instance.deleteMessage(message);
			}

			EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, {message:message, force:false}));
		},

		delUserMessages(uid:string, channelId:string) {
			for (let i = messageList.length-1; i >= 0; i--) {
				const m = messageList[i];
				//If we reached messages older than 2h, stop there, there's no much point in
				//spending process for that old messages
				if(Date.now() - m.date > 2 * 60000) break;

				if(!TwitchatDataTypes.GreetableMessageTypesString.hasOwnProperty(m.type)) continue;
				const mTyped = m as TwitchatDataTypes.GreetableMessage;
				if(mTyped.user.id == uid
				&& mTyped.channel_id == channelId
				&& !mTyped.cleared) {
					//Send public API events by batches of 5 to avoid clogging it
					setTimeout(()=> {
						const wsMessage = {
							channel:mTyped.channel_id,
							message:(m.type == "message")? m.message : "",
							user:{
								id:mTyped.user.id,
								login:mTyped.user.login,
								displayName:mTyped.user.displayNameOriginal,
							}
						}
						PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_DELETED, wsMessage);
					}, Math.floor(i/5)*50)

					mTyped.cleared = true;
					StoreProxy.qna.deleteMessage(m.id);
					Database.instance.updateMessage(m);
					// mTyped.deleted = true;
					// EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, {message:m, force:false}));
				}
			}
		},

		delChannelMessages(channelId:string):void {
			for (let i = 0; i < messageList.length; i++) {
				const m = messageList[i];
				if(!TwitchatDataTypes.GreetableMessageTypesString.hasOwnProperty(m.type)) continue;
				const mTyped = m as TwitchatDataTypes.GreetableMessage;
				if(mTyped.channel_id == channelId && !mTyped.cleared) {
					//Send public API events by batches of 5 to avoid clogging it
					setTimeout(()=> {
						const wsMessage = {
							channel:mTyped.channel_id,
							message:(m.type == "message")? m.message : "",
							user:{
								id:mTyped.user.id,
								login:mTyped.user.login,
								displayName:mTyped.user.displayNameOriginal,
							}
						}
						PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_DELETED, wsMessage);
					}, Math.floor(i/5)*50)

					mTyped.cleared = true;
					Database.instance.updateMessage(m);
				}
			}
		},

		setEmoteSelectorCache(payload:{user:TwitchatDataTypes.TwitchatUser, emotes:TwitchatDataTypes.Emote[]}[]) { this.emoteSelectorCache = payload; },

		closeWhispers( userID:string) {
			delete this.whispers[userID];
		},

		doSearchMessages(value:string) { this.$state.searchMessages = value; },

		updateBotMessage(value:{key:TwitchatDataTypes.BotMessageField, enabled:boolean, message:string}) {
			this.botMessages[value.key].enabled = value.enabled;
			this.botMessages[value.key].message = value.message;
			DataStore.set(DataStore.BOT_MESSAGES, this.botMessages);
		},

		setChatHighlightOverlayParams(params:TwitchatDataTypes.ChatHighlightParams) {
			this.chatHighlightOverlayParams = params;
			DataStore.set(DataStore.CHAT_HIGHLIGHT_PARAMS, params);
		},

		setSpoilerParams(params:TwitchatDataTypes.SpoilerParamsData) {
			this.spoilerParams = params;
			DataStore.set(DataStore.SPOILER_PARAMS, params);
		},

		saveMessage(message:TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData) {
			message.is_saved = true;
			this.pinedMessages.push(message);
			EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.PIN_MESSAGE, message));
		},

		unsaveMessage(message:TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData) {
			this.pinedMessages.forEach((v, index)=> {
				if(v.id == message.id) {
					message.is_saved = false;
					this.pinedMessages.splice(index, 1);
					EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.UNPIN_MESSAGE, message));
				}
			})
		},

		async highlightChatMessageOverlay(message?:TwitchatDataTypes.TranslatableMessage) {
			if(message && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE && message.user.id) {
				if(message.platform == "twitch"
				&& (!message.user.displayName || !message.user.avatarPath || !message.user.login)) {
					//Get user info
					const [twitchUser] = await TwitchUtils.loadUserInfo([message.user.id]);
					message.user.avatarPath = twitchUser.profile_image_url;
					//Populate more info just in case some are missing
					message.user.login = twitchUser.login;
					message.user.displayNameOriginal = twitchUser.display_name;
				}

				const info:TwitchatDataTypes.ChatHighlightInfo = {
					message:message.message_html,
					user:message.user,
					params:this.chatHighlightOverlayParams
				};
				this.isChatMessageHighlighted = true;

				const m:TwitchatDataTypes.MessageChatHighlightData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:message.user.platform,
					type:TwitchatDataTypes.TwitchatMessageType.CHAT_HIGHLIGHT,
					info,
					channel_id:message.channel_id,
				};
				this.addMessage(m);
				PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, (info as unknown) as JsonObject);
			}else{
				this.isChatMessageHighlighted = false;
				PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE);
			}

		},

		async flagSuspiciousMessage(data:PubSubDataTypes.LowTrustMessage, retryCount?:number):Promise<void> {
			const list = this.messages;
			for (let i = 0; i < list.length; i++) {
				const message = list[i];
				if(message.id == data.message_id && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
					if(data.low_trust_user.shared_ban_channel_ids?.length > 0) {
						const users = await TwitchUtils.loadUserInfo(data.low_trust_user.shared_ban_channel_ids);
						message.twitch_sharedBanChannels = users?.map(v=> { return {id:v.id, login:v.login}}) ?? [];
					}
					message.twitch_isSuspicious = true;
					EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, {message:message, force:false}));
					EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.ADD_MESSAGE, message));
					TTSUtils.instance.addMessageToQueue(message);
					return;
				}
			}

			//If reaching this point, it's most probably because pubsub sent us the
			//event before receiving message on IRC. Wait a little and try again
			if(retryCount != 20) {
				retryCount = retryCount? retryCount++ : 1;
				setTimeout(()=>{
					this.flagSuspiciousMessage(data, retryCount);
				}, 100);
			}
		},

		flagMessageAsFirstToday(message:TwitchatDataTypes.GreetableMessage):void {
			const user = message.user;
			const has5hPassed = (user.channelInfo[message.channel_id].lastActivityDate || 0) + (5 * 60 * 60 * 1000) < Date.now();
			user.channelInfo[message.channel_id].lastActivityDate = Date.now();

			//Don't greet again if less than 5h have passed since last activity
			//this makes it so if a stream lasts for more than 8h, a user that
			//has been active during the last 5h won't be greeted again
			if(!has5hPassed) return;

			//Don't flag our own messages as first
			if(message.channel_id == user.id) return;

			//Ignore blocked users
			if(user.is_blocked === true) return;

			//Don't greet a user already greeted
			if(greetedUsersExpire_at[user.id] && greetedUsersExpire_at[user.id] > Date.now()) return;

			//Ignore bots
			if(StoreProxy.users.knownBots[message.platform][user.login.toLowerCase()] === true) return;

			message.todayFirst = true;
			greetedUsersExpire_at[user.id] = Date.now() + (1000 * 60 * 60 * 8);//expire after 8 hours
			DataStore.set(DataStore.GREET_HISTORY, greetedUsersExpire_at, false);
		},

		resetGreetingHistory():void {
			const users = StoreProxy.users.users;
			//Reset last activity date of all users on all channels
			for (let i = 0; i < users.length; i++) {
				const u = users[i];
				for (const chan in u.channelInfo) {
					u.channelInfo[chan].lastActivityDate = 0;
				}
			}
			greetedUsersExpire_at = {};
			//Reset greeting history
			DataStore.remove(DataStore.GREET_HISTORY);
		},

		cleanupDonationRelatedMessages():void {
			for (let i = 0; i < messageList.length; i++) {
				const m = messageList[i];
				if(m.type !== TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD) continue;
				if(m.adType == TwitchatDataTypes.TwitchatAdTypes.DONATE
				|| m.adType == TwitchatDataTypes.TwitchatAdTypes.DONATE_REMINDER
				|| m.adType == TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_AD_WARNING) {
					this.deleteMessage(m);
				}
			}
		},
	} as IChatActions
	& ThisType<IChatActions
		& UnwrapRef<IChatState>
		& _StoreWithState<"chat", IChatState, IChatGetters, IChatActions>
		& _StoreWithGetters<IChatGetters>
		& PiniaCustomProperties
	>,
})
