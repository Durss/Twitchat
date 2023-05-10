<template>
	<div class="chatraid chatMessage highlight">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<Icon name="raid" alt="raid" class="icon"/>

		<div class="messageHolder">
			<i18n-t scope="global" tag="span" keypath="chat.raid.text" :plural="messageData.viewers">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard()">{{messageData.user.displayName}}</a>
				</template>
				<template #COUNT>
					<strong>{{ messageData.viewers }}</strong>
				</template>
			</i18n-t>

			<div class="streamInfo">
				<div class="infos">
					<div class="title quote">
						<span>{{messageData.stream.title}}</span>
						<div class="details">
							<p class="category">{{messageData.stream.category}}</p>
							<div class="duration" v-if="messageData.stream.wasLive">
								<Icon name="timer" class="icon" theme="dark" />{{formatedDuration}}
							</div>
						</div>
					</div>
				</div>

				<Button @click.stop="shoutout()"
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
import Utils from '@/utils/Utils';
import { Component, Prop } from 'vue-facing-decorator';
import Button from '../Button.vue';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{
		Button,
	},
	emits:["onRead"],
})
export default class ChatRaid extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageRaidData;

	public shoutoutLoading = false;
	public formatedDuration = "";

	public beforeMount():void {
		this.formatedDuration = Utils.formatDuration(this.messageData.stream.duration);
	}


	public openUserCard():void {
		this.$store("users").openUserCard(this.messageData.user, this.messageData.channel_id);
	}

	public async shoutout():Promise<void> {
		this.shoutoutLoading = true;
		try {
			await this.$store("users").shoutout(this.$store("auth").twitch.user.id, this.messageData.user);
		}catch(error) {
			this.$store("main").alert(this.$t("error.shoutout"));
			console.log(error);
		}
		this.shoutoutLoading = false;
	}
}
</script>

<style scoped lang="less">
.chatraid{
	.messageHolder {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		flex-grow: 1;
		gap: .25em;
	}
}
</style>