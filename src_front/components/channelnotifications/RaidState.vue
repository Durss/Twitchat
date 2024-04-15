<template>
	<div class="raidstate gameStateWindow">
		<div class="head">
			<a v-if="user && user.avatarPath" :href="'https://twitch.tv/'+user.login" target="_blank">
				<img :src="user.avatarPath" alt="avatar" class="avatar">
			</a>
			<i18n-t scope="global" tag="span" keypath="raid.raiding">
				<template #USER>
					<a :href="'https://twitch.tv/'+raidInfo.user.login" target="_blank" class="userLink">
						<img src="@/assets/icons/newtab.svg" alt="open in new tab">
						{{raidInfo.user.displayName}}
					</a>
				</template>
				<template #VIEWERS>
					<strong @click="censorCount = true" class="viewerCount" v-if="!censorCount">{{raidInfo.viewerCount}}</strong>
					<strong @click="censorCount = false" class="viewerCount censored" v-else>x</strong>
				</template>
				<template #TIMER><span class="timer">{{timeLeft}}s</span></template>
			</i18n-t>

			<div class="roomSettings" v-if="roomSettings">
				<mark v-if="roomSettings.subOnly == true">{{ $t("raid.sub_only") }}</mark>
				<mark v-if="roomSettings.followOnly !== false">{{ $t("raid.follower_only") }}</mark>
				<mark v-if="roomSettings.emotesOnly == true">{{ $t("raid.emote_only") }}</mark>
			</div>
		</div>

		<div class="card-item secondary infos" v-if="raidingLatestRaid"><Icon name="info" />{{ $t("raid.target_channel_previous_raid") }}</div>

		<div class="card-item alert infos" v-if="targetChannelOffline"><Icon name="alert" />{{ $t("raid.target_channel_offline") }}</div>

		<ToggleBlock class="bannedAlert" v-if="bannedOnline.length > 0 || timedoutOnline.length > 0"
		alert medium :open="false"
		:title="$tc('raid.banned_users_title', (bannedOnline.length + timedoutOnline.length), {COUNT:(bannedOnline.length + timedoutOnline.length)})">
			<template #left_actions>
				<img src="@/assets/icons/alert.svg" class="icon">
			</template>
			<i18n-t scope="global" tag="div" keypath="raid.banned_users" class="head">
				<template #USER>
					<strong>{{ raidInfo.user.displayName }}</strong>
				</template>
			</i18n-t>
			<ul class="list">
				<li class="user" v-for="(u, index) in bannedOnline" :key="index + u.id">
					<img src="@/assets/icons/ban.svg" v-tooltip="'Ban'">
					<a :href="'https://twitch.tv/'+u.login" target="_blank"
					@click.stop.prevent="openUserCard(u)" class="login">{{ u.login }}</a>
				</li>
				<li class="user" v-for="(u, index) in timedoutOnline" :key="index + u.id">
					<img src="@/assets/icons/timeout.svg" v-tooltip="'Timeout'">
					<a :href="'https://twitch.tv/'+u.login" target="_blank"
					@click.stop.prevent="openUserCard(u)" class="login">{{ u.login }}</a>
					<span class="duration">({{ getBanDuration(u) }})</span>
				</li>
			</ul>
			<div class="ctas">
				<Button ref="copyBt"
					icon="copy" alert
					@click="copybannedUsers()">{{ $t('raid.copy_logins') }}</Button>
			</div>
		</ToggleBlock>

		<div class="ctas">
			<Button light @click="spamLink()" :loading="coolingDownSpam" v-newflag="{date:1693519200000, id:'raid_spam'}">{{ $t('raid.spam_linkBt') }}</Button>
			<Button light @click="openSummary()" v-newflag="{date:1693519200000, id:'raid_summary'}">{{ $t('raid.stream_summaryBt') }}</Button>
		</div>

		<Button icon="cross" alert @click="cancelRaid()" v-if="canCancel">{{ $t('global.cancel') }}</Button>

		<div class="card-item infos">{{ $t("raid.cant_force", {TIMER:timeLeft}) }}</div>

	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import { gsap } from 'gsap';
import MessengerProxy from '@/messaging/MessengerProxy';

