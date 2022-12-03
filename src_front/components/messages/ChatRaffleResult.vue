<template>
	<div class="chatraffleresult" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="sParams.appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/ticket.svg" alt="icon" class="icon">
		<div>
			<strong>{{messageData.raffleData.winners![0].label}}</strong> won the raffle
		</div>
	</div>
</template>

<script lang="ts">
import { storeParams } from '@/store/params/storeParams';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		messageData:Object,
	},
	components:{},
	emits:["onRead"]
})
export default class ChatRaffleResult extends Vue {

	public messageData!:TwitchatDataTypes.MessageRaffleData;
	public sParams = storeParams();
	
	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}
}
</script>

<style scoped lang="less">
.chatraffleresult{
	.chatMessageHighlight();
}
</style>