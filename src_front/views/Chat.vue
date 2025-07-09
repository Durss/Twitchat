<template>
	<div :class="classes">
		<div class="offlineTitle" v-if="$store.main.offlineMode"
		v-tooltip="{content:$t('global.offlineMode'), placement:'bottom'}"><Icon name="alert"/></div>
		<div class="top" ref="top">
			<div class="scrollable" ref="scrollable" @scroll="onScrollColumns()">
				<div class="column" v-for="c, index in $store.params.chatColumnsConfig"
				:ref="'column_'+c.id"
				:key="c.id"
				:style="getColStyles(c)">
					<div class="subHolder" v-if="buildIndex >= index">
						<GreetThem class="greetThem" v-if="greetColIndexTarget == c.order && $store.params.features.firstMessage.value === true" />

						<MessageList ref="messages" class="messages"
							@addColumn="addColumn"
							:config="c"
							filterId="chat"/>
					</div>

					<div class="dragBt"
						v-if="$store.params.chatColumnsConfig.length > 1
						&& (c.order == 0 || $store.params.chatColumnsConfig.length > 2)"
						@dblclick="expandCol(c)"
						@pointerdown="startDrag($event, c)">
						<div class="grip"></div>
					</div>
				</div>
			</div>
		</div>

		<Teleport v-if="panelsColumnTarget && buildIndex >= 1 + $store.params.chatColumnsConfig.length" :to="panelsColumnTarget">
			<VoiceTranscript class="tts" />

			<PollForm				class="popin" v-if="$store.params.currentModal == 'poll'" @close="$store.params.closeModal()" :voiceControl="voiceControl" />
			<ChatPollForm			class="popin" v-if="$store.params.currentModal == 'chatPoll'" @close="$store.params.closeModal()" />
			<ChatSuggestionForm		class="popin" v-if="$store.params.currentModal == 'chatsuggForm'" @close="$store.params.closeModal()" :voiceControl="voiceControl" />
			<RaffleForm				class="popin" v-if="$store.params.currentModal == 'raffle'" @close="$store.params.closeModal()" :voiceControl="voiceControl" />
			<PredictionForm			class="popin" v-if="$store.params.currentModal == 'pred'" @close="$store.params.closeModal()" :voiceControl="voiceControl" />
			<BingoForm				class="popin" v-if="$store.params.currentModal == 'bingo'" @close="$store.params.closeModal()" />
			<BingoGridForm			class="popin" v-if="$store.params.currentModal == 'bingo_grid'" @close="$store.params.closeModal()" />
			<LiveFollowings			class="popin" v-if="$store.params.currentModal == 'liveStreams'" @close="$store.params.closeModal()" />
			<StreamInfoForm			class="popin" v-if="$store.params.currentModal == 'streamInfo'" @close="$store.params.closeModal()" />
			<TTUserList				class="popin" v-if="$store.params.currentModal == 'TTuserList'" @close="$store.params.closeModal()" />
			<PinedMessages			class="popin" v-if="$store.params.currentModal == 'pins'" @close="$store.params.closeModal()" />
			<TimerForm				class="popin" v-if="$store.params.currentModal == 'timer'" @close="$store.params.closeModal()" />
			<TriggersLogs			class="popin" v-if="$store.params.currentModal == 'triggersLogs'" @close="$store.params.closeModal()" />
			<HeatLogs				class="popin" v-if="$store.params.currentModal == 'heatLogs'" @close="$store.params.closeModal()" />
			<ObsHeatLogs			class="popin" v-if="$store.params.currentModal == 'obsHeatLogs'" @close="$store.params.closeModal()" />
			<TrackedUsers			class="popin" v-if="$store.params.currentModal == 'tracked'" @close="$store.params.closeModal()" />
			<WhispersState			class="popin" v-if="$store.params.currentModal == 'whispers'" @close="$store.params.closeModal()" />
			<ChatSuggestionState	class="popin" v-if="$store.params.currentModal == 'chatsuggState'" @close="$store.params.closeModal()" />
			<MessageSearch			class="popin" v-if="$store.params.currentModal == 'search'" @close="$store.params.closeModal()" />
			<TwitchatAnnouncement	class="popin" v-if="$store.params.currentModal == 'twitchatAnnouncement'" @close="$store.params.closeModal()" />
			<StreamSummary			class="popin" v-if="$store.params.currentModal == 'streamSummary'" @close="$store.params.closeModal()" />
			<Extensions				class="popin" v-if="$store.params.currentModal == 'extensions'" @close="$store.params.closeModal()" />
			<QnaForm				class="popin" v-if="$store.params.currentModal == 'qnaForm'" @close="$store.params.closeModal()" />
			<QnaList				class="popin" v-if="$store.params.currentModal == 'qna'" @close="$store.params.closeModal()" />
			<GroqHistory			class="popin" v-if="$store.params.currentModal == 'groqHistory'" @close="$store.params.closeModal()" />
			<UserCard				class="popin"  />
		</Teleport>


		<Teleport v-if="panelsColumnTarget && buildIndex >= 2 + $store.params.chatColumnsConfig.length" :to="panelsColumnTarget">
			<ChannelNotifications
				:currentContent="currentNotificationContent"
				@close="currentNotificationContent=''"
			/>
		</Teleport>

		<NonPremiumCleanup v-if="mustDisableItems" @close="mustDisableItems_precalc = false" />

		<OutdatedDataVersionAlert v-if="$store.main.outdatedDataVersion" />

		<div class="bottom">
			<ChatForm class="chatForm" ref="chatForm"
				v-if="buildIndex >= 3 + $store.params.chatColumnsConfig.length"
				@search="searchMessage"
				@setCurrentNotification="setCurrentNotification"
				v-model:showEmotes="showEmotes" @update:showEmotes="(v:boolean) => showEmotes = v"
				v-model:showRewards="showRewards" @update:showRewards="(v:boolean) => showRewards = v"
				v-model:showCommands="showCommands" @update:showCommands="(v:boolean) => showCommands = v"
				v-model:showChatUsers="showChatUsers" @update:showChatUsers="(v:boolean) => showChatUsers = v"
				v-model:showShoutout="showShoutout" @update:showShoutout="(v:boolean) => showShoutout = v"
				v-model:showDevMenu="showDevMenu" @update:showDevMenu="(v:boolean) => showDevMenu = v"
				v-model:showCredits="showCredits" @update:showCredits="(v:boolean) => showCredits = v"
				v-model:showBingoGrid="showBingoGrid" @update:showBingoGrid="(v:boolean) => showBingoGrid = v"
				v-model:showGazaFunds="showGazaFunds" @update:showGazaFunds="(v:boolean) => showGazaFunds = v"
				v-model:showPins="showPins" @update:showPins="(v:boolean) => showPins = v"
			/>
		</div>

		<RewardsList class="contentWindows rewards"
			v-if="showRewards"
			@close="showRewards = false" />

		<DevmodeMenu class="contentWindows devmode"
			v-if="showDevMenu"
			@triggersLogs="$store.params.openModal('triggersLogs')"
			@obsHeatLogs="$store.params.openModal('obsHeatLogs')"
			@close="showDevMenu = false" />

		<CommandHelper class="contentWindows actions"
			v-if="showCommands"
			v-model:showChatUsers="showChatUsers" @update:showChatUsers="(v:boolean) => showChatUsers = v"
			v-model:showRewards="showRewards" @update:showRewards="(v:boolean) => showRewards = v"
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

		<EndingCreditsControls class="contentWindows credits"
			v-if="showCredits"
			@close="showCredits = false" />

		<BingoGridControls class="contentWindows bingoGrid"
			v-if="showBingoGrid"
			@close="showBingoGrid = false" />

		<PinsList class="contentWindows mpins"
			v-if="showPins"
			@close="showPins = false" />

		<Parameters v-if="buildIndex >= 5 + $store.params.chatColumnsConfig.length" />

		<EmergencyFollowsListModal v-if="showEmergencyFollows && !forceEmergencyFollowClose" @close="forceEmergencyFollowClose=true" />

		<DonorBadge ref="donor" class="donorState" v-if="showDonorBadge" @click="closeDonorCard()" />

		<Changelog v-if="$store.params.currentModal == 'updates'" @close="$store.params.closeModal()" />

		<Gngngn v-if="$store.params.currentModal == 'gngngn'" @close="$store.params.closeModal()" />

		<Login v-if="$store.auth.newScopesToRequest.length > 0" scopeOnly />

		<ShareParams v-if="$store.params.currentModal == 'shareParams'" @close="$store.params.closeModal()" />

		<ChatAlertMessage v-if="buildIndex >= 4 + $store.params.chatColumnsConfig.length" />

		<HelpGenocideVictims v-if="showGazaFunds" @close="showGazaFunds = false" />

		<Accessibility />

		<div class="blinkLayer" ref="blinkLayer" v-if="showBlinkLayer" @click="showBlinkLayer=false"></div>
	</div>
