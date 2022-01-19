<template>
	<div class="chat">
		<div class="chatHolder">
			<MessageList class="messages" :max="$store.state.params.appearance.historySize.value" />
			<ChatForm class="chatForm"
				@poll="currentModal = 'poll'"
				@pred="currentModal = 'pred'"
				@clear="clearChat()"
				/>
		</div>
		
		<NewUsers v-if="$store.state.params.filters.firstMessage.value" />
		<PollForm v-if="currentModal == 'poll'" @close="currentModal = ''" />
		<PredictionForm v-if="currentModal == 'pred'" @close="currentModal = ''" />
	</div>
</template>

<script lang="ts">
import ChatForm from '@/components/chatform/ChatForm.vue';
import MessageList from '@/components/messages/MessageList.vue';
import NewUsers from '@/components/newusers/NewUsers.vue';
import PollForm from '@/components/poll/PollForm.vue';
import PredictionForm from '@/components/prediction/PredictionForm.vue';
import IRCClient from '@/utils/IRCClient';
import { Options, Vue } from 'vue-class-component';

@Options({
	components:{
		NewUsers,
		ChatForm,
		PollForm,
		PredictionForm,
		MessageList,
	},
	props:{
	},
})
export default class Chat extends Vue {

	public currentModal:string = "";

	public mounted():void {
		
	}

	public clearChat():void {
		IRCClient.instance.client.clear(IRCClient.instance.channel);
	}
}

</script>

<style scoped lang="less">
.chat{
	width: 100%;
	height: 100%;

	.chatHolder {
		height: 100%;
		max-width: 600px;
		margin: auto;
		display: flex;
		flex-direction: column;
		.messages {
			flex-grow: 1;
		}
		.chatForm {
			width: 100%;
		}
	}
}
</style>