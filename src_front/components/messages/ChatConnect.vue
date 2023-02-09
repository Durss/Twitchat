<template>
	<div :class="classes" v-if="message" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img :src="$image('icons/'+(messageData.type=='connect'? 'checkmark_white' : 'cross_alert')+'.svg')" alt="notice" class="icon">
		
		<i18n-t scope="global" tag="span" v-if="messageData.type == 'connect'" keypath="chat.connect.on">
			<template #PLATFORM><strong>{{messageData.platform}}</strong></template>
			<template #ROOM><strong>{{channelName}}</strong></template>
		</i18n-t>

		<i18n-t scope="global" tag="span" v-else keypath="chat.connect.off">
			<template #PLATFORM><strong>{{messageData.platform}}</strong></template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
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
export default class ChatConnect extends Vue {
	
	public messageData!:TwitchatDataTypes.MessageConnectData | TwitchatDataTypes.MessageDisconnectData;
	
	public message:string = "";
	public channelName:string = "";

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public get classes():string[]{
		const res = ["chatconnect"];
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.DISCONNECT) {
			res.push("disconnect");
		}
		return res;
	}

	public mounted(): void {
		const chan = this.$store("users").getUserFrom(this.messageData.platform, this.messageData.channel_id, this.messageData.channel_id);
		if(chan) {
			this.channelName = " #"+chan.login;
			if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.CONNECT) {
				this.message = this.$t("chat.connect.on", {PLATFORM:this.messageData.platform, ROOM:this.channelName})
			}else{
				this.message = this.$t("chat.connect.off", {PLATFORM:this.messageData.platform})
			}
			this.$store("accessibility").setAriaPolite(this.message);
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
.chatconnect{
	.chatMessage();
	
	font-style: italic;
	opacity: .7;

	&.disconnect {
		color: @mainColor_alert_light;
	}
	
}
</style>