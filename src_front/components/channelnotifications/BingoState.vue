<template>
	<div class="bingostate">
		<h1 class="title"><img src="@/assets/icons/bingo.svg">{{ $t("bingo.state_title") }}</h1>

		<div class="item number highlight" v-if="bingoData.guessNumber">
			<p>{{ $t("bingo.find_number") }}</p>
			<strong class="guess">{{bingoData.numberValue}}</strong>
		</div>
		
		<div class="item emote highlight" v-if="bingoData.guessEmote">
			<strong>{{ $t("bingo.find_emote") }}</strong>
			<img :src="bingoData.emoteValue?.twitch?.image.hd">
			<span class="code">{{bingoData.emoteValue?.twitch?.code}}</span>
		</div>
		
		<div class="item emote highlight" v-if="bingoData.guessCustom">
			<strong>{{ $t("bingo.find_custom") }}</strong>
			<span class="guess">{{bingoData.customValue}}</span>
		</div>

		<div class="item winner" v-if="bingoData.winners && bingoData.winners.length > 0">
			🎉 {{bingoData.winners[0].displayName}} 🎉
		</div>

		<PostOnChatParam class="item postChat highlight" botMessageKey="bingo"
			:placeholders="winnerPlaceholders" 
			titleKey="global.post_winner" />

		<Button class="item"
			icon="cross"
			:title="$t('bingo.closeBt')"
			highlight
			@click="closeBingo()" />
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import PostOnChatParam from '../params/PostOnChatParam.vue';

@Component({
	components:{
		Button,
		PostOnChatParam,
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
		color: var(--mainColor_normal);
		
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

	.postChat {
		max-width: 320px;
		font-size: .8em;
		color: var(--mainColor_normal);
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