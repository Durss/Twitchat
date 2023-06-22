<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event)"
	@mouseover="$emit('onOverMessage', messageData, $event)"
	>
		<div v-if="automodReasons" class="automod">
			<img src="@/assets/icons/automod.svg">
			<div class="header"><strong>{{ $t('chat.message.automod') }}</strong> {{automodReasons}}</div>
			<div class="actions">
				<Button :aria-label="$t('chat.message.automod_acceptBt_aria')"
				 	v-tooltip="$t('chat.message.automod_acceptBt_aria')"
					icon="checkmark"
					@click.stop="modMessage(true)"
					:loading="automodInProgress" />

				<Button :aria-label="$t('chat.message.automod_rejectBt_aria')"
				 	v-tooltip="$t('chat.message.automod_rejectBt_aria')"
					light alert
					icon="cross"
					@click.stop="modMessage(false)"
					:loading="automodInProgress" />
			</div>
		</div>
		
		<div v-if="isAnnouncement" class="announcementHolder">
			<Icon name="announcement" />
			<div class="header"><strong>{{ $t('chat.message.announcement') }}</strong></div>
		</div>
		
		<template v-if="messageData.user.is_blocked !== true">

			<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
			
			<ChatModTools :messageData="messageData" class="mod" v-if="showModTools" :canDelete="messageData.type != 'whisper'" />

			<Icon v-if="!disableConversation && isConversation && $store('params').features.conversationsEnabled.value && !lightMode"
				class="icon convBt"
				name="conversation"
				@click.stop="$emit('showConversation', $event, messageData)" />

			<ChatMessageInfoBadges class="infoBadges" :infos="infoBadges" v-if="infoBadges.length > 0" />
			
			<div class="userBadges" v-if="filteredBadges.length > 0 || miniBadges.length > 0">
				<img :src="b.icon.sd" v-for="(b,index) in filteredBadges" :key="index" class="badge" v-tooltip="b.title">
	
				<span class="badge mini" v-for="(b,index) in miniBadges"
					:key="index"
					:class="b.class"
					v-tooltip="b.label"></span>
			</div>
			
			<Icon class="noFollowBadge" v-if="showNofollow"
				name="unfollow"
				:alt="$t('chat.message.no_follow')"
				v-tooltip="$t('chat.message.no_follow')" />

			<div class="occurrenceCount"
				ref="occurrenceCount"
				v-tooltip="$t('chat.message.occurrences')"
				v-if="messageData.occurrenceCount != undefined && messageData.occurrenceCount > 0">x{{messageData.occurrenceCount+1}}</div>
			
			<span class="pronoun"
				v-if="messageData.user.pronounsLabel && $store('params').features.showUserPronouns.value===true"
				v-tooltip="messageData.user.pronounsTooltip || ''">{{messageData.user.pronounsLabel}}</span>
			
			<a :href="'https://twitch.tv/'+messageData.user.login" target="_blank"
				@click.stop.prevent="openUserCard(messageData.user)"
				@mouseenter="hoverNickName($event)"
				@mouseleave="outNickName($event)"
				class="login" :style="getLoginStyles(messageData.user)">{{messageData.user.displayName}}<i class="translation" v-if="translateUsername"> ({{messageData.user.login}})</i></a>
			<template v-if="recipient">
				<span> ➔ </span>
				<a :href="'https://twitch.tv/'+recipient.login" target="_blank"
					class="login"
					:style="getLoginStyles(recipient)"
					@click.stop.prevent="openUserCard(recipient!)">{{recipient.displayName}}</a>
			</template>
			
			<i18n-t scope="global" class="sharedBan" tag="span"
			v-if="userBannedOnChannels" keypath="chat.message.banned_in">
				<template #CHANNELS>{{userBannedOnChannels}}</template>
			</i18n-t>
			
			<span class="message">
				<span class="text">
					<ChatMessageChunksParser :chunks="localMessageChunks" />
				</span>
				<span class="deleted" v-if="deletedMessage">{{deletedMessage}}</span>
			</span>
			
			<br v-if="clipInfo">
			<div v-if="clipInfo" class="clip">
				<img :src="clipInfo.thumbnail_url" alt="thumbnail" @click.stop="openClip()">
				<div class="infos">
					<div class="title" @click.stop="openClip()">{{clipInfo.title}}</div>
					<div class="subtitle">{{$t("chat.message.clip_created_by")}} {{clipInfo.creator_name}}</div>
					<div class="subtitle">{{$t("chat.message.clip_channel")}} {{clipInfo.broadcaster_name}}</div>
					<div class="subtitle">{{$t("chat.message.clip_duration")}} {{clipInfo.duration}}s</div>
					<div class="subtitle">{{$t("chat.message.clip_views")}} {{clipInfo.view_count}}</div>
					<Button class="highlightBt" small
						:aria-label="$t('chat.message.highlightBt_aria')"
						icon="highlight"
						v-tooltip="$t('chat.message.highlightBt_tt')"
						:loading="clipHighlightLoading"
						@click.stop="clipHighlight()"
					/>
				</div>
			</div>
		</template>

		<span class="blockedMessage"
		v-if="messageData.user.is_blocked === true"
		@click.stop="messageData.user.is_blocked = false">{{ $t("chat.message.blocked_user") }}</span>

		<div class="ctas" v-if="isAd">
			<Button @click="disableAd()" alert icon="cross">{{ $t('chat.message.disable_ad') }}</Button>
			<Button @click="openAdParams()" icon="edit">{{ $t('chat.message.customize_ad') }}</Button>
		</div>
	</div>

