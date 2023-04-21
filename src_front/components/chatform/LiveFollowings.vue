<template>
	<div class="livefollowings sidePanel">
		
		<div class="head">
			<h1><img src="@/assets/icons/user.svg" alt="user" class="icon">{{$t('cmdmenu.whoslive_title')}}</h1>
			<CloseButton :aria-label="$t('liveusers.closeBt_aria')" @click="close()" />
		</div>
		
		<div class="content">
			<img src="@/assets/loader/loader.svg" alt="loader" class="loader" v-if="loading">

			<div class="needScope" v-if="needScope">
				<span>{{ $t("liveusers.scope_grant") }}</span>
				<Button icon="unlock" @click="grantPermission()">{{ $t('liveusers.scope_grantBt') }}</Button>
			</div>
			<div class="noResult" v-else-if="!loading && streams?.length == 0">{{ $t('liveusers.none') }}</div>
			
			<div class="list" v-else>
				<a :href="'https://twitch.tv/'+s.user_login" v-for="s in streams" :key="s.id" class="stream" ref="streamCard" @click.prevent="raid(s)">
					<div class="header">
						<img class="icon" :src="getProfilePicURL(s)" alt="">
						<span class="title">{{s.user_name}}</span>
					</div>
					<div class="details">
						<span class="title">{{s.title}}</span>
						<mark class="game">{{s.game_name}}</mark>
						<div class="footer">
							<span class="viewers"><img src="@/assets/icons/user.svg" alt="user" class="icon">{{s.viewer_count}}</span>
							<span class="duration"><img src="@/assets/icons/timeout.svg" alt="user" class="icon">{{computeDuration(s.started_at)}}</span>
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
	}
})
export default class LiveFollowings extends AbstractSidePanel {

	public streams:TwitchDataTypes.StreamInfo[] = [];
	public loading = true;
	public needScope = false;

	public mounted():void {
		this.needScope = !TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWINGS]);
		if(!this.needScope) this.updateList();
		super.open();
	}


	public computeDuration(start:string):string {
		const s = new Date(start);
		const ellapsed = Date.now() - s.getTime();
		return Utils.formatDuration(ellapsed);
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
	}

	public raid(s:TwitchDataTypes.StreamInfo):void {
		this.$confirm(this.$t("liveusers.raid_confirm_title"), this.$t('liveusers.raid_confirm_desc', {USER:s.user_login})).then(async () => {
			TwitchUtils.raidChannel(s.user_login);
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

		.list {
			@itemWidth: 200px;
			display: grid;
			gap: .5em;
			grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));

			.stream {
				.card(true);
				display: flex;
				flex-direction: column;
				text-decoration: none;
				color: var(--color-light);
	
				&:hover {
					cursor: pointer;
					.header {
						background-color: var(--color-primary-light);
					}
					.details {
						.title, .game, .footer {
							opacity: 0;
						}
						.raidBt {
							opacity: 1;
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