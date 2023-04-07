<template>
	<div class="usercard" v-if="user">
		<div class="dimmer" ref="dimmer" @click="close()"></div>

		<div class="holder" ref="holder" v-if="loading">
			<Button aria-label="close" small :icon="$image('icons/cross.svg')" class="closeBt" @click="close()" />
			<div class="head">
				<div class="title">
					<span class="label">{{user.displayName}}</span>
				</div>
				<img src="@/assets/loader/loader.svg" alt="loader" class="loader">
			</div>
		</div>

		<div class="holder" ref="holder" v-else-if="error">
			<Button aria-label="close" small :icon="$image('icons/cross.svg')" class="closeBt" @click="close()" />
			<div class="head">
				<div class="title">
					<span class="label">{{user.displayName}}</span>
				</div>
			</div>

			<div class="error">{{ $t("error.user_profile") }}</div>
		</div>

		<div class="holder" ref="holder" v-else-if="!loading && !error">
			<Button aria-label="close" small :icon="$image('icons/cross.svg')" class="closeBt" @click="close()" />
			<div class="head">
				<a :href="'https://www.twitch.tv/'+user!.login" target="_blank">
					<img v-if="user!.avatarPath" :src="user!.avatarPath" alt="avatar" class="avatar" ref="avatar">
					<div class="live" v-if="currentStream">LIVE</div>
					<div class="title">
						<img v-for="b in badges" :key="b.id" class="badge" :src="b.icon.hd" :alt="b.title" v-tooltip="b.title">
						<span class="label">{{user.displayName}}</span>
					</div>
				</a>
				<span class="translation" v-if="translateUsername">({{user.login}})</span>
				<div class="subtitle" v-tooltip="$t('global.copy')" @click="copyID()" ref="userID">ID: {{user.id}}</div>
			</div>
			
			<ChatModTools class="modActions" :messageData="fakeModMessage" :canDelete="false" canBlock />
			
			<div class="liveInfo" v-if="currentStream">
				<div class="head">{{ $t("usercard.streaming") }}</div>
				<div class="infos">
					<div class="title">{{currentStream.title}}</div>
					<div class="game">{{currentStream.game_name}}</div>
				</div>
			</div>

			<div class="infoList">
				<div class="info" v-tooltip="$t('usercard.creation_date_tt')"><img src="@/assets/icons/date_purple.svg" alt="account creation date" class="icon">{{createDate}}</div>
				
				<div class="info" v-if="followersCount > -1"><img src="@/assets/icons/follow_outline_purple.svg" class="icon">{{ $tc("usercard.followers", followersCount, {COUNT:followersCount}) }}</div>
				
				<div class="info" v-if="subState && subStateLoaded">
					<img src="@/assets/icons/gift_purple.svg" alt="subscribed" class="icon" v-if="subState.is_gift">
					<img src="@/assets/icons/sub_purple.svg" alt="subscribed" class="icon" v-else>
					<i18n-t scope="global" tag="span" :keypath="subState.is_gift? 'usercard.subgifted' : 'usercard.subscribed'">
						<template #TIER>{{ {"1000":1, "2000":2, "3000":3, prime:"prime"}[subState.tier] }}</template>
						<template #GIFTER>{{ subState.gifter_name }}</template>
					</i18n-t>
				</div>
				<div class="info" v-else-if="subStateLoaded">
					<img src="@/assets/icons/sub_purple.svg" alt="subscribed" class="icon">
					<span>{{ $t("usercard.non_subscribed") }}</span>
				</div>

				<div class="info" v-if="followDate && !is_self" v-tooltip="$t('usercard.follow_date_tt')"><img src="@/assets/icons/follow_purple.svg" alt="follow date" class="icon">{{followDate}}</div>
				<div class="info" v-else-if="!is_self"><img src="@/assets/icons/unfollow_purple.svg" alt="no follow" class="icon">{{$t('usercard.not_following')}}</div>
			</div>
			
			<div class="ctas">
				<Button :title="$t('usercard.profileBt')" type="link" small :icon="$image('icons/newtab.svg')" :href="'https://www.twitch.tv/'+user!.login" target="_blank" />
				<Button :title="$t('usercard.viewercardBt')" type="link" small :icon="$image('icons/newtab.svg')" @click.stop="openUserCard()" :href="'https://www.twitch.tv/popout/'+$store('auth').twitch.user.login+'/viewercard/'+user!.login" target="_blank" />
				<Button :title="$t('usercard.trackBt')" v-if="!is_tracked" small :icon="$image('icons/magnet.svg')" @click="trackUser()" />
				<Button :title="$t('usercard.untrackBt')" v-if="is_tracked" small :icon="$image('icons/magnet.svg')" @click="untrackUser()" />
				<Button :title="ttsReadBtLabel"  v-if="$store('tts').params.enabled === true" small :icon="$image('icons/tts.svg')" @click="toggleReadUser()" />
			</div>

			<div class="description" v-if="userDescription">{{userDescription}}</div>
			
			<div class="scrollable">
				<div class="messages" v-if="messageHistory.length > 0">
					<h2>{{ $t("usercard.messages") }}</h2>
	
					<div class="list">
						<div class="subholder" v-for="m in messageHistory" :key="m.id">
							<MessageItem class="message"
								disableConversation
								:messageData="m" />
						</div>
					</div>
				</div>
				
				<div class="followings" v-if="!followingsDisabled">
					<h2>Following list <span class="count" v-if="followings">({{followings.length}})</span></h2>
					<div class="disableDate">{{ $t("usercard.following_end", {DATE:endDateFormated}) }}</div>
					<div class="commonFollow" v-if="canListFollowings">{{commonFollowCount}} followings in common</div>
					<transition name="scale">
						<img src="@/assets/loader/loader.svg" alt="loader" class="loader" v-if="loadingFollowings">
					</transition>
	
					<div v-if="errorFollowings" class="error">Something went wrong while loading followings...</div>
					<div v-if="suspiciousFollowFrequency" class="warn">This user has or has had a suspicious following behavior</div>
	
					<div class="list" v-if="!errorFollowings" ref="list">
						<div v-for="u in followings" :class="myFollowings[u.to_id]===true? 'user common' : 'user'">
							<a :href="'https://twitch.tv/'+u.to_login" target="_blank" class="login">{{u.to_name}}</a>
							<div class="date">{{getFormatedDate(u)}}</div>
						</div>
					</div>
				</div>
			</div>
			</div>
	</div>