</template>

<script lang="ts">
import BingoForm from '@/components/bingo/BingoForm.vue';
import BingoGridForm from '@/components/bingo_grid/BingoGridForm.vue';
import Changelog from '@/components/changelog/Changelog.vue';
import ChannelNotifications from '@/components/channelnotifications/ChannelNotifications.vue';
import ChatSuggestionForm from '@/components/chatSugg/ChatSuggestionForm.vue';
import ChatSuggestionState from '@/components/chatSugg/ChatSuggestionState.vue';
import BingoGridControls from '@/components/chatform/BingoGridControls.vue';
import ChatForm, { ChatForm as ChatFormClass } from '@/components/chatform/ChatForm.vue';
import CommandHelper from '@/components/chatform/CommandHelper.vue';
import DevmodeMenu from '@/components/chatform/DevmodeMenu.vue';
import EmoteSelector from '@/components/chatform/EmoteSelector.vue';
import EndingCreditsControls from '@/components/chatform/EndingCreditsControls.vue';
import Extensions from '@/components/chatform/Extensions.vue';
import GroqHistory from '@/components/chatform/GroqHistory.vue';
import HelpGenocideVictims from '@/components/chatform/HelpGenocideVictims.vue';
import LiveFollowings from '@/components/chatform/LiveFollowings.vue';
import MessageSearch from '@/components/chatform/MessageSearch.vue';
import NonPremiumCleanup from '@/components/chatform/NonPremiumCleanup.vue';
import OutdatedDataVersionAlert from '@/components/chatform/OutdatedDataVersionAlert.vue';
import PinsList from '@/components/chatform/PinsList.vue';
import QnaForm from '@/components/chatform/QnaForm.vue';
import QnaList from '@/components/chatform/QnaList.vue';
import RewardsList from '@/components/chatform/RewardsList.vue';
import ShoutoutList from '@/components/chatform/ShoutoutList.vue';
import StreamSummary from '@/components/chatform/StreamSummary.vue';
import TTUserList from '@/components/chatform/TTUserList.vue';
import TwitchatAnnouncement from '@/components/chatform/TwitchatAnnouncement.vue';
import UserList from '@/components/chatform/UserList.vue';
import HeatLogs from '@/components/heatlogs/HeatLogs.vue';
import MessageList from '@/components/messages/MessageList.vue';
import GreetThem from '@/components/newusers/GreetThem.vue';
import ObsHeatLogs from '@/components/obs/ObsHeatLogs.vue';
import Parameters from '@/components/params/Parameters.vue';
import ChatPollForm from '@/components/poll/ChatPollForm.vue';
import PollForm from '@/components/poll/PollForm.vue';
import PredictionForm from '@/components/prediction/PredictionForm.vue';
import RaffleForm from '@/components/raffle/RaffleForm.vue';
import StreamInfoForm from '@/components/streaminfo/StreamInfoForm.vue';
import TrackedUsers from '@/components/tracked/TrackedUsers.vue';
import TriggersLogs from '@/components/triggerslogs/TriggersLogs.vue';
import DonorBadge from '@/components/user/DonorBadge.vue';
import WhispersState from '@/components/whispers/WhispersState.vue';
import TwitchatEvent from '@/events/TwitchatEvent';
import MessengerProxy from '@/messaging/MessengerProxy';
import type { TriggerActionCountDataAction } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import PublicAPI from '@/utils/PublicAPI';
import TriggerUtils from '@/utils/TriggerUtils';
import Utils from '@/utils/Utils';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from '@vue/runtime-core';
import { gsap } from 'gsap/gsap-core';
import type { JsonObject } from 'type-fest';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import ChatAlertMessage from '../components/chatAlert/ChatAlertMessage.vue';
import Gngngn from '../components/chatform/Gngngn.vue';
import PinedMessages from '../components/chatform/PinedMessages.vue';
import EmergencyFollowsListModal from '../components/modals/EmergencyFollowsListModal.vue';
import TimerForm from '../components/timer/TimerForm.vue';
import UserCard from '../components/user/UserCard.vue';
import VoiceTranscript from '../components/voice/VoiceTranscript.vue';
import Accessibility from './Accessibility.vue';
import Login from './Login.vue';
import ShareParams from './ShareParams.vue';

