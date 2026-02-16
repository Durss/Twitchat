<template>
	<div class="raidstate gameStateWindow" v-if="user">
		<div class="head" v-stickyTopShadow>
			<div class="subHolder">
				<h1 class="title"><icon name="raid" />
					{{ raidInfo.user.displayName }}
	
					<img :src="user.avatarPath" alt="avatar" class="avatar">
	
					<img v-if="!isOwnRaid && remoteChan && !remoteChan.temporary"
						:src="remoteChan.avatarPath"
						alt="avatar"
						class="avatar mini"
						v-tooltip="remoteChan.displayName"
						referrerpolicy="no-referrer">
				</h1>
				<div class="roomInfo">
					<mark class="viewerCount" @click="censorCount = !censorCount" v-tooltip="$t('raid.viewers')">
						<icon name="show"/>
						<span v-if="!censorCount">{{raidInfo.viewerCount}}</span>
						<span v-else class="censored">{{raidInfo.viewerCount}}</span>
					</mark>
					<mark v-if="roomSettings?.subOnly == true"><icon name="sub"/>{{ $t("raid.sub_only") }}</mark>
					<mark v-if="roomSettings?.followOnly == true"><icon name="follow"/>{{ $t("raid.follower_only") }}</mark>
					<mark v-if="roomSettings?.emotesOnly == true"><icon name="emote"/>{{ $t("raid.emote_only") }}</mark>
				</div>
			</div>

			<ProgressBar secondary v-if="timerPercent < 1"
				:percent="timerPercent"
				:duration="raidInfo.timerDuration_s * 1000"
			/>

			<slot />
		</div>

		<div class="body" v-if="loading">
			<icon name="loader" />
		</div>

		<div class="body" v-else>
			<div class="actions">
				<TTButton icon="cross" alert @click="cancelRaid()" v-if="isOwnRaid" :loading="canceling" v-tooltip="$t('raid.cancel_raid')"/>
				<TTButton light @click="remoteConnect()" v-if="canRemoteConnect" :loading="remoteConnecting" icon="offline" v-tooltip="$t('raid.remote_chat', {USER:user!.displayNameOriginal})"/>
				<TTButton light @click="spamLink()" v-if="isOwnRaid" :loading="coolingDownSpam" icon="whispers" v-tooltip="$t('raid.spam_linkBt')"/>
				<TTButton light @click="openSummary()" v-if="isOwnRaid" icon="poll" v-tooltip="$t('raid.stream_summaryBt')"/>
			</div>

			<div class="card-item infos" v-if="!isModeratedChan && raidingLatestRaid"><Icon name="info" />{{ $t("raid.target_channel_previous_raid") }}</div>
	
			<div class="card-item infos alert" v-if="targetChannelOffline"><Icon name="alert" />{{ $t("raid.target_channel_offline") }}</div>
	
			<ToggleBlock class="bannedAlert" v-if="isModeratedChan && bannedOnline.length > 0 || timedoutOnline.length > 0"
			alert medium :open="false"
			:title="$t('raid.banned_users_title', {COUNT:(bannedOnline.length + timedoutOnline.length)}, (bannedOnline.length + timedoutOnline.length))">
				<template #left_actions>
					<Icon name="alert" class="icon"/>
				</template>
				<i18n-t scope="global" tag="div" keypath="raid.banned_users" class="head">
					<template #USER>
						<strong>{{ raidInfo.user.displayName }}</strong>
					</template>
				</i18n-t>
				<ul class="list">
					<li class="user" v-for="(u, index) in bannedOnline" :key="index + u.id">
						<Icon name="ban" v-tooltip="'Ban'"/>
						<a :href="'https://twitch.tv/'+u.login" target="_blank"
						@click.stop.prevent="openUserCard(u)" class="login">{{ u.login }}</a>
					</li>
					<li class="user" v-for="(u, index) in timedoutOnline" :key="index + u.id">
						<Icon name="timeout" v-tooltip="'Timeout'"/>
						<a :href="'https://twitch.tv/'+u.login" target="_blank"
						@click.stop.prevent="openUserCard(u)" class="login">{{ u.login }}</a>
						<span class="duration">({{ getBanDuration(u) }})</span>
					</li>
				</ul>
				<div class="actions">
					<TTButton ref="copyBt"
						icon="copy" alert
						@click="copybannedUsers()">{{ $t('raid.copy_logins') }}</TTButton>
				</div>
			</ToggleBlock>
	
			<div class="card-item infos" v-if="isOwnRaid">{{ $t("raid.cant_force", {TIMER:timeLeft}) }}</div>
		</div>

	</div>
</template>

<script lang="ts">
import MessengerProxy from '@/messaging/MessengerProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap';
import type { ComponentPublicInstance } from 'vue';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import ToggleBlock from '../ToggleBlock.vue';
import TTButton from '../TTButton.vue';
import ProgressBar from '../ProgressBar.vue';

@Component({
	components:{
		TTButton,
		ProgressBar,
		ToggleBlock,
	}
})
class RaidState extends Vue {

	public timeLeft = "";
	public loading = false;
	public isOwnRaid = false;
	public canceling = false;
	public censorCount = false;
	public canRemoteConnect = false;
	public remoteConnecting = false;
	public coolingDownSpam = false;
	public raidingLatestRaid = false;
	public targetChannelOffline = false;
	public user:TwitchatDataTypes.TwitchatUser|null = null;
	public remoteChan:TwitchatDataTypes.TwitchatUser|null = null;
	public bannedOnline:TwitchatDataTypes.TwitchatUser[] = [];
	public timedoutOnline:TwitchatDataTypes.TwitchatUser[] = [];
	public roomSettings:TwitchatDataTypes.IRoomSettings|null = null;
	public timerPercent:number = 0;

