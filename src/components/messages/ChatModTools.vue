<template>
	<div class="chatmodtools" @mouseleave="closeToOptions()">
		<img src="@/assets/icons/ban.svg" alt="ban" data-tooltip="Ban" @click.stop="banUser()">
		<img src="@/assets/icons/timeout.svg" alt="timeout"
		@click.stop="openToOptions()"
		data-tooltip="Timeout">
		<div class="toOptions" v-if="showToOptions" ref="toOptions" @mouseenter="resetCloseTimeout()">
			<Button  aria-label="Timeout for 10 seconds" @click.stop="timeoutUser(10)" title="10s" small />
			<Button  aria-label="Timeout for 2 minutes" @click.stop="timeoutUser(120)" title="2m" small />
			<Button  aria-label="Timeout for 30 minutes" @click.stop="timeoutUser(1800)" title="30m" small />
			<Button  aria-label="Timeout for 1 hour" @click.stop="timeoutUser(3600)" title="1h" small />
			<Button  aria-label="Timeout for 12 hours" @click.stop="timeoutUser(3600*12)" title="12h" small />
			<Button  aria-label="Timeout for 1 week" @click.stop="timeoutUser(3600*24*7)" title="1w" small />
		</div>
		<img src="@/assets/icons/trash.svg" alt="trash" data-tooltip="Delete" @click.stop="deleteMessage()" v-if="canDelete">
		<img src="@/assets/icons/block.svg" alt="trash" data-tooltip="Block" @click.stop="blockUser()" v-if="canBlock !== false">
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{
		messageData:Object,
		canDelete:Boolean,
		canBlock:{
			type:Boolean,
			default:false,
		},
	},
	components:{
		Button,
	},
	emits:["deleteMessage", "deleteUser"]
})
export default class ChatModTools extends Vue {
	
	public canDelete!:boolean;
	public canBlock!:boolean;

	public messageData!:TwitchatDataTypes.MessageChatData;
	public showToOptions = false;

	private closeTimeout = 0;

	public banUser():void {
		this.$confirm("Ban "+(this.messageData.user.displayName), "Are you sure you want to ban this user ?")
		.then(() => {
		this.$emit('deleteUser', this.messageData);
			TwitchUtils.banUser(this.messageData.user.id, undefined, "manually banned from Twitchat");
		})
	}

	public blockUser():void {
		this.$confirm("Block "+(this.messageData.user.displayName), "Are you sure you want to block this user ?<br>They will be removed from your followers.")
		.then(() => {
		this.$emit('deleteUser', this.messageData);
			TwitchUtils.blockUser(this.messageData.user.id);
		})
	}

	public timeoutUser(duration:number):void {
		this.$emit('deleteUser', this.messageData);
		TwitchUtils.banUser(this.messageData.user.id, duration);
	}

	public deleteMessage():void {
		this.$emit('deleteMessage', this.messageData);
		StoreProxy.chat.deleteMessage(this.messageData.id);
	}

	public async openToOptions():Promise<void> {
		this.showToOptions = true;
		await this.$nextTick();
		const holder = this.$refs.toOptions as HTMLDivElement;
		gsap.from(holder, {width:0, duration:.2, ease:"sin.inOut"});
	}

	public closeToOptions():void {
		this.closeTimeout = setTimeout(() => {
			const holder = this.$refs.toOptions as HTMLDivElement;
			if(!holder) return;
			gsap.to(holder, {width:0, duration:.2, ease:"sin.inOut",
			onComplete:()=> {
				this.showToOptions = false;
			}});
		}, 500);
	}

	public resetCloseTimeout():void {
		clearTimeout(this.closeTimeout);
	}
}
</script>

<style scoped lang="less">
.chatmodtools{
	display: flex;
	flex-direction: row;

	img {
		opacity: 0.75;
		height: 1em;
		vertical-align: middle;
		cursor: pointer;
		&:hover {
			opacity: .75;
		}
		&:not(:last-child) {
			margin-right: 5px;
		}
	}

	.toOptions {
		overflow: hidden;
		display: inline-flex;
		flex-direction: row;
		bottom: 0;
		.button {
			.clearButton();
			padding: 0 .2em;
			margin-right: 1px;
			:deep(.label) {
				margin-left: 0;
			}
		}
	}
}
</style>