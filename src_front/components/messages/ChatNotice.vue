<template>
	<div :class="classes">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		<!-- {{messageData.channel}} -->
		<Icon :name="icon" :theme="theme" />
		<span class="message" v-html="message"></span>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{},
	emits:["onRead"]
})
class ChatNotice extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageNoticeData;
	
	public icon = "info";
	public theme = "secondary";

	/**
	 * Gets text message with parsed emotes
	 */
	public get message():string {
		let text = this.messageData.message ?? "";
			text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;")
			text = text.replace(/&lt;(\/)?strong&gt;/gi, "<$1strong>");//Allow <strong> tags
			text = text.replace(/&lt;(\/)?mark&gt;/gi, "<$1mark>");//Allow <mark> tags
		return text;
	}

	public get classes():string[] {
		let res = ["chatnotice", "chatMessage"];
		if(this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.COMMERCIAL_ERROR) res.push("alert");
		if(this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE) {
			if((this.messageData as TwitchatDataTypes.MessageShieldMode).enabled) {
				res.push("highlight", "alert");
			}else{
				res.push("highlight", "primary");
			}
		}
		if(this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE) {
			if((this.messageData as TwitchatDataTypes.MessageEmergencyModeInfo).enabled) {
				res.push("highlight", "alert");
			}else{
				res.push("highlight", "primary");
			}
		}
		if(this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.SUB_ONLY_OFF
		|| this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.SLOW_MODE_OFF
		|| this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.EMOTE_ONLY_OFF
		|| this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.FOLLOW_ONLY_OFF) {
			res.push("highlight", "success");
		}
		if(this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.SUB_ONLY_ON
		|| this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.SLOW_MODE_ON
		|| this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.EMOTE_ONLY_ON
		|| this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.FOLLOW_ONLY_ON) {
			res.push("highlight", "error");
		}
		return res;
	}

	public mounted():void {
		switch(this.messageData.noticeId) {
			case TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE:		this.icon = "shield"; this.theme="light"; break;
			case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE:	this.icon = "emergency"; this.theme="light"; break;
			case TwitchatDataTypes.TwitchatNoticeType.SUB_ONLY_ON:		this.icon = "sub"; this.theme="light"; break;
			case TwitchatDataTypes.TwitchatNoticeType.SUB_ONLY_OFF:		this.icon = "sub"; this.theme="light"; break;
			case TwitchatDataTypes.TwitchatNoticeType.FOLLOW_ONLY_ON:	this.icon = "follow"; this.theme="light"; break;
			case TwitchatDataTypes.TwitchatNoticeType.FOLLOW_ONLY_OFF:	this.icon = "follow"; this.theme="light"; break;
			case TwitchatDataTypes.TwitchatNoticeType.EMOTE_ONLY_ON:	this.icon = "emote"; this.theme="light"; break;
			case TwitchatDataTypes.TwitchatNoticeType.EMOTE_ONLY_OFF:	this.icon = "emote"; this.theme="light"; break;
			case TwitchatDataTypes.TwitchatNoticeType.SLOW_MODE_ON:		this.icon = "slow"; this.theme="light"; break;
			case TwitchatDataTypes.TwitchatNoticeType.SLOW_MODE_OFF:	this.icon = "slow"; this.theme="light"; break;
		}
		this.$store.accessibility.setAriaPolite(this.message);
	}
}
export default toNative(ChatNotice);
</script>

<style scoped lang="less">
.chatnotice{
	&:not(.highlight) {
		.message {
			font-style: italic;
			font-weight: normal;
			color: var(--color-secondary);
		}
	}
}
</style>