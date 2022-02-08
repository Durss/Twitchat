<template>
	<div class="devmodemenu">
		<h1>Developer panel</h1>
		<div class="list">
			<Button title="Simulate cheers" @click="simulateEvent('cheer')" :icon="require('@/assets/icons/bits.svg')" />
			<Button title="Simulate sub" @click="simulateEvent('subscription')" :icon="require('@/assets/icons/sub.svg')" />
			<Button title="Simulate subgift" @click="simulateEvent('subgift')" :icon="require('@/assets/icons/sub.svg')" />
			<Button title="Simulate subgift upgrade" @click="simulateEvent('giftpaidupgrade')" :icon="require('@/assets/icons/sub.svg')" />
			<Button title="Simulate follow" @click="simulateEvent('following')" :icon="require('@/assets/icons/follow.svg')" />
			<Button title="Simulate reward redeem" @click="simulateEvent('reward')" :icon="require('@/assets/icons/channelPoints.svg')" />
			<Button title="Simulate ban" @click="simulateEvent('ban_success')" :icon="require('@/assets/icons/ban.svg')" />
			<Button title="Simulate automod" @click="simulateEvent('automod')" :icon="require('@/assets/icons/automod_white.svg')" />
			<Button title="Simulate host" @click="simulateEvent('host')" :icon="require('@/assets/icons/raid.svg')" />
			<Button title="Custom emotes parsing" @click="simulateEvent('messageManualEmotesParsing')" :icon="require('@/assets/icons/emote.svg')" />
			<Button title="Simulate hype train" @click="simulateEvent('hypeTrain')" :icon="require('@/assets/icons/train.svg')" />
		</div>
	</div>
</template>

<script lang="ts">
import IRCClient from '@/utils/IRCClient';
import PubSub from '@/utils/PubSub';
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
		while(target != document.body && target != ref) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.close();
		}
	}

	public simulateEvent(code:string):void {
		if(code == "hypeTrain") {
			PubSub.instance.simulateHypeTrain();
		}else{
			IRCClient.instance.sendFakeEvent(code);
		}
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
		}
	}
}
</style>