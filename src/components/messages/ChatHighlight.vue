<template>
	<div :class="classes" v-show="!filtered" @click.ctrl.stop.capture="copyJSON()">
		<span class="time" v-if="$store.state.params.appearance.displayTime.value">{{time}}</span>
		<img :src="icon" :alt="icon" v-if="icon" class="icon">
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
			:icon="require('@/assets/icons/shoutout.svg')"
			@click.stop="shoutout()"
			:loading="shoutoutLoading"
			data-tooltip="Send a shoutout"
			class="soButton"
		/>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import { PubSubTypes } from '@/utils/PubSub';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

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
	public messageText:string = '';
	public info:string = "";
	public icon:string = "";
	public filtered:boolean = false;
	public isRaid:boolean = false;
	public shoutoutLoading:boolean = false;
	public loading:boolean = false;

	private pStreamInfo:TwitchTypes.ChannelInfo|null = null;

	public get streamInfo():TwitchTypes.ChannelInfo|null {
		if(store.state.params.features.raidStreamInfo.value === true) {
			return this.pStreamInfo;
		}
		return null;
	}

	public get classes():string[] {
		let res = ["chathighlight"];
		if(this.lightMode) res.push("light");
		if(store.state.trackedUsers.findIndex(v=>v.user['user-id'] == this.messageData.tags["user-id"]) != -1) res.push("tracked");
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
		let type:"bits"|"sub"|"subgift"|"raid"|"reward"|"subgiftUpgrade"|"follow"|"hype_cooldown_expired"|"community_boost_complete"|null = null;
		if(this.messageData.tags['msg-id'] == "follow") {
			type = "follow";
			this.filtered = !store.state.params.filters.showFollow.value;

		}else if(this.messageData.tags['msg-id'] === "hype_cooldown_expired") {
			type = "hype_cooldown_expired";

		}else if(this.messageData.tags['msg-id'] === "community_boost_complete") {
			type = "community_boost_complete";

		}else if(this.messageData.tags.bits) {
			value = this.messageData.tags.bits;
			type = "bits";
			this.filtered = !store.state.params.filters.showCheers.value;
		}else if(this.messageData.methods?.prime) {
			value = "prime";
			type = "sub";
			this.filtered = !store.state.params.filters.showSubs.value;
		}else if(this.messageData.methods?.plan) {
			value = parseInt(this.messageData.methods.plan)/1000;
			type = this.messageData.recipient? "subgift" : "sub";
			this.filtered = !store.state.params.filters.showSubs.value;
		}else if(this.messageData.viewers != undefined) {
			type = "raid";
			value = this.messageData.viewers;
			this.filtered = !store.state.params.filters.showRaids.value;
		}else if(this.messageData.reward) {
			type = "reward";
			this.filtered = !store.state.params.filters.showRewards.value;
		}else if(this.messageData.tags['message-type'] == "giftpaidupgrade") {
			value = 1;
			type = "subgiftUpgrade";
			this.filtered = !store.state.params.filters.showSubs.value;
		}
		if(type == null) {
			console.warn("Unhandled highlight");
			console.log(this.messageData);
			this.filtered = true;
			return "";
		}

		let res = "";
		switch(type) {
			case "follow":
				this.icon = require('@/assets/icons/follow.svg');
				res = "<strong>"+this.messageData.username+"</strong> followed your channel!";
				break;

			case "hype_cooldown_expired":
				this.icon = require('@/assets/icons/train.svg');
				res = "Hype train can be started again!";
				break;

			case "community_boost_complete":
				this.icon = require('@/assets/icons/boost.svg');
				res = "Your channel has been boosted to "+this.messageData.viewers+" people";
				break;

			case "raid":
				this.isRaid = true;
				this.icon = require('@/assets/icons/raid.svg');
				res = "<strong>"+this.messageData.username+"</strong> is raiding with a party of "+this.messageData.viewers+".";

				if(store.state.params.features.raidStreamInfo.value === true) {
					this.loadLastStreamInfos()
				}
				break;

			case "bits":
				res = "<strong>"+this.messageData.tags.username+"</strong> sent <strong>"+value+"</strong> bits";
				this.icon = require('@/assets/icons/bits.svg');
				break;

			case "sub":
				if(value == "prime") {
					res = "<strong>"+this.messageData.username+"</strong> subscribed with Prime";
					this.icon = require('@/assets/icons/prime.svg');
				}else{
					res = "<strong>"+this.messageData.username+"</strong> subscribed at Tier "+value;
					this.icon = require('@/assets/icons/sub.svg');
				}

				if(typeof this.messageData.tags["msg-param-cumulative-months"] === "string") {
					res += " for "+this.messageData.tags["msg-param-cumulative-months"] +" months";
				} else if(this.messageData.months) {
					res += " for "+this.messageData.months+" months";
				}
				if(typeof this.messageData.tags['msg-param-streak-months'] === "string") {
					res += " ("+this.messageData.tags['msg-param-streak-months']+" months streak)";
				}
				break;

			case "subgift":
				this.icon = require('@/assets/icons/gift.svg');
				if(this.messageData.subgiftAdditionalRecipents && this.messageData.subgiftAdditionalRecipents.length > 0) {
					const recipients = [this.messageData.recipient].concat(this.messageData.subgiftAdditionalRecipents);
					const recipientsStr = "<strong>"+recipients.join("</strong>, <strong>")+"</strong>";
					res = "<strong>"+this.messageData.username+"</strong> gifted <strong>"+(this.messageData.subgiftAdditionalRecipents?.length+1)+"</strong> Tier "+value+" to "+recipientsStr;
				}else{
					res = "<strong>"+this.messageData.username+"</strong> gifted a Tier "+value+" to <strong>"+this.messageData.recipient+"</strong>";
				}
				break;

			case "subgiftUpgrade":
				this.icon = require('@/assets/icons/gift.svg');
				res = "<strong>"+this.messageData.username+"</strong> is continuing the Gift Sub they got from <strong>"+this.messageData.sender+"</strong>";
				break;

			case "reward":{
				const localObj = this.messageData.reward as PubSubTypes.RewardData;
				res = localObj.redemption.user.display_name;
				res += " redeemed the reward <strong>"+localObj.redemption.reward.title+"</strong>";
				res += " <span class='small'>("+localObj.redemption.reward.cost+" pts)</span>";
				if(this.messageData.reward?.redemption.reward.image) {
					this.icon = this.messageData.reward?.redemption.reward.image.url_2x as string;
				}else{
					this.icon = this.messageData.reward?.redemption.reward.default_image.url_2x as string;
				}
				if(this.messageData.reward?.redemption.reward.prompt) {
					if(store.state.params.filters.showRewardsInfos.value === true) {
						this.info = this.messageData.reward?.redemption.reward.prompt;
					}
				}
				if(this.messageData.reward?.redemption.user_input) {
					this.messageText += this.messageData.reward?.redemption.user_input;
				}
				break;
			}
		}
		return res;
	}

	public async mounted():Promise<void> {
		let result:string = "";
		let text = this.messageData.message;
		if(text) {
			try {
				//Allow custom parsing of emotes only if it's a message of ours
				//to avoid killing performances.
				const customParsing = this.messageData.tags.username?.toLowerCase() == store.state.user.login.toLowerCase();
				let removeEmotes = !store.state.params.appearance.showEmotes.value;
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
				await TwitchUtils.shoutout(this.messageData.username as string);
			}catch(error) {
				store.state.alert = "Shoutout failed :(";
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
		@c1:fade(@mainColor_warn_extralight,5%);
		@c2:fade(@mainColor_warn_extralight,10%);
		// background-color: @c1;
		@s1:5px;
		@s2:10px;
		background-image: repeating-linear-gradient(90deg, @c1, @c1 @s1, @c2 @s1, @c2 @s2);
		border-left: 5px solid @mainColor_warn_extralight;
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