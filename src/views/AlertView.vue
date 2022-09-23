<template>
	<div class="alert" v-if="message && message.length > 0" @click="close()">
		<p v-html="message" class="label"></p>
	</div>
</template>

<script lang="ts">
import { storeMain } from '@/store/storeMain';
import StoreProxy from '@/store/StoreProxy';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({})
export default class AlertView extends Vue {

	public message = "";
	public timeout!:number;
	
	private sMain = storeMain();

	public mounted():void {
		this.onWatchAlert();
		watch(() => StoreProxy.main.alert, () => {
			this.onWatchAlert();
		});
	}

	public async onWatchAlert():Promise<void> {
		let mess = StoreProxy.main.alert;
		if(mess && mess.length > 0) {
			this.message = mess;
			await this.$nextTick();
			this.$el.removeAttribute("style");
			gsap.killTweensOf(this.$el);
			gsap.from(this.$el, {duration:.3, height:0, paddingTop:0, paddingBottom:0, ease:"back.out"});
			this.timeout = setTimeout(()=> this.close(), this.message.length*80 +2000);
		}else if(this.message) {
			gsap.to(this.$el, {duration:.3, height:0, paddingTop:0, paddingBottom:0, ease:"back.in", onComplete:()=> {
				this.message = "";
			}});
		}
	}

	public close():void {
		clearTimeout(this.timeout);
		StoreProxy.main.alert = "";
	}
}
</script>

<style lang="less" scoped>

.alert {
	background-color: @mainColor_alert;
	color: @mainColor_light;
	padding: 20px 0;
	height: auto;
	width: 100%;
	position: fixed;
	overflow: hidden;
	z-index: 2;
	position: fixed;
	top: 0;
	left: 0;
	cursor: pointer;

	.label {
		max-width: 600px;
		margin: auto;
		padding: 10px 30px 10px 10px;
		text-align: center;
		&::after {
			content: "X";
			font-family: "Arial";
			color: #fff;
			position: absolute;
			top: 10px;
			right: 10px;
			padding-left: 20px;
			font-size: 20px;
		}
	}
}
</style>