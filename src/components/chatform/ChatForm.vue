<template>
	<div class="chatform">
		<div class="leftForm">
			<Button :icon="require('@/assets/icons/params.svg')" small bounce @click="openParams()" />
			<Button :icon="require('@/assets/icons/commands.svg')" small bounce @click="openCommands()" />
		</div>

		<form @submit.prevent="sendMessage()" class="inputForm">
			<input type="text" class="dark" v-model="message" v-if="!error">
			<span @click="error=false" v-if="error" class="error">Woops... something went wrong when sending the message :(</span>
			<Button class="submit" :icon="require('@/assets/icons/checkmark_white.svg')" bounce />
		</form>

		<div class="actions" v-if="showCommands">
			<Button @click="$emit('poll')" :icon="require('@/assets/icons/poll.svg')" title="Create poll" small bounce />
			<Button @click="$emit('pred')" :icon="require('@/assets/icons/prediction.svg')" title="Create prediction" small bounce />
			<Button @click="$emit('clear')" :icon="require('@/assets/icons/clearChat.svg')" title="Clear chat" small bounce />
			<Button @click="$emit('raid')" :icon="require('@/assets/icons/raid.svg')" title="Raid" small bounce />

			<div class="row" v-for="(p,key) in params" :key="key">
				<ParamItem :paramData="p" @change="onChangeParam(key, p)" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import store, { ParameterData } from '@/store';
import IRCClient from '@/utils/IRCClient';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
	},
	emits: ["poll","pred","clear","raid"]
})
export default class ChatForm extends Vue {

	public message:string = "";
	public error:boolean = false;
	public showCommands:boolean = false;

	public get params():{[key:string]:ParameterData} {
		return store.state.params.roomStatus;
	}
	
	public openParams():void {
		store.dispatch("showParams", true);
	}
	
	public openCommands():void {
		this.showCommands = !this.showCommands;
	}

	public async sendMessage():Promise<void> {
		try {
			await IRCClient.instance.sendMessage(this.message);
			this.message = "";
		}catch(error) {
			console.log(error);
			this.error = true;
		}
	}

	public onChangeParam(key:string, p:ParameterData):void {
		let channel = IRCClient.instance.channel;
		switch(key) {
			case "emotesOnly": {
				if(p.value) IRCClient.instance.client.emoteonly(channel);
				else  IRCClient.instance.client.emoteonlyoff(channel)
				break;
			}
			case "followersOnly": {
				if(p.value) IRCClient.instance.client.followersonly(channel);
				else  IRCClient.instance.client.followersonlyoff(channel)
				break;
			}
			case "subsOnly": {
				if(p.value) IRCClient.instance.client.subscribers(channel);
				else  IRCClient.instance.client.subscribersoff(channel)
				break;
			}
			case "slowMode": {
				if(p.value) IRCClient.instance.client.slow(channel, 10);
				else  IRCClient.instance.client.slowoff(channel)
				break;
			}
		}
	}
}
</script>

<style scoped lang="less">
.chatform{
	display: flex;
	flex-direction: row;
	height: 30px;
	margin: auto;
	position: relative;

	.leftForm {
		height: 100%;
		.button {
			width: 30px;
			height: 30px;
			border-radius: 5px;
			transform-origin: bottom;
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
		}
		.submit {
			height: 100%;
			padding: 5px;
			border-radius: 5px;
			border-top-left-radius: 0;
			border-bottom-left-radius: 0;
			transform-origin: left;
		}
		.error {
			cursor: pointer;
			text-align: center;
			flex-grow: 1;
			font-size: 18px;
			color: #ff0000;
		}
	}

	.actions {
		position: absolute;
		left: 30px;
		bottom: 40px;
		padding: 10px;
		background-color: @mainColor_dark;
		box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);
		border-radius: 5px;
		width: 250px;
		display: flex;
		flex-direction: column;
		&>*:not(:last-child) {
			margin-bottom: 5px;
		}
		.button {
			:deep(img) {
				max-width: 20px;
			}
		}
	}
}
</style>