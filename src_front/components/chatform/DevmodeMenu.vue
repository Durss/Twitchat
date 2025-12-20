<template>
	<div class="devmodemenu blured-background-window">
		<h1>Developer panel</h1>
		<div class="list">
			<!-- <Button small title="Commercial" @click="simulateEvent($event, 'commercial')" icon="coin" /> -->
			<!-- <Button small @click="simulateEvent($event, 'ad_break_start')" icon="ad">Commercial break</Button>
			<Button small @click="simulateEvent($event, 'ad_break_approaching')" icon="ad">Commercial approach</Button> -->
			<Button small @click="simulateCommercialSequence()" icon="ad">Commercial sequence</Button>
			<Button small @click="simulateCustomMessage()" icon="edit">Custom message</Button>
			<Button small @click="simulateEvent($event, 'many_replies')" icon="reply">Many replies</Button>
			<Button small @click="simulateEvent($event, 'message', 'clip')" icon="clip">Clip link</Button>
			<Button small @click="simulateEvent($event, 'clip_pending_publication')" icon="clip">Clip creation</Button>
			<Button small @click="simulateEvent($event, 'twitchat_ad', 'discord')" icon="whispers">Discord</Button>
			<Button small @click="simulateEvent($event, 'twitchat_ad', 'ad')" icon="whispers">Twitchat ad</Button>
			<Button small @click="simulateEvent($event, 'twitchat_ad', 'ad_warn')" icon="whispers">Twitchat Ad warn</Button>
			<Button small @click="simulateEvent($event, 'twitchat_ad', 'donor_public_prompt')" icon="whispers">Donor prompt</Button>
			<Button small @click="simulateEvent($event, 'twitchat_ad', 'update_reminder')" icon="whispers">Update reminder</Button>
			<Button small @click="simulateEvent($event, 'twitchat_ad', 'ad_break_api')" icon="whispers">Ad break scopes</Button>
			<Button small @click="$store.chat.sendRightClickHint()" icon="whispers">Right click hint</Button>
			<Button small @click="simulateEvent($event, 'join')" icon="enter">Join</Button>
			<Button small @click="simulateEvent($event, 'leave')" icon="leave">Leave</Button>
			<Button small @click="simulateEvent($event, 'ban')" icon="ban">Ban</Button>
			<Button small @click="simulateEvent($event, 'youtube_ban')" icon="ban">Ban Youtube</Button>
			<Button small @click="simulateEvent($event, 'unban')" icon="unban">Unban</Button>
			<Button small @click="simulateEvent($event, 'warn_chatter')" icon="alert">Warn chatter</Button>
			<Button small @click="simulateEvent($event, 'warn_acknowledge')" icon="alert">Warn acknowledgement</Button>
			<Button small @click="simulateEvent($event, 'unban_request')" icon="unbanRequest">Unban Request</Button>
			<Button small @click="simulateEvent($event, 'unban_request', 'unban_request_solve')" icon="unbanRequest">Unban Request solve</Button>
			<Button small @click="simulateEvent($event, 'message', 'first')" icon="firstTime">First message</Button>
			<!-- <Button small @click="simulateEvent($event, 'message', 'hypeChat')" icon="hypeChat">Hype chat message</Button> -->
			<Button small @click="simulateEvent($event, 'message', 'returning')" icon="returning">Returning user</Button>
			<Button small @click="simulateEvent($event, 'message', 'presentation')" icon="firstTime">Presentation</Button>
			<Button small @click="simulateEvent($event, 'message', 'recent')" icon="alert">Recent account</Button>
			<Button small @click="simulateEvent($event, 'message', 'skin1')" icon="watchStreak">Power Up skin 1</Button>
			<Button small @click="simulateEvent($event, 'message', 'skin2')" icon="watchStreak">Power Up skin 2</Button>
			<Button small @click="simulateEvent($event, 'message', 'skin3')" icon="watchStreak">Power Up skin 3</Button>
			<Button small @click="simulateEvent($event, 'gigantified_emote')" icon="watchStreak">Power Up Giant emote</Button>
			<Button small @click="simulateEvent($event, 'twitch_celebration')" icon="watchStreak">Power Up celebration</Button>
			<Button small @click="simulateEvent($event, 'twitch_combo')" icon="bits">Combo</Button>
			<Button small @click="simulateComboSpam()" icon="bits">Combo spam</Button>
			<Button small @click="simulateEvent($event, 'user_watch_streak')" icon="watchStreak">Watch streak</Button>
			<Button small @click="simulateEvent($event, 'raid', 'raidOffline')" icon="raid">Incoming raid offline</Button>
			<Button small @click="simulateEvent($event, 'raid', 'raidOnline')" icon="raid">Incoming raid online</Button>
			<Button small @click="startFakeRaid()" icon="raid">Outgoing raid</Button>
			<Button small @click="simulateEvent($event, 'cheer')" icon="bits">Bits</Button>
			<Button small @click="simulateEvent($event, 'cheer', 'no_message')" icon="bits">Bits (no mess)</Button>
			<Button small @click="simulateEvent($event, 'cheer', 'cheer_pin')" icon="bits">Pinned cheer</Button>
			<!-- <Button small @click="simulateEvent($event, 'hype_chat')" icon="hypeChat">Hype chat</Button> -->
			<Button small @click="simulateEvent($event, 'subscription', 'sub')" icon="sub">Sub</Button>
			<Button small @click="simulateEvent($event, 'subscription', 'resub')" icon="sub">ReSub</Button>
			<Button small @click="simulateEvent($event, 'subscription', 'gift')" icon="gift">Subgifts</Button>
			<Button small @click="simulateMultichanGifts()" icon="gift">Subgifts multichan</Button>
			<Button small @click="simulateEvent($event, 'subscription', 'giftpaidupgrade')" icon="gift">Subgift upgrade</Button>
			<Button small @click="simulateSubgiftSpam()" icon="gift">Subgift spam</Button>
			<Button small @click="simulateEvent($event, 'message', 'youtube')" icon="youtube">Youtube message</Button>
			<Button small @click="simulateEvent($event, 'following', 'youtube')" icon="youtube">Youtube follow</Button>
			<Button small @click="simulateEvent($event, 'super_chat')" icon="youtube">Youtube Super chat</Button>
			<Button small @click="simulateEvent($event, 'super_sticker')" icon="youtube">Youtube Super sticker</Button>
			<Button small @click="simulateEvent($event, 'youtube_subscription')" icon="youtube">Youtube Sub</Button>
			<Button small @click="simulateEvent($event, 'youtube_subgift')" icon="youtube">Youtube Subgift</Button>
			<Button small @click="simulateEvent($event, 'message', 'tiktok')" icon="tiktok">TikTok message</Button>
			<Button small @click="simulateEvent($event, 'tiktok_sub')" icon="tiktok">TikTok Sub</Button>
			<Button small @click="simulateEvent($event, 'tiktok_gift')" icon="tiktok">TikTok Gift</Button>
			<Button small @click="simulateEvent($event, 'tiktok_like')" icon="tiktok">TikTok Like</Button>
			<Button small @click="simulateEvent($event, 'tiktok_share')" icon="tiktok">TikTok Share</Button>
			<Button small @click="simulateEvent($event, 'following', 'tiktok')" icon="tiktok">TikTok Follow</Button>
			<Button small @click="simulateEvent($event, 'following')" icon="follow">Follow</Button>
			<Button small @click="simulateEvent($event, 'reward')" icon="channelPoints">Reward redeem</Button>
			<Button small @click="simulateEvent($event, 'community_challenge_contribution')" icon="channelPoints">Challenge contribution</Button>
			<Button small @click="simulateHypeTrain('regular')" icon="train">Hype train</Button>
			<Button small @click="simulateHypeTrain('golden_kappa')" icon="train">Golden kappa train</Button>
			<Button small @click="simulateHypeTrain('treasure')" icon="train">Treasure train</Button>
			<Button small @click="simulateEvent($event, 'hype_train_cooled_down')" icon="train">Hype train cooldown</Button>
			<Button small @click="simulateEvent($event, 'hype_train_summary')" icon="train">Hype train summary</Button>
			<Button small @click="simulateAutomod()" icon="automod">Automod Twitch</Button>
			<Button small @click="simulateAutomodTwitchat()" icon="automod">Automod Twitchat</Button>
			<Button small @click="simulateEvent($event, 'autoban_join')" icon="automod">Automod Twitchat join</Button>
			<Button small @click="simulateEvent($event, 'poll')" icon="poll">Poll result</Button>
			<Button small @click="simulateEvent($event, 'prediction')" icon="prediction">Prediction result</Button>
			<Button small @click="simulateEvent($event, 'chat_poll')" icon="chatPoll">Chat poll result</Button>
			<Button small @click="simulateEvent($event, 'bingo')" icon="bingo">Bingo result</Button>
			<Button small @click="simulateEvent($event, 'raffle')" icon="ticket">Raffle result</Button>
			<Button small @click="simulateEvent($event, 'countdown')" icon="timer">Countdown result</Button>
			<Button small @click="simulateEvent($event, 'pinned')" icon="pin">Pin message</Button>
			<Button small @click="simulateEvent($event, 'unpinned')" icon="unpin">Upin message</Button>
			<Button small @click="simulateEvent($event, 'clear_chat')" icon="delete">Clear chat</Button>
			<Button small @click="simulateEvent($event, 'twitch_charity_donation')" icon="twitch_charity">Twitch charity donation</Button>
			<Button small @click="simulateEvent($event, 'streamelements', 'se_donation')" icon="streamelements">Streamelements donation</Button>
			<Button small @click="simulateEvent($event, 'streamlabs', 'sl_donation')" icon="streamlabs">Streamlabs donation</Button>
			<Button small @click="simulateEvent($event, 'streamlabs', 'sl_merch')" icon="streamlabs">Streamlabs merch</Button>
			<Button small @click="simulateEvent($event, 'streamlabs', 'sl_patreon')" icon="streamlabs">Streamlabs Patreon</Button>
			<Button small @click="simulateEvent($event, 'streamlabs', 'sl_charity')" icon="streamlabs">Streamlabs Charity</Button>
			<Button small @click="simulateEvent($event, 'streamlabs', 'sl_charity_spam')" icon="streamlabs">Streamlabs Ch. spam</Button>
			<Button small @click="simulateEvent($event, 'kofi', 'kofi_donation')" icon="kofi">Kofi donation</Button>
			<Button small @click="simulateEvent($event, 'kofi', 'kofi_merch')" icon="kofi">Kofi merch</Button>
			<Button small @click="simulateEvent($event, 'kofi', 'kofi_sub')" icon="kofi">Kofi Sub</Button>
			<Button small @click="simulateEvent($event, 'kofi', 'kofi_commission')" icon="kofi">Kofi Commission</Button>
			<Button small @click="simulateEvent($event, 'tipeee')" icon="tipeee">Tipeee donation</Button>
			<Button small @click="simulateEvent($event, 'tiltify')" icon="tiltify">Tiltify donation</Button>
			<Button small @click="simulateEvent($event, 'patreon')" icon="patreon">Patreon new member</Button>
			<Button small @click="simulateBlockedUser()" icon="block">Blocked user</Button>
			<Button small @click="simulateSuspicious()" icon="shield">Suspicious user</Button>
			<Button small @click="simulateRestricted()" icon="shield">Restricted user</Button>
			<Button small @click="simulateFollowbotItem()" icon="follow">Follow bot item</Button>
			<Button small @click="simulateFollowbotRaid()" icon="follow">Follow bot raid</Button>
			<Button small @click="simulateEvent($event, 'shoutout')" icon="shoutout">Send shoutout</Button>
			<Button small @click="simulateEvent($event, 'shoutout', 'soReceived')" icon="shoutout">Receive shoutout</Button>
			<Button small @click="restrictUser()" icon="shield">Restrict user</Button>
			<Button small @click="monitorUser()" icon="shield">Monitor user</Button>
			<Button small @click="unflagUser()" icon="shield">Unflag user</Button>
			<Button small @click="simulateEvent($event, 'connect')" icon="online">Chat connected</Button>
			<Button small @click="simulateEvent($event, 'disconnect')" icon="offline">Chat disconnected</Button>
			<Button small @click="simulateEvent($event, 'stream_online')" icon="online">Stream online</Button>
			<Button small @click="simulateEvent($event, 'stream_offline')" icon="offline">Stream offline</Button>
			<Button small @click="simulateEvent($event, 'stream_online', 'my_stream_online')" icon="offline">My stream started</Button>
			<Button small @click="simulateEvent($event, 'stream_offline', 'my_stream_offline')" icon="offline">My stream stoped</Button>
			<Button small @click="simulateHateRaid()" icon="raid">Hate raid</Button>
			<Button small @click="openTriggersLogs()" icon="broadcast">Show triggers logs</Button>
			<Button small @click="openOBSHeatLogs()" icon="obs">Show OBS logs</Button>
			<Button small secondary type="link" :href="pubsubHistoryLink" target="_blank" icon="download" v-if="pubsubHistoryLink">Download</Button>
			<Button small @click="fakeConversation()" icon="whispers">Fake conversation</Button>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import EventSub from '@/utils/twitch/EventSub';
