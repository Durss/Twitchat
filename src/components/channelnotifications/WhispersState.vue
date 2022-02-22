<template>
	<div :class="classes">
		
		<div class="whispers" v-if="selectedUser">
			<div class="messages">
				<div v-for="m in $store.state.whispers[selectedUser]" :key="m.raw" :class="messageClasses(m)">
					<span class="time" v-if="$store.state.params.appearance.displayTime.value">{{getTime(m)}}</span>
					<div v-html="parseMessage(m)"></div>
				</div>
			</div>

			<form @submit.prevent="sendWhisper()">
				<input type="text" placeholder="answer..." class="dark" v-model="whisper">
				<Button class="submit" type="submit" :icon="require('@/assets/icons/checkmark_white.svg')" :disabled="!this.whisper" />
			</form>
		</div>

		<div v-if="!selectedUser" class="selectInfo">select a user ➡</div>

		<div class="users">
			<div class="user"
			v-for="(u, uid) in $store.state.whispers"
			:key="uid">
				<Button class="login"
					@click="selectUser(uid)"
					:title="'('+u.length+') '+u[0].tags['display-name']"
					bounce />
					
				<Button :icon="require('@/assets/icons/cross_white.svg')"
					class="deleteBt"
					bounce highlight small
					@click="deleteWhispers(uid)" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import IRCClient from '@/utils/IRCClient';
import { IRCEventDataList } from '@/utils/IRCEvent';
import TwitchUtils from '@/utils/TwitchUtils';
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

	public whisper:string | null = null;
	public selectedUser:string | null = null;

	public get classes():string[] {
		let res = ["whispersstate"];
		res.push("size_"+store.state.params.appearance.defaultSize.value);
		return res;
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
				let tt = "<img src='"+url+"' height='112' width='112'><br><center>"+v.label+"</center>";
				result += "<img src='"+v.value+"' data-tooltip=\""+tt+"\" class='emote'>";
			}
		}
		return result;
	}

	public sendWhisper():void {
		if(!this.whisper) return;

		const whispers = store.state.whispers as {[key:string]:IRCEventDataList.Whisper[]};
		const src = whispers[this.selectedUser as string][0];
		
		IRCClient.instance.whisper(src, this.whisper);

		this.whisper = "";
	}

	public deleteWhispers(user:string):void {
		console.log(">>", user);
		store.dispatch("closeWhispers", user);
		this.selectedUser = null;
	}

}
</script>

<style scoped lang="less">
.whispersstate{
	display: flex;
	flex-direction: row !important;
	color: #fff;

	&.size_1 {
		.messages{
			font-size: 11px;
			.message{ margin-bottom: 2px; }
		}
	}
	&.size_2 {
		.messages{
			font-size: 13px;
			.message{ margin-bottom: 2px; }
		}
	}
	&.size_3 {
		.messages{
			font-size: 18px;
			.message{ margin-bottom: 5px; }
		}
	}
	&.size_4 {
		.messages{
			font-size: 24px;
			.message{ margin-bottom: 5px; }
		}
	}
	&.size_5 {
		.messages{
			font-size: 30px;
			.message{ margin-bottom: 10px; }
		}
	}
	
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
				margin-bottom: 5px;
				display: flex;
				flex-direction: row;
				align-items: center;
				padding: 0px 5px 2px 5px;
				
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
					width: 28px;
					height: 28px;
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