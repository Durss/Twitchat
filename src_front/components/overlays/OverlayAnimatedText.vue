<template>
	<div class="overlayanimatedtext"
	v-if="params"
	:style="{
		fontFamily: params.textFont,
		fontSize: params.textSize+'px',
		color:params.colorBase,
		opacity:ready? '1' : '0',
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
	public ready:boolean = false;
	public params!:TwitchatDataTypes.AnimatedTextData;
	public strongColor:string = "inherit";

	private id:string = "";
	private configHandler!:(e:TwitchatEvent<TwitchatDataTypes.AnimatedTextData>)=>void;
	private textHandler!:(e:TwitchatEvent<{id:string, text:string}>)=>void;
	private messageQueue:string[] = [];
	private raf = -1;
	private resolveTO = -1;
	private split:SplitType|null = null;

	public beforeMount():void {
		this.id = this.$route.query.twitchat_overlay_id as string ?? "";

		this.textHandler = (e)=>this.onText(e);
		this.configHandler = (e)=>this.onConfig(e);

		PublicAPI.instance.addEventListener(TwitchatEvent.ANIMATED_TEXT_SET, this.textHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.ANIMATED_TEXT_CONFIGS, this.configHandler);
	}

	public mounted(): void {
		// this.messageQueue.push("Coucou <strong>ceci</strong> est un test");
		this.messageQueue.push("Coucou <strong>ceci</strong> est un test Coucou <strong>ceci</strong> est un test Coucou <strong>ceci</strong> est un test Coucou <strong>ceci</strong> est un test Coucou <strong>ceci</strong> est un test Coucou <strong>ceci</strong> est un test Coucou <strong>ceci</strong> est un test Coucou <strong>ceci</strong> est un test Coucou <strong>ceci</strong> est un test Coucou <strong>ceci</strong> est un test Coucou <strong>ceci</strong> est un test Coucou <strong>ceci</strong> est un test ");
		// this.messageQueue.push("Coucou");
		this.next();
	}

	public beforeUnmount():void {
		clearTimeout(this.resolveTO);
		cancelAnimationFrame(this.raf);
		super.beforeUnmount();
		PublicAPI.instance.removeEventListener(TwitchatEvent.ANIMATED_TEXT_SET, this.textHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.ANIMATED_TEXT_CONFIGS, this.configHandler);
		this.split?.chars?.forEach(char=> {
			gsap.killTweensOf(char);
		})
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
				clearTimeout(this.resolveTO);
				this.split?.chars?.forEach(char=> {
					gsap.killTweensOf(char);
				})
				if(this.raf > -1) cancelAnimationFrame(this.raf);
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
		console.log("NEXT");
		this.ready = false;
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
		return new Promise((resolve) => {
			this.split = new SplitType(this.$refs["text"] as HTMLElement, {split:["words","chars"], charClass:"char", wordClass:"word"})
			const ads = 2 - this.params.animDurationScale;
			const amp = this.params.animStrength;
			const chars = this.split.chars || [];
			this.ready = true;

			if(this.raf > -1) cancelAnimationFrame(this.raf);

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
						stagger:.025 * ads,
						onComplete:() => {
							this.resolveTO = window.setTimeout(() => {
								resolve()
							}, 250)
						}
					});
					break;
				}

				case "typewriter": {
					let delay = 0;
					for (let i = 0; i < chars.length; i++) {
						const char = chars[i];
						char.style.opacity = "0";
						window.setTimeout(()=>{
							char.style.opacity = "1";
						}, delay * 1000);
						delay += ads * (Math.random() * Math.random() * .2);
						if (char === char.parentElement?.lastElementChild) {
							delay += ads * .3 * Math.random();
						}
					}
					this.resolveTO = window.setTimeout(() => {
						resolve()
					}, delay * 1000);
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
						stagger:.025 * ads,
						onComplete:() => {
							this.resolveTO = window.setTimeout(() => {
								resolve()
							}, 250)
						}
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
						const delay = i * 0.05 * ads + .1 * ads + .06 * ads;
						gsap.to(
							char,
							{
								scaleY: 1,
								ease:"back.out("+Math.pow(amp, 2)*2.5+")",
								duration: .3 * ads,
								delay,
							}
						);
						gsap.to(
							char,
							{
								scaleX: 1,
								ease:"back.out",
								duration: .3 * ads,
								delay,
							}
						);
						if(i === chars.length-1) {
							this.resolveTO = window.setTimeout(() => {
								resolve()
							}, (delay + .3) * 1000)
						}
					}
					break;
				}

				case "rotate": {
					chars.forEach(v=>v.style.transformOrigin = "10% 10%");

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
						ease:"back.out",
						duration:.5 * ads,
						delay:.1,
						stagger:.025 * ads,
						onComplete:() => {
							this.resolveTO = window.setTimeout(() => {
								resolve()
							}, 350)
						}
					});
					break;
				}

				case "neon": {
					chars.forEach((v, index)=>{
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
										duration:.2 * amp,
										repeat:Math.floor(Math.random()* Math.pow(amp, 3)),
									});
								}
							}
						});
						if(index === chars.length-1) {
							this.resolveTO = window.setTimeout(() => {
								resolve()
							}, (.5 * ads + .5 * amp) * 1000)
						}
					});
					break;
				}

				case "elastic": {
					let delay = 0;
					chars.forEach((v, index)=>{
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

						if(index === chars.length-1) {
							this.resolveTO = window.setTimeout(() => {
								resolve()
							}, (1.5 * ads + delay) * 1000)
						}
					});
					break;
				}

				case "swarm": {
					const bounds = this.$el.getBoundingClientRect();
					const points = chars.map(char => {
						const rect = char.getBoundingClientRect();
						return {
							x: rect.left,
							y: rect.top,
							dir: Math.random() * Math.PI * 2,
							speed: (Math.random() + .25) * 5 * amp,
							dirInc: (Math.random()-Math.random()) * amp * .2,
						};
					});
					const leader = {x:bounds.left, y:bounds.height/2.5};
					chars.forEach(char => {
						char.style.position = "fixed";
						char.style.left = `${leader.x}px`;
						char.style.top = `${leader.y}px`;
						char.style.willChange = "left, top";
					});

					const leaderSpeed = 2 + 8 * (2-ads);
					let leaderAngle = Math.random() * Math.PI * 2;
					let leaderAmp = 25 * amp;

					// const refPoint = document.createElement("div");
					// refPoint.style.position = "fixed";
					// refPoint.style.width = "15px";
					// refPoint.style.height = "15px";
					// refPoint.style.borderRadius = "50%";
					// refPoint.style.backgroundColor = "red";
					// refPoint.style.left = `${points[0].x}px`;
					// refPoint.style.top = `${points[0].y}px`;
					// this.$el.appendChild(refPoint);
					const angleDistance = (angle1: number, angle2: number):number => {
						const angle = Math.abs((angle1 - angle2 + Math.PI) % (Math.PI*2) - Math.PI);
						return angle;
					}
					const renderFrame = () => {
						this.raf = requestAnimationFrame(() => renderFrame());

						let placed = Array(chars.length).fill(false);
						for (let i = 0; i < chars.length; i++) {
							// if(i < chars.length-1) continue
							const char = chars[i];
							const target = points[i];
							let currX = parseFloat(char.style.left);
							let currY = parseFloat(char.style.top);

							if (leader.x <= target.x) {
								// Follow the leader
								target.dir += target.dirInc;
								currX += (leader.x - currX) * 0.2;
								currY += (leader.y - currY + Math.sin(leaderAngle) * leaderAmp) * 0.2;
								char.style.left = `${currX + Math.cos(target.dir) * target.speed}px`;
								char.style.top = `${currY + Math.sin(target.dir) * target.speed}px`;
							} else {
								// Gradually move to final position
								const angle = Math.atan2(target.y - currY, target.x - currX);
								target.dir += angleDistance(target.dir, angle) * Math.max(.1, (2-ads)/2 * .2);
								const dist = Math.sqrt(Math.pow(target.x - currX, 2) + Math.pow(target.y - currY, 2));
								if(dist <= target.speed * 20) {
									target.speed *= .98;
								}
								if(dist <= target.speed*2 + .5) {
									char.style.left = `${target.x}px`;
									char.style.top = `${target.y}px`;
									placed[i] = true;
								}else{
									currX += Math.cos(target.dir) * target.speed;
									currY += Math.sin(target.dir) * target.speed;
									char.style.left = `${currX}px`;
									char.style.top = `${currY}px`;
								}
							}
						}

						const dir = Math.atan2(bounds.height/2 - leader.y, bounds.width - leader.x);
						leader.x += Math.cos(dir) * leaderSpeed;
						leader.y += Math.sin(dir) * leaderSpeed;

						leaderAngle += (2-ads) * .25;

						// refPoint.style.left = `${leader.x}px`;
						// refPoint.style.top = `${leader.y + Math.sin(randAngle) * randAmp}px`;

						if (placed.every(p => p)) {
							resolve();
						}
					};
					renderFrame();
				}
			}
		})
	}

}
export default toNative(OverlayAnimatedText);
</script>

<style scoped lang="less">
.overlayanimatedtext{
	position: absolute;
	// top: 50%;
	left: 50%;
	transform: translate(-50%, 0);
	width: 100%;
	text-align: center;
	padding: .5em;

	// :deep(.char),
	// :deep(.word) {
	// 	will-change: transform;
	// }

	:deep(strong) {
		color: v-bind(strongColor)
	}
}
</style>
