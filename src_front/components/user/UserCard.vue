<template>
	<div class="usercard sidePanel" v-if="user">
		<div class="content">
			<template v-if="loading">
				<CloseButton aria-label="close" @click="close()" />
				<div class="header">
					<div class="title">
						<span class="label">{{user.displayName}}</span>
					</div>
					<Icon name="loader" alt="loading" class="loader"/>
				</div>
			</template>

			<template v-else-if="error">
				<CloseButton aria-label="close" @click="close()" />
				<div class="header">
					<div class="title">
						<span class="label">{{user.displayName}}</span>
					</div>
				</div>

				<div class="card-item alert errorMessage">{{ $t("error.user_profile") }}</div>
			</template>

			<template v-else-if="!loading && !error">
				<CloseButton aria-label="close" @click="close()" v-show="!manageBadges && !manageUserNames" />
				<div class="header" v-show="!manageBadges && !manageUserNames">
					<a :href="'https://www.twitch.tv/'+user!.login" target="_blank">
						<img v-if="user!.avatarPath" :src="user!.avatarPath" alt="avatar" class="avatar" ref="avatar">
						<div class="live" v-if="currentStream">LIVE - <span class="viewers">{{ currentStream.viewer_count }}<Icon name="user" /></span></div>
					</a>
					<div class="title">
						<CustomBadgeSelector class="customBadges" :user="user" @manageBadges="manageBadges = true" :channelId="channelId" @limitReached="manageBadges = true" />
						
						<img v-for="b in badges" :key="b.id" class="badge" :src="b.icon.hd" :alt="b.title" v-tooltip="b.title">

						<CustomUserBadges :tooltip="$t('usercard.remove_badgesBt')" :user="user" @select="removeCustomBadge" :channelId="channelId" />
						
						<template v-if="!edittingLogin">
							<a :href="'https://www.twitch.tv/'+user!.login" target="_blank">
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
										<div class="list" v-if="Object.keys($store('users').customUsernames).length > 0">
											<Button light secondary small icon="edit" @click="manageUserNames = true">{{ $t("usercard.manage_usernamesBt") }}</Button>
										</div>
									</div>
								</template>
							</tooltip>
						</template>
						
						<form v-else class="editLoginForm" @submit.prevent="submitCustomLogin()">
							<input class="" type="text" :placeholder="$t('global.login_placeholder')" v-model="customLogin" ref="customUsername" maxlength="25">
							<Button type="submit" icon="checkmark"></Button>
						</form>
					</div>
					<span v-if="user.displayName != user.displayNameOriginal" class="originalName">({{ user.displayNameOriginal }})</span>
					<span v-if="user.pronouns" class="pronouns">({{ user.pronounsLabel }})</span>
					<div class="userID" v-tooltip="$t('global.copy')" @click="copyID()" ref="userID">#{{user.id}}</div>
				</div>
				
				<ChatModTools class="modActions" :messageData="fakeModMessage" :canDelete="false" canBlock v-show="!manageBadges && !manageUserNames" />

				<div class="scrollable" v-show="!manageBadges && !manageUserNames">
					<div class="infoList">
						<div class="info" v-tooltip="$t('usercard.creation_date_tt')"><Icon name="date" alt="account creation date" class="icon"/>{{createDate}}</div>
						
						<div class="info" v-if="followersCount > -1"><Icon name="follow_outline" class="icon"/>{{ $tc("usercard.followers", followersCount, {COUNT:followersCount}) }}</div>
						
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
					</div>
					
					<div class="ctas">
						<Button type="link" small icon="newtab" :href="'https://www.twitch.tv/'+user!.login" target="_blank">{{$t('usercard.profileBt')}}</Button>
						<Button type="link" small icon="newtab" @click.stop="openUserCard()" :href="'https://www.twitch.tv/popout/'+$store('auth').twitch.user.login+'/viewercard/'+user!.login" target="_blank">{{$t('usercard.viewercardBt')}}</Button>
						<Button v-if="!is_tracked" small icon="magnet" @click="trackUser()">{{$t('usercard.trackBt')}}</Button>
						<Button v-if="is_tracked" small icon="magnet" @click="untrackUser()">{{$t('usercard.untrackBt')}}</Button>
						<Button v-if="$store('tts').params.enabled === true" small icon="tts" @click="toggleReadUser()">{{ ttsReadBtLabel }}</Button>
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

					<div class="card-item description" v-if="userDescription">{{userDescription}}</div>
				
					<div class="card-item messages" v-if="messageHistory.length > 0">
						<div class="header">
							<h2 class="title">{{ $t("usercard.messages") }}</h2>
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
import Config from '@/utils/Config';
import Utils from '@/utils/Utils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import type { Badges } from 'tmi.js';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';
import MessageItem from '../messages/MessageItem.vue';
import ChatModTools from '../messages/components/ChatModTools.vue';
import CustomUserBadges from './CustomUserBadges.vue';
import CustomBadgeSelector from './CustomBadgeSelector.vue';
import CustomBadgesManager from './CustomBadgesManager.vue';
import CustomUserNameManager from './CustomUserNameManager.vue';

