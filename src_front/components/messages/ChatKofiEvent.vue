<template>
	<div class="chatkofievent chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="kofi" alt="kofi" class="icon"/>

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" :keypath="labelKey">
				<template #USER>
					<strong>{{ messageData.userName }}</strong>
				</template>

				<template #AMOUNT>
					<strong>{{ messageData.amountFormatted }}</strong>
				</template>

				<template #TIER v-if="messageData.eventType == 'subscription'">
					<strong>{{ messageData.tier }}</strong>
				</template>

				<template #COMMISSION_LINK v-if="messageData.eventType == 'commission'">
					<a :href="messageData.url" target="_blank"><strong><Icon name="newtab" />{{ $t("chat.kofi.commission_link") }}</strong></a>
				</template>

				<template #PRODUCT v-if="messageData.eventType == 'merch' && messageData.products">
					<template v-for="(p, index) in messageData.products" :key="p.id">
						<a :href="'https://ko-fi.com/s/'+p.id" target="_blank"><Icon name="newtab" />{{ p.name || p.id }}</a>
						<span class="count" v-if="p.quantity">(x{{ p.quantity }})</span>
						<span v-if="index == messageData.products.length-2">&nbsp;{{ $t("global.and") }}&nbsp;</span>
						<span v-else-if="index < messageData.products.length-2 && index > 0">, </span>
					</template>
				</template>
			</i18n-t>
			<div class="quote" v-if="(messageData.eventType == 'donation' || messageData.eventType == 'merch') && messageData.message">
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
class ChatKofiEvent extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageKofiData;

	public get labelKey():string {
		switch (this.messageData.eventType) {
			case "merch": return "chat.kofi.merch";
			case "commission": return "chat.kofi.commission";
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

	.messageHolder .icon {
		height: 1em;
		vertical-align: middle;
		margin-right: .25em;
	}
}
</style>
