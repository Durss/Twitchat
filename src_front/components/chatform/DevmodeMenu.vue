<template>
	<div class="devmodemenu">
		<h1>Developer panel</h1>
		<div class="list">
			<!-- <Button small title="Commercial" @click="simulateEvent('commercial')" :icon="$image('icons/coin.svg')" /> -->
			<Button small title="Join" @click="simulateEvent('join')" :icon="$image('icons/coin.svg')" />
			<Button small title="Leave" @click="simulateEvent('leave')" :icon="$image('icons/coin.svg')" />
			<Button small title="First message" @click="simulateEvent('message', 'first')" :icon="$image('icons/firstTime.svg')" />
			<Button small title="Returning user" @click="simulateEvent('message', 'returning')" :icon="$image('icons/returning.svg')" />
			<Button small title="Presentation" @click="simulateEvent('message', 'presentation')" :icon="$image('icons/firstTime.svg')" />
			<Button small title="Raid" @click="simulateEvent('raid')" :icon="$image('icons/raid.svg')" />
			<Button small title="Bits" @click="simulateEvent('cheer')" :icon="$image('icons/bits.svg')" />
			<Button small title="Sub" @click="simulateEvent('subscription')" :icon="$image('icons/sub.svg')" />
			<Button small title="ReSub" @click="simulateEvent('subscription', 'resub')" :icon="$image('icons/sub.svg')" />
			<Button small title="Subgifts" @click="simulateEvent('subscription', 'gift')" :icon="$image('icons/gift.svg')" />
			<Button small title="Subgift upgrade" @click="simulateEvent('subscription', 'giftpaidupgrade')" :icon="$image('icons/gift.svg')" />
			<Button small title="Follow" @click="simulateEvent('following')" :icon="$image('icons/follow.svg')" />
			<Button small title="Reward redeem" @click="simulateEvent('reward')" :icon="$image('icons/channelPoints.svg')" />
			<Button small title="Challenge contribution" @click="simulateChallengeContribution()" :icon="$image('icons/channelPoints.svg')" />
			<!-- <Button small title="Hype train" @click="simulateEvent('hypeTrain')" :icon="$image('icons/train.svg')" />
			<Button small title="Hype train summary" @click="simulateEvent('hypeTrainSummary')" :icon="$image('icons/train.svg')" />
			<Button small title="Hype train cooldown" @click="simulateEvent('hypeTrainCooldown')" :icon="$image('icons/train.svg')" />
			<Button small title="Community boost" @click="simulateEvent('communityBoost')" :icon="$image('icons/boost.svg')" />
			<Button small title="Ban" @click="simulateEvent('ban_success')" :icon="$image('icons/ban.svg')" />
			<Button small title="Automod" @click="simulateEvent('automod')" :icon="$image('icons/automod_white.svg')" />
			<Button small title="Poll result" @click="simulateEvent('pollResult')" :icon="$image('icons/poll.svg')" />
			<Button small title="Prediction result" @click="simulateEvent('predictionResult')" :icon="$image('icons/prediction.svg')" />
			<Button small title="Host" @click="simulateEvent('host')" :icon="$image('icons/raid.svg')" />
			<Button small title="Custom emotes parsing" @click="simulateEvent('messageManualEmotesParsing')" :icon="$image('icons/emote.svg')" />
			<Button small title="Low trust user" @click="simulateEvent('lowTrustUser')" :icon="$image('icons/shield.svg')" /> -->
			<Button small title="Follow bot raid" @click="simulateFollowbotRaid()" :icon="$image('icons/block.svg')" />
			<Button small title="Export events history" @click="exportPubsubHistory()" :icon="$image('icons/download.svg')" :loading="generatingHistory" v-if="!pubsubHistoryLink" />
			<Button small title="Download" type="link" :href="pubsubHistoryLink" highlight target="_blank" :icon="$image('icons/download.svg')" v-if="pubsubHistoryLink"/>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PubSub from '@/utils/twitch/PubSub';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{},
	components:{
		Button,
	}
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
		// if(type == "hypeTrain") {
		// 	PubSub.instance.simulateHypeTrain();
		// }else
		// if(type == "hype_train_cooled_down") {
		// 	PubSub.instance.simulateHypeCooldown();
		// }else if(type == "lowTrustUser") {
		// 	PubSub.instance.simulateLowTrustUser();
		// }else if(type == "communityBoost") {
		// 	PubSub.instance.simulateCommunityBoost();
		// }else if(type == "subgiftx20") {
		// 	for (let i = 0; i < 20; i++) {
		// 		//TODO update fakeEvents.json and replace these lines
		// 		// IRCClient.instance.sendFakeEvent("subgift");
		// 		await Utils.promisedTimeout(60);
		// 	}
		// }else{
			//TODO update fakeEvents.json and replace these lines
			// IRCClient.instance.sendFakeEvent(code);
			this.$store("debug").simulateMessage(type, (message)=> {
				switch(subAction) {
					case "first":			(message as TwitchatDataTypes.MessageChatData).twitch_isFirstMessage = true; break;
					case "returning":		(message as TwitchatDataTypes.MessageChatData).twitch_isReturning = true; break;
					case "presentation":	(message as TwitchatDataTypes.MessageChatData).twitch_isPresentation = true; break;
					case "resub":			(message as TwitchatDataTypes.MessageSubscriptionData).is_resub = true; break;
					case "giftpaidupgrade": (message as TwitchatDataTypes.MessageSubscriptionData).is_giftUpgrade = true; break;
					case "gift":{
						const recipients:TwitchatDataTypes.TwitchatUser[] = [];
						const count = Math.round(Math.random() * 50) + 1;
						const m = (message as TwitchatDataTypes.MessageSubscriptionData);
						for (let i = 0; i < count; i++) {
							recipients.push(StoreProxy.users.getUserFrom("twitch", StoreProxy.auth.twitch.user.id, (Math.round(Math.random() * 999999999)).toString()))
						}
						m.gift_recipients = recipients;
						m.is_gift = true;
						break;
					}
				}
			})
		// }
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
		PubSub.instance.simulateFollowbotRaid();
	}

	public simulateChallengeContribution():void {
		PubSub.instance.simulateChallengeContribution();
	}

}

type Subaction = "first" | "returning" | "presentation" | "resub" | "gift" | "giftpaidupgrade"
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