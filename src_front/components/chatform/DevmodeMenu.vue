<template>
	<div class="devmodemenu blured-background-window">
		<h1>Developer panel</h1>
		<div class="list">
			<!-- <Button small title="Commercial" @click="simulateEvent($event, 'commercial')" icon="coin" /> -->
			<Button small @click="simulateEvent($event, 'message', 'clip')" icon="clip">Clip link</Button>
			<Button small @click="simulateEvent($event, 'clip_pending_publication')" icon="clip">Clip creation</Button>
			<Button small @click="simulateEvent($event, 'twitchat_ad', 'discord')" icon="whispers">Discord</Button>
			<Button small @click="simulateEvent($event, 'twitchat_ad', 'ad')" icon="whispers">Twitchat ad</Button>
			<Button small @click="simulateEvent($event, 'twitchat_ad', 'ad_warn')" icon="whispers">Twitchat Ad warn</Button>
			<Button small @click="simulateEvent($event, 'twitchat_ad', 'donor_public_prompt')" icon="whispers">Donor prompt</Button>
			<Button small @click="simulateEvent($event, 'twitchat_ad', 'update_reminder')" icon="whispers">Update reminder</Button>
			<Button small @click="$store('chat').sendRightClickHint()" icon="whispers">Right click hint</Button>
			<Button small @click="simulateEvent($event, 'join')" icon="enter">Join</Button>
			<Button small @click="simulateEvent($event, 'leave')" icon="leave">Leave</Button>
			<Button small @click="simulateEvent($event, 'ban')" icon="ban">Ban</Button>
			<Button small @click="simulateEvent($event, 'unban')" icon="unban">Unban</Button>
			<Button small @click="simulateEvent($event, 'message', 'first')" icon="firstTime">First message</Button>
			<Button small @click="simulateEvent($event, 'message', 'hypeChat')" icon="hypeChat">Hype chat message</Button>
			<Button small @click="simulateEvent($event, 'message', 'returning')" icon="returning">Returning user</Button>
			<Button small @click="simulateEvent($event, 'message', 'presentation')" icon="firstTime">Presentation</Button>
			<Button small @click="simulateEvent($event, 'message', 'recent')" icon="alert">Recent account</Button>
			<Button small @click="simulateEvent($event, 'user_watch_streak')" icon="watchStreak">Watch streak</Button>
			<Button small @click="simulateEvent($event, 'raid', 'raidOffline')" icon="raid">Incoming raid offline</Button>
			<Button small @click="simulateEvent($event, 'raid', 'raidOnline')" icon="raid">Incoming raid online</Button>
			<Button small @click="startFakeRaid()" icon="raid">Outgoing raid</Button>
			<Button small @click="simulateEvent($event, 'cheer')" icon="bits">Bits</Button>
			<Button small @click="simulateEvent($event, 'subscription')" icon="sub">Sub</Button>
			<Button small @click="simulateEvent($event, 'subscription', 'resub')" icon="sub">ReSub</Button>
			<Button small @click="simulateEvent($event, 'subscription', 'gift')" icon="gift">Subgifts</Button>
			<Button small @click="simulateSubgiftSpam()" icon="gift">Subgift spam</Button>
			<Button small @click="simulateEvent($event, 'subscription', 'giftpaidupgrade')" icon="gift">Subgift upgrade</Button>
			<Button small @click="simulateEvent($event, 'following')" icon="follow">Follow</Button>
			<Button small @click="simulateEvent($event, 'reward')" icon="channelPoints">Reward redeem</Button>
			<Button small @click="simulateEvent($event, 'community_challenge_contribution')" icon="channelPoints">Challenge contribution</Button>
			<Button small @click="simulateHypeTrain()" icon="train">Hype train</Button>
			<Button small @click="simulateEvent($event, 'hype_train_cooled_down')" icon="train">Hype train cooldown</Button>
			<Button small @click="simulateEvent($event, 'hype_train_summary')" icon="train">Hype train summary</Button>
			<Button small @click="simulateComunityBoost()" icon="boost">Community boost</Button>
			<Button small @click="simulateAutomod()" icon="automod">Automod Twitch</Button>
			<Button small @click="simulateAutomodTwitchat()" icon="automod">Automod Twitchat</Button>
			<Button small @click="simulateEvent($event, 'autoban_join')" icon="automod">Automod Twitchat join</Button>
			<Button small @click="simulateEvent($event, 'poll')" icon="poll">Poll result</Button>
			<Button small @click="simulateEvent($event, 'prediction')" icon="prediction">Prediction result</Button>
			<Button small @click="simulateEvent($event, 'bingo')" icon="bingo">Bingo result</Button>
			<Button small @click="simulateEvent($event, 'raffle')" icon="ticket">Raffle result</Button>
			<Button small @click="simulateEvent($event, 'countdown')" icon="timer">Countdown result</Button>
			<Button small @click="simulateEvent($event, 'pinned')" icon="pin">Pin message</Button>
			<Button small @click="simulateEvent($event, 'unpinned')" icon="unpin">Upin message</Button>
			<Button small @click="simulateEvent($event, 'clear_chat')" icon="delete">Clear chat</Button>
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
			<Button small @click="simulateEvent($event, 'stream_online')" icon="online">Stream online</Button>
			<Button small @click="simulateEvent($event, 'stream_offline')" icon="offline">Stream offline</Button>
			<Button small @click="openTriggersLogs()" icon="broadcast">Show triggers logs</Button>
			<Button small @click="exportPubsubHistory()" icon="download" :loading="generatingHistory" v-if="!pubsubHistoryLink">Export events history</Button>
			<Button small secondary type="link" :href="pubsubHistoryLink" target="_blank" icon="download" v-if="pubsubHistoryLink">Download</Button>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import EventSub from '@/utils/twitch/EventSub';
