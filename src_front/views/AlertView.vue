<template>
	<div class="alertview" v-if="message && message.length > 0" @click="close()">
		<CloseButton v-if="!locked" />
		<div v-html="message" class="label"></div>
		<div v-if="$store.main.alertData.showContact" class="contact">
			<span>{{ $t("global.alert_support") }}</span>
			<Button :href="discordUrl" type="link" target="_blank" icon="discord" light alert>{{ $t("global.join_discordBt") }}</Button>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import CloseButton from '@/components/CloseButton.vue';
import Config from '@/utils/Config';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button: TTButton,
		CloseButton,
	},
})
export default class AlertView extends Vue {
	public message = "";
	public timeout!:number;
	public locked:boolean = false;
	public showContact:boolean = false;

	public get discordUrl():string { return Config.instance.DISCORD_URL; }
	
	public mounted():void {
		this.onWatchAlert();
		watch(() => this.$store.main.alertData.message, () => {
			this.onWatchAlert();
		});
	}

	public async onWatchAlert():Promise<void> {
		if(this.locked) return;

		let mess = this.$store.main.alertData;
		if(mess && mess.message.length > 0) {
			this.message = mess.message;
			await this.$nextTick();
			this.$el.removeAttribute("style");
			gsap.killTweensOf(this.$el);
			gsap.from(this.$el, {duration:.3, height:0, paddingTop:0, paddingBottom:0, ease:"back.out"});
			clearTimeout(this.timeout);
			
			if(mess.critical) {
				this.locked = true;
			}else{
				const addTime = mess.showContact? 6000 : 2000;
				this.timeout = setTimeout(()=> this.close(), this.message.length*80 + addTime);
			}
		}else if(this.message) {
			gsap.to(this.$el, {duration:.3, height:0, paddingTop:0, paddingBottom:0, ease:"back.in", onComplete:()=> {
				this.message = "";
			}});
		}
	}

	public beforeUnmount():void {
		clearTimeout(this.timeout);
	}

	public close():void {
		if(this.locked) return;
		
		clearTimeout(this.timeout);
		this.$store.main.alertData.message = "";
	}
}
</script>

<style lang="less" scoped>
.alertview {
	background-color: var(--color-alert);
	color: var(--color-light);
	padding: 20px 0;
	height: auto;
	width: 100%;
	overflow: hidden;
	z-index: 101;
	position: fixed;
	top: 0;
	left: 0;
	cursor: pointer;
	gap: 1em;
	display: flex;
	flex-direction: column;

	.label {
		max-width: 600px;
		margin: 0 auto;
		text-align: center;
		line-height: 1.3em;
	}

	.contact {
		align-self: center;
		padding: .5em;
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.bevel();
		background-color: var(--color-alert-dark);
		border-radius: var(--border-radius);
	}
}
</style>