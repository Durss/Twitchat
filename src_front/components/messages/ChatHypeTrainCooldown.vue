<template>
	<div class="chathypetraincooldown chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="train" alt="train" class="icon"/>

		<span>{{ $t("chat.train_cooldown") }}</span>
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
 class ChatHypeTrainCooldown extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageHypeTrainCooledDownData;

}
export default toNative(ChatHypeTrainCooldown);
</script>

<style scoped lang="less">
.chathypetraincooldown{
	
}
</style>