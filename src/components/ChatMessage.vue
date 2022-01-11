<template>
	<div class="chatmessage">
		{{messageData.message}}
	</div>
</template>

<script lang="ts">
import { ChatUserstate } from 'tmi.js';
import { Options, Vue } from 'vue-class-component';

@Options({
	components:{},
	props:{
		messageData:Object,
	}
})
export default class ChatMessage extends Vue {
	public messageData!:ChatMessageData;
}

export interface ChatMessageData {
	message:string;
	tags:ChatUserstate;
	channel:string;
	self:boolean;
}
</script>

<style scoped lang="less">
.chatmessage{
	
}
</style>