<template>
	<div class="chatcountdownresult chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		<Icon name="countdown" alt="icon" class="icon"/>
		<i18n-t scope="global" tag="div" v-if="messageData.aborted === true" keypath="chat.countdown.abort">
			<template #DURATION><strong>{{messageData.duration_str}}</strong></template>
			<template #ABORT_DURATION><strong>{{messageData.finalDuration_str}}</strong></template>
		</i18n-t>

		<i18n-t scope="global" tag="div" v-else-if="messageData.endedAt_str" keypath="chat.countdown.complete">
			<template #DURATION><strong>{{messageData.duration_str}}</strong></template>
		</i18n-t>

		<i18n-t scope="global" tag="div" v-else keypath="chat.countdown.start">
			<template #DURATION><strong>{{messageData.duration_str}}</strong></template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{},
	emits:["onRead"]
})
class ChatCountdownResult extends AbstractChatMessage {
	@Prop()
	declare messageData:TwitchatDataTypes.MessageCountdownData;
}
export default toNative(ChatCountdownResult);
</script>

<style scoped lang="less">
.chatcountdownresult{
}
</style>
