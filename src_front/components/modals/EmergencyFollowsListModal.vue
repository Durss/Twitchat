<template>
	<div class="emergencyfollowslistmodal">
		<div class="dimmer" ref="dimmer"></div>
		<div class="holder" ref="holder">
			<img src="@/assets/icons/emergency_purple.svg" alt="emergency" class="icon">
			<div class="head">
				<i18n-t scope="global" keypath="followbot.title" :plural="followers.length" tag="span" class="title">
					<template #COUNT>{{ followers.length }}</template>
				</i18n-t>
			</div>
			<div class="content">
				<div class="info">{{ $t("followbot.header") }}</div>
				<div class="searchField">
					<span>{{ $t("global.search") }}</span>
					<input type="text" v-model="search" :placeholder="$t('followbot.search_placeholder')">
				</div>
				<div class="list" :style="{height:(27*followers.length)+'px'}">
					<InfiniteList class="list" ref="list"
					v-if="followers.length > 0"
					:dataset="followers"
					:itemSize="itemSize"
					:itemMargin="itemMargin"
					v-model:scrollOffset="scrollOffset"
					lockScroll
					nodeType="div"
					:style="{height:'100%'}"
					v-slot="{ item }">
						<div :class="userClasses(item)">
							<div class="infos">
								<span class="date">{{ formatDate(item.date) }}</span>
								<a class="name" target="_blank"
								:href="'https://twitch.tv/'+item.user.login">
									{{ item.user.displayName }}
								</a>
							</div>
							<div class="ctas">
								<Button small :disabled="batchActionInProgress"
									:loading="item.loading"
									@click="ban(item)"
									:data-tooltip="$t('followbot.ban_tt')"
									highlight
									:icon="$image('icons/ban.svg')"
									v-if="item.user.channelInfo[item.channel_id].is_banned !== true" />

								<Button small :disabled="batchActionInProgress"
									:loading="item.loading"
									@click="unban(item)"
									:data-tooltip="$t('followbot.unban_tt')"
									:icon="$image('icons/unban.svg')"
									v-if="item.user.channelInfo[item.channel_id].is_banned === true" />

								<Button small :disabled="batchActionInProgress"
									:loading="item.loading"
									@click="unfollow(item)"
									:data-tooltip="$t('followbot.unfollow_tt')"
									highlight
									:icon="$image('icons/unfollow_white.svg')"
									v-if="item.user.channelInfo[item.channel_id].is_following == true" />

								<Button class="cardBt" small
									:data-tooltip="$t('followbot.details_tt')"
									@click="openCard(item)" :icon="$image('icons/info.svg')" />

								<Button small @click="removeEntry(item)"
								:data-tooltip="$t('followbot.ignore_tt')"
									:icon="$image('icons/trash.svg')" />
							</div>
						</div>
					</InfiniteList>
				</div>
				<div class="batchActions">
					<Button small @click="banAll()" bounce :loading="batchActionInProgress" :title="$t('followbot.banBt')" :icon="$image('icons/ban.svg')" />
					<Button small @click="unfollowAll()" bounce :loading="batchActionInProgress" :title="$t('followbot.unfollowBt')" :icon="$image('icons/unfollow_white.svg')" />
					<Button small @click="exportCSV()" bounce :loading="batchActionInProgress" :title="$t('followbot.exportBt')" :icon="$image('icons/save.svg')" />
				</div>
				<div class="ctas">
					<Button class="later" @click="reviewLater()" :title="$t('followbot.laterBt')" :icon="$image('icons/countdown.svg')" />
					<Button highlight @click="clearList()" :title="$t('followbot.finishBt')" :icon="$image('icons/checkmark_white.svg')" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import InfiniteList from '../InfiniteList.vue';

@Component({
	components:{
		Button,
		InfiniteList,
	},
	emits:["close"]
})
export default class EmergencyFollowsListModal extends Vue {

	public search:string = "";
	public scrollOffset:number = 0;
	public batchActionInProgress:boolean = false;
	public followers:TwitchatDataTypes.MessageFollowingData[] = [];
	public itemSize:number = 22;
	public itemMargin:number = 5;

	private today:Date = new Date();
	private disposed:boolean = false;

	public beforeUnmount(): void {
		this.disposed = true;
	}

	public async mounted():Promise<void> {
		//Load users by batch to avoid potential lag on open
		this.followers = this.$store("emergency").follows;
		
		watch(()=>this.search, ()=> {
			const list = this.$store("emergency").follows;
			const reg = new RegExp(this.search, "gi");
			this.followers = [];
			for (let i = 0; i < list.length; i++) {
				const f = list[i];
				reg.lastIndex = 0;
				if(reg.test(f.user.displayName)) {
					this.followers.push( f );
				}
			}
		});
	}

	public userClasses(follower:TwitchatDataTypes.MessageFollowingData):string[] {
		const res = ["user"];
		if(follower.loading) res.push("loading");
		return res;
	}

	public formatDate(date:number):string {
		const d = new Date(date)
		return Utils.formatDate(d, true, d.getDate() == this.today.getDate());
	}

	public openCard(follower:TwitchatDataTypes.MessageFollowingData):void {
		this.$store("users").openUserCard(follower.user, follower.channel_id);
	}
	
	public async ban(follow:TwitchatDataTypes.MessageFollowingData):Promise<void> {
		follow.loading = true;
		await TwitchUtils.banUser(follow.user, follow.channel_id, undefined, "Banned from Twitchat after an emergency on " + Utils.formatDate(new Date()));
		follow.loading = false;
	}
		
