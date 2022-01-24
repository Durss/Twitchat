<template>
	<div :class="classes">
		<div class="holder">
			<div class="leftForm">
				<Button :icon="require('@/assets/icons/params.svg')" bounce @click="openParams()" />
				<Button :icon="require('@/assets/icons/commands.svg')" bounce @click="showCommands = true" />
			</div>

			<form @submit.prevent="sendMessage()" class="inputForm">
				<input type="text"
					class="dark"
					v-model="message"
					v-if="!error"
					ref="input"
					placeholder="message..."
					maxlength="500">
				<span @click="error=false" v-if="error" class="error">Woops... something went wrong when sending the message :(</span>
				<Button type="submit" class="submit" :icon="require('@/assets/icons/checkmark_white.svg')" bounce />
				<Button class="submit" :icon="require('@/assets/icons/emote.svg')" @click="showEmotes = true;" bounce />
				<Button class="submit"
					:icon="require('@/assets/icons/'+($store.state.cypherEnabled?'un':'')+'lock.svg')"
					@click="toggleCypher()"
					v-if="cypherConfigured"
					bounce
					data-tooltip="Send encrypted<br>messages" />
			</form>

			<CommandHelper class="actions"
				v-if="showCommands"
				@poll="$emit('poll')"
				@pred="$emit('pred')"
				@clear="$emit('clear')"
				@close="showCommands = false" />

			<EmoteSelector class="emotes"
				v-if="showEmotes"
				@select="onSelectEmote"
				@close="showEmotes = false" />
			
		</div>

		<ChannelNotifications class="notifications" @goToLastRead="$emit('goToLastRead')" />
	</div>
</template>

<script lang="ts">
import store from '@/store';
import IRCClient from '@/utils/IRCClient';
import TwitchCypherPlugin from '@/utils/TwitchCypherPlugin';
import { TwitchTypes } from '@/utils/TwitchUtils';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChannelNotifications from '../channelnotifications/ChannelNotifications.vue';
import ParamItem from '../params/ParamItem.vue';
import CommandHelper from './CommandHelper.vue';
import EmoteSelector from './EmoteSelector.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		CommandHelper,
		EmoteSelector,
		ChannelNotifications,
	},
	emits: ["poll","pred","clear","goToLastRead"]
})
export default class ChatForm extends Vue {

	public message:string = "";
	public error:boolean = false;
	public showEmotes:boolean = false;
	public showCommands:boolean = false;

	public get classes():string[] {
		let res = ["chatform"];
		if(store.state.cypherEnabled) res.push("cypherMode");
		return res;
	}

	public get cypherConfigured():boolean { return store.state.cypherKey?.length > 0; }

	public mounted():void {
	}

	public beforeunmout():void {
	}
	
	public openParams():void {
		store.dispatch("showParams", true);
	}
	
	public async sendMessage():Promise<void> {
		if(this.message.length == 0) return;

		const params = this.message.split(" ");
		const cmd = params.shift()?.toLowerCase();
		if(cmd == "/poll") {
			this.$emit("poll");
			this.message = "";
		}else
		if(cmd == "/prediction") {
			this.$emit("pred");
			this.message = "";
		}else
		if(cmd == "/cypherkey") {
			TwitchCypherPlugin.instance.cypherKey = params[0];
			IRCClient.instance.sendNotice("cypher", "Cypher key successfully configured !");
			this.message = "";
		}else if(cmd == "/cypherreset") {
			store.dispatch("setCypherEnabled", false);
			TwitchCypherPlugin.instance.cypherKey = "";
			IRCClient.instance.sendNotice("cypher", "Cypher key removed successfully.");
			this.message = "";
		}else{
			try {
				if(store.state.cypherEnabled) {
					this.message = await TwitchCypherPlugin.instance.encrypt(this.message);
				}
				await IRCClient.instance.sendMessage(this.message);
				this.message = "";
			}catch(error) {
				console.log(error);
				this.error = true;
			}
		}
	}

	public toggleCypher():void {
		store.dispatch("setCypherEnabled", !store.state.cypherEnabled);
	}

	public onSelectEmote(emote:TwitchTypes.Emote):void {
		const input = this.$refs.input as HTMLInputElement;
		let carretPos = input.selectionStart;
		if(!carretPos) carretPos = 0;
		console.log(this.message.charAt(carretPos-1));
		const prefix = /\s/gi.test(this.message.charAt(carretPos-1))? "" : " ";
		const suffix = /\s/gi.test(this.message.charAt(carretPos-1+emote.name.length))? "" : " ";
		const code = prefix + emote.name + suffix;
		this.message = this.message.substring(0, carretPos) + code + this.message.substring(carretPos);
		carretPos += code.length;
		console.log(carretPos);
		input.setSelectionRange(carretPos, carretPos, "forward");
	}

}
</script>

<style scoped lang="less">
.chatform{
	@height: 40px;
	display: flex;
	flex-direction: row;
	height: @height;
	margin: auto;
	position: relative;

	&.cypherMode {
		.holder {
			background-image: repeating-linear-gradient(-45deg, #00000020, #00000020 20px, #ffffff10 20px, #ffffff10 40px);
		}
	}

	.holder {
		position: absolute;
		width: 100%;
		display: flex;
		flex-direction: row;
		height: @height;
		margin: auto;
		position: relative;
		z-index: 2;
		box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);
		background-color: @mainColor_dark_extralight;
		padding: 5px;
		border-radius: 5px;

		.leftForm {
			height: 100%;
			.button {
				width: 30px;
				height: 30px;
				border-radius: 5px;
				background: none;
			}
		}
	
		.inputForm {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			flex-grow: 1;
			input {
				height: 100%;
				flex-grow: 1;
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
				background: transparent;
				border: none;
				border-radius: 0;
			}
			.submit {
				height: 100%;
				padding: 5px;
				border-radius: 5px;
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
				background: none;
			}
			.error {
				cursor: pointer;
				text-align: center;
				flex-grow: 1;
				font-size: 18px;
				color: #ff0000;
			}
		}
	}

	.actions, .notifications, .emotes {
		position: absolute;
		top: 0;
		left: 0;
		transform: translateY(-100%);
		z-index: 1;
	}

}
</style>