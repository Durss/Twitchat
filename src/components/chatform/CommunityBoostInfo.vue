<template>
	<div class="communityboostinfo" data-tooltip="Channel boosted" @click="smallMode=!smallMode">
		<div class="col">
			<img src="@/assets/icons/boost.svg" alt="boost">{{roundProgressPercent}}%
		</div>
		<div class="col count" v-if="!smallMode">
			<p>{{roundProgressValue}}</p>
			<p>{{target}}</p>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{}
})
export default class CommunityBoostInfo extends Vue {

	public interpolatedPercent = 0;
	public interpolatedProgress = 0;
	public smallMode = false;
	
	public get roundProgressPercent():number { return Math.floor(this.interpolatedPercent); }
	public get roundProgressValue():number { return Math.floor(this.interpolatedProgress); }

	public get progress():number {
		if(!StoreProxy.stream.communityBoostState) return 0;
		if(StoreProxy.stream.communityBoostState.total_goal_progress != undefined) {
			return StoreProxy.stream.communityBoostState.total_goal_progress;
		}
		const order = StoreProxy.stream.communityBoostState.boost_orders[0];
		return order.GoalProgress;
	}

	public get target():number {
		if(!StoreProxy.stream.communityBoostState) return 0;
		if(StoreProxy.stream.communityBoostState.total_goal_target != undefined) {
			return StoreProxy.stream.communityBoostState.total_goal_target;
		}
		const order = StoreProxy.stream.communityBoostState.boost_orders[0];
		return order.GoalTarget;
	}

	public get percent():number {
		if(!StoreProxy.stream.communityBoostState) return 0;
		return Math.round(this.progress/this.target * 100);
	}

	public mounted():void {
		watch(()=>this.percent, () =>{
			this.interpolate();
		}, {deep:true});
		this.interpolate();
	}
	public interpolate():void {
		gsap.killTweensOf(this);
		gsap.to(this, {duration:1, interpolatedPercent:this.percent, ease:"sine.inOut"});
		gsap.to(this, {duration:1, interpolatedProgress:this.progress, ease:"sine.inOut"});
	}
}
</script>

<style scoped lang="less">
.communityboostinfo{
	display: flex;
	flex-direction: row;
	align-items: center;
	white-space: nowrap;
	color: @mainColor_light;
	margin-left: 5px;
	font-size: 14px;
	padding: 5px;
	border-radius: 5px;
	background-color: darken(#00f0f0, 20%);
	font-family: 'Azeret';
	cursor:pointer;

	img {
		height: .9em;
		margin-right: 2px;
	}

	.count {
		display: flex;
		flex-direction: column;
		font-size: 9px;
		margin-left: 5px;
		align-items: center;
		p:nth-child(2) {
			border-top: 1px solid @mainColor_light;
		}
	}
}
</style>