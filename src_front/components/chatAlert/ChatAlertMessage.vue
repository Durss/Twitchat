<template>
	<div class="chatalertmessage" @click="$store.main.executeChatAlert(null)" v-if="message" v-tooltip="$t('global.close')">
		<div class="user">{{ $t("global.chat_alert_title", {USER:message.user.displayName}) }}</div>
		<div class="message">
			<ChatMessageChunksParser :chunks="chunks" :channel="message.channel_id" :platform="message.platform" />
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import { watch } from 'vue';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import ChatMessageChunksParser from '../messages/components/ChatMessageChunksParser.vue';

@Component({
	components:{
		ChatMessageChunksParser,
	}
})
class ChatAlertMessage extends Vue {

	public message:TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData | null = null;

	private apiCloseHandler!:() => void;

	public get chunks():TwitchatDataTypes.ParseMessageChunk[] {
		let chunks = this.message!.message_chunks.concat();
		const cmd = this.$store.main.chatAlertParams.chatCmd.trim().toLowerCase().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		let clone = JSON.parse(JSON.stringify(chunks[0]));
		clone.value = clone.value.replace(new RegExp("^"+cmd, "gi"), "");
		chunks[0] = clone;
		return chunks;
	}

	public mounted():void {
		watch(() => this.$store.main.chatAlert, async (message) => {
			if(message && this.$store.main.chatAlertParams.message === true
			&& this.$store.params.features.alertMode.value === true) {
				this.message = message;
			}else if(!message) {
				this.message = null;
			}
		})

		this.apiCloseHandler = () => {
			this.$store.main.executeChatAlert(null)
		};

		PublicAPI.instance.addEventListener("SET_HIDE_CHAT_ALERT", this.apiCloseHandler);
	}

	public beforeUnmount():void {
		PublicAPI.instance.removeEventListener("SET_HIDE_CHAT_ALERT", this.apiCloseHandler);
	}

}
export default toNative(ChatAlertMessage);
</script>

<style scoped lang="less">
.chatalertmessage{
	.center();
	position: fixed;
	z-index: 10;
	background-color: var(--color-alert);
	color: var(--color-light);
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
		background-color: var(--color-light);
		color: var(--color-alert);
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
