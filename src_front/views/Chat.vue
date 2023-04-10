<template>
	<div :class="classes">
		<div class="top" ref="top">
			<div class="scrollable" ref="scrollable">
				<div class="column" v-for="c in $store('params').chatColumnsConfig"
				:ref="'column_'+c.id"
				:key="c.id"
				:style="getColStyles(c)">
					<div class="subHolder">
						<GreetThem class="greetThem" v-if="panelsColIndexTarget == c.order && $store('params').features.firstMessage.value === true" />
	
						<MessageList ref="messages" class="messages"
							@showModal="(v:TwitchatDataTypes.ModalTypes) => $store('params').currentModal = v"
							@addColumn="addColumn"
							:config="c"
							filterId="chat"/>
					</div>
		
					<div class="dragBt" ref="splitter"
					v-if="$store('params').chatColumnsConfig.length > 1
					&& (c.order == 0 || $store('params').chatColumnsConfig.length > 2)"
					@dblclick="expandCol(c)"
					@pointerdown="startDrag($event, c)"
					@pointerup="startDrag($event, c)">
						<div class="grip"></div>
					</div>
				</div>
			</div>
		</div>

		<Teleport v-if="panelsColumnTarget" :to="panelsColumnTarget">
			<VoiceTranscript class="tts" />

			<PollForm			class="popin" v-if="$store('params').currentModal == 'poll'" @close="$store('params').currentModal = ''" :voiceControl="voiceControl" />
			<ChatSuggestionForm	class="popin" v-if="$store('params').currentModal == 'chatpoll'" @close="$store('params').currentModal = ''" :voiceControl="voiceControl" />
			<RaffleForm			class="popin" v-if="$store('params').currentModal == 'raffle'" @close="$store('params').currentModal = ''" :voiceControl="voiceControl" />
			<PredictionForm		class="popin" v-if="$store('params').currentModal == 'pred'" @close="$store('params').currentModal = ''" :voiceControl="voiceControl" />
			<BingoForm			class="popin" v-if="$store('params').currentModal == 'bingo'" @close="$store('params').currentModal = ''" />
			<LiveFollowings		class="popin" v-if="$store('params').currentModal == 'liveStreams'" @close="$store('params').currentModal = ''" />
			<StreamInfoForm		class="popin" v-if="$store('params').currentModal == 'streamInfo'" @close="$store('params').currentModal = ''" />
			<TTUserList			class="popin" v-if="$store('params').currentModal == 'TTuserList'" @close="$store('params').currentModal = ''" />
			<PinedMessages		class="popin" v-if="$store('params').currentModal == 'pins'" @close="$store('params').currentModal = ''" />
			<TimerForm			class="popin" v-if="$store('params').currentModal == 'timer'" @close="$store('params').currentModal = ''" />
			<TriggersLogs		class="popin" v-if="$store('params').currentModal == 'triggersLogs'" @close="$store('params').currentModal = ''" />
		</Teleport>


		<Teleport v-if="panelsColumnTarget" :to="panelsColumnTarget">
			<ChannelNotifications
				:currentContent="currentNotificationContent"
				@close="currentNotificationContent=''"
			/>
		</Teleport>


		<div class="bottom">
			<ChatForm class="chatForm" ref="chatForm"
				@poll="$store('params').currentModal = 'poll'"
				@chatpoll="$store('params').currentModal = 'chatpoll'"
				@pred="$store('params').currentModal = 'pred'"
				@raffle="$store('params').currentModal = 'raffle'"
				@bingo="$store('params').currentModal = 'bingo'"
				@liveStreams="$store('params').currentModal = 'liveStreams'"
				@TTuserList="$store('params').currentModal = 'TTuserList'"
				@pins="$store('params').currentModal = 'pins'"
				@search="searchMessage"
				@setCurrentNotification="setCurrentNotification"
				v-model:showEmotes="showEmotes" @update:showEmotes="(v:boolean) => showEmotes = v"
				v-model:showRewards="showRewards" @update:showRewards="(v:boolean) => showRewards = v"
				v-model:showCommands="showCommands" @update:showCommands="(v:boolean) => showCommands = v"
				v-model:showChatUsers="showChatUsers" @update:showChatUsers="(v:boolean) => showChatUsers = v"
				v-model:showShoutout="showShoutout" @update:showShoutout="(v:boolean) => showShoutout = v"
				v-model:showDevMenu="showDevMenu" @update:showDevMenu="(v:boolean) => showDevMenu = v"
			/>
		</div>

		<!-- Actually not used, what the API allows us to do is useless -->
		<RewardsList class="contentWindows rewards"
			v-if="showRewards"
			@close="showRewards = false" />

		<DevmodeMenu class="contentWindows devmode"
			v-if="showDevMenu"
			@triggersLogs="$store('params').currentModal = 'triggersLogs'"
			@close="showDevMenu = false" />

		<!-- <MessageList class="contentWindows feed"
			v-if="showFeed"
			@showModal="(v:string) => currentModal = v"
			:maxMessages="50 ?? $store('params').appearance.historySize.value" /> -->

		<CommandHelper class="contentWindows actions"
			v-if="showCommands"
			@close="showCommands = false"
		/>

		<EmoteSelector class="contentWindows emotes"
			v-if="showEmotes"
			@select="onSelectEmote"
			@close="showEmotes = false" />

		<UserList class="contentWindows users"
			v-if="showChatUsers"
			@close="showChatUsers = false" />

		<ShoutoutList class="contentWindows shoutout"
			v-if="showShoutout"
			@close="showShoutout = false" />
		
		<Parameters />
		
		<EmergencyFollowsListModal v-if="showEmergencyFollows && !forceEmergencyFollowClose" @close="forceEmergencyFollowClose=true" />

		<DonorState ref="donor" class="donorState" v-if="showDonorBadge" @click="closeDonorCard()" />

		<UserCard />

		<Changelog v-if="$store('params').currentModal == 'updates'" @close="$store('params').currentModal = ''" />

		<Gngngn v-if="$store('params').currentModal == 'gngngn'" @close="$store('params').currentModal = ''" />
		
		<Login v-if="$store('params').currentModal == 'login'" @close="$store('params').currentModal = ''" scopeOnly />

		<Teleport to="body">
			<div class="deezerCTA" v-if="needUserInteraction">
				<img src="@/assets/icons/deezer_color.svg" alt="deezer" class="icon">
				<div class="title">{{ $t("global.click") }}</div>
				<div class="message">{{ $t("music.deezer_interact") }}</div>
			</div>
		</Teleport>

		<ChatAlertMessage />
		
		<Accessibility />

		<div class="blinkLayer" ref="blinkLayer" v-if="showBlinkLayer" @click="showBlinkLayer=false"></div>
	</div>
