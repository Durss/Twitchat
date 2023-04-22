<template>
	<div class="bingostate gameStateWindow">
		<h1 class="title"><img src="@/assets/icons/bingo.svg">{{ $t("bingo.state.title") }}</h1>

		<div class="item goal number card-item" v-if="bingoData.guessNumber">
			<p>{{ $t("bingo.state.find_number") }}</p>
			<strong class="guess">{{bingoData.numberValue}}</strong>
		</div>
		
		<div class="item goal emote card-item" v-if="bingoData.guessEmote">
			<strong>{{ $t("bingo.state.find_emote") }}</strong>
			<img :src="bingoData.emoteValue?.twitch?.image.hd">
			<span class="code">{{bingoData.emoteValue?.twitch?.code}}</span>
		</div>
		
		<div class="item goal emote card-item" v-if="bingoData.guessCustom">
			<strong>{{ $t("bingo.state.find_custom") }}</strong>
			<span class="guess">{{bingoData.customValue}}</span>
		</div>

		<div class="item winner" v-if="bingoData.winners && bingoData.winners.length > 0">
			🎉 {{bingoData.winners[0].displayName}} 🎉
		</div>

		<Button @click="closeBingo()" alert>{{ $t('bingo.state.closeBt') }}</Button>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';

@Component({
	components:{
		Button,
	},
	emits:["close"]
})
export default class BingoState extends Vue {

	public winnerPlaceholders:TwitchatDataTypes.PlaceholderEntry[] = [];

	public get bingoData():TwitchatDataTypes.BingoConfig { return this.$store("bingo").data!; }

	public mounted():void {
		this.winnerPlaceholders = [{tag:"USER", descKey:"bingo.username_placeholder", example:this.$store("auth").twitch.user.displayName}]
	}

	public closeBingo():void {
		this.$store("bingo").stopBingo();
		this.$emit("close");
	}

}
</script>

<style scoped lang="less">
.bingostate{

	.emote, .number {
		display: flex;
		flex-direction: column;
		align-items: center;
		
		.guess {
			margin-top: .25em;
			font-size: 1.5em;
		}

		img {
			height: 2em;
			margin-top: .5em;
			object-fit: fill;
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

	.goal {
		background-color: var(--color-secondary);
		width: fit-content;
	}

	.winner {
		background: var(--mainColor_light);
		padding: .2em .5em;
		border-radius: .5em;
		color: var(--mainColor_normal);
		font-weight: bold;
	}

}
</style>