<template>
	<div class="bingostate">
		<h1 class="title"><img src="@/assets/icons/bingo.svg">Bingo</h1>

		<div class="item number highlight" v-if="bingoData.guessNumber">
			<p>Number to find</p>
			<strong class="guess">{{bingoData.numberValue}}</strong>
		</div>
		
		<div class="item emote highlight" v-if="bingoData.guessEmote">
			<strong>Emote to find</strong>
			<img :src="bingoData.emoteValue?.twitch?.image.hd">
			<span class="code">{{bingoData.emoteValue?.twitch?.code}}</span>
		</div>

		<div class="item winner" v-if="bingoData.winners && bingoData.winners.length > 0">
			🎉 {{bingoData.winners[0].displayName}} won 🎉
		</div>

		<PostOnChatParam class="item postChat" botMessageKey="bingo" :placeholders="winnerPlaceholders" clearToggle />

		<Button class="item"
			:icon="$image('icons/cross_white.svg')"
			title="Close bingo"
			highlight
			@click="closeBingo()" />
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';

@Options({
	props:{},
	components:{
		Button,
		PostOnChatParam,
	}
})
export default class BingoState extends Vue {

	public winnerPlaceholders:TwitchatDataTypes.PlaceholderEntry[] = [{tag:"USER", desc:"User name"}];

	public get bingoData():TwitchatDataTypes.BingoConfig { return this.$store("bingo").data!; }

	public mounted():void {
	}

	public closeBingo():void {
		this.$store("bingo").stopBingo();
		this.$emit("close");
	}

}
</script>

<style scoped lang="less">
.bingostate{
	.gameStateWindow();

	.emote, .number {
		display: flex;
		flex-direction: column;
		align-items: center;
		color: @mainColor_normal;
		
		.guess {
			margin-top: .25em;
			font-size: 1.5em;
		}

		img {
			height: 2em;
			margin-top: .5em;
			object-fit: contain;
			transition: transform .25s;
			&:hover {
				transform: scale(2.5);
			}
		}

		.code {
			font-style: italic;
			font-size: .8em;
			margin-top: .5em;
		}
	}

	.postChat {
		max-width: 300px;
		font-size: .8em;
	}

	.winner {
		background: @mainColor_light;
		padding: .2em .5em;
		border-radius: .5em;
		color: @mainColor_normal;
		font-weight: bold;
	}

}
</style>