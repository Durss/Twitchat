<template>
	<div :class="classes">
		<Button class="backBt clearButton" v-if="selectedUser" :icon="$image('icons/back.svg')" @click="selectedUser = null" />
		<h1 class="title" v-if="!selectedUser"><img src="@/assets/icons/magnet.svg">{{ $t('tracked.title') }}</h1>
		<h1 class="title clickable" @click="openUserCard()" v-else><img src="@/assets/icons/whispers.svg">{{selectedUser.displayName}}</h1>

		<div class="noMessage" v-if="selectedUser && messages.length == 0">{{ $t('tracked.no_message') }}</div>

		<div class="content messages" v-else-if="selectedUser" ref="messageList">
			<ChatMessage v-for="(m, index) in messages" :key="index"
				:messageData="m"
				:lightMode="true"
				:disableConversation="true"
				class="message" />
			
			<Button class="refreshBt clearButton"
				@click="refreshMessages()"
				:icon="$image('icons/refresh.svg')"
				:loading="refreshing" />
		</div>

		<div class="content users" v-else>
			<div class="user"
			v-for="u in trackedUsers"
			:key="u.id">
				<Button class="login"
					@click="selectUser(u)"
					:title="u.displayName"
					white
					small
					bounce />
				<Button :icon="$image('icons/cross_white.svg')"
					class="deleteBt"
					@click="untrackUser(u)"
					small
					bounce highlight />
			</div>
		</div>

	</div>
</template>

<script lang="ts">
import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
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

	public refreshing:boolean = false;
	public selectedUser:TwitchatDataTypes.TwitchatUser | null = null;
	public messages:TwitchatDataTypes.ChatMessageTypes[] = [];
	public trackedUsers:TwitchatDataTypes.TwitchatUser[] = [];

	private updateListHandler!:(e:GlobalEvent)=>void;

	public get classes():string[] {
		let res = ["trackedusers"];
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
		user.is_tracked = false;
		this.onUpdateList();
	}

	public beforeMount(): void {
		this.updateListHandler = (e:GlobalEvent) => this.onUpdateList();
		EventBus.instance.addEventListener(GlobalEvent.TRACK_USER, this.updateListHandler);
		this.onUpdateList();
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
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.selectedUser);
	}

	private scrollToBottom():void {
		const div = this.$refs.messageList as HTMLDivElement;
		div.scrollTo(0, div.scrollHeight);
	}

}
</script>

<style scoped lang="less">
.trackedusers{

	.backBt {
		position: absolute;
		top: 10px;
		left: 10px;
		width: 1.5em;
		height: 1.5em;
	}

	.title {
		color: @mainColor_light;
		margin: auto;
		text-align: center;
		padding-bottom: 10px;
		word-break: break-word;
		img {
			height: 20px;
			margin-right: 10px;
			vertical-align: middle;
		}

		&.clickable {
			cursor: pointer;
		}
	}

	.content {
		max-height: 300px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		
		&.users {
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			gap:.5em;
			padding-left: 5px;
			flex-grow: 1;
			.user {
				display: flex;
				flex-direction: row;
				margin-bottom: 1px;
				.login {
					flex-grow: 1;
					padding: .15em .25em;
					transform-origin: right center;
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
					justify-content: flex-start;
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
	
		&.messages {
			color: #fff;
			padding-right: 5px;
			display: flex;
			flex-direction: column;
			justify-content: flex-start;
	
			.message {
				margin: .25em 0;
			}

			.refreshBt {
				display: flex;
				margin: auto;
			}
		}
	}

	.noMessage {
		display: block;
		margin:auto;
		color: @mainColor_light;
		font-style: italic;
		opacity: 0.5;
	}


}
</style>