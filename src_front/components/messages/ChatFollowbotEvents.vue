<template>
	<div class="chatfollowbotevents">
		<div class="head" @click.stop="expand = !expand">
			<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
			<img src="@/assets/icons/shield.svg" class="icon">
			<img src="@/assets/icons/follow.svg" class="icon">
			<span class="label">{{  $t("chat.followbot.title", {COUNT:messageData?.users.length}) }}</span>
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
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{
	},
	emits:["onRead"]
})
export default class ChatFollowbotEvents extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageFollowbotData;

	public expand:boolean = false;

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user);
	}

}
</script>

<style scoped lang="less">
.chatfollowbotevents{
	.chatMessageHighlight();
	color: var(--mainColor_light);
	background-color: var(--mainColor_alert);
	flex-direction: column;
	align-items: flex-start;
	pointer-events: all;
	&:hover {
		background-color: var(--mainColor_alert_light);
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
		.time {
			.chatMessageTime();
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
		width: 100%;
		.user {
			padding: .25em .25em;
			.login {
				background-color: fade(@mainColor_dark, 10%);
				padding: .1em .25em;
				transition: background-color .15s;
			}
			&:nth-child(odd) {
				.login {
					background-color: fade(@mainColor_alert_light, 40%);
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