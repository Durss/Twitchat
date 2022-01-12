<template>
	<div :class="classes" @click="counter ++">
		<div class="holder" ref="messageHolder">
			<ChatMessage v-for="m in messages"
				class="message"
				:key="m.tags.id"
				:messageData="m" />
		</div>

		<div v-if="messages.length == 0" class="noMessage">- no message -</div>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';

@Options({
	components:{
		ChatMessage
	},
	props: {
		max:Number,
	}
})
export default class MessageList extends Vue {

	public max!: number;
	public counter:number = 0;

	public get messages():IRCEventDataList.Message[] {
		return store.state.chatMessages;
	}

	public get classes():string[] {
		let res = ["messagelist"];
		// if(this.counter%2==0) res.push("even");
		return res;
	}

	public async mounted():Promise<void> {
		watch(() => store.state.chatMessages, async () => {
			await this.$nextTick();
			this.counter ++;
			let el = this.$refs.messageHolder as HTMLDivElement;
			el.scrollTop = el.scrollHeight;
		}, {
			deep:true
		});
	}

	public beforeUnmount():void {
	}

}
</script>

<style scoped lang="less">
.messagelist{
	position: relative;

	.holder {
		max-height: 100%;
		width: 100%;
		overflow-y: auto;
		position: absolute;
		bottom: 0;
		padding: 10px;
	}

	&.even {
		.holder {
			.message:nth-child(even) {
				background-color: transparent;
			}
			.message:nth-child(odd) {
				background-color: rgba(255, 255, 255, .025);
			}
		}
	}

	.holder {
		.message:nth-child(even) {
			background-color: rgba(255, 255, 255, .025);
		}
	}

	.noMessage {
		.center();
		position:fixed;
		color: rgba(255, 255, 255, .3);
		font-family: "Inter";
		font-style: italic;
	}
}
</style>