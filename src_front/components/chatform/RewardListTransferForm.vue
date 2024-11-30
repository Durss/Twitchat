<template>
	<div class="rewardlisttransferform">
		<ul class="steps">
			<template v-for="label, index in $tm('rewards.manage.transfer_steps')">
				<li class="card-item" v-if="index < 3 || reward.image">
					<span class="index">{{ index+1 }}</span>
					<i18n-t class="details" scope="global" tag="div" :keypath="'rewards.manage.transfer_steps['+index+']'">
						<template #DASHBOARD>
							<TTButton primary type="link"
							href="https://dashboard.twitch.tv/viewer-rewards/channel-points/rewards"
							target="_blank"
							icon="newtab">{{ $t("rewards.manage.transfer_step_dashboardBt") }}</TTButton>
						</template>
						<template #REWARD><mark>{{ reward.title }}</mark></template>
						<template #RECREATE>
							<div class="transfered" v-if="recreated"><Icon name="checkmark"/>{{ $t("rewards.manage.transfer_step_recreate_done") }}</div>
							<TTButton primary v-else-if="!error" :loading="tranfering" @click="executeTransfer()" icon="channelPoints">{{ $t("rewards.manage.transfer_step_recreateBt") }}</TTButton>
							<div class="card-item alert error" @click="error = ''" v-else-if="error">{{ error }}</div>
						</template>
					</i18n-t>
				</li>
			</template>
			<li class="card-item icons" v-if="reward.image">
				<a v-if="reward.image?.url_1x"
				:href="reward.image.url_1x" target="_blank" :download="reward.title+'_28px.png'" v-tooltip="$t('rewards.manage.download_icon_tt')">
					<img :src="reward.image.url_1x">
					<span>28x28</span>
				</a>
				<a v-if="reward.image?.url_2x"
				:href="reward.image.url_2x" target="_blank" :download="reward.title+'_56px.png'" v-tooltip="$t('rewards.manage.download_icon_tt')">
					<img :src="reward.image.url_2x">
					<span>56x56</span>
				</a>
				<a v-if="reward.image?.url_4x"
				:href="reward.image.url_4x" target="_blank" :download="reward.title+'_112px.png'" v-tooltip="$t('rewards.manage.download_icon_tt')">
					<img :src="reward.image.url_4x">
					<span>112x112</span>
				</a>
			</li>
		</ul>
	</div>
</template>

<script lang="ts">
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';

@Component({
	components:{
		TTButton,
	},
	emits:["transferDone"],
})
class RewardListTransferForm extends Vue {

	@Prop
	public reward!:TwitchDataTypes.Reward;

	public error:string = "";
	public recreated:boolean = false;
	public tranfering:boolean = false;

	public async executeTransfer():Promise<void> {
		this.error = "";
		const reward = this.reward!;
		this.tranfering = true;
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
		const res = await TwitchUtils.createReward(data);
		
		if(typeof res == "string") {
			this.error = res;
		}else if(res === false) {
			this.error = this.$t("error.rewards.create_unknown");
		}else{
			this.recreated = true;
			this.$emit("transferDone");
		}
		this.tranfering = false;
	}
}
export default toNative(RewardListTransferForm);
</script>

<style scoped lang="less">
.rewardlisttransferform{
	
	line-height: 1.25em;
	.icon {
		height: 1em;
		vertical-align: bottom;
		margin-left: .25em;
	}

	.button {
		flex-wrap: nowrap;
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
				background-color: var(--color-secondary);
				display: flex;
				align-items: center;
				justify-content: center;
			}
			.details {
				flex-grow: 1;
				text-align: center;
				.error {
					margin-top: .5em;
					cursor: pointer;
				}
			}
			.transfered {
				font-style: italic;
				.icon {
					margin-right: .5em;
				}
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
</style>