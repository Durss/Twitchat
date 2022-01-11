<template>
	<div :class="classes">
		<span class="time" v-if="$store.state.params.displayTime">{{time}}</span>

		<img :src="b.image_url_1x" v-for="(b,index) in filteredBadges" :key="index" class="badge" :data-tooltip="b.title">
		
		<span class="miniBadges" v-if="miniBadges.length > 0">
			<span class="badge" v-for="(b,index) in miniBadges"
				:key="index"
				:style="{backgroundColor:b.color}"
				:data-tooltip="b.label"></span>
		</span>
		
		<a :href="profileURL" target="_blank" class="login" :style="loginStyles">{{messageData.tags["display-name"]}}</a>
		
		<span class="message" v-html="text"></span>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
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

	public get classes():string[] {
		let res = ["chatmessage"];
		if(this.text.toLowerCase().indexOf(store.state.user.login.toLowerCase()) > -1) {
			res.push("highlight");
		}
		return res;
	}

	public get time():string {
		let d = new Date(parseInt(this.messageData.tags['tmi-sent-ts'] as string));
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	/**
	 * Set login color
	 */
	public get loginStyles():unknown {
		let res = {
			color:this.messageData.tags.color,
		};
		return res;
	}

	/**
	 * Get badges images
	 */
	public get filteredBadges():TwitchTypes.Badge[] {
		let res:TwitchTypes.Badge[] = [];
		if(!store.state.params.hideBadges) {
			try {
				const channelID:string = this.messageData.tags['room-id'] as string;
				const badges = TwitchUtils.getBadgesImagesFromRawBadges(channelID, this.messageData.tags.badges);
				//Make sure no empty badge is returned. Vue really dislikes it..
				res = badges;
			}catch(error){
				res = [];
			}
		}
		return res;
	}

	/**
	 * Gets text message with parsed emotes
	 */
	public get text():string {
		let mess:string;
		try {
			let removeEmotes = store.state.params.hideEmotes;
			mess = TwitchUtils.parseEmotes(this.messageData.message, this.messageData.tags['emotes-raw'], removeEmotes);
		}catch(error) {
			console.log(error);
			// console.log("Fuck !", this.messageData);
			let safeMessage = this.messageData.message;
			safeMessage = safeMessage.replaceAll("<", "&lt;");
			safeMessage = safeMessage.replaceAll(">", "&gt;");
			mess = safeMessage;
		}
		return ": "+mess;
	}

	/**
	 * Displays minimalist badges
	 */
	public get miniBadges():{color:string, label:string}[] {
		let badges:{color:string, label:string}[] = [];
		if(store.state.params.minimalistBadges) {
			if(this.messageData.tags.badges?.vip) badges.push({color:"#e00bb9", label:"VIP"});
			if(this.messageData.tags.badges?.subscriber) badges.push({color:"#9147ff", label:"Sub"});
			if(this.messageData.tags.badges?.premium) badges.push({color:"#00a3ff", label:"Prime"});
			if(this.messageData.tags.badges?.moderator) badges.push({color:"#39db00", label:"Moderator"});
			if(this.messageData.tags.badges?.staff) badges.push({color:"#ff0000", label:"Twitch staff"});
		}
		return badges;
	}

	public badges:TwitchTypes.Badge[] = [];

	public async mounted():Promise<void> {
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
	font-family: "Inter";
	font-size: 16px;
	color: v-bind(color);

	&.highlight{
		background-color: rgba(255, 0, 0, .5);
	}

	&>.badge {
		width: 18px;
		height: 18px;
		&:last-of-type {
			margin-right: 5px;
		}
	}

	.time {
		color: rgba(255,255,255,0.5);
		font-size: 14px;
		margin-right: 5px;
	}

	.miniBadges {
		padding: 1px;
		height: 12px;
		margin-right: 5px;
		display: inline-block;
		.badge {
			display: inline-block;
			width: 6px;
			height: 12px;
			margin: 0 1px 0px 0;
		}
	}

	.message {
		color: #fff;
		font-size: 14px;
		:deep( img ) {
			width: 28px;
			max-height: 28px;
		}
	}
}
</style>