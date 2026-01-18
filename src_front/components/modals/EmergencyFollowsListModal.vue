<template>
	<div class="emergencyfollowslistmodal modal">
		<div class="dimmer" ref="dimmer"></div>
		<div class="holder" ref="holder">
			<Icon name="emergency" alt="emergency" class="icon"/>
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
					:dataset="followers.filter(v=>!v.user.errored)"
					:itemSize="itemSize"
					:itemMargin="itemMargin"
					v-model:scrollOffset="scrollOffset"
					fillWithDuplicates
					lockScroll
					nodeType="div"
					:style="{height:'100%'}"
					v-slot="{ item }: {item:TwitchatDataTypes.MessageFollowingData}">
						<div :class="userClasses(item)">
							<div class="infos">
								<span class="date">{{ formatDate(item.date) }}</span>
								<a class="name" target="_blank"
								:href="'https://twitch.tv/'+item.user.login">
									{{ item.user.displayNameOriginal }}
								</a>
							</div>
							<div class="ctas">
								<Button small :disabled="batchActionInProgress"
									:loading="item.loading"
									@click="ban(item)"
									@mouseover="initTooltip($event, item.id, 'followbot.ban_tt')"
									alert
									icon="ban"
									v-if="item.user.channelInfo[item.channel_id]!.is_banned !== true" />

								<Button small :disabled="batchActionInProgress"
									:loading="item.loading"
									@click="unban(item)"
									@mouseover="initTooltip($event, item.id, 'followbot.unban_tt')"
									icon="unban"
									v-if="item.user.channelInfo[item.channel_id]!.is_banned === true" />

								<Button small :disabled="batchActionInProgress"
									:loading="item.loading"
									@click="unfollow(item)"
									@mouseover="initTooltip($event, item.id, 'followbot.unfollow_tt')"
									alert
									icon="unfollow"
									v-if="item.user.channelInfo[item.channel_id]!.is_following == true" />

								<Button small type="link"
									target="_blank"
									:href="'https://twitch.tv/'+item.user.login"
									@mouseover="initTooltip($event, item.id, 'followbot.details_tt')"
									icon="info" />

								<Button small @click="removeEntry(item)"
									@mouseover="initTooltip($event, item.id, 'followbot.ignore_tt')"
									icon="trash" />
							</div>
						</div>
					</InfiniteList>
				</div>
				<div class="batchActions">
					<Button @click="banAll()" :loading="batchActionInProgress" alert icon="ban">{{$t('followbot.banBt')}}</Button>
					<Button @click="unfollowAll()" :loading="batchActionInProgress" alert icon="unfollow">{{$t('followbot.unfollowBt')}}</Button>
				</div>
				<div class="ctas">
					<Button @click="exportCSV()" :loading="batchActionInProgress" secondary icon="save">{{$t('followbot.exportBt')}}</Button>
					<Button @click="reviewLater()" class="later" secondary icon="countdown">{{$t('followbot.laterBt')}}</Button>
				</div>
				<div class="ctas">
					<Button @click="clearList()" icon="checkmark">{{$t('followbot.finishBt')}}</Button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch, type ComponentPublicInstance } from 'vue';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import InfiniteList from '../InfiniteList.vue';
import { useTippy } from 'vue-tippy';

@Component({
	components:{
		Button: TTButton,
		InfiniteList,
	},
	emits:["close"]
})
class EmergencyFollowsListModal extends Vue {

	public search:string = "";
	public scrollOffset:number = 0;
	public batchActionInProgress:boolean = false;
	public followers:TwitchatDataTypes.MessageFollowingData[] = [];
	public itemSize:number = 22;
	public itemMargin:number = 5;

	private today:Date = new Date();
	private disposed:boolean = false;
	private tooltipCreated:{[key:string]:boolean} = {}

	public beforeUnmount(): void {
		this.disposed = true;
	}