</template>

<script lang="ts">
import BingoForm from '@/components/bingo/BingoForm.vue';
import Button from '@/components/Button.vue';
import Changelog from '@/components/changelog/Changelog.vue';
import ChannelNotifications from '@/components/channelnotifications/ChannelNotifications.vue';
import ChatForm from '@/components/chatform/ChatForm.vue';
import CommandHelper from '@/components/chatform/CommandHelper.vue';
import DevmodeMenu from '@/components/chatform/DevmodeMenu.vue';
import EmoteSelector from '@/components/chatform/EmoteSelector.vue';
import LiveFollowings from '@/components/chatform/LiveFollowings.vue';
import RewardsList from '@/components/chatform/RewardsList.vue';
import TTUserList from '@/components/chatform/TTUserList.vue';
import UserList from '@/components/chatform/UserList.vue';
import ChatSuggestionForm from '@/components/chatSugg/ChatSuggestionForm.vue';
import MessageList from '@/components/messages/MessageList.vue';
import GreetThem from '@/components/newusers/GreetThem.vue';
import Parameters from '@/components/params/Parameters.vue';
import PollForm from '@/components/poll/PollForm.vue';
import PredictionForm from '@/components/prediction/PredictionForm.vue';
import RaffleForm from '@/components/raffle/RaffleForm.vue';
import StreamInfoForm from '@/components/streaminfo/StreamInfoForm.vue';
import TriggersLogs from '@/components/triggerslogs/TriggersLogs.vue';
import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';
import TwitchatEvent from '@/events/TwitchatEvent';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import DeezerHelper from '@/utils/music/DeezerHelper';
import PublicAPI from '@/utils/PublicAPI';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import type { JsonObject } from 'type-fest';
import { Component, Vue } from 'vue-facing-decorator';
import ChatAlertMessage from '../components/chatAlert/ChatAlertMessage.vue';
import Gngngn from '../components/chatform/Gngngn.vue';
import PinedMessages from '../components/chatform/PinedMessages.vue';
import EmergencyFollowsListModal from '../components/modals/EmergencyFollowsListModal.vue';
import TimerForm from '../components/timer/TimerForm.vue';
import DonorState from '../components/user/DonorState.vue';
import UserCard from '../components/user/UserCard.vue';
import VoiceTranscript from '../components/voice/VoiceTranscript.vue';
import Accessibility from './Accessibility.vue';
import Login from './Login.vue';
import ShoutoutList from '@/components/chatform/ShoutoutList.vue';

