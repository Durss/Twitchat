<template>
	<div :class="classes">
		<div class="holder">
			<div class="leftForm">
				<Button :aria-label="$t('chat.form.paramsBt_aria')" :icon="$image('icons/params.svg')" bounce @click="toggleParams()" />
				<Button :aria-label="$t('chat.form.cmdsBt_aria')" :icon="$image('icons/commands.svg')" bounce @click="$emit('update:showCommands', true)" />
				<Button :aria-label="$t('chat.form.usersBt_aria')" :icon="$image('icons/user.svg')" bounce @click="$emit('update:showChatUsers', true)" @mouseover="updateOnlineUsersTooltip($event)" v-tooltip="onlineUsersTooltip" />
				<!-- <Button :icon="$image('icons/channelPoints.svg')" bounce @click="$emit('update:showRewards', true)" /> -->
			</div>

			
			<form @submit.prevent="" class="inputForm">
				<img src="@/assets/loader/loader_white.svg" alt="loader" class="loader" v-if="loading">
				
					<div class="inputHolder" v-if="!error && !spamming">
						<div class="replyTo" v-if="$store('chat').replyTo">
							<button class="closeBt" @click="$store('chat').replyTo = null"><img src="@/assets/icons/cross_white.svg" alt="close"></button>
							<div class="content">
								<i18n-t scope="global" keypath="chat.form.reply_to" tag="span" class="head">
									<template #USER>
										<a class="userlink" @click.stop="openUserCard($store('chat').replyTo!.user, $store('chat').replyTo!.channel_id)">{{$store("chat").replyTo!.user.displayName}}</a>
									</template>
								</i18n-t>
								<span class="message">{{ $store('chat').replyTo!.message }}</span>
							</div>
						</div>
						<input type="text"
							class="dark"
							v-model="message"
							ref="input"
							:placeholder="$t('chat.form.input_placeholder')"
							:maxlength="maxLength"
							@keyup.capture.tab="(e)=>onTab(e)"
							@keydown.enter="(e:Event)=>sendMessage(e)"
							@keydown="onKeyDown">
					</div>
	
					<Button class="noClear spam" highlight
						v-if="spamming"
						:title="$t('chat.form.stop_spamBt')"
						:icon="$image('icons/cross_white.svg')"
						@click="stopSpam()" />
					
					<span @click="error=false" v-if="error" class="error">{{ $t('error.message_send') }}</span>
					
					<Button :aria-label="$t('chat.form.emoteBt_aria')"
						:icon="$image('icons/emote.svg')"
						bounce 
						@click="$emit('update:showEmotes',true);" />
	
					<transition name="blink">
						<div class="pins" v-if="pendingShoutoutCount > 0">
							<Button :aria-label="$t('chat.form.shoutoutBt_aria')"
								:icon="$image('icons/shoutout.svg')"
								bounce
								v-tooltip="{content:$t('chat.form.shoutoutBt_aria'), showOnCreate:true, onHidden:()=>onHideTooltip('shoutout')}"
								v-if="pendingShoutoutCount > 0"
								@click="$emit('update:showShoutout',true);" />
							<div class="count">{{ pendingShoutoutCount }}</div>
						</div>
					</transition>
	
					<transition name="blink">
					<Button :aria-label="$t('chat.form.pollBt_aria')"
						:icon="$image('icons/poll.svg')"
						bounce
						v-tooltip="{content:$t('chat.form.pollBt_aria'), showOnCreate:shouldShowTooltip('poll'), onHidden:()=>onHideTooltip('poll')}"
						@click="openNotifications('poll')"
						v-if="$store('poll').data?.id" />
					</transition>
	
					<transition name="blink">
					<Button :aria-label="$t('chat.form.suggBt_aria')"
						:icon="$image('icons/chatPoll.svg')"
						bounce
						v-tooltip="{content:$t('chat.form.suggBt_aria'), showOnCreate:shouldShowTooltip('sugg'), onHidden:()=>onHideTooltip('sugg')}"
						@click="openNotifications('sugg')"
						v-if="$store('chatSuggestion').data != null" />
					</transition>
	
					<transition name="blink">
					<Button :aria-label="$t('chat.form.predictionBt_aria')"
						:icon="$image('icons/prediction.svg')"
						bounce
						v-tooltip="{content:$t('chat.form.predictionBt_aria'), showOnCreate:shouldShowTooltip('prediction'), onHidden:()=>onHideTooltip('prediction')}"
						@click="openNotifications('prediction')"
						v-if="$store('prediction').data?.id" />
					</transition>
	
					<transition name="blink">
					<Button :aria-label="$t('chat.form.trackedBt_aria')"
						:icon="$image('icons/magnet.svg')"
						bounce
						v-if="trackedUserCount > 0"
						v-tooltip="{content:$t('chat.form.trackedBt_aria'), showOnCreate:shouldShowTooltip('tracked'), onHidden:()=>onHideTooltip('tracked')}"
						@click="openNotifications('tracked')" />
					</transition>
	
					<transition name="blink">
					<div class="whispers" v-if="$store('raffle').data?.mode == 'chat'">
						<Button :aria-label="$t('chat.form.raffleBt_aria')"
							:icon="$image('icons/ticket.svg')"
							bounce
							v-tooltip="{content:$t('chat.form.raffleBt_aria'), showOnCreate:shouldShowTooltip('raffle'), onHidden:()=>onHideTooltip('raffle')}"
							@click="openNotifications('raffle')" />
						<div class="count" v-if="$store('raffle').data!.entries && $store('raffle').data!.entries.length > 0">{{$store('raffle').data?.entries.length}}</div>
					</div>
					</transition>
	
					<transition name="blink">
					<Button :aria-label="$t('chat.form.bingoBt_aria')"
						:icon="$image('icons/bingo.svg')"
						bounce
						v-if="$store('bingo').data"
						v-tooltip="{content:$t('chat.form.bingoBt_aria'), showOnCreate:shouldShowTooltip('bingo'), onHidden:()=>onHideTooltip('bingo')}"
						@click="openNotifications('bingo')" />
					</transition>
	
					<transition name="blink">
					<div class="whispers" v-if="whispersAvailable">
						<Button :aria-label="$t('chat.form.whispersBt_aria')"
							:icon="$image('icons/whispers.svg')"
							bounce
							v-tooltip="$t('chat.form.whispersBt_aria')"
							@click="openNotifications('whispers')" />
						<div class="count" v-if="$store('chat').whispersUnreadCount > 0">{{$store('chat').whispersUnreadCount}}</div>
					</div>
					</transition>
	
					<transition name="blink">
					<div class="pins" v-if="$store('chat').pinedMessages.length > 0">
						<Button :aria-label="$t('chat.form.pinsBt_aria')"
							:icon="$image('icons/save.svg')"
							bounce
							v-tooltip="{content:$t('chat.form.saveBt_aria'), showOnCreate:shouldShowTooltip('save'), onHidden:()=>onHideTooltip('save')}"
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
						v-tooltip="'Send encrypted<br>messages'" />
					</transition>
	
					<transition name="blink">
					<Button :aria-label="$t('chat.form.deezerBt_aria')"
						:icon="$image('icons/deezer.svg')"
						bounce
						v-if="$store('music').deezerConnected"
						v-tooltip="$t('chat.form.deezerBt_aria')"
						@click="openNotifications('deezer')" />
					</transition>
	
					<transition name="blink">
						<Button :aria-label="$t('chat.form.highlightBt_aria')"
							v-if="chatHighlightEnabled"
							class="chatHighlight"
							bounce highlight
							:icon="$image('icons/highlight.svg')"
							v-tooltip="{content:$t('chat.form.highlightBt_aria'), showOnCreate:shouldShowTooltip('highlight'), onHidden:()=>onHideTooltip('highlight')}"
							@click="removeChatHighlight()" />
					</transition>
	
					<CommunityBoostInfo v-if="$store('stream').communityBoostState" />
	
					<TimerCountDownInfo v-if="$store('timer').countdown || $store('timer').timerStartDate > 0" />
	
					<CommercialTimer v-if="isCommercial" />
	
					<div v-if="$store('params').appearance.showViewersCount.value === true
						&& $store('stream').playbackState && $store('stream').playbackState!.viewers > 0"
						v-tooltip="$t('chat.form.viewer_count')"
						class="viewCount"
						@click="censoredViewCount = !censoredViewCount"
					>
						<p v-if="censoredViewCount">x</p>
						<p v-if="!censoredViewCount">{{$store('stream').playbackState!.viewers}}</p>
						<img src="@/assets/icons/user.svg" alt="viewers">
					</div>
	
					<transition name="blink">
					<Button highlight class="voice"
						:icon="$image('icons/microphone'+(voiceBotStarted? '_recording' : '')+'.svg')"
						bounce
						v-if="voiceBotConfigured"
						:aria-label="voiceBotStarted? $t('chat.form.voicebot_stopBt_aria') : $t('chat.form.voicebot_startBt_aria')"
						v-tooltip="voiceBotStarted? $t('chat.form.voicebot_stopBt_aria') : $t('chat.form.voicebot_startBt_aria')"
						@click="toggleVoiceBot()" />
					</transition>
	
					<transition name="blink">
					<Button :aria-label="$t('chat.form.devmodeBt_aria')"
						:icon="$image('icons/debug.svg')"
						bounce
						@click="$emit('update:showDevMenu',true);"
						v-if="$store('main').devmode" />
					</transition>
	
					<transition name="blink">
					<Button highlight class="noClear emergency"
						v-if="emergencyButtonEnabled"
						:icon="$image('icons/emergency.svg')"
						bounce
						:aria-label="$store('emergency').emergencyStarted? $t('chat.form.emergency_stopBt_aria') : $t('chat.form.emergency_startBt_aria')"
						v-tooltip="$store('emergency').emergencyStarted? $t('chat.form.emergency_stopBt_aria') : $t('chat.form.emergency_startBt_aria')"
						@click="toggleEmergencyMode()" />
					</transition>
	
				</form>
			</div>

			<div class="floatingButtons">
				<transition name="slide">
					<Button small class="muteBt" :aria-label="$t('chat.form.muteTTSBt_aria')"
						:icon="$image('icons/mute.svg')"
						v-if="$store('tts').speaking"
						v-tooltip="$t('chat.form.muteTTSBt_aria')"
						@click="stopTTS(false)" />
				</transition>

				<transition name="slide">
					<Button small class="muteBt" :aria-label="$t('chat.form.clearTTSBt_aria')"
						:icon="$image('icons/muteAll.svg')"
						v-if="$store('tts').speaking"
						v-tooltip="$t('chat.form.clearTTSBt_aria')"
						@click="stopTTS(true)" />
				</transition>

				<transition name="slide">
					<Button small class="voicemodBt" :aria-label="$t('chat.form.resetVoiceBt_aria')"
						v-if="$store('voice').voicemodParams.voiceIndicator && $store('voice').voicemodCurrentVoice.voiceID != 'nofx'"
						:icon="'data:image/png;base64,' + $store('voice').voicemodCurrentVoice.image"
						v-tooltip="$t('chat.form.resetVoiceBt_aria')"
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
</template>

