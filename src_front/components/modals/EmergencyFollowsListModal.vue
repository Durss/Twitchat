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
				<div class="list">
					<ul>
						<li v-for="follower in followers" :key="follower.id" :ref="'user_'+follower.id" :class="userClasses(follower)">
							<div class="infos">
								<span class="date">{{ formatDate(follower.date) }}</span>
								<a class="name" data-tooltip="Open profile" :href="'https://twitch.tv/'+follower.user.login" target="_blank">{{ follower.user.displayName }}</a>
							</div>
							<div class="ctas">
								<Button small :disabled="batchActionInProgress" :loading="follower.loading" @click="ban(follower)" data-tooltip="Permaban user" v-if="follower.user.channelInfo[follower.channel_id].is_banned !== true" highlight :icon="$image('icons/ban.svg')" />
								<Button small :disabled="batchActionInProgress" :loading="follower.loading" @click="unban(follower)" data-tooltip="Unban user" v-if="follower.user.channelInfo[follower.channel_id].is_banned === true" :icon="$image('icons/unban.svg')" />
								<Button small :disabled="batchActionInProgress" :loading="follower.loading" @click="unfollow(follower)" data-tooltip="Remove from<br>my followers" v-if="follower.user.channelInfo[follower.channel_id].is_following == true" highlight :icon="$image('icons/unfollow_white.svg')" />
								<Button class="cardBt" small data-tooltip="Open viewer details" @click="openCard(follower)" :icon="$image('icons/info.svg')" />
								<Button small @click="removeEntry(follower)" data-tooltip="Ignore this user" :icon="$image('icons/trash.svg')" />
							</div>
						</li>
					</ul>
				</div>
				<div class="batchActions">
					<Button @click="banAll()" bounce :loading="batchActionInProgress" title="Ban all" :icon="$image('icons/ban.svg')" />
					<Button @click="unfollowAll()" bounce :loading="batchActionInProgress" title="Unfollow all" :icon="$image('icons/unfollow_white.svg')" />
					<Button @click="exportCSV()" bounce :loading="batchActionInProgress" title="Export as CSV" :icon="$image('icons/save.svg')" />
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
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{},
	components:{
		Button,
	},
	emits:["close"]
})
export default class EmergencyFollowsListModal extends Vue {

	public batchActionInProgress:boolean = false;
	
	private today:Date = new Date();
	private disposed:boolean = false;

	public get followers():TwitchatDataTypes.MessageFollowingData[] { return this.$store("emergency").follows; }

	public beforeMount(): void {
		//TODO remove this debug
		// this.followers[0].user = this.$store("users").getUserFrom("twitch", this.followers[0].channel_id, "181631", "test1", "test1");
	}

	public beforeUnmount(): void {
		this.disposed = true;
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
		this.batchActionInProgress = true;
		const list = this.followers;
		for (let i = 0; i < list.length; i++) {
			if(this.disposed) break;
			const el = (this.$refs["user_"+list[i].id] as HTMLDivElement[])[0];
			console.log(el);
			el.scrollIntoView({block: "center", inline: "nearest"});
			await this.ban(list[i]);
		}
		this.batchActionInProgress = false;
	}
	
	public async unfollowAll():Promise<void> {
		this.batchActionInProgress = true;
		const list = this.followers;
		for (let i = 0; i < list.length; i++) {
			if(this.disposed) break;
			const el = (this.$refs["user_"+list[i].id] as HTMLDivElement[])[0];
			console.log(el);
			el.scrollIntoView({block: "center", inline: "nearest"});
			await this.unfollow(list[i]);
		}
		this.batchActionInProgress = false;
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
			margin-top: 20px;
			padding-top: 0;
			display: flex;
			flex-direction: column;

			.list {
				margin: 1em 0;
				overflow: auto;

				.user {
					&::before {
						content: "●";
						margin-right: .5em;
					}
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
							max-width: 160px;
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