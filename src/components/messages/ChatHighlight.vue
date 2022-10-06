<template>
	<div :class="classes" @click.ctrl.stop.capture="copyJSON()">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img :src="icon" :alt="icon" v-if="icon" class="icon">

		<ChatMessageInfos :infos="badgeInfos" />
		
		<div class="messageHolder">
			<span class="reason">
				<span class="username" v-if="user" @click="openUserCard()">{{user}}</span>
				<span class="text" v-html="reason"></span>
			</span>
			<div class="info" v-if="info" v-html="info"></div>
			<div class="message" v-if="messageText" v-html="messageText"></div>
			<img src="@/assets/loader/loader_white.svg" alt="loader" class="loader" v-if="loading">

			<div v-if="streamInfo" class="streamInfo">
				<div class="head">Last stream infos</div>
				<div class="title">{{streamInfo.title}}</div>
				<div class="game">{{streamInfo.game_name}}</div>
			</div>

			<div class="automodActions" v-if="allowUnban">
				<Button highlight v-if="canUnban" :loading="moderating" :icon="$image('icons/mod.svg')" :title="'Unban user'" @click="unbanUser()" />
				<Button highlight v-if="canBlock" :loading="moderating" :icon="$image('icons/block.svg')" :title="'Block user'" @click="blockUser()" />
			</div>
		</div>
		<Button v-if="isRaid"
			aria-label="Send a shoutout"
			small 
			:icon="$image('icons/shoutout.svg')"
			@click.stop="shoutout()"
			:loading="shoutoutLoading"
			data-tooltip="Send a shoutout"
			class="soButton"
		/>

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
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatMessageInfos from './ChatMessageInfos.vue';

