<template>
	<div class="chatprivatemoderatorevent chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="mod" alt="moderator" class="icon"/>

		<div class="messageHolder">
			<a :href="getProfilePage(messageData.user)" target="_blank"
				@click.stop.prevent="openUserCard(messageData.user, messageData.channel_id, messageData.platform)"
				data-login
				class="login bold">{{messageData.user.displayNameOriginal}}</a>
				
			<span class="login" v-if="toUser && toUser.temporary !== true">=>
				<a :href="getProfilePage(toUser)" target="_blank"
					@click.stop.prevent="openUserCard(toUser, messageData.channel_id, messageData.platform)"
					data-login
					class="login bold">{{toUser.displayNameOriginal}}</a>
			</span>
			

			<span class="message">
				<ChatMessageChunksParser
					:platform="messageData.platform"
					:chunks="messageData.message_chunks"
					:channel="messageData.channel_id" />
			</span>
			
			<div class="quote" v-if="messageData.parentMessage">
				<div class="header"><Icon name="info" /><strong>{{ $t("chat.private_mod_message.quoted_message") }}</strong></div>
				<a :href="getProfilePage(messageData.parentMessage.user)" target="_blank"
					@click.stop.prevent="openUserCard(messageData.parentMessage.user, messageData.parentMessage.channel_id, messageData.parentMessage.platform)"
					data-login
					class="login">{{messageData.parentMessage.user.displayNameOriginal}}</a>
					
				<ChatMessageChunksParser
					:platform="messageData.platform"
					:chunks="messageData.parentMessage.message_chunks"
					:channel="messageData.channel_id" />
			</div>
		</div>
		
		<div class="ctas"
		v-if="messageData.action == 'question' && messageData.user.id != $store.auth.twitch.user.id && messageData.answer == undefined">
			<TTButton icon="checkmark" small primary :loading="loading" @click.stop.prevent="answerQuestion(true)">{{ $t("global.yes") }}</TTButton>
			<TTButton icon="cross" small alert :loading="loading" @click.stop.prevent="answerQuestion(false)">{{ $t("global.no") }}</TTButton>
		</div>
		<div class="answer" :class="{rejected:messageData.answer === false}" v-if="messageData.answer != undefined">
			<template v-if="messageData.answer"><Icon name="checkmark" /> {{ $t("chat.private_mod_message.accepted") }}</template>
			<template v-else><Icon name="cross" /> {{ $t("chat.private_mod_message.refused") }}</template>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import AbstractChatMessage from './AbstractChatMessage';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';
import ApiHelper from '@/utils/ApiHelper';
import Database from '@/store/Database';
import { to } from 'mathjs';

@Component({
	components:{
		TTButton,
		ChatMessageChunksParser,
	},
	emits:["onRead"],
})
class ChatPrivateModerator extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessagePrivateModeratorData;

	public loading:boolean = false;
	public toUser:TwitchatDataTypes.TwitchatUser|null = null;

	public beforeMount():void {
		this.toUser = this.$store.users.getUserFrom("twitch", this.messageData.channel_id, this.messageData.toChannelId);
	}

	public async answerQuestion(answer:boolean):Promise<void> {
		this.loading = true;
		const res = await ApiHelper.call("mod/privateMessage", "PUT", {messageId:this.messageData.id, answer:answer});
		if(res.status == 200) {
			this.messageData.answer = answer;
			Database.instance.updateMessage(this.messageData);
		}
		this.loading = false;
	}
}
export default toNative(ChatPrivateModerator);
</script>

<style scoped lang="less">
.chatprivatemoderatorevent{
	background-color: var(--color-text-inverse);
	@c1: #00a86520;
	@c2: #00a86530;
	background-image: repeating-linear-gradient(-45deg, @c1, @c1 20px, @c2 20px, @c2 40px);

	.messageHolder {
		flex-grow: 1;
	}

	.quote {
		font-style: italic;
		margin-top: .5em;
		.header {
			font-style: normal;
			margin-bottom: .5em;
			.icon {
				height: 1em;
				margin-right: .25em;
			}
		}
	}

	.login {
		cursor: pointer;
		text-decoration: none;
		text-wrap: nowrap;
		&.bold {
			font-weight: bold;
		}
		// -webkit-text-stroke: fade(#000, 50%) .25px;
		&::after{
			content: ": ";
			display: inline-block;
		}
	}

	.ctas {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: .25em;
		flex-shrink: 1;
		justify-content: flex-end;
	}

	.answer {
		padding: .25em .5em;
		gap: .25em;
		display: flex;
		flex-direction: row;
		align-items: center;
		border-top-left-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
		background-color: var(--color-primary);
		color: var(--color-light);

		position: absolute;
		bottom: 0;
		right: 0;
		.icon {
			height: 1em;
		}

		&.rejected {
			background-color: var(--color-alert);
		}
	}
}
</style>