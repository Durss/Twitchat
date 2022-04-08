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

		<ParamItem class="postChat" :paramData="postOnChatParam" />

		<Button class="deleteBt"
			:icon="require('@/assets/icons/cross_white.svg')"
			title="Stop Bingo"
			highlight
			@click="closeBingo()" />
	</div>
</template>

<script lang="ts">
import store, { BingoData, ParameterData } from '@/store';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
	}
})
export default class BingoState extends Vue {
	public postOnChatParam:ParameterData = {label:"Post winner on chat", value:false, type:"toggle"};
	public postOnChatTextParam:ParameterData = {label:"Message ( username => {USER} )", value:"", type:"text", longText:true};

	public get bingoData():BingoData {
		return store.state.bingo as BingoData;
	}

	public mounted():void {
		this.postOnChatTextParam.value = store.state.bingo_message;
		this.postOnChatParam.value = store.state.bingo_messagePost;

		this.postOnChatParam.children = [this.postOnChatTextParam];

		watch(()=>this.postOnChatTextParam.value, ()=> {
			store.state.bingo_message = this.postOnChatTextParam.value as string;//too lazy to make action/mutation for now :3
		})

		watch(()=>this.postOnChatParam.value, ()=> {
			store.state.bingo_messagePost = this.postOnChatParam.value as boolean;//too lazy to make action/mutation for now :3
		})
	}

	public closeBingo():void {
		store.dispatch("startBingo", {});
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

	.postChat {
		width: 70%;
		margin-top: 10px;
		:deep(label) {
			font-size: 15px;
			align-self: center;
		}
		:deep(.child) {
			width: 100%;
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
	}

}
</style>