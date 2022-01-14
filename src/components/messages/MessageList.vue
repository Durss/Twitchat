<template>
	<div class="messagelist" @mouseenter="hover()" @mouseleave="out()">
		<div class="holder" ref="messageHolder">
			<ChatMessage v-for="m in localMessages"
				class="message"
				:key="m.tags.id"
				:messageData="m" />
		</div>
		<div class="locked" v-if="lockscroll">
			<!-- data-tooltip="auto scroll locked"> -->
			<div class="label">Chat auto scroll locked</div>
			<!-- <img src="@/assets/icons/lock.svg" alt="lock"> -->
			<div class="bar"></div>
		</div>

		<div v-if="localMessages.length == 0" class="noMessage">- no message -</div>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap/all';
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
	public lockscroll:boolean = false;
	public localMessages:IRCEventDataList.Message[] = [];

	// public get messages():IRCEventDataList.Message[] {
	// 	return store.state.chatMessages;
	// }

	public async mounted():Promise<void> {
		watch(() => store.state.chatMessages, async (value) => {
			if(this.lockscroll) return;
			this.localMessages = value.concat();
			await this.$nextTick();
			let el = this.$refs.messageHolder as HTMLDivElement;
			let h = (this.$el as HTMLDivElement).clientHeight
			gsap.killTweensOf(el);
			gsap.to(el, {duration: .25, scrollTo: el.scrollHeight - h});
		}, {
			deep:true
		});
	}

	public beforeUnmount():void {
	}

	public hover():void {
		this.lockscroll = true;
	}

	public out():void {
		this.lockscroll = false;
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
		.message {
			overflow-x: hidden;
		}
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

	.locked {
		z-index: 1;
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		padding: 0;
		margin: 0;
		text-align: center;
		border-radius: 5px;
		img {
			padding: 10px;
			// background-color: rgb(136, 136, 136);
			background: #888888;//linear-gradient(0deg, rgba(136, 136, 136, 1) 25%, rgba(136, 136, 136, 0) 100%);
			height: 40px;
			width: 38px;
			border-top-left-radius: 20px;
			border-top-right-radius: 20px;
		}
		.label {
			color: #000;
			width: min-content;
			white-space: nowrap;
			margin: auto;
			padding: 5px;
			font-size: 14px;
			border-top-left-radius: 10px;
			border-top-right-radius: 10px;
			background-color: #888888;
		}
		.bar {
			height: 10px;
			margin-top: -10px;
			border-top-left-radius: 10px;
			border-top-right-radius: 10px;
			background: linear-gradient(0deg, rgba(136, 136, 136, 1) 10%, rgba(136, 136, 136, 0) 100%);
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