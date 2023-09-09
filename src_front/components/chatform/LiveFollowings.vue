<template>
	<div class="livefollowings sidePanel">
		
		<div class="head">
			<h1 v-if="showRaidHistory" ><Icon name="user" class="icon" />{{$t('raid.raid_historyBt')}}</h1>
			<h1 v-else><Icon name="user" class="icon" />{{$t('cmdmenu.whoslive_title')}}</h1>
			<CloseButton :aria-label="$t('liveusers.closeBt_aria')" @click="close()" />

			<Button class="actionBt" small v-if="!showRaidHistory && $store('stream').raidHistory.length > 0" icon="raid" @click="showRaidHistory = true">{{ $t("raid.raid_historyBt") }}</Button>
			<Button class="actionBt" small v-if="showRaidHistory" icon="live" @click="showRaidHistory = false">{{ $t("raid.raid_liveBt") }}</Button>
		</div>
		
		<div class="content">
			<Icon name="loader" alt="loading" class="loader" v-if="loading" />

			<div class="needScope" v-if="needScope">
				<span>{{ $t("liveusers.scope_grant") }}</span>
				<Button icon="unlock" @click="grantPermission()">{{ $t('liveusers.scope_grantBt') }}</Button>
			</div>
			<div class="noResult" v-else-if="!loading && streams?.length == 0">{{ $t('liveusers.none') }}</div>

			<div class="history" v-else-if="showRaidHistory">
				<a :href="'https://twitch.tv/'+entry.user.login" v-for="entry in sortedRaidHistoryPopulated" class="card-item user" @click.prevent="raid(entry.user.login)">
					<Icon name="loader" v-if="entry.user.temporary" />
					<img class="icon" v-else-if="entry.user.avatarPath" :src="entry.user.avatarPath" lazy>
					<div class="login">{{ entry.user.login }}</div>
					<div class="date">{{ getElapsedDuration(entry.date) }}</div>
				</a>
			</div>
			
			<div class="list" v-else>
				<a :href="'https://twitch.tv/'+s.user_login" v-for="s in streams" :key="s.id" class="card-item stream" ref="streamCard" @click.prevent="raid(s.user_login)">
					<div class="header">
						<img class="icon" :src="getProfilePicURL(s)" alt="">
						<span class="title">{{s.user_name}}</span>
					</div>
					<div class="details">
						<span class="title">{{s.title}}</span>
						<mark class="game">{{s.game_name}}</mark>

						<div class="roomSettings">
							<mark v-if="roomSettings[s.user_id] && roomSettings[s.user_id].subOnly == true">{{ $t("raid.sub_only") }}</mark>
							<mark v-if="roomSettings[s.user_id] && roomSettings[s.user_id].followOnly !== false">{{ $t("raid.follower_only") }}</mark>
							<mark v-if="roomSettings[s.user_id] && roomSettings[s.user_id].emotesOnly == true">{{ $t("raid.emote_only") }}</mark>
							<mark class="info" v-if="s.user_id === lastRaidedUserID">{{ $t("raid.last_raided_user") }}</mark>
						</div>

						<div class="footer">
							<span class="viewers">
								<Icon class="icon" name="user"/>
								{{s.viewer_count}}</span>
							<span class="duration">
								<Icon class="icon" name="timeout"/>
								{{computeDuration(s.started_at)}}</span>
						</div>

						<div class="raidBt">
							<img src="@/assets/icons/raid.svg" alt="raid">
							Raid
						</div>
					</div>
				</a>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Utils from '@/utils/Utils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import gsap from 'gsap';
import { Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel.vue';
import Button from '../Button.vue';
import CloseButton from '../CloseButton.vue';

@Component({
	components:{
		Button,
		CloseButton,
	},
	emits:["close"]
})
export default class LiveFollowings extends AbstractSidePanel {

	public streams:TwitchDataTypes.StreamInfo[] = [];
	public roomSettings:{[key:string]:TwitchatDataTypes.IRoomSettings} = {};
	public loading = true;
	public needScope = false;
	public showRaidHistory = false;

	public get lastRaidedUserID():string {
		if(this.$store("stream").raidHistory.length == 0) return "";
		return this.sortedRaidHistory[0].uid;
	}

	public get sortedRaidHistory() {
		return this.$store("stream").raidHistory.sort((a,b)=> b.date-a.date);
	}

	public get sortedRaidHistoryPopulated():{date:number, user:TwitchatDataTypes.TwitchatUser}[] {
		return this.sortedRaidHistory.map(v=> {
			return {
				date:v.date,
				user:this.$store("users").getUserFrom("twitch", this.$store("auth").twitch.user.id, v.uid)
			}
		});
	}

	public getFormatedDate(date:number) {
		return Utils.formatDate(new Date(date), true);
	}

	public getElapsedDuration(date:number) {
		return Utils.elapsedDuration(date);
	}

	public mounted():void {
		this.needScope = !TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWINGS]);
		if(!this.needScope) this.updateList();
		super.open();
	}

	public computeDuration(start:string):string {
		const s = new Date(start);
		const elapsed = Date.now() - s.getTime();
		return Utils.formatDuration(elapsed);
	}

	public getProfilePicURL(s:TwitchDataTypes.StreamInfo):string {
		return s.user_info.profile_image_url.replace("300x300", "70x70");
	}

	public async grantPermission():Promise<void> {
		this.$store("auth").requestTwitchScopes([TwitchScopes.LIST_FOLLOWINGS]);
	}

	private async updateList():Promise<void> {
		let res = await TwitchUtils.getActiveFollowedStreams();
		res = res.sort((a,b) => a.viewer_count - b.viewer_count);
		this.streams = res;
		this.loading = false;
		await this.$nextTick();
		const cards = this.$refs.streamCard as HTMLDivElement[];
		for (let i = 0; i < cards.length; i++) {
			gsap.from(cards[i], {duration:.25, opacity:0, y:-20, delay:i*.02})
		}

		//Only load room settings for the first 50 rooms.
		for (let i = 0; i < Math.min(50, res.length); i++) {
			const roomSettings = await TwitchUtils.getRoomSettings(res[i].user_id);
			if(roomSettings) {
				this.roomSettings[res[i].user_id] = roomSettings;
			}
		}
	}

	public raid(login:string):void {
		this.$confirm(this.$t("liveusers.raid_confirm_title"), this.$t('liveusers.raid_confirm_desc', {USER:login})).then(async () => {
			TwitchUtils.raidChannel(login);
			this.close();
		}).catch(()=> { });
	}
}
</script>

<style scoped lang="less">
.livefollowings{
	.loader {
		.center();
		position: absolute;
	}

	.head {
		.actionBt {
			margin: auto
		}
	}

	.noResult, .needScope {
		.center();
		position: absolute;
		text-align: center;
		padding: 1em;
		border-radius: var(--border-radius);
		background-color: var(--color-light);
		color: var(--color-primary);
		display: flex;
		flex-direction: column;
		gap: .5em;
	}

	.content {

		.history {
			gap: .5em;
			display: flex;
			flex-direction: column;
			.user {
				display: flex;
				flex-direction: row;
				align-items: center;
				flex-wrap: wrap;
				text-decoration: none;
				color: var(--color-text);
				.icon {
					height: 2em;
					width: 2em;
					object-fit: fill;
					vertical-align: middle;
					margin-right: .5em;
					border-radius: 50%;
				}

				.login {
					font-size: 1em;
					font-weight: bold;
					flex-grow: 1;
				}
				&:hover {
					background-color: var(--color-light-fader);
				}
			}
		}

		.list {
			@itemWidth: 200px;
			display: grid;
			gap: .5em;
			grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));

			.stream {
				display: flex;
				flex-direction: column;
				text-decoration: none;
				color: var(--color-text);
	
				&:hover {
					cursor: pointer;
					background-color: var(--color-primary);
					.header {
						background-color: var(--color-primary-light);
					}
					.details {
						.title, .game, .footer, .roomSettings {
							opacity: 0;
						}
						.raidBt {
							opacity: 1;
							font-size: 2em;
							color: var(--color-button);
						}
					}
				}
	
				.details {
					font-size: .8em;
					gap: .5em;
					display: flex;
					flex-direction: column;
					flex-grow: 1;
					transition: all .2s;
					position: relative;
					.title {
						font-size: 1em;
						max-width: 100%;
						overflow-wrap: break-word;
					}
					.game {
						font-size: .9em;
						padding: .25em .5em;
						width: fit-content;
						max-width: 100%;
						overflow-wrap: break-word;
					}
	
					.footer {
						font-size: .9em;
						display: flex;
						flex-direction: row;
						flex-grow: 1;
						justify-content: space-between;
						align-content: flex-end;
						flex-wrap: wrap;//Necessary for the "align-content" to work
						.icon {
							height: 1em;
							width: 1em;
							object-fit: fill;
							vertical-align: middle;
							margin-right: .5em;
						}
					}
					.roomSettings {
						gap: .5em;
						display: flex;
						flex-wrap: wrap;
						flex-direction: row;
						mark {
							display: flex;
							align-items: center;
							background-color: var(--color-alert-fade) !important;
							padding: .2em .5em;
							&.info {
								background-color: var(--color-primary-fade) !important;
							}
						}
						&:empty {
							display: none;
						}
					}
		
					.raidBt{
						.center();
						position: absolute;
						opacity: 0;
						transition: all .2s;
						display:flex;
						flex-direction: row;
						align-items: center;
						img {
							width: 40px;
							vertical-align: middle;
							margin-right: .5em;
						}
					}
				}
			}
		}
	}
}
</style>