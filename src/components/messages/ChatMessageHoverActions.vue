<template>
	<div class="ChatMessageHoverActions">
		<Button :aria-label="'Track '+messageData.tags.username+' messages'"
			:icon="$image('icons/magnet.svg')"
			data-tooltip="Track user"
			@click="trackUser()"
			v-if="!isBroadcaster"
			/>
		<Button :aria-label="'Shoutout '+messageData.tags.username"
			:icon="$image('icons/shoutout.svg')"
			data-tooltip="Shoutout"
			@click="shoutout()"
			v-if="!isBroadcaster"
			:loading="shoutoutLoading"
			/>
		<Button :aria-label="'Shoutout '+messageData.tags.username"
			:icon="$image('icons/highlight.svg')"
			data-tooltip="Highlight on stream"
			@click="chatHighlight()"
			:loading="highlightLoading"
			/>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import TwitchUtils from '@/utils/TwitchUtils';
import UserSession from '@/utils/UserSession';
import Utils from '@/utils/Utils';
import type { JsonObject } from 'type-fest';
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

	public get isBroadcaster():boolean { return this.messageData.tags['user-id'] == UserSession.instance.authToken.user_id }

	public trackUser():void {
		store.dispatch("trackUser", this.messageData);
	}

	public async shoutout():Promise<void> {
		this.shoutoutLoading = true;
		try {
			await store.dispatch("shoutout", this.messageData.tags['display-name'] as string);
		}catch(error) {
			store.state.alert = "Shoutout failed :(";
			console.log(error);
		}
		this.shoutoutLoading = false;
	}

	public async chatHighlight():Promise<void> {
		this.highlightLoading = true;
		store.dispatch("highlightChatMessageOverlay", this.messageData);
		await Utils.promisedTimeout(1000);
		this.highlightLoading = false;
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