<template>
	<div class="chatclear" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<span>Chat room <strong>#{{room}}</strong> cleared</span>
		<span class="user" v-if="messageData.user">by <a @click.stop="openUserCard()">{{messageData.user.displayName}}</a></span>
		<span class="user" v-if="messageData.fromAutomod">by <strong>automod</strong></span>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		messageData:Object,
	},
	components:{},
	emits:["onRead"]
})
export default class ChatClear extends Vue {

	public messageData!:TwitchatDataTypes.MessageClearChatData;
	public room:string = "";

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public mounted():void {
		this.room = this.$store("users").getUserFrom(this.messageData.platform, this.messageData.channel_id, this.messageData.channel_id).login;
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.messageData.user!);
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

}
</script>

<style scoped lang="less">
.chatclear{
	.chatMessageHighlight();

	.user {
		margin-left: .25em;
		a {
			font-weight: bold;
			color: @mainColor_warn;
			margin-right: .25em;
		}
	}
}
</style>