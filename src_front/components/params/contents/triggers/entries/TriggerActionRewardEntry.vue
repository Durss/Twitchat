<template>
	<div class="triggeractionrewardentry triggerActionForm">
		<ParamItem :paramData="param_action" v-model="action.rewardAction.action" />
		
		<template v-if="param_action.value != 'create'">
			<ParamItem :paramData="param_reward" v-if="param_reward.listValues!.length > 0" v-model="action.rewardAction.rewardId" />
			<i18n-t scope="global" tag="div" class="card-item alert" keypath="triggers.actions.reward.no_manageable_reward" v-else>
				<template #ICON><Icon name="channelPoints" /></template>
			</i18n-t>
		</template>
		
		<ParamItem :paramData="param_state" v-if="param_action.value == 'toggle' && param_reward.listValues!.length > 0" v-model="action.rewardAction.state" />
		
		<RewardListEditForm v-if="param_action.value == 'create'" v-model="action.rewardAction.rewardEdit" />
		
		<template v-if="param_action.value == 'edit'">
			<RewardListEditForm v-if="selectedRewardData" :reward="selectedRewardData" v-model="action.rewardAction.rewardEdit" triggerMode />
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
import { TriggerActionRewardDataActionList, TriggerActionRewardDataStateList, type TriggerActionRewardData, type TriggerData, type TriggerActionRewardDataAction, type TriggerActionRewardDataState } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Icon,
		ParamItem,
		RewardListEditForm,
	},
	emits:[],
})
export default class TriggerActionRewardEntry extends Vue {

	@Prop
	declare action:TriggerActionRewardData;
	
	@Prop
	public rewards!:TwitchDataTypes.Reward[];
	
	@Prop
	declare triggerData:TriggerData;

	public param_reward:TwitchatDataTypes.ParameterData<string, string> = {type:"list", value:"", labelKey:"triggers.actions.reward.param_reward"};
	public param_action:TwitchatDataTypes.ParameterData<TriggerActionRewardDataAction, TriggerActionRewardDataAction> = {type:"list", value:"toggle", labelKey:"triggers.actions.reward.param_action"};
	public param_state:TwitchatDataTypes.ParameterData<TriggerActionRewardDataState, TriggerActionRewardDataState> = {type:"list", value:"toggle", labelKey:"triggers.actions.reward.param_state"};

	public get selectedRewardData():TwitchDataTypes.Reward | undefined {
		return this.rewards.find(v => v.id == this.param_reward.value);
	}

	public beforeMount():void {
		this.param_state.listValues = TriggerActionRewardDataStateList.map(v => {
			return {value:v, labelKey:"triggers.actions.reward.param_state_"+v};
		});
		this.param_action.listValues = TriggerActionRewardDataActionList.map(v => {
			return {value:v, labelKey:"triggers.actions.reward.param_action_"+v};
		}) || [];
		this.param_reward.listValues = [];
		TwitchUtils.getRewards(false, true).then(res => {
			this.param_reward.listValues = res.map(v => {
				return {value:v.id, label:v.title};
			});
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

}
</script>

<style scoped lang="less">
.triggeractionrewardentry{
	.alert {
		white-space: pre-line;
		.icon {
			margin-right: 0;
		}
	}
}
</style>