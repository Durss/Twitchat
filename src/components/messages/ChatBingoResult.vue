<template>
	<div class="chatbingoresult" @click.ctrl="copyJSON()">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/bingo.svg" alt="icon" class="icon">
		<div>
			<strong>{{bingoData.bingoData.winners![0].displayName}}</strong> won the bingo with answer
			<img class="answer emote" :src="bingoData.bingoData.emoteValue?.twitch?.image.hd" v-if="bingoData.bingoData.guessEmote">
			<strong class="answer" v-else>{{bingoData.bingoData.numberValue}}</strong>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		bingoData:Object
	},
	components:{}
})
export default class ChatBingoResult extends Vue {

	public bingoData!:TwitchatDataTypes.MessageBingoData;

	public get time():string {
		const d = new Date(this.bingoData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.bingoData));
		console.log(this.bingoData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

}
</script>

<style scoped lang="less">
.chatbingoresult{
	background-color: rgba(255, 255, 255, .15);
	border-radius: 5px;
	margin: 5px 0;
	padding: 5px !important;
	text-align: center;

	display: flex;
	flex-direction: row;
	align-items: center;
	color: #fff;

	&>.icon {
		width: 1.5em;
		height: 1.5em;
		object-fit: contain;
		margin-right: 1em;
	}
	.emote {
		width: 2em;
		height: 2em;
		vertical-align: middle;
		object-fit: contain;
	}
}
</style>