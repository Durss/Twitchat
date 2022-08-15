<template>
	<div class="bingostate">
		<h1 class="title"><img src="@/assets/icons/bingo.svg">Bingo</h1>

		<div class="number" v-if="bingoData.guessNumber">Number to find<strong>{{bingoData.numberValue}}</strong></div>
		
		<div class="emote" v-if="bingoData.guessEmote">
			Emote to find
			<img :src="bingoData.emoteValue.images.url_2x">
			<span class="code">({{bingoData.emoteValue.name}})</span>
		</div>

		<div class="winner" v-if="bingoData.winners?.length > 0">
			🎉 {{bingoData.winners[0]["display-name"]}} won 🎉
		</div>

		<PostOnChatParam class="postChat" botMessageKey="bingo" :placeholders="winnerPlaceholders" />

		<Button class="deleteBt"
			:icon="$image('icons/cross_white.svg')"
			title="Stop Bingo"
			highlight
			@click="closeBingo()" />
	</div>
</template>

<script lang="ts">
import type { PlaceholderEntry } from '@/types/TwitchatDataTypes';
import type { BingoData } from '@/utils/CommonDataTypes';
import StoreProxy from '@/utils/StoreProxy';
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

	public winnerPlaceholders:PlaceholderEntry[] = [{tag:"USER", desc:"User name"}];

	public get bingoData():BingoData {
		return StoreProxy.store.state.bingo as BingoData;
	}

	public mounted():void {
	}

	public closeBingo():void {
		StoreProxy.store.dispatch("stopBingo");
		this.$emit("close");
	}

}
</script>

<style scoped lang="less">
.bingostate{
	color: @mainColor_light;
	align-items: center;

	&>.title {
		color: @mainColor_light;
		width: 100%;
		text-align: center;
		padding-bottom: 10px;
		word-break: break-word;
		img {
			width: 20px;
			margin-right: 10px;
		}
	}

	.emote, .number {
		display: flex;
		flex-direction: column;
		align-items: center;
		
		strong {
			margin-top: 10px;
			font-size: 1.5em;
		}

		img {
			height: 2em;
			margin-top: 10px;
			object-fit: contain;
		}

		.code {
			font-style: italic;
			font-size: .8em;
			margin-top: 10px;
		}
	}

	&.postChat {
		width: 70%;
		margin-top: 10px;
		font-size: .8em;
		:deep(.togglebutton) {
			border-color: @mainColor_light;
			.circle {
				background-color: @mainColor_light;
			}
		}
		:deep(.togglebutton.selected) {
			background-color: fade(@mainColor_light, 40%);
		}
		:deep(.togglebutton:hover) {
			background-color: fade(@mainColor_light, 50%);
		}
	}

	.winner {
		margin-top: 20px;
		background: @mainColor_light;
		padding: 2px 5px;
		border-radius: 5px;
		color: @mainColor_normal;
		font-weight: bold;
	}

	.deleteBt {
		margin-top: 20px;
		min-height: 2em;
	}

}
</style>