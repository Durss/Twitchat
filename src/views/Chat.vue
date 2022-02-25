<template>
	<div :class="classes">
		<div :class="topClasses">
			<div class="leftColumn">
				<MessageList ref="messages" class="messages"
					:max="$store.state.params.appearance.historySize.value" />

				<transition name="fade">
					<div class="dimmer" v-if="!splitView && (showDimmer || currentMessageSearch.length > 0)"
						@click="currentNotificationContent=currentMessageSearch=''"
					></div>
				</transition>

				<ChannelNotifications
					v-if="!splitView"
					:currentContent="currentNotificationContent"
					@showDimmer="showDimmer=true"
					@hideDimmer="showDimmer=false"
					@close="currentNotificationContent=''"
				/>
			</div>

			<div class="rightColumn" v-if="splitView">
				<NewUsers class="newUsers" v-if="$store.state.params.features.firstMessage.value" />

				<ActivityFeed class="activityFeed" listMode />

				<ChannelNotifications
					:currentContent="currentNotificationContent"
					@showDimmer="showDimmer=true"
					@hideDimmer="showDimmer=false"
					@close="currentNotificationContent=''"
				/>
			</div>
		</div>

		<div class="bottom">
			<ChatForm class="chatForm" ref="chatForm"
				@poll="currentModal = 'poll'"
				@pred="currentModal = 'pred'"
				@raffle="currentModal = 'raffle'"
				@bingo="currentModal = 'bingo'"
				@search="searchMessage"
				@setCurrentNotification="setCurrentNotification"
				v-model:showFeed="showFeed" @update:showFeed="v => showFeed = v"
				v-model:showEmotes="showEmotes" @update:showEmotes="v => showEmotes = v"
				v-model:showRewards="showRewards" @update:showRewards="v => showRewards = v"
				v-model:showCommands="showCommands" @update:showCommands="v => showCommands = v"
				v-model:showDevMenu="showDevMenu" @update:showDevMenu="v => showDevMenu = v"
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
			@poll="currentModal = 'poll'"
			@pred="currentModal = 'pred'"
			@raffle="currentModal = 'raffle'"
			@bingo="currentModal = 'bingo'"
			@clear="clearChat()"
			@close="showCommands = false" />

		<EmoteSelector class="contentWindows emotes"
			v-if="showEmotes"
			@select="onSelectEmote"
			@close="showEmotes = false" />
		
		<NewUsers class="newUsers" v-if="!splitView && $store.state.params.features.firstMessage.value" />

		<PollForm class="popin" v-if="currentModal == 'poll'" @close="currentModal = ''" />
		<RaffleForm class="popin" v-if="currentModal == 'raffle'" @close="currentModal = ''" />
		<BingoForm class="popin" v-if="currentModal == 'bingo'" @close="currentModal = ''" />
		<PredictionForm class="popin" v-if="currentModal == 'pred'" @close="currentModal = ''" />
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
import MessageSearch from '@/components/chatform/MessageSearch.vue';
import RewardsList from '@/components/chatform/RewardsList.vue';
import MessageList from '@/components/messages/MessageList.vue';
import NewUsers from '@/components/newusers/NewUsers.vue';
import PollForm from '@/components/poll/PollForm.vue';
import PredictionForm from '@/components/prediction/PredictionForm.vue';
import RaffleForm from '@/components/raffle/RaffleForm.vue';
import store, { BingoData, RaffleData } from '@/store';
import IRCClient from '@/utils/IRCClient';
import { TwitchTypes } from '@/utils/TwitchUtils';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';

@Options({
	components:{
		Button,
		NewUsers,
		ChatForm,
		PollForm,
		BingoForm,
		RaffleForm,
		MessageList,
		DevmodeMenu,
		RewardsList,
		ActivityFeed,
		CommandHelper,
		MessageSearch,
		EmoteSelector,
		PredictionForm,
		ChannelNotifications,
	},
	props:{
	},
})
export default class Chat extends Vue {

	public showDimmer:boolean = false;
	public showFeed:boolean = false;
	public showEmotes:boolean = false;
	public showRewards:boolean = false;
	public showDevMenu:boolean = false;
	public showCommands:boolean = false;
	public currentModal:string = "";
	public currentMessageSearch:string = "";
	public currentNotificationContent:string = "";
	
	public get splitView():boolean { return store.state.params.appearance.splitView.value && store.state.canSplitView; }

	public get classes():string[] {
		const res = ["chat"];
		if(this.splitView) res.push("splitView");
		return res;
	}

	public get topClasses():string[] {
		const res = ["top"];
		if(store.state.params.appearance.splitViewSwitch.value === true) res.push("switchCols");
		return res;
	}
	
	private resizeHandler!:(e:Event) => void;

	public mounted():void {
		this.resizeHandler = ()=> this.onResize();
		window.addEventListener("resize", this.resizeHandler);
		this.onResize();
		

		//Auto opens the prediction status if pending for completion
		watch(() => store.state.currentPrediction, () => {
			let prediction = store.state.currentPrediction as TwitchTypes.Prediction;
			if(prediction && prediction.status == "LOCKED") this.setCurrentNotification("prediction");
		});

		//Auto opens the poll status if terminated
		watch(() => store.state.currentPoll, () => {
			let poll = store.state.currentPoll as TwitchTypes.Poll;
			if(poll && poll.status == "COMPLETED") this.setCurrentNotification("poll");
		});

		//Auto opens the bingo status when created
		watch(() => store.state.bingo, () => {
			let bingo = store.state.bingo as BingoData;
			if(bingo?.opened === true) this.setCurrentNotification("bingo");
		});

		//Auto opens the raffle status when created
		watch(() => store.state.raffle, () => {
			let raffle = store.state.raffle as RaffleData;
			if(raffle && raffle.command) this.setCurrentNotification("raffle");
		});
	}

	public beforeUnmount():void {
		window.removeEventListener("resize", this.resizeHandler);
	}

	public clearChat():void {
		IRCClient.instance.client.clear(IRCClient.instance.channel);
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

			&.switchCols {
				flex-direction: row-reverse;
			}

			.leftColumn {
				width: 50%;
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
	
				.notificationActions {
					display: flex;
					flex-direction: row;
					justify-content: center;
					background-color: @mainColor_dark_extralight;
					padding: 10px;
					min-height: 40px;
					border-radius: 5px;
					z-index: 2;
					box-shadow: 0px -2px 2px 0px rgba(0,0,0,1);
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
		}
	}

	.newUsers {
		position: fixed;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		max-height: 35vh;
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
				width: 100%;
				height: 100%;
			}

			.dimmer {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background-color: rgba(0, 0, 0, .5);
				opacity:1;
				cursor: pointer;

				&.fade-enter-active {
					transition: all .25s;
				}

				&.fade-leave-active {
					transition: all .25s;
				}
				
				&.fade-enter-from,
				&.fade-leave-to {
					opacity:0;
				}
			}
		}
		.chatForm {
			width: 100%;
			z-index: 31;
		}
	}

	.bottom {
		// flex-grow: 1;
	}

	.popin {
		margin-left: auto;
		z-index: 1;
		:deep(.holder) {
			max-height: 100% !important;
		}
	}

	.eventInfo {
		z-index: 1;
	}

	.contentWindows {
		position: absolute;
		bottom: 40px;
		left: 0;
		z-index: 2;

		&.emotes {
			max-width: 100%;
		}
	}
}
</style>