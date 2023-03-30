<template>
	<div class="devmodemenu">
		<h1>Developer panel</h1>
		<div class="list">
			<!-- <Button small title="Commercial" @click="simulateEvent('commercial')" :icon="$image('icons/coin.svg')" /> -->
			<Button small title="Join" @click="simulateEvent('join')" :icon="$image('icons/enter_white.svg')" />
			<Button small title="Leave" @click="simulateEvent('leave')" :icon="$image('icons/leave_white.svg')" />
			<Button small title="Ban" @click="simulateEvent('ban')" :icon="$image('icons/ban.svg')" />
			<Button small title="Unban" @click="simulateEvent('unban')" :icon="$image('icons/unban.svg')" />
			<Button small title="First message" @click="simulateEvent('message', 'first')" :icon="$image('icons/firstTime.svg')" />
			<Button small title="Returning user" @click="simulateEvent('message', 'returning')" :icon="$image('icons/returning.svg')" />
			<Button small title="Presentation" @click="simulateEvent('message', 'presentation')" :icon="$image('icons/firstTime.svg')" />
			<Button small title="Incoming raid" @click="simulateEvent('raid')" :icon="$image('icons/raid.svg')" />
			<Button small title="Outgoing raid" @click="startFakeRaid()" :icon="$image('icons/raid.svg')" />
			<Button small title="Bits" @click="simulateEvent('cheer')" :icon="$image('icons/bits.svg')" />
			<Button small title="Sub" @click="simulateEvent('subscription')" :icon="$image('icons/sub.svg')" />
			<Button small title="ReSub" @click="simulateEvent('subscription', 'resub')" :icon="$image('icons/sub.svg')" />
			<Button small title="Subgifts" @click="simulateEvent('subscription', 'gift')" :icon="$image('icons/gift.svg')" />
			<Button small title="Subgift spam" @click="simulateSubgiftSpam()" :icon="$image('icons/gift.svg')" />
			<Button small title="Subgift upgrade" @click="simulateEvent('subscription', 'giftpaidupgrade')" :icon="$image('icons/gift.svg')" />
			<Button small title="Follow" @click="simulateEvent('following')" :icon="$image('icons/follow.svg')" />
			<Button small title="Reward redeem" @click="simulateEvent('reward')" :icon="$image('icons/channelPoints.svg')" />
			<Button small title="Challenge contribution" @click="simulateEvent('community_challenge_contribution')" :icon="$image('icons/channelPoints.svg')" />
			<Button small title="Hype train" @click="simulateHypeTrain()" :icon="$image('icons/train.svg')" />
			<Button small title="Hype train cooldown" @click="simulateEvent('hype_train_cooled_down')" :icon="$image('icons/train.svg')" />
			<Button small title="Hype train summary" @click="simulateEvent('hype_train_summary')" :icon="$image('icons/train.svg')" />
			<Button small title="Community boost" @click="simulateComunityBoost()" :icon="$image('icons/boost.svg')" />
			<Button small title="Automod Twitch" @click="simulateAutomod()" :icon="$image('icons/automod.svg')" />
			<Button small title="Automod Twitchat" @click="simulateAutomodTwitchat()" :icon="$image('icons/automod.svg')" />
			<Button small title="Automod Twitchat join" @click="simulateEvent('autoban_join')" :icon="$image('icons/automod.svg')" />
			<Button small title="Poll result" @click="simulateEvent('poll')" :icon="$image('icons/poll.svg')" />
			<Button small title="Prediction result" @click="simulateEvent('prediction')" :icon="$image('icons/prediction.svg')" />
			<Button small title="Bingo result" @click="simulateEvent('bingo')" :icon="$image('icons/bingo.svg')" />
			<Button small title="Raffle result" @click="simulateEvent('raffle')" :icon="$image('icons/ticket.svg')" />
			<Button small title="Countdown result" @click="simulateEvent('countdown')" :icon="$image('icons/timer.svg')" />
			<Button small title="Pin message" @click="simulateEvent('pinned')" :icon="$image('icons/pin.svg')" />
			<Button small title="Upin message" @click="simulateEvent('unpinned')" :icon="$image('icons/unpin.svg')" />
			<Button small title="Clear chat" @click="simulateEvent('clear_chat')" :icon="$image('icons/delete.svg')" />
			<Button small title="Blocked user" @click="simulateBlockedUser()" :icon="$image('icons/block.svg')" />
			<Button small title="Suspicious user" @click="simulateSuspicious()" :icon="$image('icons/shield.svg')" />
			<Button small title="Restricted user" @click="simulateRestricted()" :icon="$image('icons/shield.svg')" />
			<Button small title="Follow bot item" @click="simulateFollowbotItem()" :icon="$image('icons/block.svg')" />
			<Button small title="Follow bot raid" @click="simulateFollowbotRaid()" :icon="$image('icons/block.svg')" />
			<Button small title="Send shoutout" @click="simulateEvent('shoutout')" :icon="$image('icons/shoutout.svg')" />
			<Button small title="Receive shoutout" @click="simulateEvent('shoutout', 'soReceived')" :icon="$image('icons/shoutout.svg')" />
			<Button small title="Restrict user" @click="restrictUser()" :icon="$image('icons/shield.svg')" />
			<Button small title="Monitor user" @click="monitorUser()" :icon="$image('icons/shield.svg')" />
			<Button small title="Unflag user" @click="unflagUser()" :icon="$image('icons/shield.svg')" />
			<Button small title="Stream online" @click="simulateEvent('stream_online')" :icon="$image('icons/online.svg')" />
			<Button small title="Stream offline" @click="simulateEvent('stream_offline')" :icon="$image('icons/offline.svg')" />
			<Button small title="Clip creation" @click="simulateEvent('clip_pending_publication')" :icon="$image('icons/clip.svg')" />
			<Button small title="Show triggers logs" @click="openTriggersLogs()" :icon="$image('icons/broadcast.svg')" />
			<Button small title="Export events history" @click="exportPubsubHistory()" :icon="$image('icons/download.svg')" :loading="generatingHistory" v-if="!pubsubHistoryLink" />
			<Button small title="Download" type="link" :href="pubsubHistoryLink" highlight target="_blank" :icon="$image('icons/download.svg')" v-if="pubsubHistoryLink"/>
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
		gsap.from(ref, {duration:.2, scaleX:0, delay:.1, clearProps:"scaleX", ease:"back.out"});
		gsap.from(ref, {duration:.3, scaleY:0, clearProps:"scaleY", ease:"back.out"});
	}

	private close():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.to(ref, {duration:.3, scaleX:0, ease:"back.in"});
		gsap.to(ref, {duration:.2, scaleY:0, delay:.1, clearProps:"scaleY, scaleX", ease:"back.in", onComplete:() => {
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

	public async simulateEvent(type:TwitchatDataTypes.TwitchatMessageStringType, subAction?:Subaction):Promise<void> {
		this.$store("debug").simulateMessage(type, async (message)=> {
			switch(subAction) {
				case "soReceived":		(message as TwitchatDataTypes.MessageShoutoutData).received = true; break;
				case "first":			(message as TwitchatDataTypes.MessageChatData).twitch_isFirstMessage = true; break;
				case "returning":		(message as TwitchatDataTypes.MessageChatData).twitch_isReturning = true; break;
				case "presentation":	(message as TwitchatDataTypes.MessageChatData).twitch_isPresentation = true; break;
				case "resub":			(message as TwitchatDataTypes.MessageSubscriptionData).is_resub = true; break;
				case "giftpaidupgrade": (message as TwitchatDataTypes.MessageSubscriptionData).is_giftUpgrade = true; break;
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

type Subaction = "first" | "returning" | "presentation" | "resub" | "gift" | "giftpaidupgrade" | "soReceived";

</script>

<style scoped lang="less">
.devmodemenu{
	.window();
	width: min-content;
	right: 0;
	left: auto;
	margin-left: auto;
	transform-origin: bottom right;

	h1 {
		color: @mainColor_light;
		align-self: center;
		margin-bottom: 10px;
	}

	.list {
		height: 400px;
		max-width: 100%;
		max-height: 80%;
		overflow-x: hidden;
		overflow-y: auto;
		.button {
			width: 100%;
			margin-bottom: 5px;
			:deep(.label) {
				flex-grow: 1;
			}
		}
	}
}
</style>