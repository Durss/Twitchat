<template>
	<div :class="classes" @click.ctrl.stop.capture="copyJSON()">
		<div v-if="firstTime" class="header">
			<img src="@/assets/icons/firstTime.svg" alt="new" class="icon">
			<p>First time on your channel</p>
		</div>

		<div v-if="isPresentation" class="header">
			<img src="@/assets/icons/presentation.svg" alt="new" class="icon">
			<p>Welcome on this channel <strong>{{messageData.user.displayName}}</strong></p>
		</div>

		<div v-if="isReturning" class="header">
			<img src="@/assets/icons/returning.svg" alt="new" class="icon">
			<p><strong>{{messageData.user.displayName}}</strong> is returning after chatting twice the last 30 days</p>
		</div>

		<div v-if="automod" class="automod">
			<img src="@/assets/icons/automod.svg">
			<div class="header"><strong>Automod</strong> : {{automodReasons}}</div>
			<div class="actions">
				<Button aria-label="Accept automoded message" title="Accept" @click.stop="modMessage(true)" />
				<Button aria-label="Reject automoded message" title="Reject" @click.stop="modMessage(false)" highlight />
			</div>
		</div>
		
		<div v-if="messageData.type == 'message' && messageData.twitch_isLowTrust" class="lowTrust">
			<img src="@/assets/icons/shield.svg">
			<div class="header"><strong>Suspicious user</strong></div>
		</div>
		
		<div v-if="isAnnouncement" class="announcementHolder">
			<img src="@/assets/icons/announcement.svg">
			<div class="header"><strong>Announcement</strong></div>
		</div>

		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>

		<div class="infos" v-if="channelInfo.is_blocked !== true">
			<!-- <img v-if="messageData.type == 'whisper'" class="icon" src="@/assets/icons/whispers.svg" data-tooltip="Whisper"> -->
			<img v-if="!disableConversation && isConversation && $store('params').features.conversationsEnabled.value && !lightMode"
				class="icon convBt"
				src="@/assets/icons/conversation.svg"
				alt="conversation"
				@mouseleave="$emit('mouseleave', $event)"
				@click.stop="$emit('showConversation', $event, messageData)">
			
			<ChatModTools :messageData="messageData" class="mod" v-if="showModTools" :canDelete="messageData.type != 'whisper'" />

			<ChatMessageInfos class="infoBadges" :infos="infoBadges" />
			
			<img :src="b.icon.sd" v-for="(b,index) in filteredBadges" :key="index" class="badge" :data-tooltip="b.title">

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
				v-if="messageData.occurrenceCount != undefined && messageData.occurrenceCount > 0">x{{messageData.occurrenceCount+1}}</div>
			
			<span class="pronoun"
				v-if="messageData.user.pronounsLabel && $store('params').features.showUserPronouns.value===true"
				:data-tooltip="messageData.user.pronounsTooltip">{{messageData.user.pronounsLabel}}</span>
			
			<span @click.stop="openUserCard(messageData.user)"
				@mouseenter="hoverNickName($event)"
				@mouseleave="$emit('mouseleave', $event)"
				class="login" :style="loginStyles">{{messageData.user.displayName}}<i class="translation" v-if="translateUsername"> ({{messageData.user.displayName}})</i></span>

			<span v-if="recipient" class="login"
			@click.stop="openUserCard(recipient!)"> &gt; {{recipient.displayName}}</span>
		</div>
		
		<span v-if="channelInfo.is_blocked !== true">: </span>
		<span class="message" v-if="channelInfo.is_blocked !== true">
			<span class="text" v-html="text" @click="clickMessage"></span>
			<span class="deleted" v-if="deletedMessage">{{deletedMessage}}</span>
		</span>

		<div v-if="channelInfo.is_blocked === true" class="blockedMessage" @click.stop="channelInfo.is_blocked = false">This message has been sent by a blocked user. Click to reveal.</div>
		
		<br v-if="clipInfo && channelInfo.is_blocked !== true">
		<div v-if="clipInfo && channelInfo.is_blocked !== true" class="clip" @click.stop="openClip()">
			<img :src="clipInfo.thumbnail_url" alt="thumbnail">
			<div class="infos">
				<div class="title">{{clipInfo.title}}</div>
				<div class="subtitle">Created by {{clipInfo.creator_name}}</div>
				<div class="subtitle">Channel: {{clipInfo.broadcaster_name}}</div>
				<div class="subtitle">Duration: {{clipInfo.duration}}s</div>
				<div class="subtitle">Views: {{clipInfo.view_count}}</div>
			</div>
			<Button class="highlightBt" :aria-label="'Highlight message'" small
				:icon="$image('icons/highlight.svg')"
				data-tooltip="Show on stream<br><i>(needs overlay)</i>"
				@click.stop="clipHighlight()"
				:loading="clipHighlightLoading"
			/>
		</div>
	</div>

