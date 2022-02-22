<template>
	<div :class="classes">

		<Button small
			:icon="require('@/assets/icons/cross_white.svg')"
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
import { IRCEventDataList } from '@/utils/IRCEvent';
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

	public search:string = "";
	public messages:IRCEventDataList.Message[] = [];

	public get classes():string[] {
		let res = ["messagesearch"];

		res.push("size_"+store.state.params.appearance.defaultSize.value);
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
			console.log(this.search);
			if(new RegExp(this.search, "gim").test(m.message.replace(/<\/?\w+(?:\s+[^\s/>"'=]+(?:\s*=\s*(?:".*?[^"\\]"|'.*?[^'\\]'|[^\s>"']+))?)*?>/gi, ""))) {
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
	max-height: 50vh;
	position: relative;
	display: flex;
	flex-direction: column;

	&.hasResult {
		// min-height: 120px;
	}

	&.size_1 {
		.messages {
			.message{ font-size: 11px; padding: 2px; }
		}
	}
	&.size_2 {
		.messages {
			.message{ font-size: 13px; padding: 2px; }
		}
	}
	&.size_3 {
		.messages {
			.message{ font-size: 18px; padding: 5px; }
		}
	}
	&.size_4 {
		.messages {
			.message{ font-size: 24px; padding: 5px; }
		}
	}
	&.size_5 {
		.messages {
			.message{ font-size: 30px; padding: 10px; }
		}
	}

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
			font-size: 11px;
			vertical-align: middle;
			min-width: 36px;
			display: inline-block;
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