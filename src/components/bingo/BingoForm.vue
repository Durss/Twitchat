<template>
	<div :class="classes">
		<div class="dimmer" ref="dimmer" @click="close()" v-if="triggerMode === false"></div>
		<div class="holder" ref="holder">
			<div class="head" v-if="triggerMode === false">
				<span class="title">Create Bingo</span>
				<Button aria-label="Close bingo form" :icon="$image('icons/cross_white.svg')" @click="close()" class="close" bounce/>
			</div>
			<div class="content">
				<div class="description" v-if="triggerMode === false">
					<p>A bingo is a small game in which your viewers have to find a specific value to win.</p>
				</div>
				<form @submit.prevent="onSubmit()">
					<div class="tabs">
						<Button title="Number" bounce
							:selected="guessNumber"
							@click="guessNumber = true; guessEmote = false; onValueChange();"
							:icon="$image('icons/number.svg')"
						/>
						<Button title="Emote" bounce
							:selected="guessEmote"
							@click="guessNumber = false; guessEmote = true; onValueChange();"
							:icon="$image('icons/emote.svg')"
						/>
					</div>
					
					<div class="info" v-if="guessNumber">
						Your viewers will have to send a number between the min and max values <i>(included)</i> in the chat
					</div>
					<div class="row" v-if="guessNumber">
						<ParamItem class="item" :paramData="minValue" autofocus @change="onValueChange()" />
					</div>
					<div class="row" v-if="guessNumber">
						<ParamItem class="item" :paramData="maxValue" @change="onValueChange()" />
					</div>

					<div class="info" v-if="guessEmote">
						Your viewers will have to send one of the <strong>{{globalEmotes.length}} global</strong> twitch emotes on your chat <i>(smileys excluded)</i>
					</div>
					<div class="row submit" v-if="triggerMode === false">
						<Button type="submit" title="Start" />
					</div>
				</form>

				<ToggleBlock title="Configs" class="configs" :open="false" small v-if="triggerMode === false">
					<PostOnChatParam botMessageKey="bingoStart"
						:placeholderEnabled="false"
						title="Announce bingo start on chat"
						:placeholders="startPlaceholders"
					/>
					<PostOnChatParam botMessageKey="bingo"
						title="Post bingo winner on chat"
						:placeholders="winnerPlaceholders"
					/>
				</ToggleBlock>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import TwitchUtils from '@/utils/TwitchUtils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Options({
	props:{
		action: {
			type: Object,
			default:{},
		},
		triggerMode: {
			type: Boolean,
			default: false
		}
	},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		PostOnChatParam,
	},
	emits:["close"]
})
export default class BingoForm extends Vue {

	public triggerMode!:boolean;
	//This is used by the trigger action form.
	public action!:TwitchatDataTypes.TriggerActionBingoData;

	public globalEmotes:TwitchDataTypes.Emote[] = [];
	public guessNumber = true;
	public guessEmote = false;
	public minValue:TwitchatDataTypes.ParameterData = {label:"Min value", value:0, type:"number", min:0, max:999999999};
	public maxValue:TwitchatDataTypes.ParameterData = {label:"Max value", value:100, type:"number", min:0, max:999999999};
	public startPlaceholders:TwitchatDataTypes.PlaceholderEntry[] = [{tag:"GOAL", desc:"Explain what to find"}];
	public winnerPlaceholders:TwitchatDataTypes.PlaceholderEntry[] = [{tag:"USER", desc:"User name"}];


	public get classes():string[] {
		const res = ["bingoform"];
		if(this.triggerMode !== false) res.push("triggerMode");
		return res;
	}

	public get finalData():TwitchatDataTypes.BingoConfig {
		return  {
			guessNumber: this.guessNumber,
			guessEmote: this.guessEmote,
			min: this.minValue.value as number,
			max: this.maxValue.value as number,
		}
	}

	public async mounted():Promise<void> {
		if(this.triggerMode && this.action.bingoData) {
			this.guessNumber = this.action.bingoData.guessNumber;
			this.guessEmote = this.action.bingoData.guessEmote;
			this.minValue.value = this.action.bingoData.min;
			this.maxValue.value = this.action.bingoData.max;
		}
		
		if(!this.triggerMode) {
			gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
			gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
			gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
		}
		
		let emotes = await TwitchUtils.getEmotes();
		emotes = emotes.filter(v => v.emote_type == "globals");
		this.globalEmotes = emotes;
	}

	/**
	 * Close bingo form
	 */
	public async close():Promise<void> {
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

	/**
	 * Start a bingo
	 */
	public onSubmit():void {
		StoreProxy.store.dispatch("startBingo", this.finalData);
		this.close();
	}

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
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
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
					&:not(.selected) {
						background-color: fade(@mainColor_normal, 50%);
					}

					&:not(:last-child) {
						margin-right: 1px;
					}

					&:first-child {
						border-top-right-radius: 0;
						border-bottom-right-radius: 0;
						transform-origin: right center;
					}

					&:last-child {
						border-top-left-radius: 0;
						border-bottom-left-radius: 0;
						transform-origin: left center;
					}
				}
			}

			.info, .row {
				margin-top: 10px;
			}

			.row {
				display: flex;
				flex-direction: column;
				
				:deep(input) {
					width: 100px;
					text-align: center;
				}
			}

			.submit {
				margin-top: 20px;
			}
		}

		.configs {
			margin: 1em 0;
		}
	}
	
}
</style>