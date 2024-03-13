<template>
	<div class="chatkofievent chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="kofi" alt="kofi" class="icon"/>

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" :keypath="labelKey">
				<template #USER>
					<strong v-if="messageData.isPublic">{{ messageData.userName }}</strong>
					<strong v-else>{{ $t("chat.kofi.anonymous") }}</strong>
				</template>
				
				<template #AMOUNT>
					<strong>{{ messageData.amountFormatted }}</strong>
				</template>

				<template #TIER v-if="messageData.eventType == 'subscription'">
					<strong>{{ messageData.tier }}</strong>
				</template>

				<template #PRODUCT v-if="messageData.eventType == 'merch' && messageData.products">
					<template v-for="(p, index) in messageData.products" :key="p.id">
						<a :href="'https://ko-fi.com/s/'+p.id" target="_blank">{{ p.name || p.id }}</a>
						<span class="count" v-if="p.quantity">(x{{ p.quantity }})</span>
						<span v-if="index == messageData.products.length-2">&nbsp;{{ $t("global.and") }}&nbsp;</span>
						<span v-else-if="index < messageData.products.length-2 && index > 0">, </span>
					</template>
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
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		ChatMessageChunksParser,
	},
	emits:["onRead"],
})
class ChatKofiEvent extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageKofiData;

	public get labelKey():string {
		switch (this.messageData.eventType) {
			case "merch": return "chat.kofi.merch";
			case "donation": return "chat.kofi.donation";
			case "subscription": return this.messageData.tier? "chat.kofi.subscription_tier" : "chat.kofi.subscription";
		}
		return "";
	}

}
export default toNative(ChatKofiEvent);
</script>

<style scoped lang="less">
.chatkofievent{
	
	.quote {
		margin-top: .5em;
	}

	.count {
		font-style: italic;
	}
}
</style>