@Component({
	components:{
		Login,
		Gngngn,
		QnaForm,
		QnaList,
		ChatForm,
		UserList,
		UserCard,
		HeatLogs,
		PollForm,
		PinsList,
		Changelog,
		TimerForm,
		GreetThem,
		BingoForm,
		Extensions,
		DonorBadge,
		Parameters,
		RaffleForm,
		TTUserList,
		ObsHeatLogs,
		MessageList,
		GroqHistory,
		DevmodeMenu,
		RewardsList,
		ShareParams,
		ShoutoutList,
		TriggersLogs,
		TrackedUsers,
		ChatPollForm,
		BingoGridForm,
		MessageSearch,
		StreamSummary,
		WhispersState,
		Accessibility,
		CommandHelper,
		EmoteSelector,
		PinedMessages,
		PredictionForm,
		LiveFollowings,
		StreamInfoForm,
		VoiceTranscript,
		ChatAlertMessage,
		NonPremiumCleanup,
		BingoGridControls,
		ChatSuggestionForm,
		ChatSuggestionState,
		HelpGenocideVictims,
		TwitchatAnnouncement,
		ChannelNotifications,
		EndingCreditsControls,
		OutdatedDataVersionAlert,
		EmergencyFollowsListModal,
	},
})
class Chat extends Vue {

