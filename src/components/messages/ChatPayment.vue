<template>
	<div class="chatpayment">
		<span class="time" v-if="$store.state.params.appearance.displayTime.value">{{time}}</span>
		<img :src="require('@/assets/icons/'+icon+'.svg')" :alt="icon" v-if="icon" class="icon">
		<span class="reason" v-html="reason"></span>
		<div class="message" v-if="message" v-html="message"></div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import TwitchUtils from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		messageData:Object,
	},
	components:{}
})
export default class ChatPayment extends Vue {
	
	public messageData!:IRCEventDataList.Payment;
	public icon:string = "";

	/**
	 * Gets text message with parsed emotes
	 */
	public get message():string|null {
		let result:string = "";
		let text = this.messageData.message;
		if(text) {
			try {
				let removeEmotes = store.state.params.appearance.hideEmotes.value;
				let chunks = TwitchUtils.parseEmotes(text, this.messageData.tags['emotes-raw'], removeEmotes);
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
		}else{
			return null;
		}
		
		return result;
	}

	public get time():string {
		const message = this.messageData as IRCEventDataList.Payment;
		const d = new Date(parseInt(message.tags['tmi-sent-ts'] as string));
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public get reason():string {
		let value:number|"prime" = 0;
		let type:"bits"|"sub"|"subgift" = "bits";
		if(this.messageData.tags.bits) {
			value = this.messageData.tags.bits;
			type = "bits";
		}else if(this.messageData.methods?.prime) {
			value = "prime";
			type = "sub";
		}else if(this.messageData.methods?.plan) {
			value = parseInt(this.messageData.methods.plan)/1000;
			type = "sub";
		}
		if(this.messageData.recipient) {
			type = "subgift";
		}

		let res = "";
		switch(type) {
			case "bits":
				res = value+" bits";
				this.icon = "bits";
				break;
			case "sub":
				if(value == "prime") {
					res = "<strong>"+this.messageData.username+"</strong> subscribed with Prime";
					this.icon = "prime";
				}else{
					res = "<strong>"+this.messageData.username+"</strong> subscribed at Tier "+value;
					this.icon = "sub";
				}
				if(this.messageData.months) {
					res += " for "+this.messageData.months+" months";
				}
				break;
			case "subgift":
				this.icon = "gift";
				res = "<strong>"+this.messageData.username+"</strong> gifted a Tier "+value+" to <strong>"+this.messageData.recipient+"</strong>";
				break;
		}
		return res;
	}
}
</script>

<style scoped lang="less">
.chatpayment{
	background-color: rgba(255, 255, 255, .15) !important;
	border-radius: 5px;
	margin: 5px 0;
	padding: 10px  5px!important;
	text-align: center;
	font-size: 18px;

	.time {
		display: block;
		position: absolute;
	}

	.icon {
		height: 30px;
		width: 30px;
		margin-bottom: 10px;
		margin-right: 10px;
		display: block;
		margin: auto;
		margin-bottom: 10px;
	}

	.reason {
		color: #fff;
		:deep(strong) {
			font-weight: bold;
			color: @mainColor_warn;
		}
	}

	.message {
		margin-top: 10px;
		color: rgba(255, 255, 255, .5);
		color: @mainColor_normal;
		font-style: italic;
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
</style>