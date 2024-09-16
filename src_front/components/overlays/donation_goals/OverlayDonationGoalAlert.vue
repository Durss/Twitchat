<template>
	<div class="overlaydonationgoalalert">
		<div class="holder" ref="holder">
			<span class="amount">+{{ amount }}<span class="currency" v-if="currency">{{ currency }}</span></span>
			<span class="username">{{ username }}</span>
		</div>

		<svg class="star" ref="stars" v-for="i in 15"
		version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
		width="445.2px" height="426.2px" viewBox="0 0 445.2 426.2" style="enable-background:new 0 0 445.2 426.2;" xml:space="preserve">
			<path style="fill:#FFFFFF;" d="M247.5,16l47.2,95.6c4,8.2,11.8,13.9,20.9,15.2L421,142c22.7,3.3,31.8,31.3,15.4,47.3L360,263.7
				c-6.5,6.4-9.5,15.5-8,24.5l18,105c3.9,22.7-19.9,39.9-40.2,29.2l-94.3-49.6c-8.1-4.2-17.7-4.2-25.8,0l-94.3,49.6
				c-20.3,10.7-44.1-6.6-40.2-29.2l18-105c1.5-9-1.4-18.2-8-24.5L8.9,189.3c-16.5-16-7.4-44,15.4-47.3l105.4-15.3
				c9-1.3,16.8-7,20.9-15.2L197.8,16C207.9-4.7,237.3-4.7,247.5,16z"/>
		</svg>

	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import { gsap } from 'gsap/gsap-core';
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Icon,
	},
	emits:[],
})
class OverlayDonationGoalAlert extends Vue {

	@Prop()
	public colors!:{base:string, fill:string, background:string};

	@Prop()
	public amount!:number;

	@Prop()
	public username!:string;

	@Prop()
	public currency!:string;

	public get color():string { return this.colors.base; }
	public get color_fill():string { return this.colors.fill; }
	public get color_background():string { return this.colors.background; }

	public mounted():void{
		const holder = this.$refs.holder as HTMLDivElement;
		const stars = this.$refs.stars as SVGElement[];
		const bounds = holder.getBoundingClientRect();

		stars.forEach((star)=>{
			gsap.set(star, {x:Math.random()*bounds.width})
			let delay = Math.random()*1;
			gsap.fromTo(star, {y:bounds.height, rotate:0}, {y:-bounds.height*(.5+Math.random()), rotate:(Math.random()-Math.random())*180+"deg", duration:.5, delay, ease:"sine.out", repeat:-1, repeatDelay:.5});
			gsap.fromTo(star, {scale:Math.random()*3+2}, {scale:0, duration:.5, delay:.1+delay, ease:"sine.out", repeat:-1, repeatDelay:.5});
		});
	}

}
export default toNative(OverlayDonationGoalAlert);
export type OverlayDonationGoalAlertClass = OverlayDonationGoalAlert;

</script>

<style scoped lang="less">
.overlaydonationgoalalert{
	.holder {
		color: v-bind(color_background);
		background: v-bind(color);
		padding: .25em .5em;
		border-top-left-radius: var(--border-radius);
		gap: .5em;
		display: flex;
		align-items: center;
		position: relative;
		z-index: 1;
		.amount {
			font-weight: bold;
		}
	}

	.star {
		color: v-bind(color);
		position: absolute;
		bottom: 0;
		left: 0;
		height: 1em;
		width: 1em;
		transform-origin: center center;
		transform: scale(0);
		path {
			fill: currentColor !important;
		}
	}
}
</style>