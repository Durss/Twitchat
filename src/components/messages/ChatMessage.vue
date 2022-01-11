<template>
	<div class="chatmessage">
		<img :src="b.image_url_1x" v-for="(b,index) in badges" :key="index" class="badge" :data-tooltip="b.title">
		<a :href="profileURL" target="_blank" class="login" :style="styles">{{messageData.tags["display-name"]}}:</a>
		<span class="message" v-html="text"></span>
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

	public get profileURL():string {
		return "https://twitch.tv/"+this.messageData.tags.username;
	}
	public get styles():unknown {
		let res = {
			color:this.messageData.tags.color,
		};
		return res;
	}

	public get text():string {
		let mess:string;
		try {
			mess = TwitchUtils.parseEmotes(this.messageData.message, this.messageData.tags['emotes-raw']);
		}catch(error) {
			console.log(error);
			// console.log("Fuck !", this.messageData);
			let safeMessage = this.messageData.message;
			safeMessage = safeMessage.replaceAll("<", "&lt;");
			safeMessage = safeMessage.replaceAll(">", "&gt;");
			mess = safeMessage;
		}
		return mess;
	}

	public badges:TwitchTypes.Badge[] = [];

	public async mounted():Promise<void> {
		const channelID:string = this.messageData.tags['room-id'] as string;
		try {
			const badges = TwitchUtils.getBadgesImagesFromRawBadges(channelID, this.messageData.tags.badges);
			//Make sure no empty badge is returned. Vue really dislikes it..
			this.badges = badges;
		}catch(error){
			this.badges = [];
		}
	}
}

export interface ChatMessageData {
	message:string;
	tags:ChatUserstate;
	channel:string;
	self:boolean;
	id:string;
}
</script>

<style scoped lang="less">
.chatmessage{
	font-family: "FuturaLight";
	font-size: 16px;
	color: v-bind(color);
	.badge {
		width: 18px;
		height: 18px;
		&:last-of-type {
			margin-right: 10px;
		}
	}
	.login {
		margin-right: 10px;
		font-family: "Futura";
	}
	.message {
		color: #fff;
		:deep( img ) {
			width: 28px;
			// height: 28px;
		}
	}
}
</style>