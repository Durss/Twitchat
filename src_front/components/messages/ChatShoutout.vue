<template>
	<div class="chatshoutout chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="shoutout" alt="shoutout" class="icon"/>

		<div class="messageHolder">
			<i18n-t scope="global" tag="span"
			v-if="messageData.received" keypath="chat.shoutout.received">
				<template #CHANNEL>
					<a class="userlink" @click.stop="openUserCard(channel, messageData.channel_id)">{{channel.displayName}}</a>
				</template>
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
				</template>
				<template #VIEWERS>
					<strong>{{messageData.viewerCount}}</strong>
				</template>
			</i18n-t>
			
			<i18n-t scope="global" tag="span" v-else
			keypath="chat.shoutout.given">
				<template #MODERATOR>
					<a class="userlink" @click.stop="openUserCard(messageData.moderator, messageData.channel_id)">{{messageData.moderator.displayName}}</a>
				</template>
				<template #CHANNEL>
					<strong>#{{channel.displayName}}</strong>
				</template>
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
				</template>
				<template #VIEWERS>
					<strong>{{messageData.viewerCount}}</strong>
				</template>
			</i18n-t>

			<div class="streamInfo">
				<div class="infos" v-if="messageData.stream.title">
					<div class="quote">
						<span>{{messageData.stream.title}}</span>
						<div class="details" v-if="messageData.stream.category">
							<p class="category">{{messageData.stream.category}}</p>
						</div>
					</div>
				</div>

				<Button @click.stop="shoutout()"
					v-if="messageData.received"
					small
					icon="shoutout"
					:loading="shoutoutLoading"
					class="soButton"
				>{{ $t('chat.soBt') }}</Button>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import TTButton from '../TTButton.vue';

@Component({
	components:{
		Button: TTButton,
	},
	emits:["onRead"]
})
class ChatShoutout extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageShoutoutData;

	public shoutoutLoading = false;

	public channel!:TwitchatDataTypes.TwitchatUser;

	public get iconColor():string{
		return this.$store.common.theme == "dark" ? "#9147ff" : "#772ce8";
	}

	public beforeMount(): void {
		this.channel = this.$store.users.getUserFrom(this.messageData.platform, this.messageData.channel_id, this.messageData.channel_id)
	}

	public async shoutout():Promise<void> {
		this.shoutoutLoading = true;
		try {
			await this.$store.users.shoutout(this.messageData.channel_id, this.messageData.user);
		}catch(error) {
			this.$store.common.alert(this.$t("error.shoutout"));
			console.log(error);
		}
		this.shoutoutLoading = false;
	}

}
export default toNative(ChatShoutout);
</script>

<style scoped lang="less">
.chatshoutout{
	align-items: flex-start;
	
	.messageHolder {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		flex-grow: 1;
		gap: .25em;
	}
	&>.icon {
		color: v-bind(iconColor);
	}
}
</style>