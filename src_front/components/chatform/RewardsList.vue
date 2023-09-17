<template>
	<div class="rewardslist blured-background-window">
		<div v-if="loading" class="loader">
			<Icon class="loader" name="loader" />
			<p>{{ $t("global.loading") }}</p>
		</div>

		<template v-else>
			<div class="scrollable" v-if="manageableRewards.length > 0 || allRewards.length > 0">
				<div class="list">
					<h1>{{ $t("rewards.manage.title") }}</h1>
					<div v-for="r in manageableRewards" :key="r.id"
					:class="getRewardClasses(r)">
						<div class="infos" :style="getRewardStyles(r)">
							<img :src="getRewardIcon(r)" alt="">
							<p class="cost">{{r.cost}}</p>
						</div>
						<p class="title">{{r.title}}</p>
						<ToggleButton class="toggle" small v-model="r.is_enabled" @change="updateRewardState(r)" />
					</div>
					<div class="empty" v-if="manageableRewards.length == 0">{{ $t("rewards.manage.empty") }}</div>
				</div>
				
				<div class="list">
					<h1>{{ $t("rewards.manage.not_manageable_title") }}</h1>
					<p>{{ $t("rewards.manage.not_manageable_description") }}</p>
					<div v-for="r in allRewards" :key="r.id"
					class="item disabled">
						<div class="infos" :style="getRewardStyles(r)">
							<img :src="getRewardIcon(r)" alt="">
							<p class="cost">{{r.cost}}</p>
						</div>
						<p class="title">{{r.title}}</p>
					</div>
				</div>
			</div>
			<div class="empty" v-else>{{ $t("rewards.manage.empty") }}</div>
		</template>
	</div>
</template>

<script lang="ts">
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import ToggleButton from '../ToggleButton.vue';
import type { StyleValue } from 'vue';

@Component({
	components:{
		Icon,
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

	public loading:boolean = true;
	public allRewards:TwitchDataTypes.Reward[] = [];
	public manageableRewards:TwitchDataTypes.Reward[] = [];

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

	public getRewardStyles(r:TwitchDataTypes.Reward):StyleValue {
		const res = {
			backgroundColor:r.background_color,
		};
		return res;
	}

	public async mounted():Promise<void> {
		this.open();

		this.loading = true;
		try {
			this.allRewards = await TwitchUtils.getRewards();
			this.manageableRewards = await TwitchUtils.getRewards(false, true);
		}catch(e) {
			//User is probably not an affiliate
			this.loading = false;
			return;
		}
		// this.rewards = this.rewards.filter(v => v.is_enabled);
		this.manageableRewards.sort((a, b) => a.cost - b.cost);
		this.loading = false;

		this.allRewards = this.allRewards.filter(v=> this.manageableRewards.findIndex(w=>w.id == v.id) == -1);
		
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	public updateRewardState(reward:TwitchDataTypes.Reward):void {
		TwitchUtils.setRewardEnabled(reward.id, reward.is_enabled);
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
	color: var(--color-text);

	.loader {
		margin: auto;
		text-align: center;
		.icon {
			width: 30px;
			height: 30px;
		}
		p {
			color: #fff;
			font-style: italic;
			font-size: 16px;
		}
	}

	.scrollable {
		height: 400px;
		width: 450px;
		max-width: 100%;
		max-height: 80%;
		overflow-x: hidden;
		overflow-y: auto;
		gap: 2em;
		display: flex;
		flex-direction: column;

		.list {
			gap: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			h1 {
				text-align: center;
				width: 100%;
				position: sticky;
				top: 0;
				z-index: 1;
				background-color: var(--grayout);
			}
	
			.item {
				gap: .5em;
				display: flex;
				flex-direction: column;
				width: calc(25% - .5em);
				background-color: var(--background-color-fader);
				border-radius: var(--border-radius);
				align-items: center;
				padding: .5em;
				min-height: 120px;
				transition: all .2s;
				// cursor: pointer;
	
				&.disabled {
					opacity: .5;
				}
	
				.infos {
					width: 100%;
					display: flex;
					flex-direction: column;
					align-items: center;
					border-radius: var(--border-radius);
					img {
						height: 28px;
						margin: 10px;
					}
					
					.cost {
						font-size: 10px;
						padding: 5px;
						border-radius: 5px;
						background-color: var(--background-color-fade);
						color: var(--color-text-inverse);
						font-weight: normal;
						margin-bottom: 5px;
					}
				}
	
				.title {
					font-size: .8em;
					text-align: center;
					flex-grow: 1;
				}
			}
		}
	}
	
	.empty {
		text-align: center;
	}
}
</style>