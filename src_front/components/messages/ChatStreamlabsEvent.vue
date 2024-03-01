<template>
	<div class="chatstreamlabsevent chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="streamlabs" alt="streamlabs" class="icon"/>

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" :keypath="labelKey">
				<template #USER>
					<strong>{{ messageData.userName }}</strong>
				</template>
				<template #AMOUNT v-if="messageData.eventType == 'donation' || messageData.eventType == 'patreon_pledge'">
					<strong>{{ messageData.amountFormatted }}</strong>
				</template>
				<template #PRODUCT v-if="messageData.eventType == 'merch'">
					<strong>{{ messageData.product }}</strong>
				</template>
			</i18n-t>
			<div class="quote" v-if="messageData.eventType == 'donation' || messageData.eventType == 'merch' && messageData.message">
				<ChatMessageChunksParser :chunks="messageData.message_chunks"></ChatMessageChunksParser>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';

@Component({
	components:{
		ChatMessageChunksParser,
	},
	emits:[],
})
class ChatStreamlabsEvent extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageStreamlabsData;

	public get labelKey():string {
		switch (this.messageData.eventType) {
			case "merch": return "chat.streamlabs.merch";
			case "donation": return "chat.streamlabs.donation";
			case "patreon_pledge": return "chat.streamlabs.patreon_pledge";
		}
		return "";
	}

}
export default toNative(ChatStreamlabsEvent);
</script>

<style scoped lang="less">
.chatstreamlabsevent{
	.quote {
		margin-top: .5em;
	}
}
</style>