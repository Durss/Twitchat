<template>
	<div class="usercard sidePanel" v-if="user">
		<div class="content">
			<template v-if="loading">
				<ClearButton aria-label="close" @click="closeCard()" />
				<div class="header">
					<Icon name="loader" alt="loading" class="loader"/>
					<div class="title">
						<a :href="profilePage" target="_blank">{{ user.displayName }}</a>
					</div>
				</div>
			</template>

			<template v-else-if="error">
				<ClearButton aria-label="close" @click="closeCard()" />
				<div class="header">
					<div class="title">
						<span class="label">{{user.displayName}}</span>
					</div>
				</div>

				<div class="card-item alert errorMessage">{{ $t("error.user_profile") }}</div>
			</template>


			<template v-else-if="!loading && !error">
				<ClearButton aria-label="close" @click="closeCard()" v-show="!manageBadges && !manageUserNames" />
				<div class="header" v-show="!manageBadges && !manageUserNames">
					<a :href="profilePage" target="_blank">
						<div class="avatar">
							<img v-if="user!.avatarPath"
								:src="user!.avatarPath"
								alt="avatar"
								class="large"
								referrerpolicy="no-referrer">

							<img v-if="!isOwnChannel && channel?.avatarPath"
								:src="channel.avatarPath"
								@click.capture.prevent="resetChanContext()"
								alt="avatar"
								class="mini"
								:style="{borderColor:channelColor}"
								v-tooltip="channel.displayName"
								referrerpolicy="no-referrer">
						</div>

						<div class="live" v-if="currentStream">LIVE - <span class="viewers">{{ currentStream.viewer_count }}<Icon name="user" /></span></div>
					</a>
					<div class="title">
						<CustomBadgeSelector class="customBadges" :user="user" @manageBadges="manageBadges = true" :channelId="channel!.id" @limitReached="manageBadges = true" />

						<img v-for="b in badges" :key="b.id" class="badge" :src="b.icon.hd" :alt="b.title" v-tooltip="b.title">

						<CustomUserBadges :tooltip="$t('usercard.remove_badgesBt')" :user="user" @select="removeCustomBadge" :channelId="channel!.id" />

						<template v-if="!edittingLogin">
							<a :href="profilePage" target="_blank" class="nickname">
								<span class="label">{{user.displayName}}</span>
								<span class="translation" v-if="translateUsername">({{user.login}})</span>
							</a>

							<tooltip tag="button" interactive class="editLoginBt" @click="editLogin()">
								<template #default>
									<Icon name="edit" theme="secondary" />
								</template>

								<template #content>
									<div style="text-align: center">
										<div>{{ $t('usercard.edit_loginBt_tt') }}</div>
										<div class="list" v-if="Object.keys($store.users.customUsernames).length > 0">
											<TTButton light secondary small icon="edit" @click="manageUserNames = true">{{ $t("usercard.manage_usernamesBt") }}</TTButton>
										</div>
									</div>
								</template>
							</tooltip>
						</template>

						<form v-else class="editLoginForm" @submit.prevent="submitCustomLogin()">
							<input class="" type="text" :placeholder="$t('global.login_placeholder')" v-model="customLogin" ref="customUsername" maxlength="25">
							<TTButton type="submit" icon="checkmark"></TTButton>
						</form>
					</div>
					<span v-if="user.displayName != user.displayNameOriginal" class="originalName">({{ user.displayNameOriginal }})</span>
					<span v-if="isTwitchProfile && user.pronouns" class="pronouns">({{ user.pronounsLabel }})</span>
					<div class="userID" v-tooltip="$t('global.copy')" @click="copyID()" ref="userID">#{{user.id}}</div>
				</div>

				<ChatModTools v-if="isTwitchProfile && canModerate" class="modActions" :messageData="fakeModMessage" :canDelete="false" canBlock v-show="!manageBadges && !manageUserNames" />

				<div class="scrollable" v-show="!manageBadges && !manageUserNames">
					<div class="infoList" v-if="isTwitchProfile">
						<div :class="{info:true, recent:(Date.now() - (user.created_at_ms || 0)) < 14 * 24 * 60 * 60 * 1000}" v-tooltip="$t('usercard.creation_date_tt')+'\n'+createDate">
							<Icon name="alert" alt="recent account" class="icon recent"/>
							<Icon name="date" alt="account creation date" class="icon"/>
							{{createDateElapsed}}
						</div>

						<div class="info" v-if="followersCount > -1"><Icon name="follow_outline" class="icon"/>{{ $tc("usercard.followers", followersCount, {COUNT:followersCount}) }}</div>

						<template v-if="isOwnChannel">
							<div class="info" v-if="subState && subStateLoaded">
								<Icon name="gift" alt="subscribed" class="icon" v-if="subState.is_gift"/>
								<Icon name="sub" alt="subscribed" class="icon" v-else/>
								<i18n-t scope="global" tag="span" :keypath="subState.is_gift? 'usercard.subgifted' : 'usercard.subscribed'">
									<template #TIER>{{ {"1000":1, "2000":2, "3000":3, prime:"prime"}[subState.tier] }}</template>
									<template #GIFTER>{{ subState.gifter_name }}</template>
								</i18n-t>
							</div>
							<div class="info" v-else-if="subStateLoaded">
								<Icon name="sub" alt="subscribed" class="icon"/>
								<span>{{ $t("usercard.non_subscribed") }}</span>
							</div>

							<div class="info" v-if="canListFollowers && followDate && !is_self" v-tooltip="$t('usercard.follow_date_tt')"><Icon name="follow" alt="follow date" class="icon"/>{{followDate}}</div>
							<div class="info" v-else-if="canListFollowers && !is_self"><Icon name="unfollow" alt="no follow" class="icon"/>{{$t('usercard.not_following')}}</div>
							<!-- <div class="info ban card-item alert" v-for="chan in bannedChannels">
								<Icon :name="chan.duration? 'timeout' : 'ban'" class="icon"/>
								<span>{{ chan.user.displayName }}</span>
								<span class="timeoutDuration" v-if="chan.duration">{{ getFormatedTimeoutDuration(chan.duration) }}</span>
							</div> -->
						</template>
					</div>

					<div class="banReason quote" v-if="banReason"><Icon name="ban" /> {{ banReason }}</div>

					<div class="ctas" v-if="isTwitchProfile">
						<form class="warnForm" @submit.prevent="warnUser()" v-if="showWarningForm">
							<TTButton type="button" icon="back" @click="showWarningForm = false" alert></TTButton>
							<input type="text" v-model="warningMessage" :placeholder="$t('usercard.warn_placeholder')" maxlength="500" v-autofocus>
							<TTButton type="submit" icon="checkmark" :disabled="warningMessage.length == 0" :loading="sendingWarning"></TTButton>
						</form>
						<template v-else>
							<TTButton v-if="canWhisper" small icon="whispers" @click="openWhispers()">{{$t('usercard.whisperBt')}}</TTButton>
							<TTButton v-if="canModerate && canShoutout" small icon="shoutout" @click="shoutoutUser()">{{$t('usercard.shoutoutBt')}}</TTButton>
							<TTButton v-if="canModerate && canWarn" small icon="alert" @click="showWarningForm = true">{{$t('usercard.warnBt')}}</TTButton>
							<TTButton v-if="!is_tracked" small icon="magnet" @click="trackUser()">{{$t('usercard.trackBt')}}</TTButton>
							<TTButton v-if="is_tracked" small icon="magnet" @click="untrackUser()">{{$t('usercard.untrackBt')}}</TTButton>
							<TTButton v-if="$store.tts.params.enabled === true" small icon="tts" @click="toggleReadUser()">{{ ttsReadBtLabel }}</TTButton>
						</template>
					</div>

					<div class="ctas">
						<TTButton type="link" small icon="newtab" :href="profilePage" target="_blank">{{$t('usercard.profileBt')}}</TTButton>
						<template v-if="isTwitchProfile">
							<TTButton small
								type="link"
								icon="newtab"
								@click.stop="openUserCard($event, channel!.login)"
								:href="'https://www.twitch.tv/popout/'+channel!.login+'/viewercard/'+user!.login"
								target="_blank">{{$t('usercard.viewercardBt')}}</TTButton>

							<TTButton small
							v-if="!isOwnChannel"
								type="link"
								icon="newtab"
								@click.stop="openUserCard($event)"
								:href="'https://www.twitch.tv/popout/'+$store.auth.twitch.user.login+'/viewercard/'+user!.login"
								target="_blank">{{$store.auth.twitch.user.displayName, $store.auth.twitch.user.login}}</TTButton>

							<TTButton v-if="!canListModeratedChans" small secondary icon="mod" @click="grantModeratedScope()">{{$t('usercard.moderator_viewercardBt')}}</TTButton>

							<div class="modItem" v-for="modedChan of moderatedChannelList_pinned.filter(v=>v.broadcaster_id != channel!.id)">
								<TTButton small
									type="link"
									icon="newtab"
									v-tooltip="$t('usercard.moderator_viewercardBt_tt', {CHANNEL:modedChan.broadcaster_name})"
									@click.stop="openUserCard($event, modedChan.broadcaster_login)"
									:href="'https://www.twitch.tv/popout/'+modedChan.broadcaster_login+'/viewercard/'+user!.login"
									target="_blank" >{{ modedChan.broadcaster_name }}</TTButton>
								<TTButton icon="unpin" @click="unpinModIem(modedChan)"></TTButton>
							</div>

							<tooltip
							interactive
							trigger="click"
							:maxWidth="600"
							:inlinePositioning='false'
							:interactiveDebounce="1000"
							:theme="$store.common.theme">
								<template #default>
									<TTButton v-if="Object.keys(moderatedChannelList_pinned).length < moderatedChannelList.length"
										icon="add"
										secondary></TTButton>
								</template>
								<template #content>
									<div class="modList">
										<div class="modItem" v-for="modedChan in moderatedChannelList.filter(v=>moderatedChannelList_pinned.findIndex(u=>u.broadcaster_id == v.broadcaster_id) == -1)">
											<TTButton
												small
												icon="mod"
												@click.stop="openUserCard($event, modedChan.broadcaster_login)"
												target="_blank" >{{ modedChan.broadcaster_name }}</TTButton>
											<TTButton icon="pin" @click="pinModIem(modedChan)"></TTButton>
										</div>
									</div>
								</template>
							</tooltip>
						</template>
					</div>

					<div class="card-item secondary liveInfo" v-if="currentStream">
						<div class="header">
							<div class="title">{{ $t("usercard.streaming") }}</div>
						</div>
						<div class="infos">
							<div class="title">{{currentStream.title}}</div>
							<mark class="game">{{currentStream.game_name}}</mark>
						</div>
					</div>

					<div class="card-item description quote" v-if="userDescription">{{userDescription}}</div>

					<div class="card-item messages" v-if="messageHistory.length > 0">
						<div class="header">
							<h2 class="title">{{ $t("usercard.messages") }}</h2>
						</div>

						<div class="ctas" v-if="$store.groq.connected">
							<TTButton v-if="!showGroqForm"
								@click="showGroqForm = true"
								icon="groq"
								v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'usercard_groq'}"
								small>{{ $t("groq.summarize_bt") }}</TTButton>

							<GroqSummaryFilterForm class="groq" v-if="showGroqForm"
								mode="all"
								:messageList="messageHistory"
								@close="showGroqForm = false"
								@complete="closeCard()" />
						</div>

						<div class="list" ref="messagelist">
							<div class="subholder" v-for="m in messageHistory" :key="m.id">
								<MessageItem class="message"
									disableConversation
									:messageData="m" />
							</div>
						</div>
					</div>
				</div>
			</template>

			<div class="holder" ref="holder" v-if="manageBadges">
				<CustomBadgesManager class="scrollable" @close="manageBadges = false" />
			</div>

			<div class="holder" ref="holder" v-if="manageUserNames">
				<CustomUserNameManager class="scrollable" @close="manageUserNames = false" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Utils from '@/utils/Utils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import DataStore from '@/store/DataStore';
