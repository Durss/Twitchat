<template>
	<div :class="classes">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		<Icon class="icon" :name="(messageData.type=='connect'? 'checkmark' : 'cross')"/>
		
		<div class="holder">
			<i18n-t scope="global" class="label" tag="span" v-if="messageData.type == 'connect'" keypath="chat.connect.on">
				<template #PLATFORM><strong>{{messageData.platform}}</strong></template>
				<template #ROOM><strong>{{channelName}}</strong></template>
			</i18n-t>
	
			<template v-else>
				<i18n-t scope="global" class="label" tag="span" keypath="chat.connect.off">
					<template #PLATFORM><strong>{{messageData.platform}}</strong></template>
					<template #ROOM><strong>{{channelName}}</strong></template>
				</i18n-t>
		
				<TTButton v-if="showReconnectBt" icon="online" primary small @click.stop="reconnectChan()">{{ $t("global.reconnect") }}</TTButton>
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import TTButton from '../TTButton.vue';
import TwitchMessengerClient from '@/messaging/TwitchMessengerClient';

@Component({
	components:{
		TTButton,
	},
	emits:["onRead"]
})
class ChatConnect extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageConnectData | TwitchatDataTypes.MessageDisconnectData;
	
	public message:string = "";
	public channelName:string = "";
	public showReconnectBt:boolean = false;

	public get classes():string[]{
		const res = ["chatconnect", "chatMessage"];
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.DISCONNECT) {
			res.push("highlight", "error");
		}
		return res;
	}

	public mounted(): void {
		const chan = this.$store.users.getUserFrom(this.messageData.platform, this.messageData.channel_id, this.messageData.channel_id);
		if(chan) {
			this.channelName = " #"+chan.login;
			if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.CONNECT) {
				this.message = this.$t("chat.connect.on", {PLATFORM:this.messageData.platform, ROOM:this.channelName})
			}else{
				this.message = this.$t("chat.connect.off", {PLATFORM:this.messageData.platform})
			}
			this.$store.accessibility.setAriaPolite(this.message);
			if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.DISCONNECT) {
				const chanId = this.messageData.channel_id;
				window.setTimeout(()=> {
					this.showReconnectBt = !TwitchMessengerClient.instance.getIsConnectedToChannelID(chanId);
				}, 2000);
			}
		}
	}

	public async reconnectChan():Promise<void> {
		this.showReconnectBt = false;
		const chanId = this.messageData.channel_id;
		const user = this.$store.users.getUserFrom(this.messageData.platform, chanId, chanId);
		if(chanId == this.$store.auth.twitch.user.id || chanId == this.$store.auth.youtube.user?.id) {
			TwitchMessengerClient.instance.connectToChannel(user.login);
		}else{
			this.$store.stream.connectToExtraChan(user);
		}
		window.setTimeout(()=> {
			this.showReconnectBt = !TwitchMessengerClient.instance.getIsConnectedToChannelID(this.messageData.channel_id);
		}, 5000);
	}
}
export default toNative(ChatConnect);
</script>

<style scoped lang="less">
.chatconnect{
	font-style: italic;
	.holder {
		gap: 1em;
		display: inline-flex;
		flex-direction: row;
		flex-wrap: wrap;
		row-gap: .25em;
		align-items: center;
		flex-grow: 1;
	
		.label {
			flex-basis: 100px;
			flex-grow: 1;
		}
	}
}
</style>