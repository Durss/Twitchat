<template>
	<div :class="classes">
		<Button class="backBt clearButton" v-if="selectedUser" :icon="$image('icons/back.svg')" @click="selectedUser = null" />
		<h1 class="title" v-if="!selectedUser"><img src="@/assets/icons/whispers.svg">{{ $t('whispers.title') }}</h1>
		<h1 class="title clickable" @click="openUserCard()" v-else><img src="@/assets/icons/whispers.svg">{{selectedUser.displayName}}</h1>
	
		<div class="content messages" v-if="selectedUser">
			<div class="messageList" ref="messageList">
				<div v-for="m in $store('chat').whispers[selectedUser.id]" :key="m.id" :class="messageClasses(m)">
					<span class="time" v-if="$store('params').appearance.displayTime.value">{{getTime(m)}}</span>
					<div class="text" v-html="m.message_html"></div>
				</div>
			</div>

			<div v-if="error" class="error" @click="error = false">
				{{ $t('whispers.cant_send_1') }}
				<br>
				{{ $t('whispers.cant_send_2') }}
			</div>

			<form @submit.prevent="sendWhisper()" v-if="canAnswer">
				<input type="text" :placeholder="$t('whispers.input_placeholder')" class="dark" v-model="whisper" maxlength="500">
				<Button class="submit" type="submit" :icon="$image('icons/checkmark_white.svg')" :disabled="!whisper" />
			</form>
			<Button v-else small highlight :title="$t('whispers.add_scope_bt')" :icon="$image('icons/unlock.svg')" @click="allowAnswerScope()" />
		</div>

		<div class="content users" v-else>
			<div class="user"
			v-for="(w, uid) in $store('chat').whispers"
			:key="uid">
				<Button class="login"
					@click="selectUser(w[0])"
					:title="'<i>('+w.length+')</i> '+($store('auth').twitch.user.id == w[0].to.id? w[0].user.displayName : w[0].to.displayName)"
					bounce
					small
					white
					:data-tooltip="$store('auth').twitch.user.id == w[0].to.id? w[0].user.displayName : w[0].to.displayName" />
					
				<Button :icon="$image('icons/cross_white.svg')"
					class="deleteBt"
					small
					bounce highlight
					@click="deleteWhispers(uid as string)" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';

@Component({
	components:{
		Button,
	}
})
export default class WhispersState extends Vue {

	public error = false;
	public whisper:string | null = null;
	public selectedUser:TwitchatDataTypes.TwitchatUser | null = null;

	public get classes():string[] {
		let res = ["whispersstate"];
		return res;
	}

	public get canAnswer():boolean {
		return TwitchUtils.hasScope(TwitchScopes.WHISPER_WRITE);
	}
 
	public mounted():void {
		this.$store("chat").whispersUnreadCount = 0;
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

	public selectUser(m:TwitchatDataTypes.MessageWhisperData):void {
		this.selectedUser = this.$store("auth").twitch.user.id == m.to.id? m.user : m.to;
		this.$nextTick().then(()=>{
			this.scrollToBottom();
		})
	}

	public allowAnswerScope():void {
		this.$store("auth").requestTwitchScope([TwitchScopes.WHISPER_WRITE]);
	}

	public async sendWhisper():Promise<void> {
		if(!this.whisper || !this.selectedUser) return;

		this.error = false;
		
		try {
			await TwitchUtils.whisper(this.whisper, undefined, this.selectedUser.id);
		}catch(error) {
			this.error = true;
		}
		this.scrollToBottom();

		this.whisper = "";
	}

	public deleteWhispers(user:string):void {
		this.$store("chat").closeWhispers(user);
		this.selectedUser = null;
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.selectedUser);
	}

	private scrollToBottom():void {
		const div = this.$refs.messageList as HTMLDivElement;
		div.scrollTo(0, div.scrollHeight);
	}

}
</script>

<style scoped lang="less">
.whispersstate{

	.backBt {
		position: absolute;
		top: 10px;
		left: 10px;
		width: 1.5em;
		height: 1.5em;
	}

	.title {
		color: @mainColor_light;
		margin: auto;
		text-align: center;
		padding-bottom: 10px;
		word-break: break-word;
		img {
			height: 20px;
			margin-right: 10px;
			vertical-align: middle;
		}

		&.clickable {
			cursor: pointer;
		}
	}

	.content {
		max-height: 300px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		
		&.users {
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			gap:.5em;
			padding-left: 5px;
			flex-grow: 1;
			.user {
				display: flex;
				flex-direction: row;
				margin-bottom: 1px;
				.login {
					flex-grow: 1;
					padding: .15em .25em;
					transform-origin: right center;
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
					justify-content: flex-start;
				}
	
				.deleteBt {
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
					padding: .1em;
					:deep(.icon) {
						height: .7em;
						min-height: .7em;
					}
				}
			}
		}

		&.messages {
			color: #fff;
			padding-right: 5px;
			display: flex;
			flex-direction: column;
			justify-content: flex-start;
			max-width: 800px;
			width: 100%;
			margin:auto;

			.messageList {
				overflow-y: auto;
				display: flex;
				flex-direction: column;

				.message {
					display: flex;
					flex-direction: row;
					align-items: baseline;
					align-self: flex-start;
					padding: .5em;
					margin: .5em 0;
					line-height: 1.25em;
					// width: auto;
					max-width: 80%;
					border-radius: .5em;
					background-color: rgba(255, 255, 255, .2);
					font-size: var(--messageSize);

					&:has(.time) {
						.time + *{
							padding-left: 3em;
						}
					}
					
					.text {
						word-break: break-word;
					}

					&.isMe {
						flex-direction: row-reverse;
						align-self: flex-end;
						margin-right: 0;
						background-color: rgba(0, 0, 0, .2);
						.time {
							margin-left: .5em;
							margin-right: 0;
						}
					}
		
					:deep( .emote ) {
						max-height: 2em;
						vertical-align: middle;
						object-fit: contain;
					}
		
					.time {
						.chatMessageTime();
					}
				}
			}

			.error {
				background-color: @mainColor_alert;
				color:@mainColor_light;
				padding: .5em;
				border-radius: .5em;
				cursor: pointer;
			}
		
			form {
				display: flex;
				flex-direction: row;
				margin-top: 10px;
				input {
					width: 100%;
					flex-grow: 1;
					border-radius: .5em;
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
					border: none;
					background-color: rgba(0, 0, 0, .3);
				}
				.submit {
					padding: .25em;
					border-radius: .5em;
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
					:deep(img) {
						height: 16px;
					}
				}
			}
		}
	}
}
</style>