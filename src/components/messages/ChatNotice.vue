<template>
	<div class="chatnotice">
		<span class="time" v-if="$store.state.params.appearance.displayTime.value">{{time}}</span>
		{{messageData.channel}}
		<img src="@/assets/icons/infos.svg" alt="notice" class="icon">
		<span class="message" v-html="text"></span>
	</div>
</template>

<script lang="ts">
import { IRCEventDataList } from '@/utils/IRCEvent';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		messageData:Object,
	},
	components:{}
})
export default class ChatNotice extends Vue {
	
	public messageData!:IRCEventDataList.Notice;

	/**
	 * Gets text message with parsed emotes
	 */
	public get text():string {
		const mess = this.messageData as IRCEventDataList.Notice;
		let text = mess.message;
		text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;")
		text = text.replace(/&lt;(\/)?strong&gt;/gi, "<$1strong>");
		
		return text;
	}

	public get time():string {
		const message = this.messageData as IRCEventDataList.Notice;
		const d = new Date(parseInt(message.tags['tmi-sent-ts'] as string));
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}
}
</script>

<style scoped lang="less">
.chatnotice{

	.icon {
		width: 18px;
		height: 18px;
		margin-right: 5px;
		vertical-align: middle;
	}
	.message {
		font-style: italic;
		opacity: .7;
		color: @mainColor_warn;
	}
}
</style>