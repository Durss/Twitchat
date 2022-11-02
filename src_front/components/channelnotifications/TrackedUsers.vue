<template>
	<div :class="classes">
		<h1 class="title"><img src="@/assets/icons/magnet.svg">Tracked users</h1>

		<div class="content">

			<div v-if="selectedUser && messages.length == 0" class="noMessage">no message</div>

			<div class="messages" v-else-if="selectedUser">
				<ChatMessage v-for="(m, index) in messages" :key="index"
					:messageData="m"
					:lightMode="true"
					:disableConversation="true"
					class="message" />
			</div>

			<div v-if="!selectedUser" class="selectInfo">select a user ➡</div>
			
			<div class="users">
				<div class="user"
				v-for="u in trackedUsers"
				:key="u.id">
					<Button class="login"
						@click="selectUser(u)"
						:title="u.displayName"
						:selected="selectedUser?.id == u.id"
						bounce />
					<Button :icon="$image('icons/cross_white.svg')"
						class="deleteBt"
						bounce highlight
					@click="untrackUser(u)" />
				</div>
			</div>

		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatMessage from '../messages/ChatMessage.vue';

@Options({
	props:{},
	components:{
		Button,
		ChatMessage
	}
})
export default class TrackedUsers extends Vue {

	public selectedUser:TwitchatDataTypes.TwitchatUser | null = null;
	public messages:TwitchatDataTypes.ChatMessageTypes[] = [];

	public get classes():string[] {
		let res = ["trackedusers"];
		return res;
	}

	public get trackedUsers():TwitchatDataTypes.TwitchatUser[] {
		const res = [];
		for (let i = 0; i < this.$store("users").users.length; i++) {
			const u = this.$store("users").users[i];
			if(u.is_tracked) res.push(u);
		}
		return res;
	}

	public selectUser(user:TwitchatDataTypes.TwitchatUser):void {
		this.selectedUser = user;
		let list:TwitchatDataTypes.ChatMessageTypes[] = [];
		const messages = this.$store("chat").messages;
		for (let i = 0; i < messages.length; i++) {
			const m = messages[i];
			if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
			&& m.user.id == user.id) list.push(m);
		}
		this.messages = list;
	}

	public untrackUser(user:TwitchatDataTypes.TwitchatUser):void {
		user.is_tracked = false;
	}

}
</script>

<style scoped lang="less">
.trackedusers{

	.title {
		color: @mainColor_light;
		width: 100%;
		text-align: center;
		padding-bottom: 10px;
		word-break: break-word;
		img {
			height: 20px;
			margin-right: 10px;
		}
	}

	.content {

		display: flex;
		flex-direction: row !important;
		color: #fff;
		.users {
			display: flex;
			flex-direction: column;
			border-left: 1px solid #fff;
			padding-left: 5px;
			position: sticky;
			top	: 0;
			.user {
				display: flex;
				flex-direction: row;
				margin-bottom: 1px;
				width: 130px;
				max-width: 130px;
				.login {
					color: #fff;
					flex-grow: 1;
					padding: 2px 5px;
					transform-origin: left center;
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
					:deep(.label) {
						width: 80px;
						font-size: 15px;
						text-align: left;
						text-overflow: ellipsis;
						overflow: hidden;
					}
				}
	
				.deleteBt {
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
					padding: .1em;
					:deep(.icon) {
						height: .7em;
						min-height: .7em;
					}
				}
			}
		}
	
		.selectInfo {
			align-self: center;
			font-style: italic;
			opacity: 0.5;
			padding-right: 5px;
			flex-grow: 1;
			text-align: right;
		}
	
		.messages {
			flex-grow: 1;
			padding-right: 5px;
			flex-grow: 1;
			display: flex;
			flex-direction: column;
			justify-content: flex-start;
	
			.message {
				margin: .25em 0;
			}
		}
		.noMessage {
			flex-grow: 1;
			align-self: center;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
	
			font-style: italic;
			opacity: 0.5;
		}
	}


}
</style>