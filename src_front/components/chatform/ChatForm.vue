<template>
	<div :class="classes">
		<div class="holder">
			<div class="leftForm">
				<Button aria-label="Open parameters" :icon="$image('icons/params.svg')" bounce @click="toggleParams()" />
				<Button aria-label="Open chat commands" :icon="$image('icons/commands.svg')" bounce @click="$emit('update:showCommands', true)" />
				<Button aria-label="Open users list" :icon="$image('icons/user.svg')" bounce @click="$emit('update:showChatUsers', true)" @mouseover="updateOnlineUsersTooltip($event)" :data-tooltip="onlineUsersTooltip" />
				<!-- <Button :icon="$image('icons/channelPoints.svg')" bounce @click="$emit('update:showRewards', true)" /> -->
			</div>

			<form @submit.prevent="" class="inputForm">
				<img src="@/assets/loader/loader_white.svg" alt="loader" class="loader" v-if="loading">

				<input type="text"
					class="dark"
					v-model="message"
					v-if="!error && !spamming"
					ref="input"
					placeholder="message..."
					:maxlength="maxLength"
					@keyup.capture.tab="(e)=>onTab(e)"
					@keydown.enter="(e:Event)=>sendMessage(e)"
					@keydown="onKeyDown">

				<Button class="noClear spam" highlight
					v-if="spamming"
					title="Stop spam"
					:icon="$image('icons/cross_white.svg')"
					@click="stopSpam()" />
				
				<span @click="error=false" v-if="error" class="error">Woops... something went wrong when sending the message :(</span>
				
				<Button aria-label="Open emotes list"
					:icon="$image('icons/emote.svg')"
					bounce 
					@click="$emit('update:showEmotes',true);" />

				<transition name="blink">
				<Button aria-label="Open current poll"
					:icon="$image('icons/poll.svg')"
					bounce
					@click="$emit('setCurrentNotification', 'poll')"
					v-if="$store('poll').data?.id" />
				</transition>

				<transition name="blink">
				<Button aria-label="Open current chat poll"
					:icon="$image('icons/chatPoll.svg')"
					bounce
					@click="$emit('setCurrentNotification', 'chatpoll')"
					v-if="$store('chatSuggestion').data != null" />
				</transition>

				<transition name="blink">
				<Button aria-label="Open current prediction"
					:icon="$image('icons/prediction.svg')"
					bounce
					@click="$emit('setCurrentNotification', 'prediction')"
					v-if="$store('prediction').data?.id" />
				</transition>

				<transition name="blink">
				<Button aria-label="Open tracked users"
					:icon="$image('icons/magnet.svg')"
					bounce
					v-if="trackedUserCount > 0"
					data-tooltip="View tracked users"
					@click="$emit('setCurrentNotification', 'trackedUsers')" />
				</transition>

				<transition name="blink">
				<div class="whispers" v-if="$store('raffle').data?.mode == 'chat'">
					<Button aria-label="Open current raffle"
						:icon="$image('icons/ticket.svg')"
						bounce
						data-tooltip="Raffle"
						@click="$emit('setCurrentNotification', 'raffle')" />
					<div class="count" v-if="$store('raffle').data!.entries && $store('raffle').data!.entries.length > 0">{{$store('raffle').data?.entries.length}}</div>
				</div>
				</transition>

				<transition name="blink">
				<Button aria-label="Open current bingo"
					:icon="$image('icons/bingo.svg')"
					bounce
					v-if="$store('bingo').data"
					data-tooltip="Bingo"
					@click="$emit('setCurrentNotification', 'bingo')" />
				</transition>

				<transition name="blink">
				<div class="whispers" v-if="whispersAvailable">
					<Button aria-label="Open whispers"
						:icon="$image('icons/whispers.svg')"
						bounce
						small
						data-tooltip="Whispers"
						@click="$emit('setCurrentNotification', 'whispers')" />
					<div class="count" v-if="$store('chat').whispersUnreadCount > 0">{{$store('chat').whispersUnreadCount}}</div>
				</div>
				</transition>

				<transition name="blink">
				<div class="pins" v-if="$store('chat').pinedMessages.length > 0">
					<Button aria-label="Open pined messages"
						:icon="$image('icons/pin.svg')"
						bounce
						small
						data-tooltip="Pined messages"
						@click="$emit('pins')" />
					<div class="count">{{$store('chat').pinedMessages.length}}</div>
				</div>
				</transition>

				<transition name="blink">
				<Button aria-label="Toggle messages encryption"
					:icon="$image('icons/'+($store('main').cypherEnabled? 'lock.svg' : 'unlock.svg'))"
					@click="toggleCypher()"
					v-if="cypherConfigured"
					bounce
					data-tooltip="Send encrypted<br>messages" />
				</transition>

				<transition name="blink">
				<Button aria-label="Open deezer player"
					:icon="$image('icons/deezer.svg')"
					bounce
					v-if="$store('music').deezerConnected"
					data-tooltip="Deezer"
					@click="$emit('setCurrentNotification', 'deezer')" />
				</transition>

				<transition name="blink">
				<Button small highlight class="chatHighlight" aria-label="chatHighlight button"
					:icon="$image('icons/highlight_del.svg')"
					bounce
					v-if="chatHighlightEnabled"
					data-tooltip="Remove currently<br>highlighted message"
					@click="removeChatHighlight()" />
				</transition>

				<CommunityBoostInfo v-if="$store('stream').communityBoostState" />

				<TimerCountDownInfo v-if="$store('timer').countdown || $store('timer').timerStartDate > 0" />

				<CommercialTimer v-if="isCommercial" />

				<div v-if="$store('params').appearance.showViewersCount.value === true
					&& $store('stream').playbackState && $store('stream').playbackState!.viewers > 0"
					data-tooltip="Viewer count"
					class="viewCount"
					@click="censoredViewCount = !censoredViewCount"
				>
					<p v-if="censoredViewCount">x</p>
					<p v-if="!censoredViewCount">{{$store('stream').playbackState!.viewers}}</p>
					<img src="@/assets/icons/user.svg" alt="viewers">
				</div>

				<transition name="blink">
				<Button small highlight class="voice" aria-label="start voice bot"
					:icon="$image('icons/microphone'+(voiceBotStarted? '_recording' : '')+'.svg')"
					bounce
					v-if="voiceBotConfigured"
					:data-tooltip="voiceBotStarted? 'Stop voice bot' : 'Start voice bot'"
					@click="toggleVoiceBot()" />
				</transition>

				<transition name="blink">
				<Button aria-label="Open dev mode options"
					:icon="$image('icons/debug.svg')"
					bounce
					@click="$emit('update:showDevMenu',true);"
					v-if="$store('main').devmode" />
				</transition>

				<transition name="blink">
				<Button small highlight class="noClear" aria-label="emergency button"
					v-if="emergencyButtonEnabled"
					:icon="$image('icons/emergency.svg')"
					bounce
					:data-tooltip="$store('emergency').emergencyStarted? 'Stop emergency mode' : 'Start emergency'"
					@click="toggleEmergencyMode()" />
				</transition>

			</form>

			<div class="floatingButtons">
				<transition name="slide">
					<Button small class="muteBt" aria-label="mute text to speech"
						:icon="$image('icons/mute.svg')"
						v-if="$store('tts').speaking"
						data-tooltip="Stop speaking"
						@click="stopTTS(false)" />
				</transition>

				<transition name="slide">
					<Button small class="muteBt" aria-label="clear text to speech queue"
						:icon="$image('icons/muteAll.svg')"
						v-if="$store('tts').speaking"
						data-tooltip="Clear TTS queue"
						@click="stopTTS(true)" />
				</transition>

				<transition name="slide">
					<Button small class="voicemodBt" aria-label="Reset voice effect"
						v-if="$store('voice').voicemodParams.voiceIndicator && $store('voice').voicemodCurrentVoice.voiceID != 'nofx'"
						:icon="'data:image/png;base64,' + $store('voice').voicemodCurrentVoice.image"
						data-tooltip="Reset voice effect"
						@click="resetVoiceEffect()" />
				</transition>
			</div>

			<AutocompleteChatForm class="contentWindows emotesLive"
				v-if="openAutoComplete"
				:search="autoCompleteSearch"
				:emotes="autoCompleteEmotes"
				:users="autoCompleteUsers"
				:commands="autoCompleteCommands"
				@close="autoCompleteSearch = ''"
				@selectItem="onSelectItem" />
			
		</div>
	</div>
</template>

<script lang="ts">
import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';
import MessengerProxy from '@/messaging/MessengerProxy';
import DataStore from '@/store/DataStore';
import StoreProxy from '@/store/StoreProxy';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchCypherPlugin from '@/utils/ChatCypherPlugin';
import Config from '@/utils/Config';
import TTSUtils from '@/utils/TTSUtils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import VoiceAction from '@/utils/voice/VoiceAction';
import VoiceController from '@/utils/voice/VoiceController';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import AutocompleteChatForm from './AutocompleteChatForm.vue';
import CommercialTimer from './CommercialTimer.vue';
import CommunityBoostInfo from './CommunityBoostInfo.vue';
import TimerCountDownInfo from './TimerCountDownInfo.vue';

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
		TimerCountDownInfo,
		CommunityBoostInfo,
		AutocompleteChatForm,
	},
	emits: [
		"pins",
		"poll",
		"pred",
		"raffle",
		"search",
		"bingo",
		"chatpoll",
		"TTuserList",
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

	public message = "";
	public error = false;
	public loading = false;
	public spamming = false;
	public censoredViewCount = false;
	public autoCompleteSearch = "";
	public autoCompleteEmotes = false;
	public autoCompleteUsers = false;
	public autoCompleteCommands = false;
	public trackedUserCount = 0;
	public spamInterval = 0;
	public channelId:string = "";
	public onlineUsersTooltip:string = "";

	private updateTrackedUserListHandler!:(e:GlobalEvent)=>void;
	
	public get maxLength():number {
		if(this.message.indexOf("/raw") === 0) {
			return 500000;
		}else{
			return 500;
		}
	}

	public get emergencyButtonEnabled():boolean {
		return this.$store("emergency").params.enabled === true;
	}

	public get voiceBotStarted():boolean { return VoiceController.instance.started; }
	public get voiceBotConfigured():boolean {
		if(Config.instance.OBS_DOCK_CONTEXT) return false;
		const actions = Object.keys(VoiceAction);
		type VAKeys = keyof typeof VoiceAction;
		//Search for global labels
		for (let i = 0; i < actions.length; i++) {
			const a = actions[i];
			if(VoiceAction[a+"_IS_GLOBAL" as VAKeys] !== true) continue;
			const id:string = VoiceAction[a as VAKeys] as string;
			const action = (this.$store("voice").voiceActions as VoiceAction[]).find(v=> v.id == id);
			if(!action?.sentences) return false;
		}
		return true;
	}

	public get chatHighlightEnabled():boolean {
		return this.$store("chat").isChatMessageHighlighted;
	}

	public get openAutoComplete():boolean {
		return this.autoCompleteSearch.length > 1 || (this.autoCompleteCommands && this.autoCompleteSearch.length > 0);
	}

	public get whispersAvailable():boolean {
		const whispers = this.$store("chat").whispers;
		for (const key in whispers) {
			if (whispers[key].length > 0) return true;
		}
		return false;
	}

	public get classes():string[] {
		let res = ["chatform"];
		if(this.loading) res.push("loading");
		if(this.$store("main").cypherEnabled) res.push("cypherMode");
		if(this.$store("emergency").emergencyStarted) res.push("emergencyMode");
		return res;
	}

	public get cypherConfigured():boolean { return this.$store("main").cypherKey?.length > 0; }

	public get isCommercial():boolean { return this.$store("stream").commercialEnd != 0; }

	public beforeMount(): void {
		this.updateTrackedUserListHandler = (e:GlobalEvent) => this.onUpdateTrackedUserList();
		EventBus.instance.addEventListener(GlobalEvent.TRACK_USER, this.updateTrackedUserListHandler);
		EventBus.instance.addEventListener(GlobalEvent.UNTRACK_USER, this.updateTrackedUserListHandler);
		this.channelId = StoreProxy.auth.twitch.user.id;
		this.onUpdateTrackedUserList();
	}

	public async mounted():Promise<void> {
		watch(():string => this.message, (newVal:string):void => {
			const input = this.$refs.input as HTMLInputElement;
			const carretPos = input.selectionStart as number | 0;
			const isCmd = /^\s*\//.test(newVal);
			// let index = carretPos;
			// let tags = ["/", "@", ":"];
			// while(index > 0 && newVal.charAt(index) != " ") {
			// 	index --;
			// }
			// console.log(index);
			
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
					this.autoCompleteEmotes = currentChar == ":" && !isCmd;//Avoid autocompleting emotes in /countdown cmd
					this.autoCompleteCommands = currentChar == "/";
					this.autoCompleteSearch = newVal.substring(i+offset, carretPos);
					break;
				}
			}
		});

		// try {
		// 	await TwitchUtils.loadRewards();
		// }catch(e) {
		// 	//User is probably not an affiliate
		// }
		gsap.from(this.$el, {y:50, delay:.2, duration:1, ease:"sine.out"});
		const btns = (this.$el as HTMLDivElement).querySelectorAll(".leftForm>*,.inputForm>*");
		gsap.from(btns, {y:50, duration:.7, delay:.5, ease:"back.out(2)", stagger:.075});
		
	}

	public beforeUnmount():void {
		clearInterval(this.spamInterval);
		EventBus.instance.removeEventListener(GlobalEvent.TRACK_USER, this.updateTrackedUserListHandler);
		EventBus.instance.removeEventListener(GlobalEvent.UNTRACK_USER, this.updateTrackedUserListHandler);
	}
	
	public toggleParams():void {
		this.$store("main").setShowParams(!this.$store("main").showParams);
	}

	/**
	 * Updates the tooltip displayed on user icon hover.
	 * This could be replaced by a getter to avoid having to update
	 * this manually at hover.
	 * BUT, the "users" value of the "users" store is a getter refering
	 * to a non-reactive array for performance reason. Because of this
	 * if the method was a getter, its value wouldn't automatically be
	 * updated when user list changes.
	 */
	public updateOnlineUsersTooltip(e:MouseEvent):void {
		let followCount = 0;
		let onlineCount = 0;
		const users = this.$store("users").users;
		for (let i = 0; i < users.length; i++) {
			const u = users[i];
			
			if(!u.channelInfo[this.channelId]) continue;
			if(u.channelInfo[this.channelId].online === true) {
				onlineCount ++;
				if(u.channelInfo[this.channelId].is_following === true) followCount ++;
			}
		}
		let res = "<img src='"+this.$image('icons/user.svg')+"' height='15px' style='vertical-align:middle'> "+onlineCount;

		if(this.$store("params").appearance.highlightNonFollowers.value === true) {
			res += " / <img src='"+this.$image('icons/follow.svg')+"' height='15px' style='vertical-align:middle'> "+followCount;
			res += " / <img src='"+this.$image('icons/unfollow_white.svg')+"' height='15px' style='vertical-align:middle'> "+(onlineCount - followCount);
		}
		this.onlineUsersTooltip = res;
	}
	
	public async sendMessage(event:Event):Promise<void> {
		if(this.message.length == 0) return;
		if(this.openAutoComplete) return;

		const params = this.message.split(/\s/gi).filter(v => v != "");
		const cmd = params.shift()?.toLowerCase();
		const sChat = this.$store("chat");
		let noticeId:TwitchatDataTypes.TwitchatNoticeStringType|undefined;
		let noticeMessage:string|undefined;
		params.forEach((v, i) => { params[i] = v.trim() });


		if(cmd == "/chatsugg") {
			event.preventDefault();//avoid auto submit of the opening form
			//Open chat poll form
			this.$emit("chatpoll");
			this.message = "";
		}else

		if(cmd == "/raid" && (!params[0] || params[0] == "user")) {
			this.$emit("liveStreams");
			this.message = "";
		}else

		if(cmd == "/poll") {
			event.preventDefault();//avoid auto submit of the opening form
			//Open poll form
			const title = params.join(" ");
			if(title != "title") {
				this.$store("main").tempStoreValue = title;
			}
			this.$emit("poll");
			this.message = "";
		}else

		if(cmd == "/prediction") {
			event.preventDefault();//avoid auto submit of the opening form
			//Open prediction form
			const title = params.join(" ");
			if(title != "title") {
				this.$store("main").tempStoreValue = title;
			}
			this.$emit("pred");
			this.message = "";
		}else

		if(cmd == "/raffle") {
			event.preventDefault();//avoid auto submit of the opening form
			//Open raffle form
			this.$emit("raffle");
			this.message = "";
		}else

		if(cmd == "/bingo") {
			//Open bingo form
			if(params[0] == "number" || params[0] == "emote") {
				const payload:TwitchatDataTypes.BingoConfig = {
					guessNumber: params[0] == "number",
					guessEmote: params[0] == "emote",
					guessCustom: false,
					min: 0,
					max: 100,
				};
				this.$store("bingo").startBingo(payload);
			}else{
				event.preventDefault();//avoid auto submit of the opening form
				this.$emit("bingo");
			}
			this.message = "";
		}else

		if(cmd == "/simulatechat" || cmd == "/spam" || cmd == "/megaspam" || cmd == "/fake") {
			this.loading = true;
			this.spamming = true;
			clearInterval(this.spamInterval);

			const spamTypes:{type:TwitchatDataTypes.TwitchatMessageStringType, probability:number}[]=[
				{type:TwitchatDataTypes.TwitchatMessageType.MESSAGE, probability:100},
				{type:TwitchatDataTypes.TwitchatMessageType.FOLLOWING, probability:5},
				{type:TwitchatDataTypes.TwitchatMessageType.REWARD, probability:4},
				{type:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, probability:3},
				{type:TwitchatDataTypes.TwitchatMessageType.CHEER, probability:3},
				{type:TwitchatDataTypes.TwitchatMessageType.RAID, probability:1},
				{type:TwitchatDataTypes.TwitchatMessageType.POLL, probability:1},
				{type:TwitchatDataTypes.TwitchatMessageType.PREDICTION, probability:1},
				{type:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY, probability:1},
				{type:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN, probability:1},
			];

			const ponderatedList:TwitchatDataTypes.TwitchatMessageStringType[] = [];
			for (let i = 0; i < spamTypes.length; i++) {
				for (let j = 0; j < spamTypes[i].probability; j++) {
					ponderatedList.push(spamTypes[i].type);
				}
			}
			
			const forcedMessage = params.join(" ");
			this.spamInterval = window.setInterval(()=> {
				this.$store("debug").simulateMessage(Utils.pickRand(ponderatedList), (data)=> {
					if(data.type === TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
						if(forcedMessage) {
							data.message = data.message_html = data.message_no_emotes = forcedMessage;
						}
						if(Math.random() > .1) return;
						if(Math.random() > .5) {
							data.twitch_isFirstMessage = true;
						}else if(Math.random() > .5) {
							data.twitch_isPresentation = true;
						}else if(Math.random() > .5) {
							data.deleted = true;
						}else if(Math.random() > .5) {
							if(Math.random() > .35) {
								data.twitch_isSuspicious = true;
							}else{
								data.twitch_isRestricted = true;
							}
							const users:TwitchatDataTypes.TwitchatUser[] = [];
							const list = this.$store("users").users;
							for (let i = 0; i < list.length; i++) {
								users.push(list[i]);
								if(Math.random() > .3) break;
							}
							data.twitch_sharedBanChannels = users.map(v=> { return {id:v.id, login:v.login}; })
						}
					}
				});
				if(cmd == "/fake") clearInterval(this.spamInterval);
			}, cmd == "/megaspam"? 50 :  200);
			this.message = "";
			this.loading = false;
		}else

		if(cmd == "/gigaspam") {
			this.$store("chat").gigaSpam();
			this.message = "";
		}else

		if(cmd == "/spamstop" || cmd == "/simulatechatstop") {
			this.stopSpam();
		}else
		
		if(cmd == "/cypherkey") {
			//Secret feature hehehe ( ͡~ ͜ʖ ͡°)
			this.$store("main").setCypherKey(params[0]);
			noticeId = TwitchatDataTypes.TwitchatNoticeType.CYPHER_KEY;
			noticeMessage = "Cypher key successfully configured !";
			this.message = "";
		}else

		if(cmd == "/cypherreset") {
			//Secret feature hehehe ( ͡~ ͜ʖ ͡°)
			this.$store("main").setCypherKey("");
			TwitchCypherPlugin.instance.cypherKey = "";
			noticeId = TwitchatDataTypes.TwitchatNoticeType.CYPHER_KEY;
			noticeMessage = "Cypher key removed successfully.";
			this.message = "";
		}else
		
		if(cmd == "/version") {
			//App version
			noticeId = TwitchatDataTypes.TwitchatNoticeType.APP_VERSION;
			noticeMessage = "Twitchat version "+import.meta.env.PACKAGE_VERSION;
			this.message = "";
		}else
		
		if(cmd == "/deletemessage") {
			//Delete a chat message from its ID
			TwitchUtils.deleteMessages(StoreProxy.auth.twitch.user.id, params[0])
			this.message = "";
		}else
		
		if(cmd == "/raw") {
			//Allows to display a message on chat from its raw JSON
			try {
				const json = JSON.parse(params.join(""));
				this.$store("chat").addMessage(json);
				this.message = "";
				return;
			}catch(error) {
				this.$store("main").alert("Invalid or missing JSON");
			}
		}else

		if(cmd == "/userlist") {
			this.$store("main").tempStoreValue = params[0];
			this.$emit('TTuserList');
			this.message = "";
		}else

		if(cmd == "/userdata" || cmd == "/loaduserdata") {
			if(params.length == 0) {
				this.$store("main").alert("Missing user name");
			}else{
				this.loading = true;
				let users:TwitchDataTypes.UserInfo[] = [];
				try {
					users = await TwitchUtils.loadUserInfo(undefined, [params[0]])
				}catch(error) {}

				if(users.length == 0) {
					this.$store("main").alert("User not found");
				}else{
					const options = {
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							"Authorization": "Bearer "+StoreProxy.auth.twitch.access_token,
						},
					}
					const res = await fetch(Config.instance.API_PATH+"/user/data?uid="+users[0].id, options)
					if(res.status === 200) {
						const json = await res.json();
						if(cmd === "/loaduserdata") {
							DataStore.loadFromJSON(json.data);
						}else{
							//Open JSON on new tab
							const data = JSON.stringify(json.data);
							const blob = new Blob([data], { type: 'application/json' });
							const url = window.URL.createObjectURL(blob);
							window.open(url, "_blank");
						}
					}else{
						this.$store("main").alert("Unable to load user data");
					}
				}
				this.loading = false;
			}
			this.message = "";
		}else
		
		{
			//Send message
			try {
				if(this.$store("main").cypherEnabled) {
					this.message = await TwitchCypherPlugin.instance.encrypt(this.message);
				}
				this.loading = true;
				if(await MessengerProxy.instance.sendMessage(this.message)) {
					this.message = "";
				}
				this.loading = false;
			}catch(error) {
				console.log(error);
				this.error = true;
			}
		}

		if(noticeId && noticeMessage) {
			const notice:TwitchatDataTypes.MessageNoticeData = {
				id:Utils.getUUID(),
				date:Date.now(),
				type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
				platform:"twitchat",
				noticeId:noticeId,
				message:noticeMessage,
			}
			sChat.addMessage(notice);
		}
	}

	/**
	 * Stop spamming fake messages
	 */
	public stopSpam():void {
		clearInterval(this.spamInterval);
		this.message = "";
		this.spamming = false;
	}

	/**
	 * Toggle secret cypher keyboard
	 */
	public toggleCypher():void {
		this.$store("main").setCypherEnabled(!this.$store("main").cypherEnabled);
	}

	/**
	 * Start the mergency mode
	 */
	public toggleEmergencyMode():void {
		if(!this.$store("emergency").emergencyStarted) {
			this.$confirm(this.$t("emergency.enable_confirm")).then(()=>{
				this.$store("emergency").setEmergencyMode(true);
			}).catch(()=>{});
		}else{
			this.$store("emergency").setEmergencyMode(false);
		}
	}

	/**
	 * Start the voice bot
	 */
	public toggleVoiceBot():void {
		if(VoiceController.instance.started) {
			VoiceController.instance.stop();
		}else{
			VoiceController.instance.start(false);
		}
	}

	/**
	 * Remove the currently highlighted message
	 */
	public removeChatHighlight():void {
		this.$store("chat").highlightChatMessageOverlay(null);
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
			const prefix = carretPos == 0 || /\s/gi.test(localMessage.charAt(carretPos))? "" : " ";
			const suffix = carretPos == localMessage.length || /\s/gi.test(localMessage.charAt(carretPos+1))? "" : " ";
			const code = prefix + item + suffix;
			localMessage = localMessage.substring(0, carretPos+1) + code + localMessage.substring(carretPos+1);
			carretPos += code.length+1;
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
	 * Called when pressing any key
	 */
	public onKeyDown(e:KeyboardEvent):void {
		if(e.shiftKey) return;//Avoid blocking browser tab navigation
		if(e.ctrlKey) return;//Avoid blocking browser tab navigation
		//Avoid leaving the input form
		if(e.key == "Tab") e.preventDefault();

		if(!this.openAutoComplete) return;
		if(e.key == "ArrowUp" || e.key == "ArrowDown") {
			e.preventDefault();
		}
	}

	/**
	 * Called when pressing tab key on input field
	 */
	public onTab(e:KeyboardEvent):void {
		const input = this.$refs.input as HTMLInputElement;
		let carretPos = input.selectionStart as number;
		let i = carretPos - 1;
		for (; i > -1; i--) {
			const c = this.message.charAt(i);
			if(/\s/gi.test(c)) break;
		}
		const len = carretPos - i;
		if(len > 2) {
			if(!this.openAutoComplete) {
				//Avoid closing the auto complete list right away now that
				//we can submit it with the tab key
				e.stopPropagation();
			}
			this.autoCompleteUsers = true;
			this.autoCompleteEmotes = true;
			this.autoCompleteCommands = true;
			this.autoCompleteSearch = this.message.substring(i+1, carretPos);
		}
		// e.preventDefault();
	}

	/**
	 * Interrupts the TTS
	 */
	public stopTTS(all:boolean):void {
		TTSUtils.instance.stop(all);
	}

	/**
	 * Reset current voice effect
	 */
	public resetVoiceEffect():void {
		VoicemodWebSocket.instance.disableVoiceEffect();
	}

	private onUpdateTrackedUserList():void {
		const res = [];
		for (let i = 0; i < this.$store("users").users.length; i++) {
			const u = this.$store("users").users[i];
			if(u.is_tracked) res.push(u);
		}
		this.trackedUserCount = res.length;
	}

}
</script>

