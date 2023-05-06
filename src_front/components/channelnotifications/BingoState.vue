<template>
	<div class="bingostate gameStateWindow">
		<h1 class="title"><img src="@/assets/icons/bingo.svg">{{ $t("bingo.state.title") }}</h1>

		<div class="item card-item winners primary" v-if="bingoData.winners && bingoData.winners.length > 0">
			<div class="header">
				<p>{{ $t("raffle.state_winners") }}</p>
			</div>
			<div class="entries">
				<Button v-for="w in bingoData.winners" :key="w.id"
				small secondary
				type="link"
				target="_blank"
				:href="'https://twitch.tv/'+w.login"
				@click.prevent="openUserCard(w)">{{ w.displayName }}</Button>
			</div>
		</div>

		<div class="goal" v-if="bingoData.guessNumber">
			<div class="header">
				<div class="title">{{ $t("bingo.state.find_number") }}</div>
			</div>
			<strong class="guess">{{bingoData.numberValue}}</strong>
		</div>
		
		<div class="goal" v-else-if="bingoData.guessEmote">
			<div class="header">
				<div class="title">{{ $t("bingo.state.find_emote") }}</div>
			</div>
			<img class="emote" :src="bingoData.emoteValue?.twitch?.image.hd">
			<span class="code">{{bingoData.emoteValue?.twitch?.code}}</span>
		</div>
		
		<div class="goal" v-if="bingoData.guessCustom">
			<div class="header">
				<div class="title">{{ $t("bingo.state.find_custom") }}</div>
			</div>
			<span class="guess">{{bingoData.customValue}}</span>
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

	public openUserCard(user:TwitchatDataTypes.TwitchatUser | null):void {
		if(!user) return;
		this.$store("users").openUserCard(user);
	}

}
</script>

<style scoped lang="less">
.bingostate{

	.goal {
		.emboss();
		padding: .5em;
		border-radius: var(--border-radius);
		background-color: var(--color-secondary);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: .5em;
		.guess {
			font-size: 1.5em;
		}
		.emote {
			height: 4em;
			object-fit: fill;
			transition: transform .25s;
			&:hover {
				transform: scale(2);
			}
		}
		.code {
			font-style: italic;
			font-size: .8em;
		}
	}

	.winner {
		background: var(--color-secondary);
		padding: 1em;
		border-radius: var(--border-radius);
		font-weight: bold;
	}

}
</style>