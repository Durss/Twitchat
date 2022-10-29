<template>
	<div class="chatcountdownresult" @click.ctrl="copyJSON()">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/countdown.svg" alt="icon" class="icon">
		<div>
			<strong>{{duration}}</strong> countdown complete !
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
		countdownData:Object,
	},
	components:{}
})
export default class ChatCountdownResult extends Vue {

	public countdownData!:TwitchatDataTypes.MessageCountdownData;
	
	public get time():string {
		const d = new Date(this.countdownData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}
	
	public get duration():string {
		return Utils.formatDuration(this.countdownData.countdown.duration)+"s";
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.countdownData));
		console.log(this.countdownData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}
}
</script>

<style scoped lang="less">
.chatcountdownresult{
	.chatMessageHighlight();
}
</style>