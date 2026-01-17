<template>
	<div class="chatmodtools" @mouseleave="closeToOptions()">
		<template v-if="channelInfo?.is_banned === true">
			<Icon v-if="loading_ban" name="loader" />
			<Icon v-else name="unban" alt="unban" v-tooltip="$t('chat.mod_tools.unbanBt', {USER: messageData.user.displayNameOriginal})" @click.stop="unbanUser()" theme="alert"/>
		</template>
		<template v-else>
			<Icon v-if="loading_ban" name="loader" />
			<Icon v-else name="ban" alt="ban" v-tooltip="$t('chat.mod_tools.banBt', {USER: messageData.user.displayNameOriginal})" @click.stop="banUser()" theme="alert"/>
			
			<Icon v-if="loading_ban" name="loader" />
			<Icon v-else name="timeout" alt="timeout"
			@click.stop="openToOptions()"
			v-tooltip="'Timeout'" />
			<div class="toOptions" v-if="showToOptions" ref="toOptions" @mouseenter="resetCloseTimeout()">
				<Button alert :aria-label="$t('chat.mod_tools.to10_aria')"			@click.stop="timeoutUser(10)" small>{{$t('chat.mod_tools.to10')}}</Button>
				<Button alert :aria-label="$t('chat.mod_tools.to120_aria')"			@click.stop="timeoutUser(120)" small>{{$t('chat.mod_tools.to120')}}</Button>
				<Button alert :aria-label="$t('chat.mod_tools.to30_aria')"			@click.stop="timeoutUser(1800)" small>{{$t('chat.mod_tools.to30')}}</Button>
				<Button alert :aria-label="$t('chat.mod_tools.to3600_aria')"		@click.stop="timeoutUser(3600)" small>{{$t('chat.mod_tools.to3600')}}</Button>
				<Button alert :aria-label="$t('chat.mod_tools.to43200_aria')"		@click.stop="timeoutUser(3600*12)" small>{{$t('chat.mod_tools.to43200')}}</Button>
				<Button alert :aria-label="$t('chat.mod_tools.to1w_aria')"			@click.stop="timeoutUser(3600*24*7)" small>{{$t('chat.mod_tools.to1w')}}</Button>
			</div>
		</template>

		<Icon v-if="loading_delete" name="loader" />
		<Icon v-else name="trash" alt="trash" v-tooltip="$t('global.delete')" @click.stop="deleteMessage()" v-if="canDelete && messageData.deleted !== true"/>

		<Icon v-if="loading_block" name="loader" />
		<Icon v-else-if="$store.users.blockedUsers.twitch[messageData.user.id]" name="unblock" alt="block" v-tooltip="$t('chat.mod_tools.unblockBt', {USER: messageData.user.displayNameOriginal})" @click.stop="unblockUser()" v-if="canBlock !== false"/>
		<Icon v-else name="block" alt="block" v-tooltip="$t('chat.mod_tools.blockBt', {USER: messageData.user.displayNameOriginal})" @click.stop="blockUser()" v-if="canBlock !== false"/>
		
		<template v-if="canMonitor === true">
			<Icon v-if="loading_sus" name="loader" />
			<Icon v-else-if="channelInfo?.is_suspicious" class="offsetDown" name="hide" alt="unsuspicious" v-tooltip="$t('chat.mod_tools.unmonitorBt', {USER: messageData.user.displayNameOriginal})" @click.stop="unflagUser()"/>
			<Icon v-else name="show" alt="suspicious" class="offsetDown" v-tooltip="$t('chat.mod_tools.monitorBt', {USER: messageData.user.displayNameOriginal})" @click.stop="flagUser('monitor')" />
			
			<Icon v-if="loading_sus" name="loader" />
			<Icon v-else-if="channelInfo?.is_restricted" class="offsetUp" name="unlock" alt="unsuspicious" v-tooltip="$t('chat.mod_tools.unrestrictBt', {USER: messageData.user.displayNameOriginal})" @click.stop="unflagUser()"/>
			<Icon v-else name="lock" alt="suspicious" class="offsetUp" v-tooltip="$t('chat.mod_tools.restrictBt', {USER: messageData.user.displayNameOriginal})" @click.stop="flagUser('restrict')" />
		</template>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { gsap } from 'gsap/gsap-core';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import TTButton from '../../TTButton.vue';