</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import type { JsonObject } from 'type-fest';
import type { StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatMessageInfos from './ChatMessageInfos.vue';
import ChatModTools from './ChatModTools.vue';
import UserSession from '@/utils/UserSession';

@Options({
	components:{
		Button,
		ChatModTools,
		ChatMessageInfos,
	},
	props:{
		messageData:Object,
		lightMode:{type:Boolean, default:false},
		disableConversation:{type:Boolean, default:false},
		enableWordHighlight:{type:Boolean, default:false},
	},
	emits:['showConversation', 'showUserMessages', 'mouseleave', 'ariaMessage'],
})
export default class ChatMessage extends Vue {

	public messageData!:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData;
	public lightMode!:boolean;
	public disableConversation!:boolean;
	public enableWordHighlight!:boolean;
	public channelInfo!:TwitchatDataTypes.UserChannelInfo;
	public currentUser!:TwitchatDataTypes.TwitchatUser;
	
	public text = "";
	public recipient:TwitchatDataTypes.TwitchatUser|null = null;
	public firstTime = false;
	public automod:TwitchatDataTypes.AutomodParamsKeywordFilterData | null = null;
	public automodReasons = "";
	public badges:TwitchatDataTypes.TwitchatUserBadge[] = [];
	public clipInfo:TwitchDataTypes.ClipInfo|null = null;
	public clipHighlightLoading:boolean = false;
	public infoBadges:TwitchatDataTypes.MessageBadgeData[] = [];
	public isAnnouncement:boolean = false;
	public isPresentation:boolean = false;
	public isReturning:boolean = false;

	private staticClasses:string[] = [];
	private showModToolsPreCalc:boolean = false;
	
	
	public get showNofollow():boolean{
		return this.$store("params").appearance.highlightNonFollowers.value === true
		&& this.channelInfo.is_following === false;
	}

	/**
	* Get replacement text if message has been deleted
	*/
	public get deletedMessage():string {
		if(this.messageData.type != "message") return "";

		const censor = (this.$store("params").filters.censorDeletedMessages.value===true)
		if(this.messageData.deletedData) {
			return censor ? "<deleted by "+this.messageData.deletedData.deleter.displayName+">" : "";
		}else if(this.messageData.deleted){
			return censor ? "<message deleted>" : "";
		}
		return "";
	}

	public get classes():string[] {
		let res = this.staticClasses.concat();
		const message = this.messageData;
		const sParams = this.$store("params");

		if(message.cyphered)			res.push("cyphered");
		if(this.automod)				res.push("automod");
		if(this.channelInfo.is_blocked)	res.push("blockedUser");
		if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			if(message.deleted) {
				res.push("deleted");
				if(sParams.filters.censorDeletedMessages.value===true) res.push("censor");
			}
		}
		if(!this.lightMode && this.messageData.user.is_tracked)	res.push("tracked");
		
		if(sParams.features.spoilersEnabled.value === true) {
			if(this.messageData.spoiler === true) res.push("spoiler");
		}

		return res;
	}

	public get showModTools():boolean {
		return this.showModToolsPreCalc && this.$store("params").features.showModTools.value === true;
	}

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	/**
	 * Is this message part of a conversation?
	 */
	public get isConversation():boolean {
		if(this.messageData.type == "whisper") return false;
		return this.messageData.answers.length > 0 || this.messageData.answersTo != undefined;
	}

	/**
	 * Returns the login instead of the display name if the display name contains
	 * mostly non-latin chars
	 */
	public get translateUsername():boolean {
		if(this.$store("params").appearance.translateNames.value !== true) return false;

		const dname = this.messageData.user.displayName.toLowerCase();
		const uname = this.messageData.user.login.toLowerCase();
		//If display name is different from username and at least half of the
		//display name's chars ar not latin chars, translate it
		return dname != uname && dname.replace(/^[^a-zA-Z0-9]*/gi, "").length < dname.length/2;
	}
	
	/**
	 * Set login color
	 */
	public get loginStyles():StyleValue {
		let color = 0xb454ff;
		if(this.messageData.user.color) {
			color = parseInt(this.messageData.user.color.replace("#", ""), 16);
		}
		const hsl = Utils.rgb2hsl(color);
		const minL = this.isPresentation || this.isAnnouncement || this.firstTime || this.isReturning? .75 : .65;
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
	public get filteredBadges():TwitchatDataTypes.TwitchatUserBadge[] {
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) return [];
		
		if(this.$store("params").appearance.showBadges.value
		&& this.$store("params").appearance.minimalistBadges.value !== true) {
			return this.badges ?? [];
		}
		return [];
	}

	/**
	 * Displays minimalist badges
	 */
	public get miniBadges():{label:string, class?:string}[] {
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) return [];
		
		let badges:{label:string, class?:string}[] = [];

		if(this.$store("params").appearance.showBadges.value === true
		&& this.$store("params").appearance.minimalistBadges.value === true
		&& this.badges) {
			for (let i = 0; i < this.badges.length; i++) {
				const b = this.badges[i];
				switch(b.id) {
					case "predictions": {
						//TODO color probably won't work
						const color = b.title && b.title.indexOf("pink") > -1? "pink" : "blue";
						badges.push({label:b.title??"Prediction", class:"prediction "+color});
						break;
					}
					case "subscriber":	badges.push({label:b.title ?? "Subscriber", class:"subscriber"}); break;
					case "vip":			badges.push({label:"VIP", class:"vip"}); break;
					case "premium":		badges.push({label:"Prime", class:"premium"}); break;
					case "moderator":	badges.push({label:"Moderator", class:"moderator"}); break;
					case "staff":		badges.push({label:"Twitch staff", class:"staff"}); break;
					case "broadcaster":	badges.push({label:"Broadcaster", class:"broadcaster"}); break;
					case "partner":		badges.push({label:"Partner", class:"partner"}); break;
					case "founder":		badges.push({label:"Founder", class:"founder"}); break;
					case "ambassador":	badges.push({label:"Ambassador", class:"ambassador"}); break;
				}
			}
		}
		return badges;
	}

	public beforeMount() {
		this.currentUser	= this.$store("users").getUserFrom(this.messageData.platform, this.messageData.channel_id, UserSession.instance.twitchUser!.id);
		this.channelInfo	= this.messageData.user.channelInfo[this.messageData.channel_id];
		this.badges			= JSON.parse(JSON.stringify(this.channelInfo.badges));//Make a copy of it so they stay this way
	}

	/**
	 * Called when component is mounted
	 */
	public mounted():void {
		const mess = this.messageData;
		
		//Define message badges (these are different from user badges!)
		if(mess.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			this.infoBadges.push({type:"whisper"});
			
		}else if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE){
			this.firstTime = mess.twitch_isFirstMessage === true;
			//Add twitchat's automod badge
			if(mess.automod) {
				this.infoBadges.push({type:"automod", tooltip:"<strong>Rule:</strong> "+mess.automod.label});
			}
			//Manage twitch automod content
			if(!this.lightMode && mess.twitch_automod) {
				this.automodReasons = mess.twitch_automod.reasons.join(", ");
			}

			//Precompute static flag
			this.showModToolsPreCalc = !this.lightMode
									&& this.messageData.user.id != UserSession.instance.twitchUser!.id
									// && (this.channelInfo.is_moderator===true || this.channelInfo.is_broadcaster===true);
			this.isAnnouncement	= this.messageData.twitch_announcementColor != undefined;
			this.isPresentation	= this.messageData.twitch_isPresentation === true;
			this.isReturning	= this.messageData.twitch_isReturning === true;
		}

		//Pre compute some classes to reduce watchers count on "classes" getter
		this.staticClasses = ["chatmessage"];
		if(this.firstTime || this.isPresentation || this.isReturning)	this.staticClasses.push("firstTimeOnChannel");
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			this.staticClasses.push("whisper");
		}else {
			if(this.messageData.twitch_isLowTrust)		this.staticClasses.push("lowTrust");
			if(this.messageData.twitch_isSlashMe)		this.staticClasses.push("slashMe");
			if(this.messageData.twitch_isHighlighted)	this.staticClasses.push("highlighted");
			if(this.messageData.type == "message"
				&& this.messageData.hasMention)			this.staticClasses.push("mention");
			if(this.isAnnouncement) {
				const color = this.messageData.twitch_announcementColor!;
				this.staticClasses.push("announcement", color);
			}

			if(!this.lightMode) {
				const sParams = this.$store("params");
				if(this.channelInfo.is_moderator
					&& sParams.appearance.highlightMods.value)	this.staticClasses.push("highlightMods");
				else if(this.channelInfo.is_vip
					&& sParams.appearance.highlightVips.value)	this.staticClasses.push("highlightVips");
				else if(this.channelInfo.is_subscriber
					&& sParams.appearance.highlightSubs.value)	this.staticClasses.push("highlightSubs");
			}
		}

		//If it has a clip link, add clip card
		let clipId = "";
		let text = this.messageData.message_html;
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			this.recipient = this.messageData.to;
		}
		if(/twitch\.tv\/[^/]+\/clip\//gi.test(text)) {
			const matches = text.match(/twitch\.[^/]{2,10}\/[^/]+\/clip\/([^/?\s\\"]+)/i);
			clipId = matches? matches[1] : "";
			// if(clipId != "") text = text.replace(/(https?:\/\/)?(www\.)?twitch\.[^/]{2,10}\/[^/]+\/clip\/([^/?\s\\"]+)/, "");
		}else
		if(/clips\.twitch\.tv\//gi.test(text)) {
			const matches = text.match(/clips\.twitch\.[^/]{2,10}\/([^/?\s\\"]+)/i);
			clipId = matches? matches[1] : "";
			// if(clipId != "") text = text.replace(/(https?:\/\/)?(www\.)?clips\.twitch\.[^/]{2,10}\/([^/?\s\\"]+)/, "");
		}
		
		if(clipId != "") {
			//Do it asynchronously to not block the rendering
			(async()=> {
				let clip = await TwitchUtils.getClipById(clipId);
				if(clip) {
					this.clipInfo = clip;
				}
			})();
		}
		

		if(this.$store("params").appearance.showEmotes.value !== true) {
			this.text = this.messageData.message;
		}else{
			const button = "<img src='"+this.$image('icons/copy_alert.svg')+"' class='copyBt' data-copy=\"https://$2\" data-tooltip='Copy'>";
			this.text = this.messageData.message_html.replace(/(<a .*?>)(.*?)(<\/a>)/gi, button+"$1$2$3");
		}
		this.$emit("ariaMessage", this.messageData.message);

		watch(()=>this.messageData.occurrenceCount, async ()=>{
			await this.$nextTick();
			gsap.fromTo(this.$refs.occurrenceCount as HTMLDivElement, {scale:1.5}, {scale:1, duration:0.2});
		});
	}

	/**
	 * Open a users' card
	 */
	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.messageData.channel_id);
	}

	/**
	 * Called when rolling over the nick name
	 */
	public hoverNickName(event:MouseEvent):void {
		if(this.messageData.type == "whisper") return;
		if(this.$store("params").features.userHistoryEnabled.value) {
			this.$emit('showUserMessages', event, this.messageData);
		}
	}

	/**
	 * Copy JSON data of the message
	 */
	public copyJSON():void {
		if(this.messageData.type == "whisper") {
			Utils.copyToClipboard(JSON.stringify(this.messageData));
			console.log(this.messageData);
		}else{
			const messageBckp = this.channelInfo.messageHistory;
			const answersBckp = this.messageData.answers;
			const answerToBckp = this.messageData.answersTo;
			this.channelInfo.messageHistory = [];
			this.messageData.answers = [];
			this.messageData.answersTo = undefined;
			Utils.copyToClipboard(JSON.stringify(this.messageData));
			console.log(this.messageData);
			this.channelInfo.messageHistory = messageBckp;
			this.messageData.answers = answersBckp;
			this.messageData.answersTo = answerToBckp;
		}
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

	/**
	 * Accept or reject an automoded chat message
	 */
	public async modMessage(accept:boolean):Promise<void> {
		let success = await TwitchUtils.modMessage(accept, this.messageData.id);
		if(!success) {
			this.$store("main").alert("Woops... something went wrong :(...");
		}else {
			//Delete the message.
			//If the message was allowed, twitch will send it back, no need to keep it.
			this.$store("chat").deleteMessage(this.messageData);
		}
	}

	/**
	 * Called when message is clicked.
	 */
	public clickMessage(e:MouseEvent):void {
		const t = e.target as HTMLElement;
		if(t.dataset.copy) {
			//If clicked on a "copy" button (on links), copy to clipboard and
			//stop event's propagation to avoid marking message as read
			Utils.copyToClipboard(t.dataset.copy);
			e.stopPropagation();
			gsap.fromTo(t, {scale:1.5, filter:"brightness(2)"}, {scale:1, filter:"brightness(1)", duration:0.2});

		}else if(t.tagName == "A") {
			//If clicked on a link, stop event's propagation to avoid marking message as read
			e.stopPropagation();
		}
	}

	/**
	 * Open a clip on a new tab
	 */
	public openClip():void {
		window.open(this.clipInfo?.url, "_blank");
	}

	/**
	 * Send a clip to the overlay
	 */
	public async clipHighlight():Promise<void> {
		this.clipHighlightLoading = true;
		const data:TwitchatDataTypes.ChatHighlightInfo = {
			clip:{
				url:this.clipInfo!.embed_url+"&autoplay=true&parent=twitchat.fr&parent=localhost",
				duration:this.clipInfo!.duration,
			},
			params:this.$store("chat").chatHighlightOverlayParams,
		}
		PublicAPI.instance.broadcast(TwitchatEvent.SHOW_CLIP, (data as unknown) as JsonObject);
		await Utils.promisedTimeout(2000);
		this.clipHighlightLoading = false;
	}
}
</script>

<style scoped lang="less">
.chatmessage{
	color:@mainColor_light;

	&.highlightSubs { background-color: fade(#9147ff, 7%); }
	&.highlightVips { background-color: fade(#e00bb9, 7%); }
	&.highlightMods { background-color: fade(#39db00, 7%); }
	&.highlighted { 
		.message {
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

	&.spoiler {
		.message {
			color: @mainColor_dark_light;
			background-color: @mainColor_dark_light;
		}
		&:hover {
			.message {
				color:unset;
				background-color: transparent;
			}
		}
		&:not(:hover):deep(.emote) {
			opacity: 0;
		}
	}

	.infos {
		display: inline;
		.icon {
			opacity: 0.75;
			height: 1em;
			vertical-align: middle;

			&:not(:last-child) {
				margin-right: 5px;
			}

			&.convBt {
				cursor: pointer;
				&:hover {
					opacity: .75;
				}
			}
		}
		.mod {
			display: inline;
			margin-right: 5px;
		}

		.infoBadges {
			margin-left: .25em;
		}

		.badge {
			width: 1em;
			height: 1em;
			vertical-align: middle;
			margin-right: 5px;

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
			&.founder{ background: linear-gradient(0deg, #e53fcc 0%, #884ef6 100%); }
			&.ambassador{ background: linear-gradient(0deg, #40e4cb 0%, #9048ff 100%); }
		}

		.login {
			cursor: pointer;
			font-weight: bold;
			// -webkit-text-stroke: fade(#000, 50%) .25px;
			&:hover {
				background-color: fade(@mainColor_light, 10%);
				border-radius: 3px;
			}
			.translation {
				font-weight: normal;
				font-size: .9em;
			}
		}
	
		.miniBadges {
			padding: 1px;
			margin-right: 5px;
			display: inline-block;
			.badge {
				display: inline-block;
				width: .4em;
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

		.pronoun {
			font-size: .8em;
			border-radius: 3px;
			color: @mainColor_light;
			border: 1px solid @mainColor_light;
			padding: 0 .1em;
			margin-right: 5px;
			vertical-align: middle;
		}
	}

	.message {
		color: #d1d1d1;
		// position: relative;
		word-break: break-word;
		line-height: 1.5em;
		:deep( .emote ) {
			// width: 2em;
			max-height: 2em;
			vertical-align: middle;
			object-fit: contain;
		}
		:deep(a) {
			word-break: break-all;
		}
		:deep(.highlightedWord) {
			font-weight: bold;
			color: @mainColor_dark;
			padding: 0 3px;
			border-radius: 3px;
			background-color: @mainColor_light;
		}
		:deep(.copyBt) {
			height: 1em;
			margin-right: .25em;
			vertical-align: middle;
			cursor: pointer;
		}

		.deleted {
			font-style: italic;
		}
	}

	.clip {
		align-self: center;
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		border: 1px solid @mainColor_light;
		background-color: fade(@mainColor_light, 10%);
		border-radius: .5em;
		overflow: hidden;
		margin: auto;
		cursor: pointer;
			position: relative;

		&:hover {
			background-color: fade(@mainColor_light, 20%);
		}

		img {
			width: 5em;
			height: 5em;
			object-fit: cover;
		}
		.highlightBt {
			position: absolute;
			bottom: 0;
			right: 0;
			border-bottom-right-radius: 0;
		}

		.infos {
			padding: 0 .5em;
			.title {
				font-weight: bold;
				margin-bottom: .25em;
			}
			.subtitle {
				font-size: .8em;
				color: fade(@mainColor_light, 70%);
			}
		}
	}

	&.blockedUser {
		cursor: pointer;
		.blockedMessage {
			color: @mainColor_alert;
			font-style: italic;
		}
		&:hover {
			.blockedMessage {
				color: lighten(@mainColor_alert, 20%);
			}
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

	&.whisper {
		background-color: rgba(0, 0, 0, 1);
		// border: 1px dashed @mainColor_light;
		border-radius: .5em;
		font-style: italic;
	}

	&.lowTrust {
		margin-top: 5px;
		border-radius: 5px;
		background-color: fade(@mainColor_alert, 30%) !important;
		
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

	.noFollowBadge {
		height: 1em;
		margin-right: 5px;
		vertical-align: middle;
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