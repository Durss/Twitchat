import { TranslatableLanguagesMap } from '@/TranslatableLanguages';
import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';
import SSEEvent from '@/events/SSEEvent';
import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import ChatCypherPlugin from '@/utils/ChatCypherPlugin';
import LandeWorker from '@/utils/LandeWorker';
import PublicAPI from '@/utils/PublicAPI';
import SSEHelper from '@/utils/SSEHelper';
import SchedulerHelper from '@/utils/SchedulerHelper';
import TTSUtils from '@/utils/TTSUtils';
import Utils from '@/utils/Utils';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import YoutubeHelper from '@/utils/youtube/YoutubeHelper';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonArray, JsonObject } from 'type-fest';
import { reactive, watch, type UnwrapRef } from 'vue';
import Database from '../Database';
import StoreProxy, { type IChatActions, type IChatGetters, type IChatState } from '../StoreProxy';
import Logger from '@/utils/Logger';
import Config from '@/utils/Config';

//Don't make this reactive, it kills performances on the long run
let messageList:TwitchatDataTypes.ChatMessageTypes[] = [];
let greetedUsersExpire_at:{[key:string]:number} = {};
let greetedUsersInitialized:boolean = false;
let subgiftHistory:TwitchatDataTypes.MessageSubscriptionData[] = [];
let antiHateRaidCounter:{[message:string]:{messages:TwitchatDataTypes.MessageChatData[], date:number, ignore:boolean}} = {};
let currentHateRaidAlert!:TwitchatDataTypes.MessageHateRaidData;
let parsedMessageIds:Record<string, boolean> = {};

