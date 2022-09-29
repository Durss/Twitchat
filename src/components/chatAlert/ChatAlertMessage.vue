<template>
	<div class="chatalertmessage" @click="message = null" v-if="message" data-tooltip="Close">
		<div class="user">{{user}} says</div>
		<div class="message" v-html="message"></div>
	</div>
</template>

<script lang="ts">
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import TwitchUtils from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { watch } from 'vue';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{},
	components:{}
})
export default class ChatAlertMessage extends Vue {

	public message:string|null = null;
	public user:string|null = null;

	public mounted():void {
		watch(() => this.$store("main").chatAlert, async (message:IRCEventDataList.Message|IRCEventDataList.Whisper|null) => {
			if(message && this.$store("main").chatAlertParams.message === true
			&& this.$store("params").features.alertMode.value === true) {
				let text = message.type == "whisper"? message.params[1] : message.message;
				console.log(text);
				//Allow custom parsing of emotes only if it's a message of ours sent from current IRC client
				const customParsing = message.sentLocally === true;
				console.log("Custom", customParsing);
				console.log(message.tags['emotes-raw']);
				let removeEmotes = !this.$store("params").appearance.showEmotes.value;
				let chunks = TwitchUtils.parseEmotesToChunks(text, message.tags['emotes-raw'], removeEmotes, customParsing);
				let result = "";
				console.log(chunks);
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
						result += "<img src='"+url+"' data-tooltip=\""+tt+"\" class='emote'>";
					}
				}
				const cmd = this.$store("main").chatAlertParams.chatCmd as string;
				result = result.replace(new RegExp("^"+cmd+" ?", "i"), "");
				this.message = result;
				this.user = message.tags.username as string;
			}
		})
	}

}
</script>

<style scoped lang="less">
.chatalertmessage{
	.center();
	position: fixed;
	z-index: 10;
	background-color: @mainColor_alert;
	color: @mainColor_light;
	font-size: 1.5em;
	border-radius: 1em;
	width: 90vw;
	max-height: 90vh;
	overflow: hidden;
	cursor: pointer;

	.user {
		font-size: 1.5em;
		padding: .3em;
		font-weight: bold;
		text-align: center;
		background-color: @mainColor_light;
		color: @mainColor_alert;
	}
	
	.message {
		overflow: hidden;
		text-align: center;
		padding: 1em;
		word-break: break-word;
		:deep(.emote) {
			max-height: 1em;
		}
	}
}
</style>