<template>
	<div :class="classes">
		<span class="time" v-if="$store.state.params.appearance.displayTime.value">{{time}}</span>

		<div class="infos" v-if="!isNotice">
			<ChatModTools :messageData="messageData" class="mod" v-if="showModTools" />
			
			<img :src="b.image_url_1x" v-for="(b,index) in filteredBadges" :key="index" class="badge" :data-tooltip="b.title">
			
			<span class="miniBadges" v-if="miniBadges.length > 0">
				<span class="badge" v-for="(b,index) in miniBadges"
					:key="index"
					:style="{backgroundColor:b.color}"
					:data-tooltip="b.label"></span>
			</span>
			
			<span @click="openUserCard()" class="login" :style="loginStyles">{{messageData.tags["display-name"]}}</span>
		</div>
		
		<img src="@/assets/icons/infos.svg" alt="notice" v-if="isNotice" class="notice">

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
	public messageData!:IRCEventDataList.Message | IRCEventDataList.Notice;

	public get isNotice():boolean {
		return (this.messageData as IRCEventDataList.Notice).notice;
	}

	public get classes():string[] {
		let res = ["chatmessage"];
		if(this.deleteOverlay) res.push("deleteOverlay");
		
		if(this.isNotice) res.push("notice");

		if(!this.isNotice
		&& store.state.params.appearance.highlightMentions.value
		&& this.text.toLowerCase().indexOf(store.state.user.login.toLowerCase()) > -1) {
			res.push("mention");
		}

		const message = this.messageData as IRCEventDataList.Message;

		if(message.tags.mod) res.push("size_"+store.state.params.appearance.modsSize.value);
		else if(message.tags.vip) res.push("size_"+store.state.params.appearance.vipsSize.value);
		else if(message.tags.subscriber) res.push("size_"+store.state.params.appearance.subsSize.value);
		else res.push("size_"+store.state.params.appearance.defaultSize.value);

		return res;
	}

	public get showModTools():boolean {
		const message = this.messageData as IRCEventDataList.Message;
		return !message.tags.self && message.channel.replace(/^#/gi, "").toLowerCase() == store.state.user.login.toLowerCase();
	}

	public get time():string {
		const message = this.messageData as IRCEventDataList.Message;
		const d = new Date(parseInt(message.tags['tmi-sent-ts'] as string));
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}
	
	/**
	 * Set login color
	 */
	public get loginStyles():unknown {
		const message = this.messageData as IRCEventDataList.Message;
		let res = {
			color:message.tags.color,
		};
		return res;
	}

	/**
	 * Get badges images
	 */
	public get filteredBadges():TwitchTypes.Badge[] {
		let res:TwitchTypes.Badge[] = [];
		if(!store.state.params.appearance.hideBadges.value) {
			try {
				const message = this.messageData as IRCEventDataList.Message;
				const channelID:string = message.tags['room-id'] as string;
				res = TwitchUtils.getBadgesImagesFromRawBadges(channelID, message.tags.badges);
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
		let result:string;
		const mess = this.messageData as IRCEventDataList.Message;
		let text = mess.message;
		try {
			let removeEmotes = store.state.params.appearance.hideEmotes.value;
			result = TwitchUtils.parseEmotes(text, mess.tags['emotes-raw'], removeEmotes);
		}catch(error) {
			console.log(error);
			console.log(mess);
			let safeMessage = text;
			safeMessage = safeMessage.replaceAll("<", "&lt;");
			safeMessage = safeMessage.replaceAll(">", "&gt;");
			result = safeMessage;
		}
		if(!this.isNotice) {
			result = ": "+result;
		}else{
			result = result.replace(/&lt;(\/)?strong&gt;/gi, "<$1strong>");
		}
		return result;
	}

	/**
	 * Displays minimalist badges
	 */
	public get miniBadges():{color:string, label:string}[] {
		let badges:{color:string, label:string}[] = [];
		const message = this.messageData as IRCEventDataList.Message;
		if(store.state.params.appearance.minimalistBadges.value) {
			if(message.tags.badges?.vip) badges.push({color:"#e00bb9", label:"VIP"});
			if(message.tags.badges?.subscriber) badges.push({color:"#9147ff", label:"Sub"});
			if(message.tags.badges?.prem) badges.push({color:"#00a3ff", label:"Prime"});
			if(message.tags.badges?.moderator) badges.push({color:"#39db00", label:"Moderator"});
			if(message.tags.badges?.staff) badges.push({color:"#ff0000", label:"Twitch staff"});
		}
		return badges;
	}

	public badges:TwitchTypes.Badge[] = [];

	public openUserCard():void {console.log(this.messageData);
		const message = this.messageData as IRCEventDataList.Message;
		store.dispatch("openUserCard", message.tags.username);
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

	&.notice {
		.notice {
			width: 18px;
			height: 18px;
			margin-right: 5px;
			vertical-align: middle;
		}
		.message {
			font-style: italic;
			opacity: .7;
			color: @mainColor_warn;
		}
	}

	&.deleteOverlay{
		color: white;
		opacity: .5;
		text-decoration: line-through;
		background-color: red !important;//oooo..bad me >_>
	}

	.time {
		color: fade(#d1d1d1, 50%);
		font-size: 13px;
		margin-right: 5px;
		vertical-align: middle;
	}

	.infos {
		display: inline;
		.mod {
			display: inline;
			margin-right: 5px;
		}

		.badge {
			width: 18px;
			height: 18px;
			vertical-align: middle;
			&:last-of-type {
				margin-right: 5px;
			}
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
	}

	.message {
		color: #d1d1d1;
		:deep( img ) {
			width: 28px;
			max-height: 28px;
			vertical-align: middle;
		}
	}
}
</style>