@Options({
	props:{
		lightMode:Boolean,
		messageData:Object,
	},
	components:{
		Button,
		ChatMessageInfos,
	},
	emits:["ariaMessage"]
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
	public lightMode!:boolean;
	public messageText = '';
	public info = "";
	public icon = "";
	public user:TwitchatDataTypes.TwitchatUser|null = null;
	public isRaid = false;
	public shoutoutLoading = false;
	public loading = false;
	public allowUnban = false;
	public moderating = false;
	public canUnban = true;
	public canBlock = true;
	public badgeInfos:TwitchatDataTypes.MessageBadgeData[] = [];
	
	private pStreamInfo:TwitchDataTypes.ChannelInfo|null = null;

	public get streamInfo():TwitchDataTypes.ChannelInfo|null {
		if(this.$store("params").features.raidStreamInfo.value === true) {
			return this.pStreamInfo;
		}
		return null;
	}

	public get classes():string[] {
		let res = ["chathighlight"];
		if(this.lightMode) res.push("light");
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			if(this.messageData.user.is_tracked) res.push("tracked");
		}
		return res;
	}

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
				res = `followed your channel!`;
				break;

			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN:
				this.icon = this.$image('icons/train.svg');
				res = "Hype train can be started again!";
				break;

			case TwitchatDataTypes.TwitchatMessageType.AUTOBAN_JOIN:
				this.icon = this.$image('icons/mod.svg');
				this.user = this.messageData.user;
				res = "has been banned by automod after joining the chat as their nickname matches the following rule: \"<i>"+this.messageData.rule.label+"</i>\"";
				this.allowUnban = true;
				break;

			case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE:
				this.icon = this.$image('icons/boost.svg');
				res = `Your channel has been boosted to ${this.messageData.viewers} people`;
				break;

			case TwitchatDataTypes.TwitchatMessageType.RAID:
				value = this.messageData.raid.viewerCount;
				this.isRaid = true;
				this.icon = this.$image('icons/raid.svg');
				this.user = this.messageData.user;
				res = `is raiding with a party of ${value}.`;

				if(this.$store("params").features.raidStreamInfo.value === true) {
					this.loadLastStreamInfos()
				}
				break;

			case TwitchatDataTypes.TwitchatMessageType.CHEER:
				value = this.messageData.bits;
				this.user = this.messageData.user;
				res = `sent <strong>${value}</strong> bits`;
				this.icon = this.$image('icons/bits.svg');
				break;

			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION:{
				if(this.messageData.is_gift) {

					this.icon = this.$image('icons/gift.svg');
					value = this.messageData.tier;
					this.user = this.messageData.user;
					if(this.messageData.gift_recipients && this.messageData.gift_recipients.length > 0) {
						const recipientsStr = `<strong>${this.messageData.gift_recipients.join("</strong>, <strong>")}</strong>`;
						res = `gifted <strong>${(this.messageData.gift_recipients.length)}</strong> Tier ${value} to ${recipientsStr}`;
					}

				}else if(this.messageData.is_giftUpgrade) {
					this.icon = this.$image('icons/sub.svg');
					this.user = this.messageData.user;
					res = `is continuing the Gift Sub they got from <strong>${this.messageData.gift_upgradeSender!.displayName}</strong>`;

				}else{
					const method = this.messageData.is_resub ? "resubscribed" : "subscribed";
					this.user = this.messageData.user;
					if(this.messageData.tier == "prime") {
						res = `${method} with Prime`;
						this.icon = this.$image('icons/prime.svg');
					}else{
						value = this.messageData.tier;
						res = `${method} at Tier ${value}`;
						this.icon = this.$image('icons/sub.svg');
					}
	
					if(typeof this.messageData.totalSubDuration === "string") {
						res += ` for ${this.messageData.totalSubDuration} months`;
					} else {
						res += ` for 1 month`;
					}
					let extras:string[] = [];
					if(typeof this.messageData.months) {
						extras.push(`for ${this.messageData.months} months in advance`);
					}
					if(typeof this.messageData.streakMonths === "string") {
						extras.push(`${this.messageData.streakMonths} months streak`);
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
				res = "";
				res += ` redeemed the reward <strong>${this.messageData.reward.title}</strong>`;
				if(this.messageData.reward.cost > -1) {//It's set to -1 for "highlight my message" reward
					res += ` <span class='small'>(${this.messageData.reward.cost} pts)</span>`;
				}
				const img = this.messageData.reward.icon;
				this.icon = img.hd ?? img.sd;
				if(this.messageData.reward.description && this.$store("params").filters.showRewardsInfos.value === true) {
					this.info = this.messageData.reward.description;
				}
				if(this.messageData.message) {
					this.messageText += this.messageData.message;
				}
				
				let chunks = TwitchUtils.parseEmotesToChunks(this.messageText, "", false, true);
				let result = "";
				for (let i = 0; i < chunks.length; i++) {
					const v = chunks[i];
					if(v.type == "text") {
						v.value = v.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");//Avoid XSS attack
						result += Utils.parseURLs(v.value);
					}else if(v.type == "emote") {
						let url = v.value.replace(/1.0$/gi, "3.0");//Twitch format
						url = url.replace(/1x$/gi, "3x");//BTTV format
						url = url.replace(/2x$/gi, "3x");//7TV format
						url = url.replace(/1$/gi, "4");//FFZ format
						let tt = "<img src='"+url+"' width='112' height='112'><br><center>"+v.label+"</center>";
						result += "<img src='"+v.value+"' data-tooltip=\""+tt+"\" class='emote'>";
					}
					this.messageText = result;
				}
				break;
			}

			case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION: {
				this.user = this.messageData.user;
				res = "Contributed "+this.messageData.contribution+"pts";
				if(this.messageData.contribution != this.messageData.total_contribution) {
					res += " <i>("+this.messageData.total_contribution+"pts total)</i>";
				}
				res += " to the challenge \"<strong>"+this.messageData.challenge.title+"</strong>\"";
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
				this.$emit("ariaMessage", this.reason+" "+this.messageText);
				break;
			}

			case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
				//Add twitchat's automod badge
				if(this.messageData.automod) {
					this.badgeInfos.push({type:"automod", tooltip:"<strong>Rule:</strong> "+this.messageData.automod.label});
				}
				break;
			}

			case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
				if(this.messageData.blocked === true) {
					this.badgeInfos.push({ type:"emergencyBlocked" });
				}else{
					let message = this.messageData;
					//Watch for change so it updates in case of a follow bot raid
					watch(()=>message.blocked, ()=> {
						if(message.blocked) {
							this.badgeInfos.push({ type:"emergencyBlocked" })
						}
					});
				}
				break;
			}
		}
	}


	public copyJSON():void {
		console.log(this.messageData);
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

	public async shoutout():Promise<void> {
		if(this.messageData.type != TwitchatDataTypes.TwitchatMessageType.RAID) return;

		this.shoutoutLoading = true;
		try {
			await this.$store("chat").shoutout(this.messageData.user);
		}catch(error) {
			this.$store("main").alert = "Shoutout failed :(";
			console.log(error);
		}
		this.shoutoutLoading = false;
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.user);
	}

	public async unbanUser():Promise<void> {
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN) return;
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE) return;
		this.moderating = true;
		if(this.messageData.user.platform == "twitch") {
			await TwitchUtils.unbanUser(this.messageData.user.id);
		}
		this.moderating = false;
		this.canUnban = false;
	}

	public async blockUser():Promise<void> {
		this.moderating = true;
		try {
			const user = await TwitchUtils.loadUserInfo([this.user!.id]);
			if(user?.length > 0) {
				await TwitchUtils.blockUser(user[0].id)
			}
		}catch(error) {}
		this.moderating = false;
		this.canBlock = false;
	}

	private async loadLastStreamInfos():Promise<void> {
		if(this.messageData.type != TwitchatDataTypes.TwitchatMessageType.RAID) return;
		this.loading = true;
		this.pStreamInfo = null;
		try {
			const streams = await TwitchUtils.loadChannelInfo([this.messageData.user.id]);
			if(streams && streams.length > 0) {
				this.pStreamInfo = streams[0];
			}
		}catch(error) {
			//TODO
		}
		this.loading = false;
	}
}
</script>