import { watch } from '@vue/runtime-core';
import { gsap } from 'gsap/gsap-core';
import type { Badges } from 'tmi.js';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ClearButton from '../ClearButton.vue';
import TTButton from '../TTButton.vue';
import MessageItem from '../messages/MessageItem.vue';
import ChatModTools from '../messages/components/ChatModTools.vue';
import CustomBadgeSelector from './CustomBadgeSelector.vue';
import CustomBadgesManager from './CustomBadgesManager.vue';
import CustomUserBadges from './CustomUserBadges.vue';
import CustomUserNameManager from './CustomUserNameManager.vue';
import AbstractSidePanel from '../AbstractSidePanel';
import GroqSummaryFilterForm from '../GroqSummaryFilterForm.vue';

@Component({
	components:{
		TTButton,
		ClearButton,
		MessageItem,
		ChatModTools,
		CustomUserBadges,
		CustomBadgeSelector,
		CustomBadgesManager,
		GroqSummaryFilterForm,
		CustomUserNameManager,
	},
	emits:["close"],
})
class UserCard extends AbstractSidePanel {

	public error:boolean = false;
	public loading:boolean = true;
	public edittingLogin:boolean = true;
	public showGroqForm:boolean = false;
	public manageBadges:boolean = false;
	public sendingWarning:boolean = false;
	public showWarningForm:boolean = false;
	public manageUserNames:boolean = false;
	public isTwitchProfile:boolean = false;
	public banReason:string = "";
	public warningMessage:string = "";
	public customLogin:string = "";
	public createDate:string = "";
	public createDateElapsed:string = "";
	public followDate:string = "";
	public channelColor:string = "";
	public userDescription:string = "";
	public canModerate:boolean = false;
	public isOwnChannel:boolean = false;
	public isSelfProfile:boolean = false;
	public user:TwitchatDataTypes.TwitchatUser|null = null;
	public channel:TwitchatDataTypes.TwitchatUser|null = null;
	public fakeModMessage:TwitchatDataTypes.MessageChatData|null = null;
	public currentStream:TwitchDataTypes.StreamInfo|null = null;
	public followersCount:number = -1;
	public badges:TwitchatDataTypes.TwitchatUserBadge[] = [];
	public subState:TwitchDataTypes.Subscriber|null = null;
	public subStateLoaded:boolean = false;
	public messageHistory:TwitchatDataTypes.ChatMessageTypes[] = []
	public dateOffset:number = 0;
	public dateOffsetTimeout:number = -1;
	public moderatedChannelList_pinned:TwitchDataTypes.ModeratedUser[] = [];

