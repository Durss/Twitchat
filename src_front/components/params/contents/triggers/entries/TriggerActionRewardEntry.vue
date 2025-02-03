<template>
	<div class="triggeractionrewardentry triggerActionForm">
		<ParamItem :paramData="param_action" v-model="action.rewardAction.action" />

		<template v-if="param_action.value != 'create' && param_action.value != 'refund'">
			<div class="card-item" v-if="loading"><Icon name="loader" class="loader" /></div>
			<ParamItem :paramData="param_reward" v-else-if="param_reward.listValues!.length > 0" v-model="action.rewardAction.rewardId" />
			<i18n-t scope="global" tag="div" class="card-item alert" keypath="triggers.actions.reward.no_manageable_reward" v-else>
				<template #ICON><Icon name="channelPoints" /></template>
			</i18n-t>
		</template>

		<ParamItem :paramData="param_state" v-if="param_action.value == 'toggle' && param_reward.listValues!.length > 0" v-model="action.rewardAction.state" />

		<RewardListEditForm v-if="param_action.value == 'create'" v-model="action.rewardAction.rewardEdit" :placeholderList="placeholderList" />

		<template v-if="param_action.value == 'edit'">
			<RewardListEditForm v-if="selectedRewardData" :reward="selectedRewardData" v-model="action.rewardAction.rewardEdit" :placeholderList="placeholderList" triggerMode />
			<i18n-t scope="global" tag="div" class="card-item alert" keypath="triggers.actions.reward.no_manageable_reward" v-else>
				<template #ICON><Icon name="channelPoints" /></template>
			</i18n-t>
		</template>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import RewardListEditForm from '@/components/chatform/RewardListEditForm.vue';
import ParamItem from '@/components/params/ParamItem.vue';
import { TriggerActionRewardDataActionList, TriggerActionRewardDataStateList, type TriggerActionRewardData, type TriggerActionRewardDataAction, type TriggerActionRewardDataState, type TriggerData, type ITriggerPlaceholder, TriggerTypes } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractTriggerActionEntry from './AbstractTriggerActionEntry';

@Component({
	components:{
		Icon,
		ParamItem,
		RewardListEditForm,
	},
	emits:[],
})
class TriggerActionRewardEntry extends AbstractTriggerActionEntry {

	@Prop
	declare action:TriggerActionRewardData;

	@Prop
	public rewards!:TwitchDataTypes.Reward[];

	@Prop
	declare triggerData:TriggerData;

	public loading:boolean = true;
	public placeholderList:ITriggerPlaceholder<any>[] = [];
	public placeholderNumList:ITriggerPlaceholder<any>[] = [];
	public param_reward:TwitchatDataTypes.ParameterData<string, string> = {type:"list", value:"", labelKey:"triggers.actions.reward.param_reward"};
	public param_action:TwitchatDataTypes.ParameterData<TriggerActionRewardDataAction, TriggerActionRewardDataAction> = {type:"list", value:"toggle", labelKey:"triggers.actions.reward.param_action"};
	public param_state:TwitchatDataTypes.ParameterData<TriggerActionRewardDataState, TriggerActionRewardDataState> = {type:"list", value:"toggle", labelKey:"triggers.actions.reward.param_state"};

	public get selectedRewardData():TwitchDataTypes.Reward | undefined {
		return this.rewards.find(v => v.id == this.param_reward.value);
	}

	public beforeMount():void {
		this.param_action.listValues = TriggerActionRewardDataActionList.filter(v =>{
			//Remove "refund" option if not a reward trigger type
			if(this.triggerData.type != TriggerTypes.REWARD_REDEEM) {
				return v != "refund";
			}
			return true;
		}).map(v => {
			return {value:v, labelKey:"triggers.actions.reward.param_action_"+v};
		}) || [];

		this.param_state.listValues = TriggerActionRewardDataStateList.map(v => {
			return {value:v, labelKey:"triggers.actions.reward.param_state_"+v};
		});
		this.param_reward.listValues = [];
		TwitchUtils.getRewards(false, true).then(res => {
			this.param_reward.listValues = res.map(v => {
				return {value:v.id, label:v.title};
			}).sort((a,b)=> a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
			//If it's a reward trigger, make sure the reward is refundable
			//if not, remove the refund option
			if(this.triggerData.type == TriggerTypes.REWARD_REDEEM) {
				const reward = res.find(v=>v.id == this.triggerData.rewardId);
				if(!reward || reward.should_redemptions_skip_request_queue) {
					this.param_action.listValues = this.param_action.listValues?.filter(v=>v.value!='refund')
				}
			}
			this.loading = false;
		});
		if(!this.action.rewardAction) {
			this.action.rewardAction = {
				action:"toggle",
				state:"disable",
			};
		}

		if(!this.action.rewardAction.rewardEdit) {
			this.action.rewardAction.rewardEdit = {
				title:"",
				prompt:"",
				cost:100,
				background_color: "#cc0000",
				is_enabled:true,
				is_paused:false,
				is_user_input_required:false,
				should_redemptions_skip_request_queue:false,
				max_per_stream:0,
				max_per_user_per_stream:0,
				global_cooldown_seconds:0,
				is_global_cooldown_enabled:false,
				is_max_per_stream_enabled:false,
				is_max_per_user_per_stream_enabled:false,
			}
		}
	}

	public onPlaceholderUpdate(list:ITriggerPlaceholder<any>[]):void {
		this.placeholderList = list;
		this.placeholderNumList = list.filter(v=>v.numberParsable !== true);
	}

}
export default toNative(TriggerActionRewardEntry);
</script>

<style scoped lang="less">
.triggeractionrewardentry{
	.alert {
		white-space: pre-line;
		.icon {
			margin-right: 0;
		}
	}

	.loader {
		height: 2em;
		width: 2em;
		margin: auto;
		display: block;
	}
}
</style>
