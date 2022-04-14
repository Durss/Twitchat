<template>
	<div class="chatlight">
		<div class="chatHolder">
			<MessageList class="messages" :max="maxSize" :lightMode="true" />
		</div>
	</div>
</template>

<script lang="ts">
import MessageList from '@/components/messages/MessageList.vue';
import store from '@/store';
import IRCClient from '@/utils/IRCClient';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
	},
	components:{
		MessageList,
	}
})
export default class ChatLight extends Vue {

	public maxSize:number = 50;

	public mounted():void {
		IRCClient.instance.connect(this.$route.params.login as string);
		store.state.realHistorySize = this.maxSize;//Reduces memory footprint
	}
}
</script>

<style scoped lang="less">
.chatlight{
	width: 100%;
	height: 100%;

	.chatHolder {
		height: 100%;
		// max-width: 600px;
		margin: auto;
		display: flex;
		flex-direction: column;
		.messages {
			flex-grow: 1;
		}
	}
}
</style>