@Component({
	components:{
		Button,
		CloseButton,
		MessageItem,
		ChatModTools,
		CustomUserBadges,
		CustomBadgeSelector,
		CustomBadgesManager,
		CustomUserNameManager,
	}
})
export default class UserCard extends Vue {

	public error:boolean = false;
	public loading:boolean = true;
	public edittingLogin:boolean = true;
	public manageBadges:boolean = false;
	public manageUserNames:boolean = false;
	public customLogin:string = "";
	public createDate:string = "";
	public followDate:string = "";
	public userDescription:string = "";
	public channelId:string = "";
	public user:TwitchatDataTypes.TwitchatUser|null = null;
	public fakeModMessage:TwitchatDataTypes.MessageChatData|null = null;
	public currentStream:TwitchDataTypes.StreamInfo|null = null;
	public followersCount:number = -1;
	public badges:TwitchatDataTypes.TwitchatUserBadge[] = [];
	public subState:TwitchDataTypes.Subscriber|null = null;
	public subStateLoaded:boolean = false;
	public messageHistory:TwitchatDataTypes.ChatMessageTypes[] = []
	public dateOffset:number = 0;
	public dateOffsetTimeout:number = -1;

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
	public get is_self():boolean{ return StoreProxy.auth.twitch.user.id === this.user?.id; }

	/**
	 * Get if user is being tracked or not
	 */
	public get is_tracked():boolean{ return this.user!.is_tracked; }

