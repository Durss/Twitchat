<template>
	<div class="usercard" v-if="user">
		<div class="dimmer" ref="dimmer" @click="close()"></div>

		<div class="holder" ref="holder" v-if="loading">
			<Button aria-label="Close live users list" small :icon="$image('icons/cross.svg')" class="closeBt" @click="close()" />
			<div class="head">
				<div class="title">{{user.displayName}}</div>
				<img src="@/assets/loader/loader.svg" alt="loader" class="loader">
			</div>
		</div>

		<div class="holder" ref="holder" v-else-if="error">
			<Button aria-label="Close live users list" small :icon="$image('icons/cross.svg')" class="closeBt" @click="close()" />
			<div class="head">
				<div class="title">{{user.displayName}}</div>
			</div>

			<div class="error">Something went wrong while loading user's profile...</div>
		</div>

		<div class="holder" ref="holder" v-else-if="!loading && !error">
			<Button aria-label="Close live users list" small :icon="$image('icons/cross.svg')" class="closeBt" @click="close()" />
			<div class="head">
				<img v-if="user!.avatarPath" :src="user!.avatarPath" alt="avatar" class="avatar" ref="avatar">
				<div class="live" v-if="currentStream">LIVE</div>
				<div class="title">
					<img v-for="b in badges" :key="b.id" class="badge" :src="b.icon.hd" :alt="b.title" :data-tooltip="b.title">
					<span>{{user.displayName}}</span>
				</div>
				<div class="subtitle" data-tooltip="copy" @click="copyID()" ref="userID">ID: {{user.id}}</div>
				<div class="date" data-tooltip="Account creation date"><img src="@/assets/icons/date_purple.svg" alt="account creation date" class="icon">{{createDate}}</div>
				<div class="date" data-tooltip="Follows you since" v-if="followDate"><img src="@/assets/icons/follow_purple.svg" alt="account creation date" class="icon">{{followDate}}</div>
				<div class="date" v-else><img src="@/assets/icons/unfollow_purple.svg" alt="account creation date" class="icon">Not following you</div>
			</div>

			<div class="liveInfo" v-if="currentStream">
				<div class="head">Streaming</div>
				<div class="infos">
					<div class="title">{{currentStream.title}}</div>
					<div class="game">{{currentStream.game_name}}</div>
				</div>
			</div>
			
			<ChatModTools class="modActions" :messageData="fakeModMessage" :canDelete="false" canBlock />
			
			<div class="ctas">
				<Button title="twitch profile" type="link" small :icon="$image('icons/newtab.svg')" :href="'https://www.twitch.tv/'+user!.login" target="_blank" />
				<Button title="viewer card" small :icon="$image('icons/newtab.svg')" @click="openViewerCard()" />
			</div>

			<div class="description" v-if="userDescription">{{userDescription}}</div>
			
			<div class="followings">
				<h2>Following list <span class="count" v-if="followings">({{followings.length}})</span></h2>
				<div class="commonFollow">{{commonFollowCount}} followings in common</div>
				<transition name="scale">
					<img src="@/assets/loader/loader.svg" alt="loader" class="loader" v-if="loadingFollowings">
				</transition>

				<div v-if="errorFollowings" class="error">Something went wrong while loading followings...</div>
				<div v-if="suspiciousFollowFrequency" class="warn">This user has or has had a suspicious following behavior</div>

				<div class="list" v-if="!errorFollowings" ref="list">
					<div v-for="u in followings" :class="myFollowings[u.to_id]===true? 'user common' : 'user'">
						<a :href="'https://twitch.tv/'+u.to_login" target="_blank" class="login">{{u.to_name}}</a>
						<div class="date">{{u.followed_at}}</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { storeUsers } from '@/store/users/storeUsers';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import UserSession from '@/utils/UserSession';
import Utils from '@/utils/Utils';
import { watch, watchEffect } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatModTools from '../messages/ChatModTools.vue';
import type { Badges } from 'tmi.js';

