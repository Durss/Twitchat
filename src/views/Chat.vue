<template>
	<div :class="classes">
		<div class="top" ref="top">
			<div class="leftColumn" :style="leftStyles">
				<MessageList ref="messages" class="messages"
					v-if="!hideChat"
					@showModal="(v:string) => currentModal = v"
					:max="$store.state.params.appearance.historySize.value" />
					
				<ActivityFeed class="activityFeed" listMode v-if="hideChat" />
			</div>

			<div class="dragBt" ref="splitter" v-if="splitView" @mousedown="startDrag()" @touchstart="startDrag()">
				<div class="grip"></div>
			</div>

			<div class="rightColumn" v-if="splitView" :style="rightStyles" ref="rightCol">
				<NewUsers class="newUsers" v-if="$store.state.params.features.firstMessage.value" />

				<ActivityFeed class="activityFeed" listMode />

				<ChannelNotifications
					:currentContent="currentNotificationContent"
					@close="currentNotificationContent=''"
				/>
			</div>
		</div>

		<ChannelNotifications
			v-if="!splitView"
			:currentContent="currentNotificationContent"
			@close="currentNotificationContent=''"
		/>

		<div class="bottom">
			<ChatForm class="chatForm" ref="chatForm"
				@poll="currentModal = 'poll'"
				@chatpoll="currentModal = 'chatpoll'"
				@pred="currentModal = 'pred'"
				@raffle="currentModal = 'raffle'"
				@bingo="currentModal = 'bingo'"
				@liveStreams="currentModal = 'liveStreams'"
				@TTuserList="currentModal = 'TTuserList'"
				@pins="currentModal = 'pins'"
				@ad="startAd"
				@search="searchMessage"
				@setCurrentNotification="setCurrentNotification"
				@debug="(v:number)=>debug(v)"
				v-model:showFeed="showFeed" @update:showFeed="(v:boolean) => showFeed = v"
				v-model:showEmotes="showEmotes" @update:showEmotes="(v:boolean) => showEmotes = v"
				v-model:showRewards="showRewards" @update:showRewards="(v:boolean) => showRewards = v"
				v-model:showCommands="showCommands" @update:showCommands="(v:boolean) => showCommands = v"
				v-model:showChatUsers="showChatUsers" @update:showChatUsers="(v:boolean) => showChatUsers = v"
				v-model:showDevMenu="showDevMenu" @update:showDevMenu="(v:boolean) => showDevMenu = v"
			/>
		</div>

		<!-- Actually not used, what the API allows us to do is useless -->
		<RewardsList class="contentWindows rewards"
			v-if="showRewards"
			@close="showRewards = false" />

		<DevmodeMenu class="contentWindows devmode"
			v-if="showDevMenu"
			@close="showDevMenu = false" />

		<ActivityFeed class="contentWindows feed"
			v-if="showFeed"
			@close="showFeed = false" />

		<CommandHelper class="contentWindows actions"
			v-if="showCommands"
			:startAdCooldown="startAdCooldown"
			@poll="currentModal = 'poll'"
			@chatpoll="currentModal = 'chatpoll'"
			@pred="currentModal = 'pred'"
			@raffle="currentModal = 'raffle'"
			@bingo="currentModal = 'bingo'"
			@liveStreams="currentModal = 'liveStreams'"
			@streamInfo="currentModal = 'streamInfo'"
			@ad="startAd"
			@clear="clearChat()"
			@close="showCommands = false"
		/>

		<EmoteSelector class="contentWindows emotes"
			v-if="showEmotes"
			@select="onSelectEmote"
			@close="showEmotes = false" />

		<UserList class="contentWindows users"
			v-if="showChatUsers"
			@close="showChatUsers = false" />

		<NewUsers class="newUsers" v-if="!splitView && $store.state.params.features.firstMessage.value" />
		<VoiceTranscript :style="ttsStyles" class="contentWindows tts" />

		<PollForm :style="rightStyles" class="popin" v-if="currentModal == 'poll'" @close="currentModal = ''" :voiceControl="voiceControl" />
		<ChatPollForm :style="rightStyles" class="popin" v-if="currentModal == 'chatpoll'" @close="currentModal = ''" :voiceControl="voiceControl" />
		<RaffleForm :style="rightStyles" class="popin" v-if="currentModal == 'raffle'" @close="currentModal = ''" :voiceControl="voiceControl" />
		<PredictionForm :style="rightStyles" class="popin" v-if="currentModal == 'pred'" @close="currentModal = ''" :voiceControl="voiceControl" />
		<BingoForm :style="rightStyles" class="popin" v-if="currentModal == 'bingo'" @close="currentModal = ''" />
		<LiveFollowings :style="rightStyles" class="popin" v-if="currentModal == 'liveStreams'" @close="currentModal = ''" />
		<StreamInfoForm :style="rightStyles" class="popin" v-if="currentModal == 'streamInfo'" @close="currentModal = ''" />
		<TTUserList :style="rightStyles" class="popin" v-if="currentModal == 'TTuserList'" @close="currentModal = ''" />
		<PinedMessages :style="rightStyles" class="popin" v-if="currentModal == 'pins'" @close="currentModal = ''" />
		
		<Parameters v-if="$store.state.showParams" />
		
		<EmergencyFollowsListModal v-if="showEmergencyFollows && !forceEmergencyFollowClose" @close="forceEmergencyFollowClose=true" />

		<DataServerSyncModal v-if="showStorageModal" @close="showStorageModal = false" />

		<DonorState ref="donor" class="donorState" v-if="isDonor" @click="closeDonorCard()" />

		<UserCard />

		<Gngngn v-if="currentModal == 'gngngn'" @close="currentModal = ''" />

		<Teleport to="body">
			<div class="deezerCTA" v-if="needUserInteraction">
				<img src="@/assets/icons/deezer_color.svg" alt="deezer" class="icon">
				<div class="title">Click</div>
				<div class="message">Deezer needs you to click here to be able to play music.</div>
			</div>
		</Teleport>

		<ChatAlertMessage />
		<div class="blinkLayer" ref="blinkLayer" v-if="showBlinkLayer" @click="showBlinkLayer=false"></div>
	</div>
