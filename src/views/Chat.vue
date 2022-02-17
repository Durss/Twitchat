<template>
	<div class="chat">
		<div class="chatHolder">
			<div class="messagesHolder">
				<MessageList ref="messages" class="messages"
					:max="$store.state.params.appearance.historySize.value" />

				<transition name="fade">
					<div class="dimmer" v-if="showDimmer" @click="currentNotificationContent=''"></div>
				</transition>
			</div>
			
			<ChannelNotifications class="eventInfo"
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
		
		<NewUsers v-if="$store.state.params.features.firstMessage.value" />
		<PollForm class="popin" v-if="currentModal == 'poll'" @close="currentModal = ''" />
		<RaffleForm class="popin" v-if="currentModal == 'raffle'" @close="currentModal = ''" />
		<PredictionForm class="popin" v-if="currentModal == 'pred'" @close="currentModal = ''" />
	</div>
</template>

<script lang="ts">
import ChannelNotifications from '@/components/channelnotifications/ChannelNotifications.vue';
import ChatForm from '@/components/chatform/ChatForm.vue';
import MessageList from '@/components/messages/MessageList.vue';
import NewUsers from '@/components/newusers/NewUsers.vue';
import PollForm from '@/components/poll/PollForm.vue';
import PredictionForm from '@/components/prediction/PredictionForm.vue';
import RaffleForm from '@/components/raffle/RaffleForm.vue';
import IRCClient from '@/utils/IRCClient';
import { Options, Vue } from 'vue-class-component';

@Options({
	components:{
		NewUsers,
		ChatForm,
		PollForm,
		RaffleForm,
		MessageList,
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

	public mounted():void {
		
	}

	public clearChat():void {
		IRCClient.instance.client.clear(IRCClient.instance.channel);
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