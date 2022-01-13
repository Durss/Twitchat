<template>
	<div :class="classes">
		<div v-if="firstTime" class="header">
			<img src="@/assets/icons/stars.svg" alt="new" class="stars">
			<p>First time on this channel</p>
		</div>
		
		<div v-if="automod" class="automod">
			<div class="header">The following message has been blocked by automod for the following reason(s) : {{automodReasons}}</div>
			<div class="actions">
				<Button title="Accept" @click="modMessage(true)" />
				<Button title="Reject" @click="modMessage(false)" highlight />
			</div>
		</div>
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
import { PubSubTypes } from '@/utils/PubSub';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatModTools from './ChatModTools.vue';

@Options({
	components:{
		Button,
		ChatModTools,
	},
	props:{
		messageData:Object,
		deleteOverlay:{type:Boolean, default:false},
		disableAutomod:{type:Boolean, default:false},
		disableFirstTime:{type:Boolean, default:false},
	}
})
export default class ChatMessage extends Vue {
	
	public deleteOverlay!:boolean;
	public disableAutomod!:boolean;
	public disableFirstTime!:boolean;
	public firstTime:boolean = false;
	public messageData!:IRCEventDataList.Message | IRCEventDataList.Notice;
	public automod:PubSubTypes.AutomodData | null = null;
	public automodReasons:string = "";

	public get isNotice():boolean {
		return (this.messageData as IRCEventDataList.Notice).notice;
	}

	public get classes():string[] {
		let res = ["chatmessage"];
		const message = this.messageData as IRCEventDataList.Message;

		if(this.deleteOverlay) res.push("deleteOverlay");
		
		if(this.isNotice) res.push("notice");
		if(this.automod) res.push("automod");
		if(this.firstTime) res.push("firstTimeOnChannel");

		if(!this.isNotice
		&& store.state.params.appearance.highlightMentions.value
		&& this.text.toLowerCase().indexOf(store.state.user.login.toLowerCase()) > -1) {
			res.push("mention");
		}

		if(message.tags.mod) res.push("size_"+store.state.params.appearance.modsSize.value);
		else if(message.tags.vip) res.push("size_"+store.state.params.appearance.vipsSize.value);
		else if(message.tags.subscriber) res.push("size_"+store.state.params.appearance.subsSize.value);
		else res.push("size_"+store.state.params.appearance.defaultSize.value);

		return res;
	}

	public get showModTools():boolean {
		const message = this.messageData as IRCEventDataList.Message;
		return !message.tags.self
		&& (store.state.mods as TwitchTypes.Moderator[]).findIndex(v=> v.user_id == message.tags['user-id']) > -1
		&& message.channel.replace(/^#/gi, "").toLowerCase() == store.state.user.login.toLowerCase();//TODO set actual channel id not the user id
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
			if(this.automod) {
				result = text;
			}else{
				result = TwitchUtils.parseEmotes(text, mess.tags['emotes-raw'], removeEmotes);
			}
		}catch(error) {
			console.log(error);
			console.log(mess);
			let safeMessage = text;
			safeMessage = safeMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;")
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

	public openUserCard():void {
		const message = this.messageData as IRCEventDataList.Message;
		store.dispatch("openUserCard", message.tags.username);
	}

	public mounted():void {
		const mess = this.messageData as IRCEventDataList.Message;
		/* eslint-disable-next-line */
		this.firstTime = mess.tags['first-msg'] && !this.disableFirstTime;

		//Manage automod content
		if(!this.disableAutomod && mess.automod) {
			this.automod = mess.automod;
			let reasons:string[] = [];
			for (let i = 0; i < mess.automod.message.content.fragments.length; i++) {
				const f = mess.automod.message.content.fragments[i];
				if(!f.automod) continue;
				for (const key in f.automod.topics) {
					if(reasons.indexOf(key) == -1) reasons.push(key);
				}
			}

			let textReasons:string[] = [];
			for (let i = 0; i < reasons.length; i++) {
				const r = reasons[i];
				switch(r) {
					case "race_ethnicity_or_religion":
						textReasons.push("racism or religion hatred");
						break;
					case "sex_based_terms":
						textReasons.push("sexual content");
						break;
					case "sexuality_sex_or_gender":
						textReasons.push("gender or sex hate");
						break;
					case "swearing":
					case "aggression":
					case "disability":
					case "misoginy":
					case "bullying":
					default:
						textReasons.push(r);
				}
			}
			this.automodReasons = textReasons.join(", ");
		}
	}

	/**
	 * Accept or reject an automoded chat message
	 */
	public async modMessage(accept:boolean):Promise<void> {
		const message = this.messageData as IRCEventDataList.Message;
		let success = await TwitchUtils.modMessage(accept, message.tags.id as string);
		if(!success) {
			store.state.alert = "Woops... something went wrong :(...";
		}else {
			//Delete the message.
			//If the message was allowed, twitch will send it back, no need to keep it.
			store.dispatch("delChatMessage", message.tags.id)
		}
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
		color: fade(#ffffff, 75%);
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
			text-shadow: 0 1px 2px rgba(0,0,0,1);
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

	&.firstTimeOnChannel {
		color: #fff;
		background-color: rgba(255, 255, 255, .15) !important;
		border-radius: 5px;
		margin: 5px 0;
		.header {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			margin-bottom: 10px;
			font-size: 20px;
			.stars {
				height: 30px;
				margin-bottom: 10px;
			}
		}
		}

	&.automod {
		margin-top: 5px;
		border-radius: 5px;
		background-color: fade(@mainColor_alert, 50%) !important;

		.message {
			:deep(mark) {
				background-color: #fff;
				border-radius: 5px;
				color: #c00;
				font-weight: bold;
				padding: 0px 3px;
			}
		}
	}

	.automod {
		background-color: #fff;
		padding: 10px;
		border-radius: 5px;
		margin-bottom: 10px;

		.header {
			margin-bottom: 10px;
			color: black;
		}

		.actions {
			text-align: center;
			.button {
				padding: 2px 5px;
				border-radius: 5px;
				font-size: 18px;
				margin-right: 10px;
			}
		}
	}
}
</style>