</template>

<script lang="ts">
import BingoForm from '@/components/bingo/BingoForm.vue';
import Button from '@/components/Button.vue';
import ChannelNotifications from '@/components/channelnotifications/ChannelNotifications.vue';
import ActivityFeed from '@/components/chatform/ActivityFeed.vue';
import ChatForm from '@/components/chatform/ChatForm.vue';
import CommandHelper from '@/components/chatform/CommandHelper.vue';
import DevmodeMenu from '@/components/chatform/DevmodeMenu.vue';
import EmoteSelector from '@/components/chatform/EmoteSelector.vue';
import LiveFollowings from '@/components/chatform/LiveFollowings.vue';
import RewardsList from '@/components/chatform/RewardsList.vue';
import TTUserList from '@/components/chatform/TTUserList.vue';
import UserList from '@/components/chatform/UserList.vue';
import MessageList from '@/components/messages/MessageList.vue';
import NewUsers from '@/components/newusers/NewUsers.vue';
import Parameters from '@/components/params/Parameters.vue';
import ChatPollForm from '@/components/poll/ChatPollForm.vue';
import PollForm from '@/components/poll/PollForm.vue';
import PredictionForm from '@/components/prediction/PredictionForm.vue';
import RaffleForm from '@/components/raffle/RaffleForm.vue';
import StreamInfoForm from '@/components/streaminfo/StreamInfoForm.vue';
import Store from '@/store/Store';
import type { AlertParamsData } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import type { BingoData, RaffleData } from '@/utils/CommonDataTypes';
import Config from '@/utils/Config';
import DeezerHelper from '@/utils/DeezerHelper';
import IRCClient from '@/utils/IRCClient';
import PublicAPI from '@/utils/PublicAPI';
import StoreProxy from '@/utils/StoreProxy';
import TwitchatEvent from '@/utils/TwitchatEvent';
import TwitchUtils from '@/utils/TwitchUtils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import DataServerSyncModal from '../components/modals/DataServerSyncModal.vue';
import ChatAlertMessage from '../components/chatAlert/ChatAlertMessage.vue';
import EmergencyFollowsListModal from '../components/modals/EmergencyFollowsListModal.vue';
import PinedMessages from '../components/chatform/PinedMessages.vue';
import VoiceTranscript from '../components/voice/VoiceTranscript.vue';
import UserCard from '../components/user/UserCard.vue';
import DonorState from '../components/user/DonorState.vue';
import UserSession from '@/utils/UserSession';
import Gngngn from '../components/chatform/Gngngn.vue';

