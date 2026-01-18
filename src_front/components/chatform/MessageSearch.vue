<template>
	<div :class="classes">
		<div class="head">
			<div class="title">
				<Icon name="search" />
				<i18n-t scope="global" tag="h1" keypath="search.title">
					<template #COUNT><span class="count" v-if="messages.length > 0"> | {{messages.length}}</span></template>
				</i18n-t>
			</div>
			
			<i18n-t scope="global" class="description" tag="span" keypath="search.subtitle">
				<template #SEARCH><span class="search">{{search}}</span></template>
			</i18n-t>
			
			<ClearButton @click="close()" />
		</div>

		<div class="content" ref="holder">
			<div class="messages" v-if="messages.length > 0">
				<ChatMessage
					v-for="m in messages"
					class="message"
					:ref="'message_'+m.id"
					:key="m.id"
					:messageData="m"
					lightMode
					:highlightedWords="[search]"
					:enableWordHighlight="true"
				/>
			</div>

			<div class="noResult" v-if="messages.length == 0">
				{{ $t("search.no_result", {SEARCH:search}) }}
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import {toNative,  Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import ChatMessage from '../messages/ChatMessage.vue';

@Component({
	components:{
		Button: TTButton,
		ClearButton,
		ChatMessage,
	},
	emits:["close"]
})
class MessageSearch extends AbstractSidePanel {

	public search = "";
	public messages:TwitchatDataTypes.ChatMessageTypes[] = [];

	public get classes():string[] {
		let res = ["messagesearch", "sidePanel"];
		if(this.messages.length > 0) res.push("hasResult");
		return res;
	}

	public mounted():void {
		watch(() => this.$store.chat.searchMessages, () => {
			this.updateList();
		});
		this.updateList();
		super.open();
	}

	public async close():Promise<void> {
		this.$store.chat.doSearchMessages("");
		super.close();
	}

	private async updateList():Promise<void> {
		if(this.$store.chat.searchMessages.length === 0) return;

		if(this.search != this.$store.chat.searchMessages) {
			//If search has changed clear all current results
			//to make sure items are properly updated.
			//If an item from the prev search is still there
			//with the new search, the highlight wouldn't be
			//updated if we wouldn't remove it first.
			this.search = this.$store.chat.searchMessages;
			this.messages = [];
			await this.$nextTick();
		}

		const list = this.$store.chat.messages.concat();
		const result:TwitchatDataTypes.ChatMessageTypes[] = [];
		for (const m of list) {
			if(m.type != "message") continue;
			//Remove any HTML tag to avoid wrong search results
			const text = Utils.stripHTMLTags(m.message);
			// const text = m.message.replace(/<[^>]*?>/gi, "");
			if(new RegExp(this.search, "gim").test(text)
			|| m.user.displayName.toLowerCase() == this.search.toLowerCase()) {
				result.push(m);
			}
		}
		this.messages = result;
		await this.$nextTick();
		const holder = this.$refs.holder as HTMLDivElement;
		holder.scrollTop = holder.scrollHeight;
	}

}
export default toNative(MessageSearch);
</script>

<style scoped lang="less">
.messagesearch{

	.count {
		font-size: .7em;
		font-weight: normal;
	}

	.messages {
		gap: .5em;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		position: relative;
		flex-shrink: 0;

		.message {
			margin: .25em 0;
			
			&:nth-child(odd) {
				background-color: rgba(255, 255, 255, .05);
				&:hover {
					background-color: rgba(255, 255, 255, .2);
				}
			}
		}
	}

	.noResult {
		color: #ffffff;
		opacity: .5;
		font-size: 14px;
		font-style: italic;
		text-align: center;
	}
}
</style>