import PubSub from '@/utils/twitch/PubSub';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { reactive } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import { typed } from 'mathjs';

@Component({
	components:{
		Button,
	},
	emits:["close", "triggersLogs"]
})
export default class DevmodeMenu extends Vue {

	public pubsubHistoryLink:string|null = null;
	public generatingHistory = false;

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
		this.$store("debug").simulateMessage(type, async (message)=> {
			switch(subAction) {
				case "raidOffline":			(message as TwitchatDataTypes.MessageRaidData).stream.wasLive = false;break;
				case "raidOnline":			(message as TwitchatDataTypes.MessageRaidData).stream.wasLive = true;break;
				case "discord":				(message as TwitchatDataTypes.MessageTwitchatAdData).adType = TwitchatDataTypes.TwitchatAdTypes.DISCORD; break;
				case "ad":					(message as TwitchatDataTypes.MessageTwitchatAdData).adType = TwitchatDataTypes.TwitchatAdTypes.DONATE; break;
				case "ad_warn":				(message as TwitchatDataTypes.MessageTwitchatAdData).adType = TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_AD_WARNING; break;
				case "donor_public_prompt":	(message as TwitchatDataTypes.MessageTwitchatAdData).adType = TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_SPONSOR_PUBLIC_PROMPT; break;
				case "update_reminder":		(message as TwitchatDataTypes.MessageTwitchatAdData).adType = TwitchatDataTypes.TwitchatAdTypes.UPDATE_REMINDER; break;
				case "soReceived":			(message as TwitchatDataTypes.MessageShoutoutData).received = true; break;
				case "first":				(message as TwitchatDataTypes.MessageChatData).twitch_isFirstMessage = true; break;
				case "returning":			(message as TwitchatDataTypes.MessageChatData).twitch_isReturning = true; break;
				case "presentation":		(message as TwitchatDataTypes.MessageChatData).twitch_isPresentation = true; break;
				case "recent":				(message as TwitchatDataTypes.MessageChatData).user.created_at_ms = Date.now() - 7 * 24 * 60 * 6000; break;
				case "resub":				(message as TwitchatDataTypes.MessageSubscriptionData).is_resub = true; break;
				case "giftpaidupgrade":		(message as TwitchatDataTypes.MessageSubscriptionData).is_giftUpgrade = true; break;
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
			}
			if(type === TwitchatDataTypes.TwitchatMessageType.CLIP_PENDING_PUBLICATION) {
				setTimeout(()=>{
					this.simulateEvent(event, TwitchatDataTypes.TwitchatMessageType.CLIP_CREATION_COMPLETE);
				}, 2000);
			}
			
			//Pressing CTRL while clicking a button will force the user to self
			if(event.ctrlKey && message.hasOwnProperty("user")) {
				(message as TwitchatDataTypes.MessageChatData).user = StoreProxy.auth.twitch.user;
			}
			this.$store("chat").addMessage(message);
		}, false);
	}

	public openTriggersLogs():void {
		this.$emit("triggersLogs");
	}

	public async exportPubsubHistory():Promise<void> {
		this.generatingHistory = true;
		const data = JSON.stringify(PubSub.instance.eventsHistory);
		const blob = new Blob([data], { type: 'application/json' });
		const url = window.URL.createObjectURL(blob)
		await Utils.promisedTimeout(1000);
		this.pubsubHistoryLink = url;
		this.generatingHistory = false;
	}

	public simulateFollowbotRaid():void {
		EventSub.instance.simulateFollowbotRaid();
	}

	public simulateFollowbotItem():void {
		PubSub.instance.simulateFollowbotItem();
	}
	
	public simulateHypeTrain():void {
		PubSub.instance.simulateHypeTrain();
	}

	public simulateComunityBoost():void {
		PubSub.instance.simulateCommunityBoost();
	}

	public simulateAutomod():void {
		this.$store("debug").simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (message)=> {
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
		this.$store("debug").simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (message)=> {
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
		this.$store("debug").simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (message)=> {
			const m = (message as TwitchatDataTypes.MessageChatData);
			m.user.is_blocked = true;
			return true;
		});
	}

	public simulateSuspicious():void {
		this.$store("debug").simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (message)=> {
			const m = (message as TwitchatDataTypes.MessageChatData);
			m.twitch_isSuspicious = true;
			return true;
		});
	}

	public simulateRestricted():void {
		this.$store("debug").simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (message)=> {
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
		this.$store("debug").simulateMessage(TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT, (message)=> {
			const m = (message as TwitchatDataTypes.MessageLowtrustTreatmentData);
			m.restricted = true;
			m.monitored = false;
			return true;
		});
	}

	public monitorUser():void {
		this.$store("debug").simulateMessage(TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT, (message)=> {
			const m = (message as TwitchatDataTypes.MessageLowtrustTreatmentData);
			m.restricted = false;
			m.monitored = true;
			return true;
		});
	}

	public unflagUser():void {
		this.$store("debug").simulateMessage(TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT, (message)=> {
			const m = (message as TwitchatDataTypes.MessageLowtrustTreatmentData);
			m.restricted = false;
			m.monitored = false;
			return true;
		});
	}

	public async startFakeRaid():Promise<void> {
		const me = this.$store("auth").twitch.user;
		const user = await StoreProxy.users.getUserFrom("twitch", me.id, undefined, "TwitchGaming");
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
		const fakeUsers = await TwitchUtils.getFakeUsers();

		for (let i = 0; i < 30; i++) {
			this.$store("debug").simulateMessage(TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, (message)=> {
				const m = message as TwitchatDataTypes.MessageSubscriptionData;
				if(!user) user = m.user;
				else m.user = user;
				m.tier = 1;
				m.is_gift = true;
				m.gift_recipients = [Utils.pickRand(fakeUsers)];
				return true;
			});
			await Utils.promisedTimeout(100);
		}
	}
}

type Subaction = "first"
				| "returning"
				| "presentation"
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
				| "hypeChat"
				| "clip"
				| "recent";

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