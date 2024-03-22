<template>
	<div class="chattipeeevent chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="tipeee" alt="tipeee" class="icon"/>

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" :keypath="labelKey">
				<template #USER>
					<strong>{{ messageData.userName }}</strong>
				</template>
				
				<template #AMOUNT>
					<strong>{{ messageData.amountFormatted }}</strong>
				</template>
				
				<template #MONTHS>
					<strong>{{ messageData.recurringCount }}</strong>
				</template>
			</i18n-t>

			<div class="quote" v-if="messageData.eventType == 'donation' || messageData.eventType == 'merch' && messageData.message">
				<ChatMessageChunksParser :chunks="messageData.message_chunks"></ChatMessageChunksParser>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import AbstractChatMessage from './AbstractChatMessage';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';

@Component({
	components:{
		Icon,
		ChatMessageChunksParser,
	},
	emits:["onRead"],
})
class ChatTipeeeEvent extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageTipeeeDonationData;

public get labelKey():string {
	if(this.messageData.recurring && this.messageData.recurringCount > 1) return "chat.tipeee.donation_recurring";
	if(this.messageData.recurring) return "chat.tipeee.monthly";
	return "chat.tipeee.donation";
}

}
export default toNative(ChatTipeeeEvent);
</script>

<style scoped lang="less">
.chattipeeevent{
	
	.quote {
		margin-top: .5em;
	}

	.count {
		font-style: italic;
	}
	
}
</style>