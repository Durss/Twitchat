<template>
	<div class="overlayanimatedtext"
	v-if="params"
	:style="{
		fontFamily: params.textFont,
		fontSize: params.textSize+'px',
		color:params.colorBase,
	}">
		<div ref="text" v-if="text" v-html="text"></div>
	</div>
</template>

<script lang="ts">
import { Component, toNative } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import SplitType from 'split-type'
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import DOMPurify from 'isomorphic-dompurify';

@Component({
	components:{},
	emits:[],
})
class OverlayAnimatedText extends AbstractOverlay {

	public text:string = "";
	public params!:TwitchatDataTypes.AnimatedTextData;
	public strongColor:string = "inherit";

	private id:string = "";
	private configHandler!:(e:TwitchatEvent<TwitchatDataTypes.AnimatedTextData>)=>void;
	private textHandler!:(e:TwitchatEvent<{id:string, text:string}>)=>void;
	private messageQueue:string[] = [];

	public beforeMount():void {
		this.id = this.$route.query.twitchat_overlay_id as string ?? "";

		this.textHandler = (e)=>this.onText(e);
		this.configHandler = (e)=>this.onConfig(e);

		PublicAPI.instance.addEventListener(TwitchatEvent.ANIMATED_TEXT_SET, this.textHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.ANIMATED_TEXT_CONFIGS, this.configHandler);
	}

	public mounted(): void {
		this.messageQueue.push("Coucou <strong>ceci</strong> est un test");
		this.next();
	}

