<template>
	<div class="chatlight">
		<div class="chatHolder">
			<MessageList class="messages" :maxMessages="maxSize" :lightMode="true" />
		</div>
	</div>
</template>

<script lang="ts">
import MessageList from '@/components/messages/MessageList.vue';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		MessageList,
	}
})
export default class ChatLight extends Vue {

	public maxSize = 50;

	public mounted():void {
		this.$store("chat").realHistorySize = this.maxSize;//Reduces memory footprint
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