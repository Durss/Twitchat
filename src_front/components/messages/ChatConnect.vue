<template>
	<div :class="classes">
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
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"]
})
export default class ChatConnect extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageConnectData | TwitchatDataTypes.MessageDisconnectData;
	
	public message:string = "";
	public channelName:string = "";

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