@Component({
	components:{
		Button: TTButton,
		ToggleBlock,
	}
})
 class RaidState extends Vue {

	public timeLeft = "";
	public censorCount = false;
	public coolingDownSpam = false;
	public raidingLatestRaid = false;
	public targetChannelOffline = false;
	public user:TwitchatDataTypes.TwitchatUser|null = null;
	public bannedOnline:TwitchatDataTypes.TwitchatUser[] = [];
	public timedoutOnline:TwitchatDataTypes.TwitchatUser[] = [];
	public roomSettings:TwitchatDataTypes.IRoomSettings|null = null;

	private timerDuration = 90000;
	private timerStart = 0;
	private timerInterval:number = -1;

	public get raidInfo() { return this.$store.stream.currentRaid!; }
	public get canCancel() {
		return true;
		// if(!this.user) return false;
		// const chaninfo = this.$store.auth.twitch.user.channelInfo[this.user.id];
		// if(!chaninfo) return false;
		// return chaninfo.is_broadcaster || chaninfo.is_moderator;
	}

	public getBanDuration(user:TwitchatDataTypes.TwitchatUser):string {
		const chanInfo = user.channelInfo[this.$store.auth.twitch.user.id];
		const remaining = chanInfo.banEndDate! - Date.now();
		return Utils.formatDuration(remaining)+"s";
	}

	public async mounted():Promise<void> {
		this.timerStart = Date.now();
		this.timerInterval = window.setInterval(()=> {
			this.updateTimer();
		}, 250);

		this.censorCount = this.$store.params.appearance.showViewersCount.value !== true;

		const raid = this.$store.stream.currentRaid;
		if(raid) {
			this.user = raid.user;
			this.roomSettings = await TwitchUtils.getRoomSettings(this.user.id);
			const liveInfos = await TwitchUtils.loadCurrentStreamInfo([this.user.id]);
			this.targetChannelOffline = liveInfos.length == 0;


			const latestRaid = (this.$store.stream.raidHistory || []).slice(-1)[0];
			this.raidingLatestRaid = latestRaid && latestRaid.uid === raid.user.id;
		}

		const userlist = this.$store.users.users;
		const me = this.$store.auth.twitch.user;
		const bannedOnline:TwitchatDataTypes.TwitchatUser[] = [];
		const timedoutOnline:TwitchatDataTypes.TwitchatUser[] = [];
		//Check for banned and timedout users still connected to the chat
		for (let i = 0; i < userlist.length; i++) {
			const u = userlist[i];
			/*
			//Debug to add random banned users
			//@ts-ignore
			if(!u.channelInfo[me.id]) u.channelInfo[me.id] = {};
			if(Math.random() > .95) {
				u.channelInfo[me.id].online = true;
				u.channelInfo[me.id].is_banned = true;
				u.channelInfo[me.id].lastActivityDate = Date.now() - 1000;
				if(Math.random() > .75) {
					u.channelInfo[me.id].banEndDate = Date.now() + (Math.random()*20*60*1000);
				}
			}
			//*/

			//User online?
			if(u.platform === "twitch") {
				if(u.channelInfo[me.id]?.is_banned === true) {
					if(u.channelInfo[me.id]?.banEndDate != undefined) {
						//User timedout
						if(u.channelInfo[me.id]?.online === true) timedoutOnline.push(u);
					}else if(u.channelInfo[me.id]?.lastActivityDate){
						//User perma ban
						bannedOnline.push(u);
					}
				}
			}
		}
		this.bannedOnline = bannedOnline;
		this.timedoutOnline = timedoutOnline;
	}

	public beforeUnmount():void {
		clearInterval(this.timerInterval);
	}

	public updateTimer():void {
		const seconds = this.timerDuration - (Date.now() - this.timerStart);
		if(seconds <= 0) {
			this.$store.stream.onRaidComplete();
			return;
		}
		this.timeLeft = Utils.formatDuration(seconds);
	}

	public cancelRaid():void {
		TwitchUtils.raidCancel();
	}

	public async spamLink():Promise<void> {
		this.coolingDownSpam = true;
		for (let i = 0; i < 10; i++) {
			MessengerProxy.instance.sendMessage("https://twitch.tv/"+this.raidInfo.user.login, ["twitch"]);
			await Utils.promisedTimeout(50);
		}
		await Utils.promisedTimeout(1000);
		this.coolingDownSpam = false;
	}

	public openSummary():void {
		this.$store.params.openModal("streamSummary");
	}

	public openUserCard(u:TwitchatDataTypes.TwitchatUser):void {
		this.$store.users.openUserCard(u);
	}

	public copybannedUsers():void {
		const list = this.bannedOnline.concat().concat(this.timedoutOnline);
		Utils.copyToClipboard(list.map(v=>v.login).join(", "));
		const bt = this.$refs.copyBt as Vue;
		gsap.fromTo(bt.$el, {filter:"brightness(3)"}, {filter:"brightness(1)", duration:.25});
	}

}
export default toNative(RaidState);
</script>

<style scoped lang="less">
.raidstate{

	&>.head {
		display: flex;
		flex-direction: column;
		align-items: center;
		.avatar {
			width: 3em;
			border-radius: 50%;
			margin: auto;
		}

		.userLink {
			display: inline;
			color: var(--color-text-light);
			img {
				height: 1em;
				vertical-align: middle;
			}
		}

		.viewerCount {
			cursor: pointer;
			&.censored {
				padding: 0 .25em;
				border-radius: var(--border-radius);
				background-color: var(--background-color-fader);
				&:hover {
					background-color: var(--background-color-fadest);
				}
			}
		}
	}

	.icon {
		height: 25px;
		vertical-align: middle;
		margin-right: .5em;
	}

	.timer {
		font-size: .8em;
		font-family: var(--font-azeret);
	}

	.startBt {
		pointer-events: none;
	}

	.infos {
		font-size: .9em;
		flex-shrink: 0;
		text-align: center;
		.icon {
			height: 1em;
		}

		&:not(.alert) {
			font-style: italic;
		}
	}

	.roomSettings {
		gap: .5em;
		display: flex;
		flex-wrap: wrap;
		flex-direction: row;
		margin-top: .25em;
		mark {
			background-color: rgba(0,0,0,.25);
			padding: .2em .5em;
		}
	}

	.bannedAlert {
		.icon {
			height: 1em;
			margin-left: .5em;
		}
		.list{
			font-size: .8em;
			max-height: 200px;
			overflow: auto;
			.user {
				display: flex;
				flex-direction: row;
				align-items: center;
				margin-top: .5em;
				img {
					height: 1em;
					margin-right: .5em;
					vertical-align: middle;
				}
				.login {
					color: var(--color-light);
					text-decoration: none;
					&:hover {
						text-decoration: underline;
					}
				}
				.duration {
					margin-left: .5em;
					font-size: .8em;
					font-style: italic;
				}
			}
		}
		.ctas {
			margin-top: .5em;
		}
	}
	.ctas {
		gap: .5em;
		display: flex;
		flex-direction: row;
		justify-content: center;
		flex-wrap: wrap;
	}
}
</style>
