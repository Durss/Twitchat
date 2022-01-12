<template>
	<div class="chat">
		<div class="chatHolder">
			<MessageList class="messages" :max="$store.state.params.historySize" />
			<ChatForm class="chatForm" />
		</div>
		<NewUsers v-if="$store.state.params.firstMessage" />
	</div>
</template>

<script lang="ts">
import ChatForm from '@/components/chatform/ChatForm.vue';
import MessageList from '@/components/messages/MessageList.vue';
import NewUsers from '@/components/newusers/NewUsers.vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	components:{
		NewUsers,
		ChatForm,
		MessageList,
	},
	props:{
	},
})
export default class Chat extends Vue {
	
}

</script>

<style scoped lang="less">
.chat{
	width: 100%;
	height: 100%;

	.chatHolder {
		height: 100%;
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