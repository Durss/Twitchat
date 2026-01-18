<template>
	<div :class="classes">
		<div class="head">
			<ClearButton @click="close()" />
			<h1 class="title"><Icon name="magnet" class="icon" />{{ $t('tracked.title') }}</h1>
		</div>

		<div class="content">
			<div class="messageList" ref="messageList" v-if="messages.length > 0">
				<MessageItem v-for="(m, index) in messages"
					:key="m.id"
					:messageData="m"
					:lightMode="true"
					:disableConversation="true"
					class="message" />
				
			</div>
			<div class="messageList empty" v-else>no message</div>
			
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
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import {toNative,  Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import MessageItem from '../messages/MessageItem.vue';

@Component({
	components:{
		Button: TTButton,
		MessageItem,
		ClearButton,
		ToggleBlock,
	},
	emits:["close"]
})
class TrackedUsers extends AbstractSidePanel {

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
		const uid = user.id;
		let list:TwitchatDataTypes.ChatMessageTypes[] = [];
		const messageList = this.$store.chat.messages;
		const allowedTypes:TwitchatDataTypes.TwitchatMessageStringType[] = ["following", "message", "reward", "subscription", "shoutout", "whisper", "ban", "unban", "cheer"];
		// for (let i = messageList.length-1; i > Math.max(0, messageList.length-100); i--) {
		for (const mess of messageList) {
			if(!allowedTypes.includes(mess.type)) continue;
			if(mess.type == "shoutout" && mess.user.id == uid) {
				list.push(mess);
			}else if(mess.type == "following" && mess.user.id == uid) {
				list.push(mess);
			}else if((mess.type == "ban" || mess.type == "unban") && mess.user.id == uid) {
				list.push(mess);
			}else if((mess.type == "message" || mess.type == "whisper") && mess.user.id == uid) {
				list.push(mess);
			}else if(mess.type == "subscription" && mess.user.id == uid) {
				list.push(mess);
			}else if(mess.type == "cheer" && mess.user.id == uid) {
				list.push(mess);
			}else if(mess.type == "reward" && mess.user.id == uid) {
				list.push(mess);
			}
			if (list.length > 100) break;//Limit to 100 for perf reasons
		}
		this.messages = list;

		this.$nextTick().then(()=>{
			this.scrollToBottom();
		})
	}

	public untrackUser(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store.users.untrackUser(user);
		this.onUpdateList();
	}

	public beforeMount(): void {
		this.updateListHandler = (e:GlobalEvent) => this.onUpdateList();
		EventBus.instance.addEventListener(GlobalEvent.TRACK_USER, this.updateListHandler);
		this.onUpdateList();
		this.selectUser(this.trackedUsers[0]!);
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
		for (const u of this.$store.users.users) {
			if(u.is_tracked) res.push(u);
		}
		this.trackedUsers = res;
		if(res.length == 0) {
			super.close();
		}
	}

	private scrollToBottom():void {
		const div = this.$refs.messageList as HTMLDivElement;
		if(div) div.scrollTo(0, div.scrollHeight);
	}

}
export default toNative(TrackedUsers);
</script>

<style scoped lang="less">
.trackedusers{
	.content {
		padding-right: 5px;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
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
			flex-shrink: 0;
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

			.message {
				flex-shrink: 0;
			}
			.message:nth-child(odd) {
				background-color: var(--background-color-fadest);
			}

			&.empty {
				align-items: center;
				justify-content: center;
				font-style: italic;
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