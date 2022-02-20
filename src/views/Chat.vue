<template>
	<div :class="classes">
		<div class="chatHolder">
			<div class="messagesHolder">
				<MessageList ref="messages" class="messages"
					:max="$store.state.params.appearance.historySize.value" />

				<transition name="fade">
					<div class="dimmer" v-if="showDimmer" @click="currentNotificationContent=''"></div>
				</transition>
			</div>

			<ChannelNotifications class="eventInfo"
				v-if="!splitView"
				:currentContent="currentNotificationContent"
				@showDimmer="showDimmer=true"
				@hideDimmer="showDimmer=false"
				@close="currentNotificationContent=''"/>

			<ChatForm class="chatForm"
				@poll="currentModal = 'poll'"
				@pred="currentModal = 'pred'"
				@raffle="currentModal = 'raffle'"
				@showNotificationContent="setCurrentNotification"
				@clear="clearChat()"
				/>
		</div>

		<div class="rightColumn" v-if="splitView">
			<NewUsers class="newUsers" v-if="$store.state.params.features.firstMessage.value" />

			<ActivityFeed class="activityFeed" listMode />

			<ChannelNotifications class="eventInfo"
				:currentContent="currentNotificationContent"
				@showDimmer="showDimmer=true"
				@hideDimmer="showDimmer=false"
				@close="currentNotificationContent=''"/>
		</div>
		
		<NewUsers class="newUsers" v-if="!splitView && $store.state.params.features.firstMessage.value" />
		<PollForm class="popin" v-if="currentModal == 'poll'" @close="currentModal = ''" />
		<RaffleForm class="popin" v-if="currentModal == 'raffle'" @close="currentModal = ''" />
		<PredictionForm class="popin" v-if="currentModal == 'pred'" @close="currentModal = ''" />
	</div>
</template>

<script lang="ts">
import ChannelNotifications from '@/components/channelnotifications/ChannelNotifications.vue';
import ActivityFeed from '@/components/chatform/ActivityFeed.vue';
import ChatForm from '@/components/chatform/ChatForm.vue';
import MessageList from '@/components/messages/MessageList.vue';
import NewUsers from '@/components/newusers/NewUsers.vue';
import PollForm from '@/components/poll/PollForm.vue';
import PredictionForm from '@/components/prediction/PredictionForm.vue';
import RaffleForm from '@/components/raffle/RaffleForm.vue';
import store from '@/store';
import IRCClient from '@/utils/IRCClient';
import { Options, Vue } from 'vue-class-component';

@Options({
	components:{
		NewUsers,
		ChatForm,
		PollForm,
		RaffleForm,
		MessageList,
		ActivityFeed,
		PredictionForm,
		ChannelNotifications,
	},
	props:{
	},
})
export default class Chat extends Vue {

	public showDimmer:boolean = false;
	public currentModal:string = "";
	public currentNotificationContent:string = "";
	
	public get splitView():boolean { return store.state.params.appearance.splitView.value && store.state.canSplitView; }

	public get classes():string[] {
		const res = ["chat"];
		if(this.splitView) res.push("splitView");
		return res;
	}
	
	private resizeHandler!:(e:Event) => void;

	public mounted():void {
		this.resizeHandler = (e:Event)=> this.onResize(e);
		window.addEventListener("resize", this.resizeHandler);
		this.onResize();
	}

	public beforeUnmount():void {
		window.removeEventListener("resize", this.resizeHandler);
	}

	public clearChat():void {
		IRCClient.instance.client.clear(IRCClient.instance.channel);
	}

	public onResize(e?:Event):void {
		const value = document.body.clientWidth > 600;
		if(value != store.state.canSplitView) {
			store.dispatch("canSplitView", value);
		}
	}

	public setCurrentNotification(value:string):void {
		this.currentNotificationContent = value;
	}
}

</script>

<style scoped lang="less">
.chat{
	width: 100%;
	height: 100%;

	&.splitView {
		display: flex;
		flex-direction: row;
		.chatHolder {
			width: 50%;
		}
		.rightColumn {
			width: calc(50% - 1px);
			// height: 100%;
			// max-height: 100%;
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

	.newUsers {
		position: fixed;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		max-height: 35vh;
		width: 100%;
		margin: auto;
	}

	.chatHolder {
		height: 100%;
		// max-width: 600px;
		margin: auto;
		display: flex;
		flex-direction: column;

		.messagesHolder {
			position: relative;
			flex-grow: 1;

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
		}
	}

	.popin {
		:deep(.holder) {
			max-height: 100% !important;
		}
	}

	.eventInfo {
		z-index: 1;
	}
}
</style>