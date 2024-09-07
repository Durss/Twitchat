<template>
	<div class="chattiltifyevent chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="tiltify" alt="tiltify" class="icon"/>

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" :keypath="labelKey">
				<template #USER>
					<strong>{{ messageData.userName }}</strong>
				</template>
				<template #AMOUNT v-if="messageData.eventType == 'charity'">
					<strong>{{ messageData.amountFormatted }}</strong>
				</template>
				<template #CAMPAIGN v-if="messageData.eventType == 'charity'">
					<a :href="messageData.campaign.url" target="_blank"><strong>{{ messageData.campaign.title }}</strong></a>
				</template>
			</i18n-t>
			<div class="quote" v-if="(messageData.eventType == 'charity') && messageData.message">
				<ChatMessageChunksParser :chunks="messageData.message_chunks"></ChatMessageChunksParser>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';

@Component({
	components:{
		ChatMessageChunksParser,
	},
	emits:["onRead"],
})
class ChatTiltifyEvent extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageTiltifyData;

	public get labelKey():string {
		switch (this.messageData.eventType) {
			case "charity": return "chat.tiltify.charity";
		}
		return "";
	}

}
export default toNative(ChatTiltifyEvent);
</script>

<style scoped lang="less">
.chattiltifyevent{
	.quote {
		margin-top: .5em;
	}
}
</style>