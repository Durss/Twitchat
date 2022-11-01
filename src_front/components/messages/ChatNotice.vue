<template>
	<div :class="classes" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<!-- {{messageData.channel}} -->
		<img :src="$image('icons/'+icon+'.svg')" alt="notice" class="icon">
		<span class="message" v-html="message"></span>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		messageData:Object,
	},
	components:{},
	emits:["ariaMessage", "onRead"]
})
export default class ChatNotice extends Vue {
	
	public messageData!:TwitchatDataTypes.MessageNoticeData;
	public icon = "infos";

	/**
	 * Gets text message with parsed emotes
	 */
	public get message():string {
		let text = this.messageData.message ?? "";
			text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;")
			text = text.replace(/&lt;(\/)?strong&gt;/gi, "<$1strong>");//Allow <strong> tags
			text = text.replace(/&lt;(\/)?mark&gt;/gi, "<$1mark>");//Allow <mark> tags
		return text;
	}

	public get classes():string[] {
		let res = ["chatnotice"];
		if(this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.OFFLINE
		|| this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.COMMERCIAL_ERROR) res.push("alert");
		if(this.messageData.noticeId == TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE) res.push("emergency");
		return res;
	}

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public mounted():void {
		switch(this.messageData.noticeId) {
			case TwitchatDataTypes.TwitchatNoticeType.ONLINE:			this.icon = "enter"; break;
			case TwitchatDataTypes.TwitchatNoticeType.OFFLINE:			this.icon = "leave"; break;
			case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE:	this.icon = "emergency"; break;
		}
		this.$emit("ariaMessage", this.message);
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}
}
</script>

<style scoped lang="less">
.chatnotice{
	.chatMessage();

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