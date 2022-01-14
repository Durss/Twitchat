<template>
	<div class="chatform">
		<div class="leftForm">
			<Button class="params" :icon="require('@/assets/icons/params.svg')" small bounce @click="openParams()" />
		</div>

		<form @submit.prevent="sendMessage()" class="inputForm">
			<input type="text" class="dark" v-model="message" v-if="!error">
			<span @click="error=false" v-if="error" class="error">Woops... something went wrong when sending the message :(</span>
			<Button class="submit" :icon="require('@/assets/icons/checkmark_white.svg')" bounce />
		</form>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import IRCClient from '@/utils/IRCClient';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{},
	components:{
		Button,
	}
})
export default class ChatForm extends Vue {

	public message:string = "";
	public error:boolean = false;
	
	public openParams():void {
		store.dispatch("showParams", true);
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
}
</script>

<style scoped lang="less">
.chatform{
	display: flex;
	flex-direction: row;
	height: 30px;
	margin: auto;

	.leftForm {
		height: 100%;
		.params {
			width: 30px;
			height: 30px;
			border-radius: 5px;
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
</style>