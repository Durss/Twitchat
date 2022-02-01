<template>
	<div :class="classes" v-show="!filtered" @click.ctrl="copyJSON()">
		<span class="time" v-if="$store.state.params.appearance.displayTime.value">{{time}}</span>
		<img :src="icon" :alt="icon" v-if="icon" class="icon">
		<div class="messageHolder">
			<span class="reason" v-html="reason"></span>
			<div class="message" v-if="messageText" v-html="messageText"></div>
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import { PubSubTypes } from '@/utils/PubSub';
import TwitchUtils from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		lightMode:Boolean,
		messageData:Object,
	},
	components:{}
})
export default class ChatHighlight extends Vue {
	
	public messageData!:IRCEventDataList.Highlight;
	public lightMode!:boolean;
	public messageText:string = '';
	public icon:string = "";
	public filtered:boolean = false;

	public get classes():string[] {
		let res = ["chathighlight"];
		if(this.lightMode) res.push("light");
		return res;
	}

	public get time():string {
		const message = this.messageData as IRCEventDataList.Highlight;
		const d = new Date(parseInt(message.tags['tmi-sent-ts'] as string));
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public get reason():string {
		let value:number|"prime" = 0;
		let type:"bits"|"sub"|"subgift"|"raid"|"reward"|"subgiftUpgrade"|null = null;
		if(this.messageData.tags.bits) {
			value = this.messageData.tags.bits;
			type = "bits";
			this.filtered = !store.state.params.filters.showCheers.value;
		}else if(this.messageData.methods?.prime) {
			value = "prime";
			type = "sub";
			this.filtered = !store.state.params.filters.showSubs.value;
		}else if(this.messageData.methods?.plan) {
			value = parseInt(this.messageData.methods.plan)/1000;
			type = "sub";
			this.filtered = !store.state.params.filters.showSubs.value;
		}else if(this.messageData.recipient) {
			type = "subgift";
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
			console.log("Unhandled highlight");
			console.log(this.messageData);
			this.filtered = true;
			return "";
		}

		let res = "";
		switch(type) {
			case "raid":
				this.icon = require('@/assets/icons/raid.svg');
				res = "<strong>"+this.messageData.username+"</strong> is raiding with a party of "+this.messageData.viewers+".";
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
				if(this.messageData.months) {
					res += " for "+this.messageData.months+" months";
				}
				if(this.messageData.tags['msg-param-cumulative-months']
				&& this.messageData.tags['msg-param-should-share-streak']) {
					res += " ("+this.messageData.tags['msg-param-cumulative-months']+" months streak)";
				}
				break;
			case "subgift":
				this.icon = require('@/assets/icons/gift.svg');
				res = "<strong>"+this.messageData.username+"</strong> gifted a Tier "+value+" to <strong>"+this.messageData.recipient+"</strong>";
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
				this.icon = this.messageData.reward?.redemption.reward.image.url_2x as string;
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
				//to avoid kill perfromances.
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
						let tt = "<img src='"+v.value.replace(/1.0$/gi, "3.0")+"' width='112' height='112'><br><center>"+v.emote+"</center>";
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
			}
		}
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
	}
}
</script>

<style scoped lang="less">
.chathighlight{
	background-color: rgba(255, 255, 255, .15);
	border-radius: 5px;
	margin: 5px 0;
	padding: 10px  5px!important;
	text-align: center;

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
			height: 20px;
			width: 20px;
			margin: 0 10px 0 0;
		}

		.messageHolder {
			flex-grow: 1;
			.reason {
				font-size: 1em;
			}
			.message {
				margin: 0;
				display: block;
				color: rgba(255, 255, 255, .75);
			}
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
		margin-bottom: 10px;
		margin-right: 10px;
		display: block;
		margin: auto;
		margin-bottom: 10px;
	}

	.messageHolder {
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
			margin-top: 10px;
			color: rgba(255, 255, 255, .5);
			color: @mainColor_normal;
			font-style: italic;
			:deep(.cheermote), :deep(.emote) {
				height: 30px;
				vertical-align: middle;
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
	}
}
</style>