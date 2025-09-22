<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event, messageData, $el)"
	@mouseover="$emit('onOverMessage', messageData, $event)"
	>
		<div class="gradientBg" v-if="messageData.type=='message' && messageData.twitch_animationId == 'rainbow-eclipse'"></div>
		<div class="noiseBg" v-if="messageData.type=='message' && messageData.twitch_animationId == 'cosmic-abyss'">
			<img src="@/assets/img/chat_animation/cosmic-abyss_1.jpg" alt="cosmic abyss background 1">
			<img src="@/assets/img/chat_animation/cosmic-abyss_2.jpg" alt="cosmic abyss background 2">
		</div>

		<div v-if="automodReasons" class="automod">
			<Icon name="automod" theme="light" />
			<div class="header"><strong>{{ $t('chat.message.automod') }}</strong> {{automodReasons}}</div>
			<div class="actions">
				<TTButton :aria-label="$t('chat.message.automod_acceptBt_aria')"
					v-tooltip="$t('chat.message.automod_acceptBt_aria')"
					icon="checkmark"
					light
					@click.stop="modMessage(true)"
					:loading="automodInProgress" />

				<TTButton :aria-label="$t('chat.message.automod_rejectBt_aria')"
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

		<template v-if="messageData.user.is_blocked !== true || messageData.user.stop_block_censor === true">

			<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

			<ChatModTools :messageData="messageData" class="mod" v-if="showModTools" :canDelete="messageData.type != 'whisper'" />

			<Icon name="youtube" v-if="messageData.platform == 'youtube'" v-tooltip="$t('chat.youtube.platform_youtube')" />
			<Icon name="tiktok" v-if="messageData.platform == 'tiktok'" v-tooltip="$t('chat.tiktok.platform_tiktok')" />

			<Icon v-if="!disableConversation && isConversation && $store.params.features.conversationsEnabled.value && !lightMode"
				class="icon convBt"
				name="conversation"
				@click.stop="$emit('showConversation', messageData)" />

			<TTButton class="noAutospoilBt" v-if="messageData.type == 'message' && messageData.autospoiled === true"
			@click.stop="stopAutoSpoil()" alert small icon="show" v-tooltip="$t('chat.message.stop_autospoil')" />

			<ChatMessageInfoBadges class="infoBadges" :infos="infoBadges" v-if="infoBadges.length > 0" />

			<div class="userBadges" v-if="filteredBadges.length > 0 || miniBadges.length > 0">
				<tooltip v-for="(b,index) in filteredBadges" :key="index"
				:content="'<div style=\'text-align:center\'><img src='+(b.icon.hd || b.icon.sd)+' width=\'64\' class=\'emote\'><br>'+b.title+'</div>'">
					<Icon v-if="b.icon.sd.indexOf('http') == -1" :name="b.icon.sd" class="badge" />
					<img v-else :src="b.icon.sd" class="badge">
				</tooltip>

				<span class="badge mini" v-for="(b,index) in miniBadges"
					:key="index"
					:class="b.class"
					v-tooltip="b.label"></span>
			</div>

			<CustomUserBadges :user="messageData.user" />

			<Icon class="noFollowBadge" v-if="showNofollow"
				name="unfollow"
				:alt="$t('chat.message.no_follow')"
				v-tooltip="$t('chat.message.no_follow')" />

			<div class="occurrenceCount"
				ref="occurrenceCount"
				v-tooltip="$t('chat.message.occurrences')"
				v-if="messageData.occurrenceCount != undefined && messageData.occurrenceCount > 0">x{{messageData.occurrenceCount+1}}</div>

			<span class="pronoun"
				v-if="messageData.user.pronounsLabel && $store.params.features.showUserPronouns.value===true"
				v-tooltip="messageData.user.pronounsTooltip || ''">{{messageData.user.pronounsLabel}}</span>

			<span v-if="messageData.user.displayName != messageData.user.displayNameOriginal">.</span>

			<a :href="getProfilePage(messageData.user)" target="_blank"
				@click.stop.prevent="openUserCard(messageData.user, messageData.channel_id, messageData.platform)"
				@mouseenter="hoverNickName($event)"
				@mouseleave="outNickName($event)"
				data-login
				class="login" :style="getLoginStyles(messageData.user)">{{messageData.user.displayName}}<i class="translation" v-if="translateUsername"> ({{messageData.user.login}})</i></a>
			<template v-if="recipient">
				<span> ➔ </span>
				<a :href="getProfilePage(messageData.user)" target="_blank"
					class="login"
					:style="getLoginStyles(recipient)"
					@click.stop.prevent="openUserCard(recipient!, messageData.channel_id, messageData.platform)">{{recipient.displayName}}</a>
			</template>

			<span :class="getMessageClasses(messageData)">
				<span class="text">
					<ChatMessageChunksParser
					:forceSpoiler="messageData.type == 'message' && messageData.spoiler == true"
					:containsSpoiler="messageData.type == 'message' && messageData.containsSpoiler == true"
					:largeEmote="messageData.type == 'message'? messageData.twitch_gigantifiedEmote != undefined : false"
					:chunks="localMessageChunks"
					:channel="messageData.channel_id"
					:platform="messageData.platform" />
				</span>
				<span class="deleted" v-if="getDeletedMessage(messageData)">{{getDeletedMessage(messageData)}}</span>
				<MessageTranslation class="textTranslation" :messageData="messageData" />
			</span>

			<span :class="getChildMessageClasses(m)"
			v-if="childrenList"
			v-for="m in childrenList"
			:id="'message_' + m.id + '_' + colIndex"
			@contextmenu.capture="onContextMenu($event, m, $el)">
				<span class="text">
					<ChatMessageChunksParser
					:forceSpoiler="m.type == 'message' && m.spoiler == true"
					:containsSpoiler="m.type == 'message' && m.containsSpoiler == true"
					:largeEmote="m.type == 'message'? m.twitch_gigantifiedEmote != undefined : false"
					:chunks="m.message_chunks"
					:channel="m.channel_id"
					:platform="m.platform" />
				</span>
				<span class="deleted" v-if="getDeletedMessage(m)">{{getDeletedMessage(m)}}</span>
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
					<TTButton class="highlightBt"
						:aria-label="$t('chat.message.highlightBt_aria')"
						icon="highlight"
						v-tooltip="$t('chat.message.highlightBt_tt')"
						:loading="clipHighlightLoading"
						@click.stop="clipHighlight()"
					>{{ $t('chat.message.highlightBt_aria') }}</TTButton>
					<Icon v-if="clipInfo.broadcaster_id != $store.auth.twitch.user.id" class="alertIcon" name="alert" theme="alert" v-tooltip="{theme:'alert', content:$t('chat.message.highlightBt_alert_tt')}" />
					<TTButton v-else-if="requestClipDLPermission" @click="grantClipDLScope()" v-tooltip="$t('chat.message.clip_permission_tt')" secondary small icon="unlock">{{ $t('chat.message.clip_permission') }}</TTButton>
				</div>
			</div>
		</template>

		<span class="blockedMessage"
		v-if="messageData.user.is_blocked === true && !messageData.user.stop_block_censor"
		@click.stop="messageData.user.stop_block_censor = true">{{ $t("chat.message.blocked_user") }}</span>

		<div class="ctas" v-if="isAd">
			<TTButton @click="disableAd()" alert icon="cross">{{ $t('chat.message.disable_ad') }}</TTButton>
			<TTButton @click="openAdParams()" icon="edit">{{ $t('chat.message.customize_ad') }}</TTButton>
		</div>
	</div>

