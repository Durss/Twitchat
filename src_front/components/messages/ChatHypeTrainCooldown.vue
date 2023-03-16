<template>
	<div class="chathypetraincooldown">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img src="@/assets/icons/train.svg" alt="train" class="icon">

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
	.chatMessageHighlight();
	
}
</style>