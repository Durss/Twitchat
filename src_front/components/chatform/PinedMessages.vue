<template>
	<div class="pinedmessages sidePanel">
		<div class="head">
			<div class="title">
				<Icon name="save" />
				<i18n-t scope="global" tag="h1" keypath="pin.title" :plural="$store.chat.pinedMessages.length">
					<template #COUNT>{{ $store.chat.pinedMessages.length }}</template>
				</i18n-t>
			</div>
			<ClearButton @click="close()" />
		</div>
		<div class="content">

			<div class="list">
				<div v-for="m in $store.chat.pinedMessages" :key="m.id" class="messageItem">
					<ChatMessage class="message" :messageData="m" :lightMode="true" />
					<TTButton :aria-label="$t('pin.highlightBt_aria')"
						@click.capture="chatHighlight(m)"
						class="button"
						small
						icon="highlight"
						v-tooltip="$t('pin.highlightBt_tt')"
						:loading="highlightLoading"
						:disabled="!overlayAvailable"
						/>
					<TTButton :aria-label="$t('pin.unpinBt_aria')"
						@click="unpin(m)"
						class="button"
						small
						secondary
						highlight
						icon="delete" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import {toNative,  Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import ClearButton from '../ClearButton.vue';
import Icon from '../Icon.vue';
import TTButton from '../TTButton.vue';
import ChatMessage from '../messages/ChatMessage.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ClearButton,
		ChatMessage,
	},
	emits:["close"]
})
class PinedMessages extends AbstractSidePanel {
	
	public overlayAvailable = false;
	public highlightLoading = true;

	public mounted():void {
		super.open();

		//Check if highlight overlay exists
		this.getHighlightOverPresence().then(res => {
			this.overlayAvailable = res;
			this.highlightLoading = false;
		});
	}

	/**
	 * Removes a message from pins
	 * @param m 
	 */
	public async unpin(m:TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData):Promise<void> {
		this.$store.chat.unsaveMessage(m);
		if(this.$store.chat.pinedMessages.length === 0) {
			this.close();
		}
	}
	
	/**
	 * Highlights a message on dedicated overlay
	 */
	public async chatHighlight(m:TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData):Promise<void> {
		if(!this.overlayAvailable) {
			//Open parameters if overlay is not found
			this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, TwitchatDataTypes.ParamDeepSections.HIGHLIGHT);
		}else{
			this.highlightLoading = true;
			this.$store.chat.highlightChatMessageOverlay(m);
			await Utils.promisedTimeout(1000);
			this.highlightLoading = false;
		}
	}

	/**
	 * Check if the "chat highlight" overlay exists or not
	 */
	private getHighlightOverPresence():Promise<boolean> {
		return new Promise((resolve, reject)=> {
			const timeout = window.setTimeout(() =>{
				resolve(false);
				PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, handler);
			}, 1000)
			let handler = (e:TwitchatEvent)=> {
				clearTimeout(timeout)
				resolve(true);
				PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, handler);
			}
			PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_HIGHLIGHT_OVERLAY_PRESENCE, handler);
			PublicAPI.instance.broadcast(TwitchatEvent.GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE);
		})
	}

}
export default toNative(PinedMessages);
</script>

<style scoped lang="less">
.pinedmessages{
	.content {

		.list {
			padding: .5em;
			max-width: 100%;

			.messageItem {
				display: flex;
				flex-direction: row;
				align-items: center;
				position: relative;
				gap: .25em;
				width: 100%;
				max-width: 100%;

				.message {
					flex-grow: 1;
				}

				.button {
					width: fit-content;
					min-width: fit-content;
				}

			}
		}
	}
}
</style>