import YoutubeHelper from '@/utils/youtube/YoutubeHelper';

@Component({
	components:{
		Button: TTButton,
	},
	emits:["actionComplete"]
})
/**
 * TODO replace <Button> to simplement native <button> elements
 */
class ChatModTools extends Vue {

	@Prop
	public canDelete!:boolean;

	@Prop({type:Boolean,default:false,})
	public canBlock!:boolean;

	@Prop({type:Boolean,default:false,})
	public canMonitor!:boolean;

	@Prop
	public messageData!:TwitchatDataTypes.MessageChatData;

	public showToOptions = false;
	public loading_block = false;
	public loading_ban = false;
	public loading_sus = false;
	public loading_delete = false;

	private closeTimeout = 0;

	public get channelInfo() {
		return this.messageData.user?.channelInfo[this.messageData.channel_id];
	}

	public banUser():void {
		if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
		this.loading_ban = true;
		this.$confirm(this.$t("chat.mod_tools.ban_confirm_title", {USER:this.messageData.user.displayNameOriginal}), this.$t("chat.mod_tools.ban_confirm_desc"))
		.then(async () => {
			try {
				if(this.messageData.fake === true) {
					//Avoid banning user for real if doing it from a fake message
					this.$store.users.flagBanned(this.messageData.platform, this.messageData.channel_id, this.messageData.user.id);
				}else{
					switch(this.messageData.platform) {
						case "twitch": {
							await TwitchUtils.banUser(this.messageData.user, this.messageData.channel_id, undefined, this.$t("global.moderation_action.ban_reason"));
							break;
						}
						case "youtube": {
							await YoutubeHelper.instance.banUser(this.messageData.user.id, (this.messageData as TwitchatDataTypes.MessageChatData).youtube_liveId!);
							break;
						}
					}
				}
			}catch(error) {
			}
			this.loading_ban = false;
			this.$emit("actionComplete");
		}).catch(()=>{
			this.loading_ban = false;
		});
	}

	public async unbanUser():Promise<void> {
		if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
		this.loading_ban = true;
		try {
			if(this.messageData.fake === true) {
				//Avoid banning user for real if doing it from a fake message
				this.$store.users.flagUnbanned(this.messageData.platform, this.messageData.channel_id, this.messageData.user.id);
			}else{
				switch(this.messageData.platform) {
					case "twitch": {
						await TwitchUtils.unbanUser(this.messageData.user, this.messageData.channel_id);
						break;
					}
					case "youtube": {
						await YoutubeHelper.instance.unbanUser(this.messageData.user.id, (this.messageData as TwitchatDataTypes.MessageChatData).youtube_liveId!);
						break;
					}
				}
			}
		}catch(error) {
		}
		this.loading_ban = false;
		this.$emit("actionComplete");
	}

