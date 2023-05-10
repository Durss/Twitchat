<template>
	<div class="chathypetraincooldown chatMessage highlight">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<Icon name="train" alt="train" class="icon"/>

		<span>{{ $t("chat.train_cooldown") }}</span>
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
export default class ChatHypeTrainCooldown extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageHypeTrainCooledDownData;

}
</script>

<style scoped lang="less">
.chathypetraincooldown{
	
}
</style>