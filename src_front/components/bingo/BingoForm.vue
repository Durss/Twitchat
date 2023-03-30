<template>
	<div :class="classes">
		<div class="holder" ref="holder">
			<div class="head" v-if="triggerMode === false">
				<span class="title">{{ $t("bingo.title") }}</span>
				<Button :aria-label="$t('bingo.closeBt_aria')" :icon="$image('icons/cross.svg')" @click="close()" class="close" bounce/>
			</div>
			<div class="content">
				<div class="description" v-if="triggerMode === false">{{ $t("bingo.description") }}</div>
				<form @submit.prevent="onSubmit()">
					<div class="tabs">
						<Button :title="$t('bingo.title_number')" bounce
							:selected="guessNumber"
							@click="guessNumber = true; guessEmote = false; guessCustom = false; onValueChange();"
							:icon="$image('icons/number.svg')"
						/>
						<Button :title="$t('bingo.title_emote')" bounce
							:selected="guessEmote"
							@click="guessNumber = false; guessEmote = true; guessCustom = false; onValueChange();"
							:icon="$image('icons/emote.svg')"
						/>
						<Button :title="$t('bingo.title_custom')" bounce
							:selected="guessCustom"
							@click="guessNumber = false; guessEmote = false; guessCustom = true; onValueChange();"
							:icon="$image('icons/edit.svg')"
						/>
					</div>
					
					<div class="info" v-if="guessNumber" v-html="$t('bingo.number_info')"></div>
					<div class="row" v-if="guessNumber">
						<ParamItem class="item" :paramData="minValue" autofocus @change="onValueChange()" />
					</div>
					
					<div class="row" v-if="guessNumber">
						<ParamItem class="item" :paramData="maxValue" @change="onValueChange()" />
					</div>

					<div class="info" v-if="guessEmote" v-html="$t('bingo.emote_info', {COUNT:globalEmotes.length})"></div>

					<div class="info" v-if="guessCustom">{{ $t("bingo.custom_info") }}</div>

					<div class="row" v-if="guessCustom">
						<ParamItem class="item custom" :paramData="customValue" @change="onValueChange()" />
					</div>

					<div class="row submit" v-if="triggerMode === false">
						<Button type="submit" :title="$t('global.start')" />
					</div>
				</form>

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
			</div>
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
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Component({
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		PostOnChatParam,
	},
	emits:["close"]
})
export default class BingoForm extends Vue {

	@Prop({
			type: Boolean,
			default: false
		})
	public triggerMode!:boolean;
	//This is used by the trigger action form.
	@Prop({
			type: Object,
			default:{},
		})
	public action!:TriggerActionBingoData;

	public globalEmotes:TwitchatDataTypes.Emote[] = [];
	public guessNumber = true;
	public guessEmote = false;
	public guessCustom = false;
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
			guessNumber: this.guessNumber,
			guessEmote: this.guessEmote,
			guessCustom: this.guessCustom,
			min: this.minValue.value,
			max: this.maxValue.value,
			customValue: this.customValue.value,
		}
	}

	public get startPlaceholders():TwitchatDataTypes.PlaceholderEntry[] {
		return [
			{
				tag:"GOAL", descKey:'bingo.goal_placeholder',
				example:this.guessEmote? this.$t('bingo.goal_emote')
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
			this.guessNumber = this.action.bingoData.guessNumber;
			this.guessEmote = this.action.bingoData.guessEmote;
			this.guessCustom = this.action.bingoData.guessCustom;
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
			gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
			gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
		}
	}

	/**
	 * Close bingo form
	 */
	public async close():Promise<void> {
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
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
		.modal();
	}

	.content {
		.description {
			text-align: center;
			font-size: .8em;
			margin-bottom: 20px;
		}

		form {
			display: flex;
			flex-direction: column;

			.tabs {
				display: flex;
				flex-direction: row;
				justify-content: center;

				.button {
					background-color: @mainColor_normal;
					border-radius: 0;
					&:not(.selected) {
						background-color: fade(@mainColor_normal, 50%);
					}

					&:not(:last-child) {
						margin-right: 1px;
					}

					&:first-child {
						border-top-left-radius: @border_radius;
						border-bottom-left-radius: @border_radius;
						transform-origin: right center;
					}

					&:last-child {
						border-top-right-radius: @border_radius;
						border-bottom-right-radius: @border_radius;
						transform-origin: left center;
					}
				}
			}

			.info, .row {
				margin-top: 10px;
			}

			.submit {
				margin-top: 20px;
			}
		}

		.row {
			display: flex;
			flex-direction: column;
			background-color: fade(@mainColor_normal_extralight, 30%);
			padding: .5em;
			border-radius: .5em;
			
			:deep(input) {
				flex-basis: 100px;
				text-align: center;
			}
			&:not(:first-child) {
				margin-top: .5em;
			}

			.custom {
				:deep(input) {
					flex-basis: 220px;
				}
			}
		}

		.configs {
			margin: 1em 0;
			font-size: 1em;
			:deep(.header) {
				font-size: .8em;
			}
		}
	}
	
}
</style>