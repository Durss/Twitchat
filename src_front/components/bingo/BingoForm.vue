<template>
	<div :class="classes">
		<div class="head" v-if="triggerMode === false">
			<CloseButton :aria-label="$t('bingo.closeBt_aria')" @click="close()" />

			<h1 class="title">{{ $t("bingo.title") }}</h1>
			
			<div class="description" v-if="triggerMode === false">{{ $t("bingo.description") }}</div>
		
			<TabMenu v-model="mode"
				:values="['num','emote','custom']"
				:tooltips="[$t('bingo.title_number'), $t('bingo.title_emote'), $t('bingo.title_custom')]"
				:icons="['number', 'emote', 'edit']" />
		</div>

		<div class="content">
			<form @submit.prevent="onSubmit()">
				
				<div class="info" v-if="mode=='num'" v-html="$t('bingo.number_info')"></div>
				<div class="info" v-if="mode=='emote'" v-html="$t('bingo.emote_info', {COUNT:globalEmotes.length})"></div>
				<div class="info" v-if="mode =='custom'">{{ $t("bingo.custom_info") }}</div>

				<ParamItem class="row" v-if="mode=='num'" :paramData="minValue" autofocus @change="onValueChange()" />
				
				<ParamItem class="row" v-if="mode=='num'" :paramData="maxValue" @change="onValueChange()" />

				<ParamItem class="row custom" v-if="mode=='custom'" :paramData="customValue" @change="onValueChange()" />

				<Button v-if="triggerMode === false" type="submit">{{ $t('bingo.startBt') }}</Button>
	
				<ToggleBlock :title="$t('global.configs')" class="configs" :open="false" small v-if="triggerMode === false">
					<PostOnChatParam class="row" botMessageKey="bingoStart"
						:placeholderEnabled="false"
						titleKey="bingo.announce_start"
						:placeholders="startPlaceholders"
					/>
					<PostOnChatParam class="row" botMessageKey="bingo"
						titleKey="bingo.announce_winner"
						:placeholders="winnerPlaceholders"
					/>
				</ToggleBlock>
			</form>
		</div>
	</div>
</template>

<script lang="ts">
import type { TriggerActionBingoData } from '@/types/TriggerActionDataTypes';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import gsap from 'gsap';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import TabMenu from '../TabMenu.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';
import CloseButton from '../CloseButton.vue';

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
export default class BingoForm extends Vue {

	@Prop({type: Boolean, default: false})
	public triggerMode!:boolean;
	
	//This is used by the trigger action form.
	@Prop({type: Object, default:{}})
	public action!:TriggerActionBingoData;

	public globalEmotes:TwitchatDataTypes.Emote[] = [];
	public mode:"num"|"emote"|"custom" = "num";
	public minValue:TwitchatDataTypes.ParameterData<number> = {value:0, type:"number", min:0, max:999999999};
	public maxValue:TwitchatDataTypes.ParameterData<number> = {value:100, type:"number", min:0, max:999999999};
	public customValue:TwitchatDataTypes.ParameterData<string|undefined> = {value:"", type:"string"};
	public winnerPlaceholders!:TwitchatDataTypes.PlaceholderEntry[];

	public get classes():string[] {
		const res = ["bingoform"];
		if(this.triggerMode !== false) res.push("triggerMode");
		return res;
	}

	public get finalData():TwitchatDataTypes.BingoConfig {
		return  {
			guessNumber: this.mode == "num",
			guessEmote: this.mode == "emote",
			guessCustom: this.mode == "emote",
			min: this.minValue.value,
			max: this.maxValue.value,
			customValue: this.customValue.value,
		}
	}

	public get startPlaceholders():TwitchatDataTypes.PlaceholderEntry[] {
		return [
			{
				tag:"GOAL", descKey:'bingo.goal_placeholder',
				example:this.mode == "emote"? this.$t('bingo.goal_emote')
					: this.$t('bingo.goal_number', {MIN:this.minValue.value, MAX:this.maxValue.value})
			}
		];
	}

	public async beforeMount():Promise<void> {
		this.minValue.labelKey		= "bingo.min_value";
		this.maxValue.labelKey		= "bingo.max_value";
		this.customValue.labelKey	= "bingo.custom_value";

		this.winnerPlaceholders = [{tag:"USER", descKey:"bingo.winner_placeholder", example:this.$store("auth").twitch.user.displayName}];
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
	}

	public mounted(): void {
		if(!this.triggerMode) {
			gsap.set(this.$el as HTMLElement, {translateY:0});
			gsap.from(this.$el as HTMLElement, {duration:.4, translateY:"100%", clearProps:"transform", ease:"back.out"});
		}
	}

	/**
	 * Close bingo form
	 */
	public async close():Promise<void> {
		gsap.to(this.$el as HTMLElement, {duration:.25, translateY:"-100%", clearProps:"transform", ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	/**
	 * Start a bingo
	 */
	public onSubmit():void {
		this.$store("bingo").startBingo(this.finalData);
		this.close();
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
	&:not(.triggerMode) {
		.sidePanel();
	}

}
</style>