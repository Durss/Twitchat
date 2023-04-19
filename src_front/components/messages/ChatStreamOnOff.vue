<template>
	<div :class="classes">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>

		<img :src="$image('icons/online.svg')" alt="online" class="icon" v-if="isOnline">
		<img :src="$image('icons/offline.svg')" alt="offline" class="icon" v-else>

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" :keypath="isOnline? 'chat.stream.online' : 'chat.stream.offline'">
				<template #USER>
					<a class="userlink"
						:href="'https://twitch.tv/'+messageData.info.user.login"
						target="_blank"
						@click.stop.prevent="openUserCard(messageData.info.user)">{{messageData.info.user.displayName}}</a>
				</template>
			</i18n-t>

			<div v-if="isOnline && messageData.info" class="streamInfo">
				<div class="infos">
					<i18n-t scope="global" keypath="chat.stream.info" tag="p">
						<template #CATEGORY>
							<strong>{{messageData.info.category}}</strong>
						</template>
					</i18n-t>
					<p class="title">{{messageData.info.title}}</p>
				</div>

				<Button v-if="!isMe && isOnline"
					@click.stop="shoutout()"
					icon="shoutout"
					:loading="shoutoutLoading"
					white
					class="soButton"
				>{{ $t('chat.soBt') }}</Button>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import Button from '../Button.vue';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{
		Button,
	},
	emits:["onRead"]
})
export default class ChatStreamOnOff extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData;

	public shoutoutLoading:boolean = false;
	public classes:string[] = ["chatstreamonoff"];

	public get isMe():boolean {
		return this.messageData.info.user.id == this.$store("auth").twitch.user.id;
	}

	public get isOnline():boolean {
		return this.messageData.type == TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE;
	}

	public mounted():void {
		let aria = "";
		if(this.isOnline) {
			aria = this.$t("chat.stream.online", {USER:this.messageData.info.user.displayName});
		}else{
			this.classes.push("offline");
			aria = this.$t("chat.stream.offline", {USER:this.messageData.info.user.displayName});
		}
		this.$store("accessibility").setAriaPolite(aria);
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user);
	}

	public async shoutout():Promise<void> {
		this.shoutoutLoading = true;
		try {
			await this.$store("users").shoutout(this.$store("auth").twitch.user.id, this.messageData.info.user);
		}catch(error) {
			this.$store("main").alert(this.$t("error.shoutout"));
			console.log(error);
		}
		this.shoutoutLoading = false;
	}
}
</script>

<style scoped lang="less">
.chatstreamonoff{
	.chatMessageHighlight();
	
	background-color: fade(@mainColor_highlight, 25);
	&:hover {
		background-color: fade(@mainColor_highlight_light, 25);
	}
	
	&.offline {
		background-color: fade(@mainColor_alert, 25);
		&:hover {
			background-color: fade(@mainColor_alert_light, 25);
		}
	}

	.messageHolder {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		flex-grow: 1;
		gap: .25em;
	}

	.streamInfo {
		color: var(--mainColor_light);
		// background-color: rgba(255, 255, 255, .15);
		border-radius: .5em;
		overflow: hidden;
		width: 100%;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		.infos {
			flex-grow: 1;
			flex-basis: 200px;
			.game {
				font-style: italic;
			}
			.duration {
				font-size: .9em;
				opacity: .8;
			}
		}
		.soButton {
			align-self: center;
		}
	}
}
</style>