export const storeChat = defineStore('chat', {
	state: () => ({
		searchMessages: "",
		realHistorySize: 20000,
		whispersUnreadCount: 0,
		pinedMessages: [],
		whispers: {},
		emoteSelectorCache: [],
		replyTo: null,
		messageMode: "message",
		spamingFakeMessages: false,
		securityRaidGraceEndDate: 0,

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
			raffleTipsStart: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.raffleTipsStart"),
			},
			raffleTipsJoin: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.raffleTipsJoin"),
			},
			raffleTipsWinner: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.raffleTipsWinner"),
			},
			raffleSubsWinner: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.raffleSubsWinner"),
			},
			raffleListWinner: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.raffleListWinner"),
			},
			raffleValuesWinner: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.raffleValuesWinner"),
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
				cmd:"/timerAdd {hh:mm:ss}",
				detailsKey:"params.commands.timerAdd",
			},
			{
				id:"timerRemove",
				cmd:"/timerRemove {hh:mm:ss}",
				detailsKey:"params.commands.timerRemove",
			},
			{
				id:"timerStop",
				cmd:"/timerStop",
				detailsKey:"params.commands.timerStop",
			},
			{
				id:"countdown",
				cmd:"/countdown {hh:mm:ss}",
				detailsKey:"params.commands.countdown",
			},
			{
				id:"countdownAdd",
				cmd:"/countdownAdd {hh:mm:ss}",
				detailsKey:"params.commands.countdownAdd",
			},
			{
				id:"countdownRemove",
				cmd:"/countdownRemove {hh:mm:ss}",
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
				needBroadcaster:true,
				twitchCmd:true,
				twitch_scopes:[TwitchScopes.START_RAID,
					TwitchScopes.BLOCKED_TERMS,
					TwitchScopes.SET_ROOM_SETTINGS,
					TwitchScopes.UNBAN_REQUESTS,
					TwitchScopes.EDIT_BANNED,
					TwitchScopes.DELETE_MESSAGES,
					TwitchScopes.CHAT_WARNING,
					TwitchScopes.READ_MODERATORS,
					TwitchScopes.READ_VIPS],
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
				needBroadcaster:true,
				twitchCmd:true,
				twitch_scopes:[TwitchScopes.MANAGE_POLLS],
			},
			{
				id:"chatpoll",
				cmd:"/chatPoll {title}",
				detailsKey:"params.commands.chat_poll"
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
				needBroadcaster:true,
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
				id:"alertStreamer",
				cmd:"/alertStreamer {message}",
				detailsKey:"params.commands.alertStreamer",
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
				needBroadcaster:true,
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
				needBroadcaster:true,
				twitch_scopes:[TwitchScopes.EDIT_BLOCKED],
			},
			{
				id:"unblock",
				cmd:"/unblock {user}",
				detailsKey:"params.commands.unblock",
				twitchCmd:true,
				needBroadcaster:true,
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
				cmd:"/subscribers",
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
				twitch_scopes:[TwitchScopes.WHISPER_READ, TwitchScopes.WHISPER_MANAGE],
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
				needBroadcaster:true,
				twitch_scopes:[TwitchScopes.EDIT_MODS],
			},
			{
				id:"unmod",
				cmd:"/unmod {user}",
				detailsKey:"params.commands.unmod",
				twitchCmd:true,
				needBroadcaster:true,
				twitch_scopes:[TwitchScopes.EDIT_MODS],
			},
			{
				id:"vip",
				cmd:"/vip {user}",
				detailsKey:"params.commands.vip",
				twitchCmd:true,
				needBroadcaster:true,
				twitch_scopes:[TwitchScopes.EDIT_VIPS],
			},
			{
				id:"unvip",
				cmd:"/unvip {user}",
				detailsKey:"params.commands.unvip",
				twitchCmd:true,
				needBroadcaster:true,
				twitch_scopes:[TwitchScopes.EDIT_VIPS],
			},
			{
				id:"clip",
				cmd:"/clip",
				detailsKey:"params.commands.clips",
				twitchCmd:true,
				needModerator:true,
				twitch_scopes:[TwitchScopes.CLIPS_EDIT],
			},
			{
				id:"marker",
				cmd:"/marker {comment}",
				detailsKey:"params.commands.marker",
				twitchCmd:true,
				needBroadcaster:true,
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
				needBroadcaster:true,
				twitch_scopes:[TwitchScopes.ADS_SNOOZE],
			},
			{
				id:"streamtitle",
				cmd:"/setStreamTitle {title}",
				detailsKey:"params.commands.streamTitle",
				needBroadcaster:true,
				twitchCmd:true,
				twitch_scopes:[TwitchScopes.SET_STREAM_INFOS],
			},
			{
				id:"streamcategory",
				cmd:"/setStreamCategory {category}",
				detailsKey:"params.commands.streamCategory",
				needBroadcaster:true,
				twitchCmd:true,
				twitch_scopes:[TwitchScopes.SET_STREAM_INFOS],
			},
			{
				id:"streamtags",
				cmd:"/setStreamTags {tag1} {tag2}",
				detailsKey:"params.commands.streamTags",
				needBroadcaster:true,
				twitchCmd:true,
				twitch_scopes:[TwitchScopes.SET_STREAM_INFOS],
			},
			{
				id:"warn",
				cmd:"/warn {user} {reason}",
				detailsKey:"params.commands.warn",
				needModerator:true,
				twitchCmd:true,
				twitch_scopes:[TwitchScopes.CHAT_WARNING],
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
				id:"giftpremium",
				cmd:"/giftpremium {user}",
				detailsKey:"params.commands.giftpremium",
				needAdmin:true,
			},
			{
				id:"ungiftpremium",
				cmd:"/ungiftpremium {user}",
				detailsKey:"params.commands.ungiftpremium",
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
			permissions:Utils.getDefaultPermissions(true, true, false, false, false, false),
			autoSpoilNewUsers:false,
		},

		highlightedMessageId: null,
		chatHighlightOverlayParams: {
			position:"bl",
			dateLabel:"",
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

			const findAndFlagAutomod = (accept:boolean) => {
				//Only search within the last 1000 messages
				for (let i = messageList.length-1; i >= Math.max(0, messageList.length - 1000); i--) {
					const mess = messageList[i];
					if(mess.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE || !mess.twitch_automod) continue;
					this.automodAction(accept, mess);
					break;
				}
			};
			PublicAPI.instance.addEventListener(TwitchatEvent.AUTOMOD_ACCEPT, ()=> findAndFlagAutomod(true));
			PublicAPI.instance.addEventListener(TwitchatEvent.AUTOMOD_REJECT, ()=> findAndFlagAutomod(false));

			//Listen for moderator event spoiling messages remotely
			SSEHelper.instance.addEventListener(SSEEvent.SPOIL_MESSAGE, (event)=>{
				//Only search within the last 1000 messages
				for (let i = messageList.length-1; i >= Math.max(0, messageList.length - 1000); i--) {
					const mess = messageList[i];
					if(mess.id == event.data?.messageId && mess.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
						mess.spoiler = true;
						break;
					}
				}
			});

			//Listen for private moderator messages
			SSEHelper.instance.addEventListener(SSEEvent.PRIVATE_MOD_MESSAGE, (event)=>{
				if(!event.data) return;
				const message_chunks = event.data.message;
				const channel_id = StoreProxy.auth.twitch.user.id;
				const from = StoreProxy.users.getUserFrom("twitch", channel_id, event.data.from_uid, channel_id, event.data.from_login);
				this.addPrivateModMessage(from, message_chunks, event.data.action, event.data.messageId, event.data.messageIdParent, undefined, event.data.messageParentFallback);
			});

			//Listen for private moderator messages answers
			SSEHelper.instance.addEventListener(SSEEvent.PRIVATE_MOD_MESSAGE_ANSWER, (event)=>{
				if(!event.data) return;
				for (let i = messageList.length-1; i >= Math.max(0, messageList.length - 1000); i--) {
					const message = messageList[i];
					if(message.id == event.data.messageId && message.type == TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE) {
						message.answer = event.data.answer;
						Database.instance.updateMessage(message);
						break;
					}
				}
			});
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

				let lastRaid = false;
				let lastCheer = false;
				let lastCombo = false;
				let lastReward = false;
				let lastPuEmote = false;
				let lastPuCelebration = false;
				let lastPuMessage = false;
				let lastSub = false;
				let lastSubgift = false;

				//Parse all history
				for (let i = res.length-1; i >= 0; i--) {
					const m = res[i];

					//Filter only entries for our own channel
					// if(m.channel_id != uid) continue;

					if(!lastPuEmote && m.type === TwitchatDataTypes.TwitchatMessageType.MESSAGE && m.twitch_gigantifiedEmote) {
						lastPuEmote = true;
						const emote = m.message_chunks.findLast(v=>v.type == "emote");
						StoreProxy.labels.updateLabelValue("POWER_UP_GIANTIFIED_ID", m.user.id);
						StoreProxy.labels.updateLabelValue("POWER_UP_GIANTIFIED_NAME", m.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("POWER_UP_GIANTIFIED_AVATAR", m.user.avatarPath || "", m.user.id);
						StoreProxy.labels.updateLabelValue("POWER_UP_GIANTIFIED_CODE", emote?.value || "");
						StoreProxy.labels.updateLabelValue("POWER_UP_GIANTIFIED_IMAGE", emote?.emoteHD || "");
					}

					if(!lastPuCelebration && m.type === TwitchatDataTypes.TwitchatMessageType.TWITCH_CELEBRATION) {
						lastPuCelebration = true;
						StoreProxy.labels.updateLabelValue("POWER_UP_CELEBRATION_ID", m.user.id);
						StoreProxy.labels.updateLabelValue("POWER_UP_CELEBRATION_NAME", m.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("POWER_UP_CELEBRATION_AVATAR", m.user.avatarPath || "", m.user.id);
						StoreProxy.labels.updateLabelValue("POWER_UP_CELEBRATION_CODE", m.emoteID);
						StoreProxy.labels.updateLabelValue("POWER_UP_CELEBRATION_IMAGE", m.emoteURL);
					}

					if(!lastPuMessage && m.type === TwitchatDataTypes.TwitchatMessageType.MESSAGE && m.twitch_animationId) {
						lastPuMessage = true;
						StoreProxy.labels.updateLabelValue("POWER_UP_MESSAGE_ID", m.user.id);
						StoreProxy.labels.updateLabelValue("POWER_UP_MESSAGE_NAME", m.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("POWER_UP_MESSAGE_AVATAR", m.user.avatarPath || "", m.user.id);
					}

					if(!lastCheer && m.type === TwitchatDataTypes.TwitchatMessageType.CHEER) {
						lastCheer = true;
						StoreProxy.labels.updateLabelValue("CHEER_ID", m.user.id);
						StoreProxy.labels.updateLabelValue("CHEER_NAME", m.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("CHEER_AVATAR", m.user.avatarPath || "", m.user.id);
						StoreProxy.labels.updateLabelValue("CHEER_AMOUNT", m.bits);
					}
					if(!lastCombo && m.type === TwitchatDataTypes.TwitchatMessageType.TWITCH_COMBO) {
						lastCombo = true;
						StoreProxy.labels.updateLabelValue("COMBO_ID", m.user.id);
						StoreProxy.labels.updateLabelValue("COMBO_NAME", m.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("COMBO_AVATAR", m.user.avatarPath || "", m.user.id);
						StoreProxy.labels.updateLabelValue("COMBO_AMOUNT", m.bits);
					}
					if(!lastReward && m.type === TwitchatDataTypes.TwitchatMessageType.REWARD) {
						lastReward = true;
						StoreProxy.labels.updateLabelValue("REWARD_ID", m.user.id);
						StoreProxy.labels.updateLabelValue("REWARD_NAME", m.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("REWARD_AVATAR", m.user.avatarPath || "", m.user.id);
						StoreProxy.labels.updateLabelValue("REWARD_ICON", m.reward.icon.hd || m.reward.icon.sd);
						StoreProxy.labels.updateLabelValue("REWARD_TITLE", m.reward.title);
					}
					if(!lastRaid && m.type === TwitchatDataTypes.TwitchatMessageType.RAID) {
						lastRaid = true;
						StoreProxy.labels.updateLabelValue("RAID_ID", m.user.id);
						StoreProxy.labels.updateLabelValue("RAID_NAME", m.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("RAID_AVATAR", m.user.avatarPath || "", m.user.id);
						StoreProxy.labels.updateLabelValue("RAID_COUNT", m.viewers);
					}
					if(m.type === TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION) {
						if(!lastSub && !m.is_gift) {
							lastSub = true;
							StoreProxy.labels.updateLabelValue("SUB_ID", m.user.id);
							StoreProxy.labels.updateLabelValue("SUB_NAME", m.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("SUB_AVATAR", m.user.avatarPath || "", m.user.id);
							StoreProxy.labels.updateLabelValue("SUB_TIER", m.tier);
							StoreProxy.labels.updateLabelValue("SUB_GENERIC_ID", m.user.id);
							StoreProxy.labels.updateLabelValue("SUB_GENERIC_NAME", m.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("SUB_GENERIC_AVATAR", m.user.avatarPath || "", m.user.id);
							StoreProxy.labels.updateLabelValue("SUB_GENERIC_TIER", m.tier);
						}
						if(!lastSubgift && m.is_gift) {
							lastSubgift = true;
							StoreProxy.labels.updateLabelValue("SUBGIFT_ID", m.user.id);
							StoreProxy.labels.updateLabelValue("SUBGIFT_NAME", m.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("SUBGIFT_AVATAR", m.user.avatarPath || "", m.user.id);
							StoreProxy.labels.updateLabelValue("SUBGIFT_TIER", m.tier);
							StoreProxy.labels.updateLabelValue("SUBGIFT_COUNT", m.gift_count || 1);
							StoreProxy.labels.updateLabelValue("SUBGIFT_GENERIC_ID", m.user.id);
							StoreProxy.labels.updateLabelValue("SUBGIFT_GENERIC_NAME", m.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("SUBGIFT_GENERIC_AVATAR", m.user.avatarPath || "", m.user.id);
							StoreProxy.labels.updateLabelValue("SUBGIFT_GENERIC_TIER", m.tier);
							StoreProxy.labels.updateLabelValue("SUBGIFT_GENERIC_COUNT", m.gift_count || 1);
							StoreProxy.labels.updateLabelValue("SUB_GENERIC_ID", m.user.id);
							StoreProxy.labels.updateLabelValue("SUB_GENERIC_NAME", m.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("SUB_GENERIC_AVATAR", m.user.avatarPath || "", m.user.id);
							StoreProxy.labels.updateLabelValue("SUB_GENERIC_TIER", m.tier);
						}
					}
					//Force reactivity so merging feature works on old messages
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
				Database.instance.clearMessages();
			}).catch(error=>{});
		},

		sendTwitchatAd(adType:TwitchatDataTypes.TwitchatAdStringTypes = -1) {
			if(adType == TwitchatDataTypes.TwitchatAdTypes.DONATE
			|| adType == TwitchatDataTypes.TwitchatAdTypes.DONATE_REMINDER
			|| adType == TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_AD_WARNING) {
				//Don't send donation related messages if premium
				if(StoreProxy.auth.isPremium) return;
				//Don't send donation related messages if already donated
				if(StoreProxy.auth.donorLevel > -1) return;
			}
			if(adType == TwitchatDataTypes.TwitchatAdTypes.NONE) {
				const possibleAds:TwitchatDataTypes.TwitchatAdStringTypes[] = [];
				if(StoreProxy.auth.donorLevel == -1 && !StoreProxy.auth.isPremium) {
					possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.DONATE);
				}
				//Give more chances to have anything but the "donate" ad
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


		async addMessage(message:TwitchatDataTypes.ChatMessageTypes, saveToDB:boolean = true) {
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
			const sBingoGrid = StoreProxy.bingoGrid;
			const sChatPoll = StoreProxy.chatPoll;
			const sAuth = StoreProxy.auth;
			const s = Date.now();
			const logTimings = false;//Enable to check for perf issues
			const isFromRemoteChan = message.channel_id != sAuth.twitch.user.id
									&& message.channel_id != sAuth.youtube.user?.id
									// Consider tiktok messages as "own" because there's no auth
									&& message.platform !== "tiktok";

			if(parsedMessageIds[message.id]) return;
			parsedMessageIds[message.id] = true;

			try {

				message = reactive(message);

				if(!message.channelSource
				&& message.channel_id != sAuth.twitch.user.id
				&& message.channel_id != sAuth.youtube.user?.id) {
					const infos = sStream.connectedTwitchChans.find(v=>v.user.id == message.channel_id);
					if(infos) {
						message.channelSource = {
							color: infos.color,
							name: infos.user.displayNameOriginal,
							pic: infos.user.avatarPath?.replace(/300x300/gi, "50x50"),
						}
					}
				}

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
				if(TwitchatDataTypes.GreetableMessageTypesString.hasOwnProperty(message.type)) {
					const greetable = message as TwitchatDataTypes.GreetableMessage;
					this.flagMessageAsFirstToday(greetable);
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
						//Check language of the message from the worker
						LandeWorker.instance.lande(text, (langs)=>{
							const iso3 = langs[0][0] as keyof typeof TranslatableLanguagesMap;
							//Force to english if confidence is too low as it tends to detect weird languages for basic english messages
							//Also force english if first returned lang is Affrikaan and second is english.
							//It detects most english messages as Afrikaan.
							const lang = (langs[0][1] < .6 || (langs[0][0] == "afr" && langs[1][0] == "eng"))? TranslatableLanguagesMap["eng"] : TranslatableLanguagesMap[iso3];
							if(lang && !spokenLanguages.includes(lang.iso1)) {
								const langTarget = (sParams.features.autoTranslateFirstLang.value as string[])[0];
								if(lang.iso1 != langTarget) {
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
						})
					}
				}

				if(logTimings) console.log("1", message.id, Date.now() - s);
				switch(message.type) {
					case TwitchatDataTypes.TwitchatMessageType.MESSAGE:
					case TwitchatDataTypes.TwitchatMessageType.WHISPER: {
						if(message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
							const to = message.user.id == sAuth.twitch.user.id? message.to : message.user;
							const from = message.user.id == sAuth.twitch.user.id? message.user : message.to;
							if(!this.whispers[to.id]) this.whispers[to.id] = {from, to, messages:[]};
							this.whispers[to.id].messages.push(message);
							this.whispersUnreadCount ++;
							const wsUser = {
								id:message.user.id,
								login:message.user.login,
								displayName:message.user.displayNameOriginal,
							};
							PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_WHISPER, {unreadCount:this.whispersUnreadCount, user:wsUser, message:"<not set for privacy reasons>"});

						}else {

							//Check if it's an "ad" message
							if(!isFromRemoteChan
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
						if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
							let words = [sAuth.twitch.user.login, ...(sParams.appearance.highlightMentions_custom.value as string[] || [])];
							message.hasMention = new RegExp(words.map(word=> "\\b"+word+"\\b").join("|"), "gim")
												.test(message.message ?? "");
						}

						//Custom secret feature hehehe ( ͡~ ͜ʖ ͡°)
						if(ChatCypherPlugin.instance.isCypherCandidate(message.message)) {
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
							if(message.twitch_gigantifiedEmote) {
								const emote = message.message_chunks.findLast(v=>v.type == "emote");
								StoreProxy.labels.updateLabelValue("POWER_UP_GIANTIFIED_ID", message.user.id);
								StoreProxy.labels.updateLabelValue("POWER_UP_GIANTIFIED_NAME", message.user.displayNameOriginal);
								StoreProxy.labels.updateLabelValue("POWER_UP_GIANTIFIED_AVATAR", message.user.avatarPath || "", message.user.id);
								StoreProxy.labels.updateLabelValue("POWER_UP_GIANTIFIED_CODE", emote?.value || "");
								StoreProxy.labels.updateLabelValue("POWER_UP_GIANTIFIED_IMAGE", emote?.emoteHD || "");
							}

							if(message.twitch_animationId) {
								StoreProxy.labels.updateLabelValue("POWER_UP_MESSAGE_ID", message.user.id);
								StoreProxy.labels.updateLabelValue("POWER_UP_MESSAGE_NAME", message.user.displayNameOriginal);
								StoreProxy.labels.updateLabelValue("POWER_UP_MESSAGE_AVATAR", message.user.avatarPath || "", message.user.id);
							}
							//Reset ad schedule if necessary
							if(!isFromRemoteChan) {
								if(/\b(?:https?:\/\/)?twitchat\.fr\b/gi.test(message.message)) {
									SchedulerHelper.instance.resetAdSchedule(message);
								}
								if(!message.user.channelInfo[message.channel_id].is_broadcaster) {
									SchedulerHelper.instance.incrementMessageCount();
								}

								//Detect hate raid.
								if(sParams.features.antiHateRaid.value === true && Date.now() > this.securityRaidGraceEndDate) {
									const key = message.message_chunks.filter(v=>v.type == "text").join("").toLowerCase();
									if(message.twitch_isFirstMessage === true || message.user.channelInfo[message.channel_id].is_new) {
										//It's a first time chatter, log their message
										if(!antiHateRaidCounter[key]) {
											antiHateRaidCounter[key] = {
												date:0,
												messages:[],
												ignore:false,
											};
										}

										//If user isn't already registered to the haters, add them
										if(antiHateRaidCounter[key].messages.findIndex(v=>v.user.id == (message as TwitchatDataTypes.MessageChatData).user.id) == -1) {
											antiHateRaidCounter[key].date = Date.now();
											antiHateRaidCounter[key].messages.push(message);
										}

										//5 users sent the same message, strike them if no other legit user sent the same
										if(antiHateRaidCounter[key].ignore != true && antiHateRaidCounter[key].messages.length == 5) {
											currentHateRaidAlert = reactive({
												id:Utils.getUUID(),
												type:TwitchatDataTypes.TwitchatMessageType.HATE_RAID,
												channel_id:message.channel_id,
												platform:message.platform,
												date:Date.now(),
												haters:antiHateRaidCounter[key].messages.map(v=>v.user),
												terms:[],
											});

											//Ban groups of words to make it a little more bullet proof
											const chunks = message.message_chunks.filter(v=>v.type == "text").map(v=>v.value).join(" ").split(" ");
											let word = "";
											for (let i = 0; i < chunks.length; i++) {
												const w = chunks[i];
												word += " "+w;
												if(word.length > 15) {
													word = word.trim()
													TwitchUtils.addBanword(word).then(result => {
														if(result !== false) {
															currentHateRaidAlert.terms.push({id:result.id, text:result.text});
															if(saveToDB) {
																Database.instance.updateMessage(currentHateRaidAlert);
															}
														}
													});
													word = "";
												}
											}
											//Delete previous messages if requested
											if(sParams.features.antiHateRaidDeleteMessage.value == true){
												antiHateRaidCounter[key].messages.forEach(async v=> {
													if(v.deleted !== true) {
														this.deleteMessage(v);
													}
												});
											}
											//Start emergency mode if requested
											if(sParams.features.antiHateRaidEmergency.value == true){
												sEmergency.setEmergencyMode(true);
											}

											//Reset counter 10s after hate raid detection.
											//We shouldn't get an another wave for this message unless someone
											//removes the blocked terms
											window.setTimeout(()=>{
												delete antiHateRaidCounter[key];
											}, 10000);
											this.addMessage(currentHateRaidAlert);
										}else
										//If anti hate raid is active and new message is received (might happen
										//as adding a banword to twitch takes a few hundred milliseconds)
										if(antiHateRaidCounter[key].ignore != true && antiHateRaidCounter[key].messages.length > 5) {
											//Add user to list
											currentHateRaidAlert.haters.push(message.user);
											Database.instance.updateMessage(currentHateRaidAlert);
											//Delete messages if requested
											if(sParams.features.antiHateRaidDeleteMessage.value == true){
												if(message.deleted !== true) {
													this.deleteMessage(message);
												}
											}
										}

										//Cleanup old cache to free memory
										let expiredSince = Date.now() - 5*60*1000;
										for (const key in antiHateRaidCounter) {
											const element = antiHateRaidCounter[key];
											if(element.date < expiredSince) delete antiHateRaidCounter[key];
										}
									}else if(antiHateRaidCounter[key]) {
										//It's not a first time chatter ignore this message
										antiHateRaidCounter[key].ignore = true;
									}
								}
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
								// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FIRST_ALL_TIME, wsMessage);
							}

							//Handle spoiler command
							if(message.answersTo && await Utils.checkPermissions(this.spoilerParams.permissions, message.user, message.channel_id)) {
								const cmd = message.message.replace(/@[^\s]+\s?/, "").trim().toLowerCase();
								if(cmd.indexOf("!spoiler") === 0) {
									message.answersTo.spoiler = true;
								}
							}

							//Flag as spoiler
							if(message.message.indexOf("||") > -1) message.containsSpoiler = true;

							//check if it's a chat alert command
							if(!isFromRemoteChan
							&& sParams.features.alertMode.value === true
							&& await Utils.checkPermissions(sMain.chatAlertParams.permissions, message.user, message.channel_id)) {
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
								const messages = messageList;
								const timeframe = 5*60*1000;//Check if a massage answers another within this timeframe
								const matches = message.message.match(/@\w+/gi) as RegExpMatchArray;
								for (let i = 0; i < matches.length; i++) {
									const match = matches[i].replace("@", "").toLowerCase();
									// console.log("Search for message from ", match);
									for (let j = messages.length-1; j >= 0; j--) {
										const m = messages[j];
										//Not a user message, ignore it
										if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) continue;
										//If message is too old, stop there
										if(ts - m.date > timeframe) break;
										//Not sent from the mentionned user, ignore it
										if(m.user.login != match && m.user.displayNameOriginal.toLowerCase() != match) continue;

										//If it's the root message of a conversation
										if(m.answers) {
											//Add current message to its answers
											m.answers.push( message );
											message.answersTo = m;

										//If the messages answers to a message itself
										}else if(m.answersTo && m.answersTo.answers) {
											//answering to another message
											m.answersTo.answers.push( message );
											message.answersTo = m.answersTo;

										//If message answers to a message that is not part a conversation
										}else{
											//Create conversation thread
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
					case TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK: {
						if(!isFromRemoteChan) {
							StoreProxy.labels.updateLabelValue("WATCH_STREAK_ID", message.user.id);
							StoreProxy.labels.updateLabelValue("WATCH_STREAK_NAME", message.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("WATCH_STREAK_AVATAR", message.user.avatarPath || "", message.user.id);
							StoreProxy.labels.updateLabelValue("WATCH_STREAK_COUNT", message.streak);
						}
						break;
					}

					//Reward redeem
					case TwitchatDataTypes.TwitchatMessageType.REWARD: {

						//Check if the user can enter a raffle
						if(!isFromRemoteChan) {
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
						if(!isFromRemoteChan) {
							StoreProxy.labels.updateLabelValue("REWARD_ID", message.user.id);
							StoreProxy.labels.updateLabelValue("REWARD_NAME", message.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("REWARD_AVATAR", message.user.avatarPath || "", message.user.id);
							StoreProxy.labels.updateLabelValue("REWARD_ICON", message.reward.icon.hd || message.reward.icon.sd);
							StoreProxy.labels.updateLabelValue("REWARD_TITLE", message.reward.title);
						}
						break;
					}

					//Incomming raid
					case TwitchatDataTypes.TwitchatMessageType.RAID: {
						this.securityRaidGraceEndDate = Date.now() + 5 * 60 * 1000;
						if(!isFromRemoteChan) {
							sStream.lastRaider = message.user;
							StoreProxy.labels.updateLabelValue("RAID_ID", message.user.id);
							StoreProxy.labels.updateLabelValue("RAID_NAME", message.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("RAID_AVATAR", message.user.avatarPath || "", message.user.id);
							StoreProxy.labels.updateLabelValue("RAID_COUNT", message.viewers);
						}
						message.user.channelInfo[message.channel_id].is_raider = true;
						if(sParams.appearance.raidHighlightUser.value
						&& sParams.appearance.raidHighlightUserTrack.value === true) {
							StoreProxy.users.trackUser(message.user);
						}
						window.setTimeout(()=> {
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
						if(!isFromRemoteChan) {
							message = message as TwitchatDataTypes.MessageCheerData;
							StoreProxy.labels.updateLabelValue("CHEER_ID", message.user.id);
							StoreProxy.labels.updateLabelValue("CHEER_NAME", message.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("CHEER_AVATAR", message.user.avatarPath || "", message.user.id);
							StoreProxy.labels.updateLabelValue("CHEER_AMOUNT", message.bits);
						}
						break;
					}

					//New combo cheer
					case TwitchatDataTypes.TwitchatMessageType.TWITCH_COMBO: {
						if(!isFromRemoteChan) {
							message = message as TwitchatDataTypes.MessageTwitchComboData;
							StoreProxy.labels.updateLabelValue("COMBO_ID", message.user.id);
							StoreProxy.labels.updateLabelValue("COMBO_NAME", message.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("COMBO_AVATAR", message.user.avatarPath || "", message.user.id);
							StoreProxy.labels.updateLabelValue("COMBO_AMOUNT", message.bits);
						}
						break;
					}

					//New kofi event
					case TwitchatDataTypes.TwitchatMessageType.KOFI: {
						if(!isFromRemoteChan) {
							message = message as TwitchatDataTypes.MessageKofiData;
							if(message.eventType == "donation") {
								StoreProxy.labels.updateLabelValue("KOFI_TIP_NAME", message.userName);
								StoreProxy.labels.updateLabelValue("KOFI_TIP_AMOUNT", message.amountFormatted);
								sRaffle.checkRaffleJoin(message);
								StoreProxy.customTrain.registerActivity(message.id, "kofi", message.amount);
							}else
							if(message.eventType == "merch") {
								StoreProxy.labels.updateLabelValue("KOFI_MERCH_USER", message.userName);
								StoreProxy.labels.updateLabelValue("KOFI_MERCH_AMOUNT", message.amountFormatted);
								StoreProxy.labels.updateLabelValue("KOFI_MERCH_NAME", message.products[0].name || "");
								StoreProxy.customTrain.registerActivity(message.id, "kofi", message.amount);
							}
						}
						break;
					}

					//New Streamelements event
					case TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS: {
						if(!isFromRemoteChan) {
							message = message as TwitchatDataTypes.MessageStreamelementsData;
							if(message.eventType == "donation") {
								StoreProxy.labels.updateLabelValue("STREAMELEMENTS_TIP_NAME", message.userName);
								StoreProxy.labels.updateLabelValue("STREAMELEMENTS_TIP_AMOUNT", message.amountFormatted);
								sRaffle.checkRaffleJoin(message);
								StoreProxy.customTrain.registerActivity(message.id, "streamelements", message.amount);
							}
						}
						break;
					}

					//New Streamlabs event
					case TwitchatDataTypes.TwitchatMessageType.STREAMLABS: {
						if(!isFromRemoteChan) {
							message = message as TwitchatDataTypes.MessageStreamlabsData;
							if(message.eventType == "donation") {
								StoreProxy.labels.updateLabelValue("STREAMLABS_TIP_NAME", message.userName);
								StoreProxy.labels.updateLabelValue("STREAMLABS_TIP_AMOUNT", message.amountFormatted);
								sRaffle.checkRaffleJoin(message);
								StoreProxy.customTrain.registerActivity(message.id, "streamlabs", message.amount);
							}else
							if(message.eventType == "merch") {
								StoreProxy.labels.updateLabelValue("STREAMLABS_MERCH_USER", message.userName);
								StoreProxy.labels.updateLabelValue("STREAMLABS_MERCH_NAME", message.product);
							}else
							if(message.eventType == "charity") {
								StoreProxy.labels.incrementLabelValue("STREAMLABS_CHARITY_RAISED", message.amount);
								StoreProxy.labels.updateLabelValue("STREAMLABS_CHARITY_LAST_TIP_AMOUNT", message.amount);
								StoreProxy.labels.updateLabelValue("STREAMLABS_CHARITY_LAST_TIP_USER", message.userName);
								StoreProxy.donationGoals.onDonation(message.userName, message.amount.toString(), "streamlabs_charity");
								StoreProxy.donationGoals.onSourceValueUpdate("streamlabs_charity", message.campaign.id);
								sRaffle.checkRaffleJoin(message);
								StoreProxy.customTrain.registerActivity(message.id, "streamlabs_charity", message.amount);
							}
						}
						break;
					}

					//New Tipeee event
					case TwitchatDataTypes.TwitchatMessageType.TIPEEE: {
						if(!isFromRemoteChan) {
							message = message as TwitchatDataTypes.MessageTipeeeDonationData;
							if(message.eventType == "donation") {
								StoreProxy.labels.updateLabelValue("TIPEEE_TIP_NAME", message.userName);
								StoreProxy.labels.updateLabelValue("TIPEEE_TIP_AMOUNT", message.amountFormatted);
								sRaffle.checkRaffleJoin(message);
								StoreProxy.customTrain.registerActivity(message.id, "tipeee", message.amount);
							}
						}
						break;
					}

					//New Tipeee event
					case TwitchatDataTypes.TwitchatMessageType.TWITCH_CHARITY_DONATION: {
						if(!isFromRemoteChan) {
							message = message as TwitchatDataTypes.MessageCharityDonationData;
							StoreProxy.labels.updateLabelValue("TWITCH_CHARITY_LAST_TIP_USER", message.user.displayName);
							StoreProxy.labels.updateLabelValue("TWITCH_CHARITY_LAST_TIP_AVATAR", message.user.avatarPath || "", message.user.id);
							StoreProxy.labels.updateLabelValue("TWITCH_CHARITY_LAST_TIP_AMOUNT", message.amountFormatted);
							sRaffle.checkRaffleJoin(message);
							StoreProxy.donationGoals.onDonation(message.user.displayNameOriginal, message.amount.toString(), "twitch_charity");
							StoreProxy.customTrain.registerActivity(message.id, "twitch_charity", message.amount);
						}
						break;
					}

					//New YouTube sub
					case TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBSCRIPTION: {
						if(!isFromRemoteChan) {
							StoreProxy.labels.updateLabelValue("SUB_YOUTUBE_ID", message.user.id);
							StoreProxy.labels.updateLabelValue("SUB_YOUTUBE_NAME", message.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("SUB_YOUTUBE_AVATAR", message.user.avatarPath || "");
							StoreProxy.labels.updateLabelValue("SUB_YOUTUBE_TIER", message.levelName);
							StoreProxy.labels.updateLabelValue("SUB_GENERIC_NAME", message.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("SUB_GENERIC_AVATAR", message.user.avatarPath || "");
							StoreProxy.labels.updateLabelValue("SUB_GENERIC_TIER", message.levelName);
						}
						break;
					}

					//New superchat
					case TwitchatDataTypes.TwitchatMessageType.SUPER_CHAT: {
						if(!isFromRemoteChan) {
							StoreProxy.labels.updateLabelValue("SUPER_CHAT_ID", message.user.id);
							StoreProxy.labels.updateLabelValue("SUPER_CHAT_NAME", message.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("SUPER_CHAT_AVATAR", message.user.avatarPath || "");
							StoreProxy.labels.updateLabelValue("SUPER_CHAT_AMOUNT", message.amountDisplay);
						}
						break;
					}

					//New patreon member
					case TwitchatDataTypes.TwitchatMessageType.PATREON: {
						StoreProxy.labels.updateLabelValue("PATREON_USER", message.user.username);
						StoreProxy.labels.updateLabelValue("PATREON_AVATAR", message.user.avatar);
						StoreProxy.labels.updateLabelValue("PATREON_TITLE", message.tier.title);
						StoreProxy.labels.updateLabelValue("PATREON_AMOUNT", message.tier.amount);
						StoreProxy.customTrain.registerActivity(message.id, "patreon", message.tier.amount);
						break;
					}

					//New donation on Tiltify
					case TwitchatDataTypes.TwitchatMessageType.TILTIFY: {
						StoreProxy.labels.updateLabelValue("TILTIFY_LAST_TIP_USER", message.userName);
						StoreProxy.labels.updateLabelValue("TILTIFY_LAST_TIP_AMOUNT", message.amount);
						StoreProxy.customTrain.registerActivity(message.id, "tiltify", message.amount);
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
						//If it's a subgift, merge it with potential previous ones
						if(message.is_gift && message.gift_recipients) {
							// Attempt to merge subgift messages
							for (let i = subgiftHistory.length-1; i >= 0; i--) {
								const subgiftHistoryEntry = subgiftHistory[i];
								let baseLog = {
									uid_ref:subgiftHistoryEntry.user.id,
									uid_new:message.user.id,
									tier_ref:subgiftHistoryEntry.tier,
									tier_new:message.tier,
									date_ref:subgiftHistoryEntry.date,
									date_new:message.date,
									elapsed:Math.abs(message.date - subgiftHistoryEntry.date),
								}
								// Skip if the messages are from different channels
								if(message.channel_id != subgiftHistoryEntry.channel_id) {
									if(subgiftHistoryEntry.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION) {
										Logger.instance.log("subgifts", {
											id:message.id,
											merged:false,
											reason:"different_channel",
											data:{
												...baseLog,
												isGift1:message.is_gift,
												isGift2:subgiftHistoryEntry.is_gift,
												ischannelID1:message.channel_id,
												ischannelID2:subgiftHistoryEntry.channel_id,
												recipients1:JSON.parse(JSON.stringify(message.gift_recipients.map(v=>{return {uid:v.id, login:v.login}}))),
												recipients2:JSON.parse(JSON.stringify((subgiftHistoryEntry.gift_recipients || []).map(v=>{return {uid:v.id, login:v.login}}))),
											}
										});
									}
									continue;
								}
								// Skip if the messages are of different tiers
								if(subgiftHistoryEntry.tier != message.tier) {
									Logger.instance.log("subgifts", {
										id:message.id,
										merged:false,
										reason:"different_tier",
										data:{
											...baseLog,
											tier1: subgiftHistoryEntry.tier,
											tier2: message.tier,
										}
									});
									continue;
								}
								// Skip if the messages are from different users
								if(subgiftHistoryEntry.user.id != message.user.id) {
									Logger.instance.log("subgifts", {
										id:message.id,
										merged:false,
										reason:"different_user",
										data:{
											...baseLog,
											tier1: subgiftHistoryEntry.user.id,
											tier2: message.user.id,
										}
									});
									continue;
								}
								// Skip if the messages are too old (more than 10 seconds apart)
								if(Math.abs(message.date - subgiftHistoryEntry.date) >= 10000) {
									Logger.instance.log("subgifts", {
										id:message.id,
										merged:false,
										reason:"too_old",
										data:{
											...baseLog,
											timeframe: Math.abs(message.date - subgiftHistoryEntry.date),
										}
									});
									continue;
								}

								// Merge subgift messages if they are from the same user, same tier, same channel, and within 10 seconds
								if(!subgiftHistoryEntry.gift_recipients) subgiftHistoryEntry.gift_recipients = [];//Init recipent list if necessary
								subgiftHistoryEntry.date = Math.max(subgiftHistoryEntry.date, message.date); // Keep latest timestamp
								subgiftHistoryEntry.gift_recipients.push(...message.gift_recipients);//Merge recipients
								subgiftHistoryEntry.gift_count = subgiftHistoryEntry.gift_recipients.length;//Increment count
								if(!isFromRemoteChan) {
									// DO NOT INCREMENT "SUB_COUNT" AND "SUB_POINTS" HERE!
									// It is done later once gift bomb completes
									StoreProxy.labels.updateLabelValue("SUBGIFT_COUNT", subgiftHistoryEntry.gift_count);
									StoreProxy.labels.updateLabelValue("SUBGIFT_GENERIC_COUNT", subgiftHistoryEntry.gift_count);
								}
								Logger.instance.log("subgifts", {
									id:message.id,
									merged:true,
									data:{
										...baseLog,
										parent: subgiftHistoryEntry.id,
									}
								});
								return;
							}
							//Message not merged, might be the first subgift of a series, save it
							//for future subgift events
							subgiftHistory.push(message);
						}else if(!isFromRemoteChan){
							// If it's a regular sub, update labels and donation goals
							StoreProxy.labels.updateLabelValue("SUB_ID", message.user.id);
							StoreProxy.labels.updateLabelValue("SUB_NAME", message.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("SUB_AVATAR", message.user.avatarPath || "", message.user.id);
							StoreProxy.labels.updateLabelValue("SUB_TIER", message.tier);

							StoreProxy.labels.updateLabelValue("SUB_GENERIC_ID", message.user.id);
							StoreProxy.labels.updateLabelValue("SUB_GENERIC_NAME", message.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("SUB_GENERIC_AVATAR", message.user.avatarPath || "", message.user.id);
							StoreProxy.labels.updateLabelValue("SUB_GENERIC_TIER", message.tier);

							StoreProxy.labels.incrementLabelValue("SUB_COUNT", 1);
							StoreProxy.labels.incrementLabelValue("SUB_POINTS", {prime:1, 1:2, 2:3, 3:6}[message.tier]);
							StoreProxy.donationGoals.onSourceValueUpdate("twitch_subs");
							const tierLabel = {prime:"prime", 1:"tier 1", 2:"tier 2", 3:"tier 3"}[message.tier];
							StoreProxy.donationGoals.onDonation(message.user.displayNameOriginal, tierLabel, "twitch_subs");
						}
						break;
					}

					//Users joined, check if any need to be autobanned
					case TwitchatDataTypes.TwitchatMessageType.JOIN: {
						if(!isFromRemoteChan) {
							for (let i = 0; i < message.users.length; i++) {
								const user = message.users[i];
								const rule = sAutomod.isMessageAutomoded(user.displayNameOriginal, user, message.channel_id);
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
						}
						break;
					}

					//New follower
					case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
						sUsers.flagAsFollower(message.user, message.channel_id);
						if(!isFromRemoteChan) {
							StoreProxy.labels.updateLabelValue("FOLLOWER_GENERIC_ID", message.user.id);
							StoreProxy.labels.updateLabelValue("FOLLOWER_GENERIC_NAME", message.user.displayNameOriginal);
							StoreProxy.labels.updateLabelValue("FOLLOWER_GENERIC_AVATAR", message.user.avatarPath || "", message.user.id);
							if(message.platform === "twitch") {
								StoreProxy.labels.updateLabelValue("FOLLOWER_ID", message.user.id);
								StoreProxy.labels.updateLabelValue("FOLLOWER_NAME", message.user.displayNameOriginal);
								StoreProxy.labels.updateLabelValue("FOLLOWER_AVATAR", message.user.avatarPath || "", message.user.id);
								StoreProxy.labels.incrementLabelValue("FOLLOWER_COUNT", 1);
								StoreProxy.donationGoals.onSourceValueUpdate("twitch_followers");
								StoreProxy.donationGoals.onDonation(message.user.displayNameOriginal, "1", "twitch_followers");
							}else
							if(message.platform === "tiktok") {
								StoreProxy.labels.updateLabelValue("TIKTOK_FOLLOWER_USER", message.user.displayNameOriginal);
								StoreProxy.labels.updateLabelValue("TIKTOK_FOLLOWER_AVATAR", message.user.avatarPath || "");
							}else
							if(message.platform === "youtube") {
								StoreProxy.labels.updateLabelValue("FOLLOWER_YOUTUBE_USER", message.user.displayNameOriginal);
								StoreProxy.labels.updateLabelValue("FOLLOWER_YOUTUBE_AVATAR", message.user.avatarPath || "");
							}
						}

						//Merge all followbot events into one
						if(message.followbot === true && !isFromRemoteChan) {
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

					//Twitch celebration
					case TwitchatDataTypes.TwitchatMessageType.TWITCH_CELEBRATION: {
						StoreProxy.labels.updateLabelValue("POWER_UP_CELEBRATION_ID", message.user.id);
						StoreProxy.labels.updateLabelValue("POWER_UP_CELEBRATION_NAME", message.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("POWER_UP_CELEBRATION_AVATAR", message.user.avatarPath || "", message.user.id);
						StoreProxy.labels.updateLabelValue("POWER_UP_CELEBRATION_CODE", message.emoteID);
						StoreProxy.labels.updateLabelValue("POWER_UP_CELEBRATION_IMAGE", "https://static-cdn.jtvnw.net/emoticons/v2/" + message.emoteID + "/default/light/3.0");
						break;
					}

					//YouTube Superchat
					case TwitchatDataTypes.TwitchatMessageType.SUPER_CHAT: {
						StoreProxy.labels.updateLabelValue("SUPER_CHAT_ID", message.user.id);
						StoreProxy.labels.updateLabelValue("SUPER_CHAT_NAME", message.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("SUPER_CHAT_AVATAR", message.user.avatarPath || "");
						StoreProxy.labels.updateLabelValue("SUPER_CHAT_AMOUNT", message.amountDisplay);
						break;
					}

					//YouTube Super sticker
					case TwitchatDataTypes.TwitchatMessageType.SUPER_STICKER: {
						StoreProxy.labels.updateLabelValue("SUPER_STICKER_ID", message.user.id);
						StoreProxy.labels.updateLabelValue("SUPER_STICKER_NAME", message.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("SUPER_STICKER_AVATAR", message.user.avatarPath || "");
						StoreProxy.labels.updateLabelValue("SUPER_STICKER_AMOUNT", message.amountDisplay);
						StoreProxy.labels.updateLabelValue("SUPER_STICKER_IMAGE", message.sticker_url);
						break;
					}

					//TikTok gift
					case TwitchatDataTypes.TwitchatMessageType.TIKTOK_GIFT: {
						StoreProxy.labels.updateLabelValue("TIKTOK_GIFT_USER", message.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("TIKTOK_GIFT_AVATAR", message.user.avatarPath || "");
						StoreProxy.labels.updateLabelValue("TIKTOK_GIFT_IMAGE", message.image);
						StoreProxy.labels.updateLabelValue("TIKTOK_GIFT_COUNT", message.count);
						StoreProxy.labels.updateLabelValue("TIKTOK_GIFT_DIAMONDS", message.diamonds);
						break;
					}

					//TikTok sub
					case TwitchatDataTypes.TwitchatMessageType.TIKTOK_SUB: {
						StoreProxy.labels.updateLabelValue("TIKTOK_SUB_USER", message.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("TIKTOK_SUB_AVATAR", message.user.avatarPath || "");
						break;
					}

					//TikTok Share
					case TwitchatDataTypes.TwitchatMessageType.TIKTOK_SHARE: {
						StoreProxy.labels.updateLabelValue("TIKTOK_SHARE_USER", message.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("TIKTOK_SHARE_AVATAR", message.user.avatarPath || "");
						break;
					}

					//TikTok like
					case TwitchatDataTypes.TwitchatMessageType.TIKTOK_LIKE: {
						StoreProxy.labels.updateLabelValue("TIKTOK_LIKE_USER", message.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("TIKTOK_LIKE_AVATAR", message.user.avatarPath || "");
						StoreProxy.labels.updateLabelValue("TIKTOK_LIKE_TOTAL", message.streamLikeCount);
						StoreProxy.labels.updateLabelValue("TIKTOK_LIKE_COUNT", message.count);
						break;
					}
				}

				if(logTimings) console.log("2", message.id, Date.now() - s);

				// If it's a message, check if it's a command
				if(TwitchatDataTypes.IsTranslatableMessage[message.type] && !isFromRemoteChan) {
					const typedMessage = message as TwitchatDataTypes.TranslatableMessage;
					const cmd = (typedMessage.message || "").trim().split(" ")[0].toLowerCase();

					//If a raffle is in progress, check if the user can enter
					sRaffle.checkRaffleJoin(typedMessage as TwitchatDataTypes.ChatMessageTypes);

					//If there's a suggestion poll and the timer isn't over
					const suggestionPoll = sChatSuggestion.data;
					if(suggestionPoll && cmd == suggestionPoll.command.toLowerCase().trim()) {
						sChatSuggestion.addChatSuggestion(typedMessage);
					}

					//Check if it's the winning choice of a bingo
					sBingo.checkBingoWinner(typedMessage);

					//Handle OBS commands
					sOBS.handleChatCommand(typedMessage, cmd);

					//Handle Emergency commands
					sEmergency.handleChatCommand(typedMessage, cmd);

					//Handle Q&A commands
					sQna.handleChatCommand(typedMessage, cmd);

					//Handle Voicemod commands
					sVoice.handleChatCommand(typedMessage, cmd);

					//Handle bingo grid commands
					sBingoGrid.handleChatCommand(typedMessage, cmd);

					//Handle chat poll commands
					sChatPoll.handleChatCommand(typedMessage, cmd);
				}

				if(logTimings) console.log("3", message.id, Date.now() - s);

				//Apply automod rules if requested
				if(sAutomod.params.enabled === true && !isFromRemoteChan) {
					if( message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
					|| message.type == TwitchatDataTypes.TwitchatMessageType.CHEER
					|| message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION
					|| message.type == TwitchatDataTypes.TwitchatMessageType.REWARD
					|| message.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING
					|| message.type == TwitchatDataTypes.TwitchatMessageType.RAID) {
						if(sAutomod.params.banUserNames === true && !message.user.channelInfo[message.channel_id].is_banned) {
							//Check if nickname passes the automod
							const rule = sAutomod.isMessageAutomoded(message.user.displayNameOriginal, message.user, message.channel_id);
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
							const rule = sAutomod.isMessageAutomoded(message.message, message.user, message.channel_id);
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
				if(logTimings) console.log("4", message.id, Date.now() - s);
			}catch(error) {
				console.error("Error processing message", message);
				console.error(error);
			}

			//Only save messages to history if requested
			if(TwitchatDataTypes.DisplayableMessageTypes[message.type] === true) {
				messageList.push( message );
				if(saveToDB && StoreProxy.params.features.saveHistory.value === true && message.fake !== true) {
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

			if((message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION && message.is_gift)
			|| message.type == TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBGIFT) {
				//If it's a subgift, wait a little before proceeding as subgifts do not
				//come all at once but sequentially.
				//We wait a second and check if the count changed, if nothing changed after a second
				//consider that everything arrived and proceed
				let recipientCount = -1;
				while(recipientCount != message.gift_recipients!.length){
					recipientCount = message.gift_recipients!.length;
					await Utils.promisedTimeout(1000);
				}
				if(!isFromRemoteChan) {
					if(message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION) {
						StoreProxy.labels.updateLabelValue("SUBGIFT_ID", message.user.id);
						StoreProxy.labels.updateLabelValue("SUBGIFT_NAME", message.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("SUBGIFT_AVATAR", message.user.avatarPath || "", message.user.id);
						StoreProxy.labels.updateLabelValue("SUBGIFT_TIER", message.tier);

						StoreProxy.labels.updateLabelValue("SUBGIFT_GENERIC_TIER", message.tier);
						StoreProxy.labels.updateLabelValue("SUB_GENERIC_TIER", message.tier);

						StoreProxy.labels.incrementLabelValue("SUB_COUNT", message.gift_count || 1);
						StoreProxy.labels.incrementLabelValue("SUB_POINTS", {prime:1, 1:2, 2:3, 3:6}[message.tier] * (message.gift_count || 1));
						StoreProxy.labels.updateLabelValue("SUBGIFT_COUNT", message.gift_count || 1);

						StoreProxy.donationGoals.onSourceValueUpdate("twitch_subs");
						const tierLabel = {prime:"prime", 1:"tier 1", 2:"tier 2", 3:"tier 3"}[message.tier];
						StoreProxy.donationGoals.onDonation(message.user.displayNameOriginal, message.gift_count+" "+tierLabel, "twitch_subs");
					}else{
						StoreProxy.labels.updateLabelValue("SUBGIFT_YOUTUBE_ID", message.user.id);
						StoreProxy.labels.updateLabelValue("SUBGIFT_YOUTUBE_NAME", message.user.displayNameOriginal);
						StoreProxy.labels.updateLabelValue("SUBGIFT_YOUTUBE_AVATAR", message.user.avatarPath || "");
						StoreProxy.labels.updateLabelValue("SUBGIFT_YOUTUBE_TIER", message.levelName);
						StoreProxy.labels.updateLabelValue("SUBGIFT_YOUTUBE_COUNT", message.gift_count || 1);

						StoreProxy.labels.updateLabelValue("SUBGIFT_GENERIC_TIER", message.levelName);
						StoreProxy.labels.updateLabelValue("SUB_GENERIC_TIER", message.levelName);
					}

					StoreProxy.labels.updateLabelValue("SUBGIFT_GENERIC_ID", message.user.id);
					StoreProxy.labels.updateLabelValue("SUBGIFT_GENERIC_NAME", message.user.displayNameOriginal);
					StoreProxy.labels.updateLabelValue("SUBGIFT_GENERIC_AVATAR", message.user.avatarPath || "", message.user.id);

					StoreProxy.labels.updateLabelValue("SUB_GENERIC_ID", message.user.id);
					StoreProxy.labels.updateLabelValue("SUB_GENERIC_NAME", message.user.displayNameOriginal);
					StoreProxy.labels.updateLabelValue("SUB_GENERIC_AVATAR", message.user.avatarPath || "", message.user.id);

					StoreProxy.labels.updateLabelValue("SUBGIFT_GENERIC_COUNT", message.gift_count || 1);
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
			if(!isFromRemoteChan || StoreProxy.tts.params.allRemoteChans != false) {
				TTSUtils.instance.addMessageToQueue(message);
			}
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
			if(message.fake) {
				message.deleted = true;
				return;
			}
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
					StoreProxy.qna.onDeleteMessage(message.id);
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
					window.setTimeout(()=> {
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
					StoreProxy.qna.onDeleteMessage(m.id);
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
					window.setTimeout(()=> {
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

		openWhisperWithUser(user:TwitchatDataTypes.TwitchatUser):void {
			if(!TwitchUtils.requestScopes([TwitchScopes.WHISPER_MANAGE])) return;

			const from = StoreProxy.auth.twitch.user;
			StoreProxy.chat.whispers[user.id] = {to:user, from, messages:[]};
			StoreProxy.params.openModal("whispers", true);
		},

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
			if(message
			&& message.user.id
			&& this.highlightedMessageId != message.id) {
				if(message.platform == "twitch"
				&& (!message.user.displayName || !message.user.avatarPath || !message.user.login)) {
					//Get user info
					const [twitchUser] = await TwitchUtils.getUserInfo([message.user.id]);
					message.user.avatarPath = twitchUser.profile_image_url;
					//Populate more info just in case some are missing
					message.user.login = twitchUser.login;
					message.user.displayNameOriginal = twitchUser.display_name;
				}

				const info:TwitchatDataTypes.ChatHighlightInfo = {
					date:message.date,
					message:message.message_html || message.message || "",
					message_id:message.id,
					user:message.user,
					params:this.chatHighlightOverlayParams,
					dateLabel:StoreProxy.i18n.tm("global.date_ago"),
					skin: Config.instance.GET_CURRENT_AUTO_SKIN_CONFIG()?.skin || "default",
				};
				this.highlightedMessageId = message.id;

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
				this.highlightedMessageId = null;
				PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE);
				TriggerActionHandler.instance.execute({
					type:TwitchatDataTypes.TwitchatMessageType.CHAT_HIGHLIGHT_CLOSE,
					channel_id: StoreProxy.auth.twitch.user.id,
					date: Date.now(),
					id: Utils.getUUID(),
					platform: "twitchat",
				});
			}

		},

		async flagSuspiciousMessage(messageId:string, flaggedChans:string[], retryCount?:number):Promise<void> {
			for (let i = 0; i < messageList.length; i++) {
				const message = messageList[i];
				if(message.id == messageId && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
					if(flaggedChans?.length > 0) {
						const users = await TwitchUtils.getUserInfo(flaggedChans);
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
				window.setTimeout(()=>{
					this.flagSuspiciousMessage(messageId, flaggedChans, retryCount);
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

		async automodAction(accept:boolean, message:TwitchatDataTypes.ChatMessageTypes):Promise<void> {
			let success = await TwitchUtils.automodAction(accept, message.id);
			if(!success) {
				StoreProxy.common.alert(StoreProxy.i18n.t("error.mod_message"));
			}else {
				//Delete the message.
				//If the message was allowed, twitch will send it back, no need to keep it.
				this.deleteMessage(message);
			}
		},

		async flagAsSpoiler(message:TwitchatDataTypes.MessageChatData):Promise<void>{
			message.spoiler = true;

			if(message.channel_id != StoreProxy.auth.twitch.user.id) {
				//If remotely moderating session, tell the broadcaster the message must be
				//added to the list
				ApiHelper.call("mod/spoil/message", "PUT", {
					ownerId:message.channel_id,
					messageId:message.id,
				}).catch(error=>{
					StoreProxy.common.alert(StoreProxy.i18n.t("error.spoil_action"));
				})
			}
		},

		addPrivateModMessage(
		from:TwitchatDataTypes.TwitchatUser,
		message_chunks:TwitchatDataTypes.ParseMessageChunk[],
		action:TwitchatDataTypes.MessagePrivateModeratorData["action"],
		message_id:string,
		message_parent_id?:string,
		message_parent_ref?:TwitchatDataTypes.MessageChatData,
		message_parent_fallback?:TwitchatDataTypes.MessagePrivateModeratorData["parentMessageFallback"]):TwitchatDataTypes.MessagePrivateModeratorData {
			const channel_id = StoreProxy.auth.twitch.user.id;
			const message:TwitchatDataTypes.MessagePrivateModeratorData = {
				channel_id,
				platform:"twitch",
				date:Date.now(),
				id:message_id || Utils.getUUID(),
				type:TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE,
				message: message_chunks.map(v=>v.value).join(" "),
				message_chunks,
				message_html:TwitchUtils.messageChunksToHTML(message_chunks),
				parentMessageFallback: message_parent_fallback,
				action: action,
				user: from,
				toChannelId: StoreProxy.stream.currentChatChannel.id
			};

			if(message_parent_ref) {
				message.parentMessage = message_parent_ref;
			}else
			if(message_parent_id) {
				for (let i = messageList.length-1; i >= Math.max(0, messageList.length - 1000); i--) {
					const mess = messageList[i];
					if(mess.id == message_parent_id && TwitchatDataTypes.IsTranslatableMessage[mess.type]) {
						message.parentMessage = mess as TwitchatDataTypes.TranslatableMessage;
						break;
					}
				}
			}
			this.addMessage(message);
			return message
		},

	} as IChatActions
	& ThisType<IChatActions
		& UnwrapRef<IChatState>
		& _StoreWithState<"chat", IChatState, IChatGetters, IChatActions>
		& _StoreWithGetters<IChatGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeChat, import.meta.hot))
}