@Component({
	components:{
		Login,
		Button,
		Gngngn,
		ChatForm,
		UserList,
		UserCard,
		PollForm,
		Changelog,
		TimerForm,
		GreetThem,
		BingoForm,
		DonorState,
		Parameters,
		RaffleForm,
		TTUserList,
		MessageList,
		DevmodeMenu,
		RewardsList,
		ShoutoutList,
		TriggersLogs,
		Accessibility,
		CommandHelper,
		EmoteSelector,
		PinedMessages,
		PredictionForm,
		LiveFollowings,
		StreamInfoForm,
		VoiceTranscript,
		ChatAlertMessage,
		ChatSuggestionForm,
		ChannelNotifications,
		EmergencyFollowsListModal,
	},
})
export default class Chat extends Vue {

	public showDonorBadge = true;
	public showEmotes = false;
	public showRewards = false;
	public showDevMenu = false;
	public showCommands = false;
	public voiceControl = false;
	public showShoutout = false;
	public showChatUsers = false;
	public showBlinkLayer = false;
	public panelsColIndexTarget = 0;
	public forceEmergencyFollowClose = false;
	public panelsColumnTarget:HTMLDivElement|null = null;
	public currentNotificationContent:TwitchatDataTypes.NotificationTypes = "";
	
	private disposed = false;
	private mouseX = 0;
	private mouseY = 0;
	private resizing = false;
	private closingDonorState = false;
	private draggedCol:TwitchatDataTypes.ChatColumnsConfig|null = null;
	
	private mouseUpHandler!:(e:MouseEvent|TouchEvent)=> void;
	private mouseMoveHandler!:(e:MouseEvent|TouchEvent)=> void;
	private publicApiEventHandler!:(e:TwitchatEvent)=> void;
	private addMessageHandler!: (e: GlobalEvent) => void;
	
	public get splitViewVertical():boolean { return this.$store("params").appearance.splitViewVertical.value as boolean; }
	public get needUserInteraction():boolean { return Config.instance.DEEZER_CONNECTED && !DeezerHelper.instance.userInteracted; }
	public get showEmergencyFollows():boolean { return this.$store("emergency").follows.length > 0 && !this.$store("emergency").emergencyStarted; }

	public get classes():string[] {
		const res = ["chat"];
		if(this.splitViewVertical) res.push("splitVertical")
		return res;
	}

	public getColStyles(col:TwitchatDataTypes.ChatColumnsConfig):{[key:string]:string} {
		let size = col.size * 100;
		const cols = this.$store('params').chatColumnsConfig;
		if(cols.length == 1) {
			return {
				width:"100%",
				height:"100%",
			}
		}
		const value = `${size}%`;
		if(this.splitViewVertical) {
			return {
				"height": value,
				"min-height": "max(200px, "+value+")",
				"max-height": value,
			}
		}else{
			return {
				"width": value,
				"min-width": "max(200px, "+value+")",
				"max-width": value,
			}
		}
	}

