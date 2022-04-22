<template>
	<div class="chatbingoresult" @click.ctrl="copyJSON()">
		<span class="time" v-if="$store.state.params.appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/bingo.svg" alt="icon" class="icon">
		<div>
			<strong>{{bingoData.data.winners[0]["display-name"]}}</strong> won the bingo with answer
			<img class="answer emote" :src="bingoData.data.emoteValue.images.url_2x" v-if="bingoData.data.guessEmote">
			<strong class="answer" v-else>{{bingoData.data.numberValue}}</strong>
		</div>
	</div>
</template>

<script lang="ts">
import { IRCEventDataList } from '@/utils/IRCEvent';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		bingoData:Object
	},
	components:{}
})
export default class ChatBingoResult extends Vue {

	public bingoData!:IRCEventDataList.BingoResult;

	public get time():string {
		const d = new Date(parseInt(this.bingoData.tags['tmi-sent-ts'] as string));
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.bingoData));
		console.log(this.bingoData);
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
		margin-right: 20px;
	}
	.emote {
		width: 2em;
		height: 2em;
		vertical-align: middle;
		object-fit: contain;
	}
}
</style>