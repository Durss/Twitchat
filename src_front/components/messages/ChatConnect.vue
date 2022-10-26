<template>
	<div :class="classes" v-if="message">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img :src="$image('icons/'+(messageData.type=='connect'? 'checkmark_white' : 'cross_alert')+'.svg')" alt="notice" class="icon">
		<span v-if="messageData.type == 'connect'">Welcome to the chat room <strong>{{channelName}}</strong></span>
		<span v-else>You have been disconnected from the chat</span>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		messageData:Object,
	},
	components:{},
	emits:["ariaMessage"]
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
				this.message = "Welcome to chat room "+this.channelName;
			}else{
				this.message = "You have been disconnected from the chat";
			}
			this.$emit("ariaMessage", this.message);
		}

	}
}
</script>

<style scoped lang="less">
.chatconnect{
	font-style: italic;
	opacity: .7;
	color: @mainColor_light;
	
	.icon {
		width: 1.25em;
		height: 1.25em;
		margin-right: 5px;
		vertical-align: middle;
	}
	
	&.disconnect {
		color: @mainColor_alert_light;
	}
	
}
</style>