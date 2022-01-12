<template>
	<div :class="classes">
		<span class="time" v-if="$store.state.params.displayTime">{{time}}</span>

		<ChatModTools :messageData="messageData" class="mod" v-if="showModTools" />
		
		<img :src="b.image_url_1x" v-for="(b,index) in filteredBadges" :key="index" class="badge" :data-tooltip="b.title">
		
		<span class="miniBadges" v-if="miniBadges.length > 0">
			<span class="badge" v-for="(b,index) in miniBadges"
				:key="index"
				:style="{backgroundColor:b.color}"
				:data-tooltip="b.label"></span>
		</span>
		
		<span @click="openUserCard()" class="login" :style="loginStyles">{{messageData.tags["display-name"]}}</span>
		
		<span class="message" v-html="text"></span>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import ChatModTools from './ChatModTools.vue';

@Options({
	components:{
		ChatModTools,
	},
	props:{
		messageData:Object,
		deleteOverlay:Boolean,
	}
})
export default class ChatMessage extends Vue {
	
	public deleteOverlay:boolean = false;
	public messageData!:IRCEventDataList.Message;

	public get classes():string[] {
		let res = ["chatmessage"];
		if(this.deleteOverlay) res.push("deleteOverlay");

		if(store.state.params.highlightMentions
		&& this.text.toLowerCase().indexOf(store.state.user.login.toLowerCase()) > -1) {
			res.push("mention");
		}

		if(this.messageData.tags.mod) res.push("size_"+store.state.params.modsSize);
		else if(this.messageData.tags.vip) res.push("size_"+store.state.params.vipsSize);
		else if(this.messageData.tags.subscriber) res.push("size_"+store.state.params.subsSize);
		else res.push("size_"+store.state.params.defaultSize);

		return res;
	}

	public get showModTools():boolean {
		return !this.messageData.tags.self && this.messageData.channel.replace(/^#/gi, "").toLowerCase() == store.state.user.login.toLowerCase();
	}

	public get time():string {
		let d = new Date();
		//Da heck?? Twitch does not send timestamp for our messages??
		if(this.messageData.tags['tmi-sent-ts']) {
			d = new Date(parseInt(this.messageData.tags['tmi-sent-ts'] as string));
		}
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
			if(this.messageData.tags.badges?.prem) badges.push({color:"#00a3ff", label:"Prime"});
			if(this.messageData.tags.badges?.moderator) badges.push({color:"#39db00", label:"Moderator"});
			if(this.messageData.tags.badges?.staff) badges.push({color:"#ff0000", label:"Twitch staff"});
		}
		return badges;
	}

	public badges:TwitchTypes.Badge[] = [];

	public openUserCard():void {console.log(this.messageData);
		store.dispatch("openUserCard", this.messageData.tags.username);
	}
}
</script>

<style scoped lang="less">
.chatmessage{
	font-family: "Inter";
	color: v-bind(color);
	padding: 5px;
	// transition: background-color .2s, opacity .2s;

	&.size_1 { font-size: 12px; }
	&.size_2 { font-size: 16px; }
	&.size_3 { font-size: 20px; }
	&.size_4 { font-size: 25px; }

	&.mention{
		background-color: rgba(255, 0, 0, .35) !important;//oooo..bad me >_>
	}

	&.deleteOverlay{
		color: white;
		opacity: .5;
		text-decoration: line-through;
		background-color: red !important;//oooo..bad me >_>
	}

	&>.badge {
		width: 18px;
		height: 18px;
		&:last-of-type {
			margin-right: 5px;
		}
	}

	.time {
		color: fade(#d1d1d1, 50%);
		font-size: 13px;
		margin-right: 5px;
	}

	.login {
		font-weight: bold;
		cursor: pointer;
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
			&:last-child {
				margin-right: 0;
			}
		}
	}

	.message {
		color: #d1d1d1;
		:deep( img ) {
			width: 28px;
			max-height: 28px;
			vertical-align: middle;
		}
	}

	.mod {
		display: inline;
		margin-right: 5px;
	}
}
</style>