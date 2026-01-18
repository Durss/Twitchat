<template>
	<div class="livefollowings sidePanel" :class="{needPermission:!canRaid}">

		<div class="head">
			<h1 v-if="showRaidHistory" ><Icon name="user" class="icon" />{{$t('raid.raid_historyBt')}}</h1>
			<h1 v-else><Icon name="user" class="icon" />{{$t('cmdmenu.whoslive_title')}}</h1>
			<ClearButton :aria-label="$t('liveusers.closeBt_aria')" @click="close()" />

			<template v-if="!needScope && $store.stream.raidHistory.length > 0">
				<TTButton class="actionBt" small v-if="!showRaidHistory" icon="raid" @click="showRaidHistory = true">{{ $t("raid.raid_historyBt") }}</TTButton>
				<TTButton class="actionBt" small v-else icon="live" @click="showRaidHistory = false">{{ $t("raid.raid_liveBt") }}</TTButton>
			</template>
		</div>

		<div class="content">
			<Icon name="loader" alt="loading" class="loader" v-if="loading" />

			<div class="card-item needScope" v-if="needScope">
				<span>{{ $t("liveusers.scope_grant") }}</span>
				<TTButton icon="unlock" @click="grantPermission()" primary>{{ $t('liveusers.scope_grantBt') }}</TTButton>
			</div>
			<div class="noResult" v-else-if="!loading && streams?.length == 0">{{ $t('liveusers.none') }}</div>

			<div class="history" v-else-if="showRaidHistory">
				<a :href="'https://twitch.tv/'+entry.user.login" v-for="entry in sortedRaidHistoryPopulated" class="card-item user" @click.prevent="raid(entry.user.login)">
					<Icon name="loader" v-if="entry.user.temporary" />
					<img class="icon" v-else-if="entry.user.avatarPath" :src="entry.user.avatarPath" lazy>
					<div class="login">{{ entry.user.login }}</div>
					<div class="date">{{ $t("liveusers.date", {DURATION:getElapsedDuration(entry.date)}) }}</div>
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
							<mark class="alert" v-if="roomSettings[s.user_id] && roomSettings[s.user_id]!.subOnly == true">{{ $t("raid.sub_only") }}</mark>
							<mark class="alert" v-if="roomSettings[s.user_id] && roomSettings[s.user_id]!.followOnly !== false">{{ $t("raid.follower_only") }}</mark>
							<mark class="alert" v-if="roomSettings[s.user_id] && roomSettings[s.user_id]!.emotesOnly == true">{{ $t("raid.emote_only") }}</mark>
							<mark class="info" v-if="s.user_id === lastRaidedUserID">{{ $t("raid.last_raided_user") }}</mark>
							<mark class="info" v-if="getLastRaidElapsedDuration(s.user_id)">{{ $t("raid.last_raid_date", {DATE:getLastRaidElapsedDuration(s.user_id)}) }}</mark>
						</div>

						<div class="footer">
							<span class="viewers">
								<Icon class="icon" name="user"/>
								{{s.viewer_count}}</span>
							<span class="duration">
								<Icon class="icon" name="timeout"/>
								{{computeDuration(s.started_at)}}</span>
						</div>

						<div class="raidBt" v-if="canRaid">
							<Icon name="raid" />
							Raid
						</div>

						<div class="permissionBt" v-if="!canRaid">
							<Icon name="lock_fit" />
							<p>{{ $t('cmdmenu.scope_grant') }}</p>
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
import { TwitchChannelModerateV2Scopes, TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { gsap } from 'gsap/gsap-core';
import { Component, toNative } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import TTButton from '../TTButton.vue';
import { watch } from 'vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ClearButton,
	},
	emits:["close"]
})
class LiveFollowings extends AbstractSidePanel {

	public streams:TwitchDataTypes.StreamInfo[] = [];
	public roomSettings:{[key:string]:TwitchatDataTypes.IRoomSettings} = {};
	public loading = true;
	public needScope = false;
	public showRaidHistory = false;
	public disposed = false;
	public canRaid = false;

	public get lastRaidedUserID():string {
		if(this.$store.stream.raidHistory.length == 0) return "";
		return this.sortedRaidHistory[0]!.uid;
	}

