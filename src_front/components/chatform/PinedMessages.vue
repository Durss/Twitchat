<template>
	<div class="pinedmessages">
		<div class="content">
			<div class="title">
				<p><img src="@/assets/icons/save.svg" class="icon" />{{ $t('pin.title') }}</p>
				<Button :aria-label="$t('pin.closeBt_aria')" small :icon="$image('icons/cross_white.svg')" class="closeBt" @click="close()" />
			</div>

			<div class="list">
				<div v-for="m in $store('chat').pinedMessages" :key="m.id" class="messageItem">
					<ChatMessage class="message" :messageData="m" :lightMode="true" />
					<Button :aria-label="$t('pin.highlightBt_aria')"
						:icon="$image('icons/highlight.svg')"
						:data-tooltip="$t('pin.highlightBt_tt')"
						@click="chatHighlight(m)"
						:loading="highlightLoading"
						/>
					<Button :aria-label="$t('pin.unpinBt_aria')" class="deleteBt" small @click="unpin(m)" highlight :icon="$image('icons/delete.svg')" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import ChatMessage from '../messages/ChatMessage.vue';

@Component({
	components:{
		Button,
		ChatMessage,
	},
	emits:["close"]
})
export default class PinedMessages extends Vue {
	
	public highlightLoading = false;

	public mounted():void {
	}

	public beforeUnmount():void {
	}

	public async close():Promise<void> {
		this.$emit('close');
	}

	public async unpin(m:TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData):Promise<void> {
		this.$store("chat").unsaveMessage(m);
		if(this.$store("chat").pinedMessages.length === 0) {
			this.close();
		}
	}
	
	public async chatHighlight(m:TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData):Promise<void> {
		this.highlightLoading = true;
		this.$store("chat").highlightChatMessageOverlay(m);
		await Utils.promisedTimeout(1000);
		this.highlightLoading = false;
	}
}
</script>

<style scoped lang="less">
.pinedmessages{
	.modal();

	.content {
		width: 100%;
		height: 100%;
		overflow: auto;
		background-color: @mainColor_dark;
		@gap: 5px;

		.title {
			text-align: center;
			margin-bottom: .5em;
			color: @mainColor_light;
			background-color: @mainColor_normal;
			display: flex;
			flex-direction: row;
			p {
				padding: .5em;
				padding-left: 2em;//Makes sure title is visually centered
				flex-grow: 1;
			}
			.closeBt {
				padding: .5em;
			}
			.icon {
				height: 1em;
				margin-right: .5em;
				vertical-align: middle;
			}
		}

		.list {
			padding: .5em;

			.messageItem {
				display: flex;
				flex-direction: row;
				align-items: center;

				&:hover {
					background-color: fade(@mainColor_light, 10%);
				}

				.message {
					flex-grow: 1;
					color: #fff;
					margin: .5em 0;
				}

				.button {
					.clearButton();
					width: 1.25em;
					min-width: 1.25em;
					height: 1.25em;
					min-height: 1.25em;
				}
			}
		}
	}
}
</style>