<template>
	<div class="chattimerresult">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img src="@/assets/icons/timer.svg" alt="icon" class="icon">
		
		<i18n-t scope="global" tag="div" keypath="chat.timer.end">
			<template #DURATION><strong>{{messageData.duration}}</strong></template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"]
})
export default class ChatTimerResult extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageTimerData;

	public abortDuration:string = "";
	
	public beforeMount(): void {
	}
}
</script>

<style scoped lang="less">
.chattimerresult{
	.chatMessageHighlight();
}
</style>