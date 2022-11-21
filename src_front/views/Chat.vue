<template>
	<div :class="classes">
		<div class="top" ref="top">
			<div class="scrollable" ref="scrollable">
				<div class="column" v-for="c, index in $store('main').chatColumnsConfig"
				:ref="'column_'+c.order"
				:key="c.order"
				:style="getColStyles(c)">
					<div class="subHolder">
	
						<GreetThem class="greetThem"
						v-if=" $store('main').chatColumnsConfig.length == 1
						|| ($store('params').features.firstMessage.value && index == 1)" />
	
						<MessageList ref="messages" class="messages"
							v-if="!hideChat"
							@showModal="(v:string) => currentModal = v"
							:maxMessages="50"
							:config="c"
							filterId="chat"/>
					</div>
		
					<div class="dragBt" ref="splitter"
					v-if="$store('main').chatColumnsConfig.length > 1"
					@pointerdown="startDrag($event, c)"
					@pointerup="startDrag($event, c)">
						<div class="grip"></div>
					</div>
				</div>
			</div>
				
			<div class="addCol">
				<Button :icon="$image('icons/add_purple.svg')" small white @click="addColumn()" data-tooltip="Add column" />
			</div>
		</div>

		<Teleport v-if="formsColumnTarget" :to="formsColumnTarget">
			<VoiceTranscript class="contentWindows tts" />

			<PollForm			class="popin" v-if="currentModal == 'poll'" @close="currentModal = ''" :voiceControl="voiceControl" />
			<ChatSuggestionForm	class="popin" v-if="currentModal == 'chatpoll'" @close="currentModal = ''" :voiceControl="voiceControl" />
			<RaffleForm			class="popin" v-if="currentModal == 'raffle'" @close="currentModal = ''" :voiceControl="voiceControl" />
			<PredictionForm		class="popin" v-if="currentModal == 'pred'" @close="currentModal = ''" :voiceControl="voiceControl" />
			<BingoForm			class="popin" v-if="currentModal == 'bingo'" @close="currentModal = ''" />
			<LiveFollowings		class="popin" v-if="currentModal == 'liveStreams'" @close="currentModal = ''" />
			<StreamInfoForm		class="popin" v-if="currentModal == 'streamInfo'" @close="currentModal = ''" />
			<TTUserList			class="popin" v-if="currentModal == 'TTuserList'" @close="currentModal = ''" />
			<PinedMessages		class="popin" v-if="currentModal == 'pins'" @close="currentModal = ''" />
		</Teleport>

		<ChannelNotifications
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

		<!-- <MessageList class="contentWindows feed"
			v-if="showFeed"
			@showModal="(v:string) => currentModal = v"
			:maxMessages="50 ?? $store('params').appearance.historySize.value" /> -->

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
		
		<Parameters v-if="$store('main').showParams" />
		
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
		
		<Accessibility />

		<div class="blinkLayer" ref="blinkLayer" v-if="showBlinkLayer" @click="showBlinkLayer=false"></div>
	</div>
</template>