	public beforeMount():void {

		//Check user reached a new donor level
		this.showDonorBadge = StoreProxy.auth.twitch.user.donor.state && StoreProxy.auth.twitch.user.donor.upgrade===true;
		
		// Function that attempts to request a screen wake lock.
		const requestWakeLock = async () => {
			try {
				await navigator.wakeLock.request("screen");
			} catch (err) {
				const error = err as {name:string, message:string}
				console.error(`${error.name}, ${error.message}`);
			}
		};

		//Auto opens the prediction status if pending for completion
		watch(() => this.$store("prediction").data, (newValue, prevValue) => {
			let prediction = this.$store("prediction").data;
			const isNew = !prevValue || (newValue && prevValue.id != newValue.id);
			if(prediction && prediction.pendingAnswer || isNew) this.setCurrentNotification("prediction");
		});

		//Auto opens the poll status if terminated
		watch(() => this.$store("poll").data, (newValue, prevValue) => {
			let poll = this.$store("poll").data;
			const isNew = !prevValue || (newValue && prevValue.id != newValue.id);
			if(poll && isNew) this.setCurrentNotification("poll");
		});

		//Auto opens the bingo status when created
		watch(() => this.$store("bingo").data, () => {
			let bingo = this.$store("bingo").data;
			if(bingo) this.setCurrentNotification("bingo");
		});

		//Auto opens the raffle status when created
		watch(() => this.$store("raffle").data, () => {
			let raffle = this.$store("raffle").data;
			if(raffle && (raffle.command || raffle.reward_id)) this.setCurrentNotification("raffle");
		});

		//Watch for columns changes
		watch(() => this.$store('params').chatColumnsConfig, () => {
			this.computeWindowsSizes();
		}, {deep:true});

		//Watch for columns changes
		watch(() => this.$store('auth').newScopesToRequest, () => {
			if(this.$store('auth').newScopesToRequest.length === 0) return null;
			this.$store("params").currentModal = "login";
		}, {deep:true});

		//Watch for current modal to be displayed
		watch(()=>this.$store("params").currentModal, (value)=>{
			this.voiceControl = false;

			if(this.panelsColumnTarget && value) {
				const col = this.panelsColumnTarget.parentNode as HTMLDivElement;
				const scrollable = this.$refs.scrollable as HTMLDivElement;
				const scrollTo = {x:col.offsetLeft - (scrollable.offsetWidth-col.offsetWidth), y:col.offsetTop - (scrollable.offsetHeight - col.offsetHeight)/2};
				gsap.to(scrollable, {duration: .75, ease:"sine.inOut", scrollTo});
			}
		})

		//Handle chat alert feature
		watch(() => this.$store("main").chatAlert, async () => {
			if(this.$store("main").chatAlert != null) {
				if(this.$store("params").features.alertMode.value !== true) return;
				
				const params = this.$store("main").chatAlertParams;
				gsap.killTweensOf(this.$el);
				if(params.shake) {
					gsap.fromTo(this.$el, {x:-10}, {duration:0.01, x:10, clearProps:"x", repeat:60});
					gsap.fromTo(this.$el, {y:-10}, {duration:0.02, y:10, clearProps:"y", repeat:30})
				}
				if(params.blink) {
					this.showBlinkLayer = true;
					await this.$nextTick();
					const layer = this.$refs.blinkLayer as HTMLDivElement;
					gsap.killTweensOf(layer);
					gsap.fromTo(layer, {opacity:0}, {duration:0.17, opacity:1, clearProps:"opacity", repeat:3,
						onComplete:()=>{
							this.showBlinkLayer = false;
						}});
				}
				if(params.sound) {
					new Audio(this.$image("sounds/wizz.mp3")).play();
				}
			}
		});

		//Reset emotes cache if changing BTTV/FFZ/7TV states
		watch(()=> this.$store("params").appearance.bttvEmotes.value, ()=> {
			this.$store("chat").emoteSelectorCache = [];
		})
		watch(()=> this.$store("params").appearance.ffzEmotes.value, ()=> {
			this.$store("chat").emoteSelectorCache = [];
		})
		watch(()=> this.$store("params").appearance.sevenTVEmotes.value, ()=> {
			this.$store("chat").emoteSelectorCache = [];
		})

		this.publicApiEventHandler = (e:TwitchatEvent) => this.onPublicApiEvent(e);
		this.mouseUpHandler = () => this.resizing = false;
		this.mouseMoveHandler = (e:MouseEvent|TouchEvent) => this.onMouseMove(e);
		this.addMessageHandler = (e: GlobalEvent) => this.onAddMessage(e);

		document.addEventListener("mouseup", this.mouseUpHandler);
		document.addEventListener("touchend", this.mouseUpHandler);
		document.addEventListener("mousemove", this.mouseMoveHandler);
		document.addEventListener("touchmove", this.mouseMoveHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.POLL_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.PREDICTION_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.BINGO_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.RAFFLE_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.VIEWERS_COUNT_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.MOD_TOOLS_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CENSOR_DELETED_MESSAGES_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.POLL_START, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.POLL_END, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.PREDICTION_START, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.PREDICTION_END, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.RAFFLE_START, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.RAFFLE_END, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.START_EMERGENCY, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.STOP_EMERGENCY, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.SHOUTOUT, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_COLS_COUNT, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.COUNTER_ADD, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.COUNTER_GET, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.COUNTER_GET_ALL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CLEAR_CHAT_HIGHLIGHT, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.TIMER_ADD, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.COUNTDOWN_ADD, this.publicApiEventHandler);
		EventBus.instance.addEventListener(GlobalEvent.ADD_MESSAGE, this.addMessageHandler);
		this.renderFrame();
		requestWakeLock();
	}

	public mounted():void {
		if(this.showDonorBadge) {
			//Show donor badge
			const el = (this.$refs.donor as Vue).$el as HTMLDivElement;
			gsap.from(el, {bottom:"-350px", duration:2, ease:"back.out", delay:1});
		}
		this.computeWindowsSizes();
	}

