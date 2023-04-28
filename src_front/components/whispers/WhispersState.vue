<template>
	<div class="whispersstate sidePanel" v-if="selectedUser">
		<div class="head">
			<CloseButton @click="close" />
			
			<h1 class="title"><img src="@/assets/icons/whispers.svg" class="icon">{{ $t('whispers.title') }}</h1>
		</div>
	
		<div class="content">
			<div class="messageList" ref="messageList">
				<div v-for="m in $store('chat').whispers[selectedUser]" :key="m.id" :class="messageClasses(m)">
					<span class="time" v-if="$store('params').appearance.displayTime.value">{{getTime(m)}}</span>
					<div class="text" v-html="m.message_html"></div>
				</div>
			</div>

			<div v-if="error" class="errorCard" @click="error = false">
				{{ $t('whispers.cant_send_1') }}
				<br>
				{{ $t('whispers.cant_send_2') }}
			</div>

			<form @submit.prevent="sendWhisper()" v-if="canAnswer">
				<input type="text" :placeholder="$t('whispers.input_placeholder')" class="dark" v-model="whisper" maxlength="500">
				<Button class="submit" type="submit" icon="checkmark" :disabled="!whisper" />
			</form>
			<Button v-else small highlight :title="$t('whispers.add_scope_bt')" icon="unlock" @click="requestTwitchScope()" />
			
			<div class="userlist">
				<div v-for="uid, index in uids" :key="uid" class="user">
					<Button small class="login" @click="selectedUser = uid" :selected="selectedUser == uid">{{ labels[index] }}</Button>
					<Button small class="delete" icon="trash" @click="deleteWhispers(uid)" alert></Button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel.vue';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import { watch } from 'vue';

@Component({
	components:{
		Button,
		ToggleBlock,
		CloseButton,
	},
	emits:["close"]
})
export default class WhispersState extends AbstractSidePanel {

	public error = false;
	public whisper:string | null = null;
	public selectedUser:string = "";

	public get canAnswer():boolean {
		return TwitchUtils.hasScopes([TwitchScopes.WHISPER_WRITE]);
	}

	public get currentUser():TwitchatDataTypes.TwitchatUser {
		return this.$store('chat').whispers[this.selectedUser].find(v=> v.user.id == this.selectedUser)!.user;
	}

	public get uids():string[] { return Object.keys(this.$store('chat').whispers); }

	public get labels():string[] {
		const me = this.$store("auth").twitch.user.id;
		return this.uids.map(uid => {
			const m = this.$store('chat').whispers[uid][0];
			return m.to.id != uid? m.user.displayName : m.to.displayName;
		});
	}
 
	public mounted():void {
		this.selectedUser = this.uids[0];
		this.$store("chat").whispersUnreadCount = 0;
		watch(()=>this.selectedUser, async ()=>{
			//Force scroll for a few frames in case there are
			//emotes to be loaded. If we were not waiting for this
			//the scroll might to be at the bottom
			for (let i = 0; i < 10; i++) {
				await this.$nextTick();
				this.scrollToBottom();
			}
		});
	}

	public messageClasses(whisper:TwitchatDataTypes.MessageWhisperData):string[] {
		let classes:string[] = ["message"];
		if(whisper.user.id == this.$store("auth").twitch.user.id) classes.push("isMe");
		return classes;
	}

	public getTime(whisper:TwitchatDataTypes.MessageWhisperData):string {
		const d = new Date(whisper.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public requestTwitchScope():void {
		this.$store("auth").requestTwitchScopes([TwitchScopes.WHISPER_WRITE]);
	}

	public async sendWhisper():Promise<void> {
		if(!this.whisper || !this.selectedUser) return;

		this.error = false;
		
		try {
			await TwitchUtils.whisper(this.whisper, undefined, this.selectedUser);
		}catch(error) {
			this.error = true;
		}
		this.scrollToBottom();

		this.whisper = "";
	}

	public deleteWhispers(user:string):void {
		this.$store("chat").closeWhispers(user);
	}

	private scrollToBottom():void {
		const div = this.$refs.messageList as HTMLDivElement;
		div.scrollTo(0, div.scrollHeight);
	}

}
</script>

<style scoped lang="less">
.whispersstate{
	.content {
		padding-right: 5px;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		max-width: 800px;
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
				background-color: var(--color-primary);

				.time + *{
					padding-left: 3em;
				}
				
				.text {
					word-break: break-word;
				}

				&.isMe {
					flex-direction: row-reverse;
					align-self: flex-end;
					margin-right: 0;
					background-color: var(--color-secondary);

					.time + *{
						padding-left: 0;
						padding-right: 3em;
					}

					:deep(a) {
					color: var(--mainColor_warn);
					}
				}
	
				:deep( .emote ) {
					max-height: 2em;
					vertical-align: middle;
					object-fit: fill;
				}

				:deep(a) {
					color: var(--mainColor_warn_light);
				}
	
				.time {
					.chatMessageTime();
				}
			}
		}

		form {
			gap: 0;
			flex-direction: row;
			align-items: stretch;
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