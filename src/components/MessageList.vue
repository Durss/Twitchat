<template>
	<div class="messagelist">
		<ChatMessage v-for="(m, index) in messages"
			:key="index+'_'+m.message"
			:messageData="m" />
	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import ChatMessage from '@/components/ChatMessage.vue';
import { ChatMessageData } from '@/components/ChatMessage.vue';

@Options({
	components:{
		ChatMessage
	},
	props: {
		max:Number,
		messages:Array,
	}
})
export default class MessageList extends Vue {
	public max!: number;
	public messages!:ChatMessageData[];

	// public mounted():void {
		
	// }
}
</script>

<style scoped lang="less">
.messagelist{
	
}
</style>