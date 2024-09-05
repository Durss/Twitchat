<template>
	<div class="overlaydonationgoals" v-if="state">
		<div class="list">
			<div class="entry" :ref="'goal_'+goal.id"
			v-for="goal in state.params.goalList" :id="goal.id"
			:style="goalToParams[goal.id].styles"
			:key="goal.id"
			:class="{secret:goal.secret && goalToParams[goal.id].current < 1}">
				<span class="amount">{{ goal.amount }}€</span>
				<span class="title">{{ goal.title }}</span>
				<div class="hideTimer" v-if="goalToParams[goal.id].hidePercent > 0" :style="{width:goalToParams[goal.id].hidePercent+'%'}"></div>
			</div>
		</div>
		
		<template v-for="(p, i) in particles">
			<svg v-if="i%2==0" :key="'star_'+i" ref="particle"
			class="particle"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 67.79 64.47">
				<polygon points="33.9 64.47 44.8 43.84 67.79 39.85 51.54 23.1 54.84 0 33.9 10.28 12.95 0 16.25 23.1 0 39.85 22.99 43.84 33.9 64.47"/>
			</svg>
			<svg v-if="i%2==1" :key="'heart_'+i" ref="particle"
			class="particle"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 62.69 59.22">
				<path d="M44.46,0c-5.15,0-9.79,2.14-13.11,5.57-3.32-3.43-7.96-5.57-13.11-5.57C8.16,0,0,8.16,0,18.24c0,17.84,31.35,40.98,31.35,40.98,0,0,31.35-22.75,31.35-40.98C62.69,8.16,54.53,0,44.46,0Z"/>
			</svg>
		</template>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import type { CSSProperties } from 'vue';
import { Component, toNative } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';

@Component({
	components:{},
	emits:[],
})
class OverlayDonationGoals extends AbstractOverlay {
	
	public localRaised:number = 0;
	public state:Parameters<typeof this.overlayParamsHandler>[0]["data"]|null = null;
	public goalToParams:{[goalId:string]:{target:number, current:number, styles:CSSProperties, visible:boolean, hidePercent:number}} = {};
	public particles:{x:number, y:number, r:number, s:number, a:number, v:number}[] = [];
	
	private id:string = "";
	private particlePointer:number = 0;
	
	public get color():string { return this.state?.params.color || "#000000"; }

	public get color_fill():string { return this.color+"30"; }

	public get color_background():string {
		const hsl = Utils.rgb2hsl(parseInt(this.color.replace("#", ""), 16));
		hsl.s *= .6;
		if(hsl.l > .75) hsl.l -= .6;
		else hsl.l += .6;
		hsl.l = Math.max(.1, Math.min(.9, hsl.l));
		hsl.s = Math.max(0, Math.min(1, hsl.s));
		const color = Utils.hsl2rgb(hsl.h, hsl.s, hsl.l).toString(16);
		return "#"+color.padStart(6, "0");
	}

	private overlayParamsHandler!:(e:TwitchatEvent<{params:TwitchatDataTypes.DonationGoalOverlayConfig, goal:number, raisedTotal:number, raisedPersonnal:number}>) => void;

	public beforeMount():void{
		this.id = this.$route.query.twitchat_overlay_id as string ?? "";
		if(this.id) {
			this.overlayParamsHandler = (e) => this.onOverlayParams(e);
			PublicAPI.instance.addEventListener(TwitchatEvent.DONATION_GOALS_OVERLAY_PARAMS, this.overlayParamsHandler);
		}
		this.initParticles();
	}

	public beforeUnmount():void {
		this.killAllTween();
		PublicAPI.instance.removeEventListener(TwitchatEvent.DONATION_GOALS_OVERLAY_PARAMS, this.overlayParamsHandler);
	}

	/**
	 * Requests donation goal params
	 */
	public requestInfo():void {
		PublicAPI.instance.broadcast(TwitchatEvent.GET_DONATION_GOALS_OVERLAY_PARAMS, {overlayId:this.id});
	}

