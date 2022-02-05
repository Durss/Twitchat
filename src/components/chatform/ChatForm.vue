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
					maxlength="500"
					@keydown.tab.prevent="onTab()">
				<span @click="error=false" v-if="error" class="error">Woops... something went wrong when sending the message :(</span>
				<Button type="submit" :icon="require('@/assets/icons/checkmark_white.svg')" bounce :disabled="!message" />
				<Button :icon="require('@/assets/icons/emote.svg')" @click="showEmotes = true;" bounce />
				<Button
					:icon="require('@/assets/icons/'+($store.state.cypherEnabled?'un':'')+'lock.svg')"
					@click="toggleCypher()"
					v-if="cypherConfigured"
					bounce
					data-tooltip="Send encrypted<br>messages" />
			</form>

			<AutocompleteForm class="emotesLive"
				:search="autoCompleteSearch"
				v-if="autoCompleteSearch.length > 1"
				@close="autoCompleteSearch = ''"
				@select="onSelectEmote" />

			<CommandHelper class="actions"
				v-if="showCommands"
				@poll="$emit('poll')"
				@pred="$emit('pred')"
				@clear="$emit('clear')"
				@raffle="$emit('raffle')"
				@close="showCommands = false" />

			<EmoteSelector class="emotes"
				v-if="showEmotes"
				@select="onSelectEmote"
				@close="showEmotes = false" />
			
		</div>

		<ChannelNotifications class="notifications" />
	</div>
</template>

<script lang="ts">
import store from '@/store';
import IRCClient from '@/utils/IRCClient';
import TwitchCypherPlugin from '@/utils/TwitchCypherPlugin';
import { TwitchTypes } from '@/utils/TwitchUtils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChannelNotifications from '../channelnotifications/ChannelNotifications.vue';
import ParamItem from '../params/ParamItem.vue';
import CommandHelper from './CommandHelper.vue';
import EmoteSelector from './EmoteSelector.vue';
import AutocompleteForm from './AutocompleteForm.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		CommandHelper,
		EmoteSelector,
		AutocompleteForm,
		ChannelNotifications,
	},
	emits: ["poll","pred","clear","raffle"]
})
export default class ChatForm extends Vue {

	public message:string = "";
	public autoCompleteSearch:string = "";
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
		watch(():string => this.message, (newVal:string):void => {
			const input = this.$refs.input as HTMLInputElement;
			let carretPos = input.selectionStart as number | 0;
			for (let i = carretPos-1; i >= 0; i--) {
				const currentChar = newVal.charAt(i);
				const offset = currentChar == ":"? 1 : 0;
				if(currentChar == ":" || ((/\s/gi.test(currentChar) || i == 0) && this.autoCompleteSearch)) {
					this.autoCompleteSearch = newVal.substring(i+offset, carretPos);
					break;
				}
				if(/\s/gi.test(currentChar)) {
					this.autoCompleteSearch = "";
					break;
				}
			}
		});
	}

	public beforeunmout():void {
	}
	
	public openParams():void {
		store.dispatch("showParams", true);
	}
	
	public async sendMessage():Promise<void> {
		if(this.message.length == 0) return;
		if(this.autoCompleteSearch.length > 1) return;

		const params = this.message.split(" ");
		const cmd = params.shift()?.toLowerCase();
		if(cmd == "/poll") {
			//Open poll form
			this.$emit("poll");
			this.message = "";
		}else

		if(cmd == "/prediction") {
			//Open prediction form
			this.$emit("pred");
			this.message = "";
		}else

		if(cmd == "/cypherkey") {
			//Secret feature
			TwitchCypherPlugin.instance.cypherKey = params[0];
			IRCClient.instance.sendNotice("cypher", "Cypher key successfully configured !");
			this.message = "";
		}else

		if(cmd == "/cypherreset") {
			//Secret feature
			store.dispatch("setCypherEnabled", false);
			TwitchCypherPlugin.instance.cypherKey = "";
			IRCClient.instance.sendNotice("cypher", "Cypher key removed successfully.");
			this.message = "";

		}else{
			//Send message
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

	/**
	 * Toggle secret cypher keyboard
	 */
	public toggleCypher():void {
		store.dispatch("setCypherEnabled", !store.state.cypherEnabled);
	}

	/**
	 * Called when selecting an emote from one the emote selectors
	 */
	public async onSelectEmote(item:string):Promise<void> {
		const input = this.$refs.input as HTMLInputElement;
		let carretPos = input.selectionStart;
		let localMessage = this.message;
		if(!carretPos) carretPos = 1;
		carretPos --;

		if(this.autoCompleteSearch) {
			for (let i = carretPos; i >= 0; i--) {
				const currentChar = localMessage.charAt(i);
				if(currentChar == ":" || /\s/gi.test(currentChar) || i == 0) {
					const offset = currentChar == ":"? 1 : 0;
					const prefix = localMessage.substring(0, i-offset);
					const suffix = localMessage.substring(i+1+this.autoCompleteSearch.length);
					localMessage = prefix + " " + item + suffix;
					carretPos = prefix.length + item.length + 1;
					break;
				}
			}
			this.autoCompleteSearch = "";
		}else{
			const prefix = /\s/gi.test(localMessage.charAt(carretPos-1))? "" : " ";
			const suffix = /\s/gi.test(localMessage.charAt(carretPos-1+item.length))? "" : " ";
			const code = prefix + item + suffix;
			localMessage = localMessage.substring(0, carretPos) + code + localMessage.substring(carretPos);
			carretPos += code.length;
		}
		

		this.message = localMessage;

		await this.$nextTick();
		
		input.setSelectionRange(carretPos, carretPos, "forward");
	}

	/**
	 * Called when pressing tab key on input field
	 */
	public onTab():void {
		const input = this.$refs.input as HTMLInputElement;
		let carretPos = input.selectionStart as number;
		let i = carretPos - 1;
		for (; i > -1; i--) {
			const c = this.message.charAt(i);
			if(/\s/gi.test(c)) break;
		}
		const len = carretPos - i;
		if(len > 2) {
			this.autoCompleteSearch = this.message.substring(i+1, carretPos);
		}
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
			display: flex;
			flex-direction: row;
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
				width: 100%;
				flex-grow: 1;
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
				background: transparent;
				border: none;
				border-radius: 0;
			}
			.button {
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

	.actions, .notifications, .emotes, .emotesLive {
		position: absolute;
		top: 0;
		left: 0;
		transform: translateY(-100%);
		z-index: 1;
	}

}
</style>