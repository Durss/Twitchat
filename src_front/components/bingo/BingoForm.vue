<template>
	<div :class="classes">
		<div class="head" v-if="triggerMode === false">
			<ClearButton :aria-label="$t('global.close')" @click="close()" />

			<h1 class="title"><Icon name="bingo" class="icon" />{{ $t("bingo.form.title") }}</h1>

			<div class="description">{{ $t("bingo.form.description") }}</div>
		</div>

		<TabMenu class="menu" v-model="mode"
			:values="['num','emote','custom']"
			:tooltips="[$t('bingo.form.title_number'), $t('bingo.form.title_emote'), $t('bingo.form.title_custom')]"
			:icons="['number', 'emote', 'edit']"
			@change="onValueChange()" />

		<div class="content">
			<form @submit.prevent="onSubmit()">

				<div class="info" v-if="mode=='num'" v-html="$t('bingo.form.number_info')"></div>
				<div class="info" v-if="mode=='emote'" v-html="$t('bingo.form.emote_info', {COUNT:globalEmotes.length})"></div>
				<div class="info" v-if="mode =='custom'">{{ $t("bingo.form.custom_info") }}</div>

				<ParamItem class="card-item" v-if="mode=='num'" :paramData="minValue" autofocus @change="onValueChange()" />

				<ParamItem class="card-item" v-if="mode=='num'" :paramData="maxValue" @change="onValueChange()" />

				<ParamItem class="card-item custom" v-if="mode=='custom'" :paramData="customValue" @change="onValueChange()" />
				<ParamItem class="card-item custom" v-if="mode=='custom'" :paramData="customValueTolerance" @change="onValueChange()" />

				<ToggleBlock :icons="['params']" :title="$t('global.advanced_params')" class="configs" :open="false" v-if="triggerMode === false">
					<PostOnChatParam botMessageKey="bingoStart"
						:placeholderEnabled="false"
						titleKey="bingo.form.announce_start"
						:placeholders="startPlaceholders"
						icon="announcement"
					/>
					<PostOnChatParam botMessageKey="bingo"
						titleKey="bingo.form.announce_winner"
						:placeholders="winnerPlaceholders"
						icon="announcement"
					/>
				</ToggleBlock>

				<TTButton v-if="triggerMode === false" type="submit">{{ $t('bingo.form.startBt') }}</TTButton>
			</form>
		</div>
	</div>
</template>

<script lang="ts">
import { TriggerEventPlaceholders, type TriggerActionBingoData, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import TabMenu from '../TabMenu.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';

@Component({
	components:{
		TTButton,
		TabMenu,
		ParamItem,
		ClearButton,
		ToggleBlock,
		PostOnChatParam,
	},
	emits:["close"]
})
class BingoForm extends AbstractSidePanel {

	@Prop({type: Boolean, default: false})
	public triggerMode!:boolean;

	//This is used by the trigger action form.
	@Prop({type: Object, default:{}})
	public action!:TriggerActionBingoData;

	@Prop
	public triggerData!:TriggerData;

	public globalEmotes:TwitchatDataTypes.Emote[] = [];
	public mode:"num"|"emote"|"custom" = "num";
	public minValue:TwitchatDataTypes.ParameterData<number> = {value:0, type:"number", min:0, max:999999999, labelKey:"bingo.form.min_value"};
	public maxValue:TwitchatDataTypes.ParameterData<number> = {value:100, type:"number", min:0, max:999999999, labelKey:"bingo.form.max_value"};
	public customValue:TwitchatDataTypes.ParameterData<string|undefined> = {value:"", type:"string", maxLength:500, placeholderKey:"bingo.form.custom_placeholder", labelKey:"bingo.form.custom_value", icon:"whispers"};
	// public customValueTolerance:TwitchatDataTypes.ParameterData<number|undefined> = {value:0, type:"slider", min:0, max: 100, labelKey:"bingo.form.custom_value_tolerance"};
	public customValueTolerance:TwitchatDataTypes.ParameterData<number> = {value:0, type:"list", labelKey:"bingo.form.custom_value_tolerance"};
	public winnerPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];

	public get classes():string[] {
		const res = ["bingoform", "sidePanel"];
		if(this.triggerMode !== false) res.push("embedMode");
		return res;
	}

	public get finalData():TwitchatDataTypes.BingoConfig {
		return  {
			guessNumber: this.mode == "num",
			guessEmote: this.mode == "emote",
			guessCustom: this.mode == "custom",
			genericValue: "",
			min: this.minValue.value,
			max: this.maxValue.value,
			customValue: this.customValue.value,
			customValueTolerance: this.customValueTolerance.value,
		}
	}

	public get startPlaceholders():TwitchatDataTypes.PlaceholderEntry[] {
		return [
			{
				tag:"GOAL", descKey:'bingo.form.goal_placeholder',
				example:(<Record<typeof this.mode, any>>{
					num:this.$t('bingo.goal_number', {MIN:this.minValue.value, MAX:this.maxValue.value}),
					emote:this.$t('bingo.goal_emote'),
					custom:""
				})[this.mode],
			}
		];
	}

	public async beforeMount():Promise<void> {
		this.winnerPlaceholders = [{tag:"USER", descKey:"bingo.form.winner_placeholder", example:this.$store.auth.twitch.user.displayName}];
		if(this.triggerMode) {
			console.log(this.action.bingoData);
			if(this.action.bingoData) {
				if(this.action.bingoData.guessNumber) this.mode = "num";
				else if(this.action.bingoData.guessEmote) this.mode = "emote";
				else if(this.action.bingoData.guessCustom) this.mode = "custom";
				this.minValue.value = this.action.bingoData.min;
				this.maxValue.value = this.action.bingoData.max;
				this.customValue.value = this.action.bingoData.customValue;
				this.customValueTolerance.value = this.action.bingoData.customValueTolerance ?? 0;
			}else{
				this.onValueChange();
			}
		}

		this.customValueTolerance.listValues = [
			{value:0, labelKey:"bingo.form.custom_value_tolerances.none"},
			{value:1, labelKey:"bingo.form.custom_value_tolerances.very_low"},
			{value:2, labelKey:"bingo.form.custom_value_tolerances.low"},
			{value:3, labelKey:"bingo.form.custom_value_tolerances.medium"},
			{value:4, labelKey:"bingo.form.custom_value_tolerances.high"},
			{value:5, labelKey:"bingo.form.custom_value_tolerances.very_high"},
		];

		let emotes = await TwitchUtils.getEmotes();
		emotes = emotes.filter(v => v.is_public === true);
		this.globalEmotes = emotes;

		if(this.triggerMode !== false) {
			this.customValue.placeholderList = TriggerEventPlaceholders(this.triggerData.type);
		}
	}

	public mounted(): void {
		if(!this.triggerMode) {
			super.open();
		}
	}

	/**
	 * Start a bingo
	 */
	public onSubmit():void {
		this.$store.bingo.startBingo(this.finalData);
		super.close();
	}

	/**
	 * Called when any value is changed
	 */
	public onValueChange():void {
		if(this.action) {
			this.action.bingoData = this.finalData;
		}
	}

}
export default toNative(BingoForm);
</script>

<style scoped lang="less">
.bingoform{

	.content > form > .card-item.custom {
		:deep(input) {
			flex-basis: 200px;
			text-align: left;
		}
	}
}
</style>
