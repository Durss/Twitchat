<template>
	<div class="chathighlight" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img :src="icon" :alt="icon" v-if="icon" class="icon">

		<ChatMessageInfoBadges :infos="badgeInfos" />
		
		<div class="messageHolder">
			<span class="reason">
				<a class="userlink" v-if="user" @click.stop="openUserCard(user!)">{{user.displayName}}</a>

				<span class="text" v-html="reason"></span>
				
				<span class="additionalUsers" v-if="additionalUsers?.length > 0"
					v-for="u, index in additionalUsers" :key="u.id">
					<a class="userlink" @click.stop="openUserCard(u)">{{u.displayName}}</a>
					<span v-if="(index == additionalUsers.length-2)">{{$t("global.and")}} </span>
					<span v-else-if="index < additionalUsers.length-1">, </span>
				</span>
			</span>
			
			<div class="info" v-if="info" v-html="info"></div>
			
			<div class="message" v-if="messageText" v-html="messageText"></div>

			<img src="@/assets/loader/loader_white.svg" alt="loader" class="loader" v-if="loading">

			<div v-if="streamInfo" class="streamInfo">
				<div class="head" v-t="'chat.highlight.stream_info_title'"></div>
				<div class="title">{{streamInfo.title}}</div>
				<div class="game">{{streamInfo.game_name}}</div>
			</div>

			<div v-if="streamInfoError" class="streamInfo error" v-t="'error.stream_info_loading'"></div>
			
			<div class="ctas" v-if="canUnban ||canBlock || isRaid">
				<Button highlight v-if="canUnban"
					:loading="moderating"
					:icon="$image('icons/unban.svg')"
					:title="$t('chat.highlight.unbanBt')"
					@click.stop="unbanUser()" />

				<Button highlight v-if="canBlock"
					:loading="moderating"
					:icon="$image('icons/ban.svg')"
					:title="$t('chat.highlight.banBt')"
					@click.stop="blockUser()" />

				<Button v-if="isRaid"
					@click.stop="shoutout()"
					:title="$t('chat.highlight.soBt')"
					:icon="$image('icons/shoutout.svg')"
					:loading="shoutoutLoading"
					class="soButton"
				/>
			</div>
		</div>

		<div class="communityChallenge" v-if="messageData.type === 'community_challenge_contribution'">
			<div class="values">
				<div>{{messageData.challenge.progress}}</div>
				<div>{{messageData.challenge.goal}}</div>
			</div>
			<p>pts</p>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatMessageInfoBadges from './components/ChatMessageInfoBadges.vue';

