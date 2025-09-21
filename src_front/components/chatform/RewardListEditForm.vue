<template>
	<form class="rewardlisteditform" @submit.prevent="onSubmit">
		<img v-if="icon && triggerMode === false" :src="icon" class="rewardIcon" :style="{backgroundColor:localValue.background_color}">
		<ParamItem :paramData="param_title" v-model="localValue.title"></ParamItem>
		<ParamItem :paramData="param_description" v-model="localValue.prompt"></ParamItem>
		<ParamItem :paramData="param_cost" v-model="localValue.cost"></ParamItem>
		<ParamItem :paramData="param_prompt" v-model="localValue.is_user_input_required"></ParamItem>
		<ParamItem :paramData="param_paused" v-model="localValue.is_paused"></ParamItem>
		<ParamItem :paramData="param_enabled" v-model="localValue.is_enabled"></ParamItem>
		<ParamItem :paramData="param_color" v-model="localValue.background_color"></ParamItem>
		<ParamItem :paramData="param_skipQueue" v-model="localValue.should_redemptions_skip_request_queue"></ParamItem>
		<ParamItem :paramData="param_cooldown" v-model="limitsEnabled" @change="onChange()">
			<ParamItem :paramData="param_coolDown_duration" v-model="localValue.global_cooldown_seconds" noBackground class="child"></ParamItem>
			<ParamItem :paramData="param_coolDown_maxPerStream" v-model="localValue.max_per_stream" noBackground class="child"></ParamItem>
			<ParamItem :paramData="param_coolDown_maxPerUser" v-model="localValue.max_per_user_per_stream" noBackground class="child"></ParamItem>
		</ParamItem>
		<div class="cta" v-if="triggerMode === false">
			<TTButton type="submit" primary :loading="saving" v-if="!modelValue && !reward" icon="add">{{ $t("global.create") }}</TTButton>
			<TTButton type="submit" primary :loading="saving" v-else icon="save">{{ $t("global.save") }}</TTButton>
			<div class="card-item alert" v-if="error">{{ error }}</div>
		</div>
	</form>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import ParamItem from '../params/ParamItem.vue';
import { watch } from 'vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import TTButton from '../TTButton.vue';
import type { ITriggerPlaceholder } from '@/types/TriggerActionDataTypes';

@Component({
	components:{
		TTButton,
		ParamItem,
	},
	emits:["update:modelValue"],
})
class RewardListEditForm extends Vue {

	@Prop
	public reward!:TwitchDataTypes.Reward;

	@Prop
	public modelValue!:TwitchDataTypes.RewardEdition;

	@Prop({default:false, type:Boolean})
	public triggerMode!:boolean;
	
	@Prop
	public placeholderList:ITriggerPlaceholder<any>[] = [];

	public error:string = "";
	public saving:boolean = false;
	public localValue:TwitchDataTypes.RewardEdition = {
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
	};