@Options({
	components:{
		Button,
		Gngngn,
		NewUsers,
		ChatForm,
		UserList,
		UserCard,
		PollForm,
		BingoForm,
		DonorState,
		Parameters,
		RaffleForm,
		TTUserList,
		MessageList,
		DevmodeMenu,
		RewardsList,
		ActivityFeed,
		ChatPollForm,
		CommandHelper,
		EmoteSelector,
		PinedMessages,
		PredictionForm,
		LiveFollowings,
		StreamInfoForm,
		VoiceTranscript,
		ChatAlertMessage,
		DataServerSyncModal,
		ChannelNotifications,
		EmergencyFollowsListModal,
	},
	props:{
	},
})
export default class Chat extends Vue {

	public isDonor = true;
	public showFeed = false;
	public showEmotes = false;
	public showRewards = false;
	public showDevMenu = false;
	public showCommands = false;
	public voiceControl = false;
	public showChatUsers = false;
	public showBlinkLayer = false;
	public showStorageModal = false;
	public forceEmergencyFollowClose = false;
	public startAdCooldown = 0;
	public currentModal = "";
	public currentNotificationContent = "";

	private disposed = false;
	private mouseY = 0;
	private mouseX = 0;
	private leftColSize = 0;
	private splitterPosY = 0;
	private availHeight = 0;
	private resizing = false;
	private canStartAd = true;
	
	private mouseUpHandler!:(e:MouseEvent|TouchEvent)=> void;
	private mouseMoveHandler!:(e:MouseEvent|TouchEvent)=> void;
	private publicApiEventHandler!:(e:TwitchatEvent)=> void;
	
	public get splitView():boolean { return StoreProxy.store.state.params.appearance.splitView.value as boolean && StoreProxy.store.state.canSplitView && !this.hideChat; }
	public get splitViewVertical():boolean { return StoreProxy.store.state.params.appearance.splitViewVertical.value as boolean && StoreProxy.store.state.canSplitView && !this.hideChat; }
	public get hideChat():boolean { return StoreProxy.store.state.params.appearance.hideChat.value as boolean; }
	public get needUserInteraction():boolean { return Config.instance.DEEZER_CONNECTED && !DeezerHelper.instance.userInteracted; }
	public get showEmergencyFollows():boolean { return StoreProxy.store.state.emergencyFollows.length > 0 && !StoreProxy.store.state.emergencyModeEnabled; }

	public get classes():string[] {
		const res = ["chat"];
		if(this.splitView) {
			res.push("splitView");
			if(StoreProxy.store.state.params.appearance.splitViewSwitch.value === true) {
				res.push("switchCols");
			}
			if(this.splitViewVertical) res.push("splitVertical")
		}
		return res;
	}

	public get leftStyles():{[key:string]:string} {
		if(!this.splitView) return {};
		
		let size = this.leftColSize;
		if(StoreProxy.store.state.params.appearance.splitViewSwitch.value === true) {
			size = 1-size;
		}
		if(this.splitViewVertical) {
			const value = `calc(${size*this.availHeight}px - 7px)`;//7px => dragbar size
			return {
				"height": value,
				"min-height": value,
				"max-height": value,
			}
		}else{
			const value = `calc(${size*100}% - 7px)`;//7px => dragbar size
			return {
				"width": value,
				"min-width": value,
				"max-width": value,
			}
		}
	}

