<template>
	<div class="chattimerresult chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="timer" alt="icon" class="icon"/>

		<i18n-t scope="global" tag="div" keypath="chat.timer.end">
			<template #DURATION><strong>{{messageData.duration_str}}</strong></template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{},
	emits:["onRead"]
})
class ChatTimerResult extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageTimerData;

}
export default toNative(ChatTimerResult);
</script>

<style scoped lang="less">
.chattimerresult{
	.error {
		padding: .1em .5em;
	}
}
</style>
