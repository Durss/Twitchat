<template>
	<div class="chatalertmessage" @click="message = null" v-if="message" :data-tooltip="$t('global.close')">
		<div class="user">{{ $t("global.chat_alert_title", {USER:user}) }}</div>
		<div class="message" v-html="message"></div>
	</div>
</template>

<script lang="ts">
import { watch } from 'vue';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{}
})
export default class ChatAlertMessage extends Vue {

	public message:string|null = null;
	public user:string|null = null;

	public mounted():void {
		watch(() => this.$store("main").chatAlert, async (message) => {
			if(message && this.$store("main").chatAlertParams.message === true
			&& this.$store("params").features.alertMode.value === true) {
				let mess = this.$store("params").appearance.showEmotes.value? message.message_html : message.message;
				const cmd = this.$store("main").chatAlertParams.chatCmd as string;
				mess = mess.replace(new RegExp("^"+cmd+" ?", "i"), "");
				this.message = mess;
				this.user = message.user.displayName;
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