<template>
	<div :class="{overlaydonationgoals:true, show:show}" v-if="state">
		<div class="list" ref="list">
			<template v-for="(goal, index) in state.params.goalList" :key="goal.id">
				<OverlayDonationGoalItem class="entry"
				:ref="'goal_'+goal.id"
				:overlayParams="state.params"
				:colors="{base:color, fill:color_fill, background:color_background}"
				:skin="state.skin"
				:index="index"
				:currentValue="localRaised"
				:data="goalToParams[goal.id]"
				:id="currentIndex == index? 'item current_donation_goal' : 'item '">
					<OverlayDonationGoalAlert
					class="notification"
					id="notification"
					ref="notification"
					v-if="currentIndex == index && currentAlert"
					:skin="state.skin"
					:amount="currentAlert?.amount"
					:username="currentAlert?.username"
					:currency="state.params.currency"
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
import { gsap } from 'gsap/gsap-core';
import { Component, toNative } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import OverlayDonationGoalAlert from './donation_goals/OverlayDonationGoalAlert.vue';
import OverlayDonationGoalItem from './donation_goals/OverlayDonationGoalItem.vue';

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
	public currentAlert:IAlertItem | null = null;
	
	private id:string = "";
	private scrollTimeout:number = -1;
	private autoHideTimeout:number = -1;
	private poolAlerts:IAlertItem[] = [];
	
	private overlayParamsHandler!:(e:TwitchatEvent<{params:TwitchatDataTypes.DonationGoalOverlayConfig, goal:number, raisedTotal:number, raisedPersonnal:number, skin:"default"|string}>) => void;
	private donationHandler!:(e:TwitchatEvent<{overlayId:string, username:string, amount:string}>) => void;
	
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
			this.onDonation(new TwitchatEvent("DONATION_EVENT", {amount, username, overlayId:this.id}));
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
		//Not an event for this overlay, ignore it
		if(state.params.id != this.id) return;

		//Deeply check if something changed.
		//If not, ignore that update.
		//This happens when twitchat refreshes the list of currently active subs.
		//Sub count my not have changed but it will still trigger an oevrlay update
		if(this.state) {
			if(Utils.deepEqual(this.state, state)) return;
		}
		
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
		if(e.data.overlayId != this.id) return;//Not for this overlay
		
		//Show list if necessary
		if(this.state!.params.autoDisplay && !this.show) {
			this.show = true;
			await Utils.promisedTimeout(500);
		}else{
			this.show = true;
		}

		if(this.state!.params.notifyTips) {
			this.poolAlerts.push({username:e.data!.username, amount:e.data!.amount});
			if(this.poolAlerts.length == 1) this.showNextAlert();
		}
		
		this.onActivity();
	}

	/**
	 * Called when an activty occurs.
	 */
	public onActivity():void {
		this.show = true;

		if(!this.state) return;
		
		clearTimeout(this.autoHideTimeout);
		if(this.state!.params.autoDisplay === true) {
			//Schedule hide
			this.autoHideTimeout = window.setTimeout(() => this.show = false , 10000);
		}

		if(this.state.params.hideDone === true || this.state.params.limitEntryCount === true) {
			const list = this.$refs.list as HTMLDivElement;
			gsap.set(list, {y:0});
			return;
		}

		//If showing the full list, scroll to the currently active goal
		clearTimeout(this.scrollTimeout);
		this.scrollTimeout = window.setTimeout(()=>{
			const list = this.$refs.list as HTMLDivElement;
			const boundsRef = list.getBoundingClientRect();
			const item = document.querySelector("#current_donation_goal");
			if(!item) {
				window.setTimeout(() => {
					this.onActivity();
				}, 100);
				return;
			}
			const bounds = item?.getBoundingClientRect();
			const maxPos = document.body.clientHeight * .5;
			let y = bounds.y + bounds.height/2 - boundsRef.y;
			
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

	/**
	 * Show next event
	 */
	private async showNextAlert():Promise<void> {
		if(this.poolAlerts.length === 0) return;

		this.currentAlert = this.poolAlerts[0]!;
		await this.$nextTick();
		let holder = this.$refs.notification as HTMLElement | Vue[];
		if(Array.isArray(holder)) holder = holder[0].$el as HTMLElement;
		
		//Show notification
		gsap.fromTo(holder, {y:"100%"}, {y:"0%", duration:.15, ease:"sine.out", onComplete:()=>{
			let showDuration = Math.max(.15, 10 - Math.pow(this.poolAlerts.length, .75));
			//Holder might have changed between show and hide
			let holder = this.$refs.notification as HTMLElement | Vue[];
			if(Array.isArray(holder) && holder.length > 0) holder = holder[0].$el as HTMLElement;
			if(!holder) return;
			//Hide notification
			gsap.fromTo(holder, {y:"0%"}, {y:"100%", duration:.15, delay:showDuration, ease:"sine.out",
			onComplete:()=>{
				this.currentAlert = null;
				this.poolAlerts.shift();
				this.showNextAlert();
			}});
		}});
	}
}
export default toNative(OverlayDonationGoals);
interface IAlertItem {
	username:string;
	amount:string;
}
</script>

<style scoped lang="less">
.overlaydonationgoals{
	padding-top: 1em;
	.list {
		opacity: 0;
		height: 100vh;
		display: flex;
		flex-direction: column;
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

	.notification {
		position: absolute;
		bottom: 0;
		right: 0;
		transform: translate(0, 0%);
		z-index: 1;
	}
}
</style>