	public buildIndex = 0;
	public showQna = false;
	public showPins = false;
	public showEmotes = false;
	public showRewards = false;
	public showDevMenu = false;
	public showCredits = false;
	public voiceControl = true;
	public showCommands = false;
	public showShoutout = false;
	public showBingoGrid = false;
	public showGazaFunds = false;
	public showChatUsers = false;
	public showDonorBadge = true;
	public showBlinkLayer = false;
	public greetColIndexTarget = 0;
	public panelsColIndexTarget = 0;
	public forceEmergencyFollowClose = false;
	public panelsColumnTarget:HTMLDivElement|null = null;
	public currentNotificationContent:TwitchatDataTypes.NotificationTypes = "";
	public mustDisableItems_precalc:boolean = false;

	private disposed = false;
	private mouseX = 0;
	private mouseY = 0;
	private frameIndex = 0;
	private prevFormHeight = 0;
	private resizing = false;
	private closingDonorState = false;
	private draggedCol:TwitchatDataTypes.ChatColumnsConfig|null = null;

	private mouseUpHandler!:(e:MouseEvent|TouchEvent)=> void;
	private mouseMoveHandler!:(e:MouseEvent|TouchEvent)=> void;
	private publicApiEventHandler!:(e:TwitchatEvent)=> void;

	public get splitViewVertical():boolean { return this.$store.params.appearance.splitViewVertical.value as boolean; }
	public get showEmergencyFollows():boolean { return this.$store.emergency.follows.length > 0 && !this.$store.emergency.emergencyStarted; }
	public get mustDisableItems():boolean { return this.mustDisableItems_precalc && !this.$store.auth.isPremium; }

	public get classes():string[] {
		const res = ["chat"];
		if(this.splitViewVertical) res.push("splitVertical");
		if(Config.instance.DEMO_MODE) res.push("demo");
		if(this.$store.main.offlineMode) res.push("offlineMode");
		return res;
	}

	public getColStyles(col:TwitchatDataTypes.ChatColumnsConfig):{[key:string]:string} {
		let size = col.size * 100;
		const cols = this.$store.params.chatColumnsConfig;
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
		this.showDonorBadge = this.$store.auth.donorLevel > -1 && this.$store.auth.donorLevelUpgrade === true;

		this.mustDisableItems_precalc = this.$store.main.nonPremiumLimitExceeded;

		// Function that attempts to request a screen wake lock.
		const requestWakeLock = async () => {
			try {
				await navigator.wakeLock.request("screen");
			} catch (err) {
				// const error = err as {name:string, message:string}
				// console.error(`${error.name}, ${error.message}`);
			}
		};

		//Auto opens the prediction status if pending for completion
		watch(() => this.$store.prediction.data, (newValue, prevValue) => {
			let prediction = this.$store.prediction.data;
			const isNew = !prevValue || (newValue && prevValue.id != newValue.id);
			if(prediction && prediction.pendingAnswer || isNew) this.setCurrentNotification("prediction", false);
		});

		//Auto opens the raid status
		watch(() => this.$store.stream.currentRaid, (newValue, prevValue) => {
			if(newValue && !prevValue) this.setCurrentNotification("raid", false);
		});

		//Auto opens the poll status if terminated
		watch(() => this.$store.poll.data, (newValue, prevValue) => {
			let poll = this.$store.poll.data;
			const isNew = !prevValue || (newValue && prevValue.id != newValue.id);
			if(poll && isNew) this.setCurrentNotification("poll", false);
		});

		//Auto opens the poll status if terminated
		watch(() => this.$store.chatPoll.data, (newValue, prevValue) => {
			let poll = this.$store.chatPoll.data;
			const isNew = !prevValue || (newValue && prevValue);
			if(poll && isNew) this.setCurrentNotification("chatPoll", false);
		});

		//Auto opens the bingo status when created
		watch(() => this.$store.bingo.data, () => {
			let bingo = this.$store.bingo.data;
			if(bingo) this.setCurrentNotification("bingo", false);
		});

		//Auto opens the raffle status when created
		watch(() => this.$store.raffle.raffleList, (newValue, oldValue) => {
			if(newValue.length <= oldValue.length) return;

			let raffleliost = this.$store.raffle.raffleList;
			for (let i = 0; i < raffleliost.length; i++) {
				const raffle = raffleliost[i];
				if(raffle && (raffle.command || raffle.reward_id)) {
					this.setCurrentNotification("raffle");
					break;
				}
			}
		}, {deep:true});

		//Auto opens the train status when created
		watch(() => this.$store.stream.hypeTrain, (newValue, oldValue) => {
			if(newValue && !oldValue) this.setCurrentNotification("train", false);
		});

		//Watch for columns changes
		watch(() => this.$store.params.chatColumnsConfig, () => {
			this.computeWindowsSizes();
		}, {deep:true});

		//Watch for current modal to be displayed
		watch(()=>this.$store.params.currentModal, (value)=>{
			this.voiceControl = false;

			//Make sure the column holding modals is visible
			if(this.panelsColumnTarget && value) {
				const col = this.panelsColumnTarget.parentElement as HTMLDivElement;
				const scrollable = this.$refs.scrollable as HTMLDivElement;
				const scrollTo = {x:col.offsetLeft - (scrollable.offsetWidth-col.offsetWidth), y:col.offsetTop - (scrollable.offsetHeight - col.offsetHeight)/2};
				gsap.to(scrollable, {duration: .75, ease:"sine.inOut", scrollTo});
			}
		})

		//Handle chat alert feature
		watch(() => this.$store.main.chatAlert, async () => {
			if(this.$store.main.chatAlert != null) {
				if(this.$store.params.features.alertMode.value !== true) return;

				const params = this.$store.main.chatAlertParams;
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
					new Audio(this.$asset("sounds/wizz.mp3")).play();
				}
				if(params.vibrate) {
					window.navigator.vibrate([200, 100, 200, 100, 200, 100, 200, 100, 1000]);
				}
			}
		});

