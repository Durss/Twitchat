<template>
	<div class="messagelist" @mouseenter="hover()" @mouseleave="out()" @mousewheel="onMouseWheel($event)">
		<div class="holder" ref="messageHolder">
			<ChatMessage v-for="m in localMessages"
				class="message"
				:key="m.tags.id"
				:messageData="m" />
		</div>
		<div class="locked" v-if="hovered || forceLock">
			<!-- data-tooltip="auto scroll locked"> -->
			<div class="label">
				<Button :icon="require('@/assets/icons/unlock.svg')" v-if="!forceLock" @click="forceLock=true" />
				<Button :icon="require('@/assets/icons/lock.svg')" v-if="forceLock" @click="forceLock=false" />
				<p>Chat auto scroll locked</p>
			</div>
			<div class="bar"></div>
		</div>

		<div v-if="localMessages.length == 0" class="noMessage">- no message -</div>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	components:{
		Button,
		ChatMessage,
	},
	props: {
		max:Number,
	}
})
export default class MessageList extends Vue {

	public max!: number;
	public hovered:boolean = false;
	public disposed:boolean = false;
	public forceLock:boolean = false;
	public catchingUpMessages:boolean = false;
	public localMessages:IRCEventDataList.Message[] = [];

	public get lockscroll():boolean {
		return this.hovered || this.forceLock || this.catchingUpMessages;
	}

	public async mounted():Promise<void> {
		this.localMessages = store.state.chatMessages.concat();
		await this.$nextTick();
		this.scrollBottom(false);
		watch(() => store.state.chatMessages, async (value) => {
			if(this.lockscroll) return;
			this.localMessages = value.concat();
			await this.$nextTick();
			this.scrollBottom();
		}, {
			deep:true
		});
	}

	public beforeUnmount():void {
		this.disposed = true;
		let el = this.$refs.messageHolder as HTMLDivElement;
		gsap.killTweensOf(el);
	}

	/**
	 * Called when mouse enters the message list
	 */
	public hover():void {
		this.hovered = true;
		let el = this.$refs.messageHolder as HTMLDivElement;
		gsap.killTweensOf(el);

		this.catchingUpMessages = true;
	}

	/**
	 * Called when mouse leaves the message list
	 */
	public async out():Promise<void> {
		this.hovered = false;
		for (let i = 0; i < store.state.chatMessages.length; i++) {
			if(this.hovered || this.forceLock || this.disposed) return;
			const m = store.state.chatMessages[i] as IRCEventDataList.Message;
			if(this.localMessages.findIndex(v => v.tags.id == m.tags.id) == -1) {
				this.localMessages.push(m);
				await Utils.promisedTimeout(75);
				await this.$nextTick();
				this.scrollBottom();
			}
		}
		this.scrollBottom();
		await Utils.promisedTimeout(250);
		this.catchingUpMessages = false;
	}

	/**
	 * If hovering and scrolling down whit wheel, load next message
	 */
	public async onMouseWheel(event:WheelEvent):Promise<void> {
		if(event.deltaY > 0) {
			for (let i = 0; i < store.state.chatMessages.length; i++) {
				const m = store.state.chatMessages[i] as IRCEventDataList.Message;
				if(this.localMessages.findIndex(v => v.tags.id == m.tags.id) == -1) {
					this.localMessages.push(m);
					await this.$nextTick();
					this.scrollBottom();
					return;
				}
			}
		}
	}

	/**
	 * Scrolls the message list to bottom
	 */
	private scrollBottom(animate:boolean = true):void {
		if(this.disposed) return;

		let el = this.$refs.messageHolder as HTMLDivElement;
		let h = (this.$el as HTMLDivElement).clientHeight
		gsap.killTweensOf(el);
		if(animate) {
			gsap.to(el, {duration: .25, scrollTo: el.scrollHeight - h});
		}else{
			el.scrollTop = el.scrollHeight - h;
		}
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
			.button {
				background: none;
			}
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