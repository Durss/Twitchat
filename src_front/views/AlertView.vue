<template>
	<div class="alert" v-if="message && message.length > 0" @click="close()">
		<CloseButton />
		<p v-html="message" class="label"></p>
	</div>
</template>

<script lang="ts">
import CloseButton from '@/components/CloseButton.vue';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		CloseButton,
	},
})
export default class AlertView extends Vue {

	public message = "";
	public timeout!:number;
	
	public mounted():void {
		this.onWatchAlert();
		watch(() => this.$store("main").alertData, () => {
			this.onWatchAlert();
		});
	}

	public async onWatchAlert():Promise<void> {
		let mess = this.$store("main").alertData;
		if(mess && mess.length > 0) {
			this.message = mess;
			await this.$nextTick();
			this.$el.removeAttribute("style");
			gsap.killTweensOf(this.$el);
			gsap.from(this.$el, {duration:.3, height:0, paddingTop:0, paddingBottom:0, ease:"back.out"});
			clearTimeout(this.timeout);
			this.timeout = setTimeout(()=> this.close(), this.message.length*80 +2000);
		}else if(this.message) {
			gsap.to(this.$el, {duration:.3, height:0, paddingTop:0, paddingBottom:0, ease:"back.in", onComplete:()=> {
				this.message = "";
			}});
		}
	}

	public close():void {
		clearTimeout(this.timeout);
		this.$store("main").alertData = "";
	}
}
</script>

<style lang="less" scoped>

.alert {
	background-color: var(--color-alert);
	color: var(--color-light);
	padding: 20px 0;
	height: auto;
	width: 100%;
	position: fixed;
	overflow: hidden;
	z-index: 101;
	position: fixed;
	top: 0;
	left: 0;
	cursor: pointer;

	.label {
		max-width: 600px;
		margin: auto;
		text-align: center;
		line-height: 1.3em;
	}
}
</style>