@Options({
	props:{},
	components:{
		Button,
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
	public followings:TwitchDataTypes.Following[] = [];
	public followInfo:TwitchDataTypes.Following|null = null;
	public myFollowings:{[key:string]:boolean} = {};
	public commonFollowCount:number = 0;
	public badges:TwitchatDataTypes.TwitchatUserBadge[] = [];
	// public subState:TwitchDataTypes.Subscriber|null = null;

	private keyUpHandler!:(e:KeyboardEvent)=>void;

	public mounted():void {
		const sUsers = storeUsers();
		watchEffect(() => {
			this.myFollowings = sUsers.myFollowings.twitch;
			const card = this.$store("users").userCard;
			if(card) {
				this.user = card.user;
				this.channelId = card.channelId ?? UserSession.instance.twitchUser!.id;
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
		this.followInfo = null;
		this.followings = [];
		this.loadingFollowings = true;
		this.commonFollowCount = 0;
		try {
			this.user = this.user!;
			const loadFromLogin = this.user.id.indexOf("temporary") === 0;
			const users = await TwitchUtils.loadUserInfo(loadFromLogin? undefined : [this.user.id], loadFromLogin? [this.user.login] : undefined);
			if(users.length > 0) {
				const u = users[0];
				this.currentStream = (await TwitchUtils.loadCurrentStreamInfo([u.id]))[0];
				this.createDate = Utils.formatDate(new Date(u.created_at));
				this.followInfo = await TwitchUtils.getFollowInfo(u.id);
				this.userDescription = u.description;
				this.user.avatarPath = u.profile_image_url;
				this.user.id = u.id;
				this.user.displayName = u.display_name;

				//Adding partner badge if no badge is already specified
				// if(!this.user.channelInfo[this.channelId]) {
				// 	//Missing channel info (probably because we're requesting a user via the /userinfo command)
				// 	//Ask
				// }
				if(this.user.channelInfo[this.channelId].badges.length == 0) {
					const staticBadges:Badges = {};
					staticBadges[u.broadcaster_type] = "1";
					this.user.channelInfo[this.channelId].badges = TwitchUtils.getBadgesFromRawBadges(this.channelId, undefined, staticBadges);
				}
				
				if(this.followInfo) {
					this.followDate = Utils.formatDate(new Date(this.followInfo.followed_at));
				}
				// this.subState = await TwitchUtils.getSubscriptionState(this.user.id);//needs a new scope
				this.fakeModMessage = {
					id:Utils.getUUID(),
					platform:"twitch",
					date:Date.now(),
					type: "message",
					user:this.user,
					channel_id: this.channelId,
					message: "",
					message_html: "",
					answers:[],
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
				this.followings = await TwitchUtils.getFollowings(this.user.id, -1, async(list)=> {
					const firstPage = this.followings.length == 0;
					this.followings = list;
					this.commonFollowCount = 0;
					this.computeCommonFollows();
					if(firstPage) {
						await this.$nextTick();
						gsap.from(this.$refs.list as HTMLDivElement, {duration:.5, height:0, ease:"sin.inOut"});
					}
				});
				this.checkFollowBotting();
				this.computeCommonFollows();
			}catch(error) {
				this.errorFollowings = true;
			}
			if(this.followings) {
				this.followings.forEach(v=> {
					v.followed_at = Utils.formatDate(new Date(v.followed_at));
				})
			}
			this.loadingFollowings = false;
		}
	}

	public openViewerCard():void {
		let params = `scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no,
		width=350,height=500,left=100,top=100`;
		const url ="https://www.twitch.tv/popout/"+UserSession.instance.twitchUser!.login+"/viewercard/"+this.user!.login;
		window.open(url, 'profilePage', params);
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
		min-width: 50%;
		max-height: 100vh;
		box-sizing: border-box;
		border-radius: 1em;
		display: flex;
		flex-direction: column;

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
			margin-bottom: .5em;
			display: flex;
			flex-direction: column;
			align-items: center;

			.title {
				font-size: 2em;
				display: flex;
				align-items: center;

				.badge {
					height: .8em;
				}
			}

			.live {
				background-color: @mainColor_alert;
				color: @mainColor_light;
				font-weight: bold;
				font-size: .5em;
				padding: .35em .75em;
				border-radius: .5em;
				margin-top: -1em;
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
			.date {
				font-size: .8em;
				margin-bottom: .5em;
				.icon {
					height: 1em;
					margin-right: .5em;
					vertical-align: top;
				}
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

		.liveInfo {
			align-self: center;
			margin-bottom: 1em;
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
			justify-content: space-evenly;
		}

		.description {
			text-align: center;
			margin-top: 1em;
			font-size: .8em;
			&::before {
				content: "“";
				font-family: "Nunito";
				font-style: normal;
				font-size: 2em;
				line-height: .25em;
				vertical-align: text-bottom;
				margin-right: .25em;
				color:@mainColor_normal_extralight
			}
			&::after {
				content: "”";
				font-family: "Nunito";
				font-style: normal;
				font-size: 2em;
				line-height: .25em;
				margin-left: .25em;
				vertical-align: text-bottom;
				color:@mainColor_normal_extralight
			}
		}

		.followings {
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

			.commonFollow {
				font-size: .8em;
				text-align: center;
				font-style: italic;
				margin: .5em 0;
				background-color: fade(@mainColor_normal, 10%);
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
				@itemWidth: 150px;
				overflow-y: auto;
				padding: .5em;
				display: grid;
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

@media only screen and (max-width: 500px) {
		
	.usercard{

		.dimmer {
			display: none;
		}

		&>.holder {
			max-width: unset;
			width: 100vw;
		}
	}
}
</style>