<template>
	<div :class="classes">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<Icon :name="icon" alt="notice" class="icon" :theme="theme"/>

		<span v-if="userList.length > 0" v-for="u, index in userList" :key="u.id">
			<a class="userlink"
			:href="'https://twitch.tv/'+u.login"
			target="_blank"
			@click.prevent="openUserCard(u)">{{u.displayName}}</a>
			<span v-if="index < userList.length - 2 + remainingOffset">,&nbsp;</span>
			<span v-else-if="index < userList.length - 1 + remainingOffset">&nbsp;{{$t("global.and")}}&nbsp;</span>
		</span>

		<i18n-t scope="global" v-if="remainingCount > 0" tag="span" keypath="chat.join_leave.more" :plural="remainingCount">
			<template #COUNT><span class="count">{{remainingCount}}</span></template>
		</i18n-t>

		<span>&nbsp;</span>

		<i18n-t scope="global" v-if="messageData.type=='join'" tag="span" keypath="chat.join_leave.join" :plural="userList.length">
			<template #CHANNEL><span class="channel">{{channelName}}</span></template>
		</i18n-t>

		<i18n-t scope="global" v-else tag="span" keypath="chat.join_leave.leave" :plural="userList.length">
			<template #CHANNEL><span class="channel">{{channelName}}</span></template>
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
export default class ChatJoinLeave extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageJoinData|TwitchatDataTypes.MessageLeaveData;
	
	public userList:TwitchatDataTypes.TwitchatUser[] = [];
	public remainingOffset:number = 0;
	public remainingCount:number = 0;
	public icon:string = "enter";
	public theme:string = "primary";
	public channelName:string = "";
	

	public get classes():string[] {
		let res = ["chatjoinleave", "chatMessage", "highlight"];
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.LEAVE) res.push("error");
		else res.push("success");
		return res;
	}

	public mounted(): void {
		const usersClone = this.messageData.users.concat();
		this.userList = usersClone.splice(0, 30).filter(v=> !v.errored);
		this.remainingCount = usersClone.length;
		if(this.remainingCount > 0) this.remainingOffset = 1;
		
		let message = "";
		this.channelName = "---";
		const chan = this.$store("users").getUserFrom(this.messageData.platform, this.messageData.channel_id, this.messageData.channel_id);
		if(chan) {
			this.channelName = "#"+chan.login;
		}

		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.JOIN) {
			message = this.$t("chat.join_leave.join_aria", {COUNT:this.messageData.users.length, CHANNEL:this.channelName})
			this.icon = "enter";
			this.theme = "primary";
		}else{
			message = this.$t("chat.join_leave.leave_aria", {COUNT:this.messageData.users.length, CHANNEL:this.channelName})
			this.icon = "leave";
			this.theme = "secondary";
		}
		this.$store("accessibility").setAriaPolite(message);
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.messageData.channel_id);
	}

	public copyJSON():void {
		const usersBackup = this.messageData.users;
		// @ts-ignore
		this.messageData.users = usersBackup.map(v=>{return {login:v.login, id:v.id}});
		super.copyJSON();
		this.messageData.users = usersBackup;
	}

}
</script>

<style scoped lang="less">
.chatjoinleave{
	flex-wrap: wrap;
	font-style: italic;
	line-height: 1.3em;

	.channel, .count {
		opacity: .7;
	}

	.userlink {
		font-weight: normal;
		&:hover {
			text-decoration: underline;
			// background-color: var(--color-dark);
		}
	}

}
</style>