<script lang="ts">
import BingoForm from '@/components/bingo/BingoForm.vue';
import Button from '@/components/Button.vue';
import ChannelNotifications from '@/components/channelnotifications/ChannelNotifications.vue';
import ChatForm from '@/components/chatform/ChatForm.vue';
import CommandHelper from '@/components/chatform/CommandHelper.vue';
import DevmodeMenu from '@/components/chatform/DevmodeMenu.vue';
import EmoteSelector from '@/components/chatform/EmoteSelector.vue';
import LiveFollowings from '@/components/chatform/LiveFollowings.vue';
import RewardsList from '@/components/chatform/RewardsList.vue';
import TTUserList from '@/components/chatform/TTUserList.vue';
import UserList from '@/components/chatform/UserList.vue';
import MessageList from '@/components/messages/MessageList.vue';
import GreetThem from '@/components/newusers/GreetThem.vue';
import Parameters from '@/components/params/Parameters.vue';
import ChatSuggestionForm from '@/components/poll/ChatSuggestionForm.vue';
import PollForm from '@/components/poll/PollForm.vue';
import PredictionForm from '@/components/prediction/PredictionForm.vue';
import RaffleForm from '@/components/raffle/RaffleForm.vue';
import StreamInfoForm from '@/components/streaminfo/StreamInfoForm.vue';
import DataStore from '@/store/DataStore';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import DeezerHelper from '@/utils/music/DeezerHelper';
import PublicAPI from '@/utils/PublicAPI';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import TwitchatEvent from '@/events/TwitchatEvent';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import ChatAlertMessage from '../components/chatAlert/ChatAlertMessage.vue';
import Gngngn from '../components/chatform/Gngngn.vue';
import PinedMessages from '../components/chatform/PinedMessages.vue';
import DataServerSyncModal from '../components/modals/DataServerSyncModal.vue';
import EmergencyFollowsListModal from '../components/modals/EmergencyFollowsListModal.vue';
import DonorState from '../components/user/DonorState.vue';
import UserCard from '../components/user/UserCard.vue';
import VoiceTranscript from '../components/voice/VoiceTranscript.vue';
import Accessibility from './Accessibility.vue';
import type { StyleValue } from 'vue';

@Options({
	components:{
		Button,
		Gngngn,
		GreetThem,
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
		DataServerSyncModal,
		ChannelNotifications,
		EmergencyFollowsListModal,
	},
	props:{
	},
})
export default class Chat extends Vue {

	public isDonor = true;
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
	public formsColumnTarget:HTMLDivElement|null = null;
	
	private disposed = false;
	private mouseX = 0;
	private resizing = false;
	private canStartAd = true;
	private closingDonorState = false;
	private draggedCol:TwitchatDataTypes.ChatColumnsConfig|null = null;
	
	private mouseUpHandler!:(e:MouseEvent|TouchEvent)=> void;
	private mouseMoveHandler!:(e:MouseEvent|TouchEvent)=> void;
	private publicApiEventHandler!:(e:TwitchatEvent)=> void;
	
	public get splitViewVertical():boolean { return this.$store("params").appearance.splitViewVertical.value as boolean && this.$store("main").canSplitView && !this.hideChat; }
	public get hideChat():boolean { return this.$store("params").appearance.hideChat.value as boolean; }
	public get needUserInteraction():boolean { return Config.instance.DEEZER_CONNECTED && !DeezerHelper.instance.userInteracted; }
	public get showEmergencyFollows():boolean { return this.$store("emergency").follows.length > 0 && !this.$store("emergency").emergencyStarted; }

	public get classes():string[] {
		const res = ["chat"];
		if(this.splitViewVertical) res.push("splitVertical")
		return res;
	}

	public getColStyles(col:TwitchatDataTypes.ChatColumnsConfig):{[key:string]:string} {
		let size = col.size * 100;
		const cols = this.$store('main').chatColumnsConfig;
		if(cols.length == 1) {
			return {
				width:"100%",
				height:"100%",
			}
		}
		if(this.splitViewVertical) {
			const value = `calc(${size}% - 7px)`;//7px => dragbar size
			return {
				"height": value,
				"min-height": value,
				"max-height": value,
			}
		}else{
			const value = `${size}%`;
			return {
				"width": value,
				"min-width": value,
				"max-width": value,
			}
		}
	}

	private resizeHandler!:(e:Event) => void;