<script lang="ts">
import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';
import MessengerProxy from '@/messaging/MessengerProxy';
import DataStore from '@/store/DataStore';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TwitchCypherPlugin from '@/utils/ChatCypherPlugin';
import Config from '@/utils/Config';
import TTSUtils from '@/utils/TTSUtils';
import Utils from '@/utils/Utils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import VoiceAction from '@/utils/voice/VoiceAction';
import VoiceController from '@/utils/voice/VoiceController';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { LoremIpsum } from 'lorem-ipsum';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';
import AutocompleteChatForm from './AutocompleteChatForm.vue';
import CommercialTimer from './CommercialTimer.vue';
import CommunityBoostInfo from './CommunityBoostInfo.vue';
import TimerCountDownInfo from './TimerCountDownInfo.vue';

@Component({
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
		"update:showShoutout",
		"setCurrentNotification"
	],
})
export default class ChatForm extends Vue {

	@Prop
	public showFeed!:boolean;
	@Prop
	public showEmotes!:boolean;
	@Prop
	public showCommands!:boolean;
	@Prop
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

	public get pendingShoutoutCount():number {
		const list = this.$store('users').shoutoutHistory[this.channelId];
		if(!list) return 0;

		return list.filter(v=>v.done === false).length;
	}

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
			const isCmd = /^\s*(\/|!)/.test(newVal);
			
