<template>
	<div :class="classes">
		<div class="head">
			<CloseButton @click="close()" />
			<h1 class="title"><img src="@/assets/icons/magnet.svg" class="icon">{{ $t('tracked.title') }}</h1>
		</div>


		<div class="content">
			<div class="messageList" ref="messageList">
				<MessageItem v-for="(m, index) in messages"
					:key="m.id"
					:messageData="m"
					:lightMode="true"
					:disableConversation="true"
					class="message" />
			</div>
			
			<Button class="refreshBt clearButton"
				@click="refreshMessages()"
				icon="refresh"
				:loading="refreshing" />
				
			<div class="userlist">
				<div v-for="user in trackedUsers" :key="user.id" class="user">
					<Button small class="login" @click="selectUser(user)" :selected="selectedUser?.id == user.id">{{ user.displayName }}</Button>
					<Button small class="delete" icon="trash" @click="untrackUser(user)" alert></Button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel.vue';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import MessageItem from '../messages/MessageItem.vue';

@Component({
	components:{
		Button,
		MessageItem,
		CloseButton,
		ToggleBlock,
	},
	emits:["close"]
})
export default class TrackedUsers extends AbstractSidePanel {

	public refreshing:boolean = false;
	public selectedUser:TwitchatDataTypes.TwitchatUser | null = null;
	public messages:TwitchatDataTypes.ChatMessageTypes[] = [];
	public trackedUsers:TwitchatDataTypes.TwitchatUser[] = [];

	private updateListHandler!:(e:GlobalEvent)=>void;

	public get classes():string[] {
		let res = ["trackedusers", "sidePanel"];
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

		this.$nextTick().then(()=>{
			this.scrollToBottom();
		})
	}

	public untrackUser(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").untrackUser(user);
		this.onUpdateList();
	}

	public beforeMount(): void {
		this.updateListHandler = (e:GlobalEvent) => this.onUpdateList();
		EventBus.instance.addEventListener(GlobalEvent.TRACK_USER, this.updateListHandler);
		this.onUpdateList();
		this.selectUser(this.trackedUsers[0]);
	}

	public mounted():void {
		super.open();
	}

	public beforeUnmount(): void {
		EventBus.instance.removeEventListener(GlobalEvent.TRACK_USER, this.updateListHandler);
	}

	public async refreshMessages(): Promise<void> {
		this.refreshing = true;
		await Utils.promisedTimeout(250);
		this.selectUser(this.selectedUser!);
		this.refreshing = false;
	}

	private onUpdateList():void {
		const res = [];
		for (let i = 0; i < this.$store("users").users.length; i++) {
			const u = this.$store("users").users[i];
			if(u.is_tracked) res.push(u);
		}
		this.trackedUsers = res;
		if(res.length == 0) {
			super.close();
		}
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.selectedUser);
	}

	private scrollToBottom():void {
		const div = this.$refs.messageList as HTMLDivElement;
		if(div) div.scrollTo(0, div.scrollHeight);
	}

}
</script>

<style scoped lang="less">
.trackedusers{
	.content {
		padding-right: 5px;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		max-width: 800px;
		width: 100%;
		margin:auto;

		.userlistToggle {
			width: 100%;
		}
		
		.userlist {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			gap: 10px;
			.user {
				display: flex;
				flex-direction: row;
				.login {
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
				}
				.delete {
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
					padding: 0 .5em;
				}
			}
		}

		.messageList {
			overflow-y: auto;
			display: flex;
			flex-direction: column;
			flex-grow: 1;
			.message:nth-child(odd) {
				background-color: var(--color-dark-fadest);
			}
		}
		.refreshBt {
			align-self: center;
			flex-shrink: 0;
			padding-left: .38em;
		}
	}

}
</style>