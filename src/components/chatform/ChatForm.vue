<template>
	<div :class="classes">
		<div class="holder">
			<div class="leftForm">
				<Button :icon="require('@/assets/icons/params.svg')" bounce @click="toggleParams()" />
				<Button :icon="require('@/assets/icons/commands.svg')" bounce @click="$emit('update:showCommands', true)" />
				<Button :icon="require('@/assets/icons/user.svg')" bounce @click="$emit('update:showChatUsers', true)" />
				<Button :icon="require('@/assets/icons/notification.svg')" bounce @click="$emit('update:showFeed', true)" v-if="showFeedBt" />
				<!-- <Button :icon="require('@/assets/icons/channelPoints.svg')" bounce @click="$emit('update:showRewards', true)" /> -->
			</div>

			<form @submit.prevent="" class="inputForm">
				<input type="text"
					class="dark"
					v-model="message"
					v-if="!error"
					ref="input"
					placeholder="message..."
					maxlength="500"
					@keydown.tab.prevent="onTab()"
					@keyup.enter="sendMessage()">
				
				<span @click="error=false" v-if="error" class="error">Woops... something went wrong when sending the message :(</span>
				
				<Button @click="sendMessage()" type="button" :icon="require('@/assets/icons/checkmark_white.svg')" bounce :disabled="!message" :loading="sendingMessage" />
				
				<Button :icon="require('@/assets/icons/emote.svg')"
					bounce 
					@click="$emit('update:showEmotes',true);" />

				<transition name="blink">
				<Button :icon="require('@/assets/icons/poll.svg')"
					bounce
					@click="$emit('setCurrentNotification', 'poll')"
					v-if="$store.state.currentPoll?.id" />
				</transition>

				<transition name="blink">
				<Button :icon="require('@/assets/icons/chatPoll.svg')"
					bounce
					@click="$emit('setCurrentNotification', 'chatpoll')"
					v-if="$store.state.chatPoll != null" />
				</transition>

				<transition name="blink">
				<Button :icon="require('@/assets/icons/prediction.svg')"
					bounce
					@click="$emit('setCurrentNotification', 'prediction')"
					v-if="$store.state.currentPrediction?.id" />
				</transition>

				<transition name="blink">
				<Button :icon="require('@/assets/icons/magnet.svg')"
					bounce
					v-if="$store.state.trackedUsers.length > 0"
					data-tooltip="View tracked users"
					@click="$emit('setCurrentNotification', 'trackedUsers')" />
				</transition>

				<transition name="blink">
				<Button :icon="require('@/assets/icons/ticket.svg')"
					bounce
					v-if="$store.state.raffle.command != null"
					data-tooltip="Raffle"
					@click="$emit('setCurrentNotification', 'raffle')" />
				</transition>

				<transition name="blink">
				<Button :icon="require('@/assets/icons/bingo.svg')"
					bounce
					v-if="$store.state.bingo.guessNumber != null"
					data-tooltip="Bingo"
					@click="$emit('setCurrentNotification', 'bingo')" />
				</transition>

				<transition name="blink">
				<div class="whispers" v-if="whispersAvailable">
					<Button :icon="require('@/assets/icons/whispers.svg')"
						bounce
						small
						data-tooltip="Whispers"
						@click="$emit('setCurrentNotification', 'whispers')" />
					<div class="count" v-if="$store.state.whispersUnreadCount > 0">{{$store.state.whispersUnreadCount}}</div>
				</div>
				</transition>

				<transition name="blink">
				<Button :icon="require('@/assets/icons/debug.svg')"
					bounce
					@click="$emit('update:showDevMenu',true);"
					v-if="$store.state.devmode" />
				</transition>

				<transition name="blink">
				<Button
					:icon="require('@/assets/icons/'+($store.state.cypherEnabled?'':'un')+'lock.svg')"
					@click="toggleCypher()"
					v-if="cypherConfigured"
					bounce
					data-tooltip="Send encrypted<br>messages" />
				</transition>

				<div v-if="$store.state.params.appearance.showViewersCount.value === true
					&& $store.state.playbackState && $store.state.playbackState.viewers > 0"
					class="viewCount"
					data-tooltip="Viewer count"
					@click="censoredViewCount = !censoredViewCount"
				>
					<p v-if="censoredViewCount">x</p>
					<p v-if="!censoredViewCount">{{$store.state.playbackState.viewers}}</p>
					<img src="@/assets/icons/user.svg" alt="viewers">
				</div>

				<CommunityBoostInfo v-if="$store.state.communityBoostState" />

				<CommercialTimer v-if="isCommercial" />

			</form>

			<AutocompleteForm class="contentWindows emotesLive"
				:search="autoCompleteSearch"
				v-if="autoCompleteSearch.length > 1 || (autoCompleteCommands && autoCompleteSearch.length > 0)"
				:emotes="autoCompleteEmotes"
				:users="autoCompleteUsers"
				:commands="autoCompleteCommands"
				@close="autoCompleteSearch = ''"
				@select="onSelectItem" />
			
		</div>
	</div>
</template>

<script lang="ts">
import store, { BingoConfig } from '@/store';
import IRCClient from '@/utils/IRCClient';
import { IRCEventDataList } from '@/utils/IRCEvent';
import TwitchCypherPlugin from '@/utils/TwitchCypherPlugin';
import TwitchUtils from '@/utils/TwitchUtils';
import { watch } from '@vue/runtime-core';
import { LoremIpsum } from "lorem-ipsum";
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import AutocompleteForm from './AutocompleteForm.vue';
import CommercialTimer from './CommercialTimer.vue';
import CommunityBoostInfo from './CommunityBoostInfo.vue';

@Options({
	props:{
		showFeed:Boolean,
		showEmotes:Boolean,
		showCommands:Boolean,
		showRewards:Boolean,
	},
	components:{
		Button,
		ParamItem,
		CommercialTimer,
		AutocompleteForm,
		CommunityBoostInfo,
	},
	emits: [
		"ad",
		"poll",
		"pred",
		"clear",
		"raffle",
		"search",
		"bingo",
		"showUpdates",
		"chatpoll",
		"liveStreams",
		"update:showFeed",
		"update:showEmotes",
		"update:showCommands",
		"update:showChatUsers",
		"update:showRewards",
		"update:showDevMenu",
		"setCurrentNotification"
	],
})
export default class ChatForm extends Vue {

	public showFeed!:boolean;
	public showEmotes!:boolean;
	public showCommands!:boolean;
	public showRewards!:boolean;

	public message:string = "";
	public error:boolean = false;
	public sendingMessage:boolean = false;
	public censoredViewCount:boolean = false;
	public autoCompleteSearch:string = "";
	public autoCompleteEmotes:boolean = false;
	public autoCompleteUsers:boolean = false;
	public autoCompleteCommands:boolean = false;
	public spamInterval:number = 0;

	public get whispersAvailable():boolean {
		const whispers:{[key:string]:IRCEventDataList.Whisper[]} = store.state.whispers;
		for (const key in store.state.whispers) {
			if (whispers[key].length > 0) return true;
		}
		return false;
	}

	public get classes():string[] {
		let res = ["chatform"];
		if(store.state.cypherEnabled) res.push("cypherMode");
		return res;
	}

	public get cypherConfigured():boolean { return store.state.cypherKey?.length > 0; }

	public get isCommercial():boolean { return store.state.commercialEnd != 0; }
	
	public get showFeedBt():boolean {
		return store.state.activityFeed?.length > 0
		&& (!store.state.canSplitView || !store.state.params.appearance.splitView.value);
	}

	public async mounted():Promise<void> {
		watch(():string => this.message, (newVal:string):void => {
			const input = this.$refs.input as HTMLInputElement;
			let carretPos = input.selectionStart as number | 0;
			
			for (let i = carretPos; i >= 0; i--) {
				const currentChar = newVal.charAt(i);
				const offset = currentChar == ":" || currentChar == "@"? 1 : 0;
				if(/\s/gi.test(currentChar)) {
					this.autoCompleteSearch = "";
					break;
				}

				if(currentChar == ":" || 
				currentChar == "@" || 
				(currentChar == "/" && carretPos == 1) || 
				(i == 0 && this.autoCompleteSearch)) {
					this.autoCompleteUsers = currentChar == "@";
					this.autoCompleteEmotes = currentChar == ":";
					this.autoCompleteCommands = currentChar == "/";
					this.autoCompleteSearch = newVal.substring(i+offset, carretPos);
					break;
				}
			}
		});

		try {
			await TwitchUtils.loadRewards();
		}catch(e) {
			//User is probably not an affiliate
		}
	}

	public beforeUnmount():void {
		clearInterval(this.spamInterval);
	}
	
	public toggleParams():void {
		store.dispatch("showParams", !store.state.showParams);
	}
	
	public async sendMessage():Promise<void> {
		if(this.message.length == 0) return;
		if(this.autoCompleteSearch.length > 0) return;

		const params = this.message.split(" ");
		const cmd = params.shift()?.toLowerCase();
		if(cmd == "/devmode") {
			this.message = "";
			store.dispatch("toggleDevMode");
		}else

		if(cmd == "/chatpoll") {
			//Open chat poll form
			this.$emit("chatpoll");
			this.message = "";
		}else

		if(cmd == "/poll") {
			//Open poll form
			store.state.tempStoreValue = params.join(" ");
			this.$emit("poll");
			this.message = "";
		}else

		if(cmd == "/prediction") {
			//Open prediction form
			store.state.tempStoreValue = params.join(" ");
			this.$emit("pred");
			this.message = "";
		}else

		if(cmd == "/raffle") {
			//Open raffle form
			this.$emit("raffle");
			this.message = "";
		}else

		if(cmd == "/bingo") {
			//Open bingo form
			if(params[0] == "number" || params[0] == "emote") {
				const payload:BingoConfig = {
					guessNumber: params[0] == "number",
					guessEmote: params[0] == "emote",
					min: 0,
					max: 100,
				};
				store.dispatch("startBingo", payload);
			}else{
				this.$emit("bingo");
			}
			this.message = "";
		}else

		if(cmd == "/search") {
			//Search a for messages
			const search = params.join(" ");
			// this.$emit("search", search);
			store.dispatch("searchMessages", search);
			this.message = "";
		}else

		if(cmd == "/so") {
			this.sendingMessage = true;
			this.message = "...";
			//Make a shoutout
			await TwitchUtils.shoutout(params[0]);
			this.sendingMessage = false;
			this.message = "";
		}else

		if(cmd == "/raid" && (!params[0] || params[0] == "user")) {
			this.$emit("liveStreams");
			this.message = "";
		}else

		if(cmd == "/cypherkey") {
			//Secret feature
			TwitchCypherPlugin.instance.cypherKey = params[0];
			IRCClient.instance.sendNotice("cypher", "Cypher key successfully configured !");
			this.message = "";
		}else

		if(cmd == "/spam" && store.state.devmode) {
			clearInterval(this.spamInterval);
			const lorem = new LoremIpsum({
				sentencesPerParagraph: {
					max: 8,
					min: 4
				},
				wordsPerSentence: {
					max: 16,
					min: 4
				}
			});
			this.spamInterval = setInterval(()=> {
				const tags = IRCClient.instance.getFakeTags();
				tags.username = store.state.user.login;
				tags["display-name"] = store.state.user.login;
				tags["user-id"] = store.state.user.user_id;
				tags.id = IRCClient.instance.getFakeGuid();
				IRCClient.instance.addMessage(lorem.generateSentences(Math.round(Math.random()*3) + 1), tags, false)
			}, 250);
			this.message = "";

		}else

		if(cmd == "/unspam" && store.state.devmode) {
			clearInterval(this.spamInterval);
			this.message = "";
			
		}else

		if(cmd == "/commercial") {
			this.$emit("ad", params.length > 0? parseInt(params[0]) : 30);
			this.message = "";
			
		}else

		if(cmd == "/updates") {
			store.dispatch("sendTwitchatAd", 2);
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
	 * Called when selecting an emote/user/cmd from the emote selector
	 * or the auto complete selector
	 */
	public async onSelectItem(item:string):Promise<void> {
		const input = this.$refs.input as HTMLInputElement;
		let carretPos = input.selectionStart;
		let localMessage = this.message;
		if(!carretPos) carretPos = 1;
		carretPos --;

		if(this.autoCompleteSearch) {
			for (let i = carretPos; i >= 0; i--) {
				const currentChar = localMessage.charAt(i);
				if(currentChar == ":" || 
				currentChar == "@" ||
				/\s/gi.test(currentChar) || i == 0) {
					const offset = currentChar == ":" || currentChar == "@"? 1 : 0;
					let prefix = localMessage.substring(0, i-offset);
					const suffix = localMessage.substring(i+1+this.autoCompleteSearch.length)+" ";
					if(prefix) prefix += " ";
					localMessage = prefix + item + suffix;
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
		
		if(/\{.*?\}/gi.test(item)) {
			localMessage = localMessage.replace(/{(.*?)\}/gi, "$1");
		}
		this.message = localMessage;

		await this.$nextTick();
		
		//Pre select commands placeholder
		if(/\{.*?\}/gi.test(item)) {
			input.setSelectionRange(item.indexOf("{"), item.indexOf("}"), "forward");
		}else{
			input.setSelectionRange(carretPos, carretPos, "forward");
			input.focus();
		}

		//Force autocomplete close.
		//Due to async rendering the watcher might detect search update before
		//the selectionRange is effective wich may cause the autocomplete open
		//Here we ensure it stays closed
		this.autoCompleteSearch = "";
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
			this.autoCompleteUsers = true;
			this.autoCompleteEmotes = true;
			this.autoCompleteCommands = true;
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
	min-height: @height;
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
		min-height: @height;
		margin: auto;
		position: relative;
		z-index: 2;
		box-shadow: 0px -2px 2px 0px rgba(0,0,0,1);
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
			flex-wrap: wrap;
			input {
				min-width: 50px;
				//These 2 following lines seems stupide AF but they allow 
				//the input to autosize to it's min length
				width: 0%;
				flex-grow: 1;
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
				background: transparent;
				border: none;
				border-radius: 0;
			}
			.error {
				cursor: pointer;
				text-align: center;
				flex-grow: 1;
				font-size: 18px;
				color: #ff0000;
			}

			.whispers {
				position: relative;
				.count {
					position: absolute;
					top: 0;
					right: 0;
					transform: translate(20%, -50%);
					border-radius: 20px;
					font-size: 10px;
					padding: 2px 5px;
					font-weight: bold;
					color: @mainColor_dark;
					background-color: @mainColor_warn;
				}
			}

			.button {
				.clearButton() !important;
				border-radius: 50%;
				&:hover {
					background-color: fade(@mainColor_light, 20%) !important;
				}
			}

			.blink-enter-active {
				transition: all 1s;
			}

			.blink-leave-active {
				transition: all .25s;
			}
			
			.blink-enter-from {
				opacity: 1;
				background: #ffffff !important;
				transform: scale(1.5);
			}
			.blink-leave-to {
				opacity: 0;
			}

			.viewCount {
				display: flex;
				flex-direction: row;
				align-items: center;
				white-space: nowrap;
				color: @mainColor_light;
				margin-left: 5px;
				font-size: 14px;
				padding: 5px;
				border-radius: 5px;
				background-color: rgba(255,255,255,.25);
				img {
					height: .7em;
					margin-left: 2px;
				}
			}
		}
	}

	.contentWindows {
		position: absolute;
		top: 0;
		left: 0;
		transform: translateY(-100%);
		z-index: 1;
	}

}
</style>