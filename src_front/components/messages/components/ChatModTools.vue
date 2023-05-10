<template>
	<div class="chatmodtools" @mouseleave="closeToOptions()">
		<Icon name="ban" alt="ban" v-tooltip="$t('chat.mod_tools.banBt')" @click.stop="banUser()"/>
		<Icon name="timeout" alt="timeout"
		@click.stop="openToOptions()"
		v-tooltip="'Timeout'" />
		<div class="toOptions" v-if="showToOptions" ref="toOptions" @mouseenter="resetCloseTimeout()">
			<Button alert :aria-label="$t('chat.mod_tools.to10_aria')"			@click.stop="timeoutUser(10)" small>{{$t('chat.mod_tools.to10')}}</Button>
			<Button alert :aria-label="$t('chat.mod_tools.to120_aria')"			@click.stop="timeoutUser(120)" small>{{$t('chat.mod_tools.to120')}}</Button>
			<Button alert :aria-label="$t('chat.mod_tools.to30_aria')"			@click.stop="timeoutUser(1800)" small>{{$t('chat.mod_tools.to30')}}</Button>
			<Button alert :aria-label="$t('chat.mod_tools.to3600_aria')"			@click.stop="timeoutUser(3600)" small>{{$t('chat.mod_tools.to3600')}}</Button>
			<Button alert :aria-label="$t('chat.mod_tools.to43200_aria')"			@click.stop="timeoutUser(3600*12)" small>{{$t('chat.mod_tools.to43200')}}</Button>
			<Button alert :aria-label="$t('chat.mod_tools.to1w_aria')"			@click.stop="timeoutUser(3600*24*7)" small>{{$t('chat.mod_tools.to1w')}}</Button>
		</div>
		<Icon name="trash" alt="trash" v-tooltip="$t('global.delete')" @click.stop="deleteMessage()" v-if="canDelete"/>
		<Icon name="block" alt="trash" v-tooltip="$t('chat.mod_tools.blockBt')" @click.stop="blockUser()" v-if="canBlock !== false"/>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import gsap from 'gsap';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../../Button.vue';

@Component({
	components:{
		Button,
	},
	emits:["deleteMessage", "deleteUser"]
})
/**
 * TODO replace <Button> to simplement native <button> elements
 */
export default class ChatModTools extends Vue {
	
	@Prop
	public canDelete!:boolean;
	@Prop({
			type:Boolean,
			default:false,
		})
	public canBlock!:boolean;
	@Prop
	public messageData!:TwitchatDataTypes.MessageChatData;
	
	public showToOptions = false;

	private closeTimeout = 0;

	public banUser():void {
		if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
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
		if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BLOCKED])) return;
		this.$confirm(this.$t("chat.mod_tools.block_confirm_title", {USER:this.messageData.user.displayName}), this.$t("chat.mod_tools.block_confirm_desc"))
		.then(() => {
			this.$emit('deleteUser', this.messageData);
			if(this.messageData.fake === true) {
				//Avoid blocking user for real if doing it from a fake message
				this.$store("users").flagBlocked(this.messageData.platform, this.messageData.user.id);
			}else{
				TwitchUtils.blockUser(this.messageData.user);
			}
		})
	}

	public timeoutUser(duration:number):void {
		if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
		this.$emit('deleteUser', this.messageData);
		if(this.messageData.fake === true) {
			//Avoid banning user for real if doing it from a fake message
			this.$store("users").flagBanned(this.messageData.platform, this.messageData.channel_id, this.messageData.user.id, duration);
		}else{
			TwitchUtils.banUser(this.messageData.user, this.messageData.channel_id, duration);
		}
	}

	public deleteMessage():void {
		if(!TwitchUtils.requestScopes([TwitchScopes.DELETE_MESSAGES])) return;
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

	.icon {
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