	private popup:Window|null = null;
	private keyUpHandler!:(e:KeyboardEvent)=>void;
	private messageBuildInterval:number = -1;

	/**
	 * Returns the login instead of the display name if the display name contains
	 * mostly non-latin chars
	 */
	public get translateUsername():boolean {
		const dname = this.user!.displayNameOriginal.toLowerCase();
		const uname = this.user!.login.toLowerCase();
		//If display name is different from username and at least half of the
		//display name's chars ar not latin chars, translate it
		return dname != uname && dname.replace(/^[^a-zA-Z0-9]*/gi, "").length < dname.length/2;
	}

	/**
	 * Gets if current profil is our own
	 */
	public get is_self():boolean { return StoreProxy.auth.twitch.user.id === this.user?.id; }

	/**
	 * Get if user is being tracked or not
	 */
	public get is_tracked():boolean { return this.user!.is_tracked; }

	/**
	 * Get if our followings can be listed
	 */
	public get canListFollowings():boolean { return TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWINGS]); }

	/**
	 * Get if our followers can be listed
	 */
	public get canListFollowers():boolean { return TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS]); }

	/**
	 * Get if channels we moderate can be listed
	 */
	public get canListModeratedChans():boolean { return TwitchUtils.hasScopes([TwitchScopes.LIST_MODERATED_CHANS]); }

	/**
	 * Get if we can whisper
	 */
	public get canWhisper():boolean { return this.user!.id != this.$store.auth.twitch.user.id &&  TwitchUtils.hasScopes([TwitchScopes.WHISPER_READ && TwitchScopes.WHISPER_MANAGE]); }

	/**
	 * Get if we can shoutout
	 */
	public get canShoutout():boolean { return TwitchUtils.hasScopes([TwitchScopes.SHOUTOUT]); }

	/**
	 * Get if we can send warnings
	 */
	public get canWarn():boolean { return TwitchUtils.hasScopes([TwitchScopes.CHAT_WARNING]); }

	/**
	 * Get a list of the channels we're a moderator on
	 */
	public get moderatedChannelList():TwitchDataTypes.ModeratedUser[] { return this.$store.auth.twitchModeratedChannels; }

	/**
	 * Get user's profile page
	 */
	public get profilePage():string{
		switch(this.platform) {
			case "twitch": {
				return "https://www.twitch.tv/"+this.user!.login;
			}
			case "youtube": {
				return "https://www.youtube.com/channel/"+this.user!.id;
			}
			case "tiktok": {
				return "https://www.tiktok.com/@"+this.user!.login;
			}
		}
		return "#";
	}

	/**
	 * Get connected channels the user is banned in.
	 * Only reliable info is from our own chan. Other's chan info depends on weither we were here
	 * when the user got banned
	 */
	public get bannedChannels():{user:TwitchatDataTypes.TwitchatUser, duration?:number}[] {
		if(!this.user) return [];
		let res:{user:TwitchatDataTypes.TwitchatUser, duration?:number}[] = [];
		for (const uid in this.user!.channelInfo) {
			if(this.user.channelInfo[uid].is_banned !== true) continue;
			let entry:{user:TwitchatDataTypes.TwitchatUser, duration?:number} = {user:this.$store.users.getUserFrom(this.platform, uid, uid)}
			if(this.user.channelInfo[uid].banEndDate) {
				const duration = this.user.channelInfo[uid].banEndDate! - Date.now();
				if(duration > 0) entry.duration = duration;
			}
			res.push(entry)
		}
		return res;
	}

	/**
	 * Get the "read user's messages" label depedning on its current state
	 */
	public get ttsReadBtLabel(): string {
		if(!this.user) return "";
		const username = this.user.login.toLowerCase();
		const permissions: TwitchatDataTypes.PermissionsData = this.$store.tts.params.ttsPerms;
		let label = "";
		if (permissions.usersAllowed.findIndex(v=>v.toLowerCase() === username) == -1) {
			label = this.$t("tts.read_user_start_light", {USER:username})
		} else {
			label = this.$t("tts.read_user_stop_light", {USER:username})
		}
		return label;
	}

	public get platform():TwitchatDataTypes.ChatPlatform {
		const card = this.$store.users.userCard;
		if(card) {
			return card.platform || card.user?.platform || "twitch";
		}
		return "twitch";
	}

	/**
	 * Get a formated timeout duration
	 * @param duration
	 */
	public getFormatedTimeoutDuration(duration:number):string {
		return Utils.formatDuration(Math.max(0, duration - this.dateOffset));
	}

	public mounted():void {
		let pinnedChanIds:string[] = [];
		try {
			pinnedChanIds = JSON.parse(DataStore.get(DataStore.USERCARD_PINNED_CHANNEL) || "[]") as string[] || [];
		}catch(error) {
			pinnedChanIds = [];
		}
		if(!Array.isArray(pinnedChanIds)) pinnedChanIds = []
		pinnedChanIds.forEach(id=> {
			const chan = this.moderatedChannelList.find(v=>v.broadcaster_id == id);
			if(!chan) return;
			this.moderatedChannelList_pinned.push(chan);
		});
		watch(() => this.$store.users.userCard, async () => {
			const card = this.$store.users.userCard;
			if(card && card.user) {
				const chanId = card.channelId ?? StoreProxy.auth.twitch.user.id;
				this.channel = this.$store.users.getUserFrom(card.platform || "twitch", chanId, chanId);
				this.user = card.user;
				this.$nextTick(()=>{
					this.open();
				})
				while(this.user.temporary === true) {
					await Utils.promisedTimeout(250);
				}
				this.isOwnChannel = chanId == StoreProxy.auth.twitch.user.id || chanId == StoreProxy.auth.youtube.user?.id;
				this.isSelfProfile = this.user.id == StoreProxy.auth.twitch.user.id;
				//Check if message is from our chan or one we can moderate, and that this chan is not the current user
				this.canModerate = (this.moderatedChannelList.findIndex(v=>v.broadcaster_id === chanId) > -1 || chanId == StoreProxy.auth.twitch.user.id)
									&& chanId != this.user.id;
				if(!this.isOwnChannel) {
					this.channelColor = this.$store.stream.connectedTwitchChans.find(v=>v.user.id === chanId)?.color || "#ffffff";
				}
				this.loadUserInfo();
				this.dateOffsetTimeout = window.setInterval(() => {
					this.dateOffset += 1000;
				}, 1000);
			}else{
				clearInterval(this.dateOffsetTimeout);
				if(this.user){
					await super.close();
				}
				this.user = null;
			}
		});

		this.keyUpHandler = (e:KeyboardEvent):void => this.onKeyUp(e);
		document.body.addEventListener("keyup", this.keyUpHandler);
	}

	public beforeUnmount():void {
		clearInterval(this.messageBuildInterval);
		document.body.removeEventListener("keyup", this.keyUpHandler);
	}

	public async closeCard():Promise<void> {
		this.$store.users.openUserCard(null);
	}

	public async loadUserInfo():Promise<void> {
		this.error = false;
		this.loading = true;
		this.isTwitchProfile = false;
		this.edittingLogin = false;
		this.manageBadges = false;
		this.manageUserNames = false;
		this.subState = null;
		this.subStateLoaded = false;
		this.currentStream = null;
		this.banReason = "";
		this.customLogin = "";
		this.createDate = "";
		this.followDate = "";
		this.userDescription = "";
		this.followersCount = -1;
		this.badges = [];
		this.messageHistory = [];
		this.isTwitchProfile = this.platform == "twitch";

		if(!this.$store.users.userCard) {
			this.loading = false;
		}

		if(!this.isTwitchProfile) {
			this.loading = false;
			this.user = this.$store.users.userCard!.user;
			this.customLogin = this.user?.displayName || "";
			this.loadHistory(this.user!.id);
			return;
		}

		try {
			let user = this.user!;
			const loadFromLogin = user.login != this.$store.users.tmpDisplayName && !user.errored && !user.temporary;
			const users = await TwitchUtils.getUserInfo(loadFromLogin? undefined : [user.id], loadFromLogin? [user.login] : undefined);
			if(users.length > 0) {
				const u = users[0];
				const chanInfo = user.channelInfo[this.channel!.id];
				user.login = u.login;
				user.displayName = u.display_name;
				user.displayNameOriginal = u.display_name;
				this.customLogin = this.$store.users.customUsernames[u.id]?.name || u.display_name;
				this.createDate = Utils.formatDate(new Date(u.created_at));
				this.createDateElapsed = Utils.elapsedDuration(new Date(u.created_at).getTime());
				this.userDescription = u.description;
				if(!user.avatarPath) user.avatarPath = u.profile_image_url;
				user.id = u.id;
				//Don't replace display name if already set.
				//Extensions like "Stream stickers" have a different display name
				//than the one sent back by the API.
				//Ex: when receiving s stream stickers event from pubsub, the display
				//name is "Stream Stickers", but its actual display name is "streamsticker".
				//This condition avoids replacing the first by the second.
				if(!user.displayName) user.displayName = u.display_name;

				//Adding partner badge if no badge is already specified
				if(chanInfo && chanInfo.badges?.length == 0) {
					const staticBadges:Badges = {};
					staticBadges[u.broadcaster_type] = "1";
					user.channelInfo[this.channel!.id].badges = TwitchUtils.getBadgesFromRawBadges(this.channel!.id, undefined, staticBadges);
				}
				if(chanInfo) this.badges = user.channelInfo[this.channel!.id].badges;

				//Async loading of data
				TwitchUtils.getCurrentStreamInfo([u.id]).then(v=> {
					this.currentStream = v[0];
				});
				if(chanInfo?.is_banned) {
					this.banReason = chanInfo?.banReason || "";
				}else{
					TwitchUtils.getBannedUsers(this.channel!.id, [u.id]).then(res=> {
						if(res.length > 0) {
							this.banReason = res[0].reason;
						}
					});
				}
				if(this.isOwnChannel) {
					TwitchUtils.getFollowerState(u.id).then(v=> {
						if(v) this.followDate = Utils.formatDate(new Date(v.followed_at));
					});
				}
				TwitchUtils.getLastFollowers(u.id).then(v=> {
					this.followersCount = v.total;
				});
				if(TwitchUtils.hasScopes([TwitchScopes.LIST_SUBSCRIBERS])) {
					TwitchUtils.getSubscriptionState([u.id]).then(v=> {
						this.subState = v.length > 0 ? v[0] : null;
						this.subStateLoaded = true;
					});
				}
				this.$store.users.loadUserPronouns(user);
				this.fakeModMessage = {
					id:Utils.getUUID(),
					platform:"twitch",
					date:Date.now(),
					type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
					user,
					channel_id: this.channel!.id,
					message: "",
					message_html: "",
					message_chunks: [],
					message_size:0,
					answers:[],
					is_short:false,
				};
				this.loadHistory(u.id);
			}else{
				this.error = true;
			}
		}catch(error) {
			console.log(error);
			this.error = true;
		}

		this.loading = false;
	}

	public pinModIem(item:TwitchDataTypes.ModeratedUser):void {
		this.moderatedChannelList_pinned.push(item);
		DataStore.set(DataStore.USERCARD_PINNED_CHANNEL, this.moderatedChannelList_pinned.map(v=>v.broadcaster_id));
	}

	public unpinModIem(item:TwitchDataTypes.ModeratedUser):void {
		const index = this.moderatedChannelList_pinned.findIndex(v => v.broadcaster_id == item.broadcaster_id);
		if(index == -1) return;
		this.moderatedChannelList_pinned.splice(index, 1);
		DataStore.set(DataStore.USERCARD_PINNED_CHANNEL, this.moderatedChannelList_pinned.map(v=>v.broadcaster_id));
	}

	public openUserCard(event?:MouseEvent, channelName?:string):void {
		if(!channelName) {
			channelName = StoreProxy.auth.twitch.user.login;
		}
		let params = `scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no,
		width=350,height=${screen.availHeight},left=0,top=0`;
		const url ="https://www.twitch.tv/popout/"+channelName+"/viewercard/"+this.user!.login;
		// console.log("OKKOKOKK");
		// if(this.popup) {
		// 	this.popup.location.href = url;
		// }else{
			try {
				this.popup = window.open(url, 'profilePage', params);
			}catch(error) {
				//Ignore it
			}
		// }
		if(event) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
	 * Open whispers with the user
	 */
	public openWhispers():void { this.$store.chat.openWhisperWithUser(this.user!); this.closeCard(); }

	/**
	 * Give a shoutout to the user
	 */
	public shoutoutUser():void { this.$store.users.shoutout(this.channel!.id, this.user!); }

	/**
	 * Start tracking user's messages
	 */
	public trackUser():void { this.$store.users.trackUser(this.user!); }

	/**
	 * Stop tracking user's messages
	 */
	public untrackUser():void { this.$store.users.untrackUser(this.user!); }

	/**
	 * View the user card from our own chan
	 */
	public resetChanContext():void { this.$store.users.openUserCard(this.user); }

	/**
	 * Send a warning to the user
	 */
	public async warnUser():Promise<void> {
		if(this.warningMessage.length === 0) return;
		this.sendingWarning = true;
		await TwitchUtils.sendWarning(this.user!.id, this.warningMessage, this.channel!.id);
		await Utils.promisedTimeout(250);
		this.sendingWarning = false;
		this.showWarningForm = false;
	}

	/**
	 * Start custom display name edition
	 */
	public editLogin():void {
		this.edittingLogin = true;
		this.$nextTick().then(()=> {
			(this.$refs.customUsername as HTMLInputElement).focus();
			(this.$refs.customUsername as HTMLInputElement).select();
		})
	}

	/**
	 * Called when setting a custom display name
	 */
	public submitCustomLogin():void {
		this.edittingLogin = false;
		if(!this.$store.users.setCustomUsername(this.user!, this.customLogin, this.channel!.id, this.user!.platform)) {
			this.manageUserNames = true;
		}
		//Update customLogin from the actual displayname.
		//If clearing the custom login, the real display name is loaded back to the
		//"displayName" getter .
		this.customLogin = this.user!.displayName;
	}

	/**
	 * Removes a custom badge from the user
	 * @param badgeId
	 */
	public removeCustomBadge(badgeId:string):void {
		this.$store.users.removeCustomBadge(this.user!.id, badgeId, this.channel!.id);
	}

	/**
	 * Toggles whether the TTS should read this user's messages
	 */
	public toggleReadUser(): void {
		const permissions: TwitchatDataTypes.PermissionsData = this.$store.tts.params.ttsPerms;
		const read = permissions.usersAllowed.findIndex(v=>v.toLowerCase() === this.user!.login.toLowerCase()) == -1;
		this.$store.tts.ttsReadUser(this.user!, read);
	}

	/**
	 * Push user ID to clipboard
	 */
	public copyID():void {
		Utils.copyToClipboard(this.user!.id);
		gsap.from(this.$refs.userID as HTMLDivElement, {scale:1.5, ease:"back.out"});
	}

	public grantModeratedScope():void {
		TwitchUtils.requestScopes([TwitchScopes.LIST_MODERATED_CHANS]);
	}

	/**
	 * Detect ESC key to close window
	 */
	private onKeyUp(e:KeyboardEvent):void {
		if(!this.user) return;

		if(e.key == "Escape") {
			if(this.edittingLogin) {
				this.edittingLogin = false;
			}else{
				this.closeCard();
			}
			e.preventDefault();
			e.stopPropagation();
		}
	}

	/**
	 * Build the message history chunk by chunk
	 */
	private loadHistory(uid:string):void {
		const messageList:TwitchatDataTypes.ChatMessageTypes[] = [];
		const allowedTypes:TwitchatDataTypes.TwitchatMessageStringType[] = [
			"following",
			"message",
			"reward",
			"subscription",
			"shoutout",
			"whisper",
			"ban",
			"unban",
			"cheer",
			"user_watch_streak",
			"youtube_subgift",
			"youtube_subscription",
			"tiktok_like",
			"tiktok_gift",
			"tiktok_sub",
		]
		for (let i = this.$store.chat.messages.length-1; i > 0; i--) {
			const mess = this.$store.chat.messages[i];
			if(!allowedTypes.includes(mess.type)) continue;

			if(mess.type == "shoutout" && mess.user.id == uid) {
				messageList.unshift(mess);
			}else if(mess.type == "following" && mess.user.id == uid) {
				messageList.unshift(mess);
			}else if((mess.type == "ban" || mess.type == "unban") && mess.user.id == uid) {
				messageList.unshift(mess);
			}else if((mess.type == "message" || mess.type == "whisper") && mess.user.id == uid) {
				messageList.unshift(mess);
			}else if(mess.type == "subscription" && mess.user.id == uid) {
				messageList.unshift(mess);
			}else if(mess.type == "cheer" && mess.user.id == uid) {
				messageList.unshift(mess);
			}else if(mess.type == "reward" && mess.user.id == uid) {
				messageList.unshift(mess);
			}else if(mess.type == "user_watch_streak" && mess.user.id == uid) {
				messageList.unshift(mess);
			}else if(mess.type == "youtube_subgift" && mess.user.id == uid) {
				messageList.unshift(mess);
			}else if(mess.type == "youtube_subscription" && mess.user.id == uid) {
				messageList.unshift(mess);
			}else if(mess.type == "tiktok_like" && mess.user.id == uid) {
				messageList.unshift(mess);
			}else if(mess.type == "tiktok_gift" && mess.user.id == uid) {
				messageList.unshift(mess);
			}else if(mess.type == "tiktok_sub" && mess.user.id == uid) {
				messageList.unshift(mess);
			}
			if (messageList.length > 100) break;//Limit message count for perf reasons
		}

		//Build messages by batch to avoid lag on open
		this.messageHistory = messageList.splice(-20);
		clearInterval(this.messageBuildInterval);
		this.messageBuildInterval = window.setInterval(()=> {
			if(messageList.length == 0) clearInterval(this.messageBuildInterval);

			this.messageHistory.unshift(...messageList.splice(-5));

			if(this.messageHistory.length < 30) {
				this.$nextTick(()=>{
					const messagelist = this.$refs.messagelist as HTMLDivElement |undefined;
					if(!messagelist) return;
					messagelist.scrollTop = messagelist.scrollHeight;
				});
			}
		}, 50);
	}

}
export default toNative(UserCard);
</script>