		//Reset emotes cache if changing BTTV/FFZ/7TV states
		watch(()=> this.$store.params.appearance.bttvEmotes.value, ()=> {
			this.$store.chat.emoteSelectorCache = [];
		})
		watch(()=> this.$store.params.appearance.ffzEmotes.value, ()=> {
			this.$store.chat.emoteSelectorCache = [];
		})
		watch(()=> this.$store.params.appearance.sevenTVEmotes.value, ()=> {
			this.$store.chat.emoteSelectorCache = [];
		})

		this.publicApiEventHandler = (e:TwitchatEvent) => this.onPublicApiEvent(e);
		this.mouseUpHandler = () => this.resizing = false;
		this.mouseMoveHandler = (e:MouseEvent|TouchEvent) => this.onMouseMove(e);

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
		PublicAPI.instance.addEventListener(TwitchatEvent.POLL_CREATE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.RAFFLE_START, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.RAFFLE_END, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.START_EMERGENCY, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.STOP_EMERGENCY, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.SHOUTOUT, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GET_COLS_COUNT, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.COUNTER_ADD, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.COUNTER_GET, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.COUNTER_GET_ALL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.EXECUTE_TRIGGER, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.TOGGLE_TRIGGER, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.TRIGGERS_GET_ALL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CLEAR_CHAT_HIGHLIGHT, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.TIMER_ADD, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.COUNTDOWN_ADD, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CREATE_POLL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CREATE_PREDICTION, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.STOP_POLL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.STOP_PREDICTION, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.SEND_MESSAGE, this.publicApiEventHandler);
		this.renderFrame();
		requestWakeLock();

