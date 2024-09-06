<template>
	<div :class="{overlaydonationgoals:true, show:show}" v-if="state">
		<div class="list" ref="list">
			<template v-for="(goal, index) in state.params.goalList" :key="goal.id">
				<OverlayDonationGoalItem class="entry"
				:ref="'goal_'+goal.id"
				:overlayParams="state.params"
				:colors="{base:color, fill:color_fill, background:color_background}"
				:index="index"
				:data="goalToParams[goal.id]"
				:id="currentIndex == index? 'current_donation_goal' : ''">
					<OverlayDonationGoalAlert
					ref="notifications"
					@activity="onActivity"
					v-show="currentIndex == index"
					:colors="{base:color, fill:color_fill, background:color_background}"
					/>
				</OverlayDonationGoalItem>
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { Component, toNative } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import OverlayDonationGoalAlert from './donation_goals/OverlayDonationGoalAlert.vue';
import {type OverlayDonationGoalAlertClass} from './donation_goals/OverlayDonationGoalAlert.vue';
import OverlayDonationGoalItem from './donation_goals/OverlayDonationGoalItem.vue';
import { gsap } from 'gsap/gsap-core';

@Component({
	components:{
		OverlayDonationGoalItem,
		OverlayDonationGoalAlert,
	},
	emits:[],
})
class OverlayDonationGoals extends AbstractOverlay {
	
	public show = false;
	public localRaised:number = 0;
	public currentIndex:number = -1;
	public state:Parameters<typeof this.overlayParamsHandler>[0]["data"]|null = null;
	public goalToParams:{[goalId:string]:TwitchatDataTypes.DonationGoalOverlayItem} = {};
	
	private id:string = "";
	private scrollTimeout:number = -1;
	private autoHideTimeout:number = -1;
	
	private overlayParamsHandler!:(e:TwitchatEvent<{params:TwitchatDataTypes.DonationGoalOverlayConfig, goal:number, raisedTotal:number, raisedPersonnal:number}>) => void;
	private donationHandler!:(e:TwitchatEvent<{username:string, amount:string}>) => void;
	
	public get color():string { return this.state!.params.color || "#000000"; }
	
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

	public beforeMount():void{
		this.id = this.$route.query.twitchat_overlay_id as string ?? "";
		if(this.id) {
			this.overlayParamsHandler = (e) => this.onOverlayParams(e);
			this.donationHandler = (e) => this.onDonation(e);
			PublicAPI.instance.addEventListener(TwitchatEvent.DONATION_EVENT, this.donationHandler);
			PublicAPI.instance.addEventListener(TwitchatEvent.DONATION_GOALS_OVERLAY_PARAMS, this.overlayParamsHandler);
		}

		//@ts-ignore
		window.raise = (amount:number)=>{
			this.onOverlayParams(new TwitchatEvent("DONATION_GOALS_OVERLAY_PARAMS", {
				...this.state!,
				raisedPersonnal:this.state!.raisedPersonnal + amount,
			}));
		}
		
		//@ts-ignore
		window.donationEvent = (amount:string, username:string)=>{
			this.onDonation(new TwitchatEvent("DONATION_EVENT", {amount, username}));
		}
	}

	public beforeUnmount():void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.DONATION_EVENT, this.donationHandler);
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
		
		//Show list if necessary
		if(state!.params.autoDisplay && !this.show) {
			this.show = true;
			await Utils.promisedTimeout(500);
		}else{
			this.show = true;
		}
		
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

		this.onActivity();
	}

	/**
	 * Called when receiving a donation
	 */
	public async onDonation(e:Parameters<typeof this.donationHandler>[0]):Promise<void> {
		if(!e.data) return;
		
		//Show list if necessary
		if(this.state!.params.autoDisplay && !this.show) {
			this.show = true;
			await Utils.promisedTimeout(500);
		}else{
			this.show = true;
		}

		if(this.state!.params.notifyTips) {
			const components = this.$refs.notifications as OverlayDonationGoalAlertClass[];
			components.forEach(c => {
				c.onEvent(e.data!.username, e.data!.amount);
			});
		}
		
		this.onActivity();
	}

	/**
	 * Called when an activty occurs.
	 */
	public onActivity():void {
		this.show = true;

		if(!this.state) return;
		
		if(this.state!.params.autoDisplay === true) {
			//Schedule hide
			clearTimeout(this.autoHideTimeout);
			this.autoHideTimeout = setTimeout(() => this.show = false , 10000);
		}

		if(this.state.params.hideDone === true) return;
		if(this.state.params.limitEntryCount === true) return;

		//If showing the full list, scroll to the currently active goal
		clearTimeout(this.scrollTimeout);
		this.scrollTimeout = setTimeout(()=>{
			const list = this.$refs.list as HTMLDivElement;
			const boundsRef = list.getBoundingClientRect();
			const item = document.querySelector("#current_donation_goal");
			if(!item) {
				setTimeout(() => {
					this.onActivity();
				}, 100);
				return;
			}
			const bounds = item?.getBoundingClientRect();
			const maxPos = document.body.clientHeight * .5;
			let y = bounds.y - boundsRef.y;
			
			if(y > maxPos) {
				gsap.to(list, {y:-y+maxPos, duration:1});
			}else{
				gsap.set(list, {y:0});
			}
		}, 500);
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
					completed_at:0,
					visible:true,
					goalItem:g,
					distanceToCurrentIndex:0,
					closing:false,
				}
			}
			offset = g.amount;
		}

		//Find current goal
		this.currentIndex = -1;
		for (let i = 0; i < this.state!.params.goalList.length; i++) {
			const g = this.state!.params.goalList[i];
			const p = this.goalToParams[g.id];
			if(p.percent >= 1) continue;
			this.currentIndex = i;
			break;
		}
		
		//Compute distances to current goal
		//Used to only show the N next items to current goal
		for (let i = 0; i < this.state!.params.goalList.length; i++) {
			const g = this.state!.params.goalList[i];
			const p = this.goalToParams[g.id];
			p.distanceToCurrentIndex = i - this.currentIndex;
		}
	}
}
export default toNative(OverlayDonationGoals);
</script>

<style scoped lang="less">
.overlaydonationgoals{
	.list {
		opacity: 0;
		height: 100vh;
		display: flex;
		flex-direction: column;
		padding-left: 20px;
		align-items: flex-start;
		transition: opacity .5s;
		.entry:not(:last-child) {
			margin-bottom: .5em;
		}
	}

	&.show {
		.list {
			opacity: 1;
		}
	}
}
</style>