</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import ContextMenuHelper from '@/utils/ContextMenuHelper';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import type { JsonObject } from 'type-fest';
import type { StyleValue } from 'vue';
import { Component, Prop } from 'vue-facing-decorator';
import Button from '../Button.vue';
import AbstractChatMessage from './AbstractChatMessage.vue';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';
import ChatMessageInfoBadges from './components/ChatMessageInfoBadges.vue';
import ChatModTools from './components/ChatModTools.vue';

@Component({
	components:{
		Button,
		ChatModTools,
		ChatMessageInfoBadges,
		ChatMessageChunksParser,
	},
	emits:['showConversation', 'showUserMessages', 'unscheduleMessageOpen', 'onOverMessage', 'onRead'],
})
export default class ChatMessage extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData;
	
	@Prop({type:Boolean, default:false})
	declare lightMode:boolean;

	@Prop({type:Boolean, default:false})
	public disableConversation!:boolean;

	@Prop({type:Array, default:[]})
	public highlightedWords!:string[];
	
	@Prop({type:Boolean, default:false})
	public contextMenuOff!:boolean;
	
	public channelInfo!:TwitchatDataTypes.UserChannelInfo;
	public recipient:TwitchatDataTypes.TwitchatUser|null = null;
	public showTools:boolean = false;
	public automodReasons = "";
	public hypeChat:TwitchatDataTypes.HypeChatData|null = null;
	public badges:TwitchatDataTypes.TwitchatUserBadge[] = [];
	public clipInfo:TwitchDataTypes.ClipInfo|null = null;
	public clipHighlightLoading:boolean = false;
	public highlightOverlayAvailable:boolean = false;
	public infoBadges:TwitchatDataTypes.MessageBadgeData[] = [];
	public isAd:boolean = false;
	public isAnnouncement:boolean = false;
	public automodInProgress:boolean = false;
	public userBannedOnChannels:string = "";
	public localMessageChunks:TwitchDataTypes.ParseMessageChunk[] = [];

	private staticClasses:string[] = [];
	private showModToolsPreCalc:boolean = false;
	private canModerateMessage:boolean = false;
	private canModerateUser_local:boolean = false;
	
	
	public get showNofollow():boolean{
		return this.$store("params").appearance.highlightNonFollowers.value === true
		&& this.channelInfo.is_following === false;
	}

	/**
	* Get replacement text if message has been deleted
	*/
	public get deletedMessage():string {
		if(this.messageData.type != "message") return "";

		const censor = (this.$store("params").appearance.censorDeletedMessages.value===true)
		if(this.messageData.deletedData) {
			return censor ? this.$t("chat.message.deleted_by", {USER:this.messageData.deletedData.deleter.displayName}) : "";
		}else if(this.messageData.deleted){
			return censor ? this.$t("chat.message.deleted") : "";
		}
		return "";
	}

	public get classes():string[] {
		const res					= this.staticClasses.concat();
		const message				= this.messageData;
		const sParams				= this.$store("params");
		const spoilersEnabled		= sParams.features.spoilersEnabled.value === true;
		const censorDeletedMessages	= sParams.appearance.censorDeletedMessages.value === true;

		if(this.hypeChat)						res.push("hypeChat");
		if(this.automodReasons)					res.push("automod");
		if(this.messageData.user.is_blocked)	res.push("blockedUser");
		if(this.disableConversation !== false)	res.push("disableConversation");
		if(!this.lightMode && message.cyphered)	res.push("cyphered");
		if(!this.lightMode && this.messageData.user.is_tracked)	res.push("tracked");

		if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			if(message.deleted)	{
				res.push("deleted");
				if(censorDeletedMessages) res.push("censor");
			}
			if(spoilersEnabled && this.messageData.spoiler === true) res.push("spoiler");
		}

		return res;
	}

	public get showModTools():boolean {
		return this.showModToolsPreCalc && this.$store("params").features.showModTools.value === true;
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
	public getLoginStyles(user:TwitchatDataTypes.TwitchatUser):StyleValue {
		let colorStr = user.color ?? "#ffffff";
		let color = 0xffffff;
		if(user.color) {
			color = parseInt(user.color.replace("#", ""), 16);
		}
		if(!Utils.isLightMode) {
			const hsl = Utils.rgb2hsl(color);
			const minL = .65;
			if(hsl.l < minL) {
				color = Utils.hsl2rgb(hsl.h, hsl.s, minL);
			}
			colorStr = color.toString(16);
		}else{
			const hsl = Utils.rgb2hsl(color);
			const maxL = .4;
			const minS = 1;
			if(hsl.l > maxL) {
				color = Utils.hsl2rgb(hsl.h, Math.max(hsl.s, minS), Math.min(hsl.l, maxL));
			}
			colorStr = color.toString(16);
		}
		while(colorStr.length < 6) colorStr = "0"+colorStr;
		colorStr = "#"+colorStr;
		let res = {
			color: colorStr,
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
						const color = (b.version ?? "").indexOf("pink") > -1? "pink" : "blue";
						badges.push({label:b.title?? "Prediction", class:"prediction "+color});
						break;
					}
					case "subscriber":	badges.push({label:b.title ?? this.$t("chat.message.badges.subscriber"), class:"subscriber"}); break;
					case "vip":			badges.push({label:this.$t("chat.message.badges.vip"), class:"vip"}); break;
					case "premium":		badges.push({label:this.$t("chat.message.badges.prime"), class:"premium"}); break;
					case "moderator":	badges.push({label:this.$t("chat.message.badges.moderator"), class:"moderator"}); break;
					case "staff":		badges.push({label:this.$t("chat.message.badges.twitch_staff"), class:"staff"}); break;
					case "broadcaster":	badges.push({label:this.$t("chat.message.badges.broadcaster"), class:"broadcaster"}); break;
					case "partner":		badges.push({label:this.$t("chat.message.badges.partner"), class:"partner"}); break;
					case "founder":		badges.push({label:this.$t("chat.message.badges.founder"), class:"founder"}); break;
					case "ambassador":	badges.push({label:this.$t("chat.message.badges.ambassador"), class:"ambassador"}); break;
				}
			}
		}
		return badges;
	}

	public beforeUpdate() {
		// console.log("Update message", this.messageData.message);
	}

	public beforeMount() {
		// console.log("Create message");
		this.channelInfo	= this.messageData.user.channelInfo[this.messageData.channel_id];
		this.badges			= JSON.parse(JSON.stringify(this.channelInfo.badges));//Make a copy of it so they stay this way
		this.localMessageChunks = JSON.parse(JSON.stringify(this.messageData.message_chunks));

		const mess			= this.messageData;
		const infoBadges:TwitchatDataTypes.MessageBadgeData[] = [];
		let highlightedWords:string[] = this.highlightedWords.concat();

		if(mess.cyphered) infoBadges.push({type:"cyphered"});

		if(this.channelInfo.is_raider) {
			infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.RAIDER});
			//Remove "raider" badge from the view when removed from data
			watch(()=> this.channelInfo.is_raider, () =>{
				for (let i = 0; i < this.infoBadges.length; i++) {
					const b = this.infoBadges[i];
					if(b.type == TwitchatDataTypes.MessageBadgeDataType.RAIDER) {
						this.infoBadges.splice(i,1);
						break;
					}
				}
			});
		}

		this.canModerateUser_local = super.canModerateUser(this.messageData.user, this.messageData.channel_id);
	
		//Define message badges (these are different from user badges!)
		if(mess.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.WHISPER});
			this.showModToolsPreCalc = false;
			this.canModerateMessage = false;
			
		}else if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE){
			this.isAd = this.messageData.is_ad === true;
			//Add twitchat's automod badge
			if(mess.automod) {
				infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.AUTOMOD, tooltip:"<strong>"+this.$t("chat.message.automod_rule")+"</strong> "+mess.automod.label});
			}
			//Add "first day on your chat" badge
			if(this.channelInfo.is_new && !this.messageData.twitch_isFirstMessage
			&& this.$store("params").features.firstUserBadge.value === true) {
				infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.NEW_USER});
			}
			//Manage twitch automod content
			if(!this.lightMode && mess.twitch_automod) {
				this.automodReasons = mess.twitch_automod.reasons.join(", ");
			}
			//Manage twitch automod content
			if(!this.lightMode && mess.twitch_hypeChat) {
				this.hypeChat = mess.twitch_hypeChat;
			}
			
			this.canModerateMessage = this.canModerateUser_local
									&& this.messageData.twitch_announcementColor == undefined//If it's not announcement (they're not deletable)

			//Precompute static flag
			this.showModToolsPreCalc = !this.lightMode
									&& this.canModerateMessage//if not sent by broadcaster
									&& this.canModerateUser_local;//If we're a mod or the broadcaster


			this.isAnnouncement	= this.messageData.twitch_announcementColor != undefined;

			watch(()=> mess.twitch_isSuspicious, () => this.updateSuspiciousState());
			watch(()=> mess.is_saved, () => this.updateSavedState());

			if(mess.twitch_isRestricted)				infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.RESTRICTED_USER});
			if(mess.twitch_isPresentation === true)		infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.PRESENTATION});
			if(mess.twitch_isReturning === true)		infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.RETURNING_CHATTER});
			if(mess.twitch_isFirstMessage === true)		infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.FIRST_TIME_CHATTER});
			
			if(mess.todayFirst === true
			&& mess.twitch_isFirstMessage !== true
			&& mess.twitch_isPresentation !== true
			&& mess.twitch_isReturning !== true
			&& this.lightMode === false) infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.FIRST_MESSAGE_TODAY});

			if(mess.twitch_hypeChat) {
				let currency = {"EUR":"€","USD":"$"}[mess.twitch_hypeChat.currency] || mess.twitch_hypeChat.currency;
				infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.HYPE_CHAT, label:currency + mess.twitch_hypeChat.amount});
			}
		}

		//Pre compute some classes to reduce watchers count on "classes" getter

		const staticClasses = ["chatmessageholder", "chatMessage"];
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			staticClasses.push("whisper");
		}else {
			if(this.messageData.twitch_isSlashMe)		staticClasses.push("slashMe");
			if(this.messageData.twitch_isHighlighted)	staticClasses.push("highlighted");
			if(this.messageData.type == "message" && this.messageData.hasMention)	{
				highlightedWords.push(StoreProxy.auth.twitch.user.login);
			}
			if(this.isAnnouncement) {
				const color = this.messageData.twitch_announcementColor!;
				staticClasses.push("announcement", color);
			}
		}

		//If it's a whisper, display recipient
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			this.recipient = this.messageData.to;
		}

		//If it has a clip link, add clip card
		let clipId = "";
		let text = this.messageData.message_html;
		if(/twitch\.tv\/[^/]+\/clip\//gi.test(text)) {
			const matches = text.match(/twitch\.[^/]{2,10}\/[^/]+\/clip\/([^/?\s\\"<']+)/i);
			clipId = matches? matches[1] : "";
			// if(clipId != "") text = text.replace(/(https?:\/\/)?(www\.)?twitch\.[^/]{2,10}\/[^/]+\/clip\/([^/?\s\\"]+)/, "");
		}else
		if(/clips\.twitch\.tv\//gi.test(text)) {
			const matches = text.match(/clips\.twitch\.[^/]{2,10}\/([^/?\s\\"<']+)/i);
			clipId = matches? matches[1] : "";
			// if(clipId != "") text = text.replace(/(https?:\/\/)?(www\.)?clips\.twitch\.[^/]{2,10}\/([^/?\s\\"]+)/, "");
		}
		
		if(clipId != "") {
			this.clipHighlightLoading = true;
			super.getHighlightOverPresence().then(res => {
				this.highlightOverlayAvailable = res;
				this.clipHighlightLoading = false;
			 });
			//Do it asynchronously blocking rendering
			(async()=> {
				let clip = await TwitchUtils.getClipById(clipId);
				if(clip) {
					this.clipInfo = clip;
				}
			})();
		}

		TwitchUtils.highlightChunks(this.localMessageChunks, highlightedWords);

		//If message has just been posted and it has an occurenceCount value
		//make it bounce
		if(Date.now() - this.messageData.date < 100 && this.$refs.occurrenceCount != undefined) {
			this.$nextTick().then(()=> {
				gsap.fromTo(this.$refs.occurrenceCount as HTMLDivElement, {scale:1.5}, {scale:1, duration:0.2});
			});
		}
		
		this.infoBadges = infoBadges;
		this.staticClasses = staticClasses;
		this.$store("accessibility").setAriaPolite(this.messageData.message);
		this.updateSuspiciousState();
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
	 * Called when rolling out the nick name
	 */
	public outNickName(event:MouseEvent):void {
		if(this.messageData.type == "whisper") return;
		if(this.$store("params").features.userHistoryEnabled.value) {
			this.$emit('unscheduleMessageOpen', event, this.messageData);
		}
	}

	/**
	 * Copy JSON data of the message
	 */
	public copyJSON():void {
		if(this.messageData.type == "whisper") {
			super.copyJSON();
		}else{
			const answersBckp = this.messageData.answers;
			const answerToBckp = this.messageData.answersTo;
			//Remove data to avoid infinite JSON stringify recursion
			this.messageData.answers = [];
			this.messageData.answersTo = undefined;
			super.copyJSON();
			this.messageData.answers = answersBckp;
			this.messageData.answersTo = answerToBckp;
		}
	}

	/**
	 * Accept or reject an automoded chat message
	 */
	public async modMessage(accept:boolean):Promise<void> {
		this.automodInProgress = true;
		let success = await TwitchUtils.modMessage(accept, this.messageData.id);
		if(!success) {
			this.$store("main").alert(this.$t("error.mod_message"));
		}else {
			//Delete the message.
			//If the message was allowed, twitch will send it back, no need to keep it.
			this.$store("chat").deleteMessage(this.messageData);
		}
		this.automodInProgress = false;
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
		super.getHighlightOverPresence().then(res => {
			this.highlightOverlayAvailable = res;
		});
		if(!this.highlightOverlayAvailable) {
			this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "highlight");
			return;
		}
		this.clipHighlightLoading = true;
		const data:TwitchatDataTypes.ChatHighlightInfo = {
			clip:{
				url:this.clipInfo!.embed_url+"&autoplay=true&parent=twitchat.fr&parent=localhost",
				mp4:this.clipInfo!.thumbnail_url.replace(/-preview.*\.jpg/gi, ".mp4"),
				duration:this.clipInfo!.duration,
			},
			params:this.$store("chat").chatHighlightOverlayParams,
		}
		PublicAPI.instance.broadcast(TwitchatEvent.SHOW_CLIP, (data as unknown) as JsonObject);
		this.$store("chat").isChatMessageHighlighted = true;
		await Utils.promisedTimeout(1000);
		this.clipHighlightLoading = false;
	}

	public onMouseLeave():void{
		this.showTools = false;
		this.$emit('onMouseOut', this.messageData)
	}
	
	public onMouseEnter():void{
		this.showTools = true;
	}
	
	/**
	 * Disable ad if a donator or redirect to ad params otherwise
	 */
	public disableAd():void{
		//If we're a donor, just disable the ad and delete the message as a feedback
		if(this.$store("auth").twitch.user.donor.state) {
			this.$store("chat").botMessages.twitchatAd.enabled = false;
			this.$store("chat").deleteMessageByID(this.messageData.id);
		}else{
			this.openAdParams();
		}
	}

	/**
	 * Open ad params page
	 */
	public openAdParams():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.AD)
	}

	/**
	 * Open the context menu on right click on desktop or long press on mobile
	 * 
	 * @param e 
	 */
	public onContextMenu(e:MouseEvent|TouchEvent):void {
		if(this.contextMenuOff !== false) return;
		if(e.target) {
			const el = e.target as HTMLElement;
			if(el.tagName == "A") return;
		}
		ContextMenuHelper.instance.messageContextMenu(e, this.messageData, this.canModerateMessage, this.canModerateUser_local);
	}

	/**
	 * Apply custom highlight colors
	 */
	public applyStyles():void {
		//Do not apply highlights on announcement.
		//Styles would conflict
		if(this.isAnnouncement) return;
		super.applyStyles();
	}
	
	/**
	 * Called when suspicious state of the user changes
	 */
	private updateSuspiciousState():void{
		if(this.messageData.type === TwitchatDataTypes.TwitchatMessageType.WHISPER) return;
		
		if(this.messageData.twitch_isSuspicious
		&& this.infoBadges.findIndex(v=> v.type == TwitchatDataTypes.MessageBadgeDataType.SUSPICIOUS_USER) == -1) {
			this.infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.SUSPICIOUS_USER});
		}
		
		if(this.messageData.twitch_isRestricted
		&& this.infoBadges.findIndex(v=> v.type == TwitchatDataTypes.MessageBadgeDataType.RESTRICTED_USER) == -1) {
			this.infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.RESTRICTED_USER});
		}
		
		let users = (this.messageData.twitch_sharedBanChannels?.map(v=>v.login) ?? []);
		if(users.length > 0) {
			this.userBannedOnChannels = users.join(", ").replace(/(.*),/, "$1 and");
		}
	}
	
	/**
	 * Called when "saved" state is changed
	 */
	private updateSavedState():void{
		const m = this.messageData as TwitchatDataTypes.MessageChatData;
		const badgeIndex = this.infoBadges.findIndex(v=> v.type == TwitchatDataTypes.MessageBadgeDataType.PINNED);

		if(m.is_saved) {
			if(badgeIndex == -1) {
				this.infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.PINNED});
			}
		}else{
			if(badgeIndex > -1) {
				this.infoBadges.splice(badgeIndex, 1);
			}
		}
	}
}
</script>