import staticEmotes from '@/utils/twitch/staticEmoteList.json';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import { LoremIpsum } from "lorem-ipsum";
import { reactive } from 'vue';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import type { TwitchEventSubDataTypes } from '@/types/twitch/TwitchEventSubDataTypes';

@Component({
	components:{
		Button: TTButton,
	},
	emits:["close", "triggersLogs", "obsHeatLogs"]
})
class DevmodeMenu extends Vue {

	public pubsubHistoryLink:string|null = null;
	public generatingHistory = false;
	private commercialTO:number = -1;

	private clickHandler!:(e:MouseEvent) => void;

	public async mounted():Promise<void> {
		await this.$nextTick();
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		this.open();
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	private open():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.1, translateX:"115%", delay:.2, ease:"sine.out"});
		gsap.fromTo(ref, {scaleX:1.1}, {duration:.5, delay:.3, scaleX:1, clearProps:"scaleX,translateX", ease:"elastic.out(1)"});
	}

	private close():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.to(ref, {duration:.1, scaleX:1.1, ease:"sin.in"});
		gsap.to(ref, {duration:.1, translateX:"100%", scaleX:1, delay:.1, clearProps:"translateX", ease:"sin.out", onComplete:() => {
			this.$emit("close");
		}});
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.close();
		}
	}

	public async simulateEvent(event:MouseEvent, type:TwitchatDataTypes.TwitchatMessageStringType, subAction?:Subaction):Promise<void> {
		const me = StoreProxy.auth.twitch.user;
		if(type == "streamlabs" && subAction == "sl_charity_spam") {
			this.$store.streamlabs.simulateEvents();
			return;
		}
		this.$store.debug.simulateMessage<TwitchatDataTypes.ChatMessageTypes>(type, async (message)=> {
			switch(subAction) {
				case "raidOffline":			(message as TwitchatDataTypes.MessageRaidData).stream.wasLive = false;break;
				case "raidOnline":			(message as TwitchatDataTypes.MessageRaidData).stream.wasLive = true;break;
				case "discord":				(message as TwitchatDataTypes.MessageTwitchatAdData).adType = TwitchatDataTypes.TwitchatAdTypes.DISCORD; break;
				case "ad":					(message as TwitchatDataTypes.MessageTwitchatAdData).adType = TwitchatDataTypes.TwitchatAdTypes.DONATE; break;
				case "ad_warn":				(message as TwitchatDataTypes.MessageTwitchatAdData).adType = TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_AD_WARNING; break;
				case "ad_break_api":		(message as TwitchatDataTypes.MessageTwitchatAdData).adType = TwitchatDataTypes.TwitchatAdTypes.AD_BREAK_SCOPE_REQUEST; break;
				case "donor_public_prompt":	(message as TwitchatDataTypes.MessageTwitchatAdData).adType = TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_SPONSOR_PUBLIC_PROMPT; break;
				case "update_reminder":		(message as TwitchatDataTypes.MessageTwitchatAdData).adType = TwitchatDataTypes.TwitchatAdTypes.UPDATE_REMINDER; break;
				case "soReceived":			(message as TwitchatDataTypes.MessageShoutoutData).received = true; break;
				case "first":				(message as TwitchatDataTypes.MessageChatData).twitch_isFirstMessage = true; break;
				case "returning":			(message as TwitchatDataTypes.MessageChatData).twitch_isReturning = true; break;
				case "presentation":		(message as TwitchatDataTypes.MessageChatData).twitch_isPresentation = true; break;
				case "recent":				(message as TwitchatDataTypes.MessageChatData).user.created_at_ms = Date.now() - 7 * 24 * 60 * 6000; break;
				case "no_message": {
					console.log("OKOKO");
					(message as TwitchatDataTypes.MessageCheerData).message = "";
					(message as TwitchatDataTypes.MessageCheerData).message_size = 0;
					(message as TwitchatDataTypes.MessageCheerData).message_html = "";
					(message as TwitchatDataTypes.MessageCheerData).message_chunks = [];
					break;
				}
				case "sub":
				case "resub": {
					(message as TwitchatDataTypes.MessageSubscriptionData).is_gift = false;
					(message as TwitchatDataTypes.MessageSubscriptionData).is_resub = subAction == "resub";
					break;
				}
				case "skin1":				(message as TwitchatDataTypes.MessageChatData).twitch_animationId = "simmer"; break;
				case "skin2":				(message as TwitchatDataTypes.MessageChatData).twitch_animationId = "rainbow-eclipse"; break;
				case "skin3":				(message as TwitchatDataTypes.MessageChatData).twitch_animationId = "cosmic-abyss"; break;
				case "giantEmote":{
					const emote = Utils.pickRand(staticEmotes);
					(message as TwitchatDataTypes.MessageChatData).message_chunks.push({type:"emote", value:emote.name, emoteHD:emote.images.url_4x, emote:emote.images.url_1x});
					(message as TwitchatDataTypes.MessageChatData).message += " "+emote.name;
					(message as TwitchatDataTypes.MessageChatData).twitch_gigantifiedEmote = emote.name;
					break;
				}
				case "giftpaidupgrade":		(message as TwitchatDataTypes.MessageSubscriptionData).is_giftUpgrade = true; break;
				case "sl_donation":			(message as TwitchatDataTypes.StreamlabsDonationData).eventType = "donation"; break;
				case "sl_merch": {
					(message as TwitchatDataTypes.StreamlabsMerchData).eventType = "merch";
					(message as TwitchatDataTypes.StreamlabsMerchData).product = "T-shirt"; break;
				}
				case "sl_patreon":{
					(message as TwitchatDataTypes.StreamlabsPatreonPledgeData).eventType = "patreon_pledge";
					(message as TwitchatDataTypes.StreamlabsPatreonPledgeData).amountFormatted = "$13"; break;
				}
				case "sl_charity":{
					(message as TwitchatDataTypes.StreamlabsCharityData).eventType = "charity";
					(message as TwitchatDataTypes.StreamlabsCharityData).amount = 13;
					(message as TwitchatDataTypes.StreamlabsCharityData).totalRaised = 13;
					(message as TwitchatDataTypes.StreamlabsCharityData).totalRaisedFormatted = "$13";
					(message as TwitchatDataTypes.StreamlabsCharityData).goal = 100;
					(message as TwitchatDataTypes.StreamlabsCharityData).isToSelf = true;
					(message as TwitchatDataTypes.StreamlabsCharityData).campaign = {
						id:Utils.getUUID(),
						title:"My campaign",
						url:"https://streamlabscharity.com",
					};
					(message as TwitchatDataTypes.StreamlabsCharityData).goalFormatted = "$100";
					(message as TwitchatDataTypes.StreamlabsCharityData).amountFormatted = "$13"; break;
				}
				case "kofi_donation":			(message as TwitchatDataTypes.KofiDonationData).eventType = "donation"; break;
				case "kofi_merch": {
					(message as TwitchatDataTypes.KofiMerchData).eventType = "merch";
					(message as TwitchatDataTypes.KofiMerchData).products = [{name:"T-shirt", quantity:1, id:"123456"}];
					if(Math.random() > .25) {
						(message as TwitchatDataTypes.KofiMerchData).products.push({name:"Mug", quantity:2, id:"123456"});
						if(Math.random() > .25) {
							(message as TwitchatDataTypes.KofiMerchData).products.push({name:"Shoes", quantity:2, id:"123456"});
						}
					}
					break;
				}
				case "kofi_sub":{
					(message as TwitchatDataTypes.KofiSubscriptionData).eventType = "subscription";
					(message as TwitchatDataTypes.KofiSubscriptionData).tier = "My amazing subscription"; break;
				}
				case "kofi_commission":{
					(message as TwitchatDataTypes.KofiCommissionData).eventType = "commission";
					(message as TwitchatDataTypes.KofiCommissionData).url = "https://ko-fi.com";break;
				}
				case "se_donation":			(message as TwitchatDataTypes.StreamelementsDonationData).eventType = "donation"; break;
				case "unban_request_solve":	{
					(message as TwitchatDataTypes.MessageUnbanRequestData).isResolve = true;
					(message as TwitchatDataTypes.MessageUnbanRequestData).accepted = Math.random() > .5;
					break;
				}
				case "my_stream_online":
				case "my_stream_offline":{
					(message as TwitchatDataTypes.MessageStreamOfflineData).info.user = me;
					(message as TwitchatDataTypes.MessageStreamOfflineData).info.category = "Minecraft";
					(message as TwitchatDataTypes.MessageStreamOfflineData).info.live = subAction == "my_stream_online";
					(message as TwitchatDataTypes.MessageStreamOfflineData).info.title = "Putting some cubes everywhere !";
					(message as TwitchatDataTypes.MessageStreamOfflineData).info.tags = ["cubes", "minecraft", "twitchat"];
					break;
				}
				case "cheer_pin": {
					window.setTimeout(()=> {
						const m = (message as TwitchatDataTypes.MessageCheerData);
						const durations = [60,120,300,600,1200,3600,7200];
						const ranges = [0,200,500,1000,2000,5000,10000];
						//Find the which bits range the number of bits corresponds to
						let index = (ranges.findIndex(v=> v > m.bits) ?? 1) - 1;
						if(index < 0) index = ranges.length - 1;
						// m.bits = Utils.pickRand(ranges);
						// index = ranges.findIndex(v=> v === m.bits);
						m.pinDuration_ms = durations[index] * 1000;
						m.pinLevel = index;
						m.pinned = true;
						// this.$store.chat.addMessage(m);
						TriggerActionHandler.instance.execute(m);
					}, 100);
					break;
				}
				case "hypeChat": {
					const m = (message as TwitchatDataTypes.MessageChatData);
					const level = Utils.pickRand([0,1,2,3,4,5,6,7,8,9]);
					m.twitch_hypeChat = {
						level,
						amount:[1.2,6,12,24,60,120,240,360,480,600][level],
						currency:Utils.pickRand(["EUR","USD","CHF", "GBP"]),
						duration_s:[30, 150, 60*5, 60*10, 60*30, 60*60, 60*60*2, 60*60*3, 60*60*4, 60*60*5][level]
					};
					break;
				}
				case "clip": {
					const m = message as TwitchatDataTypes.MessageChatData;
					let str = "Check out this clip https://www.twitch.tv/twitch/clip/UnusualFriendlyLasagnaOpieOP-ot8P67E0N6trA6hW";
					// let str = "Check out this clip twitch.tv/marinopesto/clip/LittleDarlingDiscBIRB-OXO094VAZeWIoe5a";
					let chunks = TwitchUtils.parseMessageToChunks(str, undefined, true);
					m.message = str;
					m.message_chunks = chunks;
					m.message_html = str;
					m.message_size = TwitchUtils.computeMessageSize(chunks);
					break;
				}
				case "gift":{
					const recipients:TwitchatDataTypes.TwitchatUser[] = reactive([]);
					const count = Math.round(Math.random() * 10) + 1;
					const m = (message as TwitchatDataTypes.MessageSubscriptionData);
					m.gift_recipients = recipients;
					m.is_gift = true;
					m.user.channelInfo[m.channel_id].totalSubgifts = Math.round(Math.random()*100);
					for (let i = 0; i < count; i++) {
						recipients.push(Utils.pickRand(StoreProxy.users.users.filter(v=>v.errored !== true)));
					}
					m.gift_count = recipients.length;
					break;
				}

				case "youtube": {
					if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
						// message.message = "!q coucou durssSLIP";

						// const chunks = TwitchUtils.parseMessageToChunks(message.message, undefined, true);
						// message.message_chunks = chunks;
						// message.message_html = TwitchUtils.messageChunksToHTML(chunks);
						message.youtube_liveId = "xxxx";
					}
					message.platform = "youtube";
					break;
				}

				case "tiktok": {
						message.platform = "tiktok";
				}
			}
			if(type === TwitchatDataTypes.TwitchatMessageType.CLIP_PENDING_PUBLICATION) {
				window.setTimeout(()=>{
					this.simulateEvent(event, TwitchatDataTypes.TwitchatMessageType.CLIP_CREATION_COMPLETE);
				}, 2000);
			}

			if(type === TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK) {
				message = message as TwitchatDataTypes.MessageWatchStreakData;
				const messageData:TwitchatDataTypes.MessageChatData = {
					channel_id: message.channel_id,
					id:Utils.getUUID(),
					type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
					date:Date.now(),
					platform:"twitch",
					user:message.user,
					message:message.message!,
					message_chunks:message.message_chunks!,
					message_html:message.message_html!,
					message_size:message.message_size!,
					answers:[],
					fake:true,
					twitch_watchStreak:message.streak,
					is_short:Utils.stripHTMLTags(message.message_html!).length / message.message!.length < .6 || message.message!.length < 4,
				};
				this.$store.chat.addMessage(messageData);
			}

			//Pressing CTRL while clicking a button will force the user to self
			if((event.ctrlKey || event.metaKey) && message.hasOwnProperty("user")) {
				(message as TwitchatDataTypes.MessageChatData).user = StoreProxy.auth.twitch.user;
			}
			
			this.$store.chat.addMessage(message);
		}, false);
	}

	/**
	 * Simulates a hate raid
	 */
	public async simulateHateRaid():Promise<void> {
		let str = "This is a bad message LUL that should be banned https://google.fr !";
		let chunks = TwitchUtils.parseMessageToChunks(str, undefined, true);
		let html = TwitchUtils.messageChunksToHTML(chunks);
		for (let i = 0; i < 10; i++) {
			await this.$store.debug.simulateMessage<TwitchatDataTypes.MessageChatData>(TwitchatDataTypes.TwitchatMessageType.MESSAGE, async (m)=> {
				//This is a test to make sure that if a regular user sends the same message before
				//the fith occurence of a 1st time chatter, it properly resets the anti hate raid counter
				// m.twitch_isFirstMessage = i>0 && i%5 != 0;
				m.twitch_isFirstMessage = true;
				m.message = str;
				m.message_chunks = chunks;
				m.message_html = html;
				this.$store.chat.addMessage(m);
			}, false);
		}
	}

	public openTriggersLogs():void {
		this.$emit("triggersLogs");
	}

	public openOBSHeatLogs():void {
		this.$emit("obsHeatLogs");
	}

	public simulateFollowbotRaid():void {
		EventSub.instance.simulateFollowbotRaid();
	}

	public async fakeConversation():Promise<void> {
		const messages = [
			"w0k1ss:Elon Musk is just a billionaire who cosplays as an 'edgy free speech warrior' while banning anyone who criticizes him.",
			"FUmsk:Dude literally reinstated Nazis on Twitter while banning journalists. How is that not fascist behavior?",
			"n4z1Twump:Musk loves authoritarianism. He moved Tesla’s HQ to Texas for less regulations and openly supports right-wing leaders.",
			"jdvater:He also fired employees for speaking out about workplace harassment. Classic fascist move—suppressing dissent.",
			"magadeepthro4t3r:You guys are ridiculous. Musk is just a businessman. Free speech means letting all voices speak, even the ones you don’t like.",
			"w0k1ss:@magadeepthro4t3r Then why did he ban left-wing accounts for making fun of him? That’s not free speech; that’s a fragile ego.",
			"FUmsk:He literally said 'comedy is legal again' and then nuked an account for parodying him. Hypocrisy much?",
			"n4z1Twump:Musk boosting conspiracy theories about Paul Pelosi's attack should tell you all you need to know.",
			"jdvater:Let’s not forget him cozying up to authoritarian leaders like Modi and Erdogan for business deals.",
			"magadeepthro4t3r:@jdvater It’s called diplomacy. He needs to work with world leaders to expand Tesla and SpaceX. It’s not political.",
			"w0k1ss:Oh please, Musk is political. He’s pushing right-wing talking points and platforming fascists on Twitter.",
			"FUmsk:@magadeepthro4t3r If it’s just business, why does he engage with far-right influencers and spread their narratives?",
			"n4z1Twump:He’s literally pushing 'great replacement' rhetoric on Twitter. That’s white supremacist propaganda.",
			"jdvater:He’s also anti-union, which is another major sign of fascism. Weakening worker rights is classic authoritarian capitalism.",
			"magadeepthro4t3r:@jdvater LOL, so now being against unions makes you a fascist? He wants efficiency, not lazy workers striking all the time.",
			"w0k1ss:Union-busting is straight from the fascist playbook. Tesla has had racial discrimination lawsuits too, not a good look.",
			"FUmsk:Yeah, Black workers at Tesla literally had to work in a place called 'the plantation'. How is that not racist AF?",
			"n4z1Twump:Musk wants to control everything—speech, labor, even politics. That’s why he’s pushing for a one-party system under the guise of centrism.",
			"jdvater:He also promotes techno-feudalism. He wants a society where billionaires own everything and people are just serfs.",
			"magadeepthro4t3r:@jdvater That’s ridiculous. He’s giving people jobs, pushing innovation, and making the world better.",
			"w0k1ss:@magadeepthro4t3r Oh yeah, ‘making the world better’ by supporting coups in South America for lithium mining?",
			"FUmsk:Exactly. Musk literally said 'we’ll coup whoever we want' when talking about Bolivia’s government. That’s imperialist fascism.",
			"n4z1Twump:And let’s not forget him joking about having 'the night rope experience' with white nationalists. He knows exactly what he’s doing.",
			"jdvater:Musk is normalizing fascism under the guise of 'free speech'. It’s always been about power, not principles.",
			"magadeepthro4t3r:@jdvater The guy literally wants to colonize Mars. How is that fascist? He’s trying to save humanity.",
			"w0k1ss:@magadeepthro4t3r You mean he wants to create a corporate dictatorship on Mars where workers have no rights?",
			"FUmsk:Musk’s vision of the future is billionaire overlords ruling over indentured servants. That’s dystopian, not progressive.",
			"n4z1Twump:He already does that on Earth—low pay, overwork, firing anyone who complains. Why wouldn’t he do it on Mars?",
			"jdvater:Elon Musk is a textbook fascist—corporate control, suppression of dissent, and a cult of personality. Wake up.",
			"magadeepthro4t3r:You guys are just jealous of his success. If being rich and powerful makes someone fascist, then everyone successful is one."
		];
		const channelId = this.$store.auth.twitch.user.id;
		const userMap = new Map<string, TwitchatDataTypes.TwitchatUser>();
		for (let i = 0; i < messages.length; i++) {
			const [name, message] = messages[i].split(":");
			const user = userMap.get(name) ?? {
				id:Utils.getUUID(),
				displayName:name,
				displayNameOriginal:name,
				login:name,
				is_affiliate:false,
				is_partner:false,
				is_blocked:false,
				is_bot:false,
				is_tracked:false,
				color:Utils.pickRand(["#ff0000","#0000ff","#008000","#b22222","#ff7f50","#9acd32","#ff4500","#2e8b57","#daa520","#d2691e","#5f9ea0","#1e90ff","#ff69b4","#8a2be2","#00ff7f"]),
				platform:"twitch",
				pronouns:"",
				pronounsLabel:"",
				pronounsTooltip:"",
				channelInfo:{[channelId]:{
					badges:[],
					following_date_ms:Date.now(),
					is_banned:false,
					is_broadcaster:false,
					is_following:true,
					is_gifter:false,
					is_moderator:false,
					is_new:false,
					is_raider:false,
					is_subscriber:false,
					is_vip:false,
					online:true,
				}}
			};
			userMap.set(name, user);
			const messageData:TwitchatDataTypes.MessageChatData = {
				channel_id: channelId,
				id:Utils.getUUID(),
				type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				date:Date.now() - (messages.length - i) * 1000,
				platform:"twitch",
				user,
				message,
				message_chunks: TwitchUtils.parseMessageToChunks(message, undefined, true),
				message_html: "",
				message_size: 0,
				answers:[],
				fake:false,
				is_short:false,
			};
			this.$store.chat.addMessage(messageData, false);
			await Utils.promisedTimeout(Math.random() * 500);

		}
	}

	/**
	 * Simulate a follow bot event by sending lots of fake follow events
	 */
	public async simulateFollowbotItem():Promise<void> {
		const lorem = new LoremIpsum({ wordsPerSentence: { max: 40, min: 40 } });
		const login = lorem.generateWords(Math.round(Math.random()*2)+1).split(" ").join("_");
		const channelId = StoreProxy.auth.twitch.user.id;
		const uid = Math.round(Math.random()*99999999999).toString();
		const message:TwitchatDataTypes.MessageFollowingData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id: channelId,
			type:TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
			user: StoreProxy.users.getUserFrom("twitch", channelId, uid, login, login , undefined, true),
			followed_at: Date.now(),
			followbot:true,
		};
		StoreProxy.chat.addMessage(message);
	}

	public async simulateHypeTrain(type:TwitchEventSubDataTypes.HypeTrainStartEvent["type"]):Promise<void> {
		EventSub.instance.simulateHypeTrain(type);
	}

	/**
	 * Spams subgifts on 2 different account from the same user to test
	 * subgifts concurrency and make sure they're properly grouped by
	 * channel.
	 */
	public async simulateMultichanGifts():Promise<void> {
		const secondaryChan = await this.$store.users.getUserFrom("twitch", "647389082", "647389082", "durssbot", "DurssBot");
		const sender = await this.$store.users.getUserFrom("twitch", secondaryChan.id, StoreProxy.auth.twitch.user.id, StoreProxy.auth.twitch.user.login, StoreProxy.auth.twitch.user.displayNameOriginal);
		let mainCount = 0;
		let secondaryCount = 0;
		let mainDebounce = -1;
		let secondaryDebounce = -1;
		for (let i = 0; i < 10; i++) {
			//Send on main chan
			this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, (message)=> {
				const recipients:TwitchatDataTypes.TwitchatUser[] = reactive([]);
				const count = Math.round(Math.random() * 2) + 1;
				const m = (message as TwitchatDataTypes.MessageSubscriptionData);
				m.user = StoreProxy.auth.twitch.user;
				m.channel_id = StoreProxy.auth.twitch.user.id;
				m.gift_recipients = recipients;
				m.is_gift = true;
				m.tier = 1;
				m.user.channelInfo[m.channel_id].totalSubgifts = Math.round(Math.random()*100);
				for (let i = 0; i < count; i++) {
					recipients.push(Utils.pickRand(StoreProxy.users.users.filter(v=>v.errored !== true)));
				}
				m.gift_count = recipients.length;
				this.$store.chat.addMessage(message);
				mainCount += count;
				clearTimeout(mainDebounce);
				mainDebounce = window.setTimeout(() => {
					console.log("Main subgifts:", mainCount);
				}, 500);
			}, false);

			//Send on secondary chan
			this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, async (message)=> {
				const recipients:TwitchatDataTypes.TwitchatUser[] = reactive([]);
				const count = Math.round(Math.random() * 2) + 1;
				const m = (message as TwitchatDataTypes.MessageSubscriptionData);
				m.user = sender;
				m.channel_id = secondaryChan.id;
				m.channelSource = {
					color:"#008667",
					name:secondaryChan.displayNameOriginal,
				}
				m.gift_recipients = recipients;
				m.is_gift = true;
				m.tier = 1;
				m.user.channelInfo[m.channel_id].totalSubgifts = Math.round(Math.random()*100);
				for (let i = 0; i < count; i++) {
					const user = Utils.pickRand(StoreProxy.users.users.filter(v=>v.errored !== true))
					let newUser = await this.$store.users.getUserFrom("twitch", secondaryChan.id, user.id, user.login, user.displayNameOriginal);
					recipients.push(newUser);
				}
				m.gift_count = recipients.length;
				this.$store.chat.addMessage(message);
				secondaryCount += count;
				clearTimeout(secondaryDebounce);
				secondaryDebounce = window.setTimeout(() => {
					console.log("Secondary subgifts:", secondaryCount);
				}, 500);
			}, false);
		}
	}

	public simulateAutomod():void {
		this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (message)=> {
			const m = (message as TwitchatDataTypes.MessageChatData);
			let words:string[] = [];
			do {
				words.push( Utils.pickRand(m.message.split(" ")) );
			}while(Math.random() > .5)

			m.twitch_automod = { reasons:["bullying"], words };
			return true;
		});
	}

	public simulateAutomodTwitchat():void {
		this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (message)=> {
			const m = (message as TwitchatDataTypes.MessageChatData);
			m.automod = {
				enabled:true,
				id:Utils.getUUID(),
				label:"durss filter",
				regex:"durss",
				serverSync:false,
				emergency:false,
				firstTimeChatters:false,
			}
			return true;
		});
	}

	public simulateBlockedUser():void {
		this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (message)=> {
			const m = (message as TwitchatDataTypes.MessageChatData);
			m.user.is_blocked = true;
			return true;
		});
	}

	public simulateSuspicious():void {
		this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (message)=> {
			const m = (message as TwitchatDataTypes.MessageChatData);
			m.twitch_isSuspicious = true;
			return true;
		});
	}

	public simulateRestricted():void {
		this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (message)=> {
			const m = (message as TwitchatDataTypes.MessageChatData);
			m.twitch_isRestricted = true;
			const users:TwitchatDataTypes.TwitchatUser[] = [];
			const list = StoreProxy.users.users;
			for (let i = 0; i < list.length; i++) {
				users.push(list[i]);
				if(Math.random() > .3) break;
			}

			m.twitch_sharedBanChannels = users.map(v=> { return {id:v.id, login:v.login}; })
			return true;
		});
	}

	public restrictUser():void {
		this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT, (message)=> {
			const m = (message as TwitchatDataTypes.MessageLowtrustTreatmentData);
			m.restricted = true;
			m.monitored = false;
			return true;
		});
	}

	public monitorUser():void {
		this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT, (message)=> {
			const m = (message as TwitchatDataTypes.MessageLowtrustTreatmentData);
			m.restricted = false;
			m.monitored = true;
			return true;
		});
	}

	public unflagUser():void {
		this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT, (message)=> {
			const m = (message as TwitchatDataTypes.MessageLowtrustTreatmentData);
			m.restricted = false;
			m.monitored = false;
			return true;
		});
	}

	public async startFakeRaid():Promise<void> {
		const me = this.$store.auth.twitch.user;
		const user = await StoreProxy.users.getUserFrom("twitch", me.id, undefined, "frontpopulaire");
		const m:TwitchatDataTypes.RaidInfo = {
			channel_id: me.id,
			user,
			viewerCount: 42,
			startedAt:Date.now(),
			timerDuration_s:90,
		};
		StoreProxy.stream.setRaiding(m);
	}

	public async simulateSubgiftSpam():Promise<void> {
		let user:TwitchatDataTypes.TwitchatUser;
		// const fakeUsers = await TwitchUtils.getFakeUsers();

		for (let i = 0; i < 30; i++) {
			const uid = Math.round(Math.random()*168177762 + 1000000000).toString();
			const fakeUser = this.$store.users.getUserFrom("twitch", this.$store.auth.twitch.user.id, uid);
			this.$store.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, (message)=> {
				const m = message as TwitchatDataTypes.MessageSubscriptionData;
				if(!user) user = m.user;
				else m.user = user;
				m.tier = 1;
				m.is_gift = true;
				m.gift_recipients = [fakeUser];
				// m.gift_recipients = [Utils.pickRand(fakeUsers)];
				return true;
			});
			await Utils.promisedTimeout(100);
		}
	}

	public async simulateComboSpam():Promise<void> {
		EventSub.instance.simulateComboSpam();
	}

	public simulateCommercialSequence():void {
		const channelId = this.$store.auth.twitch.user.id;
		const params:TwitchatDataTypes.CommercialData = {
			prevAdStart_at:			0,
			remainingSnooze:		3,
			currentAdDuration_ms:	15,
			nextAdStart_at:			Date.now() + .5 * 60 * 1000,
			nextSnooze_at:			Date.now() + 1 * 60 * 1000,
		};
		this.$store.stream.setCommercialInfo(channelId, params);

		clearTimeout(this.commercialTO);
		this.commercialTO = window.setTimeout(()=> {
			params.prevAdStart_at = Date.now();
			params.currentAdDuration_ms = 33000;
			this.$store.stream.setCommercialInfo(channelId, params, this.$store.auth.twitch.user, true);
		}, params.nextAdStart_at - Date.now())
	}

	public simulateCustomMessage():void {
		// const text = "Coucouu ça bouuum ?? durssSLIP boudin3Hello";
		const text = "Duis incididunt esse ex sit commodo cillum do cillum excepteur. Et ullamco reprehenderit cillum magna. Aliquip pariatur ut esse consectetur laboris aliquip aute. Occaecat non dolore esse in tempor minim tempor commodo dolore pariatur quis adipisicing et.";
		const chunks = TwitchUtils.parseMessageToChunks(text,undefined, true);
		const message:TwitchatDataTypes.MessageCustomData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitchat",
			type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
			actions:[
				{icon:"broadcast", label:"Trigger", actionType:"trigger", triggerId:"d91f5d69-8945-4e74-bc65-d2b65cb91fd2", theme:"primary"},
				{icon:"url", label:"Url", actionType:"url", url:"https://www.google.fr", theme:"secondary"},
			],
			user:{
				name:"Blableblibloup",
				color:"#808000"
			},
			icon:"twitchat",
			highlightColor:"default",
			message:text,
			message_chunks:chunks,
			message_html:TwitchUtils.messageChunksToHTML(chunks),
			channel_id:this.$store.auth.twitch.user.id,
		};

		this.$store.chat.addMessage(message);
	}
}

