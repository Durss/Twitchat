<template>
	<div class="ChatMessageHoverActions">
		<Button :aria-label="'Track '+messageData.user.displayName+' messages'"
			bounce
			:icon="$image('icons/magnet.svg')"
			data-tooltip="Track user"
			@click="toggleTrackUser()"
			/>
		<Button :aria-label="'Shoutout '+messageData.user.displayName"
			bounce
			:icon="$image('icons/shoutout.svg')"
			data-tooltip="Shoutout"
			@click="shoutout()"
			v-if="!isBroadcaster"
			:loading="shoutoutLoading"
			/>
		<Button aria-label="TTS"
			:icon="$image('icons/tts.svg')"
			data-tooltip="TTS"
			@click="ttsRead()"
			v-if="ttsEnabled"
			/>
		<Button aria-label="Highlight message"
			bounce
			:icon="$image('icons/highlight.svg')"
			data-tooltip="Highlight on stream<br><i>(needs overlay)</i>"
			@click="chatHighlight()"
			:loading="highlightLoading"
			v-if="!messageData.automod"
			/>
		<Button aria-label="Pin message"
			bounce
			:icon="$image('icons/pin.svg')"
			data-tooltip="Pin message"
			@click="pinMessage()"
			v-if="!messageData.automod"
			/>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import UserSession from '@/utils/UserSession';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{
		messageData:Object
	},
	components:{
		Button,
	},
	emits: ["trackUser"]
})
export default class ChatMessageHoverActions extends Vue {

	public messageData!:TwitchatDataTypes.MessageChatData;
	public shoutoutLoading = false;
	public highlightLoading = false;

	public get isBroadcaster():boolean { return this.messageData.user.id == UserSession.instance.twitchAuthToken.user_id; }
	public get ttsEnabled():boolean { return this.$store("tts").params.enabled; }

	public toggleTrackUser():void {
		if(this.messageData.user.is_tracked) {
			this.$store("users").untrackUser(this.messageData.user);
		}else{
			this.$store("users").trackUser(this.messageData.user);
		}
	}

	public async shoutout():Promise<void> {
		this.shoutoutLoading = true;
		try {
			await this.$store("chat").shoutout(this.messageData.user);
		}catch(error) {
			this.$store("main").alertData = "Shoutout failed :(";
			console.log(error);
		}
		this.shoutoutLoading = false;
	}

	public ttsRead() {
		this.$store("tts").ttsReadMessage(this.messageData);
	}
	
	public async chatHighlight():Promise<void> {
		this.highlightLoading = true;
		this.$store("chat").highlightChatMessageOverlay(this.messageData);
		await Utils.promisedTimeout(1000);
		this.highlightLoading = false;
	}

	public pinMessage():void {
		const pins = this.$store("chat").pinedMessages;
		//Check if message is already pinned
		if(pins.find(m => m.id == this.messageData.id)) {
			this.$store("chat").unpinMessage(this.messageData);
		}else{
			this.$store("chat").pinMessage(this.messageData);
		}
	}
}
</script>

<style scoped lang="less">
.ChatMessageHoverActions{
	background-color: @mainColor_light;
	padding: 2px;
	border-top-left-radius: .5em;
	border-top-right-radius: .5em;
	// box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);

	.button {
		width: 1.5em;
		height: 1.5em;
		min-width: 20px;
		min-height: 20px;
		border-radius: .5em;
		padding: 0;
		// font-size: 20px;
		:deep(.icon) {
			min-width: 100%;
		}
		&:not(:last-child) {
			margin-right: 2px;
		}
	}
}
</style>