	public async unban(follow:TwitchatDataTypes.MessageFollowingData):Promise<void> {
		follow.loading = true;
		await TwitchUtils.unbanUser(follow.user, follow.channel_id);
		follow.loading = false;
	}
	
	public async unfollow(follow:TwitchatDataTypes.MessageFollowingData):Promise<void> {
		if(follow.user.channelInfo[follow.channel_id].is_following != true) return;
		follow.loading = true;
		await TwitchUtils.blockUser(follow.user, follow.channel_id, "spam");
		follow.user.channelInfo[follow.channel_id].is_following = false;
		await TwitchUtils.unblockUser(follow.user, follow.channel_id);
		follow.loading = false;
	}

	public async removeEntry(follow:TwitchatDataTypes.MessageFollowingData):Promise<void> {
		const list = this.followers;
		const index = list.findIndex(v=> v.id == follow.id);
		list.splice(index, 1);
	}
		
	public async banAll():Promise<void> {
		this.$confirm(this.$t("followbot.ban_all_confirm_title"), this.$t("followbot.ban_all_confirm_desc")).then(async ()=>{
			this.batchActionInProgress = true;
			const list = this.followers;
			const bounds = (this.$refs["list"] as Vue).$el.getBoundingClientRect();
			for (let i = 0; i < list.length; i++) {
				if(this.disposed) break;
				this.scrollOffset = Math.max(0, i * (this.itemSize + this.itemMargin) - bounds.height / 2);
				await this.ban(list[i]);
			}
			this.batchActionInProgress = false;
		}).catch(()=>{});
	}
	
	public unfollowAll():void {
		this.$confirm(this.$t("followbot.unfollow_confirm_title"), this.$t("followbot.unfollow_confirm_desc")).then(async ()=>{
			this.batchActionInProgress = true;
			const list = this.followers;
			const bounds = (this.$refs["list"] as Vue).$el.getBoundingClientRect();
			for (let i = 0; i < list.length; i++) {
				if(this.disposed) break;
				this.scrollOffset = Math.max(0, i * (this.itemSize + this.itemMargin) - bounds.height / 2);
				await this.unfollow(list[i]);
			}
			this.batchActionInProgress = false;
		}).catch(()=>{});
	}

	public clearList():void {
		this.$confirm(this.$t("followbot.clear_confirm_title"), this.$t("followbot.clear_confirm_desc")).then(()=>{
			this.$store("emergency").clearEmergencyFollows();
		}).catch(()=>{/*ignore*/});
	}

	public reviewLater():void {
		this.$confirm(this.$t("followbot.later_confirm_title"), this.$t("followbot.later_confirm_desc")).then(()=>{
			this.$emit("close");
		}).catch(()=>{/*ignore*/});
	}

	public exportCSV():void {
		let csv = "Date, User ID, Login, Unfollowed, Banned\n";
		const len = this.followers.length;
		for (let i = 0; i < len; i++) {
			csv += this.followers[i].date;
			csv += "," + this.followers[i].user.id;
			csv += "," + this.followers[i].user.login;
			csv += "," + (this.followers[i].user.channelInfo[this.followers[i].channel_id].is_following === true? 0 : 1);
			csv += "," + (this.followers[i].user.channelInfo[this.followers[i].channel_id].is_banned === true? 1 : 0);
			if(i < len -1) csv += "\n";
		}
		
		//Start download session
		const blob = new Blob([csv], { type: 'application/json' });
		const url = window.URL.createObjectURL(blob);
		var link = document.createElement("a");
		link.download = "emergency.csv";
		link.href = url;
		link.click();
	}

}
</script>

<style scoped lang="less">
.emergencyfollowslistmodal{
	
	.modal();
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 2;

	.holder {
		z-index: 2;
		
		& > .icon {
			margin-top: 20px;
			height: 3em;
			vertical-align: middle;
		}
		
		.head {
			.title {
				padding-left: 0;
			}
		}

		.content {
			margin-top: 1em;
			padding-top: 0;
			display: flex;
			flex-direction: column;

			&>.searchField {
				margin-top: 1em;
				display: flex;
				flex-direction: row;
				justify-content: center;
				align-items: center;
				input {
					margin-left: .5em;
				}
			}

			&>.list {
				margin: 1em auto;
				overflow: hidden;
				width: 100%;
				max-width: 800px;

				.user {
					display: flex;
					flex-direction: row;
					align-items: center;

					&.loading {
						background-color: @mainColor_alert_extralight;
					}

					.infos {
						flex-grow: 1;
						display: flex;
						flex-direction: row;
						align-items: center;
						.date {
							font-size: .75em;
							font-weight: normal;
							margin-right: .5em;
						}
						.name {
							width: calc(100% - 150px);
							max-width: calc(100% - 150px);
							white-space: nowrap;
							overflow: hidden;
							text-overflow: ellipsis;
							display: block;
						}
	
						.icon {
							height: 1em;
						}
					}
					.ctas {
						display: flex;
						flex-direction: row;
						gap:2px;
					}
				}
			}

			.info {
				text-align: center;
			}

			&>.batchActions {
				display: flex;
				flex-direction: row;
				justify-content: center;
				flex-wrap: wrap;
				margin-bottom: .5em;
				gap:.5em;
			}

			&>.ctas {
				// text-align: center;
				display: flex;
				flex-direction: row;
				justify-content: center;
				align-items: center;
				flex-wrap: wrap;
				gap:.5em;
				.later {
					background-color: @mainColor_warn;
					&:hover {
						background-color: @mainColor_warn_light;

					}
				}
			}
		}
	}

}
</style>