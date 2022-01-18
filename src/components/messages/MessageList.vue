<template>
	<div :class="classes">
		<div class="holder" ref="messageHolder" @mousewheel="onMouseWheel($event)">
			<div v-for="m in localMessages" :key="m.tags.id" ref="message">
				<ChatMessage
					v-if="m.type == 'message'"
					class="message"
					:messageData="m"
					/>
				<ChatNotice
					v-if="m.type == 'notice'"
					class="message"
					:messageData="m"
					/>
				<ChatHighlight
					v-if="m.type == 'highlight'"
					class="message"
					:messageData="m"
					/>
			</div>
		</div>
		<div class="locked" v-if="(lockScroll || pendingMessages.length > 0) && !lightMode">
			<!-- data-tooltip="auto scroll locked"> -->
			<div class="label">
				<p v-if="lockScroll">Chat paused</p>
				<Button :icon="require('@/assets/icons/down.svg')" @click="unPause()" />
				<p v-if="pendingMessages.length > 0">(+{{pendingMessages.length}})</p>
			</div>
			<div class="bar"></div>
		</div>

		<div v-if="localMessages.length == 0 && !lightMode" class="noMessage">- no message -</div>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
import { watch } from '@vue/runtime-core';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatHighlight from './ChatHighlight.vue';
import ChatNotice from './ChatNotice.vue';

@Options({
	components:{
		Button,
		ChatNotice,
		ChatMessage,
		ChatHighlight,
	},
	props: {
		max:Number,
		lightMode:Boolean,
	}
})
export default class MessageList extends Vue {

	public max!: number;
	public localMessages:IRCEventDataList.Message[] = [];
	public pendingMessages:IRCEventDataList.Message[] = [];
	public lightMode:boolean = false;
	public lockScroll:boolean = false;

	private disposed:boolean = false;
	private frameIndex:number = 0;
	private virtualScrollY?:number;
	private idDisplayed:{[key:string]:boolean} = {};

	public get classes():string[] {
		let res = ["messagelist"];
		if(this.lightMode) res.push("lightMode");
		if(this.lockScroll || this.pendingMessages.length > 0) res.push("scrollLocked");

		return res;
	}

	public async mounted():Promise<void> {
		this.localMessages = store.state.chatMessages.concat();
		watch(() => store.state.chatMessages, async (value:IRCEventDataList.Message[]) => {
			//If scrolling is locked or there are still messages pending
			//add the new messages to the pending list
			if(this.lockScroll || this.pendingMessages.length > 0) {
				for (let i = 0; i < store.state.chatMessages.length; i++) {
					const m = store.state.chatMessages[i] as IRCEventDataList.Message;
					if(this.idDisplayed[value[i].tags.id as string] !== true) {
						this.idDisplayed[m.tags.id as string] = true;
						this.pendingMessages.push(m);
					}
				}
				return;
			}
			this.localMessages = value.concat();
			for (let i = 0; i < value.length; i++) {
				this.idDisplayed[value[i].tags.id as string] = true;
			}
			this.scrollToPrevMessage();
		}, {
			deep:true
		});
		
		const list = this.$refs.messageHolder as HTMLDivElement;
		list.addEventListener("scroll", ()=>{
			const el = this.$refs.messageHolder as HTMLDivElement;
			const h = (this.$el as HTMLDivElement).clientHeight;
			const maxScroll = (el.scrollHeight - h);
			const scrollAtBottom = (maxScroll - el.scrollTop) < 2;
			if(scrollAtBottom) {
				this.lockScroll = false;
			}
		});

		await this.$nextTick();
		this.renderFrame();
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	/**
	 * Catch up all pending messages
	 */
	public async unPause():Promise<void> {
		let messages = this.pendingMessages.slice(-this.max);
		this.localMessages = this.localMessages.concat(messages);
		this.pendingMessages = [];
		this.localMessages = this.localMessages.slice(-this.max);

		this.lockScroll = false;
	}

	/**
	 * If hovering and scrolling down whit wheel, load next message
	 */
	public async onMouseWheel(event:WheelEvent):Promise<void> {
		//If scrolling down while at the bottom of the list, load next message
		if(event.deltaY < 0) {
			this.lockScroll = true;
		}else{
			const el = this.$refs.messageHolder as HTMLDivElement;
			const h = (this.$el as HTMLDivElement).clientHeight;
			const maxScroll = (el.scrollHeight - h);
			if((maxScroll - el.scrollTop) < 50) {
				this.showNextPendingMessage();
			}

		}
	}

	/**
	 * Called 60 times/sec to scroll the list and load new messages
	 * if there are pending ones.
	 */
	public async renderFrame():Promise<void> {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());

		const el = this.$refs.messageHolder as HTMLDivElement;
		const h = (this.$el as HTMLDivElement).clientHeight;
		const maxScroll = (el.scrollHeight - h);
		if(!this.lockScroll) {
			if(!this.virtualScrollY) this.virtualScrollY = maxScroll;

			const dist = Math.abs(maxScroll-this.virtualScrollY);
			if(dist > 100) {
				this.virtualScrollY += 3;
			}else{
				// const ease = Math.max(.1, Math.min(100, dist)/200);
				const ease = .1;
				this.virtualScrollY += (maxScroll-this.virtualScrollY) * ease;
			}
			// if(this.virtualScrollY > maxScroll) this.virtualScrollY = maxScroll;
			el.scrollTop = this.virtualScrollY;
		}

		if(!this.lockScroll && this.pendingMessages.length > 0 && ++this.frameIndex%10 == 0) {
			this.showNextPendingMessage();
		}
		
	}

