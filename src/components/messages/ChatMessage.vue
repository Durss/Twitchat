<template>
	<div :class="classes" @click.ctrl.stop.capture="copyJSON()">
		<div v-if="firstTime" class="header">
			<img src="@/assets/icons/firstTime.svg" alt="new" class="icon">
			<p>First time on your channel</p>
		</div>

		<div v-if="isPresentation" class="header">
			<img src="@/assets/icons/firstTime.svg" alt="new" class="icon">
			<p>Welcome on this channel <strong>{{messageData.tags["display-name"]}}</strong></p>
		</div>

		<div v-if="automod" class="automod">
			<img src="@/assets/icons/automod.svg">
			<div class="header"><strong>Automod</strong> : {{automodReasons}}</div>
			<div class="actions">
				<Button title="Accept" @click.stop="modMessage(true)" />
				<Button title="Reject" @click.stop="modMessage(false)" highlight />
			</div>
		</div>
		
		<div v-if="messageData.lowTrust" class="lowTrust">
			<img src="@/assets/icons/shield.svg">
			<div class="header"><strong>Suspicious user</strong></div>
		</div>
		
		<div v-if="isAnnouncement" class="announcementHolder">
			<img src="@/assets/icons/announcement.svg">
			<div class="header"><strong>Announcement</strong></div>
		</div>

		<span class="time" v-if="$store.state.params.appearance.displayTime.value">{{time}}</span>

		<div class="infos">
			<img v-if="!disableConversation && isConversation && $store.state.params.features.conversationsEnabled.value && !lightMode"
				class="convBt"
				src="@/assets/icons/conversation.svg"
				alt="conversation"
				@mouseleave="$emit('mouseleave', $event)"
				@click.stop="$emit('showConversation', $event, messageData)">
			
			<ChatModTools :messageData="messageData" class="mod" v-if="showModTools && !lightMode" />
			
			<img :src="b.image_url_1x" v-for="(b,index) in filteredBadges" :key="index" class="badge" :data-tooltip="b.title">

			<span class="miniBadges" v-if="miniBadges.length > 0">
				<span class="badge" v-for="(b,index) in miniBadges"
					:key="index"
					:class="b.class"
					:data-tooltip="b.label"></span>
			</span>
			
			<img class="noFollowBadge" src="@/assets/icons/unfollow.svg" alt="no follow" v-if="showNofollow" data-tooltip="Not a follower">

			<div class="occurrenceCount"
				ref="occurrenceCount"
				data-tooltip="Number of times this message has been sent"
				v-if="messageData.occurrenceCount > 0">x{{messageData.occurrenceCount+1}}</div>
			
			<span @click.stop="openUserCard()"
				@mouseenter="hoverNickName($event)"
				@mouseleave="$emit('mouseleave', $event)"
				class="login" :style="loginStyles">{{messageData.tags["display-name"]}}</span>
		</div>
		
		<span>: </span>
		<span class="message">
			<span class="text" v-html="text"></span>
			<span class="deleted" v-if="deletedMessage">{{deletedMessage}}</span>
		</span>
	</div>

</template>

<script lang="ts">
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import { PubSubTypes } from '@/utils/PubSub';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap/all';
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
		lightMode:{type:Boolean, default:false},
		disableConversation:{type:Boolean, default:false},
		enableWordHighlight:{type:Boolean, default:false},
	},
	emits:['showConversation', 'showUserMessages', 'mouseleave'],
})
export default class ChatMessage extends Vue {

	public messageData!:IRCEventDataList.Message;
	public lightMode!:boolean;
	public disableConversation!:boolean;
	public enableWordHighlight!:boolean;
	
	public firstTime:boolean = false;
	public automod:PubSubTypes.AutomodData | null = null;
	public text:string = "";
	public automodReasons:string = "";
	public badges:TwitchTypes.Badge[] = [];