	public beforeUnmount():void {
		this.disposed = true;
		document.removeEventListener("mouseup", this.mouseUpHandler);
		document.removeEventListener("touchend", this.mouseUpHandler);
		document.removeEventListener("mousemove", this.mouseMoveHandler);
		document.removeEventListener("touchmove", this.mouseMoveHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.POLL_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.PREDICTION_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.BINGO_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.RAFFLE_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.VIEWERS_COUNT_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.MOD_TOOLS_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CENSOR_DELETED_MESSAGES_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.POLL_START, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.POLL_END, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.PREDICTION_START, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.PREDICTION_END, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.RAFFLE_START, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.RAFFLE_END, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.START_EMERGENCY, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.STOP_EMERGENCY, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.SHOUTOUT, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GET_COLS_COUNT, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.COUNTER_ADD, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.COUNTER_GET, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.COUNTER_GET_ALL, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CLEAR_CHAT_HIGHLIGHT, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.TIMER_ADD, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.COUNTDOWN_ADD, this.publicApiEventHandler);
		EventBus.instance.removeEventListener(GlobalEvent.ADD_MESSAGE, this.addMessageHandler);
	}

	public closeDonorCard():void {
		if(this.closingDonorState) return;
		//Show donor badge
		this.closingDonorState = true;
		const el = (this.$refs.donor as Vue).$el as HTMLDivElement;
		gsap.to(el, {bottom:"-350px", duration:1, ease:"back.in", onComplete:()=>{
			this.showDonorBadge = false;
		}});
	}

