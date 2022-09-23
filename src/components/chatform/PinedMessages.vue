<template>
	<div class="pinedmessages">
		<div class="content">
			<div class="title">
				<p><img src="@/assets/icons/pin.svg" class="icon" />Pined messages</p>
				<Button aria-label="Close users list" small :icon="$image('icons/cross_white.svg')" class="closeBt" @click="close()" />
			</div>

			<div class="list">
				<div v-for="m in $store('chat').pinedMessages" :key="m.tags.id" class="messageItem">
					<ChatMessage class="message" :messageData="m" :lightMode="true" />
					<Button aria-label="Highlight message"
						:icon="$image('icons/highlight.svg')"
						data-tooltip="Highlight on stream<br><i>(needs overlay)</i>"
						@click="chatHighlight(m)"
						:loading="highlightLoading"
						/>
					<Button class="deleteBt" small @click="unpin(m)" highlight :icon="$image('icons/delete.svg')" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatMessage from '../messages/ChatMessage.vue';

@Options({
	props:{},
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

	public async unpin(m:IRCEventDataList.Message):Promise<void> {
		this.$store("chat").unpinMessage(m);
		if(this.$store("chat").pinedMessages.length === 0) {
			this.close();
		}
	}
	
	public async chatHighlight(m:IRCEventDataList.Message):Promise<void> {
		this.highlightLoading = true;
		this.$store("chat").highlightChatMessageOverlay(m);
		await Utils.promisedTimeout(1000);
		this.highlightLoading = false;
	}
}
</script>

<style scoped lang="less">
.pinedmessages{
	
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
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
					font-size: var(--messageSize);
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