<template>
	<div class="raidstate">
		<img v-if="user && user.avatarPath" :src="user.avatarPath" alt="avatar" class="avatar">
		<div>
			<i18n-t scope="global" tag="span" keypath="raid.raiding">
				<template #USER><strong>{{raidInfo.user.displayName}}</strong></template>
				<template #VIEWERS><strong>{{raidInfo.viewerCount}}</strong></template>
				<template #TIMER><span class="timer">{{timeLeft}}s</span></template>
			</i18n-t>
		</div>

		<div class="alert">{{ $t("raid.cant_force", {TIMER:timeLeft}) }}</div>

		<ToggleBlock class="bannedAlert" v-if="bannedOnline.length > 0 || timedoutOnline.length > 0"
		medium :open="false"
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
					<img src="@/assets/icons/ban.svg" data-tooltip="Timeout">
					<a @click.stop="openUserCard(u)" class="login">{{ u.login }}</a>
				</li>
				<li class="user" v-for="(u, index) in timedoutOnline" :key="index + u.id">
					<img src="@/assets/icons/timeout.svg" data-tooltip="Timeout">
					<a @click.stop="openUserCard(u)" class="login">{{ u.login }}</a>
					<span class="duration">({{ getBanDuration(u) }})</span>
				</li>
			</ul>
			<div class="ctas">
				<Button type="button"
					:icon="$image('icons/copy_alert.svg')"
					bounce white
					:title="$t('raid.copy_logins')"
					@click="copybannedUsers()" />
			</div>
		</ToggleBlock>

		<Button class="cancelBt" type="button"
			:icon="$image('icons/cross_white.svg')"
			bounce highlight
			:title="$t('global.cancel')"
			@click="cancelRaid()" />

	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Component({
	components:{
		Button,
		ToggleBlock,
	}
})
export default class RaidState extends Vue {

	public timeLeft = "";
	public user:TwitchatDataTypes.TwitchatUser|null = null;
	public bannedOnline:TwitchatDataTypes.TwitchatUser[] = [];
	public timedoutOnline:TwitchatDataTypes.TwitchatUser[] = [];

	private timerDuration = 90000;
	private timerStart = 0;
	private timerInterval!:number;

	public get raidInfo() { return this.$store("stream").currentRaid!; }

	public getBanDuration(user:TwitchatDataTypes.TwitchatUser):string {
		const chanInfo = user.channelInfo[this.$store("auth").twitch.user.id];
		const remaining = chanInfo.banEndDate! - Date.now();
		return Utils.formatDuration(remaining)+"s";
	}

	public async mounted():Promise<void> {
		this.timerStart = Date.now();
		this.timerInterval = window.setInterval(()=> {
			this.updateTimer();
		}, 250);
		
		const raid = this.$store("stream").currentRaid;
		if(raid) {
			this.user = raid.user;
		}

		const userlist = this.$store("users").users;
		const me = this.$store("auth").twitch.user;
		const bannedOnline:TwitchatDataTypes.TwitchatUser[] = [];
		const timedoutOnline:TwitchatDataTypes.TwitchatUser[] = [];
		//Check for banned and timedout users stille connected to the chat
		for (let i = 0; i < userlist.length; i++) {
			const u = userlist[i];
			/*
			//Debug to add random banned users
			//@ts-ignore
			if(!u.channelInfo[me.id]) u.channelInfo[me.id] = {};
			if(Math.random() > .5) {
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
			this.$store("stream").setRaiding(undefined);
			return;
		}
		this.timeLeft = Utils.formatDuration(seconds);
	}

	public cancelRaid():void {
		TwitchUtils.raidCancel();
	}

	public openUserCard(u:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(u);
	}

	public copybannedUsers():void {
		const list = this.bannedOnline.concat().concat(this.timedoutOnline);
		Utils.copyToClipboard(list.map(v=>v.login).join(", "));
	}

}
</script>

<style scoped lang="less">
.raidstate{
	color: @mainColor_light;
	text-align: center;

	.avatar {
		width: 3em;
		border-radius: 50%;
		margin: auto;
		margin-bottom: .25em;
		border: 2px solid @mainColor_light;
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

	.cancelBt {
		margin-top: 10px;
	}

	.startBt {
		margin-top: 10px;
		pointer-events: none;
	}

	.alert {
		margin-top: 10px;
		font-size: .7em;
		padding: .55em;
		background-color: fade(@mainColor_alert, 50%);
		border-radius: .5em;
	}

	.bannedAlert {
		display: flex;
		flex-direction: column;
		margin-top: 1em;
		font-size: .8em;
		text-align: left;
		.icon {
			height: 1em;
			margin-left: .5em;
		}
		:deep(.header) {
			background: @mainColor_alert;
			&:hover {
				background: @mainColor_alert_light;
			}
		}
		:deep(.content) {
			background: darken(@mainColor_alert, 20%);
		}
		.list{
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
					color: @mainColor_light;
					&:hover {
						background-color: fade(@mainColor_light, 20%);
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
			text-align: center;
			margin-top: .5em;
			.button {
				color: @mainColor_alert;
			}
		}
	}
}
</style>