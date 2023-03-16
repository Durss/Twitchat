<template>
	<div class="chatcommunityboost">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img src="@/assets/icons/boost.svg" alt="boost" class="icon">

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
	.chatMessageHighlight();
	
}
</style>