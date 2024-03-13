<template>
	<div class="chatstreamelementsevent chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="streamelements" alt="streamelements" class="icon"/>

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" :keypath="labelKey">
				<template #USER>
					<strong>{{ messageData.userName }}</strong>
				</template>
				<template #AMOUNT v-if="messageData.eventType == 'donation'">
					<strong>{{ messageData.amountFormatted }}</strong>
				</template>
			</i18n-t>
			<div class="quote" v-if="messageData.eventType == 'donation' && messageData.message">
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
	emits:["onRead"],
})
class ChatStreamelementsEvent extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageStreamelementsData;

	public get labelKey():string {
		switch (this.messageData.eventType) {
			case "donation": return "chat.streamelements.donation";
		}
		return "";
	}

}
export default toNative(ChatStreamelementsEvent);
</script>

<style scoped lang="less">
.chatstreamelementsevent{
	.quote {
		margin-top: .5em;
	}
}
</style>