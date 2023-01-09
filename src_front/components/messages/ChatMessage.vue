<template>
	<div :class="classes" @click.capture.ctrl.stop="copyJSON()"
	@mouseover="$emit('onOverMessage', messageData, $event)"
	@click="$emit('onRead', messageData, $event)"
	>
		<div v-if="firstTime" class="header">
			<img src="@/assets/icons/firstTime.svg" alt="new" class="icon">
			<p>{{ $t('chat.message.first_time') }}</p>
		</div>

		<div v-if="isPresentation" class="header">
			<img src="@/assets/icons/presentation.svg" alt="new" class="icon">
			<i18n-t scope="global" keypath="chat.message.presentation" tag="p">
				<template #USER><strong>{{messageData.user.displayName}}</strong></template>
			</i18n-t>
		</div>

		<div v-if="isReturning" class="header">
			<img src="@/assets/icons/returning.svg" alt="new" class="icon">
			<i18n-t scope="global" keypath="chat.message.returning_user" tag="p">
				<template #USER><strong>{{messageData.user.displayName}}</strong></template>
			</i18n-t>
		</div>

		<div v-if="automodReasons" class="automod">
			<img src="@/assets/icons/automod.svg">
			<div class="header"><strong>{{ $t('chat.message.automod') }}</strong> {{automodReasons}}</div>
			<div class="actions">
				<Button :aria-label="$t('chat.message.automod_acceptBt_aria')"
					:title="$t('chat.message.automod_acceptBt')"
					@click.stop="modMessage(true)"
					:loading="automodInProgress" />
				<Button :aria-label="$t('chat.message.automod_rejectBt_aria')"
				highlight
					:title="$t('chat.message.automod_rejectBt')"
					@click.stop="modMessage(false)"
					:loading="automodInProgress" />
			</div>
		</div>
		
		<div v-if="isAnnouncement" class="announcementHolder">
			<img src="@/assets/icons/announcement.svg">
			<div class="header"><strong>{{ $t('chat.message.announcement') }}</strong></div>
		</div>

		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>

		<div class="infos" v-if="channelInfo.is_blocked !== true">
			
			<ChatModTools :messageData="messageData" class="mod" v-if="showModTools" :canDelete="messageData.type != 'whisper'" />

			<img v-if="!disableConversation && isConversation && $store('params').features.conversationsEnabled.value && !lightMode"
				class="icon convBt"
				src="@/assets/icons/conversation.svg"
				alt="conversation"
				@click.stop="$emit('showConversation', $event, messageData)">

			<ChatMessageInfoBadges class="infoBadges" :infos="infoBadges" v-if="infoBadges.length > 0" />
			
			<div class="userBadges" v-if="filteredBadges.length > 0 || miniBadges.length > 0">
				<img :src="b.icon.sd" v-for="(b,index) in filteredBadges" :key="index" class="badge" :data-tooltip="b.title">
	
				<span class="badge mini" v-for="(b,index) in miniBadges"
					:key="index"
					:class="b.class"
					:data-tooltip="b.label"></span>
			</div>
			
			<img class="noFollowBadge" v-if="showNofollow"
				src="@/assets/icons/unfollow.svg"
				:alt="$t('chat.message.no_follow')"
				:data-tooltip="$t('chat.message.no_follow')">

			<div class="occurrenceCount"
				ref="occurrenceCount"
				:data-tooltip="$t('chat.message.occurrences')"
				v-if="messageData.occurrenceCount != undefined && messageData.occurrenceCount > 0">x{{messageData.occurrenceCount+1}}</div>
			
			<span class="pronoun"
				v-if="messageData.user.pronounsLabel && $store('params').features.showUserPronouns.value===true"
				:data-tooltip="messageData.user.pronounsTooltip || ''">{{messageData.user.pronounsLabel}}</span>
			
			<span @click.stop="openUserCard(messageData.user)"
				@mouseenter="hoverNickName($event)"
				class="login" :style="getLoginStyles(messageData.user)">{{messageData.user.displayName}}<i class="translation" v-if="translateUsername"> ({{messageData.user.login}})</i></span>
			<span v-if="recipient"> ➔ </span>
			<span v-if="recipient" class="login"
			:style="getLoginStyles(recipient)"
			@click.stop="openUserCard(recipient!)">{{recipient.displayName}}</span>
		</div>
		
		<i18n-t scope="global" class="sharedBan" tag="span"
		v-if="userBannedOnChannels" keypath="chat.message.banned_in">
			<template #CHANNELS>{{userBannedOnChannels}}</template>
		</i18n-t>
		
		<span v-if="channelInfo.is_blocked !== true">: </span>
		
		<span class="message" v-if="channelInfo.is_blocked !== true">
			<span class="text" v-html="text" @click="clickMessage"></span>
			<span class="deleted" v-if="deletedMessage">{{deletedMessage}}</span>
		</span>

		<span class="blockedMessage"
		v-if="channelInfo.is_blocked === true"
		@click.stop="channelInfo.is_blocked = false">{{ $t("chat.message.blocked_user") }}</span>
		
		<br v-if="clipInfo && channelInfo.is_blocked !== true">
		<div v-if="clipInfo && channelInfo.is_blocked !== true" class="clip" @click.stop="openClip()">
			<img :src="clipInfo.thumbnail_url" alt="thumbnail">
			<div class="infos">
				<div class="title">{{clipInfo.title}}</div>
				<div class="subtitle">{{$t("chat.message.clip_created_by")}} {{clipInfo.creator_name}}</div>
				<div class="subtitle">{{$t("chat.message.clip_channel")}} {{clipInfo.broadcaster_name}}</div>
				<div class="subtitle">{{$t("chat.message.clip_duration")}} {{clipInfo.duration}}s</div>
				<div class="subtitle">{{$t("chat.message.clip_views")}} {{clipInfo.view_count}}</div>
				<Button class="highlightBt" small
					:aria-label="$t('chat.message.highlightBt_aria')"
					:icon="$image('icons/highlight.svg')"
					:data-tooltip="$t('chat.message.highlightBt_tt')"
					:loading="clipHighlightLoading"
					@click.stop="clipHighlight()"
				/>
			</div>
		</div>
	</div>

