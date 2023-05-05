<template>
	<div class="rewardslist blured-background">
		<div v-if="rewards.length == 0" class="loader">
			<img src="@/assets/loader/loader.svg" alt="loader">
			<p>loading...</p>
		</div>

		<h1 v-if="rewards.length > 0">Manage rewards</h1>

		<div class="list" v-if="rewards.length > 0">
			<div v-for="r in rewards" :key="r.id"
			:class="getRewardClasses(r)"
			@click="selectReward()">
				<img :src="getRewardIcon(r)" alt="">
				<p class="cost">{{r.cost}}</p>
				<p class="title">{{r.title}}</p>
				<ToggleButton class="toggle" small v-model="r.is_enabled" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';
import ToggleButton from '../ToggleButton.vue';

@Component({
	components:{
		ToggleButton,
	}
})
/**
 * This displays all the user's rewards.
 * 
 * This is, to date, actually NOT USED.
 * There is no API to redeem a reward and the API that
 * allows to enable/disable a reward is super restrictive.
 * An app can only update a reward it has created.
 */
export default class RewardsList extends Vue {

	public rewards:TwitchDataTypes.Reward[] = [];

	private clickHandler!:(e:MouseEvent) => void;

	public getRewardIcon(r:TwitchDataTypes.Reward):string {
		if(r.image?.url_2x) return r.image.url_1x;
		return r.default_image.url_1x;
	}

	public getRewardClasses(r:TwitchDataTypes.Reward):string[] {
		const res = ["item"];
		if(!r.is_enabled) res.push("disabled");
		return res;
	}

	public async mounted():Promise<void> {
		try {
			this.rewards = await TwitchUtils.getRewards();
		}catch(e) {
			//User is probably not an affiliate
			this.rewards = [];
			return;
		}
		// this.rewards = this.rewards.filter(v => v.is_enabled);
		this.rewards.sort((a, b) => a.cost - b.cost);
		this.rewards.forEach(v=> {
			//Watch for "enabled" state change
			watch(() => v, () => {
				TwitchUtils.setRewardEnabled(v.id, v.is_enabled);
			}, { deep: true });
		})
		
		await this.$nextTick();
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		this.open();
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	public selectReward():void {
		//No API exists to redeem a reward yet :(
	}

	private open():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.2, scaleX:0, delay:.1, clearProps:"scaleX", ease:"back.out"});
		gsap.from(ref, {duration:.3, scaleY:0, clearProps:"scaleY", ease:"back.out"});
	}

	private close():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.to(ref, {duration:.3, scaleX:0, ease:"back.in"});
		gsap.to(ref, {duration:.2, scaleY:0, delay:.1, clearProps:"scaleY, scaleX", ease:"back.in", onComplete:() => {
			this.$emit("close");
		}});
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.close();
		}
	}
}
</script>

<style scoped lang="less">
.rewardslist{
	h1 {
		color: var(--color-light);
		align-self: center;
		margin-bottom: 10px;
	}

	.loader {
		margin: auto;
		text-align: center;
		img {
			width: 30px;
			height: 30px;
		}
		p {
			color: #fff;
			font-style: italic;
			font-size: 16px;
		}
	}

	.list {
		height: 400px;
		width: 320px;
		max-width: 100%;
		max-height: 80%;
		overflow-x: hidden;
		overflow-y: auto;

		display: flex;
		flex-direction: row;
		flex-wrap: wrap;

		.item {
			display: flex;
			flex-direction: column;
			width: 100px;
			background-color: var(--color-dark-light);
			border-radius: 5px;
			align-items: center;
			margin-bottom: 5px;
			padding: 10px 0;
			min-height: 120px;
			transition: background-color .2s;
			// cursor: pointer;
			
			img, .cost, .title {
				transition: opacity .2s;
			}

			&.disabled {
				img, .cost, .title {
					opacity: .35;
				}
			}

			&:not(:nth-child(3n)) {
				margin-right: 5px;
			}

			img {
				height: 28px;
				margin: 10px;
			}
			
			.cost {
				font-size: 10px;
				padding: 5px;
				border-radius: 5px;
				background-color: var(--color-dark);
				color: var(--color-light);
				margin-bottom: 5px;
			}

			.title {
				color: var(--color-light);
				font-size: 13px;
				text-align: center;
				margin-bottom: 5px;
				flex-grow: 1;
			}
		}
	}
	
}
</style>