@Options({
	props:{
		messageData:Object,
	},
	components:{
		Button,
		ChatMessageInfoBadges,
	},
	emits:["onRead"]
})
export default class ChatHighlight extends Vue {
	public messageData!:TwitchatDataTypes.MessageChatData
	| TwitchatDataTypes.MessageFollowingData
	| TwitchatDataTypes.MessageHypeTrainCooledDownData
	| TwitchatDataTypes.MessageCommunityBoostData
	| TwitchatDataTypes.MessageRaidData
	| TwitchatDataTypes.MessageCheerData
	| TwitchatDataTypes.MessageSubscriptionData
	| TwitchatDataTypes.MessageRewardRedeemData
	| TwitchatDataTypes.MessageAutobanJoinData
	| TwitchatDataTypes.MessageCommunityChallengeContributionData;
	public messageText = '';
	public info = "";
	public icon = "";
	public user:TwitchatDataTypes.TwitchatUser|null = null;
	public isRaid = false;
	public shoutoutLoading = false;
	public loading = false;
	public moderating = false;
	public canUnban = false;
	public canBlock = false;
	public streamInfoError = false;
	public badgeInfos:TwitchatDataTypes.MessageBadgeData[] = [];
	public additionalUsers:TwitchatDataTypes.TwitchatUser[] = [];
	public streamInfo:TwitchDataTypes.ChannelInfo|null = null;

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public get reason():string {
		let value:number|"prime" = 0;
		this.info = "";

		let res = "";
		switch(this.messageData.type) {
			case TwitchatDataTypes.TwitchatMessageType.FOLLOWING:
				this.icon = this.$image('icons/follow.svg');
				this.user = this.messageData.user;
				res = this.$t("chat.highlight.follow");
				break;

			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN:
				this.icon = this.$image('icons/train.svg');
				res = this.$t("chat.highlight.train_cooldown");
				break;

			case TwitchatDataTypes.TwitchatMessageType.AUTOBAN_JOIN:
				this.icon = this.$image('icons/mod.svg');
				this.user = this.messageData.user;
				res = this.$t("chat.highlight.autoban", {RULE:"<i>"+this.messageData.rule.label+"</i>"});
				this.canUnban = true;
				this.canBlock = true;
				break;

			case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE:
				this.icon = this.$image('icons/boost.svg');
				res = this.$t("chat.highlight.boosted", {COUNT:this.messageData.viewers});
				break;

			case TwitchatDataTypes.TwitchatMessageType.RAID:
				value = this.messageData.viewers;
				this.isRaid = true;
				this.icon = this.$image('icons/raid.svg');
				this.user = this.messageData.user;
				res = this.$t("chat.highlight.raid", {COUNT:value});

				this.loadLastStreamInfos();
				break;

			case TwitchatDataTypes.TwitchatMessageType.CHEER:
				value = this.messageData.bits;
				this.user = this.messageData.user;
				res = this.$tc("chat.highlight.bits", value, {BITS:value});
				this.icon = this.$image('icons/bits.svg');
				break;

			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION:{
				if(this.messageData.is_gift) {

					this.icon = this.$image('icons/gift.svg');
					value = this.messageData.tier;
					this.user = this.messageData.user;
					if(this.messageData.gift_recipients) {
						this.additionalUsers = this.messageData.gift_recipients.filter(v=> v.temporary !== true);
						res = this.$t("chat.highlight.sub_gift", {COUNT:"<strong>"+this.messageData.gift_recipients.length+"</strong>", TIER:value});
					}

				}else if(this.messageData.is_giftUpgrade) {
					this.icon = this.$image('icons/sub.svg');
					this.user = this.messageData.user;
					res = this.$t("chat.highlight.sub_gift_upgrade", {USER:this.messageData.gift_upgradeSender!.displayName})

				}else{
					const method = this.messageData.is_resub ? "resubscribed" : "subscribed";
					this.user = this.messageData.user;
					if(this.messageData.is_resub) {
						if(this.messageData.tier == "prime") {
							res = this.$t("chat.highlight.resub_prime")
						}else{
							value = this.messageData.tier;
							res = this.$t("chat.highlight.resub", {TIER:value})
						}
					}else{
						if(this.messageData.tier == "prime") {
							res = this.$t("chat.highlight.sub_prime")
						}else{
							value = this.messageData.tier;
							res = this.$t("chat.highlight.sub", {TIER:value})
						}
					}
					this.icon = this.messageData.tier == "prime"? this.$image('icons/prime.svg') : this.$image('icons/sub.svg')
	
					let months = this.messageData.totalSubDuration;
					if(months > 0) {
						res += " "+this.$tc("chat.highlight.sub_duration", months, {COUNT:months});
					}

					let extras:string[] = [];
					
					if(this.messageData.months > 1) {
						extras.push(this.$tc("chat.highlight.sub_advance", months, {COUNT:this.messageData.months}));
					}
					if(this.messageData.streakMonths > 0) {
						extras.push(this.$tc("chat.highlight.sub_streak", months, {COUNT:this.messageData.streakMonths}));
					}
					if(extras.length) {
						res += " <i>("+extras.join(" ")+")</i>"
					}
				}
				break;
			}

			case TwitchatDataTypes.TwitchatMessageType.REWARD: {
				this.messageText = "";
				this.icon = this.$image('icons/channelPoints.svg');
				this.user = this.messageData.user;
				res = this.$t("chat.highlight.reward", {TITLE:`<strong>${this.messageData.reward.title}</strong>`})
				if(this.messageData.reward.cost > -1) {//It's set to -1 for "highlight my message" reward
					res += ` <span class='small'>(${this.messageData.reward.cost} pts)</span>`;
				}
				const img = this.messageData.reward.icon;
				this.icon = img.hd ?? img.sd;
				if(this.messageData.reward.description && this.$store("params").appearance.showRewardsInfos.value === true) {
					this.info = this.messageData.reward.description;
				}
				if(this.messageData.message) {
					this.messageText += this.messageData.message;
				}
				
				this.messageText = TwitchUtils.parseEmotes(this.messageText, "", false, true);
				break;
			}

			case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION: {
				this.user = this.messageData.user;
				let total = "";
				if(this.messageData.contribution != this.messageData.total_contribution) {
					total = " <i>("+this.$t("chat.highlight.challenge_contrib_total", {COUNT:this.messageData.total_contribution})+")</i>";
				}
				res = this.$t("chat.highlight.challenge_contrib", {
						COUNT:`<strong>${this.messageData.contribution}</strong>`, 
						TOTAL:total, 
						TITLE:"<strong>"+this.messageData.challenge.title+"</strong>"})
				this.icon = this.$image('icons/channelPoints.svg');
				const img = this.messageData.challenge.icon;
				if(img) this.icon = img.hd ?? img.sd;
				break;
			}
		}
		return res;
	}

