<template>
	<div class="chatcountdownresult" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/countdown.svg" alt="icon" class="icon">
		<i18n-t scope="global" tag="div" v-if="aborted" keypath="chat.countdown.abort">
			<template #DURATION><strong>{{messageData.countdown.duration}}</strong></template>
			<template #ABORT_DURATION><strong>{{abortDuration}}</strong></template>
		</i18n-t>
		
		<i18n-t scope="global" tag="div" v-else-if="messageData.countdown.endAt" keypath="chat.countdown.complete">
			<template #DURATION><strong>{{messageData.countdown.duration}}</strong></template>
		</i18n-t>
		
		<i18n-t scope="global" tag="div" v-else keypath="chat.countdown.start">
			<template #DURATION><strong>{{messageData.countdown.duration}}</strong></template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"]
})
export default class ChatCountdownResult extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageCountdownData;

	public aborted:boolean = false;
	public abortDuration:string = "";
	
	public beforeMount(): void {
		const cd = this.messageData.countdown;
		if(cd.endAt_ms) {
			const abortDuration = (cd.endAt_ms - cd.startAt_ms);
			this.abortDuration = Utils.formatDuration(abortDuration, true);
			this.aborted = cd.endAt_ms < cd.startAt_ms + cd.duration_ms;
		}
	}
	
	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}
}
</script>

<style scoped lang="less">
.chatcountdownresult{
	.chatMessageHighlight();
}
</style>