	/**
	 * Called when requesting an action from the public API
	 */
	private async onPublicApiEvent(e:TwitchatEvent):Promise<void> {
		let notif:TwitchatDataTypes.NotificationTypes = "";
		let modal:TwitchatDataTypes.ModalTypes = "";
		switch(e.type) {
			case TwitchatEvent.POLL_TOGGLE: notif = 'poll'; break;
			case TwitchatEvent.PREDICTION_TOGGLE: notif = 'prediction'; break;
			case TwitchatEvent.BINGO_TOGGLE: notif = 'bingo'; break;
			case TwitchatEvent.RAFFLE_TOGGLE: notif = 'raffle'; break;
			case TwitchatEvent.VIEWERS_COUNT_TOGGLE:
				this.$store("params").appearance.showViewersCount.value = !this.$store("params").appearance.showViewersCount.value;
				this.$store("params").updateParams()
				break;

			case TwitchatEvent.MOD_TOOLS_TOGGLE:
				this.$store("params").features.showModTools.value = !this.$store("params").features.showModTools.value;
				this.$store("params").updateParams()
				break;

			case TwitchatEvent.GET_COLS_COUNT:
				PublicAPI.instance.broadcast(TwitchatEvent.SET_COLS_COUNT,{count:this.$store('params').chatColumnsConfig.length});
				break;

			case TwitchatEvent.CENSOR_DELETED_MESSAGES_TOGGLE:
				this.$store("params").appearance.censorDeletedMessages.value = !this.$store("params").appearance.censorDeletedMessages.value;
				this.$store("params").updateParams()
				break;

			case TwitchatEvent.POLL_START:
				this.$store('params').currentModal = 'poll';
				await this.$nextTick();
				this.voiceControl = true;
				break;
			case TwitchatEvent.POLL_CREATE:{
				const poll = this.$store("poll").data;
				if(!poll) return;
				try {
					await TwitchUtils.endPoll(poll.id, poll.channel_id);
				}catch(error) {
					this.$store("main").alert(this.$t("error.twitch_poll_delete"));
				}
				break;
			}

			case TwitchatEvent.PREDICTION_START:
				this.$store('params').currentModal = 'pred';
				await this.$nextTick();
				this.voiceControl = true;
				break;
			case TwitchatEvent.PREDICTION_CREATE:{
				const prediction = this.$store("prediction").data;
				if(!prediction) return;
				try {
					await TwitchUtils.endPrediction(prediction.channel_id, prediction.id, prediction.outcomes[0].id, true);
				}catch(error) {
					this.$store("main").alert(this.$t("error.twitch_prediction_delete"))
				}
				break;
			}

			case TwitchatEvent.RAFFLE_START:{
				this.$store('params').currentModal = 'raffle';
				await this.$nextTick();
				this.voiceControl = true;
				break;
			}
			case TwitchatEvent.RAFFLE_END:{
				this.$confirm(this.$t("raffle.delete_confirm.title"), this.$t("raffle.delete_confirm.description"), undefined, undefined, undefined, true)
				.then(async ()=> {
					this.$store("raffle").stopRaffle();
				}).catch(()=> {
					//ignore
				});
				break;
			}

			case TwitchatEvent.START_EMERGENCY:{
				this.$confirm(this.$t("emergency.enable_confirm"), undefined, undefined, undefined, undefined, true).then(()=>{
					this.$store("emergency").setEmergencyMode(true);
				}).catch(()=>{});
				break;
			}
			case TwitchatEvent.STOP_EMERGENCY:{
				this.$store("emergency").setEmergencyMode(false);
				break;
			}

			case TwitchatEvent.COUNTER_GET: {
				const id = (e.data as JsonObject).cid;
				const counter = this.$store("counters").counterList.find(v=>v.id == id);
				if(counter) {
					PublicAPI.instance.broadcast(TwitchatEvent.COUNTER_UPDATE, {counter:(counter as unknown) as JsonObject});
				}
				break;
			}

			case TwitchatEvent.COUNTER_ADD: {
				const id = (e.data as JsonObject).counterId as string;
				const value = parseInt((e.data as JsonObject).countAdd as string);
				const counter = this.$store("counters").counterList.find(v=>v.id == id);
				if(counter && !isNaN(value)) {
					this.$store("counters").increment(id, value);
				}
				break;
			}

			case TwitchatEvent.COUNTER_GET_ALL: {
				const counters = this.$store("counters").counterList.map(v=> {
					return {
						id:v.id,
						name:v.name,
						perUser:v.perUser === true,
					}
				});
				if(counters) {
					PublicAPI.instance.broadcast(TwitchatEvent.COUNTER_LIST, {counters});
				}
				break;
			}

			case TwitchatEvent.CLEAR_CHAT_HIGHLIGHT: {
				this.$store("chat").highlightChatMessageOverlay();
				break;
			}
			
			case TwitchatEvent.TIMER_ADD: {
				const durationStr = (e.data as JsonObject).timeAdd as string ?? "1";
				const durationMs = isNaN(parseInt(durationStr))? 1000 : parseInt(durationStr) * 1000;
				if(durationMs > 0) {
					this.$store("timer").timerAdd(durationMs);
				}else{
					this.$store("timer").timerRemove(-durationMs);
				}
				break;
			}

			case TwitchatEvent.COUNTDOWN_ADD: {
				const durationStr = (e.data as JsonObject).timeAdd as string ?? "1";
				const durationMs = isNaN(parseInt(durationStr))? 1000 : parseInt(durationStr) * 1000;
				if(durationMs > 0) {
					this.$store("timer").countdownAdd(durationMs);
				}else{
					this.$store("timer").countdownRemove(-durationMs);
				}
				break;
			}
		}

		if(notif) {
			if(this.currentNotificationContent == notif) {
				this.setCurrentNotification("");
			}else{
				this.setCurrentNotification(notif);
			}
		}

		if(modal) {
			if(this.$store('params').currentModal == modal) {
				this.$store('params').currentModal = "";
			}else{
				this.$store('params').currentModal = modal;
			}
		}
	}

	/**
	 * Called when a message is added.
	 * If its the changelog message, open up the highlighted changelog
	 */
	private async onAddMessage(e: GlobalEvent): Promise<void> {
		// const el = this.$refs.chatMessageHolder as HTMLDivElement;
		// const maxScroll = (el.scrollHeight - el.offsetHeight);
		const m = e.data as TwitchatDataTypes.ChatMessageTypes;
		if(m.type == TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD
		&& m.adType == TwitchatDataTypes.TwitchatAdTypes.UPDATES) {
			this.$store('params').currentModal = "updates";
		}
	}

	public setCurrentNotification(value:TwitchatDataTypes.NotificationTypes):void {
		this.currentNotificationContent = value;
	}

	/**
	 * Called when selecting an emote from the emote selectors
	 */
	public onSelectEmote(item:string):void {
		(this.$refs.chatForm as ChatForm).onSelectItem(item);
	}

	/**
	 * Called when searching for a message
	 */
	public searchMessage(str:string):void {
		this.$store('params').currentModal = 'search';
	}

	/**
	 * Called when starting window resize
	 */
	public startDrag(event:PointerEvent, col:TwitchatDataTypes.ChatColumnsConfig):void {
		this.resizing = true;
		this.draggedCol = col;
		(event.target as HTMLDivElement).setPointerCapture(event.pointerId);
	}

