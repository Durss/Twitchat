<template>
	<div :class="classes" @click.ctrl.stop.capture="copyJSON()">
		<div v-if="firstTime" class="header">
			<img src="@/assets/icons/firstTime.svg" alt="new" class="icon">
			<p>First time on your channel</p>
		</div>

		<div v-if="isPresentation" class="header">
			<img src="@/assets/icons/presentation.svg" alt="new" class="icon">
			<p>Welcome on this channel <strong>{{messageData.tags["display-name"]}}</strong></p>
		</div>

		<div v-if="isReturning" class="header">
			<img src="@/assets/icons/returning.svg" alt="new" class="icon">
			<p><strong>{{messageData.tags["display-name"]}}</strong> is returning after chatting twice the last 30 days</p>
		</div>

		<div v-if="automod" class="automod">
			<img src="@/assets/icons/automod.svg">
			<div class="header"><strong>Automod</strong> : {{automodReasons}}</div>
			<div class="actions">
				<Button aria-label="Accept automoeded message" title="Accept" @click.stop="modMessage(true)" />
				<Button aria-label="Reject automoeded message" title="Reject" @click.stop="modMessage(false)" highlight />
			</div>
		</div>
		
		<div v-if="messageData.type == 'message' && messageData.lowTrust" class="lowTrust">
			<img src="@/assets/icons/shield.svg">
			<div class="header"><strong>Suspicious user</strong></div>
		</div>
		
		<div v-if="isAnnouncement" class="announcementHolder">
			<img src="@/assets/icons/announcement.svg">
			<div class="header"><strong>Announcement</strong></div>
		</div>

		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>

		<div class="infos" v-if="messageData.blockedUser !== true">
			<!-- <img v-if="messageData.type == 'whisper'" class="icon" src="@/assets/icons/whispers.svg" data-tooltip="Whisper"> -->
			<img v-if="!disableConversation && isConversation && $store('params').features.conversationsEnabled.value && !lightMode"
				class="icon convBt"
				src="@/assets/icons/conversation.svg"
				alt="conversation"
				@mouseleave="$emit('mouseleave', $event)"
				@click.stop="$emit('showConversation', $event, messageData)">
			
			<ChatModTools :messageData="messageData" class="mod" v-if="showModTools && !lightMode" :canDelete="messageData.type != 'whisper'" />

			<ChatMessageInfos class="infoBadges" :infos="infoBadges" />
			
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
				v-if="messageData.occurrenceCount != undefined && messageData.occurrenceCount > 0">x{{messageData.occurrenceCount+1}}</div>
			
			<span class="pronoun"
				:data-tooltip="pronounLabel"
				v-if="pronoun && $store('params').features.showUserPronouns.value===true">{{pronoun}}</span>
			
			<span @click.stop="openUserCard()"
				@mouseenter="hoverNickName($event)"
				@mouseleave="$emit('mouseleave', $event)"
				class="login" :style="loginStyles">{{messageData.tags["display-name"]}}<i class="translation" v-if="translateUsername"> ({{messageData.tags["username"]}})</i></span>

			<span @click.stop="openUserCard(recipient)"
				class="login" v-if="recipient"> &gt; {{recipient}}</span>
		</div>
		
		<span v-if="messageData.blockedUser !== true">: </span>
		<span class="message" v-if="messageData.blockedUser !== true">
			<span class="text" v-html="text" @click="clickMessage"></span>
			<span class="deleted" v-if="deletedMessage">{{deletedMessage}}</span>
		</span>

		<div v-if="messageData.blockedUser === true" class="blockedMessage" @click.stop="messageData.blockedUser = false">This message has been sent by a blocked user. Click to reveal.</div>
		
		<br v-if="clipInfo && messageData.blockedUser !== true">
		<div v-if="clipInfo && messageData.blockedUser !== true" class="clip" @click.stop="openClip()">
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
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import type { TrackedUser } from '@/utils/CommonDataTypes';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import type { PubSubDataTypes } from '@/utils/PubSubDataTypes';
import TwitchatEvent from '@/utils/TwitchatEvent';
import TwitchUtils from '@/utils/TwitchUtils';
import UserSession from '@/utils/UserSession';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import type { JsonObject } from 'type-fest';
import type { StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatMessageInfos from './ChatMessageInfos.vue';
import ChatModTools from './ChatModTools.vue';

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

	public messageData!:IRCEventDataList.Message|IRCEventDataList.Whisper;
	public lightMode!:boolean;
	public disableConversation!:boolean;
	public enableWordHighlight!:boolean;
	
	public text = "";
	public recipient = "";
	public firstTime = false;
	public automod:PubSubDataTypes.AutomodData | null = null;
	public automodReasons = "";
	public badges:TwitchDataTypes.Badge[] = [];
	public clipInfo:TwitchDataTypes.ClipInfo|null = null;
	public clipHighlightLoading:boolean = false;
	public infoBadges:TwitchatDataTypes.ChatMessageInfoData[] = [];

	public get pronoun():string|null {
		const key = this.$store("users").pronouns[this.messageData.tags['user-id'] as string];
		if(!key || typeof key != "string") return null;
		const hashmap:{[key:string]:string} = {
			// https://pronouns.alejo.io
			"aeaer" : "Ae/Aer",
			"any" : "Any",
			"eem" : "E/Em",
			"faefaer" : "Fae/Faer",
			"hehim" : "He/Him",
			"heshe" : "He/She",
			"hethem" : "He/They",
			"itits" : "It/Its",
			"other" : "Other",
			"perper" : "Per/Per",
			"sheher" : "She/Her",
			"shethem" : "She/They",
			"theythem" : "They/Them",
			"vever" : "Ve/Ver",
			"xexem" : "Xe/Xem",
			"ziehir" : "Zie/Hir",
			// https://pronoundb.org
			"hh": "he/him",
			"hi": "he/it",
			"hs": "he/she",
			"ih": "it/him",
			"ii": "it/its",
			"is": "it/she",
			"shh": "she/he",
			"sh": "she/her",
			"si": "she/it",
			"st": "she/they",
			"th": "they/he",
			"ti": "they/it",
			"ts": "they/she",
			"tt": "they/them",
		};
		const res = hashmap[key];
		return res? res : key;
	}

	/**
	* Get users' pronouns
	*/
	public get pronounLabel(): string | null {
		const key = this.$store("users").pronouns[this.messageData.tags['user-id'] as string];
		if(!key || typeof key != "string") return null;

		const hashmap: {[key: string]: string} = {
			// https://pronoundb.org
			"any": "Any pronouns",
			"other": "Other pronouns",
			"ask": "Ask me my pronouns",
			"avoid": "Avoid pronouns, use my name",
		};

		return hashmap[key];
	}

	public get isAnnouncement():boolean {
		const message = this.messageData as IRCEventDataList.Message;
		return message.tags["msg-id"] == "announcement";
	}

	public get isPresentation():boolean {
		const message = this.messageData as IRCEventDataList.Message;
		return message.tags["msg-id"] == "user-intro";
	}

	public get isReturning():boolean {
		const message = this.messageData as IRCEventDataList.Message;
		return message.tags["returning-chatter"] == true;
	}
	
	public get showNofollow():boolean{
		if(this.$store("params").appearance.highlightNonFollowers.value === true) {
			const uid = this.messageData.tags['user-id'] as string;
			if(uid && this.$store("users").followingStates[uid] === false) return true;
		}
		return false
	}

	/**
	* Get replacement text if message has been deleted
	*/
	public get deletedMessage():string {
		if(this.messageData.type != "message") return "";

		const censor = (this.$store("params").filters.censorDeletedMessages.value===true)
		if(this.messageData.deletedData) {
			return censor ? "<deleted by "+this.messageData.deletedData.created_by+">" : "";
		}else if(this.messageData.deleted){
			return censor ? "<message deleted>" : "";
		}
		return "";
	}

	public get classes():string[] {
		let res = ["chatmessage"];
		const message = this.messageData;

		if(this.messageData.blockedUser) res.push("blockedUser");
		if(this.automod) res.push("automod");
		if(this.firstTime || this.isPresentation || this.isReturning) res.push("firstTimeOnChannel");
		if(message.type == "whisper") {
			res.push("whisper");
		}else{
			if(message.deleted) {
				res.push("deleted");
				if(this.$store("params").filters.censorDeletedMessages.value===true) res.push("censor");
			}
			if(message.lowTrust) res.push("lowTrust");
			if(message.cyphered) res.push("cyphered");
		}
		if(this.showNofollow) res.push("noFollow");
		if(message.tags['message-type'] == "action") res.push("slashMe");
		if(message.tags["msg-id"] === "highlighted-message") res.push("highlighted");
		if((this.$store("users").trackedUsers as TrackedUser[]).findIndex(v=>v.user['user-id'] == message.tags["user-id"]) != -1
		&& !this.lightMode) res.push("tracked");
		if(this.isAnnouncement) {
			const color = message.tags["msg-param-color"]? message.tags["msg-param-color"].toLowerCase() : "primary";
			res.push("announcement", color);
		}
		
		if(this.$store("params").features.spoilersEnabled.value === true) {
			let text = this.messageData.type == "whisper"? this.messageData.params[1] : this.messageData.message;
			if(text.indexOf("||") == 0) res.push("spoiler");
		}

		if(!this.lightMode) {
			if(message.type == "message" && message.hasMention) res.push("mention");
			
			//Set highlight
			if(message.tags.mod && this.$store("params").appearance.highlightMods.value) res.push("highlightMods");
			else if(message.tags.badges?.vip && this.$store("params").appearance.highlightVips.value) res.push("highlightVips");
			else if(message.tags.subscriber && this.$store("params").appearance.highlightSubs.value) res.push("highlightSubs");
		}

		return res;
	}

	public get showModTools():boolean {
		if(this.lightMode) return false;
		if(this.$store("params").features.showModTools.value === false) return false;
		const message = this.messageData as IRCEventDataList.Message;
		return (this.$store("users").mods as TwitchDataTypes.ModeratorUser[]).findIndex(v=> v.user_id == message.tags['user-id']) > -1
			||
		(
			message.channel.replace(/^#/gi, "").toLowerCase() == UserSession.instance.authToken.login.toLowerCase()//TODO set actual channel id not the user id
			&& message.tags.username?.toLowerCase() != UserSession.instance.authToken.login.toLowerCase()
		);
	}

	public get time():string {
		const message = this.messageData as IRCEventDataList.Message;
		const d = new Date(parseInt(message.tags['tmi-sent-ts'] as string));
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	/**
	 * Is this message part of a conversation?
	 */
	public get isConversation():boolean {
		if(this.messageData.type == "whisper") return false;
		return this.messageData.answers != undefined || this.messageData.answerTo != undefined;
	}

	/**
	 * Returns the login instead of the display name if the display name contains
	 * mostly non-latin chars
	 */
	public get translateUsername():boolean {
		if(this.$store("params").appearance.translateNames.value !== true) return false;

		const dname = (this.messageData.tags['display-name'] as string).toLowerCase();
		const uname = (this.messageData.tags['username'] as string).toLowerCase();
		//If display name is different from username and at least half of the
		//display name's chars ar not latin chars, translate it
		return dname != uname && dname.replace(/^[^a-zA-Z0-9]*/gi, "").length < dname.length/2;
	}
	
	/**
	 * Set login color
	 */
	public get loginStyles():StyleValue {
		const message = this.messageData as IRCEventDataList.Message;
		let color = 0xb454ff;
		if(message.tags.color) {
			color = parseInt(message.tags.color.replace("#", ""), 16);
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
	public get filteredBadges():TwitchDataTypes.Badge[] {
		let res:TwitchDataTypes.Badge[] = [];
		if(this.$store("params").appearance.showBadges.value
		&& !this.$store("params").appearance.minimalistBadges.value) {
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
		if(this.$store("params").appearance.showBadges.value
		&& this.$store("params").appearance.minimalistBadges.value
		&& message.tags.badges) {
			if(message.tags.badges.predictions) {
				const label = message.tags["badge-info"]? message.tags["badge-info"].predictions as string : "Prediction";
				if(message.tags.badges.predictions.indexOf("pink") > -1) badges.push({label, class:"prediction pink"});
				if(message.tags.badges.predictions.indexOf("blue") > -1) badges.push({label, class:"prediction blue"});
			}
			if(message.tags.badges.vip) badges.push({label:"VIP", class:"vip"});
			if(message.tags.badges.subscriber && !message.tags.badges?.broadcaster) badges.push({label:"Sub", class:"subscriber"});
			if(message.tags.badges.premium) badges.push({label:"Prime", class:"premium"});
			if(message.tags.badges.moderator) badges.push({label:"Moderator", class:"moderator"});
			if(message.tags.badges.staff) badges.push({label:"Twitch staff", class:"staff"});
			if(message.tags.badges.broadcaster) badges.push({label:"Broadcaster", class:"broadcaster"});
			if(message.tags.badges.partner) badges.push({label:"Partner", class:"partner"});
			if(message.tags.badges.founder) badges.push({label:"Founder", class:"founder"});
			if(message.tags.badges.ambassador) badges.push({label:"Ambassador", class:"ambassador"});
		}
		return badges;
	}

	/**
	 * Open a users' card
	 */
	public openUserCard(username?:string):void {
		const message = this.messageData as IRCEventDataList.Message;
		this.$store("users").openUserCard(username ?? message.tags.username as string);
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
			const answerToBckp = this.messageData.answerTo;
			this.messageData.answers = undefined;
			this.messageData.answerTo = undefined;
			Utils.copyToClipboard(JSON.stringify(this.messageData));
			console.log(this.messageData);
			this.messageData.answers = answersBckp;
			this.messageData.answerTo = answerToBckp;
		}
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

	/**
	 * Called when component is mounted
	 */
	public mounted():void {
		const mess = this.messageData as IRCEventDataList.Message;
		
		/* eslint-disable-next-line */
		this.firstTime = mess.tags['first-msg'] === true && !this.isPresentation;

		//Add twitchat's automod badge
		if(mess.ttAutomod) {
			this.infoBadges.push({type:"automod", tooltip:"<strong>Rule:</strong> "+mess.ttAutomod.label});
		}

		//Add whisper badge
		if(this.messageData.type == 'whisper') {
			this.infoBadges.push({type:"whisper"});
		}

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
					case "dating_and_sexting":
						textReasons.push("sexual content");
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

		let clipId = "";
		let text = this.messageData.type == "whisper"? this.messageData.params[1] : this.messageData.message;
		if(this.messageData.type == "whisper"
		&& this.messageData.tags['user-id'] == UserSession.instance.twitchUser!.id) {
			this.recipient = this.messageData.params[0];
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
			})()
		}

		this.text = this.parseText(text);
		this.$emit("ariaMessage", this.text);

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
			this.$store("main").alert = "Woops... something went wrong :(...";
		}else {
			//Delete the message.
			//If the message was allowed, twitch will send it back, no need to keep it.
			this.$store("chat").delChatMessage(message.tags.id as string);
		}
	}

	/**
	 * Gets text message with parsed emotes
	 */
	public parseText(text:string):string {
		let result:string;
		const doHighlight = this.$store("params").appearance.highlightMentions.value;
		const highlightLogin = UserSession.instance.authToken.login;
		const mess = this.messageData;
		if(!text) return "";
		try {
			let removeEmotes = !this.$store("params").appearance.showEmotes.value;
			if((mess as IRCEventDataList.Message).automod) {
				result = text;
				result = result.replace(/</g, "&lt;").replace(/>/g, "&gt;");//Avoid XSS attack
				result = result.replace(/&lt;(\/)?mark&gt;/gi, "<$1mark>");//Reset <mark> tags used to highlight banned words on automod messages
			}else{
				//Allow custom parsing of emotes only if it's a message of ours sent
				//from current IRC client
				const customParsing = mess.sentLocally;
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
							v.value = v.value.replace(new RegExp("(^| |@)("+highlightLogin+")( |$)", "gim"), "$1<span class='highlightedWord'>$2</span>$3");
						}
						result += Utils.parseURLs(v.value);
					}else if(v.type == "emote") {
						let url = v.value.replace(/1.0$/gi, "3.0");//Twitch format
						url = url.replace(/1x$/gi, "3x");//BTTV format
						url = url.replace(/2x$/gi, "3x");//7TV format
						url = url.replace(/1$/gi, "4");//FFZ format
						
						if(this.$store("params").appearance.defaultSize.value as number >= 6) {
							v.value = v.value.replace(/1.0$/gi, "3.0");
							v.value = v.value.replace(/1x$/gi, "4x");//BTTV format
							v.value = v.value.replace(/2x$/gi, "4x");//7TV format
							v.value = v.value.replace(/1$/gi, "4");//FFZ format
						}else
						if(this.$store("params").appearance.defaultSize.value as number >= 3) {
							v.value = v.value.replace(/1.0$/gi, "2.0");
							v.value = v.value.replace(/1x$/gi, "2x");//BTTV format
							v.value = v.value.replace(/1$/gi, "2");//FFZ format
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

		const button = "<img src='"+this.$image('icons/copy_alert.svg')+"' class='copyBt' data-copy=\"https://$2\" data-tooltip='Copy'>";
		result = result.replace(/(<a .*?>)(.*?)(<\/a>)/gi, button+"$1$2$3");
		
		return result;
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
		const data = {
			clip:this.clipInfo,
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
	@padding: .25em;
	padding: @padding;
	margin-bottom: 1px;

	&.highlightSubs { background-color: fade(#9147ff, 7%); }
	&.highlightVips { background-color: fade(#e00bb9, 7%); }
	&.highlightMods { background-color: fade(#39db00, 7%); }
	&.highlighted { 
		.message {
			padding: 0 @padding;
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