<template>
	<div class="chatcommunityboost chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="boost" alt="boost" class="icon"/>

		<i18n-t scope="global" tag="span" keypath="chat.boosted">
			<template #COUNT>
				<strong>{{ messageData.viewers }}</strong>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{},
	emits:["onRead"],
})
 class ChatCommunityBoost extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageCommunityBoostData

}
export default toNative(ChatCommunityBoost);
</script>

<style scoped lang="less">
.chatcommunityboost{
	
}
</style>