<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<Icon name="bits" alt="bits" class="icon"/>

		<div class="holder">
			<i18n-t scope="global" tag="span" keypath="chat.bits" :plural="messageData.bits">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard()">{{messageData.user.displayName}}</a>
				</template>
				<template #BITS>
					<strong>{{ messageData.bits }}</strong>
				</template>
			</i18n-t>
	
			<div class="quote" v-if="messageData.message_chunks">
				<ChatMessageChunksParser :chunks="messageData.message_chunks" :channel="messageData.channel_id" :platform="messageData.platform" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';

@Component({
	components:{
		ChatMessageChunksParser,
	},
	emits:["onRead"],
})
export default class ChatBits extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageCheerData;

	public get classes():string[] {
		let res = ["chatbits", "chatMessage", "highlight"];
		if(this.messageData.deleted === true) res.push("deleted");
		return res;
	}


	public mounted():void {
		const reason = this.$tc("chat.bits", {COUNT:this.messageData.bits, USER:this.messageData.user.displayName});
		this.$store("accessibility").setAriaPolite(reason+" "+this.messageData.message);
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.messageData.user, this.messageData.channel_id);
	}

}
</script>

<style scoped lang="less">
.chatbits{
}
</style>