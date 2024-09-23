<template>
	<div class="chatpatreoneventevent chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="patreon" alt="patreon" class="icon"/>

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" keypath="chat.patreon.new_member">
				<template #USER>
					<strong>{{ messageData.userName }}</strong>
				</template>
				<template #AMOUNT v-if="messageData.eventType == 'new_member'">
					<strong>{{ messageData.amountFormatted }}</strong>
				</template>
			</i18n-t>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
	components:{},
	emits:["onRead"],
})
class ChatPatreonEvent extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessagePatreonData;

}
export default toNative(ChatPatreonEvent);
</script>

<style scoped lang="less">
.chatpatreonevent{
}
</style>