	public async mounted():Promise<void> {
		switch(this.messageData.type) {
			case TwitchatDataTypes.TwitchatMessageType.CHEER:
			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: 
			case TwitchatDataTypes.TwitchatMessageType.REWARD: {
				this.messageText = this.messageData.message_html ?? this.messageData.message ?? "";
				this.$store("accessibility").setAriaPolite(this.reason+" "+this.messageText);
				break;
			}

			case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
				//Add twitchat's automod badge
				if(this.messageData.automod) {
					this.badgeInfos.push({type:"automod", tooltip:"<strong>Rule:</strong> "+this.messageData.automod.label});
				}
				break;
			}
		}
	}

	public beforeUpdate(): void {
		// console.log("UPDATE", this.messageData);
	}


	public copyJSON():void {
		console.log(this.messageData);
		this.messageData
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

	public async shoutout():Promise<void> {
		if(this.messageData.type != TwitchatDataTypes.TwitchatMessageType.RAID) return;

		this.shoutoutLoading = true;
		try {
			await this.$store("chat").shoutout(this.messageData.user);
		}catch(error) {
			this.$store("main").alert(this.$t("error.shoutout"));
			console.log(error);
		}
		this.shoutoutLoading = false;
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.messageData.channel_id);
	}

	public async unbanUser():Promise<void> {
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN) return;
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE) return;
		this.moderating = true;
		if(this.messageData.user.platform == "twitch") {
			await TwitchUtils.unbanUser(this.messageData.user, this.messageData.channel_id);
		}
		this.moderating = false;
		this.canUnban = false;
	}

	public async blockUser():Promise<void> {
		this.moderating = true;
		try {
			if(this.user) {
				await TwitchUtils.blockUser(this.user, this.messageData.channel_id);
			}
		}catch(error) {}
		this.moderating = false;
		this.canBlock = false;
	}

	private async loadLastStreamInfos():Promise<void> {
		this.streamInfoError = false;
		if(this.messageData.type != TwitchatDataTypes.TwitchatMessageType.RAID) return;
		this.loading = true;
		this.streamInfo = null;
		try {
			const streams = await TwitchUtils.loadChannelInfo([this.messageData.user.id]);
			if(streams && streams.length > 0) {
				this.streamInfo = streams[0];
			}
		}catch(error) {
			this.streamInfoError = true;
		}
		this.loading = false;
	}
}
</script>

<style scoped lang="less">
.chathighlight{
	.chatMessageHighlight();

	.messageHolder {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		flex-grow: 1;

		&>*:not(:first-child) {
			margin-top: .25em;
		}

		.reason {
			color: #fff;
			:deep(.small) {
				font-size: .6em;
			}

			.additionalUsers:not(.additionalUsers ~ .additionalUsers) {
				margin-left: .6em;
			}

			.additionalUsers {
				.username {
					margin-right: 0;
				}
			}
		}
	
		.message {
			font-style: italic;
			word-break: break-word;
			margin: 0;
			margin-top: .5em;
			display: block;
			color: rgba(255, 255, 255, .75);
			line-height: 1.2em;
			:deep(.cheermote), :deep(.emote) {
				max-height: 2em;
				vertical-align: middle;
				object-fit: contain;
			}
			&::before, &::after {
				content: "“";
				font-family: var(--font-nunito);
				font-style: normal;
				font-size: 2em;
				line-height: .25em;
				vertical-align: text-bottom;
				margin-right: .2em;
			}
			&::after {
				content: "”";
				margin-left: .2em;
			}
		}

		.loader {
			height: 2em;
		}

		.ctas {
			width: 100%;
			display: flex;
			flex-direction: row;
			justify-content: center;
			align-items: center;
			.button:not(:first-child) {
				margin-left: .5em;
			}
		}

		.streamInfo {
			color: @mainColor_light;
			background-color: rgba(255, 255, 255, .15);
			border-radius: .5em;
			overflow: hidden;
			width: 100%;
			.head {
				padding: .5em;
				font-weight: bold;
				background-color: rgba(255, 255, 255, .25);
				text-transform: uppercase;
			}
			.title {
				padding: .5em;
				text-align: left;
				// font-weight: bold;
			}
			.game {
				padding: .5em;;
				padding-top: 0;
				text-align: left;
				font-style: italic;
			}

			&.error {
				background-color: @mainColor_alert;
				text-align: center;
				padding:.5em;
			}
		}
	}

	.communityChallenge {
		font-size: .8em;
		color:@mainColor_light;
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-left: 1em;
		.values {
			text-align: right;
			margin-right: .25em;
			div:first-child {
				border-bottom: 1px solid @mainColor_light;
			}
		}
	}

	.userlink {
		margin-right: .25em;
	}
}
</style>