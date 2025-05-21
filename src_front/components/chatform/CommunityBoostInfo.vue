<template>
	<div class="communityboostinfo" v-tooltip="$t('global.tooltips.boost')" @click="smallMode=!smallMode">
		<div class="col">
			<Icon name="boost" alt="boost" />{{roundProgressPercent}}%
		</div>
		<div class="col count" v-if="!smallMode">
			<p>{{roundProgressValue}}</p>
			<p>{{target}}</p>
		</div>
	</div>
</template>

<script lang="ts">
import { watch } from '@vue/runtime-core';
import { gsap } from 'gsap/gsap-core';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
	}
})
class CommunityBoostInfo extends Vue {

	public interpolatedPercent = 0;
	public interpolatedProgress = 0;
	public smallMode = false;

	public get roundProgressPercent():number { return Math.floor(this.interpolatedPercent); }
	public get roundProgressValue():number { return Math.floor(this.interpolatedProgress); }

	public get progress():number {
		let communityBoostState = this.$store.stream.communityBoostState;
		if(!communityBoostState) return 0;
		return communityBoostState.progress;
	}

	public get target():number {
		let communityBoostState = this.$store.stream.communityBoostState;
		if(!communityBoostState) return 0;
		return communityBoostState.goal;
	}

	public get percent():number {
		if(!this.$store.stream.communityBoostState) return 0;
		return Math.round(this.progress/this.target * 100);
	}

	public mounted():void {
		watch(()=>this.percent, () =>{
			this.interpolate();
		});
		this.interpolate();
	}
	public interpolate():void {
		gsap.killTweensOf(this);
		gsap.to(this, {duration:1, interpolatedPercent:this.percent, ease:"sine.inOut"});
		gsap.to(this, {duration:1, interpolatedProgress:this.progress, ease:"sine.inOut"});
	}
}
export default toNative(CommunityBoostInfo);
</script>

<style scoped lang="less">
.communityboostinfo{
	display: flex;
	flex-direction: row;
	align-items: center;
	white-space: nowrap;
	color: var(--color-light);
	margin-left: 5px;
	font-size: 14px;
	padding: 5px;
	border-radius: 5px;
	background-color: darken(#00f0f0, 20%);
	font-family: var(--font-azeret);
	cursor:pointer;

	.icon {
		height: .9em;
		margin-right: 2px;
	}

	.count {
		display: flex;
		flex-direction: column;
		font-size: 10px;
		margin-left: 5px;
		align-items: center;
		p:nth-child(2) {
			border-top: 1px solid var(--color-light);
		}
	}
}
</style>
