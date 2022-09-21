<template>
	<div class="ChatMessageHoverActions">
		<Button :aria-label="'Track '+messageData.tags.username+' messages'"
			bounce
			:icon="$image('icons/magnet.svg')"
			data-tooltip="Track user"
			@click="trackUser()"
			/>
		<Button :aria-label="'Shoutout '+messageData.tags.username"
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
import { storeChat } from '@/store/chat/storeChat';
import { storeMain } from '@/store/storeMain';
import { storeTTS } from '@/store/tts/storeTTS';
import { storeUsers } from '@/store/users/storeUsers';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
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

	public messageData!:IRCEventDataList.Message;
	public shoutoutLoading = false;
	public highlightLoading = false;
	private sTTS = storeTTS();
	private sChat = storeChat();
	private sMain = storeMain();
	private sUsers = storeUsers();

	public get isBroadcaster():boolean { return this.messageData.tags['user-id'] == UserSession.instance.authToken.user_id; }
	public get ttsEnabled():boolean { return this.sTTS.params.enabled; }

	public trackUser():void {
		this.sUsers.trackUser(this.messageData);
	}

	public async shoutout():Promise<void> {
		this.shoutoutLoading = true;
		try {
			await this.sChat.shoutout(this.messageData.tags['display-name'] as string);
		}catch(error) {
			this.sMain.alert = "Shoutout failed :(";
			console.log(error);
		}
		this.shoutoutLoading = false;
	}

	public ttsRead() {
		this.sTTS.ttsReadMessage(this.messageData);
	}
	
	public async chatHighlight():Promise<void> {
		this.highlightLoading = true;
		this.sChat.highlightChatMessageOverlay(this.messageData);
		await Utils.promisedTimeout(1000);
		this.highlightLoading = false;
	}

	public pinMessage():void {
		const pins = this.sChat.pinedMessages as IRCEventDataList.Message[]
		//Check if message is already pinned
		if(pins.find(m => m.tags.id == this.messageData.tags.id)) {
			this.sChat.unpinMessage(this.messageData);
		}else{
			this.sChat.pinMessage(this.messageData);
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