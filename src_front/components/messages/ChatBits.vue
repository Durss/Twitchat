<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<Icon name="bits" alt="bits" class="icon"/>

		<div class="holder">
			<i18n-t scope="global" tag="span" keypath="chat.bits" :plural="totalBits">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard()">{{messageData.user.displayName}}</a>
				</template>
				<template #BITS>
					<strong>{{ totalBits }}</strong>
				</template>
			</i18n-t>
	
			<div class="quote" v-if="messages.length > 0">
				<span v-tooltip="messages.length > 1? mess.bits+' bits' : null" v-for="mess in messages"><ChatMessageChunksParser :chunks="mess.message_chunks" :channel="mess.channel_id" :platform="mess.platform" /></span>
			</div>
	
			<!-- <div class="quote" v-if="children" v-for="child in children">
			</div> -->
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';

@Component({
	components:{
		ChatMessageChunksParser,
	},
	emits:["onRead"],
})
export default class ChatBits extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageCheerData;

	@Prop
	declare children:TwitchatDataTypes.MessageCheerData[];

	public get classes():string[] {
		let res = ["chatbits", "chatMessage", "highlight"];
		if(this.messageData.deleted === true) res.push("deleted");
		return res;
	}

	public get totalBits():number {
		let res = this.messageData.bits;
		if(this.children) {
			this.children.forEach(m => res += m.bits);
		}
		return res;
	}

	public get messages():TwitchatDataTypes.MessageCheerData[] {
		let res:TwitchatDataTypes.MessageCheerData[] =  [];
		if(this.messageData.message_chunks) res.push(this.messageData);
		if(this.children) {
			this.children.forEach(m => {
				if(m.message_chunks) res.push(m);
			});
		}
		return res;
	}

	public mounted():void {
		const reason = this.$tc("chat.bits", {COUNT:this.totalBits, USER:this.messageData.user.displayName});
		this.$store("accessibility").setAriaPolite(reason+" "+this.messageData.message);
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.messageData.user, this.messageData.channel_id);
	}

}
</script>

<style scoped lang="less">
.chatbits{

	.quote {
		margin-top: .25em;
		.splitter {
			width: 100%;
			background: var(--background-color-fade);
			height: 1px;
			max-width: 5em;
			margin: .5em auto;
		}
		span:not(:first-of-type) {
			border-left: 2px solid var(--color-secondary);
			margin-left: 1em;
			padding-left: 1em;
		}
		span:not(:only-child):hover {
			outline: 1px solid var(--color-text);
		}
	}
}
</style>