</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from '@vue/runtime-core';
import { gsap } from 'gsap/gsap-core';
import type { JsonObject } from 'type-fest';
import type { CSSProperties } from 'vue';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import CustomUserBadges from '../user/CustomUserBadges.vue';
import AbstractChatMessage from './AbstractChatMessage';
import MessageTranslation from './MessageTranslation.vue';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';
import ChatMessageInfoBadges from './components/ChatMessageInfoBadges.vue';
import ChatModTools from './components/ChatModTools.vue';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';

@Component({
	components:{
		TTButton,
		ChatModTools,
		CustomUserBadges,
		MessageTranslation,
		ChatMessageInfoBadges,
		ChatMessageChunksParser,
	},
	emits:['showConversation', 'showUserMessages', 'unscheduleMessageOpen', 'onOverMessage', 'onRead'],
})
class ChatMessage extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData;

	@Prop
	declare childrenList:(TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData)[];

	@Prop({type:Boolean, default:false})
	declare lightMode:boolean;

	@Prop({type:Boolean, default:false})
	declare contextMenuOff:boolean;

	@Prop({type:Boolean, default:false})
	public disableConversation!:boolean;

	@Prop({type:Array, default:[]})
	public highlightedWords!:string[];

	@Prop({type:Number, default:0})
	public colIndex!:number;

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
	public localMessageChunks:TwitchatDataTypes.ParseMessageChunk[] = [];
	public requestClipDLPermission:boolean = false;

	private staticClasses:string[] = [];
	private showModToolsPreCalc:boolean = false;


	public get showNofollow():boolean{
		return this.$store.params.appearance.highlightNonFollowers.value === true
		&& this.channelInfo.is_following === false;
	}

	public get classes():string[] {
		const res					= this.staticClasses.concat();
		const message				= this.messageData;
		const censorDeletedMessages	= this.$store.params.appearance.censorDeletedMessages.value === true;

		if(censorDeletedMessages)				res.push("censor");
		if(this.hypeChat)						res.push("hypeChat");
		if(this.automodReasons)					res.push("automod");
		if(this.messageData.user.is_blocked)	res.push("blockedUser");
		if(this.disableConversation !== false)	res.push("disableConversation");
		if(!this.lightMode && message.cyphered)	res.push("cyphered");
		if(!this.lightMode && this.messageData.user.is_tracked)	res.push("tracked");

		if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			if(message.cleared)	res.push("cleared");
			if(message.deleted)	res.push("deleted");
			if(message.twitch_animationId)	res.push("animation_"+message.twitch_animationId);
			if(message.twitch_gigantifiedEmote)	res.push("gigantifiedEmote");
			if(this.childrenList && this.childrenList.length > 0)res.push("merged")
		}

		return res;
	}

	public get showModTools():boolean {
		return this.showModToolsPreCalc && this.$store.params.features.showModTools.value === true;
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
		if(this.$store.params.appearance.translateNames.value !== true) return false;

		const dname = this.messageData.user.displayNameOriginal.toLowerCase();
		const uname = this.messageData.user.login.toLowerCase();
		return dname != uname;
	}

	/**
	 * Get badges images
	 */
	public get filteredBadges():TwitchatDataTypes.TwitchatUserBadge[] {
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) return [];

		if(this.$store.params.appearance.showBadges.value
		&& this.$store.params.appearance.minimalistBadges.value !== true) {
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

		if(this.$store.params.appearance.showBadges.value === true
		&& this.$store.params.appearance.minimalistBadges.value === true
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

	/**
	* Get replacement text if message has been deleted
	*/
	public getDeletedMessage(message:TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData):string {
		if(message.type != "message") return "";

		const censor = (this.$store.params.appearance.censorDeletedMessages.value===true)
		if(message.deletedData) {
			return censor ? this.$t("chat.message.deleted_by", {USER:message.deletedData.deleter.displayName}) : "";
		}else if(message.deleted){
			return censor ? this.$t("chat.message.deleted") : "";
		}
		return "";
	}

	/**
	 * Get classes for the message holder
	 */
	public getMessageClasses(message:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData):string[] {
		const res:string[]		= ["message"];
		const spoilersEnabled	= this.$store.params.features.spoilersEnabled.value === true;

		if(message.deleted)	res.push("deleted");
		if(spoilersEnabled && message.spoiler === true) res.push("spoiler");

		return res;
	}

	/**
	 * Get classes for a child message
	 * @param message
	 */
	public getChildMessageClasses(message:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData):string[] {
		const res:string[] = ["messageChild"];
		const spoilersEnabled	= this.$store.params.features.spoilersEnabled.value === true;

		if(message.deleted) res.push("deleted");
		if(spoilersEnabled && message.spoiler) res.push("spoiler");
		return res;
	}

	/**
	 * Set login color
	 */
	public getLoginStyles(user:TwitchatDataTypes.TwitchatUser):CSSProperties {
		let res = {
			color: Utils.getUserColor(user),
		};
		return res;
	}

	public beforeUpdate() {
		// console.log("Update message", this.messageData.message);
	}

	public beforeMount() {
		super.beforeMount()
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

		//Creation date is loaded asynchronously, watch for it if requested
		if(this.$store.params.appearance.recentAccountUserBadge.value === true) {
			const setRecentBadge = (list:TwitchatDataTypes.MessageBadgeData[]) => {
				//Don't show the warning for ourself
				if(mess.user.id == this.$store.auth.twitch.user.id) return;

				const age = Date.now() - (mess.user.created_at_ms || 0);
				if(age < 14 * 24 * 60 * 60000) {
					let label = Utils.elapsedDuration(mess.user.created_at_ms || 0);
					list.push({type:TwitchatDataTypes.MessageBadgeDataType.NEW_ACCOUNT, label, tooltipLabelParams:{DURATION:label}});
				}
			}
			setRecentBadge(infoBadges);
			if(this.messageData.user.created_at_ms == undefined) {
				watch(()=>mess.user.created_at_ms, () => setRecentBadge(this.infoBadges))
			}
		}

		//Define message badges (these are different from user badges!)
		if(mess.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.WHISPER});
			this.showModToolsPreCalc = false;

		}else if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE){
			this.isAd = this.messageData.is_ad === true;
			//Add twitchat's automod badge
			if(mess.automod) {
				infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.AUTOMOD, tooltip:"<strong>"+this.$t("chat.message.automod_rule")+"</strong> "+mess.automod.label});
			}

			//Add "first day on your chat" badge
			if(this.channelInfo.is_new && !this.messageData.twitch_isFirstMessage
			&& this.$store.params.appearance.firstUserBadge.value === true) {
				infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.NEW_USER});
			}
			//Manage twitch automod content
			if(mess.twitch_automod) {
				this.automodReasons = mess.twitch_automod.reasons.join(", ");
				highlightedWords.push(...mess.twitch_automod.words);
			}
			//Manage twitch automod content
			if(mess.twitch_hypeChat) {
				this.hypeChat = mess.twitch_hypeChat;
			}

			//Precompute static flag
			this.showModToolsPreCalc = !this.lightMode
									&& this.canModerateMessage//if not sent by broadcaster
									&& this.canModerateUser_local;//If we're a mod or the broadcaster


			this.isAnnouncement	= this.messageData.twitch_announcementColor != undefined;

			watch(()=> mess.twitch_isSuspicious, () => this.updateSuspiciousState());
			watch(()=> mess.is_saved, () => this.updateSavedState());

			if(mess.twitch_isRestricted)				infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.RESTRICTED_USER});
			if(mess.twitch_isReturning === true)		infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.RETURNING_CHATTER});
			if((mess.twitch_watchStreak || 0) > 0)		infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.WATCH_STREAK, label:mess.twitch_watchStreak!.toString()});
			if(mess.twitch_isFirstMessage === true)		infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.FIRST_TIME_CHATTER});
			if(mess.twitch_gigantifiedEmote
			|| mess.twitch_animationId )				infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.POWER_UP});

			if(mess.todayFirst === true
			&& mess.twitch_isFirstMessage !== true
			// && mess.twitch_isPresentation !== true
			&& mess.twitch_isReturning !== true
			&& this.lightMode === false) infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.FIRST_MESSAGE_TODAY});

			if(mess.twitch_hypeChat) {
				let currency = {EUR:"€",USD:"$", GBP:"£"}[mess.twitch_hypeChat.currency] || mess.twitch_hypeChat.currency;
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
				highlightedWords.push(...(StoreProxy.params.appearance.highlightMentions_custom.value as string[] || []));
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
		}else
		if(/clips\.twitch\.tv\//gi.test(text)) {
			const matches = text.match(/clips\.twitch\.[^/]{2,10}\/([^/?\s\\"<']+)/i);
			clipId = matches? matches[1] : "";
		}

		if(clipId != "") {
			this.clipHighlightLoading = true;
			super.getHighlightOverPresence().then(res => {
				this.highlightOverlayAvailable = res;
				this.clipHighlightLoading = false;
			});
			//Do it asynchronously to avoid blocking rendering
			(async()=> {
				let clip = await TwitchUtils.getClipById(clipId, 5);
				if(clip) {
					this.clipInfo = clip;
					if(clip.broadcaster_id == this.$store.auth.twitch.user.id && !TwitchUtils.hasScopes([TwitchScopes.MANAGE_CLIPS])) {
						this.requestClipDLPermission = true;
					}
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
		this.$store.accessibility.setAriaPolite(this.messageData.message);
		this.updateSuspiciousState();
	}

	/**
	 * Called when rolling over the nick name
	 */
	public hoverNickName(event:MouseEvent):void {
		if(this.messageData.type == "whisper") return;
		if(this.$store.params.features.userHistoryEnabled.value) {
			this.$emit('showUserMessages', this.messageData);
		}
	}

	/**
	 * Called when rolling out the nick name
	 */
	public outNickName(event:MouseEvent):void {
		if(this.messageData.type == "whisper") return;
		if(this.$store.params.features.userHistoryEnabled.value) {
			this.$emit('unscheduleMessageOpen', this.messageData);
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
		this.$store.chat.automodAction(accept, this.messageData);
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
			this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "chathighlight");
			return;
		}

		this.clipHighlightLoading = true;
		const data:TwitchatDataTypes.ChatHighlightInfo = {
			date:this.messageData.date,
			message_id:this.messageData.id,
			clip:{
				url:this.clipInfo!.embed_url,
				// mp4:this.clipInfo!.thumbnail_url.replace(/-preview.*\.jpg/gi, ".mp4"),
				duration:this.clipInfo!.duration,
			},
			params:this.$store.chat.chatHighlightOverlayParams,
			dateLabel:this.$store.i18n.tm("global.date_ago"),
		}
		if(TwitchUtils.hasScopes([TwitchScopes.MANAGE_CLIPS])) {
			const clipSrcPath = await TwitchUtils.getClipsSrcPath([this.clipInfo!.id]);
			data.clip!.mp4 = clipSrcPath[0].landscape_download_url;
		}
		PublicAPI.instance.broadcast(TwitchatEvent.SHOW_CLIP, (data as unknown) as JsonObject);
		this.$store.chat.highlightedMessageId = this.messageData.id;
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
	 * Requests for emote scope
	 */
	public grantClipDLScope():void {
		TwitchUtils.requestScopes([TwitchScopes.MANAGE_CLIPS]);
		console.log("ok")
		watch(() => this.$store.auth.twitch.scopes, () => {
			this.requestClipDLPermission = !TwitchUtils.hasScopes([TwitchScopes.MANAGE_CLIPS]);
		}, {once:true});
	}

	/**
	 * Disable ad if a donor or redirect to ad params otherwise
	 */
	public disableAd():void{
		//If we're a donor, just disable the ad and delete the message as a feedback
		if(this.$store.auth.donorLevel > -1 || this.$store.auth.isPremium) {
			this.$store.chat.updateBotMessage({
											key:"twitchatAd",
											enabled:false,
											message:this.$store.chat.botMessages.twitchatAd.message
										});
			this.$store.chat.deleteMessage(this.messageData, undefined, false);
		}else{
			this.openAdParams();
		}
	}

	/**
	 * Open ad params page
	 */
	public openAdParams():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.AD)
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
	 * Stop auto spoiling this user's messages
	 */
	public stopAutoSpoil():void {
		const m = this.messageData as TwitchatDataTypes.MessageChatData;
		m.spoiler = false;
		m.autospoiled = false;
		m.user.noAutospoil = true;
		if(this.childrenList) {
			this.childrenList.forEach(m=>m.spoiler = false);
		}
	}

	/**
	 * Called when suspicious state of the user changes
	 */
	private updateSuspiciousState():void{
		if(this.messageData.type === TwitchatDataTypes.TwitchatMessageType.WHISPER) return;

		let users = (this.messageData.twitch_sharedBanChannels?.map(v=>v.login) ?? []);
		if(users.length > 0) {
			this.userBannedOnChannels = users.join(", ").replace(/(.*),/, "$1 "+this.$t("global.and"));
		}

		if(this.messageData.twitch_isSuspicious
		&& this.infoBadges.findIndex(v=> v.type == TwitchatDataTypes.MessageBadgeDataType.SUSPICIOUS_USER) == -1) {
			let tt = users.length > 0? this.$t("chat.message.banned_in", {CHANNELS:this.userBannedOnChannels}) : "";
			this.infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.SUSPICIOUS_USER, label:users.length > 1? "(x"+users.length+")" : "", tooltip:tt});
		}

		if(this.messageData.twitch_isRestricted
		&& this.infoBadges.findIndex(v=> v.type == TwitchatDataTypes.MessageBadgeDataType.RESTRICTED_USER) == -1) {
			this.infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.RESTRICTED_USER});
		}
	}

	/**
	 * Called when "saved" state is changed
	 */
	private updateSavedState():void{
		const m = this.messageData as TwitchatDataTypes.MessageChatData;
		const badgeIndex = this.infoBadges.findIndex(v=> v.type == TwitchatDataTypes.MessageBadgeDataType.SAVED);

		if(m.is_saved) {
			if(badgeIndex == -1) {
				this.infoBadges.push({type:TwitchatDataTypes.MessageBadgeDataType.SAVED});
			}
		}else{
			if(badgeIndex > -1) {
				this.infoBadges.splice(badgeIndex, 1);
			}
		}
	}
}
export default toNative(ChatMessage);
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

	&.animation_simmer {
		border-radius: 0;
		padding: 1em;
		background: linear-gradient(90deg, #3866dd, #ff4c5b);
		z-index: 0;
		color: #fff;
		&::before {
			content: "";
			top: .75em;
			left: .75em;
			z-index: -1;
			width: calc(100% - 1.5em);
			height: calc(100% - 1.5em);
			position: absolute;
			background-color: var(--color-dark);
		}
	}

	&.animation_rainbow-eclipse {
		border-radius: 0;
		padding: 1em;
		overflow: hidden;
		z-index: 0;
		color: #fff;
		&::before {
			content: "";
			top: .75em;
			left: .75em;
			z-index: -1;
			width: calc(100% - 1.5em);
			height: calc(100% - 1.5em);
			position: absolute;
			background-color: var(--color-dark);
		}
		.gradientBg {
			z-index: -2;
			filter: blur(3px);
			position: absolute;
			overflow: hidden;
			height: calc(100% - .5em);
			width: calc(100% - .5em);
			margin-left: -0.75em;
			margin-top: -0.75em;
			border-radius: 3px;
			&::before {
				animation: rotate 4s linear infinite;
				background-image: conic-gradient(#b23ff8, #3cc890, #38a7ca, #b23ff8);
				background-position: 0 0;
				background-repeat: no-repeat;
				content: "";
				height: 99999px;
				left: 50%;
				position: absolute;
				top: 50%;
				transform: translate(-50%, -50%) rotate(0deg);
				width: 99999px;
				z-index: 0;
			}
		}

		@keyframes rotate {
			100% {
				transform: translate(-50%, -50%) rotate(1turn);
			}
		}
	}

	&.animation_cosmic-abyss {
		border-radius: 0;
		padding: 1em;
		z-index: 0;
		color: #fff;
		&::before {
			content: "";
			top: .75em;
			left: .75em;
			z-index: -1;
			width: calc(100% - 1.5em);
			height: calc(100% - 1.5em);
			position: absolute;
			background-color: var(--color-dark);
		}

		.noiseBg {
			z-index: -2;
			position: absolute;
			overflow: hidden;
			height: 100%;
			width: 100%;
			margin-left: -1em;
			margin-top: -1em;
			border-radius: 3px;
			img{
				width: 100%;
				object-fit: cover;
				position: absolute;
				top: 0;
				left: 0;
				&:nth-child(2) {
					opacity: 0;
					animation: fadeInOut 3s infinite linear;
				}
			}
			@keyframes fadeInOut {
				0%, 100% { opacity: 0; }
				50% { opacity: 1; }
			}
		}
	}

	&.gigantifiedEmote {
		:deep(.chunk:last-child .emote) {
			height: 5em;
			max-height: 5em;
			display: block;
		}
	}

	&.slashMe {
		.message {
			font-style: italic;
		}
	}

	&.censor {

		&.deleted, .messageChild.deleted {
			.message, &.messageChild.deleted {
				.text, .textTranslation { display: none; }
			}
			&:hover{
				.message, &.messageChild {
					.text { display: inline; }
					.textTranslation { display: block; }
					.deleted { display: none; }
				}
			}
		}
	}

	&.deleted:not(.censor) {

		opacity: .35;
		transition: opacity .2s;
		.message, &.messageChild.deleted {
			text-decoration: line-through;
		}
		&:hover{
			opacity: 1;
			.message, &.messageChild.deleted {
				text-decoration: none;
			}
		}
	}

	&.cleared:not(.deleted) {
		opacity: .35;
		transition: opacity .2s;
		&:hover{
			opacity: 1;
		}
	}

	&.tracked {
		color: var(--color-text);
		background-color: var(--color-secondary-fader);
		text-shadow: var(--text-shadow-contrast);
	}

	.icon {
		// opacity: 0.75;
		height: 1em;
		vertical-align: middle;

		&:not(:last-child) {
			margin-right: .25em;
		}

		&.convBt {
			cursor: pointer;
			margin-bottom: -.4em;
			:deep(svg) {
				height: 1em;
			}
		}
	}
	.mod {
		display: inline-flex;
		margin-right: .4em;
		vertical-align: middle;
	}

	.infoBadges, .noAutospoilBt {
		margin-right: .25em;
		font-size: 1em;
		max-height: 1em;
		padding: 0 .15em;
		border-radius: .25em;
		vertical-align: middle;
	}

	.message {
		.text {
			word-break: break-word;
		}
		:deep(.emote) {
			height: 1.75em;
			display: inline-block;
		}
	}

	.userBadges {
		display: inline;
		margin-right: .4em;
		color: var(--color-text);
	}

	.badge, :deep(.customUserBadge) {
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

	.login {
		cursor: pointer;
		font-weight: bold;
		text-decoration: none;
		text-wrap: nowrap;
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
		cursor: default;
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
		border: 1px solid var(--color-text-fade);
		padding: 0 2px;
		margin-right: .25em;
	}

	.sharedBan {
		color: var(--color-secondary);
		font-weight: bold;
		margin-right: .25em;
	}

	.messageChild {
		position: relative;
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
		.text {
			margin-left: .25em;
			position: relative;
			&::before {
				content: "┕";
				color: var(--color-secondary);
				position: relative;
				font-size: 1em;
				top: .5em;
				margin-right: -0.25em;
				margin-left: -0.25em;
			}
			&:hover {
				outline: 1px solid var(--color-text-fade);
			}
		}
	}

	.clip {
		align-self: center;
		display: flex;
		flex-direction: row;
		border-radius: .25em;
		padding: .5em;
		position: relative;
		flex-wrap: wrap;

		img {
			cursor: pointer;
			object-fit: cover;
			width: max(50%, 190px);
			min-width: 190px;
			flex-basis: 190px;
		}

		.infos {
			padding: 0 .5em;
			min-width: 150px;
			flex: 1;
			.title {
				font-weight: bold;
				margin-bottom: .25em;
				cursor: pointer;
			}
			.subtitle {
				font-size: .8em;
			}
			.highlightBt {
				font-size: .8rem;
			}
			.alertIcon {
				height: 1rem;
				margin: 0 0 .5em .5em;
			}
		}
	}

	&.blockedUser {
		cursor: pointer;
		.blockedMessage {
			font-style: italic;
			color: var(--color-alert);
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
		border-radius: 0;
		border-image-slice: 1;
		border-left: .6em solid var(--background-color-fader);
		border-right: .6em solid var(--background-color-fade);
		padding-top: 0;
		padding-bottom: .25em;
		background-color: var(--background-color-fadest);

		.announcementHolder {
			display: flex;
			margin: 0;
			padding: .2em;
			margin-bottom: .25em;
			flex-direction: row;
			justify-content: center;
			background-color: var(--background-color-fadest);
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
