<template>
	<div class="chatshoutout">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>

		<img src="@/assets/icons/shoutout.svg" alt="shoutout" class="icon">

		<div class="info">
			<i18n-t scope="global" tag="span"
			v-if="messageData.received" keypath="chat.shoutout.received">
				<template #CHANNEL>
					<a class="userlink" @click.stop="openUserCard(channel)">{{channel.displayName}}</a>
				</template>
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
				</template>
				<template #VIEWERS>
					<strong>{{messageData.viewerCount}}</strong>
				</template>
			</i18n-t>
			
			<i18n-t scope="global" tag="span" v-else
			keypath="chat.shoutout.given">
				<template #MODERATOR>
					<a class="userlink" @click.stop="openUserCard(messageData.moderator)">{{messageData.moderator.displayName}}</a>
				</template>
				<template #CHANNEL>
					<strong>#{{channel.displayName}}</strong>
				</template>
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
				</template>
				<template #VIEWERS>
					<strong>{{messageData.viewerCount}}</strong>
				</template>
			</i18n-t>

			<div v-if="messageData.received" class="streamInfo">
				<p>Streaming <strong>{{messageData.stream.category}}</strong>:</p>
				<p class="title">{{messageData.stream.title}}</p>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"]
})
export default class ChatShoutout extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageShoutoutData;

	public get channel():TwitchatDataTypes.TwitchatUser {
		return this.$store("users").getUserFrom(this.messageData.platform, this.messageData.channel_id, this.messageData.channel_id);
	}

	public mounted():void {
		
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user);
	}

}
</script>

<style scoped lang="less">
.chatshoutout{
	.chatMessageHighlight();
	
	align-items: flex-start;
	
	.info {
		.streamInfo {
			width: 100%;
			.title {
				font-style: italic;
			}
		}
	}
}
</style>