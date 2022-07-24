<template>
	<div :class="classes">
		<div class="top">
			<div class="leftColumn">
				<MessageList ref="messages" class="messages"
					v-if="!hideChat"
					@showModal="(v:string) => currentModal = v"
					:max="$store.state.params.appearance.historySize.value" />
					
				<ActivityFeed class="activityFeed" listMode v-if="hideChat" />
			</div>

			<div class="rightColumn" v-if="splitView">
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

		<PollForm class="popin" v-if="currentModal == 'poll'" @close="currentModal = ''" :voiceControl="voiceControl" />
		<ChatPollForm class="popin" v-if="currentModal == 'chatpoll'" @close="currentModal = ''" :voiceControl="voiceControl" />
		<RaffleForm class="popin" v-if="currentModal == 'raffle'" @close="currentModal = ''" />
		<BingoForm class="popin" v-if="currentModal == 'bingo'" @close="currentModal = ''" />
		<PredictionForm class="popin" v-if="currentModal == 'pred'" @close="currentModal = ''" />
		<LiveFollowings class="popin" v-if="currentModal == 'liveStreams'" @close="currentModal = ''" />
		<StreamInfoForm class="popin" v-if="currentModal == 'streamInfo'" @close="currentModal = ''" />
		<TTUserList class="popin" v-if="currentModal == 'TTuserList'" @close="currentModal = ''" />
		
		<Parameters v-if="$store.state.showParams" />

		<DataServerSyncModal v-if="showStorageModal" @close="showStorageModal = false" />
		<EmergencyFollowsListModal v-if="showEmergencyFollows && !forceEmergencyFollowClose" @close="forceEmergencyFollowClose=true" />

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

@Options({
	components:{
		Button,
		NewUsers,
		ChatForm,
		UserList,
		PollForm,
		BingoForm,
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
		PredictionForm,
		LiveFollowings,
		StreamInfoForm,
		ChatAlertMessage,
		DataServerSyncModal,
		ChannelNotifications,
		EmergencyFollowsListModal,
	},
	props:{
	},
})
export default class Chat extends Vue {

	public showFeed:boolean = false;
	public showEmotes:boolean = false;
	public showRewards:boolean = false;
	public showDevMenu:boolean = false;
	public showCommands:boolean = false;
	public showUserList:boolean = false;
	public showChatUsers:boolean = false;
	public showStorageModal:boolean = false;
	public showBlinkLayer:boolean = false;
	public canStartAd:boolean = true;
	public voiceControl:boolean = false;
	public forceEmergencyFollowClose = false;
	public startAdCooldown = 0;
	public currentModal = "";
	public currentMessageSearch = "";
	public currentNotificationContent = "";
	
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

	private resizeHandler!:(e:Event) => void;

	public beforeMount():void {
		this.showStorageModal = Store.get(Store.SYNC_DATA_TO_SERVER) == null;
		this.resizeHandler = ()=> this.onResize();
		this.publicApiEventHandler = (e:TwitchatEvent) => this.onPublicApiEvent(e);
		window.addEventListener("resize", this.resizeHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.POLL_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.PREDICTION_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.BINGO_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.RAFFLE_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.ACTIVITY_FEED_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.VIEWERS_COUNT_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.MOD_TOOLS_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CENSOR_DELETED_MESSAGES_TOGGLE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CREATE_POLL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CREATE_PREDICTION, this.publicApiEventHandler);
		this.onResize();

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

	public beforeUnmount():void {
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
		PublicAPI.instance.removeEventListener(TwitchatEvent.CREATE_PREDICTION, this.publicApiEventHandler);
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
			case TwitchatEvent.CREATE_PREDICTION:
				this.currentModal = 'prediction';
				await this.$nextTick();
				this.voiceControl = true;
				break;
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
					window.setTimeout(()=>{
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
		const value = document.body.clientWidth > 599;
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
		this.currentMessageSearch = str;
	}

	/**
	 * Temporary debug command
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
}

</script>

<style scoped lang="less">
.chat{
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;

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
					max-height: 60%;
				}
				.rightColumn {
					width: 100%;
					max-height: 40%;
				}
			}

			&.switchCols {
				.top {
					flex-direction: column-reverse;
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

			&.streams {
				width: 50%;
				height: 100%;
			}
		}
	}

	&.switchCols:not(.splitVertical) {
		.top {
			flex-direction: row-reverse;
		}

		.leftColumn {
			padding-left: 2px;
			padding-right: 0;
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
		height: 100%;//calc(100% - 40px);///40 => footer height
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