	private timerInterval:number = -1;

	public get raidInfo() { return this.$store.stream.currentRaid!; }
	public get isModeratedChan() {
		if(!this.user) return false;
		const chaninfo = this.$store.auth.twitch.user.channelInfo[this.user.id];
		if(!chaninfo) return false;
		return chaninfo.is_broadcaster || chaninfo.is_moderator;
	}

	public getBanDuration(user:TwitchatDataTypes.TwitchatUser):string {
		const chanInfo = user.channelInfo[this.$store.auth.twitch.user.id];
		if(!chanInfo || !chanInfo.banEndDate) return "???";
		const remaining = chanInfo.banEndDate! - Date.now();
		return Utils.formatDuration(remaining)+"s";
	}

	public async mounted():Promise<void> {
		this.updateTimer();
		this.timerInterval = window.setInterval(()=> {
			this.updateTimer();
		}, 250);

		this.censorCount = this.$store.params.appearance.showViewersCount.value !== true;

		this.canRemoteConnect = this.$store.stream.connectedTwitchChans.findIndex(v=>v.user.id === this.raidInfo.user.id) == -1;

		const raid = this.$store.stream.currentRaid;
		if(raid) {
			this.loading = true;
			this.user = raid.user;
			this.roomSettings = await TwitchUtils.getRoomSettings(this.user.id);
			const liveInfos = await TwitchUtils.getCurrentStreamInfo([this.user.id]);
			this.targetChannelOffline = liveInfos.length == 0;
			const latestRaid = (this.$store.stream.raidHistory || []).slice(-1)[0]!;
			this.raidingLatestRaid = latestRaid && latestRaid.uid === raid.user.id;
			this.isOwnRaid = this.$store.auth.twitch.user.id == raid.channel_id;
			if(!this.isOwnRaid) {
				this.remoteChan = await this.$store.users.getUserFrom("twitch", this.$store.auth.twitch.user.id, raid.channel_id);
			}
			this.loading = false;
		}

		const userlist = this.$store.users.users;
		const me = this.$store.auth.twitch.user;
		const bannedOnline:TwitchatDataTypes.TwitchatUser[] = [];
		const timedoutOnline:TwitchatDataTypes.TwitchatUser[] = [];
		//Check for banned and timedout users still connected to the chat
		for (const u of userlist) {
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
		/* Add fake banned users
		let u = this.$store.users.getUserFrom("twitch", me.id, "2521956","marinelepen","marinelepen");
		u.channelInfo[me.id].online = true;
		u.channelInfo[me.id].is_banned = true;
		u.channelInfo[me.id].lastActivityDate = Date.now();
		u.channelInfo[me.id].banEndDate = Date.now() + (Math.random()*20*60*1000);
		timedoutOnline.push(u);
		u = this.$store.users.getUserFrom("twitch", me.id, "441488346","jordanbardella","jordanbardella");
		u.channelInfo[me.id].online = true;
		u.channelInfo[me.id].is_banned = true;
		u.channelInfo[me.id].lastActivityDate = Date.now();
		bannedOnline.push(u);
		//*/

		this.bannedOnline = bannedOnline;
		this.timedoutOnline = timedoutOnline;
	}

	public beforeUnmount():void {
		clearInterval(this.timerInterval);
	}

	public updateTimer():void {
		const seconds = this.raidInfo.timerDuration_s * 1000 - (Date.now() - this.raidInfo.startedAt);
		if(seconds <= 0) {
			this.$store.stream.onRaidComplete();
			return;
		}
		this.timeLeft = Utils.formatDuration(seconds);
		this.timerPercent = 1 - (seconds / (this.raidInfo.timerDuration_s * 1000));
	}

	public async cancelRaid():Promise<void> {
		this.canceling = true;
		await TwitchUtils.raidCancel();
		await Utils.promisedTimeout(500);
		this.canceling = false;
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
		const bt = this.$refs.copyBt as ComponentPublicInstance;
		gsap.fromTo(bt.$el, {filter:"brightness(3)"}, {filter:"brightness(1)", duration:.25});
	}

	/**
	 * Connect to raided chat
	 */
	public remoteConnect():void {
		this.remoteConnecting = true;
		this.$store.stream.connectToExtraChan(this.user!);
		window.setTimeout(()=>{
			this.canRemoteConnect = false;
		},500)
	}
}
export default toNative(RaidState);
</script>

<style scoped lang="less">
.raidstate{

	.subHolder {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: .5em;
		flex-wrap: wrap;

		.viewerCount {
			cursor: pointer;
			.censored {
				filter: blur(5px);
			}
		}

		mark {
			display: flex;
			flex-direction: row;
			align-items: center;
			background-color: rgba(0,0,0,.25);

			.icon {
				height: 1em;
				margin-right: .25em;
			}
		}

		.roomInfo {
			display: flex;
			flex-direction: row;
			align-items: center;
			flex-wrap: wrap;
			gap: .25em;

			mark {
				padding: .2em .5em;
				font-size: .8em;
			}
			& > mark {
				flex-shrink: 0;
			}
		}
	}

	.avatar {
		border-radius: 50%;
	}

	.timer {
		font-variant-numeric: tabular-nums;
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
			margin-right: .25em;
		}
		
		&:not(.alert) {
			font-style: italic;
			background-color: rgba(0,0,0,.25);
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
		.actions {
			margin-top: .5em;
		}
	}
}
</style>
