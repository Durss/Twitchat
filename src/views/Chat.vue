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

		<PollForm class="popin" v-if="currentModal == 'poll'" @close="currentModal = ''" />
		<ChatPollForm class="popin" v-if="currentModal == 'chatpoll'" @close="currentModal = ''" />
		<RaffleForm class="popin" v-if="currentModal == 'raffle'" @close="currentModal = ''" />
		<BingoForm class="popin" v-if="currentModal == 'bingo'" @close="currentModal = ''" />
		<PredictionForm class="popin" v-if="currentModal == 'pred'" @close="currentModal = ''" />
		<LiveFollowings class="popin" v-if="currentModal == 'liveStreams'" @close="currentModal = ''" />
		<StreamInfoForm class="popin" v-if="currentModal == 'streamInfo'" @close="currentModal = ''" />
		<TTUserList class="popin" v-if="currentModal == 'TTuserList'" @close="currentModal = ''" />
		
		<Parameters v-if="$store.state.showParams" />

		<Teleport to="body">
			<div class="deezerCTA" v-if="needUserInteraction">
				<img src="@/assets/icons/deezer_color.svg" alt="deezer" class="icon">
				<div class="title">Click</div>
				<div class="message">Deezer needs you to click here to be able to play music.</div>
			</div>
		</Teleport>
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
import store from '@/store';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import type { BingoData, RaffleData } from '@/utils/CommonDataTypes';
import Config from '@/utils/Config';
import DeezerHelper from '@/utils/DeezerHelper';
import IRCClient from '@/utils/IRCClient';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import TwitchUtils from '@/utils/TwitchUtils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

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
		ChannelNotifications,
	},
	props:{
	},
})
export default class Chat extends Vue {

	public showFeed = false;
	public showEmotes = false;
	public showRewards = false;
	public showDevMenu = false;
	public showCommands = false;
	public showUserList = false;
	public showChatUsers = false;
	public canStartAd = true;
	public startAdCooldown = 0;
	public currentModal = "";
	public currentMessageSearch = "";
	public currentNotificationContent = "";
	
	private publicApiEventHandler!:(e:TwitchatEvent)=> void;
	
	public get splitView():boolean { return store.state.params.appearance.splitView.value as boolean && store.state.canSplitView && !this.hideChat; }
	public get splitViewVertical():boolean { return store.state.params.appearance.splitViewVertical.value as boolean && store.state.canSplitView && !this.hideChat; }
	public get hideChat():boolean { return store.state.params.appearance.hideChat.value as boolean; }
	public get needUserInteraction():boolean { return Config.instance.DEEZER_CONNECTED && !DeezerHelper.instance.userInteracted; }

	public get classes():string[] {
		const res = ["chat"];
		if(this.splitView) {
			res.push("splitView");
			if(store.state.params.appearance.splitViewSwitch.value === true) {
				res.push("switchCols");
			}
			if(this.splitViewVertical) res.push("splitVertical")
		}
		return res;
	}

	private resizeHandler!:(e:Event) => void;

	public mounted():void {
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
		this.onResize();

		//Auto opens the prediction status if pending for completion
		watch(() => store.state.currentPrediction, (newValue, prevValue) => {
			let prediction = store.state.currentPrediction as TwitchDataTypes.Prediction;
			const isNew = !prevValue || (newValue && prevValue.id != newValue.id);
			if(prediction && prediction.status == "LOCKED" || isNew) this.setCurrentNotification("prediction");
		});

		//Auto opens the poll status if terminated
		watch(() => store.state.currentPoll, (newValue, prevValue) => {
			let poll = store.state.currentPoll as TwitchDataTypes.Poll;
			const isNew = !prevValue || (newValue && prevValue.id != newValue.id);
			if(poll && poll.status == "COMPLETED" || isNew) this.setCurrentNotification("poll");
		});

		//Auto opens the bingo status when created
		watch(() => store.state.bingo, () => {
			let bingo = store.state.bingo as BingoData;
			if(bingo) this.setCurrentNotification("bingo");
		});

		//Auto opens the raffle status when created
		watch(() => store.state.raffle, () => {
			let raffle = store.state.raffle as RaffleData;
			if(raffle && raffle.command) this.setCurrentNotification("raffle");
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
	}

	public clearChat():void {
		IRCClient.instance.client.clear(IRCClient.instance.channel);
	}

	/**
	 * Called when requesting an action from the public API
	 */
	private onPublicApiEvent(e:TwitchatEvent):void {
		let notif = "";
		let modal = "";
		switch(e.type) {
			case TwitchatEvent.POLL_TOGGLE: notif = 'poll'; break;
			case TwitchatEvent.PREDICTION_TOGGLE: notif = 'pred'; break;
			case TwitchatEvent.BINGO_TOGGLE: notif = 'bingo'; break;
			case TwitchatEvent.RAFFLE_TOGGLE: notif = 'raffle'; break;
			case TwitchatEvent.ACTIVITY_FEED_TOGGLE: this.showFeed = !this.showFeed; break;
			case TwitchatEvent.VIEWERS_COUNT_TOGGLE:
				store.state.params.appearance.showViewersCount.value = !store.state.params.appearance.showViewersCount.value;
				store.dispatch('updateParams');
				break;
			case TwitchatEvent.MOD_TOOLS_TOGGLE:
				store.state.params.features.showModTools.value = !store.state.params.features.showModTools.value;
				store.dispatch('updateParams');
				break;
			case TwitchatEvent.CENSOR_DELETED_MESSAGES_TOGGLE:
				store.state.params.filters.censorDeletedMessages.value = !store.state.params.filters.censorDeletedMessages.value;
				store.dispatch('updateParams');
				break;
		}

		if(notif) {
			if(this.currentNotificationContent == notif) {
				this.currentNotificationContent = "";
			}else{
				this.currentNotificationContent = notif;
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
					store.dispatch("setCommercialEnd", Date.now() + res.length * 1000);
				}
			}catch(error) {
				const e = (error as unknown) as {error:string, message:string, status:number}
				console.log(error);
				IRCClient.instance.sendNotice("commercial", e.message);
				// store.state.alert = "An unknown error occured when starting commercial"
			}
		}).catch(()=>{/*ignore*/});
	}

	public onResize():void {
		const value = document.body.clientWidth > 599;
		if(value != store.state.canSplitView) {
			store.dispatch("canSplitView", value);
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