			for (let i = carretPos; i >= 0; i--) {
				const currentChar = newVal.charAt(i);
				const offset = currentChar == ":" || currentChar == "@"? 1 : 0;
				if(/\s/gi.test(currentChar)) {
					this.autoCompleteSearch = "";
					break;
				}

				if(currentChar == ":" || 
				currentChar == "@" || 
				((currentChar == "/" || currentChar == "!") && carretPos == 1) || 
				(i == 0 && this.autoCompleteSearch)) {
					this.autoCompleteUsers = currentChar == "@";
					this.autoCompleteEmotes = currentChar == ":" && !isCmd;//Avoid autocompleting emotes in /countdown cmd
					this.autoCompleteCommands = currentChar == "/" || currentChar == "!";
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

	public openNotifications(type:TwitchatDataTypes.NotificationTypes):void {
		this.$emit('setCurrentNotification', type);
	}

	/**
	 * Gets if a button tooltip should be displayed by default
	 */
	public shouldShowTooltip(key:TwitchatDataTypes.NotificationTypes):boolean {
		const json = DataStore.get(DataStore.TOOLTIP_AUTO_OPEN);
		let values!:{[key:string]:number};
		if(!json) values = {};
		else values = JSON.parse(json);
		return values[key] == undefined || values[key] < 2;
	}

	/**
	 * Called when a tooltip is closed
	 */
	public onHideTooltip(key:TwitchatDataTypes.NotificationTypes):void {
		const json = DataStore.get(DataStore.TOOLTIP_AUTO_OPEN);
		let values!:{[key:string]:number};
		if(!json) values = {};
		else values = JSON.parse(json);
		if(values[key] === undefined) {
			values[key] = -1;
		}
		if(values[key] < 2) values[key] ++;
		DataStore.set(DataStore.TOOLTIP_AUTO_OPEN, values);
	}
	
	/**
	 * Toggle parameters display
	 */
	public toggleParams():void {
		if(this.$store("params").currentPage == TwitchatDataTypes.ParameterPages.CLOSE) {
			this.$store("params").openParamsPage( TwitchatDataTypes.ParameterPages.MAIN_MENU );
		}else{
			this.$store("params").openParamsPage( TwitchatDataTypes.ParameterPages.CLOSE );
		}
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
	
	public async sendMessage(event?:Event):Promise<void> {
		if(this.message.length == 0) return;
		if(this.openAutoComplete) return;

		const params = this.message.split(/\s/gi).filter(v => v != "");
		const cmd = params.shift()?.toLowerCase();
		const sChat = this.$store("chat");
		let noticeId:TwitchatDataTypes.TwitchatNoticeStringType|undefined;
		let noticeMessage:string|undefined;
		params.forEach((v, i) => { params[i] = v.trim() });


		if(cmd == "/chatsugg") {
			if(event) event.preventDefault();//avoid auto submit of the opening form
			//Open chat poll form
			this.$emit("chatpoll");
			this.message = "";
		}else

		if(cmd == "/raid" && (!params[0] || params[0] == "user")) {
			if(TwitchUtils.requestScopes([TwitchScopes.START_RAID])) {
				this.$emit("liveStreams");
				this.message = "";
			}
		}else

		if(cmd == "/poll") {
			if(event) event.preventDefault();//avoid auto submit of the opening form
			if(TwitchUtils.requestScopes([TwitchScopes.MANAGE_POLLS])) {
				//Open poll form
				const title = params.join(" ");
				if(title != "title") {
					this.$store("main").tempStoreValue = title;
				}
				this.$emit("poll");
				this.message = "";
			}
		}else

		if(cmd == "/prediction") {
			if(event) event.preventDefault();//avoid auto submit of the opening form
			if(TwitchUtils.requestScopes([TwitchScopes.MANAGE_PREDICTIONS])) {
				//Open prediction form
				const title = params.join(" ");
				if(title != "title") {
					this.$store("main").tempStoreValue = title;
				}
				this.$emit("pred");
				this.message = "";
			}
		}else

		if(cmd == "/raffle") {
			if(event) event.preventDefault();//avoid auto submit of the opening form
			//Open raffle form
			this.$emit("raffle");
			this.message = "";
		}else

		if(cmd == "/fakeso") {
			const fakeUsers = await TwitchUtils.getFakeUsers();
			let user = Utils.pickRand(fakeUsers);
			if(params[0] && params[0] != "true" && params[0] != "false") {
				user = await this.$store("users").getUserFrom("twitch", this.channelId, undefined, params[0]);
				if(!user) return;
			}
			const done = params[0] === "true" || params[1] === "true";
			if(done) user.channelInfo[this.channelId].lastShoutout = Date.now();
			const userInfos = await TwitchUtils.loadUserInfo([user.id]);
			user.avatarPath = userInfos[0].profile_image_url;
			if(!this.$store("users").shoutoutHistory[this.channelId]) {
				this.$store("users").shoutoutHistory[this.channelId] = [];
			}
			this.$store("users").shoutoutHistory[this.channelId]!.push({
				id:Utils.getUUID(),
				user,
				done,
			})
		}else

		if(cmd == "/fakesolist") {
			const fakeUsers = await TwitchUtils.getFakeUsers();
			for (let i = 0; i < 10; i++) {
				let user = Utils.pickRand(fakeUsers);
				const done = i == 0;
				if(done) user.channelInfo[this.channelId].lastShoutout = Date.now();
				const userInfos = await TwitchUtils.loadUserInfo([user.id]);
				user.avatarPath = userInfos[0].profile_image_url;
				if(!this.$store("users").shoutoutHistory[this.channelId]) {
					this.$store("users").shoutoutHistory[this.channelId] = [];
				}
				this.$store("users").shoutoutHistory[this.channelId]!.push({
					id:Utils.getUUID(),
					user,
					done,
				})
			}
		}else

		if(cmd == "/fake") {
			this.loading = true;
			let forcedMessage = params.join(" ");

			const lorem = new LoremIpsum({wordsPerSentence: { max: 8, min: 1 }});
			const message = lorem.generateSentences(Math.round(Math.random()*2) + 1);
			forcedMessage = forcedMessage.replace(/\{LOREM\}/gi, message);
			await this.$store("debug").sendRandomFakeMessage(true, forcedMessage);
			this.loading = false;
		}else

		if(cmd == "/simulatechat" || cmd == "/spam" || cmd == "/megaspam") {
			this.loading = true;
			this.spamming = true;
			clearInterval(this.spamInterval);
			
			let forcedMessage = params.join(" ");

			this.spamInterval = window.setInterval(()=> {
				const lorem = new LoremIpsum({wordsPerSentence: { max: 8, min: 1 }});
				const message = lorem.generateSentences(Math.round(Math.random()*2) + 1);
				this.$store("debug").sendRandomFakeMessage(true, forcedMessage.replace(/\{LOREM\}/gi, message));
			}, cmd == "/megaspam"? 50 :  200);
			this.message = "";
			this.loading = false;
		}else

		if(cmd == "/gigaspam") {
			this.loading = true;
			const count = this.$store("chat").realHistorySize;
			for (let i = 0; i < count; i++) {
				const post = i > count - 100;
				await this.$store("debug").sendRandomFakeMessage(post, undefined,(message:TwitchatDataTypes.ChatMessageTypes)=>{
					if(!post) {
						//Push message not posted on tchat to the message history
						this.$store("chat").messages.push(message);
					}
				});
			}
			this.message = "";
			this.loading = false;
		}else

		if(cmd == "/spamstop") {
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
		
		if(cmd == "/dataversion") {
			//App version
			noticeId = TwitchatDataTypes.TwitchatNoticeType.APP_VERSION;
			noticeMessage = "Twitchat data version "+DataStore.get(DataStore.DATA_VERSION);
			this.message = "";
		}else
		
		if(cmd == "/logmessages") {
			//App version
			console.log(this.$store("chat").messages)
			this.message = "";
		}else
		
		if(cmd == "/lang") {
			this.$i18n.locale = params[0];
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
			this.$emit('TTuserList');
			this.message = "";
		}else

		if(cmd == "/userdata" || cmd == "/loaduserdata") {
			if(params.length == 0) {
				this.$store("main").alert(this.$t('error.username_missing'));
			}else{
				this.loading = true;
				let users:TwitchDataTypes.UserInfo[] = [];
				try {
					users = await TwitchUtils.loadUserInfo(undefined, [params[0]])
				}catch(error) {}

				if(users.length == 0) {
					this.$store("main").alert(this.$t("error.user_param_not_found", {USER:params[0]}));
				}else{
					const options = {
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							"Authorization": "Bearer "+StoreProxy.auth.twitch.access_token,
							'App-Version': import.meta.env.PACKAGE_VERSION,
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
		
		}else if(cmd == "/bingo" && params[0] != "number" && params[0] != "emote" && params[0] != "custom") {
				if(event) event.preventDefault();//avoid auto submit of the opening form
				this.$emit("bingo");
				this.message = "";
		}else{

			//Send message
			try {
				if(this.$store("main").cypherEnabled) {
					this.message = await TwitchCypherPlugin.instance.encrypt(this.message);
				}
				this.loading = true;
				const replyTo = this.$store("chat").replyTo ?? undefined;
				if(await MessengerProxy.instance.sendMessage(this.message, undefined, undefined, replyTo)) {
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
		this.$store("chat").highlightChatMessageOverlay();
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

		//If it's a command and it has no parameter, submit it right away
		if(item.indexOf("/") === 0 && item.indexOf("{") == -1) {
			this.message = item;
			this.autoCompleteSearch = "";
			this.sendMessage();
			return;
		}

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

	/**
	 * Open a user's card
	 */
	public openUserCard(user:TwitchatDataTypes.TwitchatUser, channel_id:string):void {
		this.$store("users").openUserCard(user, channel_id);
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
			background-color: var(--mainColor_alert);
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
		background-color: var(--mainColor_dark_extralight);
		padding: .25em;
		border-radius: .25em;

		.leftForm {
			height: 100%;
			display: flex;
			flex-direction: row;
			align-self: center;
			.button {
				.clearButton();
				width: 1.5em;
				height: 1.5em;
				:deep(.icon) {
					height: .85em;
				}
			}
		}

		.inputForm {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			flex-wrap: wrap;
			gap: 1px;
			flex-grow: 1;
			
			.loader {
				height: 1em;
			}
			
			.inputHolder {
				position: relative;
				flex-grow: 1;
				flex-basis: 150px;
				
				.replyTo {
					top: -.25em;
					width:100%;
					position: absolute;
					transform: translateY(-100%);
					background-color: var(--mainColor_dark_light);
					padding: .25em;
					color: var(--mainColor_light);
					border-top-left-radius: .5em;
					border-top-right-radius: .5em;
					box-shadow: 0 -5px 5px rgba(0,0,0,.5);
					display: flex;
					flex-direction: row;
					align-items: center;
					gap: .25em;
					.closeBt{
						width: .75em;
						height: .75em;
						min-width: .75em;
						min-height: .75em;
						img {
							display: block;
							width: 100%;
							height: 100%;
						}
					}
					.content {
						font-size: .7em;
						white-space: nowrap;
						overflow: hidden;
						text-overflow: ellipsis;
						.head {
							font-weight: bold;
						}
						.message {
							opacity: .8;
							margin-left: .25em;
						}

						.userlink {
							font-weight: bold;
							color: var(--mainColor_warn);
							&:hover {
								background-color: var(--mainColor_dark);
							}
						}
					}
				}
			}
			input {
				width: 100%;
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
					color: var(--mainColor_dark);
					background-color: var(--mainColor_warn);
				}
			}

			.button:not(.noClear) {
				.clearButton();
				width: 1.5em;
				height: 1.5em;
				:deep(.icon) {
					height: .85em;
				}
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
				color: var(--mainColor_light);
				background-color: rgba(255,255,255,.25);
				
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