	/**
	 * Expand the selected col
	 * @param col 
	 */
	public expandCol(col:TwitchatDataTypes.ChatColumnsConfig):void{
		const colList = this.$store("params").chatColumnsConfig;
		let totalSize = 0;
		for (let i = 0; i < colList.length; i++) {
			const c = colList[i];
			totalSize += c.size;
		}

		//If there's available space on the screen
		//expand the col to fill it
		if(totalSize < 1) {
			col.size += 1 - totalSize;
		}
	}

	/**
	 * Add a chat column
	 */
	public addColumn(ref:TwitchatDataTypes.ChatColumnsConfig):void {
		let col = this.$store("params").addChatColumn(ref);
		const colList = this.$store("params").chatColumnsConfig;
		let totalSize = 0;
		for (let i = 0; i < colList.length; i++) {
			const c = colList[i];
			totalSize += c.size;
		}

		//If after adding a new column if there's still some remaining space
		//expand the new col to fill that space
		if(totalSize < 1) {
			col.size += 1 - totalSize;
		}
		
		const holder = this.$refs.scrollable as HTMLDivElement;
		this.$nextTick().then(()=>{
			//Scroll to to the new col
			let colHolder = this.$refs["column_"+col.id] as HTMLDivElement[];
			let bounds = colHolder[0].getBoundingClientRect();
			
			let scrollTo = this.splitViewVertical? {y:bounds.top + bounds.height - holder.offsetHeight} : {x:bounds.left + bounds.width - holder.offsetWidth};
			gsap.to(holder, {duration:.75, ease:"sine.inOut", scrollTo});
			this.computeWindowsSizes();
		});
	}

	/**
	 * Called when the mouse moves
	 */
	private async onMouseMove(e:MouseEvent|TouchEvent):Promise<void> {
		if(e.type == "mousemove") {
			this.mouseX = (e as MouseEvent).clientX;
			this.mouseY = (e as MouseEvent).clientY;
		}else{
			this.mouseX = (e as TouchEvent).touches[0].clientX;
			this.mouseY = (e as TouchEvent).touches[0].clientY;
		}
	}

	/**
	 * Manage colmumns resize
	 */
	private async renderFrame():Promise<void> {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());

		if(!this.resizing) return;
		
		const cols = this.$store('params').chatColumnsConfig;
		const holder = this.$refs.scrollable as HTMLDivElement;
		const holderBounds = holder.getBoundingClientRect();
		for (let i = 0; i < cols.length; i++) {
			const c = cols[i];
			if(c == this.draggedCol) {
				const el = (this.$refs["column_"+c.id] as HTMLDivElement[])[0];
				const bounds = el.getBoundingClientRect();
				if(this.splitViewVertical) {
					c.size = Math.max(215, this.mouseY - bounds.top + 7) / holderBounds.height;
				}else{
					c.size = Math.max(215, this.mouseX - bounds.left + 7) / holderBounds.width;
				}
			}
		}
		if(cols.length == 2) {
			//Special case if there are only 2 cols, autoresize the second one
			//and prevent from being able to resize it independently from the
			//first one as it's confusing people.
			//But for more than 2 cols I'd like to keep the resize capabilities
			//on all cols including the last.
			cols[1].size = 1 - cols[0].size;
		}
		
		this.$store('params').saveChatColumnConfs();

		this.computeWindowsSizes();
	}

	/**
	 * Computes the form windows styles depending on the existing columns.
	 * Search for a column that filters out messages and match the form to
	 * its size if any so the messages stay visible.
	 * If none found, the windows will just be displayed full screen.
	 */
	private async computeWindowsSizes():Promise<void> {
		await this.$nextTick();
		const cols = this.$store('params').chatColumnsConfig;
		cols.sort((a,b)=> a.order - b.order);
		let colId = "";
		let index = 0;
		for (let i = 0; i < cols.length; i++) {
			const c = cols[i];
			if(c.showPanelsHere == true) {
				colId = c.id;
				index = i;
			}
		}
		
		const colHolders = this.$refs["column_"+colId] as HTMLDivElement[];
		let selectedCol = colHolders? colHolders[0] : null;

		if(!selectedCol) {
			//Fallback to last col if none is selected
			index = cols.length-1;
			selectedCol = (this.$refs["column_"+cols[index].id] as HTMLDivElement[])[0];
		}
		this.panelsColIndexTarget = index;
		this.panelsColumnTarget = selectedCol.getElementsByClassName("subHolder")[0] as HTMLDivElement;
	}
}



</script>

