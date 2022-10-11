<template>
	<div :class="classes" @click.ctrl.stop="copyJSON()">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<!-- {{messageData.channel}} -->
		<img :src="$image('icons/'+icon+'.svg')" alt="notice" class="icon">

		<span v-if="userList.length > 0" v-for="u, index in userList" :key="u.id">
			<a @click.prevent="openUserCard(u)">{{u.displayName}}</a>
			<span v-if="index < userList.length - 2 + remainingOffset">, </span>
			<span v-else-if="index < userList.length - 1 + remainingOffset"> and </span>
		</span>

		<span v-if="remainingCount > 0"><strong>{{remainingCount}}</strong> more</span>

		<span v-if="messageData.type=='join'"> joined the chat room{{channelName}}</span>
		<span v-else> left the chat room{{channelName}}</span>
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
	emits:["ariaMessage"]
})
export default class ChatJoinLeave extends Vue {
	
	public messageData!:TwitchatDataTypes.MessageJoinData|TwitchatDataTypes.MessageLeaveData;
	
	public userList:TwitchatDataTypes.TwitchatUser[] = [];
	public remainingOffset:number = 0;
	public remainingCount:number = 0;
	public icon:string = "enter";
	public channelName:string = "";
	

	public get classes():string[] {
		let res = ["chatjoinleave"];
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.LEAVE) res.push("alert");
		return res;
	}

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public mounted(): void {
		const usersClone = this.messageData.users.concat();
		const join = usersClone.splice(0, 30);
		this.userList = join;
		this.remainingCount = usersClone.length;
		if(this.remainingCount > 0) this.remainingOffset = 1;
		
		let message = this.messageData.users.length+" users";
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.JOIN) {
			message += " joined the chat room";
			this.icon = "enter";
		}else{
			message += " left the chat room";
			this.icon = "leave";
		}

		const chan = this.$store("users").getUserFrom(this.messageData.platform, this.messageData.channel_id, this.messageData.channel_id);
		if(chan) {
			this.channelName = " #"+chan.login;
			message += this.channelName;
		}

		this.$emit("ariaMessage", message);
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user);
	}

	public copyJSON():void {
		const usersBackup = this.messageData.users;
		// @ts-ignore
		this.messageData.users = usersBackup.map(v=>{return {login:v.login, id:v.id}});
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		this.messageData.users = usersBackup;
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

}
</script>

<style scoped lang="less">
.chatjoinleave{
	font-style: italic;
	opacity: .7;
	color: @mainColor_warn;

	a {
		color: @mainColor_warn;
		&:hover {
			background: rgba(0, 0, 0, .5);
		}
		color: lighten(@mainColor_warn, 15%);
	}
	
	.icon {
		width: 1.25em;
		height: 1.25em;
		margin-right: 5px;
		vertical-align: middle;
	}

	&.alert {
		color: @mainColor_alert;
		
		a {
			color: lighten(@mainColor_alert, 10%);
		}
	}
}
</style>