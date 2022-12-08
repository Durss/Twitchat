<template>
	<div class="chathighlight" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img :src="icon" :alt="icon" v-if="icon" class="icon">

		<ChatMessageInfos :infos="badgeInfos" />
		
		<div class="messageHolder">
			<span class="reason">
				<a class="userlink" v-if="user" @click.stop="openUserCard(user!)">{{user.displayName}}</a>
				<span class="text" v-html="reason"></span>
				<span class="additionalUsers" v-if="additionalUsers?.length > 0"
					v-for="u, index in additionalUsers" :key="u.id">
					<a class="userlink" @click.stop="openUserCard(u)">{{u.displayName}}</a>
					<span v-if="(index == additionalUsers.length-2)">and </span>
					<span v-else-if="index < additionalUsers.length-1">, </span>
				</span>
			</span>
			<div class="info" v-if="info" v-html="info"></div>
			<div class="message" v-if="messageText" v-html="messageText"></div>
			<img src="@/assets/loader/loader_white.svg" alt="loader" class="loader" v-if="loading">

			<div v-if="streamInfo" class="streamInfo">
				<div class="head">Last stream infos</div>
				<div class="title">{{streamInfo.title}}</div>
				<div class="game">{{streamInfo.game_name}}</div>
			</div>

			<div v-if="streamInfoError" class="streamInfo error">Unable to load last stream info :(</div>

			<div class="automodActions" v-if="canUnban ||canBlock">
				<Button highlight v-if="canUnban" :loading="moderating" :icon="$image('icons/mod.svg')" :title="'Unban user'" @click.stop="unbanUser()" />
				<Button highlight v-if="canBlock" :loading="moderating" :icon="$image('icons/block.svg')" :title="'Block user'" @click.stop="blockUser()" />
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
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatMessageInfos from './components/ChatMessageInfos.vue';

@Options({
	props:{
		messageData:Object,
	},
	components:{
		Button,
		ChatMessageInfos,
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
				this.canUnban = true;
				this.canBlock = true;
				break;

			case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE:
				this.icon = this.$image('icons/boost.svg');
				res = `Your channel has been boosted to ${this.messageData.viewers} people`;
				break;

			case TwitchatDataTypes.TwitchatMessageType.RAID:
				value = this.messageData.viewers;
				this.isRaid = true;
				this.icon = this.$image('icons/raid.svg');
				this.user = this.messageData.user;
				res = `is raiding with a party of ${value}.`;

				this.loadLastStreamInfos();
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
					if(this.messageData.gift_recipients) {
						this.additionalUsers = this.messageData.gift_recipients.filter(v=> v.temporary !== true);
						// const recipientsStr = `<strong>${users.map(v=>v.displayName).join("</strong>, <strong>")}</strong>`;
						res = `gifted <strong>${(this.messageData.gift_recipients.length)}</strong> Tier ${value} to`;// ${recipientsStr}`;
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
					if(this.messageData.months > 1) {
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
				if(this.messageData.reward.description && this.$store("params").appearance.showRewardsInfos.value === true) {
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
			this.$store("main").alert("Shoutout failed :(");
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

		.streamInfo {
			color: @mainColor_light;
			background-color: rgba(255, 255, 255, .15);
			border-radius: .5em;
			overflow: hidden;
			width: 90%;
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

	.soButton {
		width: 2.5em;
		min-width: 2.5em;
		height: 2.5em;
		min-height: 2.5em;
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