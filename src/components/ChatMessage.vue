<template>
	<div class="chatmessage">
		<!-- <div class="badges"> -->
			<img :src="b.image_url_1x" v-for="(b,index) in badges" :key="index" class="badge">
		<!-- </div> -->
		<span class="login" :style="styles">{{messageData.tags["display-name"]}}:</span>
		<span class="message">{{messageData.message}}</span>
	</div>
</template>

<script lang="ts">
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
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

	public get styles():unknown {
		return {
			color:this.messageData.tags.color,
		}
	}

	public badges:TwitchTypes.Badge[] = [];
	// public get color():string {
	// 	return this.messageData.tags.color as string;
	// }

	public async mounted():Promise<void> {
		const channelID:string = this.messageData.tags['room-id'] as string;
		this.badges = TwitchUtils.getBadgesImagesFromRawBadges(channelID, this.messageData.tags.badges);
		// console.log(this.badges);
	}
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
	font-family: "FuturaLight";
	font-size: 16px;
	color: v-bind(color);
	.login {
		margin-left: 10px;
		margin-right: 10px;
		font-family: "Futura";
	}
}
</style>