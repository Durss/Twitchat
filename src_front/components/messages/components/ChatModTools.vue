<template>
	<div class="chatmodtools" @mouseleave="closeToOptions()">
		<img src="@/assets/icons/ban.svg" alt="ban" :data-tooltip="$t('chat.mod_tools.banBt')" @click.stop="banUser()">
		<img src="@/assets/icons/timeout.svg" alt="timeout"
		@click.stop="openToOptions()"
		data-tooltip="Timeout">
		<div class="toOptions" v-if="showToOptions" ref="toOptions" @mouseenter="resetCloseTimeout()">
			<Button :aria-label="$t('chat.mod_tools.to10_aria')" @click.stop="timeoutUser(10)" :title="$t('chat.mod_tools.to10')" small />
			<Button :aria-label="$t('chat.mod_tools.to120_aria')" @click.stop="timeoutUser(120)" :title="$t('chat.mod_tools.to120')" small />
			<Button :aria-label="$t('chat.mod_tools.to30_aria')" @click.stop="timeoutUser(1800)" :title="$t('chat.mod_tools.to30')" small />
			<Button :aria-label="$t('chat.mod_tools.to3600_aria')" @click.stop="timeoutUser(3600)" :title="$t('chat.mod_tools.to3600')" small />
			<Button :aria-label="$t('chat.mod_tools.to43200_aria')" @click.stop="timeoutUser(3600*12)" :title="$t('chat.mod_tools.to43200')" small />
			<Button :aria-label="$t('chat.mod_tools.to1w_aria')" @click.stop="timeoutUser(3600*24*7)" :title="$t('chat.mod_tools.to1w')" small />
		</div>
		<img src="@/assets/icons/trash.svg" alt="trash" :data-tooltip="$t('global.delete')" @click.stop="deleteMessage()" v-if="canDelete">
		<img src="@/assets/icons/block.svg" alt="trash" :data-tooltip="$t('chat.mod_tools.blockBt')" @click.stop="blockUser()" v-if="canBlock !== false">
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';

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
/**
 * TODO replace <Button> to simplement native <button> elements
 */
export default class ChatModTools extends Vue {
	
	public canDelete!:boolean;
	public canBlock!:boolean;

	public messageData!:TwitchatDataTypes.MessageChatData;
	public showToOptions = false;

	private closeTimeout = 0;

	public banUser():void {
		this.$confirm(this.$t("chat.mod_tools.ban_confirm_title", {USER:this.messageData.user.displayName}), this.$t("chat.mod_tools.ban_confirm_desc"))
		.then(() => {
			this.$emit('deleteUser', this.messageData);
			if(this.messageData.fake === true) {
				//Avoid banning user for real if doing it from a fake message
				this.$store("users").flagBanned(this.messageData.platform, this.messageData.channel_id, this.messageData.user.id);
			}else{
				TwitchUtils.banUser(this.messageData.user, this.messageData.channel_id, undefined, this.$t("global.moderation_action.ban_reason"));
			}
		})
	}

	public blockUser():void {
		this.$confirm(this.$t("chat.mod_tools.block_confirm_title", {USER:this.messageData.user.displayName}), this.$t("chat.mod_tools.block_confirm_desc"))
		.then(() => {
			this.$emit('deleteUser', this.messageData);
			if(this.messageData.fake === true) {
				//Avoid banning user for real if doing it from a fake message
				this.$store("users").flagBlocked(this.messageData.platform, this.messageData.channel_id, this.messageData.user.id);
			}else{
				TwitchUtils.blockUser(this.messageData.user, this.messageData.channel_id);
			}
		})
	}

	public timeoutUser(duration:number):void {
		this.$emit('deleteUser', this.messageData);
		if(this.messageData.fake === true) {
			//Avoid banning user for real if doing it from a fake message
			this.$store("users").flagBanned(this.messageData.platform, this.messageData.channel_id, this.messageData.user.id, duration);
		}else{
			TwitchUtils.banUser(this.messageData.user, this.messageData.channel_id, duration);
		}
	}

	public deleteMessage():void {
		this.$emit('deleteMessage', this.messageData);
		StoreProxy.chat.deleteMessage(this.messageData, undefined, this.messageData.fake !== true);
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
			margin-right: .25em;
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
		}
	}
}
</style>