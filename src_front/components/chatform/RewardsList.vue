<template>
	<div class="rewardslist blured-background-window">
		<div v-if="loading" class="loader scrollable">
			<Icon class="loader" name="loader" />
			<p>{{ $t("global.loading") }}</p>
		</div>

		<div v-else-if="rewardToTransfer" class="transfer scrollable">
			<h1>{{ $t("rewards.manage.transfer_title") }}</h1>
			<div>{{ $t("rewards.manage.transfer_description") }}</div>
			<ul class="steps">
				<li class="card-item" v-for="label, index in $tm('rewards.manage.transfer_steps')">
					<span class="index">{{ index+1 }}</span>
					<i18n-t class="details" scope="global" tag="div" :keypath="'rewards.manage.transfer_steps['+index+']'">
						<template #DASHBOARD>
							<TTButton type="link"
							href="https://dashboard.twitch.tv/viewer-rewards/channel-points/rewards"
							target="_blank"
							icon="newtab">{{ $t("rewards.manage.transfer_step_dashboardBt") }}</TTButton>
						</template>
						<template #REWARD><mark>{{ rewardToTransfer.title }}</mark></template>
						<template #RECREATE><TTButton @click="executeTransfer()">{{ $t("rewards.manage.transfer_step_recreateBt") }}</TTButton></template>
					</i18n-t>
				</li>
				<li class="card-item icons">
					<a v-if="rewardToTransfer.image?.url_1x"
					:href="rewardToTransfer.image.url_1x" target="_blank" download="28px.png" v-tooltip="$t('rewards.manage.download_icon_tt')">
						<img :src="rewardToTransfer.image.url_1x">
						<span>28x28</span>
					</a>
					<a v-if="rewardToTransfer.image?.url_2x"
					:href="rewardToTransfer.image.url_2x" target="_blank" download="56px.png" v-tooltip="$t('rewards.manage.download_icon_tt')">
						<img :src="rewardToTransfer.image.url_2x">
						<span>56x56</span>
					</a>
					<a v-if="rewardToTransfer.image?.url_4x"
					:href="rewardToTransfer.image.url_4x" target="_blank" download="112px.png" v-tooltip="$t('rewards.manage.download_icon_tt')">
						<img :src="rewardToTransfer.image.url_4x">
						<span>112x112</span>
					</a>
				</li>
			</ul>
			<CloseButton @click="cancelTransfer()" />
		</div>

		<template v-else>
			<div class="rewards scrollable" v-if="manageableRewards.length > 0 || nonManageableRewards.length > 0">
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
				
				<div class="list" v-if="nonManageableRewards.length > 0">
					<h1>{{ $t("rewards.manage.not_manageable_title") }}</h1>
					<p>{{ $t("rewards.manage.not_manageable_description") }}</p>
					<div v-for="r in nonManageableRewards" :key="r.id"
					class="item disabled">
						<div class="infos" :style="getRewardStyles(r)">

							<img :src="getRewardIcon(r)">
							<p class="cost">{{r.cost}}</p>
						</div>
						<p class="title">{{r.title}}</p>
						<TTButton icon="twitchat" @click="transferReward(r)" small secondary>{{$t("rewards.manage.transferBt")}}</TTButton>
					</div>
				</div>
			</div>
			<div class="empty" v-else>{{ $t("rewards.manage.empty") }}</div>
		</template>
	</div>
</template>

<script lang="ts">
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import gsap from 'gsap';
import type { StyleValue } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import TTButton from '../TTButton.vue';
import ToggleButton from '../ToggleButton.vue';
import CloseButton from '../CloseButton.vue';