	public get rightStyles():{[key:string]:string} {
		if(!this.splitView) return {};
		
		let size = this.leftColSize;
		const switchCols = StoreProxy.store.state.params.appearance.splitViewSwitch.value === true;
		if(!switchCols) {
			size = 1-size;
		}

		if(this.splitViewVertical) {
			const value = `calc(${size*this.availHeight}px - 14px)`;
			return {
				"top":switchCols? "0" : (this.availHeight*(1-size)+14)+"px",
				"height": value,
				"min-height": value,
				"max-height": value,
				"width": "100%",
			}
		}else{
			const value = `calc(${size*100}% - 7px)`;
			return {
				"width": value,
				"min-width": value,
				"max-width": value,
			}
		}
	}

	public get ttsStyles():{[key:string]:string} {
		let res:{[key:string]:string} = {};
		if(this.splitView && this.splitViewVertical && StoreProxy.store.state.params.appearance.splitViewSwitch.value === true) {
			res.top = this.splitterPosY+"px";
		}else if(!this.splitViewVertical){
			res = this.rightStyles;
		}
		return res;
	}

	private resizeHandler!:(e:Event) => void;

	public beforeMount():void {
		//Check user reached a new donor level
		let storeLevel = parseInt(Store.get(Store.DONOR_LEVEL))
		const level = isNaN(storeLevel)? -1 : storeLevel;
		this.isDonor = UserSession.instance.isDonor && UserSession.instance.donorLevel != level;
		if(this.isDonor) {
			Store.set(Store.DONOR_LEVEL, UserSession.instance.donorLevel);
		}

		//Define is store sync modal should be displayed
		this.showStorageModal = Store.get(Store.SYNC_DATA_TO_SERVER) == null;

		this.resizeHandler = ()=> this.onResize();
		this.publicApiEventHandler = (e:TwitchatEvent) => this.onPublicApiEvent(e);
		this.mouseUpHandler = () => this.resizing = false;
		this.mouseMoveHandler = (e:MouseEvent|TouchEvent) => this.onMouseMove(e);
		
		let size = parseFloat(Store.get(Store.LEFT_COL_SIZE));
		if(isNaN(size)) size = .5;
		this.leftColSize = Math.min(.95, Math.max(.05,size));

		// Function that attempts to request a screen wake lock.
		const requestWakeLock = async () => {
			try {
				await navigator.wakeLock.request("screen");
			} catch (err) {
				const error = err as {name:string, message:string}
				console.error(`${error.name}, ${error.message}`);
			}
		};
		requestWakeLock();

		window.addEventListener("resize", this.resizeHandler);
		document.addEventListener("mouseup", this.mouseUpHandler);
		document.addEventListener("touchend", this.mouseUpHandler);
		document.addEventListener("mousemove", this.mouseMoveHandler);
		document.addEventListener("touchmove", this.mouseMoveHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.POLL_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.PREDICTION_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.BINGO_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.RAFFLE_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.ACTIVITY_FEED_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.VIEWERS_COUNT_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.MOD_TOOLS_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CENSOR_DELETED_MESSAGES_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CREATE_POLL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.STOP_POLL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CREATE_PREDICTION, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.STOP_PREDICTION, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CREATE_RAFFLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.STOP_RAFFLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.START_EMERGENCY, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.STOP_EMERGENCY, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.SHOUTOUT, this.publicApiEventHandler);
		this.onResize();
		this.renderFrame();

		//Auto opens the prediction status if pending for completion
		watch(() => StoreProxy.store.state.currentPrediction, (newValue, prevValue) => {
			let prediction = StoreProxy.store.state.currentPrediction as TwitchDataTypes.Prediction;
			const isNew = !prevValue || (newValue && prevValue.id != newValue.id);
			if(prediction && prediction.status == "LOCKED" || isNew) this.setCurrentNotification("prediction");
		});

		//Auto opens the poll status if terminated
		watch(() => StoreProxy.store.state.currentPoll, (newValue, prevValue) => {
			let poll = StoreProxy.store.state.currentPoll as TwitchDataTypes.Poll;
			const isNew = !prevValue || (newValue && prevValue.id != newValue.id);
			if(poll && poll.status == "COMPLETED" || isNew) this.setCurrentNotification("poll");
		});

		//Auto opens the bingo status when created
		watch(() => StoreProxy.store.state.bingo, () => {
			let bingo = StoreProxy.store.state.bingo as BingoData;
			if(bingo) this.setCurrentNotification("bingo");
		});

		//Auto opens the raffle status when created
		watch(() => StoreProxy.store.state.raffle, () => {
			let raffle = StoreProxy.store.state.raffle as RaffleData;
			if(raffle && raffle.command) this.setCurrentNotification("raffle");
		});

		watch(()=>this.currentModal, ()=>{
			this.voiceControl = false;
		})

		//Handle chat alert feature
		watch(() => StoreProxy.store.state.chatAlert, async (value:string) => {
			if(value != null) {
				if(StoreProxy.store.state.params.features.alertMode.value !== true) return;
				
				const params = StoreProxy.store.state.chatAlertParams as AlertParamsData;
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
	}

	public mounted():void {
		if(!this.isDonor) return;
		//Show donor badge
		const el = (this.$refs.donor as Vue).$el as HTMLDivElement;
		gsap.from(el, {bottom:"-350px", duration:2, ease:"back.out", delay:1});
	}

	public beforeUnmount():void {
		this.disposed = true;
		window.removeEventListener("resize", this.resizeHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.POLL_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.PREDICTION_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.BINGO_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.RAFFLE_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.ACTIVITY_FEED_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.VIEWERS_COUNT_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.MOD_TOOLS_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CENSOR_DELETED_MESSAGES_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CREATE_POLL, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.STOP_POLL, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CREATE_PREDICTION, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.STOP_PREDICTION, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CREATE_RAFFLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.STOP_RAFFLE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.START_EMERGENCY, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.STOP_EMERGENCY, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.SHOUTOUT, this.publicApiEventHandler);
	}

	public closeDonorCard():void {
		//Show donor badge
		const el = (this.$refs.donor as Vue).$el as HTMLDivElement;
		gsap.to(el, {bottom:"-350px", duration:1, ease:"back.in", onComplete:()=>{
			this.isDonor = false;
		}});
	}

	public clearChat():void {
		IRCClient.instance.client.clear(IRCClient.instance.channel);
	}

	/**
	 * Called when requesting an action from the public API
	 */
	private async onPublicApiEvent(e:TwitchatEvent):Promise<void> {
		let notif = "";
		let modal = "";
		switch(e.type) {
			case TwitchatEvent.POLL_TOGGLE: notif = 'poll'; break;
			case TwitchatEvent.PREDICTION_TOGGLE: notif = 'pred'; break;
			case TwitchatEvent.BINGO_TOGGLE: notif = 'bingo'; break;
			case TwitchatEvent.RAFFLE_TOGGLE: notif = 'raffle'; break;
			case TwitchatEvent.ACTIVITY_FEED_TOGGLE: this.showFeed = !this.showFeed; break;
			case TwitchatEvent.VIEWERS_COUNT_TOGGLE:
				StoreProxy.store.state.params.appearance.showViewersCount.value = !StoreProxy.store.state.params.appearance.showViewersCount.value;
				StoreProxy.store.dispatch('updateParams');
				break;

			case TwitchatEvent.MOD_TOOLS_TOGGLE:
				StoreProxy.store.state.params.features.showModTools.value = !StoreProxy.store.state.params.features.showModTools.value;
				StoreProxy.store.dispatch('updateParams');
				break;

			case TwitchatEvent.CENSOR_DELETED_MESSAGES_TOGGLE:
				StoreProxy.store.state.params.filters.censorDeletedMessages.value = !StoreProxy.store.state.params.filters.censorDeletedMessages.value;
				StoreProxy.store.dispatch('updateParams');
				break;

			case TwitchatEvent.CREATE_POLL:
				this.currentModal = 'poll';
				await this.$nextTick();
				this.voiceControl = true;
				break;
			case TwitchatEvent.STOP_POLL:{
				const poll = StoreProxy.store.state.currentPoll as TwitchDataTypes.Poll;
				try {
					await TwitchUtils.endPoll(poll.id);
				}catch(error) {
					StoreProxy.store.state.alert = "An error occurred while deleting the poll";
				}
				break;
			}

			case TwitchatEvent.CREATE_PREDICTION:
				this.currentModal = 'pred';
				await this.$nextTick();
				this.voiceControl = true;
				break;
			case TwitchatEvent.STOP_PREDICTION:{
				const prediction = StoreProxy.store.state.currentPrediction as TwitchDataTypes.Prediction;
				try {
					await TwitchUtils.endPrediction(prediction.id, prediction.outcomes[0].id, true);
				}catch(error) {
					StoreProxy.store.state.alert = "An error occurred while deleting the prediction";
				}
				break;
			}

			case TwitchatEvent.CREATE_RAFFLE:
				this.currentModal = 'raffle';
				await this.$nextTick();
				this.voiceControl = true;
				break;
			case TwitchatEvent.STOP_RAFFLE:{
				this.$confirm("Close raffle", "All raffle entries will be lost", undefined, undefined, undefined, true)
				.then(async ()=> {
					StoreProxy.store.dispatch("stopRaffle");
				}).catch(()=> {
					//ignore
				});
				break;
			}

			case TwitchatEvent.START_EMERGENCY:
				this.$confirm("Enable emergency mode ?", undefined, undefined, undefined, undefined, true).then(()=>{
					StoreProxy.store.dispatch("setEmergencyMode", true);
				}).catch(()=>{});
				break;
			case TwitchatEvent.STOP_EMERGENCY:{
				StoreProxy.store.dispatch("setEmergencyMode", false);
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
			if(this.currentModal == modal) {
				this.currentModal = "";
			}else{
				this.currentModal = modal;
			}
		}
	}

	public startAd(duration:number):void {
		if(!this.canStartAd) return;

		if(isNaN(duration)) duration = 30;
		this.$confirm("Start a commercial?", "The commercial break will last "+duration+"s. It's not guaranteed that a commercial actually starts.").then(async () => {
			try {
				const res = await TwitchUtils.startCommercial(duration);
				if(res.length > 0) {
					this.canStartAd = false;
					this.startAdCooldown = Date.now() + res.retry_after * 1000;
					setTimeout(()=>{
						this.canStartAd = true;
						this.startAdCooldown = 0;
					}, this.startAdCooldown);
					StoreProxy.store.dispatch("setCommercialEnd", Date.now() + res.length * 1000);
				}
			}catch(error) {
				const e = (error as unknown) as {error:string, message:string, status:number}
				console.log(error);
				IRCClient.instance.sendNotice("commercial", e.message);
				// StoreProxy.store.state.alert = "An unknown error occured when starting commercial"
			}
		}).catch(()=>{/*ignore*/});
	}

	public onResize():void {
		const value = document.body.clientWidth > 449;
		if(value != StoreProxy.store.state.canSplitView) {
			StoreProxy.store.dispatch("canSplitView", value);
		}
	}

	public setCurrentNotification(value:string):void {
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
		this.currentModal = 'search';
	}

	/**
	 * Temporary debug command to try targetting a fadeout issue of the chat
	 * @param index 
	 */
	public debug(index:number):void {
		let div = (this.$refs.messages as Vue).$el as HTMLDivElement;
		if(index == 1) {
			gsap.to(div, {opacity:1, duration:.5});
		}
		if(index == 2) {
			gsap.to(div.getElementsByClassName("holder")[0], {opacity:1, duration:.5});
		}
	}

	/**
	 * Called when starting window resize
	 */
	public startDrag():void {
		this.resizing = true;
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

	private async renderFrame():Promise<void> {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());

		if(this.splitterPosY === 0) this.replaceTTS();
		if(!this.resizing) return;
		
		if(this.splitViewVertical) {
			this.leftColSize = (this.mouseY - 3) / (window.innerHeight - 40);//40 = ~footer's height
		}else{
			this.leftColSize = (this.mouseX - 3) / window.innerWidth;
		}
		
		this.leftColSize = Math.min(.95, Math.max(.05, this.leftColSize));

		Store.set(Store.LEFT_COL_SIZE, this.leftColSize);

		await this.$nextTick();
		this.replaceTTS();
	}

	private replaceTTS():void {
		if(!this.$refs.splitter) return;
		let rect = (this.$refs.splitter as HTMLDivElement).getBoundingClientRect();
		this.splitterPosY = rect.top;
		
		rect = (this.$refs.top as HTMLDivElement).getBoundingClientRect();
		this.availHeight = rect.height;
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

	&.splitView {
		.top {
			display: flex;
			flex-direction: row;

			.leftColumn {
				width: 50%;
				padding-right: 2px;
			}
			
			.rightColumn {
				width: calc(50% - 1px);
				display: flex;
				flex-direction: column;
				flex-grow: 1;
	
				.newUsers {
					right: 0;
					left: auto;
					margin: auto;
					position: relative;
					width: 100%;
					transform: unset;
				}
	
				.activityFeed {
					width: 100%;
					min-height: 0;//Shit hack to make overflow behave properly
				}
			}
		}

		&.splitVertical {
			.top {
				flex-direction: column;
				.leftColumn {
					width: 100%;
					// max-height: 60%;
				}
				.rightColumn {
					width: 100%;
					// max-height: 40%;
				}
			}

			&.switchCols {
				.top {
					flex-direction: column-reverse;
				}
				&.switchCols {
					.contentWindows.tts {
						transform: translateY(-100%);
					}
				}
			}

			.dragBt {
				margin-right: 0;
				padding: 3px;
				width: 100%;
				flex-grow: 1;
				cursor: ns-resize;
				.grip {
					left: unset;
					top: 50%;
					width: 100%;
					height: 1px;
					&::before {
						height: 5px;
						width: 40px;
					}
				}
			}
		}

		.popin {
			width: 50vw;
			left: auto;
			right: 0;
			top: 0;
		}

		.contentWindows {
			&.emotes {
				right: 0;
				left: auto;
				max-width: 50vw;
				margin: auto;
			}
			&.tts {
				left: auto;
				right:0;
			}
		}
		&.switchCols {
			.contentWindows.tts {
				left: 0;
				right: auto;
			}
		}
	}

	&.switchCols:not(.splitVertical) {
		.top {
			flex-direction: row-reverse;
			.leftColumn {
				padding-left: 2px;
				padding-right: 0;
			}
		}

		.popin {
			width: 50vw;
			left: 0;
			right: auto;
			top: 0;
		}

		.contentWindows {
			&.emotes {
				right: 0;
				left: auto;
				max-width: 50vw;
				margin: auto;
			}
		}
	}

	.dragBt {
		padding: 0 3px;
		cursor: ew-resize;
		user-select: none;
		z-index: 2;
		width: 14px;
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
			}
		}
	}

	.leftColumn {
		.activityFeed {
			margin-left: 0;
		}
	}

	.newUsers {
		position: fixed;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		margin: auto;
	}

	.top {
		width: 100%;
		flex-grow: 1;
		margin: auto;
		display: flex;
		flex-direction: row;
		overflow: hidden;

		.leftColumn {
			position: relative;
			flex-grow: 1;
			width: 100%;
			display: flex;
			flex-direction: column;

			.messages {
				flex-grow: 1;
			}
		}
		.chatForm {
			width: 100%;
			z-index: 31;
		}
	}

	.popin {
		margin-left: auto;
		z-index: 1;
		height: calc(100% - 40px);///40 => footer height
		:deep(.holder) {
			max-height: 100% !important;
		}
	}

	.contentWindows {
		position: absolute;
		bottom: 40px;
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