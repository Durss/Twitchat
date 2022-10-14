<template>
	<div class="emergencyfollowslistmodal">
		<div class="dimmer" ref="dimmer"></div>
		<div class="holder" ref="holder">
			<img src="@/assets/icons/emergency_purple.svg" alt="emergency" class="icon">
			<div class="head">
				<span class="title">Review {{follow.length}} follower(s)</span>
			</div>
			<div class="content">
				<div>Here is a list of all the users that followed you during the emergency:</div>
				<div class="list">
					<ul>
						<li v-for="follower in follow" class="user">
							<div class="infos">
								<span class="date">{{ formatDate(follower.date) }}</span>
								<a class="name" data-tooltip="Open profile" :href="'https://twitch.tv/'+follower.user.login" target="_blank">{{ follower.user.displayName }}</a>
								<img class="icon" data-tooltip="User has<br>been banned" v-if="follower.user.channelInfo[follower.channel_id].is_banned" src="@/assets/icons/ban_purple.svg" alt="banned">
								<img class="icon" data-tooltip="User has<br>been blocked" v-if="follower.user.channelInfo[follower.channel_id].is_blocked === true" src="@/assets/icons/block_purple.svg" alt="blocked">
								<img class="icon" data-tooltip="User has<br>been unblocked" v-if="follower.user.channelInfo[follower.channel_id].is_blocked === false" src="@/assets/icons/unblock_purple.svg" alt="unblocked">
							</div>
							<div class="ctas">
								<Button class="cardBt" small data-tooltip="Open viewer details" @click="openCard(follower)" :icon="$image('icons/info.svg')" />
								<Button small @click="ban(follower)" data-tooltip="Permaban user" v-if="follower.user.channelInfo[follower.channel_id].is_banned !== true" highlight :icon="$image('icons/ban.svg')" />
								<Button small @click="unban(follower)" data-tooltip="Unban user" v-if="follower.user.channelInfo[follower.channel_id].is_banned === true" :icon="$image('icons/unban.svg')" />
								<Button small @click="block(follower)" data-tooltip="Block user" v-if="!follower.blocked || follower.user.channelInfo[follower.channel_id].is_blocked !== true" highlight :icon="$image('icons/block.svg')" />
								<Button small @click="unblock(follower)" data-tooltip="Unblock user" v-if="follower.blocked && follower.user.channelInfo[follower.channel_id].is_blocked === true" :icon="$image('icons/unblock.svg')" />
							</div>
						</li>
					</ul>
				</div>
				<div class="ctas">
					<Button @click="copyList()" title="Copy CSV list to clipboard" :icon="$image('icons/copy.svg')" />
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

	public get follow():TwitchatDataTypes.MessageFollowingData[] { return this.$store("emergency").follows; }

	public formatDate(date:number):string {
		const d = new Date(date)
		return Utils.formatDate(d, true, d.getDate() == this.today.getDate());
	}

	private today:Date = new Date();

	public openCard(follower:TwitchatDataTypes.MessageFollowingData):void {
		this.$store("users").openUserCard(follower.user, follower.channel_id);
	}
		
	public async ban(follow:TwitchatDataTypes.MessageFollowingData):Promise<void> {
		follow.user.channelInfo[follow.channel_id].is_banned = true;
		await TwitchUtils.banUser(follow.user.id, follow.channel_id, undefined, "Banned from Twitchat after an emergency on " + Utils.formatDate(new Date()));
	}
		
	public async unban(follow:TwitchatDataTypes.MessageFollowingData):Promise<void> {
		follow.user.channelInfo[follow.channel_id].is_banned = false;
		await TwitchUtils.unbanUser(follow.user.id, follow.channel_id);
	}
	
	public async block(follow:TwitchatDataTypes.MessageFollowingData):Promise<void> {
		follow.user.channelInfo[follow.channel_id].is_blocked = true;
		await TwitchUtils.blockUser(follow.user.id, follow.channel_id, "spam");
	}

	public async unblock(follow:TwitchatDataTypes.MessageFollowingData):Promise<void> {
		follow.user.channelInfo[follow.channel_id].is_blocked = false;
		await TwitchUtils.unblockUser(follow.user.id, follow.channel_id);
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

	public copyList():void {
		let csv = "Date,User ID, Login, Blocked, Unblocked, Banned\n";
		const len = this.follow.length;
		for (let i = 0; i < len; i++) {
			csv += this.follow[i].date;
			csv += "," + this.follow[i].user.id;
			csv += "," + this.follow[i].user.login;
			csv += "," + (this.follow[i].user.channelInfo[this.follow[i].channel_id].is_blocked === true? 1 : 0);
			csv += "," + (this.follow[i].user.channelInfo[this.follow[i].channel_id].is_blocked === false? 1 : 0);
			csv += "," + (this.follow[i].user.channelInfo[this.follow[i].channel_id].is_banned? 1 : 0);
			if(i < len -1) csv += "\n";
		}
		Utils.copyToClipboard(csv);
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
						align-items: center;
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