	/**
	 * Get the next pending message and display it to the list
	 */
	private showNextPendingMessage():void {
		if(this.pendingMessages.length == 0) return;
		const m = this.pendingMessages.shift() as IRCEventDataList.Message;
		this.idDisplayed[m.tags.id as string] = true;
		this.localMessages.push( m );
		if(this.localMessages.length > this.max) {
			this.localMessages = this.localMessages.slice(-this.max);
		}
		this.scrollToPrevMessage();
	}

	/**
	 * Call this after adding a new message.
	 * Will scroll so the previous message is on the bottom of the list
	 * so the new message displays smoothly from the bottom of the screen
	 */
	private async scrollToPrevMessage():Promise<void> {
		await this.$nextTick();
		const el = this.$refs.messageHolder as HTMLDivElement;
		const h = (this.$el as HTMLDivElement).clientHeight;
		const messRefs = this.$refs.message as HTMLDivElement[];
		const lastMessRef = messRefs[messRefs.length-2];
		
		if(lastMessRef) {
			this.virtualScrollY = lastMessRef.offsetTop + lastMessRef.clientHeight - h;
			el.scrollTop = this.virtualScrollY;
		}
	}

}
</script>

<style scoped lang="less">
.messagelist{
	position: relative;

	&.scrollLocked {
		.holder {
			// padding-bottom: 20px;
		}
	}

	.holder {
		max-height: 100%;
		width: 100%;
		overflow-y: auto;
		position: absolute;
		bottom: 0;
		padding: 10px 0;
		padding-bottom: 0;

		.message:nth-child(even) {
			background-color: red !important;//rgba(255, 255, 255, 1);
		}

		.message {
			color: red;
			overflow: hidden;
			font-family: "Inter";
			color: #fff;
			padding: 5px;
			min-height: 28px;
			font-size: 18px;

			:deep(.time) {
				color: fade(#ffffff, 75%);
				font-size: 13px;
				margin-right: 5px;
				vertical-align: middle;
			}
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
		// transition: padding-bottom .25s;
		.message:nth-child(even) {
			background-color: rgba(255, 255, 255, .025);
		}
	}

	&.lightMode {
		.holder {
			overflow: hidden;

			.message:nth-child(even) {
				background-color: transparent;
			}
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
			color: #fff;
			width: min-content;
			white-space: nowrap;
			margin: auto;
			padding: 5px;
			font-size: 14px;
			border-top-left-radius: 10px;
			border-top-right-radius: 10px;
			background-color: @mainColor_normal;//#888888;
			.button {
				width: 100%;
				background: none;
				padding: 0;
				&:hover {
					background: rgba(255, 255, 255, .5);
				}
			}
		}
		.bar {
			height: 10px;
			margin-top: -10px;
			border-top-left-radius: 10px;
			border-top-right-radius: 10px;
			background: linear-gradient(0deg, @mainColor_normal 10%, fade(@mainColor_normal, 0) 100%);
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