type Subaction = "first"
				| "returning"
				| "presentation"
				| "sub"
				| "resub"
				| "gift"
				| "giftpaidupgrade"
				| "soReceived"
				| "ad_warn"
				| "donor_public_prompt"
				| "update_reminder"
				| "right_click_hint"
				| "discord"
				| "raidOnline"
				| "raidOffline"
				| "ad"
				| "ad_break_api"
				| "hypeChat"
				| "clip"
				| "cheer_pin"
				| "recent"
				| "sl_donation"
				| "sl_merch"
				| "sl_patreon"
				| "sl_charity"
				| "sl_charity_spam"
				| "kofi_donation"
				| "kofi_merch"
				| "kofi_sub"
				| "kofi_commission"
				| "se_donation"
				| "my_stream_online"
				| "my_stream_offline"
				| "unban_request_solve"
				| "youtube"
				| "tiktok"
				| "skin1"
				| "skin2"
				| "skin3"
				| "no_message"
				| "giantEmote";

export default toNative(DevmodeMenu);
</script>

<style scoped lang="less">
.devmodemenu{
	width: min-content;
	right: 0;
	left: auto;
	margin-left: auto;
	transform-origin: bottom right;
	overflow: hidden;
	display: flex;
	flex-direction: column;

	h1 {
		color: var(--color-text);
		align-self: center;
		margin-bottom: 10px;
		text-align: center;
	}

	.list {
		flex-shrink: 1;
		margin: auto;
		overflow-x: hidden;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: .25em;
		width: fit-content;
		.button {
			white-space: nowrap;
			flex-shrink: 0;
			flex-wrap: nowrap;
		}
	}
}
</style>