	public beforeMount():void {

		//Check user reached a new donor level
		this.isDonor = StoreProxy.auth.twitch.user.donor.upgrade===true;

		//Define if store sync modal should be displayed
		this.showStorageModal = DataStore.get(DataStore.SYNC_DATA_TO_SERVER) == null;
		
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

		this.resizeHandler = ()=> this.onResize();
		this.publicApiEventHandler = (e:TwitchatEvent) => this.onPublicApiEvent(e);
		this.mouseUpHandler = () => this.resizing = false;
		this.mouseMoveHandler = (e:MouseEvent|TouchEvent) => this.onMouseMove(e);

		window.addEventListener("resize", this.resizeHandler);
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
			if(raffle && raffle.command) this.setCurrentNotification("raffle");
		});

		watch(()=>this.currentModal, ()=>{
			this.voiceControl = false;
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
	}

	public mounted():void {
		if(this.isDonor) {
			//Show donor badge
			const el = (this.$refs.donor as Vue).$el as HTMLDivElement;
			gsap.from(el, {bottom:"-350px", duration:2, ease:"back.out", delay:1});
		}
		this.computeWindowsSizes();
	}

	public beforeUnmount():void {
		this.disposed = true;
		window.removeEventListener("resize", this.resizeHandler);
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
		if(this.closingDonorState) return;
		//Show donor badge
		this.closingDonorState = true;
		const el = (this.$refs.donor as Vue).$el as HTMLDivElement;
		gsap.to(el, {bottom:"-350px", duration:1, ease:"back.in", onComplete:()=>{
			this.isDonor = false;
		}});
	}

	public clearChat():void {
		TwitchUtils.deleteMessages(StoreProxy.auth.twitch.user.id);
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
			case TwitchatEvent.VIEWERS_COUNT_TOGGLE:
				this.$store("params").appearance.showViewersCount.value = !this.$store("params").appearance.showViewersCount.value;
				this.$store("params").updateParams()
				break;

			case TwitchatEvent.MOD_TOOLS_TOGGLE:
				this.$store("params").features.showModTools.value = !this.$store("params").features.showModTools.value;
				this.$store("params").updateParams()
				break;

			case TwitchatEvent.CENSOR_DELETED_MESSAGES_TOGGLE:
				this.$store("params").filters.censorDeletedMessages.value = !this.$store("params").filters.censorDeletedMessages.value;
				this.$store("params").updateParams()
				break;

			case TwitchatEvent.CREATE_POLL:
				this.currentModal = 'poll';
				await this.$nextTick();
				this.voiceControl = true;
				break;
			case TwitchatEvent.STOP_POLL:{
				const poll = this.$store("poll").data;
				if(!poll) return;
				try {
					await TwitchUtils.endPoll(poll.id, poll.channel_id);
				}catch(error) {
					this.$store("main").alertData = "An error occurred while deleting the poll";
				}
				break;
			}

			case TwitchatEvent.CREATE_PREDICTION:
				this.currentModal = 'pred';
				await this.$nextTick();
				this.voiceControl = true;
				break;
			case TwitchatEvent.STOP_PREDICTION:{
				const prediction = this.$store("prediction").data;
				if(!prediction) return;
				try {
					await TwitchUtils.endPrediction(prediction.channel_id, prediction.id, prediction.outcomes[0].id, true);
				}catch(error) {
					this.$store("main").alertData = "An error occurred while deleting the prediction";
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
					this.$store("raffle").stopRaffle();
				}).catch(()=> {
					//ignore
				});
				break;
			}

			case TwitchatEvent.START_EMERGENCY:
				this.$confirm("Enable emergency mode ?", undefined, undefined, undefined, undefined, true).then(()=>{
					this.$store("emergency").setEmergencyMode(true);
				}).catch(()=>{});
				break;
				case TwitchatEvent.STOP_EMERGENCY:{
				this.$store("emergency").setEmergencyMode(false);
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
				const res = await TwitchUtils.startCommercial(duration, StoreProxy.auth.twitch.user.id);
				if(res.length > 0) {
					this.canStartAd = false;
					this.startAdCooldown = Date.now() + res.retry_after * 1000;
					setTimeout(()=>{
						this.canStartAd = true;
						this.startAdCooldown = 0;
					}, this.startAdCooldown);
					this.$store("stream").setCommercialEnd( Date.now() + res.length * 1000 );
				}
			}catch(error) {
				const e = (error as unknown) as {error:string, message:string, status:number}
				console.log(error);
				
				const notice:TwitchatDataTypes.MessageNoticeData = {
					id:Utils.getUUID(),
					date:Date.now(),
					type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
					platform:"twitchat",
					noticeId:TwitchatDataTypes.TwitchatNoticeType.ERROR,
					message:"An error occured whens tarting the commercial : " + e.message,
				}
				StoreProxy.chat.addMessage(notice);
				// this.$store("store").state.alert = "An unknown error occured when starting commercial"
			}
		}).catch(()=>{/*ignore*/});
	}

	public onResize():void {
		const value = document.body.clientWidth > 449;
		if(value != this.$store("main").canSplitView) {
			this.$store("main").setCanSplitView(value);
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
	public startDrag(event:PointerEvent, col:TwitchatDataTypes.ChatColumnsConfig):void {
		this.resizing = true;
		this.draggedCol = col;
		(event.target as HTMLDivElement).setPointerCapture(event.pointerId);
	}

	/**
	 * Add a chat column
	 */
	public addColumn():void {
		const col = this.$store("main").addChatColumn();
		const colList = this.$store("main").chatColumnsConfig;
		let totalSize = 0;
		for (let i = 0; i < colList.length; i++) {
			const c = colList[i];
			totalSize += c.size;
		}

		const holder = this.$refs.scrollable as HTMLDivElement;
		if(totalSize < 1) {
			for (let i = 0; i < colList.length; i++) {
				const c = colList[i];
				c.size = 1 - totalSize;
			}
		}
		// const px = holder.scrollWidth - Math.max(holderBounds.width, totalSize) - colList[colList.length-1].size;
		// console.log(holder.scrollWidth);
		gsap.to(holder, {duration:1.5, ease:"sine.inout", scrollTo:{x:holder.scrollWidth}});

		this.$nextTick().then(()=>{
			this.computeWindowsSizes();
		});
	}

	/**
	 * Called when the mouse moves
	 */
	private async onMouseMove(e:MouseEvent|TouchEvent):Promise<void> {
		if(e.type == "mousemove") {
			this.mouseX = (e as MouseEvent).clientX;
		}else{
			this.mouseX = (e as TouchEvent).touches[0].clientX;
		}
	}

	/**
	 * Manage colmumns resize
	 */
	private async renderFrame():Promise<void> {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());

		if(!this.resizing) return;
		
		if(this.splitViewVertical) {
			//TODO
		}else{
			const cols = this.$store('main').chatColumnsConfig;
			const holder = this.$refs.scrollable as HTMLDivElement;
			const holderBounds = holder.getBoundingClientRect();
			for (let i = 0; i < cols.length; i++) {
				const c = cols[i];
				if(c == this.draggedCol) {
					const el = (this.$refs["column_"+c.order] as HTMLDivElement[])[0];
					const bounds = el.getBoundingClientRect();
					c.size = Math.max(200, this.mouseX - bounds.left + 14) / holderBounds.width;
					this.computeWindowsSizes()
				}else{

				}
			}
		}
		
		this.$store('main').saveChatColumnConfs();

		await this.$nextTick();
	}

	/**
	 * Computes the form windows styles depending on the existing columns.
	 * Search for a column that filters out messages and match the form to
	 * its size if any so the messages stay visible.
	 * If none found, the windows will just be displayed full screen.
	 */
	private computeWindowsSizes():void {
		const cols = this.$store('main').chatColumnsConfig;
		for (let i = 0; i < cols.length; i++) {
			const c = cols[i];
			if(c.filters.message !== true) {
				const colHolders = this.$refs["column_"+c.order] as HTMLDivElement[];
				if(!colHolders) break; 
				const colHolder = colHolders[0];
				if(colHolder) {
					this.formsColumnTarget = colHolder;
				}
			}
		}
		if(!this.formsColumnTarget) {
			this.formsColumnTarget = (this.$refs["column_0"] as HTMLDivElement[])[0];
		}
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


	.splitVertical {
		.top {
			flex-direction: column;
			.column {
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
		}
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
		&.actions, &.emotes, &.devmode {
			max-height: calc(100vh - 60px);
		}
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
	
				// &:nth-last-child(2) {
				// 	.dragBt {
				// 		.grip {
				// 			background: transparent;
				// 			&::before {
				// 				width: 2px;
				// 			}
				// 		}
				// 	}
				// }
			}
		}

		.addCol {
			flex-grow: 1;
			position: relative;
			min-width: 1em;
			z-index: 3;
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