	public get isAnnouncement():boolean {
		const message = this.messageData as IRCEventDataList.Message;
		return message.tags["msg-id"] == "announcement";
	}

	public get isPresentation():boolean {
		const message = this.messageData as IRCEventDataList.Message;
		return message.tags["msg-id"] == "user-intro";
	}
	
	public get showNofollow():boolean{
		if(store.state.params.appearance.highlightNonFollowers.value === true) {
			const uid = this.messageData.tags['user-id'] as string;
			if(uid && store.state.followingStates[uid] === false) return true;
		}
		return false
	}

	public get deletedMessage():string {
		const censor = (store.state.params.filters.censorDeletedMessages.value===true)
		if(this.messageData.deletedData) {
			return censor ? "<deleted by "+this.messageData.deletedData.created_by+">" : "";
		}else if(this.messageData.deleted){
			return censor ? "<message deleted>" : "";
		}
		return "";
	}

	public get classes():string[] {
		let res = ["chatmessage"];
		const message = this.messageData as IRCEventDataList.Message;

		if(this.automod) res.push("automod");
		if(this.firstTime || this.isPresentation) res.push("firstTimeOnChannel");
		if(message.deleted) res.push("deleted");
		if(message.lowTrust) res.push("lowTrust");
		if(message.cyphered) res.push("cyphered");
		if(this.showNofollow) res.push("noFollow");
		if(message.tags['message-type'] == "action") res.push("slashMe");
		if(message.tags["msg-id"] === "highlighted-message") res.push("highlighted");
		if(store.state.trackedUsers.findIndex(v=>v.user['user-id'] == message.tags["user-id"]) != -1
			&& !this.lightMode) res.push("tracked");
		if(this.isAnnouncement) {
			const color = message.tags["msg-param-color"]? message.tags["msg-param-color"].toLowerCase() : "primary";
			res.push("announcement", color);
		}
		if(store.state.params.filters.censorDeletedMessages.value===true) res.push("censor");

		if(!this.lightMode) {
			if(message.hasMention) res.push("mention");
			
			//Set highlight
			if(message.tags.mod && store.state.params.appearance.highlightMods.value) res.push("highlightMods");
			else if(message.tags.badges?.vip && store.state.params.appearance.highlightVips.value) res.push("highlightVips");
			else if(message.tags.subscriber && store.state.params.appearance.highlightSubs.value) res.push("highlightSubs");
		}

		return res;
	}

