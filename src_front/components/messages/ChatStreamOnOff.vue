<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="online" alt="online" class="icon" v-if="isOnline"/>
		<Icon name="offline" alt="offline" class="icon" v-else/>

		<div class="messageHolder" v-if="messageData.info.user">
			<i18n-t scope="global" tag="span" :keypath="isOnline? 'chat.stream.online' : 'chat.stream.offline'">
				<template #USER>
					<a class="userlink"
						:href="'https://twitch.tv/'+messageData.info.user.login"
						target="_blank"
						@click.stop.prevent="openUserCard(messageData.info.user, messageData.channel_id)">{{messageData.info.user.displayName}}</a>
				</template>
			</i18n-t>

			<div v-if="isOnline && messageData.info" class="streamInfo">
				<div class="infos">
					<div class="title quote">
						<span>{{messageData.info.title}}</span>
						<p v-if="messageData.info.category" class="category">{{messageData.info.category}}</p>
					</div>
				</div>

				<Button v-if="!isMe && isOnline"
					@click.stop="shoutout()"
					icon="shoutout"
					:loading="shoutoutLoading"
					small
					class="soButton"
				>{{ $t('chat.soBt') }}</Button>
			</div>
		</div>

		<div class="messageHolder" v-else>
			missing user details :(...
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{
		Button: TTButton,
	},
	emits:["onRead"]
})
class ChatStreamOnOff extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData;

	public shoutoutLoading:boolean = false;
	public classes:string[] = ["chatstreamonoff", "chatMessage", "highlight"];

	public get isMe():boolean {
		return this.messageData.info.user?.id == this.$store.auth.twitch.user.id;
	}

	public get isOnline():boolean {
		return this.messageData.type == TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE;
	}

	public mounted():void {
		let aria = "";
		if(this.isOnline) {
			aria = this.$t("chat.stream.online", {USER:this.messageData.info.user?.displayName || "???"});
			this.classes.push("success");
		}else{
			this.classes.push("offline", "error");
			aria = this.$t("chat.stream.offline", {USER:this.messageData.info.user?.displayName || "???"});
		}
		this.$store.accessibility.setAriaPolite(aria);
	}

	public async shoutout():Promise<void> {
		this.shoutoutLoading = true;
		try {
			await this.$store.users.shoutout(this.$store.auth.twitch.user.id, this.messageData.info.user!);
		}catch(error) {
			this.$store.common.alert(this.$t("error.shoutout"));
			console.log(error);
		}
		this.shoutoutLoading = false;
	}
}
export default toNative(ChatStreamOnOff);
</script>

<style scoped lang="less">
.chatstreamonoff{

	.messageHolder {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		flex-grow: 1;
		gap: .25em;
	}

	.streamInfo {
		border-radius: .5em;
		overflow: hidden;
		width: 100%;
		row-gap: .5em;
		column-gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		.infos {
			//opacity: .8;
			flex-grow: 1;
			flex-basis: 200px;
			.category {
				width: fit-content;
				margin-right: 0;
				margin-left: 0;
				margin-top: .5em;
				font-size: .9em;
				display: block;
				padding: 2px 10px;
				font-style: normal;
				border-radius: var(--border-radius);
				background-color: var(--background-color-fadest);
			}
		}
		.soButton {
			align-self: center;
		}
	}
}
</style>