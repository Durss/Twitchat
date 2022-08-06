<template>
	<div :class="classes" v-show="!filtered" @click.ctrl.stop.capture="copyJSON()">
		<span class="time" v-if="$store.state.params.appearance.displayTime.value">{{time}}</span>
		<img :src="icon" :alt="icon" v-if="icon" class="icon">

		<div v-if="messageData.followBlocked" class="blocked">
			<img src="@/assets/icons/emergency.svg" alt="emergency"> blocked
		</div>
		
		<div class="messageHolder">
			<span class="reason" v-html="reason"></span>
			<div class="info" v-if="info" v-html="info"></div>
			<div class="message" v-if="messageText" v-html="messageText"></div>
			<img src="@/assets/loader/loader_white.svg" alt="loader" class="loader" v-if="loading">
			<div v-if="streamInfo" class="streamInfo">
				<div class="head">Last stream infos</div>
				<div class="title">{{streamInfo.title}}</div>
				<div class="game">{{streamInfo.game_name}}</div>
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
	</div>
</template>

<script lang="ts">
import { getTwitchatMessageType, TwitchatMessageType, type IRCEventDataList } from '@/utils/IRCEventDataTypes';
import type { PubSubDataTypes } from '@/utils/PubSubDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import TwitchUtils from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import type { TrackedUser } from '@/utils/CommonDataTypes';
import StoreProxy from '@/utils/StoreProxy';

@Options({
	props:{
		lightMode:Boolean,
		messageData:Object,
	},
	components:{
		Button,
	},
	emits:["ariaMessage"]
})
export default class ChatHighlight extends Vue {
	
	public messageData!:IRCEventDataList.Highlight;
	public lightMode!:boolean;
	public messageText = '';
	public info = "";
	public icon = "";
	public filtered = false;
	public isRaid = false;
	public shoutoutLoading = false;
	public loading = false;

	private pStreamInfo:TwitchDataTypes.ChannelInfo|null = null;

	public get streamInfo():TwitchDataTypes.ChannelInfo|null {
		if(StoreProxy.store.state.params.features.raidStreamInfo.value === true) {
			return this.pStreamInfo;
		}
		return null;
	}

	public get classes():string[] {
		let res = ["chathighlight"];
		if(this.lightMode) res.push("light");
		if(this.messageData.followBlocked) res.push("followBlocked");
		if(StoreProxy.store.state.trackedUsers.findIndex((v: TrackedUser)=>v.user['user-id'] == this.messageData.tags["user-id"]) != -1) res.push("tracked");
		return res;
	}