	/**
	 * Called when receiving overlay's params from twitchat
	 */
	public async onOverlayParams(e:Parameters<typeof this.overlayParamsHandler>[0]):Promise<void> {
		const state = e.data;
		if(!state) return;

		this.state = state;
		this.localRaised = state.raisedPersonnal;
		state.params.goalList.sort((a,b)=>a.amount-b.amount);

		//Cleanup old percent caches
		const validIds = state.params.goalList.map(v=>v.id);
		const existingIds = Object.keys(this.goalToParams);
		existingIds.forEach(id=>{
			if(validIds.includes(id)) return;
			delete this.goalToParams[id];
		})

		this.computeStepsPercents();

		await this.$nextTick();

		this.onUpdate();
		this.animateOpen();
	}

	/**
	 * Makes opening animation
	 */
	public animateOpen():void {
		for (let i = 0; i < this.state!.params.goalList.length; i++) {
			const goal = this.state!.params.goalList[i];
			const holder = (this.$refs["goal_"+goal.id] as HTMLDivElement[])[0];
			//Only animate if not already opened
			if(holder.dataset["opened"] == undefined){
				holder.dataset["opened"] = "true";
				gsap.to(holder, {left:"0", ease:"back.out", duration:.7, delay:i*.07})
			}
		}
	}

	/**
	 * Compute relative percent of each goal
	 */
	private computeStepsPercents():void {
		let offset = 0;
		for (let i = 0; i < this.state!.params.goalList.length; i++) {
			const g = this.state!.params.goalList[i];
			const target = Math.min(1, Math.max(0, (this.localRaised-offset)/(g.amount-offset)));
			if(this.goalToParams[g.id]) {
				this.goalToParams[g.id].target = target;
			}else{
				this.goalToParams[g.id] = {
					target,
					current:0,
					hidePercent:0,
					visible:true,
					styles:{
						backgroundPositionX:"100%"
					}
				}
			}
			offset = g.amount;
		}
	}

	/**
	 * Stops all tweens
	 */
	private killAllTween():void {
		if(this.goalToParams) {
			for (const key in this.goalToParams) {
				const p = this.goalToParams[key];
				gsap.killTweensOf(p)
			}
		}

		const particleRefs = this.$refs.particle as HTMLOrSVGElement[];
		if(particleRefs) {
			for (let i = 0; i < this.particles.length; i++) {
				const particle = particleRefs[i];
				gsap.killTweensOf(particle);
			}
		}
	}

	/**
	 * Initializes particles
	 */
	private initParticles():void {
		for (let i = 0; i < 50; i++) {
			this.particles.push({
				a:Math.random() * Math.PI * 2,
				r:Math.random() * Math.PI * 2,
				v:Math.random() * .25 + .05,
				s:(Math.random()-Math.random())*.5 + 1,
				x:0,
				y:0,
			})
		}
	}

	/**
	 * Called when the donation goal changed
	 */
	private async onUpdate():Promise<void> {
		let showCountLeft = this.state?.params.maxDisplayedEntries || 0;
		
		for (let i = 0; i < this.state!.params.goalList.length; i++) {
			const goal = this.state!.params.goalList[i];
			const params = this.goalToParams[goal.id];
			const holder = (this.$refs["goal_"+goal.id] as HTMLDivElement[])[0];
			let display = true;
			if(this.state?.params.limitEntryCount) {
				display = params.target < 1 && (params.target > 0 || showCountLeft >= 0);
			}

			console.log(goal.amount, display)

			if(display && params.visible == false) {
				gsap.killTweensOf(holder);
				params.visible = true;
				holder.style.display = "flex";
				await this.$nextTick();
				gsap.from(holder, {scaleY:0, marginBottom:0, height:0, duration:.5, ease:"back.out", clearProps:"scaleY,marginBottom,height"});
				await Utils.promisedTimeout(500);
			}

			if(params.target != params.current) {
				gsap.killTweensOf(params);
				gsap.to(params, {current:params.target, duration:.75, ease:params.target < 1? "sine.out" : "none", onUpdate:()=>{
					params.styles.backgroundPositionX = (1-params.current)*100+"%";
				}, onStart:()=>{
					params.visible = true;
					holder.style.display = "flex";
				}});

				await Utils.promisedTimeout(750);

				if(params.target == 1) {
					this.burstParticles(goal.id);
					
					await Utils.promisedTimeout(1000);
					
					if(this.state?.params.limitEntryCount) {
						gsap.fromTo(params, {hidePercent:100}, {hidePercent:0, duration:10, ease:"none"});
						gsap.to(holder, {scaleY:0, marginBottom:0, height:0, duration:.5, delay:10, ease:"back.in", display:"none", clearProps:"scaleY,marginBottom,height", onStart:()=>{
							params.visible = false;
						}});
					}
				}

				if(params.target == 1 && goal.secret) {
					await Utils.promisedTimeout(1000);
				}else{
					await Utils.promisedTimeout(350);
				}
			}else

			if(!display) {
				holder.style.display = "none";
				params.visible = false;
			}

			if(display) showCountLeft --;
		}
	}