	public param_title:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", maxLength:45, labelKey:"rewards.manage.param_title"};
	public param_description:TwitchatDataTypes.ParameterData<string> = {type:"string", value:"", longText:true, maxLength:200, labelKey:"rewards.manage.param_description"};
	public param_prompt:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"rewards.manage.param_prompt", icon:"font"};
	public param_cost:TwitchatDataTypes.ParameterData<number|string> = {type:"number", value:0, min:1, max:1000000000, labelKey:"rewards.manage.param_cost", icon:"channelPoints"};
	public param_paused:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"rewards.manage.param_paused", icon:"pause"};
	public param_enabled:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"rewards.manage.param_enabled", icon:"disable"};
	public param_color:TwitchatDataTypes.ParameterData<string> = {type:"color", value:"", labelKey:"rewards.manage.param_color", icon:"pipette"};
	public param_skipQueue:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"rewards.manage.param_skipQueue", icon:"skip"};
	public param_cooldown:TwitchatDataTypes.ParameterData<boolean> = {type:"boolean", value:false, labelKey:"rewards.manage.param_cooldown", icon:"timeout"};
	public param_coolDown_duration:TwitchatDataTypes.ParameterData<number> = {type:"duration", value:0, labelKey:"rewards.manage.param_coolDown_duration", icon:"timer"};
	public param_coolDown_maxPerStream:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0, min:0, max:1000000000, labelKey:"rewards.manage.param_coolDown_maxPerStream", icon:"user"};
	public param_coolDown_maxPerUser:TwitchatDataTypes.ParameterData<number> = {type:"number", value:0, min:0, max:1000000000, labelKey:"rewards.manage.param_coolDown_maxPerUser", icon:"user"};
	public limitsEnabled:boolean = false;

	private changeDebounce:number = -1;

	public get icon():string{
		if(!this.reward) return "";
		if(this.reward.image?.url_4x) return this.reward.image.url_4x;
		return this.reward.default_image.url_4x;
	}

	public beforeMount():void {
		if(this.modelValue) {
			this.localValue = this.modelValue;
		}
		if(!this.modelValue || !this.modelValue.title) this.importRewardData();

		this.limitsEnabled = this.localValue.is_global_cooldown_enabled === true
							|| this.localValue.is_max_per_stream_enabled === true
							|| this.localValue.is_max_per_user_per_stream_enabled === true;

		if(this.placeholderList) {
			this.param_title.placeholderList = this.placeholderList;
			this.param_description.placeholderList = this.placeholderList;
			this.param_cost.placeholderList = this.placeholderList.filter(v=> v.numberParsable);
		}
		if(this.triggerMode !== false) {
			this.param_cost.type = "string";
		}
	}

	public mounted():void {
		watch(()=>this.localValue, ()=> this.onChange(), {deep:true});
		watch(()=>this.modelValue, ()=> { this.localValue = this.modelValue; });
		watch(()=>this.reward, ()=> { this.importRewardData(); });
	}

	public onChange():void {
		this.localValue.is_global_cooldown_enabled =			this.limitsEnabled && (this.localValue.global_cooldown_seconds ?? 0) > 0,
		this.localValue.is_max_per_stream_enabled =				this.limitsEnabled && (this.localValue.max_per_stream ?? 0) > 0,
		this.localValue.is_max_per_user_per_stream_enabled =	this.limitsEnabled && (this.localValue.max_per_user_per_stream ?? 0) > 0,
		this.$emit("update:modelValue", this.localValue);

		// if(this.triggerMode === false && this.reward) {
		// 	clearTimeout(this.changeDebounce);
		// 	this.changeDebounce = window.setTimeout(async ()=> {
		// 		if(this.reward) {
		// 			await TwitchUtils.updateReward(this.reward.id, this.localValue);
		// 		}
		// 	}, 500);
		// }
	}

	public async onSubmit():Promise<void> {
		if(this.saving || this.triggerMode) return;
		
		this.saving = true;
		if(this.reward) {
			//If editing a reward
			const res = await TwitchUtils.updateReward(this.reward.id, this.localValue);
			if(res === false) {
				this.error = this.$t("error.rewards.create_unknown");
			}else{
				this.$emit("complete");
			}
		}else{
			//If creating a new reward
			const res = await TwitchUtils.createReward(this.localValue);
			if(typeof res == "string") {
				this.error = res;
			}else if(res === false) {
				this.error = this.$t("error.rewards.edit_unknown");
			}else{
				this.$emit("complete");
			}
		}
		this.saving = false;
	}

	private importRewardData():void {
		if(!this.reward) return;
		
		this.localValue.title									= this.reward.title;
		this.localValue.prompt									= this.reward.prompt;
		this.localValue.cost									= this.reward.cost;
		this.localValue.background_color						= this.reward.background_color;
		this.localValue.is_enabled								= this.reward.is_enabled;
		this.localValue.is_paused								= this.reward.is_paused;
		this.localValue.is_max_per_user_per_stream_enabled		= this.reward.max_per_user_per_stream_setting.is_enabled;
		this.localValue.max_per_user_per_stream					= this.reward.max_per_user_per_stream_setting.max_per_user_per_stream;
		this.localValue.is_global_cooldown_enabled				= this.reward.global_cooldown_setting.is_enabled;
		this.localValue.global_cooldown_seconds					= this.reward.global_cooldown_setting.global_cooldown_seconds;
		this.localValue.is_max_per_stream_enabled				= this.reward.max_per_stream_setting.is_enabled;
		this.localValue.max_per_stream							= this.reward.max_per_stream_setting.max_per_stream;
		this.localValue.is_user_input_required					= this.reward.is_user_input_required;
		this.localValue.should_redemptions_skip_request_queue	= this.reward.should_redemptions_skip_request_queue;
	}
	
}
export default toNative(RewardListEditForm);
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
		border-radius: var(--border-radius);
	}
	.cta {
		align-self: stretch;
		position: sticky;
		bottom: 0;
		padding: .5em 0;
		padding-top: 2em;
		margin-top: -1em;
		text-align: center;
		background: linear-gradient(0, var(--color-text-inverse) 20%, var(--color-text-inverse-fadest) 100%);
	}
}
</style>