<style scoped lang="less">
.chathighlight{
	background-color: rgba(255, 255, 255, .15);
	border-radius: 5px;
	margin: 5px 0;
	padding: 5px;
	// text-align: center;

	&.light {
		// background-color: transparent;
		display: flex;
		flex-direction: row;
		align-items: center;
		.time {
			display: inline-block;
			position: relative;
			font-variant-numeric: tabular-nums;
		}
		.icon {
			width: 1.4em;
			height: 1.4em;
			margin: 0 .5em;
		}

		.messageHolder {
			flex-grow: 1;
			.reason {
				font-size: 1em;
			}

			.message, .info {
				margin: 0;
				margin-top: .5em;
				display: block;
				color: rgba(255, 255, 255, .75);
				line-height: 1.2em;
			}

			.info {
				color: @mainColor_warn;
			}
			.automodActions {
				width: 100%;
				display: flex;
				flex-direction: row;
				justify-content: center;
				align-items: center;
				.button:not(:first-child) {
					margin-left: .5em;
				}
			}
		}
	}

	&.tracked {
		border-image-slice: 1;
		border-left: .6em solid rgba(255, 255, 255, 1);
		background-color: rgba(255, 255, 255, .2);
		.message {
			color: #fff;
		}
	}

	.time {
		display: block !important;
		position: absolute;
		font-variant-numeric: tabular-nums;
	}

	.icon {
		height: 40px;
		width: 40px;
		display: block;
		margin-bottom: 10px;
		margin-right: 10px;
		margin-left: 10px;
	}

	.messageHolder {
		display: flex;
		flex-direction: column;
		align-items: flex-start;

		&>*:not(:first-child) {
			margin-top: 10px;
		}

		.reason {
			color: #fff;
			:deep(.small) {
				font-size: .6em;
			}
			.username {
				font-weight: bold;
				color: @mainColor_warn;
				margin-right: .25em;
				cursor: pointer;
			}
		}
	
		.message {
			color: rgba(255, 255, 255, .5);
			color: @mainColor_normal;
			font-style: italic;
			word-break: break-word;
			:deep(.cheermote), :deep(.emote) {
				max-height: 2em;
				vertical-align: middle;
				object-fit: contain;
			}
			&::before, &::after {
				content: "“";
				font-family: "Nunito";
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

		.streamInfo {
			color: @mainColor_light;
			background-color: rgba(255, 255, 255, .15);
			border-radius: 5px;
			overflow: hidden;
			width: 90%;
			.head {
				padding: .5em;
				font-weight: bold;
				background-color: rgba(255, 255, 255, .25);
				text-transform: uppercase;
			}
			.title {
				padding: 5px;
				text-align: left;
				// font-weight: bold;
			}
			.game {
				padding: 5px;
				padding-top: 0;
				text-align: left;
				font-style: italic;
			}
		}
	}

	.soButton {
		min-width: 2.5em;
		width: 2.5em;
		:deep(.icon) {
			height: 1.5em;
			min-height: 1.5em;
		}
	}

	.communityChallenge {
		font-size: .8em;
		color:@mainColor_light;
		display: flex;
		flex-direction: row;
		align-items: center;
		.values {
			text-align: right;
			margin-right: .25em;
			div:first-child {
				border-bottom: 1px solid @mainColor_light;
			}
		}
	}
}
</style>