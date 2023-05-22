<template>
	<div class="chatcommunityboost chatMessage highlight">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
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
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"],
})
export default class ChatCommunityBoost extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageCommunityBoostData

}
</script>

<style scoped lang="less">
.chatcommunityboost{
	
}
</style>