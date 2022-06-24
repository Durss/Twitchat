<template>
	<div class="devmodemenu">
		<h1>Developer panel</h1>
		<div class="list">
			<Button small title="Commercial" @click="simulateEvent('commercial')" :icon="$image('icons/coin.svg')" />
			<Button small title="First message" @click="simulateEvent('firstMessage')" :icon="$image('icons/firstTime.svg')" />
			<Button small title="Presentation" @click="simulateEvent('presentation')" :icon="$image('icons/firstTime.svg')" />
			<Button small title="Raid" @click="simulateEvent('raided')" :icon="$image('icons/raid.svg')" />
			<Button small title="Bits" @click="simulateEvent('cheer')" :icon="$image('icons/bits.svg')" />
			<Button small title="Sub" @click="simulateEvent('subscription')" :icon="$image('icons/sub.svg')" />
			<Button small title="ReSub" @click="simulateEvent('resub')" :icon="$image('icons/sub.svg')" />
			<Button small title="Subgift" @click="simulateEvent('subgift')" :icon="$image('icons/gift.svg')" />
			<Button small title="Subgift upgrade" @click="simulateEvent('giftpaidupgrade')" :icon="$image('icons/gift.svg')" />
			<Button small title="Subgift x20" @click="simulateEvent('subgiftx20')" :icon="$image('icons/gift.svg')" />
			<Button small title="Follow" @click="simulateEvent('following')" :icon="$image('icons/follow.svg')" />
			<Button small title="Reward redeem" @click="simulateEvent('reward')" :icon="$image('icons/channelPoints.svg')" />
			<Button small title="Hype train" @click="simulateEvent('hypeTrain')" :icon="$image('icons/train.svg')" />
			<Button small title="Hype train cooldown" @click="simulateEvent('hypeTrainCooldown')" :icon="$image('icons/train.svg')" />
			<Button small title="Community boost" @click="simulateEvent('communityBoost')" :icon="$image('icons/boost.svg')" />
			<Button small title="Ban" @click="simulateEvent('ban_success')" :icon="$image('icons/ban.svg')" />
			<Button small title="Automod" @click="simulateEvent('automod')" :icon="$image('icons/automod_white.svg')" />
			<Button small title="Poll result" @click="simulateEvent('pollResult')" :icon="$image('icons/poll.svg')" />
			<Button small title="Prediction result" @click="simulateEvent('predictionResult')" :icon="$image('icons/prediction.svg')" />
			<Button small title="Host" @click="simulateEvent('host')" :icon="$image('icons/raid.svg')" />
			<Button small title="Custom emotes parsing" @click="simulateEvent('messageManualEmotesParsing')" :icon="$image('icons/emote.svg')" />
			<Button small title="Low trust user" @click="simulateEvent('lowTrustUser')" :icon="$image('icons/shield.svg')" />
			<Button small title="OBS-WS broadcast test" @click="obsWSBroadcast()" :icon="$image('icons/notification.svg')" />
			<Button small title="Export events history" @click="exportPubsubHistory()" :icon="$image('icons/download.svg')" :loading="generatingHistory" v-if="!pubsubHistoryLink" />
			<Button small title="Download" type="link" :href="pubsubHistoryLink" highlight target="_blank" :icon="$image('icons/download.svg')" v-if="pubsubHistoryLink"/>
		</div>
	</div>
</template>

<script lang="ts">
import IRCClient from '@/utils/IRCClient';
import PublicAPI from '@/utils/PublicAPI';
import PubSub from '@/utils/PubSub';
import Utils from '@/utils/Utils';
import gsap from 'gsap/all';
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

	public async simulateEvent(code:string):Promise<void> {
		if(code == "hypeTrain") {
			PubSub.instance.simulateHypeTrain();
		}else if(code == "hypeTrainCooldown") {
			PubSub.instance.simulateHypeCooldown();
		}else if(code == "lowTrustUser") {
			PubSub.instance.simulateLowTrustUser();
		}else if(code == "communityBoost") {
			PubSub.instance.simulateCommunityBoost();
		}else if(code == "subgiftx20") {
			for (let i = 0; i < 20; i++) {
				IRCClient.instance.sendFakeEvent("subgift");
				await Utils.promisedTimeout(60);
			}
		}else{
			IRCClient.instance.sendFakeEvent(code);
		}
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

	public obsWSBroadcast():void {
		PublicAPI.instance.broadcast("ACTIVITY_FEED_TOGGLE");
	}

}
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