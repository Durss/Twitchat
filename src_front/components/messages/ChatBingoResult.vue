<template>
	<div class="chatbingoresult" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/bingo.svg" alt="icon" class="icon">

		<i18n-t scope="global" tag="div" keypath="chat.bingo.title">
			<template #WINNER>
				<a class="userlink"
				v-if="messageData.bingoData.winners![0]"
				@click.stop="openUserCard(messageData.bingoData.winners![0])">{{messageData.bingoData.winners![0].displayName}}</a>
			</template>
			<template #ANSWER>
				<img class="answer emote" :src="messageData.bingoData.emoteValue?.twitch?.image.hd" v-if="messageData.bingoData.guessEmote">
				<strong class="answer" v-else-if="messageData.bingoData.guessNumber">{{messageData.bingoData.numberValue}}</strong>
				<strong class="answer" v-else>{{messageData.bingoData.customValue}}</strong>	
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		messageData:Object
	},
	components:{},
	emits:["onRead"]
})
export default class ChatBingoResult extends Vue {

	public messageData!:TwitchatDataTypes.MessageBingoData;

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user);
	}


}
</script>

<style scoped lang="less">
.chatbingoresult{
	.chatMessageHighlight();

	.emote {
		width: 2em;
		height: 2em;
		vertical-align: middle;
		object-fit: contain;
	}
}
</style>