	public get sortedRaidHistory() {
		return this.$store.stream.raidHistory.sort((a,b)=> b.date-a.date);
	}

	public get sortedRaidHistoryPopulated():{date:number, user:TwitchatDataTypes.TwitchatUser}[] {
		return this.sortedRaidHistory.map(v=> {
			return {
				date:v.date,
				user:this.$store.users.getUserFrom("twitch", this.$store.auth.twitch.user.id, v.uid, undefined, undefined, undefined, false)
			}
		});
	}


	public getLastRaidElapsedDuration(uid:string):string {
		const last = this.sortedRaidHistory.find(v => v.uid == uid);
		if(!last) return "";
		return Utils.elapsedDuration(last.date);
	}

	public getElapsedDuration(date:number) {
		return Utils.elapsedDuration(date);
	}

	public mounted():void {
		this.buildContent();
		super.open();
		watch(()=>this.$store.auth.twitch.scopes, () => {
			this.buildContent();
		});
	}

	private buildContent():void {
		this.needScope = !TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWINGS]);
		if(!this.needScope) this.updateList();
		else this.loading = false;
		this.canRaid = TwitchUtils.hasScopes([TwitchScopes.START_RAID, ...TwitchChannelModerateV2Scopes]);
	}

	public beforeUnmount(): void {
		this.disposed = true;
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
		this.$store.auth.requestTwitchScopes([TwitchScopes.LIST_FOLLOWINGS]);
	}

	private async updateList():Promise<void> {
		TwitchUtils.getActiveFollowedStreams(async (res)=>{
			res = res.sort((a,b) => a.viewer_count - b.viewer_count);
			this.streams = res;
			this.loading = false;
			await this.$nextTick();
			const cards = this.$refs.streamCard as HTMLDivElement[] || [];
			for (let i = 0; i < cards.length; i++) {
				gsap.from(cards[i]!, {duration:.25, opacity:0, y:-20, delay:i*.02})
			}

			for (let i = 0; i < res.length; i++) {
				if(this.disposed) break;
				TwitchUtils.getRoomSettings(res[i]!.user_id).then(roomSettings => {
					if(roomSettings) {
						this.roomSettings[res[i]!.user_id] = roomSettings;
					}
				});
				// const roomSettings = await TwitchUtils.getRoomSettings(res[i].user_id);
				// if(roomSettings) {
				// 	this.roomSettings[res[i].user_id] = roomSettings;
				// }
				//Delay loading of entries after the 50th to load them by batch of 10 every second
				if(i > 50 && i%10 == 0) {
					await Utils.promisedTimeout(1000);
				}
			}
		});
	}

	public raid(login:string):void {
		if(this.canRaid) {
			this.$confirm(this.$t("liveusers.raid_confirm_title"), this.$t('liveusers.raid_confirm_desc', {USER:login})).then(async () => {
				TwitchUtils.raidChannel(login);
				this.close();
			}).catch(()=> { });
		}else{
			TwitchUtils.requestScopes([TwitchScopes.START_RAID, ...TwitchChannelModerateV2Scopes]);
		}
	}
}
export default toNative(LiveFollowings);
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
		display: flex;
		flex-direction: column;
		gap: .5em;
	}

	&.needPermission {
		.content>.list>.stream:hover {

			background-color: var(--color-alert);
			.header {
				background-color: var(--color-alert-light);
			}
		}
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
							color: var(--color-light);
						}
						.permissionBt {
							opacity: 1;
							font-size: 1em;
							color: var(--color-light);
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
					margin-top: .5em;
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
							padding: .2em .5em;
							&.alert {
								background-color: var(--color-alert-fade) !important;
							}
							&.info {
								background-color: var(--color-primary-fade) !important;
							}
						}
						&:empty {
							display: none;
						}
					}

					.raidBt, .permissionBt{
						.center();
						position: absolute;
						opacity: 0;
						transition: all .2s;
						display:flex;
						flex-direction: row;
						align-items: center;
						&.permissionBt {
							width: 90%;
						}
						.icon {
							width: 40px;
							flex-shrink: 0;
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
