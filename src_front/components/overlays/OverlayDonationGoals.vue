<template>
	<div class="overlaydonationgoals" v-if="state">
		<div class="list">
			<!-- <div class="entry" :ref="'goal_'+goal.id"
			v-for="goal in state.params.goalList"
			:style="goalToParams[goal.id].styles"
			:key="goal.id"
			:class="{secret:goal.secret && goalToParams[goal.id].currentPercent < 1}">
				<span class="amount">{{ goal.amount }}€</span>
				<span class="title">{{ goal.title }}</span>
				<div class="hideTimer" v-if="goalToParams[goal.id].hidePercent > 0" :style="{width:goalToParams[goal.id].hidePercent+'%'}"></div>
			</div> -->
			<template v-for="(goal, index) in state.params.goalList" :key="goal.id">
				<OverlayDonationGoalItem class="entry"
					:ref="'goal_'+goal.id"
					:overlayParams="state.params"
					:color="color"
					:index="index"
					:data="goalToParams[goal.id]"
					@complete="burstParticles(goal.id)" />
			</template>
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
import { gsap } from 'gsap/gsap-core';
import { Component, toNative } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import OverlayDonationGoalItem from './donation_goals/OverlayDonationGoalItem.vue';

@Component({
	components:{
		OverlayDonationGoalItem,
	},
	emits:[],
})
class OverlayDonationGoals extends AbstractOverlay {
	
	public localRaised:number = 0;
	public state:Parameters<typeof this.overlayParamsHandler>[0]["data"]|null = null;
	public goalToParams:{[goalId:string]:TwitchatDataTypes.DonationGoalOverlayItem} = {};
	public particles:{x:number, y:number, r:number, s:number, a:number, v:number}[] = [];
	
	private id:string = "";
	private particlePointer:number = 0;
	
	public get color():string { return this.state?.params.color || "#000000"; }

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
		
		this.buildLocalParams();
		
		await this.$nextTick();
	}

	/**
	 * Compute relative percent of each goal
	 */
	private buildLocalParams():void {
		let offset = 0;
		for (let i = 0; i < this.state!.params.goalList.length; i++) {
			const g = this.state!.params.goalList[i];
			const target = Math.min(1, Math.max(0, (this.localRaised-offset)/(g.amount-offset)));
			if(this.goalToParams[g.id]) {
				this.goalToParams[g.id].percent = target;
				this.goalToParams[g.id].goalItem = g;
			}else{
				this.goalToParams[g.id] = {
					percent:target,
					hidePercent:0,
					visible:true,
					goalItem:g,
					distanceToCurrentIndex:0,
				}
			}
			offset = g.amount;
		}

		//Find current goal
		let currentIndex = 0;
		for (let i = 0; i < this.state!.params.goalList.length; i++) {
			const g = this.state!.params.goalList[i];
			const p = this.goalToParams[g.id];
			if(p.percent > 0 && p.percent < 1) {
				currentIndex = i;
				break;
			}
		}
		
		//Compute distances to current goal
		//Used to only show the N next items to current goal
		if(this.state?.params.limitEntryCount) {
			for (let i = 0; i < this.state!.params.goalList.length; i++) {
				const g = this.state!.params.goalList[i];
				const p = this.goalToParams[g.id];
				p.distanceToCurrentIndex = i - currentIndex;
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
	 * Burst particles
	 */
	public burstParticles(goalId:string):void {
		// const goal = this.state?.params.goalList.find(v=>v.id == goalId);
		const holder = (this.$refs["goal_"+goalId] as Vue[])[0].$el;
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
		.entry:not(:last-child) {
			margin-bottom: .5em;
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
			// color: v-bind(color_background);
		}
		path, polygon {
			fill:currentColor;
		}
	}
}
</style>