		for (let i = 0; i < this.$store.params.chatColumnsConfig.length + 10; i++) {
			Utils.promisedTimeout(500).then(()=> {
				this.buildIndex ++;
				//Necessary so side panels know where to open
				this.computeWindowsSizes();
			});
		}
	}

	public mounted():void {
		if(this.showDonorBadge) {
			//Show donor badge
			const el = (this.$refs.donor as Vue).$el as HTMLDivElement;
			gsap.from(el, {bottom:"-350px", duration:2, ease:"back.out", delay:1});
		}
		this.computeWindowsSizes();


		// window.setTimeout(() => {
		// 	this.$store.params.openModal("shareParams");
		// }, 1000);
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
		PublicAPI.instance.removeEventListener(TwitchatEvent.RAFFLE_START, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.RAFFLE_END, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.START_EMERGENCY, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.STOP_EMERGENCY, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.SHOUTOUT, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GET_COLS_COUNT, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.COUNTER_ADD, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.COUNTER_GET, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.COUNTER_GET_ALL, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.EXECUTE_TRIGGER, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.TOGGLE_TRIGGER, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.TRIGGERS_GET_ALL, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CLEAR_CHAT_HIGHLIGHT, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.TIMER_ADD, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.COUNTDOWN_ADD, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CREATE_POLL, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CREATE_PREDICTION, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.STOP_POLL, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.STOP_PREDICTION, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.SEND_MESSAGE, this.publicApiEventHandler);
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
	 * //TODO move this store, this has nothing to do here for the most part
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
				this.$store.params.appearance.showViewersCount.value = !this.$store.params.appearance.showViewersCount.value;
				this.$store.params.updateParams();
				break;

			case TwitchatEvent.MOD_TOOLS_TOGGLE:
				this.$store.params.features.showModTools.value = !this.$store.params.features.showModTools.value;
				this.$store.params.updateParams();
				break;

			case TwitchatEvent.GET_COLS_COUNT:
				PublicAPI.instance.broadcast(TwitchatEvent.SET_COLS_COUNT,{count:this.$store.params.chatColumnsConfig.length});
				break;

			case TwitchatEvent.CENSOR_DELETED_MESSAGES_TOGGLE:
				this.$store.params.appearance.censorDeletedMessages.value = !this.$store.params.appearance.censorDeletedMessages.value;
				this.$store.params.updateParams();
				break;

			case TwitchatEvent.CREATE_POLL:
				this.$store.params.openModal('poll');
				await this.$nextTick();
				this.voiceControl = true;
				break;
			case TwitchatEvent.STOP_POLL:{
				const poll = this.$store.poll.data;
				if(!poll) return;
				try {
					await TwitchUtils.endPoll(poll.id, poll.channel_id);
				}catch(error) {
					this.$store.common.alert(this.$t("error.twitch_poll_delete"));
				}
				break;
			}

			case TwitchatEvent.CREATE_PREDICTION:
				this.$store.params.openModal('pred');
				await this.$nextTick();
				this.voiceControl = true;
				break;
			case TwitchatEvent.STOP_PREDICTION:{
				const prediction = this.$store.prediction.data;
				if(!prediction) return;
				try {
					await TwitchUtils.endPrediction(prediction.channel_id, prediction.id, prediction.outcomes[0].id, true);
				}catch(error) {
					this.$store.common.alert(this.$t("error.twitch_prediction_delete"))
				}
				break;
			}

			case TwitchatEvent.RAFFLE_START:{
				this.$store.params.openModal('raffle');
				await this.$nextTick();
				this.voiceControl = true;
				break;
			}
			case TwitchatEvent.RAFFLE_END:{
				this.$confirm(this.$t("raffle.delete_confirm.title"), this.$t("raffle.delete_confirm.description"), undefined, undefined, undefined, true)
				.then(async ()=> {
					//TODO see if i can adapt this to the new system allowing to create
					//multiple raffles in parallel. This is called when using a voice
					//command to stop current raffle
					const list = this.$store.raffle.raffleList;
					if(list.length == 0) return true;
					this.$store.raffle.stopRaffle(list[0].sessionId || "");
				}).catch(()=>{});
				break;
			}

			case TwitchatEvent.START_EMERGENCY:{
				this.$confirm(this.$t("emergency.enable_confirm"), undefined, undefined, undefined, undefined, true).then(()=>{
					this.$store.emergency.setEmergencyMode(true);
				}).catch(()=>{});
				break;
			}
			case TwitchatEvent.STOP_EMERGENCY:{
				this.$store.emergency.setEmergencyMode(false);
				break;
			}

			case TwitchatEvent.COUNTER_GET: {
				const id = (e.data as JsonObject).cid as string;
				this.$store.counters.broadcastCounterValue(id);
				break;
			}

			case TwitchatEvent.COUNTER_ADD: {
				const id = (e.data as JsonObject).counterId as string;
				const action = (e.data as JsonObject).counterAction as TriggerActionCountDataAction;
				const value = parseInt((e.data as JsonObject).countAdd as string);
				const counter = this.$store.counters.counterList.find(v=>v.id == id);
				if(counter && !isNaN(value)) {
					this.$store.counters.increment(id, action || "ADD", value);
				}
				break;
			}

			case TwitchatEvent.EXECUTE_TRIGGER: {
				const id = (e.data as JsonObject).triggerId as string;
				const trigger = this.$store.triggers.triggerList.find(v=>v.id == id);
				if(trigger) {
					const me = this.$store.auth.twitch.user;
					const fakeMessage:TwitchatDataTypes.MessageChatData = {
						platform:"twitch",
						type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
						channel_id:me.id,
						date:Date.now(),
						id:Utils.getUUID(),
						message:"",
						message_chunks:[],
						message_html:"",
						message_size:0,
						user:me,
						is_short:false,
						answers:[],
					}
					TriggerActionHandler.instance.executeTrigger(trigger, fakeMessage, false);
				}
				break;
			}

			case TwitchatEvent.TOGGLE_TRIGGER: {
				const id = (e.data as JsonObject).triggerId as string;
				const action = (e.data as JsonObject).triggerAction as string || "enable";
				const trigger = this.$store.triggers.triggerList.find(v=>v.id == id);
				if(trigger) {
					switch(action.toLowerCase()){
						case "enable":	trigger.enabled = true; break;
						case "disable":	trigger.enabled = false; break;
						case "toggle":	trigger.enabled = !trigger.enabled; break;
					}
				}
				this.$store.triggers.saveTriggers();
				break;
			}

			case TwitchatEvent.COUNTER_GET_ALL: {
				const counters = this.$store.counters.counterList.map(v=> {
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

			case TwitchatEvent.TRIGGERS_GET_ALL: {
				const triggers = this.$store.triggers.triggerList.map(v=> {
					return {
						id:v.id,
						name:TriggerUtils.getTriggerDisplayInfo(v).label,
					}
				});
				if(triggers) {
					PublicAPI.instance.broadcast(TwitchatEvent.TRIGGER_LIST, {triggers});
				}
				break;
			}

			case TwitchatEvent.CLEAR_CHAT_HIGHLIGHT: {
				this.$store.chat.highlightChatMessageOverlay();
				break;
			}

			case TwitchatEvent.SEND_MESSAGE: {
				const message = (e.data as JsonObject).message as string;
				if(message) {
					MessengerProxy.instance.sendMessage(message);
				}
				break;
			}

			case TwitchatEvent.TIMER_ADD: {
				const durationStr = (e.data as JsonObject).timeAdd as string ?? "1";
				const durationMs = isNaN(parseInt(durationStr))? 1000 : parseInt(durationStr) * 1000;
				const timer = this.$store.timers.timerList.find(v=>v.type == 'timer' && v.isDefault);
				if(!timer) return;
				if(durationMs > 0) {
					this.$store.timers.timerAdd(timer.id, durationMs);
				}else{
					this.$store.timers.timerRemove(timer.id, -durationMs);
				}
				break;
			}

			case TwitchatEvent.COUNTDOWN_ADD: {
				const durationStr = (e.data as JsonObject).timeAdd as string ?? "1";
				const durationMs = isNaN(parseInt(durationStr))? 1000 : parseInt(durationStr) * 1000;
				const timer = this.$store.timers.timerList.find(v=>v.type == 'countdown' && v.isDefault);
				if(!timer) return;
				if(durationMs > 0) {
					this.$store.timers.timerAdd(timer.id, durationMs);
				}else{
					this.$store.timers.timerRemove(timer.id, -durationMs);
				}
				break;
			}
		}

		if(notif) {
			this.setCurrentNotification(notif);
		}

		if(modal) {
			if(this.$store.params.currentModal == modal) {
				this.$store.params.openModal("");
			}else{
				this.$store.params.openModal(modal);
			}
		}
	}

	public async setCurrentNotification(value:TwitchatDataTypes.NotificationTypes, toggle:boolean = true):Promise<void> {
		if(this.currentNotificationContent == value && toggle) {
			this.currentNotificationContent = "";
		}else{
			this.currentNotificationContent = value;
		}
	}

	/**
	 * Called when selecting an emote from the emote selectors
	 */
	public onSelectEmote(item:TwitchatDataTypes.Emote):void {
		(this.$refs.chatForm as ChatFormClass).onSelectItem(item.code);
	}

	/**
	 * Called when searching for a message
	 */
	public searchMessage(str:string):void {
		this.$store.params.openModal('search');
	}

	/**
	 * Called when starting window resize
	 */
	public startDrag(event:PointerEvent, col:TwitchatDataTypes.ChatColumnsConfig):void {
		this.resizing = true;
		this.draggedCol = col;
		this.onMouseMove(event);
		(event.target as HTMLDivElement).setPointerCapture(event.pointerId);
	}

	/**
	 * Expand the selected col
	 * @param col
	 */
	public expandCol(col:TwitchatDataTypes.ChatColumnsConfig):void{
		const colList = this.$store.params.chatColumnsConfig;
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
		let col = this.$store.params.addChatColumn(ref);
		const colList = this.$store.params.chatColumnsConfig;
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
	 * Called when user drags the columns left/right (up/down on vertical layout)
	 */
	public onScrollColumns():void {

	}

	/**
	 * Called when the mouse moves
	 */
	private async onMouseMove(e:MouseEvent|TouchEvent|PointerEvent):Promise<void> {
		if("clientX" in e) {
			this.mouseX = e.clientX;
			this.mouseY = e.clientY;
		}else if("touches" in e) {
			this.mouseX = e.touches[0].clientX;
			this.mouseY = e.touches[0].clientY;
		}
	}

	/**
	 * Manage colmumns resize
	 */
	private async renderFrame():Promise<void> {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());

		if(this.$refs.chatForm && (this.frameIndex++)%60 == 0) {
			//Compute chat form height every 60 frames
			const chatForm = (this.$refs.chatForm as Vue).$el as HTMLDivElement;
			const bounds = chatForm.getBoundingClientRect();
			if(bounds.height != this.prevFormHeight) {
				this.prevFormHeight = bounds.height;
				(document.querySelector(':root') as HTMLHtmlElement).style.setProperty('--chat-form-height', bounds.height + 'px');
			}
		}

		if(!this.resizing) return;

		const cols = this.$store.params.chatColumnsConfig;
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

		//For some reason few people achieve to make negative width col.
		//It shouldn't be possible and this shouldn't change anything to
		//that but it's here for extra security
		cols.forEach(v=> {
			v.size = Math.max(0, Math.min(10, v.size));
		})

		this.$store.params.saveChatColumnConfs();

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
		const cols = this.$store.params.chatColumnsConfig;
		cols.sort((a,b)=> a.order - b.order);
		let colId = "";
		let indexPanels = 0;
		let indexGreet = 0;
		for (let i = 0; i < cols.length; i++) {
			const c = cols[i];
			if(c.showPanelsHere == true) {
				colId = c.id;
				indexPanels = i;
			}
			if(c.showGreetHere == true) {
				indexGreet = i;
			}
		}

		const colHolders = this.$refs["column_"+colId] as HTMLDivElement[];
		let selectedCol = colHolders? colHolders[0] : null;

		if(!selectedCol) {
			//Fallback to last col if none is selected
			indexPanels = cols.length-1;
			indexGreet = cols.length-1;
			selectedCol = (this.$refs["column_"+cols[indexPanels].id] as HTMLDivElement[])[0];
		}
		this.greetColIndexTarget = indexGreet;
		this.panelsColIndexTarget = indexPanels;
		this.panelsColumnTarget = selectedCol.getElementsByClassName("subHolder")[0] as HTMLDivElement;
	}
}



export default toNative(Chat);
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

	&.offlineMode {
		border: 3px solid var(--color-secondary);
		border-radius: .5em;

		.offlineTitle {
			background-color: var(--color-secondary);
			position: fixed;
			top: 0;
			left: 50%;
			transform: translateX(-50%);
			color: var(--color-light);
			z-index: 1000;
			padding: .25em;
			border-bottom-right-radius: var(--border-radius);
			border-bottom-left-radius: var(--border-radius);
			.icon {
				height: 1em;
			}
		}
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
						overflow: hidden;
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
							background: var(--color-dark-extralight);
							&::before {
								height: 5px;
								width: 40px;
								background: linear-gradient(90deg,
												var(--color-dark-extralight) 30%,
												var(--color-dark) 30%,
												var(--color-dark) 35%,
												var(--color-dark-extralight) 35%,
												var(--color-dark-extralight) 45%,
												var(--color-dark) 45%,
												var(--color-dark) 50%,
												var(--color-dark-extralight) 50%,
												var(--color-dark-extralight) 60%,
												var(--color-dark) 60%,
												var(--color-dark) 65%,
												var(--color-dark-extralight) 65%,
											);
							}
						}
					}
				}
			}
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
						background: var(--color-dark-extralight);
						&::before {
							content:"";
							position: absolute;
							.center();
							display: block;
							width: 5px;
							height: 40px;
							background: var(--color-dark-light);
							background: linear-gradient(0deg,
											var(--color-dark-extralight) 30%,
											var(--color-dark) 30%,
											var(--color-dark) 35%,
											var(--color-dark-extralight) 35%,
											var(--color-dark-extralight) 45%,
											var(--color-dark) 45%,
											var(--color-dark) 50%,
											var(--color-dark-extralight) 50%,
											var(--color-dark-extralight) 60%,
											var(--color-dark) 60%,
											var(--color-dark) 65%,
											var(--color-dark-extralight) 65%,
										);
						}
					}
				}
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
	}

	.contentWindows {
		position: absolute;
		bottom: var(--chat-form-height);
		left: 0;
		z-index: 4;

		&.emotes {
			max-width: 100%;
		}
	}

	.blinkLayer {
		width: var(--vw);
		height: 100vh;
		background-color: fade(#c00, 70%);
		position: absolute;
		top: 0;
		left: 0;
		z-index: 100;
	}
}

@media only screen and (max-width: 450px) {
	.chat:not(.splitVertical){
		.scrollable {
			// overflow-x: hidden !important;
			scroll-snap-type: x mandatory;
			overflow-x: auto;
			.column {
				scroll-snap-align: center;
				min-width: var(--vw) !important;//"!important" here to prioritize it before inlined styles
				width: var(--vw) !important;//"!important" here to prioritize it before inlined styles
				padding: 0 1px;
				.dragBt {
					display: none;
				}
			}
		}

		&:not(.demo)>.contentWindows:not(.credits) {
			left: 0;
			top: 0;
			width: 100%;
		}
	}
}
</style>