	/**
	 * Burst particles
	 */
	private burstParticles(goalId:string):void {
		// const goal = this.state?.params.goalList.find(v=>v.id == goalId);
		const holder = (this.$refs["goal_"+goalId] as HTMLDivElement[])[0];
		const bounds = holder.getBoundingClientRect();
		const count = 15;
		
		gsap.killTweensOf(holder);
		gsap.fromTo(holder, {scaleX:1.15}, {scaleX:1, ease:"elastic.out", duration:1, clearProps:"scaleX"});
		gsap.fromTo(holder, {scaleY:1.25}, {scaleY:1, ease:"elastic.out", duration:1, clearProps:"scaleY", delay:.07});

		for (let i = this.particlePointer; i < this.particlePointer + count; i++) {
			const index = i%this.particles.length;
			const percent = (i-this.particlePointer)/count;
			const params = this.particles[index];
			const particle = (this.$refs.particle as HTMLOrSVGElement[])[index];
			gsap.killTweensOf(particle);
			
			params.a = percent*Math.PI*2;
			params.x = bounds.x + bounds.width * .5 + Math.cos(params.a) * bounds.width * .5 * Math.random();
			params.y = bounds.y + bounds.height * .5 + Math.sin(params.a) * bounds.height * .5 * Math.random();
			
			const endX = params.x + Math.cos(params.a) * params.v * bounds.width * .44;
			const endY = params.y + Math.sin(params.a) * params.v * bounds.height * .4;
			const endR = params.r + (Math.random()-Math.random()) * Math.PI;
			const delay = Math.random() * .1;
			const duration = Math.random() * .5 + .75;
			
			gsap.fromTo(particle, {left:params.x, top:params.y, scale:params.s}, {left:endX, top:endY, ease:"sine.out", duration, delay});
			gsap.fromTo(particle, {rotate:params.r+"rad", opacity:1}, {rotate:endR+"rad", ease:"none", duration, opacity:0, delay});
		}
		this.particlePointer += count;
	}

}
export default toNative(OverlayDonationGoals);
</script>

<style scoped lang="less">
.overlaydonationgoals{
	.list {
		display: flex;
		flex-direction: column;
		padding: 100px 0;
		padding: 30px;
	
		.entry {
			gap: 1em;
			display: flex;
			flex-direction: row;
			color: v-bind(color);
			background-color: v-bind(color_background);
			background-image: linear-gradient(90deg, v-bind(color_fill) 50%, transparent 50%);
			background-position-x: 100%;
			background-size: 200%;
			align-items: center;
			padding: .5em;
			border-radius: var(--border-radius);
			width: 500px;
			border-bottom: .3em solid v-bind(color);
			// box-shadow: 0 .3em 0px v-bind(color);
			position: relative;
			left: calc(-500px - 30px);
			overflow: hidden;
			.amount {
				font-weight: bold;
				font-size: 2.5em;
				// flex-basis: 2em;
				flex-shrink: 0;
			}
			.title {
				white-space: pre-line;
				font-size: 1.5em;
				text-align: center;
				flex-grow: 1;
				font-weight: bold;
				transition: filter 2.5s;
			}

			.hideTimer {
				position: absolute;
				bottom: 0;
				left: 0;
				height: 5px;
				background: v-bind(color);
				opacity: .5;
				width: 50%;
			}

			&.secret {
				.title {
					filter: blur(8px);
				}
			}
			&:not(:last-child) {
				margin-bottom: 1em;
			}
		}
	}

	.particle {
		top: 200%;
		left: 200%;
		width: 2em;
		height: 2em;
		position: absolute;
		color: v-bind(color);
		transform-origin: center;
		transform: translate(-50%, -50%);
		&:nth-child(odd) {
			color: v-bind(color_background);
		}
		path, polygon {
			fill:currentColor;
		}
	}
}
</style>