<template>
	<div :class="classes">

		<Button small
			aria-label="Close search"
			:icon="$image('icons/cross_white.svg')"
			@click="close()"
			class="closeBt"
		/>
		
		<h1>Search results <span class="count" v-if="messages.length > 0">({{messages.length}})</span></h1>
		<div class="messages" v-if="messages.length > 0">
			<ChatMessage
				v-for="m in messages"
				:key="m.tags.id"
				class="message"
				:messageData="m"
				:ref="'message_'+m.tags.id"
				:lightMode="true"
				:disableConversation="true"
				:enableWordHighlight="true"
			/>
		</div>

		<div class="noResult" v-if="messages.length == 0">
			No result for search "{{search}}"
		</div>
	</div>
</template>

<script lang="ts">
import store from '@/store';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import { watch } from '@vue/runtime-core';
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
export default class MessageSearch extends Vue {

	public search = "";
	public messages:IRCEventDataList.Message[] = [];

	public get classes():string[] {
		let res = ["messagesearch"];
		if(this.messages.length > 0) res.push("hasResult");
		return res;
	}

	public mounted():void {
		watch(() => store.state.searchMessages, () => {
			this.updateList();
		});
		this.updateList();
	}

	private async updateList():Promise<void> {
		if(this.search != store.state.searchMessages) {
			//If search has changed clear all current results
			//to make sure items are properly updated.
			//If an item from the prev search is still there
			//with the new search, the highlight wouldn't be
			//updated if we wouldn't remove it first.
			this.search = store.state.searchMessages;
			this.messages = [];
			await this.$nextTick();
		}

		const list = store.state.chatMessages.concat();
		const result:IRCEventDataList.Message[] = [];
		for (let i = 0; i < list.length; i++) {
			const m = list[i] as IRCEventDataList.Message;
			if(m.type != "message") continue;
			//Remove any HTML tag to avoid wrong search results
			const text = m.message.replace(/<\/?\w+(?:\s+[^\s/>"'=]+(?:\s*=\s*(?:".*?[^"\\]"|'.*?[^'\\]'|[^\s>"']+))?)*?>/gi, "");
			if(new RegExp(this.search, "gim").test(text)
			|| m.tags['display-name']?.toLowerCase() == this.search.toLowerCase()) {
				m.highlightWord = this.search;
				result.push(m);
			}
		}
		this.messages = result;
	}

	public close():void {
		store.dispatch("searchMessages", "");
	}

}
</script>

<style scoped lang="less">
.messagesearch{
	min-height: 70px;
	max-height: 10vh;
	position: relative;
	display: flex;
	flex-direction: column;


	h1 {
		text-align: center;
		color: #ffffff;
		margin: 10px 0;
		.count {
			font-size: .7em;
			font-weight: normal;
		}
	}

	.closeBt {
		.clearButton();
		position: absolute;
		top:5px;
		right:5px;
		z-index: 1;
	}

	.messages {
		overflow-y: auto;

		:deep(.time) {
			color: fade(#ffffff, 75%);
			font-size: .8em;
			vertical-align: middle;
			display: inline-block;
			margin-right: .7em;
			font-variant-numeric: tabular-nums;
		}

		.message {
			margin: .25em 0;
			font-size: var(--messageSize);
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