	public get time():string {
		const message = this.messageData as IRCEventDataList.Highlight;
		const d = new Date(parseInt(message.tags['tmi-sent-ts'] as string));
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public get reason():string {
		let value:number|"prime" = 0;
		this.info = "";
		let type = getTwitchatMessageType(this.messageData);

		if(type == null) {
			console.warn("Unhandled highlight");
			console.log(this.messageData);
			this.filtered = true;
			return "";
		}

		let res = "";
		switch(type) {
			case TwitchatMessageType.FOLLOW:
				this.icon = this.$image('icons/follow.svg');
				res = `<strong>${this.messageData.username}</strong> followed your channel!`;
				this.filtered = !StoreProxy.store.state.params.filters.showFollow.value;
				break;

			case TwitchatMessageType.HYPE_TRAIN_COOLDOWN_EXPIRED:
				this.icon = this.$image('icons/train.svg');
				res = "Hype train can be started again!";
				break;

			case TwitchatMessageType.COMMUNITY_BOOST_COMPLETE:
				this.icon = this.$image('icons/boost.svg');
				res = `Your channel has been boosted to ${this.messageData.viewers} people`;
				break;

			case TwitchatMessageType.RAID:
				value = this.messageData.viewers as number;
				this.filtered = !StoreProxy.store.state.params.filters.showRaids.value;
				this.isRaid = true;
				this.icon = this.$image('icons/raid.svg');
				res = `<strong>${this.messageData.username}</strong> is raiding with a party of ${this.messageData.viewers}.`;

				if(StoreProxy.store.state.params.features.raidStreamInfo.value === true) {
					this.loadLastStreamInfos()
				}
				break;

			case TwitchatMessageType.BITS:
				value = this.messageData.tags.bits;
				res = `<strong>${this.messageData.tags.username}</strong> sent <strong>${value}</strong> bits`;
				this.icon = this.$image('icons/bits.svg');
				this.filtered = !StoreProxy.store.state.params.filters.showCheers.value;
				break;

			case TwitchatMessageType.SUB:
			case TwitchatMessageType.SUB_PRIME:
				const isResub = this.messageData.tags["msg-id"] === "resub";
				const method = isResub ? "resubscribed" : "subscribed";
				if(type == TwitchatMessageType.SUB_PRIME) {
					res = `<strong>${this.messageData.username}</strong> ${method} with Prime`;
					this.icon = this.$image('icons/prime.svg');
				}else{
					value = parseInt(this.messageData.methods?.plan as string)/1000;
					res = `<strong>${this.messageData.username}</strong> ${method} at Tier ${value}`;
					this.icon = this.$image('icons/sub.svg');
				}

				if(typeof this.messageData.tags["msg-param-cumulative-months"] === "string") {
					res += ` for ${this.messageData.tags["msg-param-cumulative-months"]} months`;
				} else if(this.messageData.months) {
					res += ` for ${this.messageData.months} months`;
				}
				if(typeof this.messageData.tags['msg-param-streak-months'] === "string") {
					res += ` (${this.messageData.tags['msg-param-streak-months']} months streak)`;
				}
				this.filtered = !StoreProxy.store.state.params.filters.showSubs.value;
				break;

			case TwitchatMessageType.SUBGIFT:
				this.icon = this.$image('icons/gift.svg');
				if(this.messageData.subgiftAdditionalRecipents && this.messageData.subgiftAdditionalRecipents.length > 0) {
					const recipients = [this.messageData.recipient].concat(this.messageData.subgiftAdditionalRecipents);
					const recipientsStr = `<strong>${recipients.join("</strong>, <strong>")}</strong>`;

					res = `<strong>${this.messageData.username}</strong> gifted <strong>${(this.messageData.subgiftAdditionalRecipents?.length+1)}</strong> Tier ${value} to ${recipientsStr}`;
				}else{
					res = `<strong>${this.messageData.username}</strong> gifted a Tier ${value} to <strong>${this.messageData.recipient}</strong>`;
				}
				break;

			case TwitchatMessageType.SUBGIFT_UPGRADE:
				this.filtered = !StoreProxy.store.state.params.filters.showSubs.value;
				this.icon = this.$image('icons/gift.svg');
				res = `<strong>${this.messageData.username}</strong> is continuing the Gift Sub they got from <strong>${this.messageData.sender}</strong>`;
				break;

			case TwitchatMessageType.REWARD: {
				this.filtered = !StoreProxy.store.state.params.filters.showRewards.value;
				this.messageText = "";
				const localObj = this.messageData.reward as PubSubDataTypes.RewardData;
				res = localObj.redemption.user.display_name;
				res += ` redeemed the reward <strong>${localObj.redemption.reward.title}</strong>`;
				res += ` <span class='small'>(${localObj.redemption.reward.cost} pts)</span>`;
				if(this.messageData.reward?.redemption.reward.image) {
					this.icon = this.messageData.reward?.redemption.reward.image.url_2x as string;
				}else{
					this.icon = this.messageData.reward?.redemption.reward.default_image.url_2x as string;
				}
				if(this.messageData.reward?.redemption.reward.prompt) {
					if(StoreProxy.store.state.params.filters.showRewardsInfos.value === true) {
						this.info = this.messageData.reward?.redemption.reward.prompt;
					}
				}
				if(this.messageData.reward?.redemption.user_input) {
					this.messageText += this.messageData.reward?.redemption.user_input;
				}
				
				let chunks = TwitchUtils.parseEmotes(this.messageText, "", false, true);
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
		}
		return res;
	}

	public async mounted():Promise<void> {
		let result = "";
		let text = this.messageData.message;
		if(text) {
			try {
				//Allow custom parsing of emotes only if it's a message of ours
				//or a reward to avoid killing performances.
				const customParsing = this.messageData.tags.id?.indexOf("00000000") == 0
										|| this.messageData.reward != null;
				let removeEmotes = !StoreProxy.store.state.params.appearance.showEmotes.value;
				let chunks = TwitchUtils.parseEmotes(text, this.messageData.tags['emotes-raw'], removeEmotes, customParsing);
				result = "";
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
				}
			}catch(error) {
				console.log(error);
				console.log(this.messageData);
				result = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
			}

			if(this.messageData.tags.bits) {
				this.messageText = await TwitchUtils.parseCheermotes(result, this.messageData.tags['room-id'] as string);
			}else{
				this.messageText = result;
			}
			
			this.$emit("ariaMessage", this.reason+" "+this.messageText);
		}
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

	public async shoutout():Promise<void> {
		this.shoutoutLoading = true;
		if(this.messageData.viewers != undefined) {
			try {
				await StoreProxy.store.dispatch("shoutout", this.messageData.username as string);
			}catch(error) {
				StoreProxy.store.state.alert = "Shoutout failed :(";
				console.log(error);
			}
		}
		this.shoutoutLoading = false;
	}

	private async loadLastStreamInfos():Promise<void> {
		this.loading = true;
		this.pStreamInfo = null;
		try {
			const users = await TwitchUtils.loadUserInfo(undefined, [this.messageData.username as string]);
			const streams = await TwitchUtils.loadChannelInfo([users[0].id]);
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

	// &.followBlocked {
		// text-decoration: line-through;
		// color: @mainColor_alert;
		// background-color: fade(@mainColor_alert, 50%);
	// }

	.blocked {
		display: inline;
		padding: .25em .5em;
		margin-right: .5em;
		border-radius: .5em;
		color: @mainColor_light;
		background-color: @mainColor_alert;
		white-space: nowrap;
		img {
			height: 1em;
			vertical-align: middle;
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
			:deep(strong) {
				font-weight: bold;
				color: @mainColor_warn;
			}
			:deep(.small) {
				font-size: .6em;
			}
		}
	
		.message {
			color: rgba(255, 255, 255, .5);
			color: @mainColor_normal;
			font-style: italic;
			:deep(.cheermote), :deep(.emote) {
				width: 2em;
				height: 2em;
				vertical-align: middle;
				object-fit: contain;
			}
			&::before {
				content: "“";
				font-family: "Nunito";
				font-size: 2em;
				vertical-align: middle;
				margin-right: 10px;
			}
			&::after {
				content: "”";
				font-family: "Nunito";
				font-size: 2em;
				vertical-align: middle;
				margin-left: 6px;
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
		:deep(.icon) {
			height: 1.5em;
			min-height: 1.5em;
		}
	}
}
</style>