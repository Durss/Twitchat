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
	public localMessages:IRCEventDataList.Message[] = [];
	public pendingMessages:IRCEventDataList.Message[] = [];

	public get lockscroll():boolean {
		return this.hovered || this.forceLock;
	}

	public async mounted():Promise<void> {
		this.localMessages = store.state.chatMessages.concat();
		await this.$nextTick();
		this.scrollBottom(false);
		watch(() => store.state.chatMessages, async (value) => {
			//If scrolling is locked or there are still messages pending
			//add the new messages to the pending list
			if(this.lockscroll || this.pendingMessages.length > 0) {
				for (let i = 0; i < store.state.chatMessages.length; i++) {
					const m = store.state.chatMessages[i] as IRCEventDataList.Message;
					if(this.localMessages.findIndex(v => v.tags.id == m.tags.id) == -1
					&& this.pendingMessages.findIndex(v => v.tags.id == m.tags.id) == -1) {
						this.pendingMessages.push(m)
					}
				}
				return;
			}
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
	}

	/**
	 * Called when mouse leaves the message list
	 */
	public async out():Promise<void> {
		this.hovered = false;
		let hasNext = false;
		do {
			//Catchup messages by batch to avoid performance issues
			hasNext = await this.catchupBatch();
		}while(hasNext);

		this.scrollBottom();
		await Utils.promisedTimeout(250);
	}

	/**
	 * Catches up for new messages by batch
	 * 
	 * @returns if there are more messages to catch up
	 */
	public async catchupBatch(maxCount:number = 150):Promise<boolean> {
		let addCount = 0;
		const maxLength = store.state.params.appearance.historySize.value;
		for (let i = 0; i < this.pendingMessages.length; i++) {
			if(this.hovered || this.forceLock || this.disposed) return false;
			addCount ++;
			this.localMessages.push( this.pendingMessages.shift() as IRCEventDataList.Message );
			//Limit size
			this.localMessages = this.localMessages.slice(-maxLength);
			await Utils.promisedTimeout(75);
			await this.$nextTick();
			this.scrollBottom();
			if(addCount == maxCount) break;
		}
		return this.pendingMessages.length > 0;
	}

	/**
	 * If hovering and scrolling down whit wheel, load next message
	 */
	public async onMouseWheel(event:WheelEvent):Promise<void> {
		if(event.deltaY > 0 && this.pendingMessages.length > 0) {
			const maxLength = store.state.params.appearance.historySize.value;
			this.localMessages.push( this.pendingMessages.shift() as IRCEventDataList.Message );
			this.localMessages = this.localMessages.slice(-maxLength);
			await this.$nextTick();
			this.scrollBottom();
			return;
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
				height: 40px;
				width: 38px;
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