	public beforeUnmount():void {
		super.beforeUnmount();
		PublicAPI.instance.removeEventListener(TwitchatEvent.ANIMATED_TEXT_SET, this.textHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.ANIMATED_TEXT_CONFIGS, this.configHandler);
	}

	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_ANIMATED_TEXT_CONFIGS, {id:this.id});
	}

	/**
	 * Called when receiving overlay configs
	 * @param e
	 */
	public onConfig(e:Parameters<typeof this.configHandler>[0]):void {
		if(!e.data || e.data.id != this.id) return;
		const prevParams = this.params;
		this.params = e.data;
		this.strongColor = this.params.colorHighlights

		let shouldRender = false;
		if(prevParams) {
			shouldRender ||= this.params.animDurationScale != prevParams.animDurationScale;
			shouldRender ||= this.params.animStrength != prevParams.animStrength;
			shouldRender ||= this.params.animStyle != prevParams.animStyle;
			shouldRender ||= this.params.textFont != prevParams.textFont;
			if(this.text && shouldRender) {
				this.messageQueue.unshift(this.text);
				this.next();
			}
		}
	}

	/**
	 * Called when requesting to display a new text
	 * @param e
	 */
	public onText(e:Parameters<typeof this.textHandler>[0]):void {
		if(!e.data || e.data.id != this.id) return;
		this.messageQueue.push(e.data.text);
		if(this.messageQueue.length == 1) this.next();
	}

	/**
	 * Animate next text
	 */
	public async next():Promise<void> {
		if(this.messageQueue.length == 0) return;
		const text = this.messageQueue.shift();
		if(!text) return;
		this.text = DOMPurify.sanitize(text);
		await this.$nextTick();
		if(!this.params) {
			//Wait for params if not there yet
			while(true) {
				await Utils.promisedTimeout(50);
				if(this.params) break;
			}
		}
		await this.animate();
		this.next();
	}

	private async animate():Promise<void> {
		const split = new SplitType(this.$refs["text"] as HTMLElement, {split:["words","chars"], charClass:"char", wordClass:"word"})
		const ads = 2 - this.params.animDurationScale;
		const amp = this.params.animStrength;
		const chars = split.chars || [];
		switch(this.params.animStyle) {
			case "wave": {
				gsap.fromTo(chars,
				{scale:0},
				{
					scale:1,
					ease:"back.out("+Math.pow(amp, 2)*5+")",
					duration:.5 * ads,
					stagger:.025 * ads
				});
				gsap.fromTo(chars,
				{scale:0, opacity:0},
				{
					opacity:1,
					ease:"none",
					duration:.25 * ads,
					stagger:.025 * ads
				});
				break;
			}

			case "typewriter": {
				let delay = 0;
				for (let i = 0; i < chars.length; i++) {
					const char = chars[i];
					char.style.opacity = "0";
					setTimeout(()=>{
						char.style.opacity = "1";
					}, delay * 1000);
					delay += ads * (Math.random() * Math.random() * .2);
					if (char === char.parentElement?.lastElementChild) {
						delay += ads * .3 * Math.random();
					}
				}
				break;
			}

			case "wobble": {
				gsap.fromTo(chars,
				{scale:0, opacity:0},
				{
					scale:1,
					opacity:1,
					ease:"elastic.out("+(amp*1.5)+","+Math.max(.05, ((2-amp)/2*.5 + .1 - ads*.1))+")",
					duration:2 * ads,
					stagger:.025 * ads
				});
				break;
			}

			case "bounce": {
				chars.forEach(v=>v.style.transformOrigin = "bottom center");
				for (let i = 0; i < chars.length; i++) {
					const char = chars[i];
					gsap.fromTo(
						char,
						{ y: "-100%", scaleX:1-amp/2*.5, scaleY: 2*amp, opacity: 0 },
						{
							y: 0,
							scaleY: 1,
							opacity: 1,
							ease: "none",
							duration: .1 * ads,
							delay: i * 0.05 * ads,
						}
					);
					gsap.to(
						char,
						{
							y: 0,
							scaleY: .1,
							scaleX: 2 * amp,
							ease: "none",
							duration: .1 * ads,
							delay: i * 0.05 * ads + .1 * ads,
						}
					);
					gsap.to(
						char,
						{
							scaleY: 1,
							ease:"back.out("+Math.pow(amp, 2)*2.5+")",
							duration: .3 * ads,
							delay: i * 0.05 * ads + .1 * ads + .06 * ads,
						}
					);
					gsap.to(
						char,
						{
							scaleX: 1,
							ease:"back.out",
							duration: .3 * ads,
							delay: i * 0.05 * ads + .1 * ads + .06 * ads,
						}
					);
				}
				break;
			}

			case "rotate": {
				chars.forEach(v=>v.style.transformOrigin = "35% 35%");

				gsap.fromTo(chars,
				{ scale:0, opacity:0 },
				{
					scale:1,
					opacity:1,
					ease:"back.out("+Math.pow(amp, 2)*2.5+")",
					duration:.5 * ads,
					stagger:.025 * ads
				});
				gsap.fromTo(chars,
				{ rotation:(100*amp)+"deg" },
				{
					rotation:0,
					ease:"sine.out",
					duration:.5 * ads,
					stagger:.035 * ads
				});
				break;
			}

			case "neon": {
				chars.forEach(v=>{
					gsap.fromTo(v,
					{ opacity:0 },
					{
						opacity:1,
						ease:"none",
						delay:Math.random() * .25 * amp,
						duration:.5 * ads * Math.random(),
						onUpdate:()=>{
							if(Math.random() > .9) {
								v.style.opacity = Math.random() > .5 ? "1" : ".25";
							}
						},
						onComplete:()=>{
							v.style.opacity = "1";
							if(Math.random() > .35) {
								gsap.from(v,
								{
									immediateRender:false,
									opacity:.35,
									delay:1 * ads * Math.random(),
									ease:"step(5)",
									duration:.2 * ads,
									repeat:Math.floor(1 + Math.random() * 1),
								});
							}
						}
					});
				});
				break;
			}

			case "elastic": {
				let delay = 0;
				chars.forEach(v=>{
					const dist = 100 * amp;
					const angle = Math.random() * Math.PI * 2;
					const ox = Math.cos(angle) * dist;
					const oy = Math.sin(angle) * dist;
					gsap.fromTo(v,
					{ x:ox+"%"},
					{
						x:0,
						ease:"elastic.out("+(amp*1.5)+","+Math.max(.05, ((2-amp)/2*.5 + .1 - ads*.1))+")",
						delay,
						duration:1.5 * ads,
					});
					gsap.fromTo(v,
					{ y:oy+"%"},
					{
						y:0,
						ease:"elastic.out("+(amp*1.5)+","+Math.max(.05, ((2-amp)/2*.5 + .1 - ads*.1))+")",
						delay:delay+.025 * ads,
						duration:1.5 * ads,
					});
					gsap.fromTo(v,
					{ opacity:0 },
					{
						opacity:1,
						ease:"none",
						delay,
						duration:.25 * ads,
					});
					delay += .025 * ads;
				});
				break;
			}
		}
	}

}
export default toNative(OverlayAnimatedText);
</script>

<style scoped lang="less">
.overlayanimatedtext{
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: calc(100vw - 1em);
	text-align: center;

	// :deep(.char),
	// :deep(.word) {
	// 	will-change: transform;
	// }

	:deep(strong) {
		color: v-bind(strongColor)
	}
}
</style>
