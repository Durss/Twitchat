<template>
	<div class="chatpatreonevent chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="patreon" alt="patreon" class="icon"/>

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" keypath="chat.patreon.new_member">
				<template #USER>
					<a :href="messageData.user.url" target="_blank"><strong><Icon class="icon" name="newtab" />{{ messageData.user.username }}</strong></a>
				</template>
				<template #AMOUNT v-if="messageData.eventType == 'new_member'">
					<strong>{{ messageData.tier.amount }}</strong>
				</template>
				<template #TIER v-if="messageData.eventType == 'new_member'">
					<strong>{{ messageData.tier.title }}</strong>
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
	a .icon {
		height: 1em;
		vertical-align: middle;
		margin-right: .25em
	}
}
</style>