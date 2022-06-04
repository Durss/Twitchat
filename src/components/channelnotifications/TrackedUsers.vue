<template>
	<div :class="classes">
		<div class="messages" v-if="selectedUser">
			<ChatMessage v-for="(m, index) in selectedUser.messages" :key="index"
				:messageData="m"
				:lightMode="true"
				:disableConversation="true"
				class="message" />
		</div>

		<div v-if="!selectedUser" class="selectInfo">select a user ➡</div>
		
		<div class="users">
			<div class="user"
			v-for="u in $store.state.trackedUsers"
			:key="u.user['user-id']">
				<Button class="login"
					@click="selectUser(u)"
					:title="'('+u.messages.length+') '+u.user['display-name']"
					bounce />
				<Button :icon="require('@/assets/icons/cross_white.svg')"
					class="deleteBt"
					bounce highlight small
				@click="untrackUser(u)" />
			</div>
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

	public get classes():string[] {
		let res = ["trackedusers"];
		return res;
	}

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
		border-left: 1px solid #fff;
		padding-left: 5px;
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
				flex-grow: 1;
				padding: 2px 5px;
				:deep(.label) {
					width: 80px;
					font-size: 15px;
					text-align: left;
					text-overflow: ellipsis;
					overflow: hidden;
				}
			}

			.deleteBt {
				margin: auto;
				padding: 2px;
				height: 21px;
				width: 21px;
				min-height: 21px;
				min-width: 21px;
				flex-grow: 0;
				:deep(.icon) {
					height: 14px;
					min-height: 14px;
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
		padding-right: 5px;
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;

		:deep(.time) {
			color: fade(#ffffff, 75%);
			font-size: .8em;
			vertical-align: middle;
			display: inline-block;
			margin-right: .7em;
			font-variant-numeric: tabular-nums;
		}

		.message {
			margin: .25em 0;
			font-size: var(--messageSize);
		}
	}
}
</style>