	public blockUser():void {
		if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BLOCKED])) return;
		this.loading_block = true;
		this.$confirm(this.$t("chat.mod_tools.block_confirm_title", {USER:this.messageData.user.displayNameOriginal}), this.$t("chat.mod_tools.block_confirm_desc"))
		.then(async () => {
			try {
				if(this.messageData.fake === true) {
					//Avoid blocking user for real if doing it from a fake message
					this.$store.users.flagBlocked(this.messageData.platform, this.messageData.user.id);
				}else{
					await TwitchUtils.blockUser(this.messageData.user);
				}
			}catch(error) {
			}
			this.loading_block = false;
			this.$emit("actionComplete");
		}).catch(()=>{
			this.loading_block = false;
		});
	}

	public async unblockUser():Promise<void> {
		if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BLOCKED])) return;
		this.loading_block = true;
		try {
			if(this.messageData.fake === true) {
				//Avoid blocking user for real if doing it from a fake message
				this.$store.users.flagUnblocked(this.messageData.platform, this.messageData.user.id);
			}else{
				await TwitchUtils.unblockUser(this.messageData.user);
			}
		}catch(error) {
		}
		this.loading_block = false;
		this.$emit("actionComplete");
	}

	public async timeoutUser(duration:number):Promise<void> {
		if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
		this.loading_ban = true;
		this.closeToOptions(true);
		try {
			if(this.messageData.fake === true) {
				//Avoid banning user for real if doing it from a fake message
				this.$store.users.flagBanned(this.messageData.platform, this.messageData.channel_id, this.messageData.user.id, duration);
			}else{
				switch(this.messageData.platform) {
					case "twitch": {
						await TwitchUtils.banUser(this.messageData.user, this.messageData.channel_id, duration);
						break;
					}
					case "youtube": {
						await YoutubeHelper.instance.banUser(this.messageData.user.id, (this.messageData as TwitchatDataTypes.MessageChatData).youtube_liveId!, duration);
						break;
					}
				}
			}
		}catch(error) {
		}
		this.loading_ban = false;
		this.$emit("actionComplete");
	}

	public deleteMessage():void {
		if(!TwitchUtils.requestScopes([TwitchScopes.DELETE_MESSAGES])) return;
		StoreProxy.chat.deleteMessage(this.messageData, undefined, this.messageData.fake !== true);
	}

	public async openToOptions():Promise<void> {
		this.showToOptions = true;
		await this.$nextTick();
		const holder = this.$refs.toOptions as HTMLDivElement;
		gsap.from(holder, {width:0, duration:.2, ease:"sin.inOut"});
	}

	public closeToOptions(noDelay = false):void {
		this.closeTimeout = window.setTimeout(() => {
			const holder = this.$refs.toOptions as HTMLDivElement;
			if(!holder) return;
			gsap.to(holder, {width:0, duration:.2, ease:"sin.inOut",
			onComplete:()=> {
				this.showToOptions = false;
			}});
		}, noDelay ? 0 : 500);
	}

	public resetCloseTimeout():void {
		clearTimeout(this.closeTimeout);
	}

	public async flagUser(mode:"restrict"|"monitor"):Promise<void> {
		if(!TwitchUtils.requestScopes([TwitchScopes.MANAGE_SUSPICIOUS_USERS])) return;
		this.loading_sus = true;
		try {
			if(mode == "monitor"){
				await TwitchUtils.setSuspiciousUser(this.messageData.channel_id, this.messageData.user.id, "ACTIVE_MONITORING");
			}else{
				await TwitchUtils.setSuspiciousUser(this.messageData.channel_id, this.messageData.user.id, "RESTRICTED");
			}
		}catch(err) {
		}
		this.loading_sus = false;
		this.$emit("actionComplete");
	}
	
	public async unflagUser():Promise<void> {
		if(!TwitchUtils.requestScopes([TwitchScopes.MANAGE_SUSPICIOUS_USERS])) return;
		this.loading_sus = true;
		try {
			await TwitchUtils.unsetSuspiciousUser(this.messageData.channel_id, this.messageData.user.id);
		}catch(err) {
		}
		this.loading_sus = false;
		this.$emit("actionComplete");
	}
}
export default toNative(ChatModTools);
</script>

<style scoped lang="less">
.chatmodtools{
	gap: .5em;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;

	.icon {
		height: 1em;
		width: 1em;
		cursor: pointer;

		&.offsetUp {
			position: relative;
			top: -2px;
		}
		&.offsetDown {
			position: relative;
			top: 1px;
		}
	}

	.toOptions {
		overflow: hidden;
		display: inline-flex;
		flex-direction: row;
		bottom: 0;
		.button {
			border-radius: 0;
			padding: 0 .25em;
			margin-right: 1px;
			&:first-child{
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			&:last-child{
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}
		}
	}
}
</style>
