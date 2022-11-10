<template>
	<div :class="classes">
		<h1 class="title" v-if="!selectedUser"><img src="@/assets/icons/whispers.svg">Whispers</h1>
		<h1 class="title" v-else><img src="@/assets/icons/whispers.svg">{{selectedUser.displayName}}</h1>

		<div class="content">
		
			<div class="whispers" v-if="selectedUser">
				<div class="messages">
					<div v-for="m in $store('chat').whispers[selectedUser.id]" :key="m.id" :class="messageClasses(m)">
						<span class="time" v-if="$store('params').appearance.displayTime.value">{{getTime(m)}}</span>
						<div v-html="m.message_html"></div>
					</div>
				</div>

				<div v-if="error" class="error" @click="error = false">Unable to send whisper.<br>You must be at least affiliate but even if you are Twitch can randomly block whispers sent from outside of Twitch.</div>

				<form @submit.prevent="sendWhisper()">
					<input type="text" placeholder="answer..." class="dark" v-model="whisper">
					<Button class="submit" type="submit" :icon="$image('icons/checkmark_white.svg')" :disabled="!whisper" />
				</form>
			</div>

			<div v-if="!selectedUser" class="selectInfo">select a user ➡</div>

			<div class="users">
				<div class="user"
				v-for="(w, uid) in $store('chat').whispers"
				:key="uid">
					<Button class="login"
						@click="selectUser(w[0])"
						:title="'('+w.length+') '+($store('auth').twitch.user.id == w[0].to.id? w[0].user.displayName : w[0].to.displayName)"
						bounce
						:data-tooltip="$store('auth').twitch.user.id == w[0].to.id? w[0].user.displayName : w[0].to.displayName" />
						
					<Button :icon="$image('icons/cross_white.svg')"
						class="deleteBt"
						bounce highlight
						@click="deleteWhispers(uid as string)" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{},
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

	public mounted():void {
		this.$store("chat").whispersUnreadCount = 0;
		// watch(() => this.$store("chat").whispers, () => {
		// 	this.$store("chat").whispersUnreadCount = 0;
		// }, {deep:true})
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
	}

	public async sendWhisper():Promise<void> {
		if(!this.whisper || !this.selectedUser) return;

		this.error = false;
		
		try {
			await TwitchUtils.whisper(this.whisper, undefined, this.selectedUser.id);
		}catch(error) {
			this.error = true;
		}

		this.whisper = "";
	}

	public deleteWhispers(user:string):void {
		this.$store("chat").closeWhispers(user);
		this.selectedUser = null;
	}

}
</script>

<style scoped lang="less">
.whispersstate{

	.title {
		color: @mainColor_light;
		width: 100%;
		text-align: center;
		padding-bottom: 10px;
		word-break: break-word;
		img {
			height: 20px;
			margin-right: 10px;
		}
	}

	.content {
		display: flex;
		flex-direction: row !important;
		color: #fff;

		
		.users {
			display: flex;
			flex-direction: column;
			border-left: 1px solid #fff;
			padding-left: 5px;
			position: sticky;
			top	: 0;
			.user {
				display: flex;
				flex-direction: row;
				margin-bottom: 1px;
				width: 130px;
				max-width: 130px;
				.login {
					color: #fff;
					flex-grow: 1;
					padding: 2px 5px;
					transform-origin: right center;
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
					:deep(.label) {
						width: 80px;
						font-size: 15px;
						text-align: left;
						text-overflow: ellipsis;
						overflow: hidden;
					}
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

		.selectInfo {
			align-self: center;
			font-style: italic;
			opacity: 0.5;
			padding-right: 5px;
			flex-grow: 1;
			text-align: right;
		}

		.whispers {
			flex-grow: 1;
			padding-right: 5px;
			display: flex;
			font-size: 16px;
			flex-direction: column;
			justify-content: flex-start;

			.messages {
				max-height: 300px;
				overflow-y: auto;

				.message {
					display: flex;
					flex-direction: row;
					align-items: center;
					padding: 0px 5px 2px 5px;
					margin: .5em 0;
					
					&:nth-child(even) {
						background-color: rgba(255, 255, 25, .1);
					}

					&.isMe {
						background-color: @mainColor_light;
						color: @mainColor_normal;
						.time {
							color: fade(@mainColor_normal, 75%);
						}
					}
		
					:deep( .emote ) {
						max-height: 2em;
						vertical-align: middle;
						object-fit: contain;
					}
		
					.time {
						color: fade(#ffffff, 75%);
						font-size: 13px;
						margin-right: 5px;
						margin-top: 3px;
						min-width: 36px;
						font-variant-numeric: tabular-nums;
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
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
				}
				.submit {
					padding: 2px;
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