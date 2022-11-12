<template>
	<div class="emergencyfollowslistmodal">
		<div class="dimmer" ref="dimmer"></div>
		<div class="holder" ref="holder">
			<img src="@/assets/icons/emergency_purple.svg" alt="emergency" class="icon">
			<div class="head">
				<span class="title">Review {{followers.length}} follower(s)</span>
			</div>
			<div class="content">
				<div>Here is a list of all the users that followed you during the emergency:</div>
				<div class="searchField">
					<span>Search</span>
					<input type="text" v-model="search" placeholder="username...">
				</div>
				<ul class="list" :style="{height:(27*followers.length)+'px'}">
					<InfiniteList class="list" ref="list"
					v-if="followers.length > 0"
					:dataset="followers"
					:itemSize="itemSize"
					:itemMargin="itemMargin"
					v-model:scrollOffset="scrollOffset"
					lockScroll
					nodeType="li"
					:style="{height:'100%'}"
					v-slot="{ item }">
						<div :class="userClasses(item)">
							<div class="infos">
								<span class="date">{{ formatDate(item.date) }}</span>
								<a class="name" data-tooltip="Open profile"
								:href="'https://twitch.tv/'+item.user.login" target="_blank">
									{{ item.user.displayName }}
								</a>
							</div>
							<div class="ctas">
								<Button small :disabled="batchActionInProgress"
									:loading="item.loading"
									@click="ban(item)"
									data-tooltip="Permaban user"
									highlight
									:icon="$image('icons/ban.svg')"
									v-if="item.user.channelInfo[item.channel_id].is_banned !== true" />

								<Button small :disabled="batchActionInProgress"
									:loading="item.loading"
									@click="unban(item)"
									data-tooltip="Unban user"
									:icon="$image('icons/unban.svg')"
									v-if="item.user.channelInfo[item.channel_id].is_banned === true" />

								<Button small :disabled="batchActionInProgress"
									:loading="item.loading"
									@click="unfollow(item)"
									data-tooltip="Remove from<br>my followers"
									highlight
									:icon="$image('icons/unfollow_white.svg')"
									v-if="item.user.channelInfo[item.channel_id].is_following == true" />

								<Button class="cardBt" small
									data-tooltip="Open viewer details"
									@click="openCard(item)" :icon="$image('icons/info.svg')" />

								<Button small @click="removeEntry(item)"
									data-tooltip="Ignore this user"
									:icon="$image('icons/trash.svg')" />
							</div>
						</div>
					</InfiniteList>
				</ul>
				<div class="batchActions">
					<Button small @click="banAll()" bounce :loading="batchActionInProgress" title="Ban all users" :icon="$image('icons/ban.svg')" />
					<Button small @click="unfollowAll()" bounce :loading="batchActionInProgress" title="Remove all followers" :icon="$image('icons/unfollow_white.svg')" />
					<Button small @click="exportCSV()" bounce :loading="batchActionInProgress" title="Export CSV" :icon="$image('icons/save.svg')" />
				</div>
				<div class="ctas">
					<Button class="later" @click="reviewLater()" title="Review later" :icon="$image('icons/countdown.svg')" />
					<Button highlight @click="clearList()" title="Finish & clear list" :icon="$image('icons/checkmark_white.svg')" />
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
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import InfiniteList from '../InfiniteList.vue';

@Options({
	props:{},
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
		let label = `This will ban all the remaining users of the list from your channel.`;
		this.$confirm("Ban all?", label).then(async ()=>{
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
		let label = `This will remove all the remaining users of the list from your followers.`;
		this.$confirm("Remove followers?", label).then(async ()=>{
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
		let label = "This list of followers will be lost forever!<br>";
		label += "You'll still be able to find the "
		label += "<a href=\"https://www.twitch.tv/settings/security\" target=\"_blank\">list of all blocked users here</a>";
		this.$confirm("Complete review?", label).then(()=>{
			this.$store("emergency").clearEmergencyFollows();
		}).catch(()=>{/*ignore*/});
	}

	public reviewLater():void {
		this.$confirm("Review later?", "You'll be asked again next time you start Twitchat").then(()=>{
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
	
	// visibility: hidden;
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
				margin: 1em 0;
				overflow: hidden;

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
							margin-left: .25em;
						}
						.cardBt {
							margin-left: .5em;
						}
					}
					.ctas {
						display: flex;
						flex-direction: row;
						.button:not(:last-child) {
							margin-right: 2px;
						}
					}
				}
			}

			ul {
				li {
					&:not(:last-child) {
						margin-bottom:.5em;
					}
				}
			}
			&>.batchActions {
				display: flex;
				flex-direction: row;
				justify-content: space-evenly;
				flex-wrap: wrap;
				margin-bottom: .25em;
				.button  {
					margin-bottom: .25em;
				}
			}

			&>.ctas {
				// text-align: center;
				display: flex;
				flex-direction: column;
				align-items: center;
				.button:not(:first-child) {
					margin-top: .5em;
				}
				.later {
					background-color: @mainColor_warn;
					&:hover {
						background-color: @mainColor_warn_light;

					}
				}
			}
		}
	}

	.dimmer {
		z-index: 1;
	}

	mark {
		border: 1px dashed @mainColor_normal;
		background-color: fade(@mainColor_normal, 15%);
		padding: .1em .5em;
		border-radius: .5em;
	}
}
</style>