</template>

<script lang="ts">
import StoreProxy from '@/store/StoreProxy';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import type { Badges } from 'tmi.js';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import ChatModTools from '../messages/components/ChatModTools.vue';
import MessageItem from '../messages/MessageItem.vue';

@Component({
	components:{
		Button,
		MessageItem,
		ChatModTools,
	}
})
export default class UserCard extends Vue {

	public error:boolean = false;
	public errorFollowings:boolean = false;
	public suspiciousFollowFrequency:boolean = false;
	public loading:boolean = true;
	public loadingFollowings:boolean = true;
	public createDate:string = "";
	public followDate:string = "";
	public userDescription:string = "";
	public channelId:string = "";
	public user:TwitchatDataTypes.TwitchatUser|null = null;
	public fakeModMessage:TwitchatDataTypes.MessageChatData|null = null;
	public currentStream:TwitchDataTypes.StreamInfo|null = null;
	public followings:TwitchDataTypes.FollowingOld[] = [];
	public myFollowings:{[key:string]:boolean} = {};
	public followersCount:number = -1;
	public commonFollowCount:number = 0;
	public badges:TwitchatDataTypes.TwitchatUserBadge[] = [];
	public subState:TwitchDataTypes.Subscriber|null = null;
	public subStateLoaded:boolean = false;
	public modChans:TwitchatDataTypes.TwitchatUser[] = [];

	private keyUpHandler!:(e:KeyboardEvent)=>void;

	public get followingsDisabled():boolean {
		//Necessary Twitch API endpoint to get the followings of a user
		//will be shut down at this date
		return Date.now() >= Config.instance.FOLLOWERS_API_SHUTDOWN_DATE.getTime();
	}

	/**
	 * Get formated old followers API shutdown date
	 */
	public get endDateFormated():string {
		return Utils.formatDate(Config.instance.FOLLOWERS_API_SHUTDOWN_DATE, false);
	}

