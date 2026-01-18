<template>
	<div class="whispersstate sidePanel">
		<div class="head">
			<ClearButton @click="close" />
			<h1 class="title" v-if="isConversation"><img :src="getCorrespondant(selectedUserId).avatarPath" v-if="getCorrespondant(selectedUserId).avatarPath" class="icon">{{ $t('whispers.title') }} - {{ getCorrespondant(selectedUserId).displayName }}</h1>
		</div>

		<div class="content" v-if="isConversation">
			<div class="messageList" ref="messageList">
				<div v-for="m in $store.chat.whispers[selectedUserId]!.messages" :key="m.id" :class="messageClasses(m)">
					<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{getTime(m)}}</span>
					<div class="text">
						<ChatMessageChunksParser :chunks="m.message_chunks" :channel="m.channel_id" :platform="m.platform" />
					</div>
				</div>
			</div>

			<div v-if="error" class="errorCard" @click="error = false">
				{{ $t('whispers.cant_send_1') }}
				<br>
				{{ $t('whispers.cant_send_2') }}
			</div>

			<form @submit.prevent="sendWhisper()" v-if="canAnswer">
				<input type="text" :placeholder="$t('whispers.input_placeholder')" class="dark" v-model="whisper" maxlength="500" v-autofocus>
				<TTButton class="submit" type="submit" icon="checkmark" :disabled="!whisper" />
			</form>
			<TTButton v-else small highlight icon="unlock" @click="requestTwitchScope()">{{ $t('whispers.add_scope_bt') }}</TTButton>

			<div class="userlist" v-if="Object.keys($store.chat.whispers).length > 0">
				<div v-for="whispers, key in $store.chat.whispers" :key="key" class="user">
					<TTButton small class="login" @click="selectedUserId = <string>key" :selected="selectedUserId == key">{{ getCorrespondant(<string>key).displayName }}</TTButton>
					<TTButton small class="delete" icon="trash" @click="deleteWhispers(<string>key)" alert></TTButton>
				</div>
			</div>
		</div>

		<div class="content" v-else>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import {toNative,  Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import { watch } from 'vue';
import ChatMessageChunksParser from '../messages/components/ChatMessageChunksParser.vue';

@Component({
	components:{
		TTButton,
		ToggleBlock,
		ClearButton,
		ChatMessageChunksParser,
	},
	emits:["close"]
})
class WhispersState extends AbstractSidePanel {

	public error = false;
	public whisper:string | null = null;
	public selectedUserId:string = "";

	public get canAnswer():boolean {
		return TwitchUtils.hasScopes([TwitchScopes.WHISPER_MANAGE]);
	}

	public get isConversation():boolean {
		return Object.keys(this.$store.chat.whispers).length > 0;
	}

	public get currentUser():TwitchatDataTypes.TwitchatUser {
		//TODO Is this thing necessary?
		return this.$store.chat.whispers[this.selectedUserId]!.messages.find(v=> v.user.id == this.selectedUserId)!.user;
	}

	public getCorrespondant(uid:string):TwitchatDataTypes.TwitchatUser {
		const whispers = this.$store.chat.whispers[uid]!;
		const me = this.$store.auth.twitch.user.id;
		return whispers.to.id == me? whispers.from : whispers.to;
	}

	public beforeMount():void {
		this.selectedUserId = Object.keys(this.$store.chat.whispers)[0]!;
		this.$store.chat.whispersUnreadCount = 0;
		watch(()=>this.selectedUserId, async ()=>{
			//Force scroll for a few frames in case there are
			//emotes to be loaded. If we were not waiting for this
			//the scroll might to be at the bottom
			for (let i = 0; i < 10; i++) {
				await this.$nextTick();
				this.scrollToBottom();
			}
		});
	}

	public mounted():void {
		this.open();
	}

	public messageClasses(whisper:TwitchatDataTypes.MessageWhisperData):string[] {
		let classes:string[] = ["message"];
		if(whisper.user.id == this.$store.auth.twitch.user.id) classes.push("isMe");
		return classes;
	}

	public getTime(whisper:TwitchatDataTypes.MessageWhisperData):string {
		const d = new Date(whisper.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public requestTwitchScope():void {
		this.$store.auth.requestTwitchScopes([TwitchScopes.WHISPER_MANAGE]);
	}

	public async sendWhisper():Promise<void> {
		if(!this.whisper || !this.selectedUserId) return;

		this.error = false;

		try {
			await TwitchUtils.whisper(this.whisper, undefined, this.selectedUserId);
		}catch(error) {
			this.error = true;
		}
		this.scrollToBottom();

		this.whisper = "";
	}

	public deleteWhispers(uid:string):void {
		this.$store.chat.closeWhispers(uid);
		if(this.selectedUserId == uid && this.isConversation) {
			this.selectedUserId = Object.keys(this.$store.chat.whispers)[0]!;
		}
		if(!this.isConversation) this.close();
	}

	private scrollToBottom():void {
		const div = this.$refs.messageList as HTMLDivElement;
		div.scrollTo(0, div.scrollHeight);
	}

}
export default toNative(WhispersState);
</script>

<style scoped lang="less">
.whispersstate{
	.head>.title>.icon {
		border-radius: 50%;
	}
	.content {
		padding-right: 5px;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		width: 100%;
		margin:auto;

		.userlistToggle {
			width: 100%;
		}

		.userlist {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			gap: 10px;
			flex-shrink: 0;
			.user {
				display: flex;
				flex-direction: row;
				.login {
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
				}
				.delete {
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
					padding: 0 .5em;
				}
			}
		}

		.messageList {
			overflow-y: auto;
			display: flex;
			flex-direction: column;
			flex-grow: 1;
			gap: .5em;

			.message {
				display: flex;
				flex-direction: row;
				align-items: baseline;
				align-self: flex-start;
				position: relative;
				padding: .5em;
				line-height: 1.25em;
				// width: auto;
				max-width: 80%;
				border-radius: .5em;
				font-size: var(--messageSize);
				color: var(--color-text);
				background-color: var(--color-primary-fadest);
				flex-shrink: 0;

				.chatMessageTime + *{
					padding-left: 3em;
				}

				.text {
					word-break: break-word;
				}

				&.isMe {
					flex-direction: row-reverse;
					align-self: flex-end;
					margin-right: 0;
					background-color: var(--color-secondary-fadest);

					.chatMessageTime + *{
						padding-left: 0;
						padding-right: 3em;
					}
				}

				:deep( .emote ) {
					max-height: 2em;
					vertical-align: middle;
					object-fit: fill;
				}
			}
		}

		form {
			gap: 0;
			flex-direction: row;
			align-items: stretch;
			flex-shrink: 0;
			input {
				flex-grow: 1;
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
			.submit {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
			}
		}
	}
}
</style>
