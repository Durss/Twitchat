<template>
	<div class="bingostate gameStateWindow">
		<h1 class="title" v-stickyTopShadow><Icon name="bingo" />{{ $t("bingo.state.title") }}</h1>

		<div class="card-item goal" v-if="bingoData.guessNumber">
			<strong class="guess">{{bingoData.numberValue}}</strong>
		</div>

		<div class="card-item goal" v-else-if="bingoData.guessEmote">
			<img class="emote" :src="bingoData.emoteValue?.twitch?.image.hd">
			<span class="code">{{bingoData.emoteValue?.twitch?.code}}</span>
		</div>

		<div class="card-item goal" v-if="bingoData.guessCustom">
			<span class="guess">{{bingoData.customValue}}</span>
		</div>

		<div class="card-item winners" v-if="bingoData.winners && bingoData.winners.length > 0">
			<p><Icon name="sub" />{{ $t("bingo.state.winner") }}</p>
			<div class="entries">
				<TTButton v-for="w in bingoData.winners" :key="w.id"
				small light
				type="link"
				target="_blank"
				:href="'https://twitch.tv/'+w.login"
				@click.prevent="openUserCard(w)">{{ w.displayName }}</TTButton>
			</div>
		</div>

		<TTButton @click="closeBingo()" alert>{{ $t('bingo.state.closeBt') }}</TTButton>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		TTButton,
	},
	emits:["close"]
})
class BingoState extends Vue {

	public winnerPlaceholders:TwitchatDataTypes.PlaceholderEntry[] = [];

	public get bingoData():TwitchatDataTypes.BingoConfig { return this.$store.bingo.data!; }

	public mounted():void {
		this.winnerPlaceholders = [{tag:"USER", descKey:"bingo.username_placeholder", example:this.$store.auth.twitch.user.displayName}]
	}

	public closeBingo():void {
		this.$store.bingo.stopBingo();
		this.$emit("close");
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser | null):void {
		if(!user) return;
		this.$store.users.openUserCard(user);
	}

}
export default toNative(BingoState);
</script>

<style scoped lang="less">
.bingostate{

	.goal {
		.emboss();
		// padding: .5em;
		// border-radius: var(--border-radius);
		// background-color: var(--color-secondary);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: .5em;
		.guess {
			font-size: 1.25em;
			text-align: center;
			display: block;
		}
		.emote {
			height: 4em;
			object-fit: fill;
		}
		.code {
			font-style: italic;
			font-size: .8em;
		}
	}

	.winners {
		background: var(--color-secondary);
		border-radius: var(--border-radius);
		font-weight: bold;
		.icon {
			height: 1em;
			margin-right: .25em;
		}
		.entries {
			margin-top: .5em;
		}
	}

}
</style>
