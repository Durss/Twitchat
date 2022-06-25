<template>
	<div class="bingoform">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">Create Bingo</span>
				<Button aria-label="Close bingo form" :icon="$image('icons/cross_white.svg')" @click="close()" class="close" bounce/>
			</div>
			<div class="content">
				<div class="description">
					<p>A bingo is a small game in which your viewers have to find a specific value to win.</p>
				</div>
				<form @submit.prevent="onSubmit()">
					<div class="tabs">
						<Button title="Number" bounce :selected="guessNumber" @click="guessNumber = true; guessEmote = false;" :icon="$image('icons/number.svg')" />
						<Button title="Emote" bounce :selected="guessEmote" @click="guessNumber = false; guessEmote = true;" :icon="$image('icons/emote.svg')" />
					</div>
					
					<div class="info" v-if="guessNumber">
						Your viewers will have to send a number between the min and max values <i>(included)</i> in the chat
					</div>
					<div class="row" v-if="guessNumber">
						<ParamItem class="item" :paramData="minValue" autofocus />
					</div>
					<div class="row" v-if="guessNumber">
						<ParamItem class="item" :paramData="maxValue" />
					</div>

					<div class="info" v-if="guessEmote">
						Your viewers will have to send one of the <strong>{{globalEmotes.length}} global</strong> twitch emotes on your chat <i>(smileys excluded)</i>
					</div>
					<div class="row submit">
						<Button type="submit" title="Start" />
					</div>
				</form>

				<Splitter title="Config" class="splitter" />

				<PostOnChatParam botMessageKey="bingoStart"
					:placeholderEnabled="false"
					title="Announce bingo start on chat"
					:placeholders="startPlaceholders"
				/>
				<PostOnChatParam botMessageKey="bingo"
					title="Post bingo winner on chat"
					:placeholders="winnerPlaceholders"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import TwitchUtils from '@/utils/TwitchUtils';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';
import Splitter from '../Splitter.vue';
import type { BingoConfig, ParameterData, PlaceholderEntry } from '@/types/TwitchatDataTypes';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		Splitter,
		PostOnChatParam,
	},
	emits:["close"]
})
export default class BingoForm extends Vue {

	public globalEmotes:TwitchDataTypes.Emote[] = [];
	public guessNumber = true;
	public guessEmote = false;
	public minValue:ParameterData = {label:"Min value", value:0, type:"number", min:0, max:999999999};
	public maxValue:ParameterData = {label:"Max value", value:100, type:"number", min:0, max:999999999};
	public startPlaceholders:PlaceholderEntry[] = [{tag:"GOAL", desc:"Explain what to find"}];
	public winnerPlaceholders:PlaceholderEntry[] = [{tag:"USER", desc:"User name"}];

	public async mounted():Promise<void> {
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
		
		let emotes = await TwitchUtils.getEmotes();
		emotes = emotes.filter(v => v.emote_type == "globals");
		this.globalEmotes = emotes
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
		const min = this.minValue.value as number;
		const max = this.maxValue.value as number;
		const payload:BingoConfig = {
			guessNumber: this.guessNumber,
			guessEmote: this.guessEmote,
			min,
			max,
		};
		store.dispatch("startBingo", payload);
		this.close();
	}

}
</script>

<style scoped lang="less">
.bingoform{
	
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	.modal();

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

		.splitter {
			margin: 1em 0;
		}
	}
	
}
</style>