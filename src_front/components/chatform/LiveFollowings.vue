<template>
	<div class="livefollowings">
		<div class="content">
			<img src="@/assets/loader/loader.svg" alt="loader" class="loader" v-if="loading">
			
			<button class="header" @click="close()" :aria-label="$t('liveusers.closeBt_aria')">
				<img src="@/assets/icons/cross_white.svg" alt="close">
				<span><img src="@/assets/icons/user.svg" alt="user" class="icon">{{$t('cmdmenu.whoslive_title')}}</span>
			</button>

			<div class="noResult" v-if="needScope">
				<div>{{ $t("liveusers.scope_grant") }}</div>
				<Button highlight :icon="$image('icons/unlock.svg')" :title="$t('liveusers.scope_grantBt')" @click="grantPermission()" />
			</div>
			<div class="noResult" v-else-if="!loading && streams?.length == 0">{{ $t('liveusers.none') }}</div>
			
			<div class="list" v-else>
				<div v-for="s in streams" :key="s.id" class="stream" ref="streamCard" @click="raid(s)">
					<div class="header">
						<img :src="getProfilePicURL(s)" alt="">
						<span class="login">{{s.user_name}}</span>
					</div>
					<div class="details">
						<span class="title">{{s.title}}</span>
						<span class="game">{{s.game_name}}</span>
					</div>
					<div class="footer">
						<span class="viewers"><img src="@/assets/icons/user_purple.svg" alt="user" class="icon">{{s.viewer_count}}</span>
						<span class="duration"><img src="@/assets/icons/timeout_purple.svg" alt="user" class="icon">{{computeDuration(s.started_at)}}</span>
					</div>
					<div class="raidBt">
						<img src="@/assets/icons/raid_purple.svg" alt="raid">
						Raid
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{},
	components:{
		Button,
	}
})
export default class LiveFollowings extends Vue {

	public streams:TwitchDataTypes.StreamInfo[] = [];
	public loading = true;
	public needScope = false;

	private clickHandler!:(e:MouseEvent) => void;
	
	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		this.updateList();
	}

	public beforeUnmount():void {
		this.needScope = !TwitchUtils.hasScope(TwitchScopes.LIST_FOLLOWERS);
		document.removeEventListener("mousedown", this.clickHandler);
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.$emit("close");
		}
	}

	public computeDuration(start:string):string {
		const s = new Date(start);
		const ellapsed = Date.now() - s.getTime();
		return Utils.formatDuration(ellapsed);
	}

	public getProfilePicURL(s:TwitchDataTypes.StreamInfo):string {
		return s.user_info.profile_image_url.replace("300x300", "70x70");
	}

	public async close():Promise<void> {
		this.$emit('close');
	}

	public async grantPermission():Promise<void> {
		this.$store("auth").requestTwitchScope(TwitchScopes.LIST_FOLLOWERS);
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
	.modal();

	.loader {
		.center();
		position: absolute;
	}

	.noResult {
		.center();
		position: absolute;
		text-align: center;
		padding: 1em;
		border-radius: @border_radius;
		background-color: @mainColor_light;
		display: flex;
		flex-direction: column;
		gap: .5em;
	}

	.content {
		width: 100%;
		height: 100%;
		overflow: auto;
		background-color: @mainColor_dark;
		@gap: .5em;

		&>.header {
			color: @mainColor_light;
			background-color: @mainColor_normal;
			padding: .5em;
			display: flex;
			align-items: center;
			width: 100%;
			margin-bottom: .5em;
			img {
				height: 1em;
			}
			span {
				flex-grow: 1;
				text-align: center;
				.icon {
					height: .7em;
					margin-right: .5em;
				}
			}
		}

		.list {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;

			.stream {
				display: block;
				border-radius: 10px;
				background-color: @mainColor_light;
				width: calc(50% - @gap);
				margin-bottom: @gap;
				overflow: hidden;
				display: flex;
				flex-direction: column;
				position: relative;
				transition: border .2s;
	
				&:nth-child(odd) {
					margin-right: @gap;
				}
	
				&:hover {
					cursor: pointer;
					// border: 5px solid red;
					.header {
						background-color: @mainColor_normal_extralight;
					}
					.raidBt {
						opacity: 1;
					}
					.details, .footer {
						opacity: 0;
					}
				}
	
				.header {
					display: flex;
					flex-direction: row;
					background-color: @mainColor_normal;
					transition: all .2s;
	
					img {
						border-top-right-radius: 50%;
						border-bottom-right-radius: 50%;
						height: 30px;
						background-color: @mainColor_light;
					}
					.login {
						padding: 5px;
						flex-grow: 1;
						text-align: center;
						color: @mainColor_light;
						text-overflow: ellipsis;
						overflow: hidden;
					}
				}
	
				.details {
					font-size: 14px;
					display: flex;
					flex-direction: column;
					padding: 5px 10px;
					flex-grow: 1;
					transition: all .2s;
					.title {
						font-size: 1em;
					}
					.game {
						font-size: .8em;
						margin-top: .5em;
						background-color: fade(@mainColor_normal, 15%);
						align-self: flex-start;
						padding: .25em .5em;
						width: auto;
						border-radius: 1em;
					}
				}
	
				.footer {
					font-size: 16px;
					display: flex;
					flex-direction: row;
					justify-content: space-between;
					padding: 0px 10px;
					padding-bottom: 5px;
					transition: all .2s;
					.icon {
						height: 14px;
						width: 14px;
						object-fit: contain;
						vertical-align: middle;
						margin-right: 5px;
					}
				}
	
				.raidBt{
					// align-self: center;
					.center();
					margin-top: 10px;
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

@media only screen and (max-width: 400px) {
.livefollowings{
	.content {
		.list {
			.stream {
				width: 100%;
				&:nth-child(odd) {
					margin-right: 0;
				}
			}
		}
	}
}
}
</style>