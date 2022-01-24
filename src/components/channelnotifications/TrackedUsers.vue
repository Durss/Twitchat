<template>
	<div class="trackedusers">
		<div class="users">
			<div class="user"
			v-for="u in $store.state.trackedUsers"
			:key="u.user['user-id']"
			@click="selectUser(u)">
				<Button class="login" :title="'('+u.messages.length+') '+u.user['display-name']" bounce />
			</div>
		</div>

		<div v-if="!selectedUser" class="selectInfo">⬅ select a user</div>
		
		<div class="messages" v-if="selectedUser">
			<Button :icon="require('@/assets/icons/magnet.svg')"
				class="untrackBt"
				title="Untrack user"
				bounce highlight
				@click="untrackUser(selectedUser)" />

			<ChatMessage v-for="m in selectedUser.messages" :key="m.id"
				:messageData="m"
				:lightMode="true"
				:disableConversation="true"
				class="message" />
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
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

	public selectedUser:TwitchTypes.TrackedUser | null = null;

	public selectUser(user:TwitchTypes.TrackedUser):void {
		this.selectedUser = user;
	}

	public untrackUser(user:TwitchTypes.TrackedUser):void {
		Utils.confirm("Untrack user?", "The history of this user will be lost.")
		.then(()=> {
			store.dispatch('untrackUser', user.user);
			this.selectedUser = null;
		}).catch(()=> {});
	}

}
</script>

<style scoped lang="less">
.trackedusers{
	display: flex;
	flex-direction: row !important;
	color: #fff;
	.users {
		display: flex;
		flex-direction: column;
		border-right: 1px solid #fff;
		padding-right: 5px;
		position: sticky;
		top	: 0;
		.user {
			display: flex;
			flex-direction: row;
			align-items: center;
			margin-bottom: 1px;
			width: 130px;
			max-width: 130px;
			.login {
				color: #fff;
				width: 100%;
				min-width: 100%;
				padding: 2px 5px;
				:deep(.label) {
					width: 80px;
					font-size: 15px;
					text-align: left;
					text-overflow: ellipsis;
					overflow: hidden;
				}
			}
		}
	}

	.selectInfo {
		align-self: center;
		font-style: italic;
		opacity: 0.5;
		padding-left: 5px;
	}

	.messages {
		padding-left: 5px;
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;

		.untrackBt {
			position: sticky;
			top	: 0;
			padding: 0 10px;
			font-size: 16px;
			margin: 0 auto;
			margin-bottom: 10px;
			height: 25px;
			min-height: 25px;
			flex-grow: 0;
		}

		:deep(.time) {
			color: fade(#ffffff, 75%);
			font-size: 13px;
			margin-right: 5px;
			vertical-align: middle;
			width: 36px;
			display: inline-block;
		}

		.message {
			margin-bottom: 5px;
		}
	}
}
</style>