</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import StoreProxy from '@/store/StoreProxy';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import type { JsonObject } from 'type-fest';
import type { StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatMessageInfoBadges from './components/ChatMessageInfoBadges.vue';
import ChatModTools from './components/ChatModTools.vue';

@Options({
	components:{
		Button,
		ChatModTools,
		ChatMessageInfoBadges,
	},
	props:{
		messageData:Object,
		lightMode:{type:Boolean, default:false},
		disableConversation:{type:Boolean, default:false},
		highlightedWords:{type:Array, default:[]},
	},
	emits:['showConversation', 'showUserMessages', 'onOverMessage', 'onRead'],
})
export default class ChatMessage extends Vue {
 
	public messageData!:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData;
	public lightMode!:boolean;
	public disableConversation!:boolean;
	public highlightedWords!:string[];
	public channelInfo!:TwitchatDataTypes.UserChannelInfo;
	
	public text = "";
	public recipient:TwitchatDataTypes.TwitchatUser|null = null;
	public firstTime:boolean = false;
	public showTools:boolean = false;
	public automodReasons = "";
	public badges:TwitchatDataTypes.TwitchatUserBadge[] = [];
	public clipInfo:TwitchDataTypes.ClipInfo|null = null;
	public clipHighlightLoading:boolean = false;
	public infoBadges:TwitchatDataTypes.MessageBadgeData[] = [];
	public isAnnouncement:boolean = false;
	public isPresentation:boolean = false;
	public isReturning:boolean = false;
	public automodInProgress:boolean = false;
	public userBannedOnChannels:string = "";

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
		const highlightMods			= sParams.appearance.highlightMods.value === true;
		const highlightVips			= sParams.appearance.highlightVips.value === true;
		const highlightSubs			= sParams.appearance.highlightSubs.value === true;
		const highlightPartners		= sParams.appearance.highlightPartners.value === true;
		const spoilersEnabled		= sParams.features.spoilersEnabled.value === true;
		const censorDeletedMessages	= sParams.appearance.censorDeletedMessages.value === true;

		if(this.automodReasons)					res.push("automod");
		if(this.channelInfo.is_blocked)			res.push("blockedUser");
		if(this.disableConversation !== false)	res.push("disableConversation");
		if(!this.lightMode && message.cyphered)	res.push("cyphered");
		if(!this.lightMode && this.messageData.user.is_tracked)	res.push("tracked");

		if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			if(message.deleted)	{
				res.push("deleted");
				if(censorDeletedMessages) res.push("censor");
			}
			if(!this.lightMode) {
				if(this.channelInfo.is_moderator
				&& !this.channelInfo.is_broadcaster && highlightMods)			res.push("highlightMods");
				else if(this.channelInfo.is_vip && highlightVips)				res.push("highlightVips");
				else if(this.messageData.user.is_partner && highlightPartners)	res.push("highlightPartners");
				else if(this.channelInfo.is_subscriber && 
				!this.channelInfo.is_broadcaster && highlightSubs)				res.push("highlightSubs");
			}
			if(spoilersEnabled && this.messageData.spoiler === true)			res.push("spoiler");
		}

		return res;
	}

	public get showModTools():boolean {
		return this.showModToolsPreCalc
		&& this.$store("params").features.showModTools.value === true;
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
	public getLoginStyles(user:TwitchatDataTypes.TwitchatUser):StyleValue {
		let color = 0xb454ff;
		if(user.color) {
			color = parseInt(user.color.replace("#", ""), 16);
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

		const mess			= this.messageData;
		const infoBadges:TwitchatDataTypes.MessageBadgeData[] = [];
		let highlightedWords:string[] = this.highlightedWords.concat();

		if(mess.cyphered) infoBadges.push({type:"cyphered"});

		if(mess.user.is_raider) {
			infoBadges.push({type:"raider"});
			//Remove badges from the list if user is unflaged from raider
			watch(()=> mess.user.is_raider, () =>{
				for (let i = 0; i < this.infoBadges.length; i++) {
					const b = this.infoBadges[i];
					if(b.type == "raider") {
						this.infoBadges.splice(i,1);
						break;
					}
				}
			});
		}
	
		//Define message badges (these are different from user badges!)
		if(mess.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			infoBadges.push({type:"whisper"});
			
		}else if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE){
			this.firstTime = mess.twitch_isFirstMessage === true;
			//Add twitchat's automod badge
			if(mess.automod) {
				infoBadges.push({type:"automod", tooltip:"<strong>"+this.$t("chat.message.automod_rule")+"</strong> "+mess.automod.label});
			}
			//Manage twitch automod content
			if(!this.lightMode && mess.twitch_automod) {
				this.automodReasons = mess.twitch_automod.reasons.join(", ");
				highlightedWords = highlightedWords.concat(mess.twitch_automod.words);
			}

			//Precompute static flag
			this.showModToolsPreCalc = !this.lightMode
									&& this.messageData.user.id != StoreProxy.auth.twitch.user.id//if not broadcaster
									&& StoreProxy.auth.twitch.user.channelInfo[this.messageData.channel_id].is_moderator;//If mod
			this.isAnnouncement	= this.messageData.twitch_announcementColor != undefined;
			this.isPresentation	= this.messageData.twitch_isPresentation === true;
			this.isReturning	= this.messageData.twitch_isReturning === true;
			watch(()=> mess.twitch_isSuspicious, () =>{
				this.updateSuspiciousState();
			});
			watch(()=> mess.is_pinned, () =>{
				this.updatePinnedState();
			});
			if(mess.twitch_isRestricted) {
				infoBadges.push({type:"restrictedUser"});
			}
		}

		//Pre compute some classes to reduce watchers count on "classes" getter

		const staticClasses = ["chatmessage"];
		if(this.firstTime || this.isPresentation || this.isReturning)	staticClasses.push("hasHeader");
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			staticClasses.push("whisper");
		}else {
			if(this.messageData.twitch_isSlashMe)		staticClasses.push("slashMe");
			if(this.messageData.twitch_isHighlighted)	staticClasses.push("highlighted");
			if(this.messageData.type == "message"
			&& this.messageData.hasMention)	{
				staticClasses.push("mention");
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
			//Do it asynchronously blocking rendering
			(async()=> {
				let clip = await TwitchUtils.getClipById(clipId);
				if(clip) {
					this.clipInfo = clip;
				}
			})();
		}
		

		let txt = this.messageData.message_html;
		if(this.$store("params").appearance.showEmotes.value !== true) {
			txt = this.messageData.message;
		}
		
		if(txt.indexOf("<a") > -1) {
			//Add copy butotn next to links
			const button = "<img src='"+this.$image('icons/copy_alert.svg')+"' class='copyBt' data-copy=\"https://$2\" data-tooltip='"+this.$t("global.copy")+"'>";
			txt = txt.replace(/(<a .*?>)(.*?)(<\/a>)/gi, button+"$1$2$3");
		}
		
		if(highlightedWords.length > 0) {
			for (let i = 0; i < highlightedWords.length; i++) {
				let word = highlightedWords[i];
				word = word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
				txt = txt.replace(new RegExp("("+word+")(?!([^<]+)?>)", "gim"), "<span class='highlightedWord'>$1</span>");
			}
		}

		watch(()=>this.messageData.occurrenceCount, async ()=>{
			await this.$nextTick();
			gsap.fromTo(this.$refs.occurrenceCount as HTMLDivElement, {scale:1.5}, {scale:1, duration:0.2});
		});

		this.text = txt;
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
	 * Copy JSON data of the message
	 */
	public copyJSON():void {
		if(this.messageData.type == "whisper") {
			Utils.copyToClipboard(JSON.stringify(this.messageData));
			console.log(this.messageData);
		}else{
			const answersBckp = this.messageData.answers;
			const answerToBckp = this.messageData.answersTo;
			this.messageData.answers = [];
			this.messageData.answersTo = undefined;
			Utils.copyToClipboard(JSON.stringify(this.messageData));
			console.log(this.messageData);
			this.messageData.answers = answersBckp;
			this.messageData.answersTo = answerToBckp;
		}
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
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
				mp4:this.clipInfo!.thumbnail_url.replace(/-preview.*\.jpg/gi, ".mp4"),
				duration:this.clipInfo!.duration,
			},
			params:this.$store("chat").chatHighlightOverlayParams,
		}
		PublicAPI.instance.broadcast(TwitchatEvent.SHOW_CLIP, (data as unknown) as JsonObject);
		this.$store("chat").isChatMessageHighlighted = true;
		await Utils.promisedTimeout(2000);
		this.clipHighlightLoading = false;
	}

	public onMouseLeave():void{
		this.showTools = false;
		this.$emit('onMouseOut', this.messageData)
	}
	
	public onMouseEnter():void{
		this.showTools = true;
	}
	
	private updateSuspiciousState():void{
		if(this.messageData.type === TwitchatDataTypes.TwitchatMessageType.WHISPER) return;
		
		if(this.messageData.twitch_isSuspicious
		&& this.infoBadges.findIndex(v=> v.type == "suspiciousUser") == -1) {
			this.infoBadges.push({type:"suspiciousUser"});
		}
		
		if(this.messageData.twitch_isRestricted
		&& this.infoBadges.findIndex(v=> v.type == "restrictedUser") == -1) {
			this.infoBadges.push({type:"restrictedUser"});
		}
		
		let users = (this.messageData.twitch_sharedBanChannels?.map(v=>v.login) ?? []);
		if(users.length > 0) {
			this.userBannedOnChannels = users.join(", ").replace(/(.*),/, "$1 and");
		}
	}
	
	private updatePinnedState():void{
		const m = this.messageData as TwitchatDataTypes.MessageChatData;
		const badgeIndex = this.infoBadges.findIndex(v=> v.type == "pinned");

		if(m.is_pinned) {
			if(badgeIndex == -1) {
				this.infoBadges.push({type:"pinned"});
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
.chatmessage{
	.chatMessage();

	&.highlightSubs { background-color: @highlight_subs; }
	&.highlightVips { background-color: @highlight_vips; }
	&.highlightMods { background-color: @highlight_mods; }
	&.highlightPartners { background-color: @highlight_partners; }
	&.mention { background-color: @highlight_mention; }
	
	&.highlighted { 
		.message {
			background-color: @mainColor_normal;
			color:#fff;
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
		border-radius: .25em;
		background-color: fade(@mainColor_light, 20%);
		border: 0 solid rgba(255, 255, 255, 1);
		border-left-width: .75em;
		padding-left: .3em;
		.message {
			color: #fff;
		}
		&:hover {
			>.infos {
				background-color: @mainColor_dark;
				.login:hover {
					background-color: @mainColor_dark;
				}
			}
		}
	}

	&.spoiler {
		.message {
			color: rgba(0, 0, 0, 0);
			background-color: @mainColor_dark_light;
			background-image: repeating-linear-gradient(-45deg, #ffffff10, #ffffff10 7px, #ffffff30 7px, #ffffff30 15px);
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

	>.infos {
		display: inline;
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
			display: inline;
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

		.occurrenceCount {
			display: inline-block;
			background: @mainColor_warn;
			padding: .2em .4em;
			margin-right: .25em;
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
			margin-right: .25em;
			vertical-align: middle;
		}
	}

	.sharedBan {
		color: @mainColor_alert;
		font-weight: bold;
		margin-right: .25em;
	}

	.message {
		// position: relative;
		word-break: break-word;
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
			max-width: min(50%, 200px);
		}

		.infos {
			padding: 0 .5em;
			min-width: 150px;
			.title {
				font-weight: bold;
				margin-bottom: .25em;
			}
			.subtitle {
				font-size: .8em;
				color: fade(@mainColor_light, 70%);
			}
			.highlightBt {
				font-size: 1.25em;
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

	&.hasHeader {
		color: #fff;
		background-color: rgba(255, 255, 255, .15);
		border-radius: .25em;
		margin: .25em 0;
		padding-top: 0;
		.header {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			.icon {
				height: 1.2em;
				margin: .25em;
			}
		}
	}

	&.automod {
		margin-top: .25em;
		border-radius: .25em;
		padding-top: 0;
		background-color: fade(@mainColor_alert, 50%);

		.automod {
			background-color: fade(#fff, 90%);
			padding: .25em;
			border-top-left-radius: .5em;
			border-top-right-radius: .5em;
			margin-bottom: 10px;
			display: flex;
			flex-direction: row;
			align-items: center;

			img {
				height: 1.25em;
				margin-right: .5em;
			}

			.header {
				color: @mainColor_dark;
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
	}

	&.cyphered {
		background-image: repeating-linear-gradient(-45deg, #ffffff10, #ffffff10 20px, #ffffff30 20px, #ffffff30 40px);
	}
	
	&.whisper, &.cyphered {
		background-color: @mainColor_highlight;
		// border: 1px dashed @mainColor_light;
		@c1: rgba(0,0,0,.8);
		@c2: rgba(0,0,0,.85);
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
			background-color: rgba(255, 255, 255, .1);
			width: calc(100% + .5em);
			margin-left: -.25em;

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

		padding: 0 .25em;
	}
}
</style>