	public get showModTools():boolean {
		if(this.lightMode) return false;
		if(store.state.params.features.showModTools.value === false) return false;
		const message = this.messageData as IRCEventDataList.Message;
		return (store.state.mods as TwitchTypes.ModeratorUser[]).findIndex(v=> v.user_id == message.tags['user-id']) > -1
			||
		(
			message.channel.replace(/^#/gi, "").toLowerCase() == store.state.user.login.toLowerCase()//TODO set actual channel id not the user id
			&& message.tags.username?.toLowerCase() != store.state.user.login.toLowerCase()
		);
	}

	public get time():string {
		const message = this.messageData as IRCEventDataList.Message;
		const d = new Date(parseInt(message.tags['tmi-sent-ts'] as string));
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public get isConversation():boolean {
		return this.messageData.answers != undefined || this.messageData.answerTo != undefined;
	}
	
	/**
	 * Set login color
	 */
	public get loginStyles():unknown {
		const message = this.messageData as IRCEventDataList.Message;
		let color = 0xffffff;
		if(message.tags.color) {
			color = parseInt(message.tags.color.replace("#", ""), 16);
		}
		const hsl = Utils.rgb2hsl(color);
		const minL = .6;
		if(hsl.l < minL) {
			color = Utils.hsl2rgb(hsl.h, hsl.s, minL);
		}
		let colorStr = color.toString(16);
		while(colorStr.length < 6) colorStr = "0"+colorStr;
		let res = {
			color: "#"+colorStr,
		};
		return res;
	}

	/**
	 * Get badges images
	 */
	public get filteredBadges():TwitchTypes.Badge[] {
		let res:TwitchTypes.Badge[] = [];
		if(store.state.params.appearance.showBadges.value
		&& !store.state.params.appearance.minimalistBadges.value) {
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
	 * Displays minimalist badges
	 */
	public get miniBadges():{label:string, class?:string}[] {
		let badges:{label:string, class?:string}[] = [];
		const message = this.messageData as IRCEventDataList.Message;
		if(store.state.params.appearance.showBadges.value
		&& store.state.params.appearance.minimalistBadges.value) {
			if(message.tags.badges?.predictions?.indexOf("pink")) badges.push({label:"Prediction", class:"prediction pink"});
			if(message.tags.badges?.predictions?.indexOf("blue")) badges.push({label:"Prediction", class:"prediction blue"});
			if(message.tags.badges?.vip) badges.push({label:"VIP", class:"vip"});
			if(message.tags.badges?.subscriber) badges.push({label:"Sub", class:"subscriber"});
			if(message.tags.badges?.premium) badges.push({label:"Prime", class:"premium"});
			if(message.tags.badges?.moderator) badges.push({label:"Moderator", class:"moderator"});
			if(message.tags.badges?.staff) badges.push({label:"Twitch staff", class:"staff"});
			if(message.tags.badges?.broadcaster) badges.push({label:"Broadcaster", class:"broadcaster"});
			if(message.tags.badges?.partner) badges.push({label:"Partner", class:"partner"});
		}
		return badges;
	}

	public openUserCard():void {
		if(this.lightMode) return;
		const message = this.messageData as IRCEventDataList.Message;
		store.dispatch("openUserCard", message.tags.username);
	}

	/**
	 * Called when rolling over the nick name
	 */
	public hoverNickName(event:MouseEvent):void {
		if(store.state.params.features.userHistoryEnabled.value) {
			this.$emit('showUserMessages', event, this.messageData);
		}
	}

	public copyJSON():void {
		const answersBckp = this.messageData.answers;
		const answerToBckp = this.messageData.answerTo;
		this.messageData.answers = undefined;
		this.messageData.answerTo = undefined;
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		this.messageData.answers = answersBckp;
		this.messageData.answerTo = answerToBckp;
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

	/**
	 * Called when component is mounted
	 */
	public mounted():void {
		const mess = this.messageData as IRCEventDataList.Message;
		
		/* eslint-disable-next-line */
		this.firstTime = mess.tags['first-msg'] === true && !this.lightMode && !this.isPresentation;

		//Manage automod content
		if(!this.lightMode && mess.automod) {
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
		this.text = this.parseText();

		watch(()=>this.messageData.occurrenceCount, async ()=>{
			await this.$nextTick();
			gsap.fromTo(this.$refs.occurrenceCount as HTMLDivElement, {scale:1.5}, {scale:1, duration:0.2});
		});
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
			store.dispatch("delChatMessage", message.tags.id);
		}
	}

	/**
	 * Gets text message with parsed emotes
	 */
	public parseText():string {
		let result:string;
		const doHighlight = store.state.params.appearance.highlightMentions.value;
		const highlightLogin = store.state.user.login;
		const mess = this.messageData as IRCEventDataList.Message;
		let text = mess.message;
		try {
			let removeEmotes = !store.state.params.appearance.showEmotes.value;
			if(this.automod) {
				result = text;
				result = result.replace(/</g, "&lt;").replace(/>/g, "&gt;");//Avoid XSS attack
				result = result.replace(/&lt;(\/)?mark&gt;/g, "<$1mark>");//Reset <mark> tags used to highlight banned words on automod messages
			}else{
				//Allow custom parsing of emotes only if it's a message of ours
				//to avoid killing perfromances.
				const customParsing = mess.tags.username?.toLowerCase() == store.state.user.login.toLowerCase();
				let chunks = TwitchUtils.parseEmotes(text, mess.tags['emotes-raw'], removeEmotes, customParsing);
				result = "";
				for (let i = 0; i < chunks.length; i++) {
					const v = chunks[i];
					if(v.type == "text") {
						v.value = v.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");//Avoid XSS attack

						//If search for a message by a keyword, highlight it
						if(this.enableWordHighlight && this.messageData.highlightWord) {
							v.value = v.value.replace(new RegExp("("+this.messageData.highlightWord+")", "gim"), "<span class='highlightedWord'>$1</span>");
						}

						//If requested to highlight mentions, highlight them
						if(doHighlight) {
							v.value = v.value.replace(new RegExp("(^| )("+highlightLogin+")( |$)", "gim"), "$1<span class='highlightedWord'>$2</span>$3");
						}
						result += Utils.parseURLs(v.value);
					}else if(v.type == "emote") {
						let url = v.value.replace(/1.0$/gi, "3.0");//Twitch format
						url = url.replace(/1x$/gi, "3x");//BTTV format
						if(store.state.params.appearance.defaultSize.value >= 3) {
							v.value = v.value.replace(/1.0$/gi, "2.0");
							v.value = v.value.replace(/1x$/gi, "2x");//BTTV format
						}
						let tt = "<img src='"+url+"' height='112' width='112'><br><center>"+v.label+"</center>";
						result += "<img src='"+v.value+"' data-tooltip=\""+tt+"\" class='emote'>";
					}
				}
			}
		}catch(error) {
			console.log(error);
			console.log(mess);
			result = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		}
		
		return result;
	}
}
</script>

<style scoped lang="less">
.chatmessage{
	padding: .25em;
	margin-bottom: 1px;

	&.highlightSubs { background-color: fade(#9147ff, 7%); }
	&.highlightVips { background-color: fade(#e00bb9, 7%); }
	&.highlightMods { background-color: fade(#39db00, 7%); }
	&.highlighted { 
		.message {
			padding: 0 .25em;
			background-color: @mainColor_normal; color:#fff
		}
	}

	&.mention{
		background-color: rgba(255, 0, 0, .35) !important;//oooo..bad me >_>
	}

	&.slashMe {
		.message {
			font-style: italic;
		}
	}

	&.deleted {
		opacity: .25;
		transition: opacity .2s;
		&.censor {
			.message {
				.text { display: none; }
			}
		}
		&:hover{
			opacity: 1;
			text-decoration: none;
			.message {
				.text { display: inline; }
				.deleted { display: none; }
			}
		}
	}

	&.tracked {
		border-image-slice: 1;
		border-left: .6em solid rgba(255, 255, 255, 1);
		background-color: rgba(255, 255, 255, .2);
		.message {
			color: #fff;
		}

	}

	.infos {
		display: inline;
		.convBt {
			opacity: 0.75;
			height: 1em;
			vertical-align: middle;
			cursor: pointer;
			&:hover {
				opacity: .75;
			}
			&:not(:last-child) {
				margin-right: 5px;
			}
		}
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

			&.prediction {
				&.pink{ background-color: #f50e9b;}
				&.blue{ background-color: #387aff;}
			}
			&.vip{ background-color: #e00bb9;}
			&.subscriber{ background-color: #9147ff;}
			&.premium{ background-color: #00a3ff;}
			&.moderator{ background-color: #39db00;}
			&.staff{ background-color: #666666;}
			&.broadcaster{ background-color: #ff0000;}
			&.partner{ background: linear-gradient(0deg, rgba(145,71,255,1) 0%, rgba(145,71,255,1) 40%, rgba(255,255,255,1) 41%, rgba(255,255,255,1) 59%, rgba(145,71,255,1) 60%, rgba(145,71,255,1) 100%); }
		}

		.login {
			cursor: pointer;
			font-weight: bold;
			// -webkit-text-stroke: fade(#000, 50%) .25px;
			&:hover {
				background-color: fade(@mainColor_light, 10%);
				border-radius: 3px;
			}
		}
	
		.miniBadges {
			padding: 1px;
			margin-right: 5px;
			display: inline-block;
			.badge {
				display: inline-block;
				width: .5em;
				height: 1em;
				margin: 0 1px 0px 0;
				&:last-child {
					margin-right: 0;
				}
				&.prediction {
					width: 1em;
					border-radius: 50%;
				}
			}
		}

		.occurrenceCount {
			display: inline-block;
			background: @mainColor_warn;
			padding: .2em .4em;
			margin-right: 5px;
			font-weight: bold;
			border-radius: 10px;
			color:@mainColor_dark;
		}
	}

	.message {
		color: #d1d1d1;
		// position: relative;
		:deep( .emote ) {
			width: 2em;
			height: 2em;
			vertical-align: middle;
			object-fit: contain;
		}
		:deep(a) {
			word-break: break-all;
		}
		:deep(.highlightedWord) {
			font-size: 1.2em;
			font-weight: bold;
			color: @mainColor_dark;
			padding: 0 3px;
			border-radius: 3px;
			background-color: @mainColor_light;
		}

		.deleted {
			font-style: italic;
		}
	}

	&.firstTimeOnChannel {
		color: #fff;
		background-color: rgba(255, 255, 255, .15) !important;
		border-radius: 5px;
		margin: 5px 0;
		.header {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			font-size: 1em;
			.icon {
				height: 1.2em;
				margin: 5px;
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

		.automod {
			background-color: #fff;
			padding: .35em;
			border-radius: 5px;
			margin-bottom: 10px;
			display: flex;
			flex-direction: row;
			align-items: center;

			img {
				height: 1.5em;
				margin-right: .5em;
			}

			.header {
				color: black;
				flex-grow: 1;
			}

			.actions {
				text-align: center;
				.button {
					padding: 2px 5px;
					border-radius: 5px;
					font-size: 1em;
					margin-right: 10px;
				}
			}
		}
	}

	&.cyphered {
		background-image: repeating-linear-gradient(-45deg, #ffffff10, #ffffff10 20px, #ffffff30 20px, #ffffff30 40px);
	}

	&.lowTrust {
		margin-top: 5px;
		border-radius: 5px;
		background-color: fade(@mainColor_alert, 100%) !important;
		
		.lowTrust {
			padding: .35em;
			border-radius: 5px;
			display: flex;
			flex-direction: row;
			justify-content: center;

			img {
				height: 1em;
				margin-right: .5em;
			}

			.header {
				color: @mainColor_light;
			}
		}
	}

	&.noFollow {
		.noFollowBadge {
			height: 1em;
			margin-right: 5px;
			vertical-align: middle;
		}
	}

	&.announcement {
		border-image-slice: 1;
		border-left: .6em solid rgba(255, 255, 255, .5);
		border-right: .6em solid rgba(255, 255, 255, .5);
		padding: 0;
		padding-bottom: .25em;
		background-color: rgba(255, 255, 255, .1);

		.announcementHolder {
			display: flex;
			margin: 0;
			padding: .2em;
			margin-bottom: .25em;
			flex-direction: row;
			justify-content: center;
			background-color: rgba(255, 255, 255, .1);

			img {
				height: 1em;
				margin-right: .5em;
			}

			.header {
				color: @mainColor_light;
			}
		}
		&.purple {
			border-image-source: linear-gradient(#9146ff,#ff75e6);
		}
		&.blue {
			border-image-source: linear-gradient(#00d6d6,#9146ff);;
		}
		&.green {
			border-image-source: linear-gradient(#00db84,#57bee6);
		}
		&.orange {
			border-image-source: linear-gradient(#ffb31a,#e0e000);
		}
	}
}
</style>