@Component({
	components:{
		Icon,
		TTButton,
		CloseButton,
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
	public rewardToTransfer:TwitchDataTypes.Reward|null = null;
	public nonManageableRewards:TwitchDataTypes.Reward[] = [];
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

	public mounted():void {
		this.open();
		this.loadRewards();
		
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	public updateRewardState(reward:TwitchDataTypes.Reward):void {
		TwitchUtils.setRewardEnabled(reward.id, reward.is_enabled);
	}

	public transferReward(reward:TwitchDataTypes.Reward):void {
		if(!TwitchUtils.requestScopes([TwitchScopes.MANAGE_REWARDS])) return;

		this.rewardToTransfer = reward;
	}

	public async executeTransfer():Promise<void> {
		const reward = this.rewardToTransfer!;
		this.loading = true;
		const data:TwitchDataTypes.RewardEdition = {
			title:reward.title,
			cost:reward.cost,
			is_enabled:reward.is_enabled,
			background_color:reward.background_color,
			global_cooldown_seconds:reward.global_cooldown_setting.global_cooldown_seconds,
			is_global_cooldown_enabled:reward.global_cooldown_setting.is_enabled,
			max_per_stream:reward.max_per_stream_setting.max_per_stream,
			is_max_per_stream_enabled:reward.max_per_stream_setting.is_enabled,
			max_per_user_per_stream:reward.max_per_user_per_stream_setting.max_per_user_per_stream,
			is_max_per_user_per_stream_enabled:reward.max_per_user_per_stream_setting.is_enabled,
			is_user_input_required:reward.is_user_input_required,
			prompt:reward.prompt,
			should_redemptions_skip_request_queue:reward.should_redemptions_skip_request_queue,
		};
		await TwitchUtils.createReward(data);
		await this.loadRewards(true);
		this.loading = false;
		this.rewardToTransfer = null;
	}

	public cancelTransfer():void {
		this.rewardToTransfer = null;
	}

	private async loadRewards(forceReload:boolean = false):Promise<void> {
		try {
			this.nonManageableRewards = await TwitchUtils.getRewards(forceReload);
			this.manageableRewards = await TwitchUtils.getRewards(forceReload, true);
		}catch(e) {
			//User is probably not an affiliate
			this.loading = false;
			return;
		}
		// this.rewards = this.rewards.filter(v => v.is_enabled);
		this.manageableRewards.sort((a, b) => a.cost - b.cost);
		this.loading = false;

		//Filter out manageable rewards from the list
		this.nonManageableRewards = this.nonManageableRewards.filter(v=> this.manageableRewards.findIndex(w=>w.id == v.id) == -1);
	}

	private open():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.2, scaleX:0, delay:.1, clearProps:"scaleX", ease:"back.out"});
		gsap.from(ref, {duration:.3, scaleY:0, clearProps:"scaleY", ease:"back.out"});
	}

	private close():void {
		if(this.rewardToTransfer) return;
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

	.scrollable {
		height: 400px;
		width: 450px;
		max-width: 100%;
		max-height: 80%;
		overflow-x: hidden;
		overflow-y: auto;
		gap: 1em;
		display: flex;
		flex-direction: column;
		white-space: pre-line;

		&.loader {
			align-items: center;
			justify-content: center;
			margin: 0 auto;
			.icon {
				width: 30px;
				height: 30px;
			}
			p {
				color: #fff;
				font-style: italic;
				font-size: 1em;
			}
		}

		&.transfer {
			line-height: 1.25em;
			.icon {
				height: 1em;
				vertical-align: bottom;
				margin-left: .25em;
			}

			.steps {
				max-width: 80%;
				margin: 0 auto;
				li {
					display: flex;
					gap: 1em;
					margin-bottom: .5em;
					.index {
						font-weight: bold;
						margin: -.5em;
						padding: .5em;
						width: 2em;
						flex-shrink: 0;
						background-color: var(--color-text-fader);
						display: flex;
						align-items: center;
						justify-content: center;
					}
					.details {
						flex-grow: 1;
						text-align: center;
					}
					&.icons {
						align-items: center;
						justify-content: center;
						padding-top: 0;
						padding-bottom: 0;
						a {
							gap: .5em;
							display: flex;
							flex-direction: column;
							align-items: center;
							justify-content: center;
							padding: .5em;
							align-self: stretch;
							text-decoration: none;
							img {
								height: 2.5em;
							}
							span {
								color: var(--color-text);
								font-size: .8em;
							}
							&:hover {
								background-color: var(--color-light-fader);
								border-radius: var(--border-radius);
							}
							&:first-of-type img {
								height: 1.5em;
							}
							&:nth-of-type(2) img {
								height: 2em;
							}
						}
					}
				}
			}
		}

		&.rewards {
			gap: 2em;
		}
		h1 {
			text-align: center;
			width: 100%;
			position: sticky;
			top: 0;
			z-index: 1;
			background-color: var(--grayout);
		}

		.list {
			gap: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			h1 {
				position: sticky;
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
					.infos {
						filter: saturate(0%);
					}
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