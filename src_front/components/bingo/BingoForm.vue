<template>
	<div :class="classes">
		<div class="head" v-if="triggerMode === false">
			<CloseButton :aria-label="$t('global.close')" @click="close()" />
			
			<h1 class="title"><Icon name="bingo" class="icon" />{{ $t("bingo.form.title") }}</h1>
			
			<div class="description">{{ $t("bingo.form.description") }}</div>
		</div>
	
		<TabMenu class="menu" v-model="mode"
			:values="['num','emote','custom']"
			:tooltips="[$t('bingo.form.title_number'), $t('bingo.form.title_emote'), $t('bingo.form.title_custom')]"
			:icons="['number', 'emote', 'edit']" />

		<div class="content">
			<form @submit.prevent="onSubmit()">
				
				<div class="info" v-if="mode=='num'" v-html="$t('bingo.form.number_info')"></div>
				<div class="info" v-if="mode=='emote'" v-html="$t('bingo.form.emote_info', {COUNT:globalEmotes.length})"></div>
				<div class="info" v-if="mode =='custom'">{{ $t("bingo.form.custom_info") }}</div>

				<ParamItem class="card-item" v-if="mode=='num'" :paramData="minValue" autofocus @change="onValueChange()" />
				
				<ParamItem class="card-item" v-if="mode=='num'" :paramData="maxValue" @change="onValueChange()" />

				<ParamItem class="card-item custom" v-if="mode=='custom'" :paramData="customValue" @change="onValueChange()" />

				<Button v-if="triggerMode === false" type="submit">{{ $t('bingo.form.startBt') }}</Button>
	
				<ToggleBlock :title="$t('global.configs')" class="configs" :open="false" small v-if="triggerMode === false">
					<PostOnChatParam class="card-item" botMessageKey="bingoStart"
						:placeholderEnabled="false"
						titleKey="bingo.form.announce_start"
						:placeholders="startPlaceholders"
					/>
					<PostOnChatParam class="card-item" botMessageKey="bingo"
						titleKey="bingo.form.announce_winner"
						:placeholders="winnerPlaceholders"
					/>
				</ToggleBlock>
			</form>
		</div>
	</div>
</template>

<script lang="ts">
import { TriggerEventPlaceholders, type TriggerActionBingoData, type TriggerData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel.vue';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import TabMenu from '../TabMenu.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';

@Component({
	components:{
		Button,
		TabMenu,
		ParamItem,
		CloseButton,
		ToggleBlock,
		PostOnChatParam,
	},
	emits:["close"]
})
export default class BingoForm extends AbstractSidePanel {

	@Prop({type: Boolean, default: false})
	public triggerMode!:boolean;
	
	//This is used by the trigger action form.
	@Prop({type: Object, default:{}})
	public action!:TriggerActionBingoData;

	@Prop
	public triggerData!:TriggerData;

	public globalEmotes:TwitchatDataTypes.Emote[] = [];
	public mode:"num"|"emote"|"custom" = "num";
	public minValue:TwitchatDataTypes.ParameterData<number> = {value:0, type:"number", min:0, max:999999999};
	public maxValue:TwitchatDataTypes.ParameterData<number> = {value:100, type:"number", min:0, max:999999999};
	public customValue:TwitchatDataTypes.ParameterData<string|undefined> = {value:"", type:"string", maxLength:500, placeholderKey:"bingo.form.custom_placeholder"};
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
			min: this.minValue.value,
			max: this.maxValue.value,
			customValue: this.customValue.value,
		}
	}

	public get startPlaceholders():TwitchatDataTypes.PlaceholderEntry[] {
		return [
			{
				tag:"GOAL", descKey:'bingo.form.goal_placeholder',
				example:this.mode == "emote"? this.$t('bingo.form.goal_emote')
											: this.$t('bingo.form.goal_number', {MIN:this.minValue.value, MAX:this.maxValue.value})
			}
		];
	}

	public async beforeMount():Promise<void> {
		this.minValue.labelKey		= "bingo.form.min_value";
		this.maxValue.labelKey		= "bingo.form.max_value";
		this.customValue.labelKey	= "bingo.form.custom_value";

		this.winnerPlaceholders = [{tag:"USER", descKey:"bingo.form.winner_placeholder", example:this.$store("auth").twitch.user.displayName}];
		if(this.triggerMode && this.action.bingoData) {
			if(this.action.bingoData.guessNumber) this.mode = "num";
			if(this.action.bingoData.guessEmote) this.mode = "emote";
			if(this.action.bingoData.guessCustom) this.mode = "custom";
			this.minValue.value = this.action.bingoData.min;
			this.maxValue.value = this.action.bingoData.max;
			this.customValue.value = this.action.bingoData.customValue;
		}
		
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
		this.$store("bingo").startBingo(this.finalData);
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