<template>
	<div :class="classes">
		<div class="holder">
			<div class="leftForm">
				<Button :icon="require('@/assets/icons/params.svg')" bounce @click="openParams()" />
				<Button :icon="require('@/assets/icons/commands.svg')" bounce @click="toggleCommands()" />
			</div>

			<form @submit.prevent="sendMessage()" class="inputForm">
				<input type="text" class="dark" v-model="message" v-if="!error" placeholder="message...">
				<span @click="error=false" v-if="error" class="error">Woops... something went wrong when sending the message :(</span>
				<Button class="submit" :icon="require('@/assets/icons/checkmark_white.svg')" bounce />
				<Button class="submit" :icon="require('@/assets/icons/unlock.svg')" @click="toggleCypher()" v-if="cypherConfigured && !$store.state.cypherEnabled" bounce data-tooltip="Send encrypted messages" />
				<Button class="submit" :icon="require('@/assets/icons/lock.svg')" @click="toggleCypher()" v-if="cypherConfigured && $store.state.cypherEnabled" bounce />
			</form>

			<div class="actions" ref="commandsContent" v-if="showCommands">
				<Button @click="$emit('poll')" :icon="require('@/assets/icons/poll.svg')" title="Create poll" bounce :disabled="$store.state.currentPoll?.id != undefined" />
				<Button @click="$emit('pred')" :icon="require('@/assets/icons/prediction.svg')" title="Create prediction" bounce :disabled="$store.state.currentPrediction?.id != undefined" />
				<Button @click="$emit('clear')" :icon="require('@/assets/icons/clearChat.svg')" title="Clear chat" bounce />

				<div v-for="(p,key) in params" :key="key">
					<ParamItem :paramData="p" @change="onChangeParam(key, p)" />
				</div>
				<div class="raid">
					<label for="raid_input"><img src="@/assets/icons/raid.svg" alt="raid">Raid someone</label>
					<form @submit.prevent="raid()">
						<input class="dark" id="raid_input" type="text" placeholder="user name..." v-model="raidUser">
						<Button type="submit" :icon="require('@/assets/icons/checkmark_white.svg')" bounce small :disabled="raidUser.length < 3" />
					</form>
				</div>
			</div>
		</div>

		<ChannelNotifications class="notifications" />
	</div>
</template>

<script lang="ts">
import store, { ParameterData } from '@/store';
import IRCClient from '@/utils/IRCClient';
import TwitchCypherPlugin from '@/utils/TwitchCypherPlugin';
import Utils from '@/utils/Utils';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChannelNotifications from '../channelnotifications/ChannelNotifications.vue';
import ParamItem from '../params/ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ChannelNotifications,
	},
	emits: ["poll","pred","clear"]
})
export default class ChatForm extends Vue {

	public message:string = "";
	public raidUser:string = "";
	public error:boolean = false;
	public showCommands:boolean = false;

	private clickHandler!:(e:MouseEvent) => void;

	public get classes():string[] {
		let res = ["chatform"];
		if(store.state.cypherEnabled) res.push("cypherMode");
		return res;
	}

	public get params():{[key:string]:ParameterData} { return store.state.params.roomStatus; }

	public get cypherConfigured():boolean { return store.state.cypherKey?.length > 0; }

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
	}

	public beforeunmout():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	private onClick(e:MouseEvent):void {
		if(!this.showCommands) return;
		
		let target = e.target as HTMLDivElement;
		const ref = this.$refs.commandsContent as HTMLDivElement;
		while(target != document.body && target != ref) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.toggleCommands();
		}
	}
	
	public openParams():void {
		store.dispatch("showParams", true);
	}
	
	public async toggleCommands():Promise<void> {
		if(this.showCommands) {
			const ref = this.$refs.commandsContent as HTMLDivElement;
			gsap.killTweensOf(ref);
			gsap.to(ref, {duration:.3, scaleX:0, ease:"back.in"});
			gsap.to(ref, {duration:.2, scaleY:0, delay:.1, clearProps:"scaleY, scaleX", ease:"back.in", onComplete:() => {
				this.showCommands = false;
			}});
		} else {
			this.showCommands = true;
			await this.$nextTick();
			const ref = this.$refs.commandsContent as HTMLDivElement;
			gsap.killTweensOf(ref);
			gsap.from(ref, {duration:.2, scaleX:0, clearProps:"scaleX", ease:"back.out"});
			gsap.from(ref, {duration:.3, scaleY:0, clearProps:"scaleY", ease:"back.out"});
		}
	}

	public async sendMessage():Promise<void> {
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

	public async raid():Promise<void> {
		//This timeout avoids auto confirmation if submitting the form
		//with enter key
		await Utils.promisedTimeout(100);
		
		Utils.confirm("Raid ?", "Are you sure you want to raid " + this.raidUser + " ?").then(async () => {
			IRCClient.instance.sendMessage("/raid "+this.raidUser);
			this.raidUser = "";
		}).catch(()=> { });
	}

	public toggleCypher():void {
		store.dispatch("setCypherEnabled", !store.state.cypherEnabled);
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

	.actions, .notifications {
		position: absolute;
		top: 0;
		left: 0;
		transform: translateY(-100%);
		z-index: 1;

		&.actions  {
			left: 30px;
			padding: 10px;
			background-color: @mainColor_dark;
			box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);
			border-radius: 10px;
			width: 250px;
			display: flex;
			flex-direction: column;
			transform-origin: bottom left;
			&>*:not(:last-child) {
				margin-bottom: 5px;
			}
			.button {
				:deep(img) {
					max-width: 20px;
				}
			}
			.raid {
				display: flex;
				flex-direction: column;
				background-color: @mainColor_dark_light;
				padding: 10px;
				border-radius: 10px;
				label {
					color: @mainColor_light;
					img {
						height: 20px;
						margin-right: 10px;
					}
				}
				form {
					display: flex;
					flex-direction: row;
					input {
						width: 100%;
						border-top-right-radius: 0;
						border-bottom-right-radius: 0;
					}
					.button {
						flex-grow: 1;
						border-top-left-radius: 0;
						border-bottom-left-radius: 0;
						transform-origin: left;
					}
				}
			}
		}
	}

}
</style>