<style scoped lang="less">
.chatform{
	@height: 2em;
	display: flex;
	flex-direction: row;
	min-height: @height;
	margin: auto;
	position: relative;
	opacity: 1;
	z-index: 2;
	transition: opacity .25s;

	&.loading {
		opacity: .5;
		pointer-events: none;
	}

	&.cypherMode {
		.holder {
			background-image: repeating-linear-gradient(-45deg, #00000020, #00000020 20px, #ffffff10 20px, #ffffff10 40px);
		}
	}
	&.emergencyMode {
		.holder {
			background-color: @mainColor_alert;
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
		padding: .25em;
		border-radius: .25em;

		.leftForm {
			height: 100%;
			display: flex;
			flex-direction: row;
			.button {
				width: 1.5em;
				height: 1.5em;
				border-radius: .25em;
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

			.loader {
				height: 1em;
			}

			input {
				min-width: 4em;
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
				font-size: 1em;
				color: #ff0000;
			}

			.whispers, .pins {
				position: relative;
				.count {
					pointer-events: none;
					position: absolute;
					top: 0;
					right: 0;
					transform: translate(20%, -50%);
					border-radius: 1em;
					font-size: .55em;
					padding: .25em .5em;
					font-weight: bold;
					color: @mainColor_dark;
					background-color: @mainColor_warn;
				}
			}

			.button:not(.noClear) {
				.clearButton() !important;
				border-radius: 50%;
			}
			.spam {
				flex-grow: 1;
			}
			.button.emergency {
				margin-left: .5em;
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
				cursor: pointer;
				display: flex;
				flex-direction: row;
				align-items: center;
				white-space: nowrap;
				color: @mainColor_light;
				background-color: rgba(255,255,255,.25);
				
				margin-left: .25em;
				border-radius: .5em;
				font-size: .7em;
				padding: .35em;
				img {
					height: .7em;
					margin-left: .1em;
				}
			}
		}
	}

	.floatingButtons {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 1;
		transform: translate(0, -100%);
		display: flex;
		flex-direction: column;

		.button {
			.clearButton();
			height: auto;
			background-color: fade(@mainColor_light, 20%);
			padding: .25em;
			width: 2em;
			height: 2em;
			transform: translate(0, 0);
			transition: transform .25s;
			margin-top: .25em;
		}

		.voicemodBt {
			padding: 0;
			background-color: #00fff6;
			&:hover {
				background-color: darken(#00fff6, 10%) !important;
			}
			:deep(.icon){
				width: 100%;
				height: 100%;
				max-height: 100%;
				max-width: 100%;
			}
		}

			.slide-enter-from,
			.slide-leave-to {
				transform: translate(100%, 0);
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