	/**
	 * Returns the login instead of the display name if the display name contains
	 * mostly non-latin chars
	 */
	public get translateUsername():boolean {
		const dname = this.user!.displayName.toLowerCase();
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
	 * Get users's message history
	 */
	public get messageHistory():TwitchatDataTypes.ChatMessageTypes[] {
		if(!this.user) return [];

		const messageList:TwitchatDataTypes.ChatMessageTypes[] = [];
		const allowedTypes:TwitchatDataTypes.TwitchatMessageStringType[] = ["following", "message", "reward", "subscription", "shoutout", "whisper", "ban", "unban"]
		const uid:string = this.user.id;
		for (let i = 0; i < this.$store("chat").messages.length; i++) {
			const mess = this.$store("chat").messages[i];
			if(!allowedTypes.includes(mess.type)) continue;
			if(mess.type == "shoutout" && mess.user.id == uid) {
				messageList.push(mess);
			}else if(mess.type == "following" && mess.user.id == uid) {
				messageList.push(mess);
			}else if((mess.type == "ban" || mess.type == "unban") && mess.user.id == uid) {
				messageList.push(mess);
			}else if((mess.type == "message" || mess.type == "whisper") && mess.user.id == uid) {
				messageList.push(mess);
			}else if(mess.type == "subscription" && mess.user.id == uid) {
				messageList.push(mess);
			}else if(mess.type == "reward" && mess.user.id == uid) {
				messageList.push(mess);
			}
			if (messageList.length > 100) break;//Limit to 100 for perf reasons
		}
		return messageList;
	}

	public getFormatedDate(f:TwitchDataTypes.FollowingOld):string {
		return Utils.formatDate(new Date(f.followed_at));
	}

	public mounted():void {
		watch(() => this.$store("users").userCard, () => {
			this.myFollowings = this.$store("users").myFollowings.twitch;

			const card = this.$store("users").userCard;
			if(card) {
				this.user = card.user;
				this.channelId = card.channelId ?? StoreProxy.auth.twitch.user.id;
				this.loadUserInfo();
			}else{
				this.user = null;
			}
		});

		this.keyUpHandler = (e:KeyboardEvent):void => this.onKeyUp(e);
		document.body.addEventListener("keyup", this.keyUpHandler);
	}

	public beforeUnmount():void {
		document.body.removeEventListener("keyup", this.keyUpHandler);
	}

	public close():void {
		this.$store("users").openUserCard(null);
	}

	public async loadUserInfo():Promise<void> {
		this.error = false;
		this.loading = true;
		this.followDate = "";
		this.createDate = "";
		this.followings = [];
		this.loadingFollowings = true;
		this.commonFollowCount = 0;
		this.followersCount = -1;
		this.followDate = "";
		this.subState = null;
		this.subStateLoaded = false;
		this.modChans = [
			this.$store("users").getUserFrom("twitch", this.$store("auth").twitch.user.id, "684410546", "mewstelle", "Mewstelle"),
			this.$store("users").getUserFrom("twitch", this.$store("auth").twitch.user.id, "43809079", "shakawah", "Shakawah"),
			this.$store("users").getUserFrom("twitch", this.$store("auth").twitch.user.id, "642638701", "fibertooth", "fibertooth"),
		];
		try {
			let user = this.user!;
			const loadFromLogin = user.temporary;
			const users = await TwitchUtils.loadUserInfo(loadFromLogin? undefined : [user.id], loadFromLogin? [user.login] : undefined);
			if(users.length > 0) {
				const u = users[0];
				this.createDate = Utils.formatDate(new Date(u.created_at));
				this.userDescription = u.description;
				user.avatarPath = u.profile_image_url;
				user.id = u.id;
				//Don't replace display name if already set.
				//Extensions like "Stream stickers" have a different display name
				//than the one sent back by the API.
				//Ex: when receiving s stream stickers event from pubsub, the display
				//name is "Stream Stickers", but its actual display name is "streamsticker".
				//This condition avoids replacing the first by the second.
				if(!user.displayName) user.displayName = u.display_name;

				//Adding partner badge if no badge is already specified
				if(user.channelInfo[this.channelId]?.badges.length == 0) {
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
				if(TwitchUtils.hasScopes([TwitchScopes.CHECK_SUBSCRIBER_STATE])) {
					 TwitchUtils.getSubscriptionState(u.id).then(v=> {
						this.subState = v;
						this.subStateLoaded = true;
					 })
				}
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
					answers:[],
					is_short:false,
				}
			}else{
				this.error = true;
			}
		}catch(error) {
			console.log(error);
			this.error = true;
		}

		this.loading = false;
		if(!this.error && this.user) {
			this.badges = this.user.channelInfo[this.channelId]?.badges ?? [];

			await this.$nextTick();
			gsap.from(this.$refs.avatar as HTMLDivElement, {duration:1, scale:0, ease:"back.out"})
		
			this.loadingFollowings = true;
			try {
				this.followings = await TwitchUtils.getFollowingsOld(this.user.id, -1, async(list)=> {
					const firstPage = this.followings.length == 0;
					this.followings = list;
					this.commonFollowCount = 0;
					this.computeCommonFollows();
					if(firstPage) {
						await this.$nextTick();
						gsap.from(this.$refs.list as HTMLDivElement, {duration:.5, height:0, ease:"sin.inOut", clearProps:"all"});
					}
				});
				this.checkFollowBotting();
				this.computeCommonFollows();
			}catch(error) {
				this.errorFollowings = true;
			}
			this.loadingFollowings = false;
		}
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
	 * Toggles whether the TTS should read this user's messages
	 */
	public toggleReadUser(): void {
		const permissions: TwitchatDataTypes.PermissionsData = this.$store("tts").params.ttsPerms;
		const read = permissions.usersAllowed.findIndex(v=>v.toLowerCase() === this.user!.login.toLowerCase()) == -1;
		this.$store("tts").ttsReadUser(this.user!, read);
	}

	public copyID():void {
		Utils.copyToClipboard(this.user!.id);
		gsap.from(this.$refs.userID as HTMLDivElement, {scale:1.5, ease:"back.out"});
	}

	public computeCommonFollows():void {
		this.commonFollowCount = 0;
		for (let i = 0; i < this.followings.length; i++) {
			if(this.myFollowings[this.followings[i].to_id] === true) {
				this.commonFollowCount ++;
			}
		}
	}

	/**
	 * Check for suspicious following behavior
	 */
	private checkFollowBotting():void {
		let followFrequency = 0;
		let fastFollowStreakCount = 0;
		let maxFastFollowStreakCount = 0;
		let checkMaxDelay = 3600000 * 24 * 30 * 4;//Ignore followings older than 4 months
		let recentFollowCount = 0;
		//Compute following frequency
		for (let i = 1; i < this.followings.length; i++) {
			let prevDate = new Date(this.followings[i-1].followed_at).getTime();
			let currentDate = new Date(this.followings[i].followed_at).getTime();
			if(Date.now() - prevDate > checkMaxDelay) {
				continue;
			}

			let diff = prevDate - currentDate;
			followFrequency += diff/1000;
			recentFollowCount ++;
			if(diff < 30000) {
				fastFollowStreakCount++;
				maxFastFollowStreakCount = Math.max(maxFastFollowStreakCount, fastFollowStreakCount);
			}else{
				fastFollowStreakCount = 0;
			}
		}
		followFrequency /= recentFollowCount;
		
		//If follow frequency is too high, and user has more than 10 follows (just in case it's a new user that followed a lot)
		if((followFrequency < 3 && recentFollowCount > 10)
		//Or if user followed more than 10 people with less than 30s between each
		|| maxFastFollowStreakCount >= 10) {
			this.suspiciousFollowFrequency = true
		}
	}

	private onKeyUp(e:KeyboardEvent):void {
		if(e.key == "Escape") {
			this.close();
		}
	}

}
</script>

<style scoped lang="less">
.usercard{
	z-index: 98;
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100vh;
	max-height: 100vh;

	&.hidden {
		display: none;
	}

	.dimmer {
		backdrop-filter: blur(2px);
		background-color: rgba(0,0,0,.7);
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	&>.holder {
		.center();
		position: absolute;
		background-color: @mainColor_light_extralight;
		padding: 1em;
		max-width: 800px;
		width: 80%;
		max-height: 100vh;
		box-sizing: border-box;
		border-radius: 1em;
		display: flex;
		flex-direction: column;
		overflow: auto;

		.closeBt {
			.clearButton();
			position: absolute;
			top:1em;
			right:1em;
			z-index: 1;
			width: 1.5em;
			height: 1.5em;
			:deep(.icon) {
				height: unset;
				width: unset;
				max-width: unset;
				max-height: unset;
			}
			&:hover {
				background-color: @mainColor_normal_extralight;
			}
		}

		.loader {
			margin: auto;
			display: block;
			width: 2em;
			height: 2em;
			margin-top: 1em;
		}

		.error, .warn {
			background-color: @mainColor_alert;
			color: @mainColor_light;
			padding: .25em .5em;
			border-radius: .5em;
			text-align: center;

			&.warn {
				background-color: @mainColor_warn;
			}
		}

		&>.head {
			display: flex;
			flex-direction: column;
			align-items: center;
			width: calc(100% - 3em);
			margin: .5em auto;
			a {
				text-decoration: none;
			}

			.title {
				font-size: 1.5em;
				display: flex;
				align-items: center;
				justify-content: center;
				width:100%;

				.label {
					text-overflow: ellipsis;
					overflow: hidden;
					line-height: 1.2em;
					color: @mainColor_normal;
				}

				.badge {
					height: .8em;
				}
			}

			.translation {
				font-size: 1em;
				font-style: italic;
			}

			.live {
				position: relative;
				display: block;
				background-color: @mainColor_alert;
				color: @mainColor_light;
				font-weight: bold;
				font-size: .5em;
				padding: .35em .75em;
				border-radius: .5em;
				margin-bottom: -1em;
				width: min-content;
				left: 50%;
				transform: translate(-50%, -50%);
				z-index: 1;
				box-shadow: 0 -.25em .5em rgba(0, 0, 0, .5);
			}

			.subtitle {
				font-size: .5em;
				cursor: copy;
				z-index: 1;
				margin-bottom: .5em;
				background: @mainColor_light;
			}

			.avatar {
				width: 3em;
				height: 3em;
				border-radius: 50%;
				margin: auto;
				display: block;
				border: 1px solid @mainColor_normal;
				transition: width .25s, height .25s, border-radius .25s;
				&:hover {
					width: 7em;
					height: 7em;
					border-radius: 0;
				}
			}
		}

		.infoList {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			gap: .5em;
			margin-bottom: .5em;
			.info {
				font-size: .7em;
				border-radius: .5em;
				border: 1px solid @mainColor_normal;
				padding: .25em .5em;
				.icon {
					height: 1em;
					margin-right: .5em;
					vertical-align: top;
				}
			}
		}

		.liveInfo {
			align-self: center;
			margin-bottom: .5em;
			.head {
				color: @mainColor_light;
				background-color: @mainColor_normal;
				border-top-left-radius: .5em;
				border-top-right-radius: .5em;
				padding: .25em;
				text-align: center;
			}
			.infos {
				padding: .5em;
				font-size: .8em;
				border: 1px solid @mainColor_normal;
				border-bottom-left-radius: .5em;
				border-bottom-right-radius: .5em;

				.game {
					font-style: italic;
					font-size: .8em;
				}
			}
		}

		.modActions {
			background-color: @mainColor_normal;
			padding: .3em .5em;
			border-radius: .5em;
			align-self: center;
			margin-bottom: .5em;
		}

		.ctas {
			display: flex;
			flex-direction: row;
			justify-content: center;
			flex-wrap: wrap;
			gap: .5em
		}

		.description {
			text-align: center;
			margin-top: 1em;
			font-size: .8em;
			&::before {
				content: "“";
				font-family: var(--font-nunito);
				font-style: normal;
				font-size: 2em;
				line-height: .25em;
				vertical-align: text-bottom;
				margin-right: .25em;
				color:@mainColor_normal_extralight
			}
			&::after {
				content: "”";
				font-family: var(--font-nunito);
				font-style: normal;
				font-size: 2em;
				line-height: .25em;
				margin-left: .25em;
				vertical-align: text-bottom;
				color:@mainColor_normal_extralight
			}
		}

		.scrollable {
			overflow-y: auto;
		}

		.followings, .messages {
			margin-top: 1em;
			border-radius: .5em;
			background-color: fade(@mainColor_normal, 10%);
			display: flex;
			flex-direction: column;
			min-height: 0;//For some reason this makes the holder actually scrollable...

			h2 {
				padding: .25em;
				text-align: center;
				border-top-left-radius: .5em;
				border-top-right-radius: .5em;
				color: @mainColor_light;
				background-color: @mainColor_normal;
				border-bottom-color: @mainColor_light;
				.count {
					font-style: italic;
					font-size: .8em;
					font-weight: normal;
					vertical-align: middle;
				}
			}

			&.messages {
				min-height: unset;
				margin-bottom: 1em;
				.list {
					background-color: @mainColor_dark;
					max-height: 50vh;
					overflow-y: auto;
					.message{
						position: relative;
					}
				}
			}

			&.followings {
				min-height: unset;
				.commonFollow, .disableDate {
					font-size: .8em;
					font-style: italic;
					margin: .5em 0;
					background-color: fade(@mainColor_normal, 10%);
					align-self: center;
				}
	
				.disableDate {
					background-color: fade(@mainColor_warn, 50%);
					color: @mainColor_dark;
					padding: .5em;
					border-radius: @border_radius;
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
					@itemWidth: 150px;
					padding: .5em;
					display: grid;
					// min-height: 13em;
					grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));
	
					.user {
						display: flex;
						flex-direction: column;
						padding: .1em;
	
						&.common {
							background-color: fade(@mainColor_normal, 10%);
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

@media only screen and (max-width: 600px) {
		
	.usercard{

		.dimmer {
			display: none;
		}

		&>.holder {
			max-width: unset;
			height: 100%;
			width: 100vw;
			top: 0;
			left: 0;
			transform: none;
		}
	}
}
</style>