<template>
	<div :class="classes" @click.ctrl.stop="copyJSON()">
		<span class="time" v-if="$store.state.params.appearance.displayTime.value">{{time}}</span>
		<!-- {{messageData.channel}} -->
		<img :src="$image('icons/'+icon+'.svg')" alt="notice" class="icon">
		<span class="message" v-html="text"></span>
	</div>
</template>

<script lang="ts">
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		messageData:Object,
	},
	components:{},
	emits:["ariaMessage"]
})
export default class ChatNotice extends Vue {
	
	public messageData!:IRCEventDataList.Notice;
	public icon = "infos";

	/**
	 * Gets text message with parsed emotes
	 */
	public get text():string {
		const mess = this.messageData as IRCEventDataList.Notice;
		let text = mess.message;
		if(text){
			text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;")
			text = text.replace(/&lt;(\/)?strong&gt;/gi, "<$1strong>");//Allow <strong> tags
			text = text.replace(/&lt;(\/)?mark&gt;/gi, "<$1mark>");//Allow <mark> tags
		}else{
			text = "";
		}
		
		return text;
	}

	public get classes():string[] {
		let res = ["chatnotice"];
		if(this.messageData.tags["msg-id"] == "offline") res.push("alert");
		if(this.messageData.tags["msg-id"] == "emergencyMode") res.push("emergency");
		return res;
	}

	public get time():string {
		const message = this.messageData as IRCEventDataList.Notice;
		const d = new Date(parseInt(message.tags['tmi-sent-ts'] as string));
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public mounted():void {
		switch(this.messageData.tags["msg-id"]) {
			case "online": this.icon = "enter"; break;
			case "offline": this.icon = "leave"; break;
			case "emergencyMode": this.icon = "emergency"; break;
		}
		this.$emit("ariaMessage", this.text);
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
	}
}
</script>

<style scoped lang="less">
.chatnotice{

	.icon {
		width: 1.25em;
		height: 1.25em;
		margin-right: 5px;
		vertical-align: middle;
	}
	.message {
		font-style: italic;
		opacity: .7;
		color: @mainColor_warn;

		:deep(mark) {
			margin: 0 .2em;
			color: lighten(@mainColor_warn, 15%);
		}
	}

	&.emergency {
		padding: .5em;
		border-radius: .5em;
		background-color: @mainColor_alert;
		.message {
			color: @mainColor_light;
			opacity: 1;
			:deep(mark) {
				color: inherit;
			}
		}
	}

	&.alert {
		.message {
			color: @mainColor_alert;
			:deep(mark) {
				color: lighten(@mainColor_alert, 10%);
			}
		}
	}
}
</style>