<style scoped lang="less">
.chatmessageholder {
	&.highlighted { 
		.message {
			background-color: var(--color-primary);
			color:#fff;
			padding: 0 .5em;
		}
	}

	&.slashMe {
		.message {
			font-style: italic;
		}
	}

	&.deleted {
		opacity: .35;
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
		color: var(--color-text);
		background-color: var(--color-secondary-fader);
		text-shadow: var(--text-shadow-contrast);
	}

	&.spoiler {
		.message {
			color: rgba(0, 0, 0, 0);
			@c1: var(--background-color-fadest);
			@c2: var(--background-color-fader);
			background-color: var(--background-color-fader);
			background-image: repeating-linear-gradient(-45deg, @c1, @c1 7px, @c2 7px, @c2 15px);
		}
		&:hover {
			.message {
				color:unset;
				-webkit-text-fill-color: unset;
				background-color: transparent;
				background-image: unset;
			}
		}
		&:not(:hover):deep(.emote) {
			opacity: 0;
		}
	}

	.icon {
		opacity: 0.75;
		height: 1em;
		vertical-align: middle;

		&:not(:last-child) {
			margin-right: .25em;
		}

		&.convBt {
			cursor: pointer;
			&:hover {
				opacity: .75;
			}
		}
	}
	.mod {
		display: inline-flex;
		margin-right: .4em;
	}

	.infoBadges {
		margin-right: .4em;
	}

	.userBadges {
		display: inline;
		margin-right: .4em;

		.badge {
			width: 1em;
			height: 1em;
			vertical-align: middle;
			margin-right: .25em;
			
			&.mini {
				display: inline-block;
				width: .4em;
				height: 1em;
				margin: 0 1px 0px 0;
				&.prediction {
					width: 1em;
					border-radius: 50%;
					margin-right: .25em;
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

			&:last-child {
				margin-right: 0;
			}
		}
	}

	.login {
		cursor: pointer;
		font-weight: bold;
		text-decoration: none;
		// -webkit-text-stroke: fade(#000, 50%) .25px;
		&:hover {
			background-color: var(--background-color-fader);
			border-radius: 3px;
		}
		.translation {
			font-weight: normal;
			font-size: .9em;
		}
		&::after{
			content: ": ";
			display: inline-block;
		}
	}

	.occurrenceCount {
		display: inline-block;
		background: var(--color-primary);
		padding: .2em .4em;
		margin-right: .25em;
		font-weight: bold;
		border-radius: 10px;
		color:var(--color-light);
	}

	.pronoun {
		border-radius: 3px;
		color: var(--color-text);
		border: 1px solid var(--color-text);
		padding: 0 2px;
		margin-right: .25em;
	}

	.sharedBan {
		color: var(--color-secondary);
		font-weight: bold;
		margin-right: .25em;
	}

	.message {
		// position: relative;
		word-break: break-word;
		:deep(a) {
			word-break: break-all;
		}

		:deep(mark) {
			font-weight: normal;
			background-color: var(--color-primary);
			color: var(--color-light);
			text-shadow: var(--text-shadow-contrast);
			padding: 0px 5px;
		}
	}

	.clip {
		align-self: center;
		display: flex;
		flex-direction: row;
		border-radius: .25em;
		padding: .5em;
		cursor: pointer;
		position: relative;

		img {
			cursor: pointer;
			object-fit: cover;
			max-width: min(50%, 200px);
		}

		.infos {
			padding: 0 .5em;
			min-width: 150px;
			.title {
				font-weight: bold;
				margin-bottom: .25em;
				cursor: pointer;
			}
			.subtitle {
				font-size: .8em;
			}
			.highlightBt {
				font-size: 1.25em;
			}
		}
	}

	&.blockedUser {
		cursor: pointer;
		.blockedMessage {
			font-style: italic;
		}
	}

	&.automod {
		margin-top: .25em;
		border-radius: .25em;
		background-color: var(--color-alert-fader);
		padding-top: 0;

		.automod {
			background-color: var(--color-alert);
			padding: .25em;
			border-top-left-radius: .5em;
			border-top-right-radius: .5em;
			margin: -.25em;//Expand over holder's padding
			margin-bottom: 10px;
			display: flex;
			flex-direction: row;
			align-items: center;

			img {
				height: 1.25em;
				margin-right: .5em;
			}

			.header {
				color: var(--color-light);
				flex-grow: 1;
			}

			.actions {
				.button {
					border-radius: .5em;
					&:not(:last-child) {
						margin-right: .5em;
					}
				}
			}
		}

		.login {
			color: var(--color-text) !important;
		}
	}

	&.cyphered {
		background-image: repeating-linear-gradient(-45deg, #ffffff10, #ffffff10 20px, #ffffff30 20px, #ffffff30 40px);
	}
	
	&.whisper, &.cyphered {
		background-color: var(--color-text-inverse);
		@c1: rgba(0,0,0,0);
		@c2: var(--background-color-fadest);
		background-image: repeating-linear-gradient(-45deg, @c1, @c1 20px, @c2 20px, @c2 40px);
		.message{
			font-style: italic;
		}
	}

	.noFollowBadge {
		height: 1em;
		margin-right: .25em;
		vertical-align: middle;
	}

	&.announcement {
		border-image-slice: 1;
		border-left: .6em solid rgba(255, 255, 255, .5);
		border-right: .6em solid rgba(255, 255, 255, .5);
		padding-top: 0;
		padding-bottom: .25em;
		background-color: rgba(255, 255, 255, .1);

		.announcementHolder {
			display: flex;
			margin: 0;
			padding: .2em;
			margin-bottom: .25em;
			flex-direction: row;
			justify-content: center;
			background-color: var(--background-color-fader);
			width: calc(100% + .5em);
			margin-left: -.25em;

			img {
				height: 1em;
				margin-right: .5em;
			}

			.header {
				color: var(--color-text);
			}
		}
		&.purple {
			border-image-source: linear-gradient(#9146ff,#ff75e6) !important;
		}
		&.blue {
			border-image-source: linear-gradient(#00d6d6,#9146ff) !important;
		}
		&.green {
			border-image-source: linear-gradient(#00db84,#57bee6) !important;
		}
		&.orange {
			border-image-source: linear-gradient(#ffb31a,#e0e000) !important;
		}

		padding: 0 .25em;
	}

	.ctas {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		gap: .5em;
		margin-top: .5em;
	}
}
</style>