	public async mounted():Promise<void> {
		//Load users by batch to avoid potential lag on open
		this.followers = this.$store.emergency.follows;

		watch(()=>this.search, ()=> {
			const list = this.$store.emergency.follows;
			const reg = new RegExp(this.search, "gi");
			this.followers = [];
			for (const f of list) {
				reg.lastIndex = 0;
				if(reg.test(f.user.displayNameOriginal)) {
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
		const d = new Date(date);
		let res = Utils.formatDate(d, true, d.getDate() == this.today.getDate());
		if(d.getFullYear() == new Date().getFullYear()) {
			//Remove year if its the current year
			res = res.replace(new RegExp("."+d.getFullYear(),"gi"), "");
		}
		return res;
	}

	public openCard(follower:TwitchatDataTypes.MessageFollowingData):void {
		this.$store.users.openUserCard(follower.user, follower.channel_id);
	}

	public async ban(follow:TwitchatDataTypes.MessageFollowingData):Promise<void> {
		follow.loading = true;
		await TwitchUtils.banUser(follow.user, follow.channel_id, undefined, "Automatically banned by Twitchat emergency mode on " + Utils.formatDate(new Date()));
		follow.loading = false;
	}

	public async unban(follow:TwitchatDataTypes.MessageFollowingData):Promise<void> {
		follow.loading = true;
		await TwitchUtils.unbanUser(follow.user, follow.channel_id);
		follow.loading = false;
	}

	public async unfollow(follow:TwitchatDataTypes.MessageFollowingData):Promise<void> {
		if(follow.user.channelInfo[follow.channel_id]!.is_following != true) return;
		follow.loading = true;
		await TwitchUtils.blockUser(follow.user, "spam");
		follow.user.channelInfo[follow.channel_id]!.is_following = false;
		await TwitchUtils.unblockUser(follow.user);
		follow.loading = false;
	}

	public async removeEntry(follow:TwitchatDataTypes.MessageFollowingData):Promise<void> {
		this.$store.emergency.ignoreEmergencyFollower(follow);
	}

	public async banAll():Promise<void> {
		this.$confirm(this.$t("followbot.ban_all_confirm_title"), this.$t("followbot.ban_all_confirm_desc")).then(async ()=>{
			this.batchActionInProgress = true;
			const list = this.followers;
			const bounds = (this.$refs["list"] as ComponentPublicInstance).$el.getBoundingClientRect();
			for (let i = 0; i < list.length; i++) {
				if(this.disposed) break;
				this.scrollOffset = Math.max(0, i * (this.itemSize + this.itemMargin) - bounds.height / 2);
				await this.ban(list[i]!);
			}
			this.batchActionInProgress = false;
		}).catch(()=>{});
	}

	public unfollowAll():void {
		this.$confirm(this.$t("followbot.unfollow_confirm_title"), this.$t("followbot.unfollow_confirm_desc")).then(async ()=>{
			this.batchActionInProgress = true;
			const list = this.followers;
			const bounds = (this.$refs["list"] as ComponentPublicInstance).$el.getBoundingClientRect();
			for (let i = 0; i < list.length; i++) {
				if(this.disposed) break;
				this.scrollOffset = Math.max(0, i * (this.itemSize + this.itemMargin) - bounds.height / 2);
				await this.unfollow(list[i]!);
			}
			this.batchActionInProgress = false;
		}).catch(()=>{});
	}

	public clearList():void {
		this.$confirm(this.$t("followbot.clear_confirm_title"), this.$t("followbot.clear_confirm_desc")).then(()=>{
			this.$store.emergency.clearEmergencyFollows();
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
			const follower = this.followers[i]!;
			csv += follower.date;
			csv += "," + follower.user.id;
			csv += "," + follower.user.login;
			csv += "," + (follower.user.channelInfo[follower.channel_id]!.is_following === true? 0 : 1);
			csv += "," + (follower.user.channelInfo[follower.channel_id]!.is_banned === true? 1 : 0);
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

	public initTooltip(event:MouseEvent, key:string, label:string):void {
		if(this.tooltipCreated[key+"_"+label] === true) return;
		this.tooltipCreated[key+"_"+label] = true;
		useTippy(event.currentTarget as HTMLImageElement, {
			content: this.$t(label),
		});
	}

}
export default toNative(EmergencyFollowsListModal);
</script>

<style scoped lang="less">
.emergencyfollowslistmodal{

	.holder {
		max-width: 600px;

		& > .icon {
			margin: auto;
			width: 3em;
			height: 3em;
		}

		.content {
			padding-top: 0;
			gap: .5em;
			display: flex;
			flex-direction: column;

			&>.searchField {
				display: flex;
				flex-direction: row;
				justify-content: center;
				align-items: center;
				input {
					margin-left: .5em;
				}
			}

			&>.list {
				overflow: hidden;
				width: 100%;

				.user {
					display: flex;
					flex-direction: row;
					align-items: center;
					will-change: transform;

					&.loading {
						background-color: var(--color-primary-fader);
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
							white-space: nowrap;
							overflow: hidden;
							text-overflow: ellipsis;
							display: block;
							flex-grow: 1;
							max-width: 50vw;
						}

						.icon {
							height: 1em;
						}
					}
					.ctas {
						display: flex;
						flex-direction: row;
						flex-basis: 6.5em;
						justify-content: flex-end;
						&>* {
							width: 2em;
						}
						&>*:not(:last-child) {
							border-right: 1px solid var(--color-light);
						}
						&>*:not(:first-child):not(:last-child) {
							border-radius: 0;
						}
						&>*:first-child {
							border-top-right-radius: 0;
							border-bottom-right-radius: 0;
						}
						&>*:last-child {
							border-top-left-radius: 0;
							border-bottom-left-radius: 0;
						}
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
			}
		}
	}

}
</style>
