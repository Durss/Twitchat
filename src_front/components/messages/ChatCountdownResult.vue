<template>
	<div class="chatcountdownresult" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/countdown.svg" alt="icon" class="icon">
		<div v-if="aborted">
			<strong>{{messageData.countdown.duration}}</strong> countdown aborted after <strong>{{abortDuration}}</strong> !
		</div>
		<div v-else-if="messageData.countdown.endAt">
			<strong>{{messageData.countdown.duration}}</strong> countdown complete !
		</div>
		<div v-else>
			countdown started for <strong>{{messageData.countdown.duration}}</strong> !
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		messageData:Object,
	},
	components:{},
	emits:["click"]
})
export default class ChatCountdownResult extends Vue {

	public messageData!:TwitchatDataTypes.MessageCountdownData;

	public aborted:boolean = false;
	public abortDuration:string = "";
	
	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

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