<template>
	<div class="chatfollowbotevents" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<div class="head" @click.stop="expand = !expand">
			<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
			<img src="@/assets/icons/shield.svg" class="icon">
			<img src="@/assets/icons/follow.svg" class="icon">
			<span class="label">{{messageData?.users.length}} potential follow bot events !</span>
		</div>
		<div v-if="expand" class="userList">
			<div class="user" v-for="u, index in messageData?.users" :key="u.id" @click.stop="openUserCard(u)">
				<span class="login">{{u.displayName}}</span>
				<span v-if="index < messageData?.users.length-1">, </span>
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
		messageData:Object,
		lightMode:Boolean,
	},
	components:{
	},
	emits:["click", "onRead"]
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
	.chatMessageHighlight();
	color: @mainColor_light;
	background-color: @mainColor_alert;
	flex-direction: column;
	align-items: flex-start;
	pointer-events: all;
	&:hover {
		background-color: @mainColor_alert_light;
	}
	
	.head {
		cursor: pointer;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		width: 100%;
		.label {
			flex-grow: 1;
		}
	}

	.userList {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		cursor: pointer;
		background-color: fade(#000, 20%);
		border-radius: .5em;
		padding: .5em;
		font-size: .9em;
		max-height: 20vh;
		overflow-y: auto;
		margin-top: .5em;
		.user {
			padding: .25em .25em;
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