<template>
	<div class="chatfollowbotevents chatMessage highlight">
		<div class="head" @click.stop="expand = !expand">
			<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
			<Icon name="shield" class="icon" theme="light" />
			<Icon name="follow" class="icon" theme="light" />
			<span class="label">{{  $t("chat.followbot.title", {COUNT:messageData?.users.length}) }}</span>
		</div>
		<div v-if="expand" class="userList">
			<div class="user" v-for="u, index in messageData?.users" :key="u.id" @click.stop="openUserCard(u, messageData.channel_id)">
				<span class="login">{{u.displayName}}</span>
				<span v-if="index < messageData?.users.length-1">, </span>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{
	},
	emits:["onRead"]
})
class ChatFollowbotEvents extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageFollowbotData;

	public expand:boolean = false;

}
export default toNative(ChatFollowbotEvents);
</script>

<style scoped lang="less">
.chatfollowbotevents{
	color: var(--color-light);
	background-color: var(--color-alert);
	flex-direction: column;
	align-items: flex-start;
	pointer-events: all;
	&:hover {
		background-color: var(--color-alert-light);
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
		width: 100%;
		.user {
			padding: .25em .25em;
			.login {
				background-color: var(--color-dark-fadest);
				padding: .1em .25em;
				transition: background-color .1s;
			}
			&:nth-child(odd) {
				.login {
					background-color: var(--color-light-fadest)
				}
			}
			&:hover {
				.login {
					background-color: var(--color-dark-fade);
				}
			}
		}
	}
}
</style>
