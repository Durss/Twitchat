<template>
	<div :class="classes">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<!-- {{messageData.channel}} -->
		<img :src="$image('icons/'+icon+'.svg')" alt="notice" class="icon">
		<span class="message" v-html="message"></span>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"]
})
export default class ChatNotice extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageNoticeData;
	
	public icon = "secondary/info";

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
			res.push("shield");
			if((this.messageData as TwitchatDataTypes.MessageShieldMode).enabled) {
				res.push("highlight", "alert");
			}else{
				res.push("highlight", "primary");
			}
		}
		if(this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE) {
			res.push("emergency");
			if((this.messageData as TwitchatDataTypes.MessageEmergencyModeInfo).enabled) {
				res.push("highlight", "alert");
			}else{
				res.push("highlight", "primary");
			}
		}
		return res;
	}

	public mounted():void {
		switch(this.messageData.noticeId) {
			case TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE:		this.icon = "shield"; break;
			case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE:	this.icon = "emergency"; break;
		}
		this.$store("accessibility").setAriaPolite(this.message);
	}
}
</script>

<style scoped lang="less">
.chatnotice{
	&:not(.emergency, .shield) {
		.message {
			font-style: italic;
			color: var(--color-secondary);
		}
	}
}
</style>