<style scoped lang="less">
.usercard{
	.content {
		.loader {
			margin: auto;
			display: block;
			width: 5em;
			height: 5em;
			padding: 1em;
		}

		.modList {
			gap: .5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			max-width: 400px;
			padding: .5em;
		}
		.modItem {
			gap: 1px;
			display: flex;
			flex-direction: row;
			&>:first-child {
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
			&>:last-child {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
			}
		}

		.errorMessage, .warn {
			text-align: center;
		}

		&>.header, &>div>.header {
			display: flex;
			flex-direction: column;
			align-items: center;
			width: calc(100% - 3em);
			margin: 0 auto;
			flex-shrink: 0;//necessery for shit old safari -_-
			a {
				text-decoration: none;
			}

			.title {
				font-size: 1.5em;
				display: flex;
				align-items: center;
				justify-content: center;
				width:100%;

				.customBadges {
					font-size: .8em;
					margin-right: .25em;
					z-index: 2;
				}

				.nickname {
					max-width: 80%;
					display: inline-block;

					.label {
						text-overflow: ellipsis;
						overflow: hidden;
						line-height: 1.2em;
						text-wrap: nowrap;
						width:100%;
						display: inline-block;
					}

					.translation {
						font-style: italic;
						font-size: .8em;
						margin-left: .25em;
					}
				}


				.badge, :deep(.customUserBadge) {
					height: .8em;
					margin-right: 3px;
					&.customUserBadge {
						cursor: not-allowed;
					}
				}

				.editLoginBt {
					height: .7em;
					margin-left: .25em;
					flex-shrink: 0;
					.icon {
						height: 100%;
						display: block;
						:deep(svg) {
							vertical-align: top;
						}
					}
				}

				.editLoginForm {
					gap: 0;
					font-size: 1rem;
					display: flex;
					flex-direction: row;
					.button {
						border-top-left-radius: 0;
						border-bottom-left-radius: 0;
					}

					input {
						border-top-right-radius: 0;
						border-bottom-right-radius: 0;
					}
				}
			}

			.originalName {
				font-style: italic;
				margin-bottom: .25em;
			}

			.pronouns {
				border-radius: 3px;
				color: var(--color-text);
				border: 1px solid var(--color-text-fade);
				padding: 0 2px;
				font-size: .8em;
				margin-bottom: .25em;
			}

			.live {
				position: relative;
				display: block;
				background-color: var(--color-alert);
				color: var(--color-light);
				font-weight: bold;
				font-size: .7em;
				padding: .35em .75em;
				border-radius: .5em;
				width: fit-content;
				left: 50%;
				transform: translate(-50%, -50%);
				z-index: 1;
				box-shadow: 0 -.25em .5em rgba(0, 0, 0, .5);

				.viewers {
					font-weight: normal;
					.icon {
						height: .8em;
						margin-left: 2px;
					}
				}
			}

			.userID {
				font-size: .7em;
				cursor: copy;
				z-index: 1;
			}

			.avatar {
				position: relative;
				.large {
					width: 5em;
					height: 5em;
					border-radius: 50%;
					margin: auto;
					display: block;
					transition: width .25s, height .25s, border-radius .25s;
					&:hover {
						width: 10em;
						height: 10em;
						border-radius: 5px;
					}
				}
				.mini {
					cursor: not-allowed;
					width: 2em;
					height: 2em;
					bottom: 0;
					right: -.5em;
					border: 2px solid transparent;
					border-radius: 50%;
					position: absolute;
					box-shadow: -3px -1px 8px rgba(0, 0, 0, 1);
				}
			}
		}

		.infoList {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			gap: .5em;
			cursor: default;
			flex-shrink: 0;//necessery for shit old safari -_-
			.info {
				font-size: .9em;
				border-radius: .5em;
				border: 1px solid var(--color-text);
				padding: .25em .5em;
				.icon {
					height: 1em;
					margin-right: .5em;
					vertical-align: middle;
				}

				&.ban {
					.timeoutDuration {
						margin-left: .5em;
						// font-family: Azeret;
						font-size: .8em;
						font-variant-numeric: tabular-nums;
					}
				}
				&.recent {
					border-width: 0;
					color: var(--color-light);
					background-color: var(--color-secondary);
				}
				&:not(.recent) {
					.icon.recent {
						display: none;
					}
				}
			}
		}

		.liveInfo {
			align-self: center;
			flex-shrink: 0;
			.infos {
				.game {
					margin-top: .25em;
					display: inline-block;
				}
			}
		}

		.modActions {
			margin: -.5em 0;
			align-self: center;
			flex-shrink: 0;//necessery for shit old safari -_-
		}

		.banReason {
			background-color: var(--color-alert-fadest);
		}

		.ctas {
			display: flex;
			flex-direction: row;
			justify-content: center;
			flex-wrap: wrap;
			gap: .5em;
			flex-shrink: 0;//necessery for shit old safari -_-

			.warnForm {
				gap: 0;
				display: flex;
				flex-direction: row;
				* {
					border-radius: 0;
					&:first-child {
						border-top-left-radius: var(--border-radius);
						border-bottom-left-radius: var(--border-radius);
					}
					&:last-child {
						border-top-right-radius: var(--border-radius);
						border-bottom-right-radius: var(--border-radius);
					}
				}
				.button {
					flex-shrink: 0;
					flex-basis: 1.5em;
				}
			}
		}

		.description {
			flex-shrink: 0;
			align-self: center;
			text-align: center;
		}

		.scrollable {
			overflow-y: auto;
			gap: 1em;
			display: flex;
			flex-direction: column;
			padding-bottom: .5em;//Avoid glitchy scroll when pressing down a button if at the bottom of the scrollable holder
			.card-item:not(.groq) {
				flex-shrink: 0;
			}
		}

		.messages {
			display: flex;
			flex-direction: column;

			&.messages {
				.list {
					gap: 1em;
					max-height: min(50vh, 300px);
					overflow-y: auto;
					text-align: left;
					.subholder {
						margin-bottom: 3px;
					}
				}
				.ctas {
					align-self: center;
					margin: .5em auto;
				}
			}

		}
	}
}
</style>
