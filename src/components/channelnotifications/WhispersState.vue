<template>
	<div :class="classes">
		
		<div class="whispers" v-if="selectedUser">
			<div class="messages">
				<div v-for="m in $store.state.whispers[selectedUser]" :key="m.raw" :class="messageClasses(m)">
					<span class="time" v-if="$store.state.params.appearance.displayTime.value">{{getTime(m)}}</span>
					<div v-html="parseMessage(m)"></div>
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
			v-for="(u, uid) in $store.state.whispers"
			:key="uid">
				<Button class="login"
					@click="selectUser(uid.toString())"
					:title="'('+u.length+') '+u[0].tags['display-name']"
					bounce
					:data-tooltip="u[0].tags['display-name']" />
					
				<Button :icon="$image('icons/cross_white.svg')"
					class="deleteBt"
					bounce highlight small
					@click="deleteWhispers(uid.toString())" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import IRCClient from '@/utils/IRCClient';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import StoreProxy from '@/utils/StoreProxy';
import TwitchUtils from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
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
	public selectedUser:string | null = null;

	public get classes():string[] {
		let res = ["whispersstate"];
		return res;
	}

	public mounted():void {
		StoreProxy.store.state.whispersUnreadCount = 0;
		watch(() => StoreProxy.store.state.whispers, () => {
			StoreProxy.store.state.whispersUnreadCount = 0;
		}, {deep:true})
	}

	public messageClasses(whisper:IRCEventDataList.Whisper):string[] {
		let classes:string[] = ["message"];
		if(whisper.isAnswer) classes.push("isMe");
		return classes;
	}

	public getTime(whisper:IRCEventDataList.Whisper):string {
		const d = new Date(whisper.timestamp);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public selectUser(user:string):void {
		this.selectedUser = user;
	}

	public parseMessage(whisper:IRCEventDataList.Whisper):string {
		const message = whisper.params[1];
		const chunks = TwitchUtils.parseEmotes(message, whisper.tags['emotes-raw']);
		let result = "";
		for (let i = 0; i < chunks.length; i++) {
			const v = chunks[i];
			if(v.type == "text") {
				v.value = v.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");//Avoid XSS attack
				result += Utils.parseURLs(v.value);
			}else if(v.type == "emote") {
				let url = v.value.replace(/1.0$/gi, "3.0");//Twitch format
				url = url.replace(/1x$/gi, "3x");//BTTV format
				url = url.replace(/2x$/gi, "3x");//7TV format
				url = url.replace(/1$/gi, "4");//FFZ format
				let tt = "<img src='"+url+"' height='112' width='112'><br><center>"+v.label+"</center>";
				result += "<img src='"+v.value+"' data-tooltip=\""+tt+"\" class='emote'>";
			}
		}
		return result;
	}

	public async sendWhisper():Promise<void> {
		if(!this.whisper) return;

		this.error = false;
		const whispers = StoreProxy.store.state.whispers as {[key:string]:IRCEventDataList.Whisper[]};
		const src = whispers[this.selectedUser as string][0];
		
		try {
			await IRCClient.instance.whisper(src, this.whisper);
		}catch(error) {
			this.error = true;
		}

		this.whisper = "";
	}

	public deleteWhispers(user:string):void {
		StoreProxy.store.dispatch("closeWhispers", user);
		this.selectedUser = null;
	}

}
</script>

<style scoped lang="less">
.whispersstate{
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
			align-items: center;
			margin-bottom: 1px;
			width: 130px;
			max-width: 130px;
			.login {
				color: #fff;
				flex-grow: 1;
				padding: 2px 5px;
				:deep(.label) {
					width: 80px;
					font-size: 15px;
					text-align: left;
					text-overflow: ellipsis;
					overflow: hidden;
				}
			}

			.deleteBt {
				margin: auto;
				padding: 2px;
				height: 21px;
				width: 21px;
				min-height: 21px;
				min-width: 21px;
				flex-grow: 0;
				:deep(.icon) {
					height: 14px;
					min-height: 14px;
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
				font-size: var(--messageSize);
				
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
</style>