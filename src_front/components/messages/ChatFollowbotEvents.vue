<template>
	<div class="chatfollowbotevents" @click.ctrl.stop="copyJSON()" @click="expand = !expand">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/follow.svg" class="icon">
		<span>{{messageData.users.length}} follow bot events !</span>
		<div v-if="expand" class="userList">
			<div class="user" v-for="u, index in messageData.users" :key="u.id" @click.stop="openUserCard(u)">
				<span class="login">{{u.displayName}}</span>
				<span v-if="index < messageData.users.length-1">, </span>
			</div>
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
		lightMode:Boolean,
		messageData:Object,
	},
	components:{
	},
})
export default class ChatFollowbotEvents extends Vue {
	public messageData!:TwitchatDataTypes.MessageFollowbotData;
	public lightMode!:boolean;

	public expand:boolean = false;

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user);
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

}
</script>

<style scoped lang="less">
.chatfollowbotevents{
	background-color: @mainColor_alert;
	border-radius: 5px;
	margin: 5px 0;
	padding: 5px;
	color:@mainColor_light;
	cursor: pointer;

	.time {
		font-variant-numeric: tabular-nums;
	}

	.icon {
		width: 1.25em;
		height: 1.25em;
		margin-right: 5px;
		vertical-align: middle;
	}

	.userList {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		cursor: pointer;
		.user {
			padding: .4em .25em;
			.login {
				background-color: fade(@mainColor_dark, 20%);
				padding: .1em .25em;
				transition: background-color .15s;
			}
			&:nth-child(odd) {
				.login {
					background-color: fade(@mainColor_alert_light, 100%);
				}
			}
			&:hover {
				.login {
					background-color: fade(@mainColor_dark, 50%);
				}
			}
		}
	}
}
</style>