	/**
	 * Get if our followings can be listed
	 */
	public get canListFollowings():boolean{ return TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWINGS]); }

	/**
	 * Get if our followers can be listed
	 */
	public get canListFollowers():boolean{ return TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS]); }

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
			let entry:{user:TwitchatDataTypes.TwitchatUser, duration?:number} = {user:this.$store("users").getUserFrom(this.user.platform, uid, uid)}
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
		const permissions: TwitchatDataTypes.PermissionsData = this.$store("tts").params.ttsPerms;
		let label = "";
		if (permissions.usersAllowed.findIndex(v=>v.toLowerCase() === username) == -1) {
			label = this.$t("tts.read_user_start_light", {USER:username})
		} else {
			label = this.$t("tts.read_user_stop_light", {USER:username})
		}
		return label;
	}

	/**
	 * Get a formated timeout duration
	 * @param duration 
	 */
	public getFormatedTimeoutDuration(duration:number):string {
		return Utils.formatDuration(Math.max(0, duration - this.dateOffset));
	}

	public getFormatedFollowDate(f:TwitchDataTypes.FollowingOld):string {
		return Utils.formatDate(new Date(f.followed_at));
	}

	public mounted():void {
		watch(() => this.$store("users").userCard, () => {
			const card = this.$store("users").userCard;
			if(card && card.user) {
				this.user = this.$store("users").getUserFrom("twitch", card.channelId, card.user.id);
				this.channelId = card.channelId ?? StoreProxy.auth.twitch.user.id;
				this.loadUserInfo();
				this.dateOffsetTimeout = setInterval(() => {
					this.dateOffset += 1000;
				}, 1000);
			}else{
				this.user = null;
				clearInterval(this.dateOffsetTimeout);
			}
		});

		this.keyUpHandler = (e:KeyboardEvent):void => this.onKeyUp(e);
		document.body.addEventListener("keyup", this.keyUpHandler);
	}

	public beforeUnmount():void {
		clearInterval(this.messageBuildInterval);
		document.body.removeEventListener("keyup", this.keyUpHandler);
	}

	public close():void {
		this.$store("users").openUserCard(null);
	}

	public async loadUserInfo():Promise<void> {
		this.error = false;
		this.loading = true;
		this.createDate = "";
		this.followersCount = -1;
		this.followDate = "";
		this.currentStream = null;
		this.subState = null;
		this.subStateLoaded = false;
		this.customLogin = "";
		this.edittingLogin = false;
		this.manageBadges = false;
		this.manageUserNames = false;
		try {
			let user = this.user!;
			const loadFromLogin = user.login != this.$store("users").tmpDisplayName;
			const users = await TwitchUtils.loadUserInfo(loadFromLogin? undefined : [user.id], loadFromLogin? [user.login] : undefined);
			if(users.length > 0) {
				const u = users[0];
				user.login = u.login;
				user.displayName = u.display_name;
				user.displayNameOriginal = u.display_name;
				this.customLogin = this.$store("users").customUsernames[u.id]?.name || u.display_name;
				this.createDate = Utils.formatDate(new Date(u.created_at));
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
				if(user.channelInfo[this.channelId]?.badges?.length == 0) {
					const staticBadges:Badges = {};
					staticBadges[u.broadcaster_type] = "1";
					user.channelInfo[this.channelId].badges = TwitchUtils.getBadgesFromRawBadges(this.channelId, undefined, staticBadges);
				}
				
				//Async loading of data
				TwitchUtils.loadCurrentStreamInfo([u.id]).then(v=> {
					this.currentStream = v[0];
				});
				TwitchUtils.getFollowerState(u.id).then(v=> {
					if(v) this.followDate = Utils.formatDate(new Date(v.followed_at));
				});
				TwitchUtils.getFollowerCount(u.id).then(v=> {
					this.followersCount = v;
				});
				if(TwitchUtils.hasScopes([TwitchScopes.LIST_SUBSCRIBERS])) {
					TwitchUtils.getSubscriptionState([u.id]).then(v=> {
						this.subState = v.length > 0 ? v[0] : null;
						this.subStateLoaded = true;
					});
				}
				this.$store("users").loadUserPronouns(user);
				this.fakeModMessage = {
					id:Utils.getUUID(),
					platform:"twitch",
					date:Date.now(),
					type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
					user,
					channel_id: this.channelId,
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

	public openUserCard():void {
		let params = `scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no,
		width=350,height=500,left=100,top=100`;
		const url ="https://www.twitch.tv/popout/"+StoreProxy.auth.twitch.user.login+"/viewercard/"+this.user!.login;
		window.open(url, 'profilePage', params);
	}

	public trackUser():void {
		this.$store("users").trackUser(this.user!);
	}
	
	public untrackUser():void {
		this.$store("users").untrackUser(this.user!);
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
		if(!this.$store("users").setCustomUsername(this.user!, this.customLogin, this.channelId)) {
			this.manageUserNames = true;
		}
		//Update customLogin from the actual displayname.
		//If clearing the custom login, the real display name is loaded back to the
		//"displayName" getter .
		this.customLogin = this.user!.displayName;
	}

	/**
	 * Removes a custom badge from the user
	 * @param id 
	 */
	removeCustomBadge(id:string):void {
		this.$store("users").removeCustomBadge(this.user!, id, this.channelId);
	}

	/**
	 * Toggles whether the TTS should read this user's messages
	 */
	public toggleReadUser(): void {
		const permissions: TwitchatDataTypes.PermissionsData = this.$store("tts").params.ttsPerms;
		const read = permissions.usersAllowed.findIndex(v=>v.toLowerCase() === this.user!.login.toLowerCase()) == -1;
		this.$store("tts").ttsReadUser(this.user!, read);
	}

	/**
	 * Push user ID to clipboard
	 */
	public copyID():void {
		Utils.copyToClipboard(this.user!.id);
		gsap.from(this.$refs.userID as HTMLDivElement, {scale:1.5, ease:"back.out"});
	}

	/**
	 * Detect ESC key to close window
	 */
	private onKeyUp(e:KeyboardEvent):void {
		if(e.key == "Escape") {
			if(this.edittingLogin) {
				this.edittingLogin = false;
			}else{
				this.close();
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
		const allowedTypes:TwitchatDataTypes.TwitchatMessageStringType[] = ["following", "message", "reward", "subscription", "shoutout", "whisper", "ban", "unban", "cheer"]
		for (let i = this.$store("chat").messages.length-1; i > 0; i--) {
			const mess = this.$store("chat").messages[i];
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
			}
			if (messageList.length > 100) break;//Limit message count for perf reasons
		}

		//Build messages by batch to avoid lag on open
		this.messageHistory = messageList.splice(-20);
		clearInterval(this.messageBuildInterval);
		this.messageBuildInterval = setInterval(()=> {
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
</script>

<style scoped lang="less">
.usercard{
	.content {
		.loader {
			margin: auto;
			display: block;
			width: 2em;
			height: 2em;
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
	
				.label {
					text-overflow: ellipsis;
					overflow: hidden;
					line-height: 1.2em;
				}
	
				.translation {
					font-style: italic;
					font-size: .8em;
					margin-left: .25em;
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
					.icon {
						height: 100%;
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
	
			.pronouns, .originalName {
				font-style: italic;
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
	
		.ctas {
			display: flex;
			flex-direction: row;
			justify-content: center;
			flex-wrap: wrap;
			gap: .5em;
			flex-shrink: 0;//necessery for shit old safari -_-
		}
	
		.description {
			flex-shrink: 0;
			align-self: center;
			text-align: center;
			&::before {
				content: "“";
				font-family: var(--font-nunito);
				font-style: normal;
				font-size: 2em;
				line-height: .25em;
				vertical-align: text-bottom;
				margin-right: .25em;
			}
			&::after {
				content: "”";
				font-family: var(--font-nunito);
				font-style: normal;
				font-size: 2em;
				line-height: .25em;
				margin-left: .25em;
				vertical-align: text-bottom;
			}
		}
	
		.scrollable {
			overflow-y: auto;
			gap: 1em;
			display: flex;
			flex-direction: column;
			.card-item {
				flex-shrink: 0;
			}
		}
	
		.followings, .messages {
			display: flex;
			flex-direction: column;
	
			&.messages {
				.list {
					max-height: min(50vh, 300px);
					overflow-y: auto;
					text-align: left;
				}
			}
	
			&.followings {
				gap: .5em;
				display: flex;
				flex-direction: column;
				min-height: unset;
				.commonFollow, .disableDate {
					font-size: .8em;
					font-style: italic;
					align-self: center;
				}
	
				.warn {
					margin: .5em auto;
				}
	
				.loader {
					height: 2em;
					margin: .5em auto;
	
					&.scale-enter-active {
						transition: all .25s;
					}
	
					&.scale-leave-active {
						transition: all .25s;
					}
	
					&.scale-enter-from,
					&.scale-leave-to {
						height: 0;
						margin: 0 auto;
					}
				}
				
				.list {
					@itemWidth: 140px;
					display: grid;
					gap: .5em;
					grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));
	
					.user {
						gap: .25em;
						display: flex;
						flex-direction: column;
	
						&.common {
							padding: .25em .5em;
							border-radius: var(--border-radius);
							background-color: var(--color-primary-fader);
						}
	
						.login {
							display: inline-block;
							text-overflow: ellipsis;
							overflow: hidden;
							width: @itemWidth;
							text-decoration: none;
							white-space:nowrap;
							line-height: 1.2em;
						}
						.date {
							font-size: .7em;
						}
					}
				}
			}
		}
	}
}
</style>