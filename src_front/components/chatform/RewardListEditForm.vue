<template>
	<div class="rewardlisteditform">
		<img :src="icon" class="rewardIcon">
		<ParamItem :paramData="param_title" v-model="reward.title"></ParamItem>
		<ParamItem :paramData="param_description" v-model="reward.prompt"></ParamItem>
		<ParamItem :paramData="param_cost" v-model="reward.cost"></ParamItem>
		<ParamItem :paramData="param_prompt" v-model="reward.is_user_input_required"></ParamItem>
		<ParamItem :paramData="param_paused" v-model="reward.is_paused"></ParamItem>
		<ParamItem :paramData="param_enabled" v-model="reward.is_enabled"></ParamItem>
		<ParamItem :paramData="param_color" v-model="reward.background_color"></ParamItem>
		<ParamItem :paramData="param_skipQueue" v-model="reward.should_redemptions_skip_request_queue"></ParamItem>
		<ParamItem :paramData="param_cooldown" v-model="limitsEnabled" @change="onChange()">
			<ParamItem :paramData="param_coolDown_duration" v-model="reward.global_cooldown_setting.global_cooldown_seconds" noBackground class="child"></ParamItem>
			<ParamItem :paramData="param_coolDown_maxPerStream" v-model="reward.max_per_stream_setting.max_per_stream" noBackground class="child"></ParamItem>
			<ParamItem :paramData="param_coolDown_maxPerUser" v-model="reward.max_per_user_per_stream_setting.max_per_user_per_stream" noBackground class="child"></ParamItem>
		</ParamItem>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../params/ParamItem.vue';
import { watch } from 'vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';

@Component({
	components:{
		ParamItem,
	},
	emits:[],
})
export default class RewardListEditForm extends Vue {

	@Prop
	public reward!:TwitchDataTypes.Reward

	public param_title:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:45, labelKey:"rewards.manage.param_title"};
	public param_description:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, maxLength:200, labelKey:"rewards.manage.param_description"};
	public param_prompt:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"rewards.manage.param_prompt", icon:"font"};
	public param_cost:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0, min:1, max:1000000000, labelKey:"rewards.manage.param_cost", icon:"channelPoints"};
	public param_paused:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"rewards.manage.param_paused", icon:"pause"};
	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"rewards.manage.param_enabled", icon:"disable"};
	public param_color:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"", labelKey:"rewards.manage.param_color", icon:"pipette"};
	public param_skipQueue:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"rewards.manage.param_skipQueue", icon:"skip"};
	public param_cooldown:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"rewards.manage.param_cooldown", icon:"timeout"};
	public param_coolDown_duration:TwitchatDataTypes.ParameterData<number> = {type:"time", value:0, labelKey:"rewards.manage.param_coolDown_duration", icon:"timer"};
	public param_coolDown_maxPerStream:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0, min:0, max:1000000000, labelKey:"rewards.manage.param_coolDown_maxPerStream", icon:"user"};
	public param_coolDown_maxPerUser:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0, min:0, max:1000000000, labelKey:"rewards.manage.param_coolDown_maxPerUser", icon:"user"};
	public limitsEnabled:boolean = false;

	private changeDebounce:number = -1;

	public get icon():string{
		if(this.reward.image?.url_4x) return this.reward.image.url_4x;
		return this.reward.default_image.url_4x;
	}

	public beforeMount():void {
		this.limitsEnabled = this.reward.global_cooldown_setting.is_enabled
					|| this.reward.max_per_stream_setting.is_enabled
					|| this.reward.max_per_user_per_stream_setting.is_enabled
	}

	public mounted():void {
		watch(()=>this.reward, ()=> this.onChange(), {deep:true})
	}

	public onChange():void {
		clearTimeout(this.changeDebounce);
		this.changeDebounce = setTimeout(async ()=> {
			if(this.limitsEnabled) {
				this.reward.global_cooldown_setting.is_enabled = this.reward.global_cooldown_setting.global_cooldown_seconds > 0;
				this.reward.max_per_stream_setting.is_enabled = this.reward.max_per_stream_setting.max_per_stream > 0;
				this.reward.max_per_user_per_stream_setting.is_enabled = this.reward.max_per_user_per_stream_setting.max_per_user_per_stream > 0;
			}else{
				this.reward.global_cooldown_setting.is_enabled = false;
				this.reward.max_per_stream_setting.is_enabled = false;
				this.reward.max_per_user_per_stream_setting.is_enabled = false;
			}
			const data:TwitchDataTypes.RewardEdition = {
				cost:this.reward.cost,
				title:this.reward.title,
				prompt:this.reward.prompt,
				background_color:this.reward.background_color,
				is_enabled:this.reward.is_enabled,
				is_paused:this.reward.is_paused,
				should_redemptions_skip_request_queue:this.reward.should_redemptions_skip_request_queue,
				is_user_input_required:this.reward.is_user_input_required,
				is_global_cooldown_enabled:this.limitsEnabled && this.reward.global_cooldown_setting.global_cooldown_seconds > 0,
				global_cooldown_seconds: this.reward.global_cooldown_setting.global_cooldown_seconds,
				is_max_per_stream_enabled:this.limitsEnabled && this.reward.max_per_stream_setting.max_per_stream > 0,
				max_per_stream:this.reward.max_per_stream_setting.max_per_stream,
				is_max_per_user_per_stream_enabled:this.limitsEnabled && this.reward.max_per_user_per_stream_setting.max_per_user_per_stream > 0,
				max_per_user_per_stream:this.reward.max_per_user_per_stream_setting.max_per_user_per_stream,
			};
			await TwitchUtils.updateReward(this.reward.id, data);
		}, 500);
	}
	
}
</script>

<style scoped lang="less">
.rewardlisteditform{
	gap: .5em;
	display: flex;
	flex-direction: column;
	.rewardIcon {
		height: 4em;
		margin: auto;
		display: block;
	}
}
</style>