<style scoped lang="less">
.chat{
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;

	.donorState {
		.center();
		position: absolute;
		top: auto;
		bottom: 0;
		z-index: 10;
	}


	&.splitVertical {
		.top {
			height: 100%;
			flex-direction: column;
			.scrollable {
				height: 100%;
				flex-direction: column;
				overflow: hidden;
				overflow-y: auto;
				.column {
					flex-direction: column;
					
					.subHolder {
						height: calc(100% - 14px);//14px => dragbar height
					}
					.dragBt {
						padding: 3px 0;
						cursor: ns-resize;
						width: 100%;
						.grip {
							position: relative;
							left: unset;
							top: 50%;
							width: 100%;
							height: 1px;
							background: @mainColor_dark_light;
							&::before {
								height: 5px;
								width: 40px;
								background: linear-gradient(90deg,
												@mainColor_dark_light 30%,
												@mainColor_dark 30%,
												@mainColor_dark 35%,
												@mainColor_dark_light 35%,
												@mainColor_dark_light 45%,
												@mainColor_dark 45%,
												@mainColor_dark 50%,
												@mainColor_dark_light 50%,
												@mainColor_dark_light 60%,
												@mainColor_dark 60%,
												@mainColor_dark 65%,
												@mainColor_dark_light 65%,
											);
							}
						}
					}
				}
			}
		}
	}

	.contentWindows {
		&.emotes {
			right: 0;
			left: auto;
			max-width: 50vw;
			margin: auto;
		}
	}
	.tts {
		position: absolute;
		bottom: 0;
	}

	.top {
		flex-grow: 1;
		margin: auto;
		display: flex;
		flex-direction: row;
		overflow: hidden;
		width: 100%;
		
		.scrollable {
			display: flex;
			flex-grow: 1;
			flex-direction: row;
			overflow: hidden;
			overflow-x: auto;
			width: 100%;

			.column {
				position: relative;
				display: flex;
				flex-direction: row;
	
				.subHolder {
					display: flex;
					flex-direction: column;
					width: 100%;
					position: relative;
					.messages {
						flex-grow: 1;
						overflow: hidden;
					}
				}
	
				.dragBt {
					padding: 0 3px;
					cursor: ew-resize;
					user-select: none;
					z-index: 2;
					height: 100%;
					flex-basis: 14px;
					.grip {
						position: relative;
						left: 50%;
						height: 100%;
						width: 1px;
						background: @mainColor_dark_light;
						&::before {
							content:"";
							position: absolute;
							.center();
							display: block;
							width: 5px;
							height: 40px;
							background: @mainColor_dark_light;
							background: linear-gradient(0deg,
											@mainColor_dark_light 30%,
											@mainColor_dark 30%,
											@mainColor_dark 35%,
											@mainColor_dark_light 35%,
											@mainColor_dark_light 45%,
											@mainColor_dark 45%,
											@mainColor_dark 50%,
											@mainColor_dark_light 50%,
											@mainColor_dark_light 60%,
											@mainColor_dark 60%,
											@mainColor_dark 65%,
											@mainColor_dark_light 65%,
										);
						}
					}
				}
			}
		}

		.addCol {
			flex-grow: 1;
			position: relative;
			min-width: 1em;
			z-index: 2;
			.button {
				position: absolute;
				right: 0;
				top: 50%;
				padding-right: .12em;
				transform: translateY(-50%);
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
		}
	}

	.popin {
		position: absolute;
		z-index: 2;
		top:0;
		left:0;
		height: 100%;
		width: 100%;
		:deep(.holder) {
			max-height: 100% !important;
		}
	}

	.contentWindows {
		position: absolute;
		bottom: 45px;
		left: 0;
		z-index: 2;

		&.emotes {
			max-width: 100%;
		}

		&.users {
			max-height: 80vh;
			width: 100%;
		}
	}

	.blinkLayer {
		width: 100vw;
		height: 100vh;
		background-color: fade(#c00, 70%);
		position: absolute;
		top: 0;
		left: 0;
		z-index: 2;
	}
}
</style>
<style lang="less">
	.deezerCTA {
		position: absolute;
		top: 50%;
		left: 50%;
		background: rgba(255, 0, 0, .25);
		transform: translate(-50%, -50%);
		z-index: 6;
		pointer-events: none;
		color: @mainColor_normal;
		text-align: center;
		text-shadow: 0 1px 1px rgba(0, 0, 0, .5);

		.icon {
			height: 4em;
		}

		.title {
			font-size: 3em;
			font-weight: bold;
			margin: .25em 0;
		}
		.message {
			font-size: 1.5em;
		}
	}
</style>