<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<div class="fader" ref="fader" v-if="messageData.pinned"></div>
		<div class="fill" ref="fill" v-if="messageData.pinned"></div>

		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="bits" alt="bits" class="icon"/>

		<div class="holder">
			<i18n-t scope="global" tag="span" keypath="chat.bits" :plural="totalBits">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
				</template>
				<template #BITS>
					<strong>{{ totalBits }}</strong>
				</template>
			</i18n-t>

			<div class="quote" v-if="messages.length > 0">
				<span v-tooltip="messages.length > 1? mess.bits+' bits' : null" v-for="mess in messages"><ChatMessageChunksParser :chunks="mess.message_chunks" :channel="mess.channel_id" :platform="mess.platform" /></span>
			</div>
			<MessageTranslation :messageData="messageData" />
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { watch } from 'vue';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';
import MessageTranslation from './MessageTranslation.vue';

@Component({
	components:{
		MessageTranslation,
		ChatMessageChunksParser,
	},
	emits:["onRead"],
})
class ChatBits extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageCheerData;

	@Prop
	declare childrenList:TwitchatDataTypes.MessageCheerData[];

	public classes:string[] = [];

	public get totalBits():number {
		let res = this.messageData.bits;
		if(this.childrenList) {
			this.childrenList.forEach(m => res += m.bits);
		}
		return res;
	}

	public get iconColor():string{
		return this.$store.common.theme == "dark" ? "#5cffbe" : "#00a865";
	}

	public get messages():TwitchatDataTypes.MessageCheerData[] {
		let res:TwitchatDataTypes.MessageCheerData[] =  [];
		if(this.messageData.message_chunks && this.messageData.message_chunks.length > 0) res.push(this.messageData);
		if(this.childrenList) {
			this.childrenList.forEach(m => {
				if(m.message_chunks && m.message_chunks.length > 0) res.push(m);
			});
		}
		return res;
	}

	public mounted():void {
		const reason = this.$t("chat.bits", {COUNT:this.totalBits, USER:this.messageData.user.displayName}, this.totalBits);
		this.$store.accessibility.setAriaPolite(reason+" "+this.messageData.message);
		this.computeState();
		watch(()=>this.messageData.pinned, ()=> this.computeState() );
	}

	private computeClasses():void {
		let res = ["chatbits", "chatMessage", "highlight"];
		if(this.messageData.deleted === true) res.push("deleted");
		if(this.messageData.pinned === true) {
			res.push("pinned");
			res.push("level"+this.messageData.pinLevel);
		}
		this.classes = res;
	}

	private async computeState():Promise<void> {
		this.computeClasses();

		if(!this.messageData.pinned) return;

		await this.$nextTick();

		const fill = this.$refs.fill as HTMLDivElement;
		if(!fill) return;

		const duration = this.messageData.pinDuration_ms / 1000;
		const remainingDuration = Math.max(0, duration - (Date.now() - this.messageData.date)/1000);
		fill.style.transition = "transform "+remainingDuration+"s linear";
		fill.style.transform = "scaleX(100%)";
		window.setTimeout(()=> {
			fill.style.transform = "scaleX(0)";
		},100);
	}
}
export default toNative(ChatBits);
</script>

<style scoped lang="less">
.chatbits{
	@border: .25em;
	background-size: 200%;
	background-position: 100% center;
	overflow: hidden;
	&>.icon {
		color: v-bind(iconColor);
	}

	&.pinned {
		padding: .5em;

		* {
			z-index: 0;
		}
	}

	.fader {
		background-color: var(--grayout);//rgba(0, 0, 0, .75);
		position: absolute;
		top: @border;
		left: @border;
		width: calc(100% - @border * 2);
		height: calc(100% - @border * 2);
		z-index: 0;
		border-radius: calc(var(--border-radius) / 1.5);
	}
	.fill {
		background-color: rgba(255, 255, 255, .9);
		position: absolute;
		bottom: 0;
		left: 0;
		height: @border;
		width: 100%;
		transition: transform 10s;
		will-change: transform;
		transform-origin: left top;
	}
	&.level0 {
		background-image: linear-gradient(90deg,#8205b4,#9146ff,#8205b4);
	}
	&.level1 {
		background-image: linear-gradient(90deg,#1e69ff,#578fff,#1e69ff);
	}
	&.level2 {
		background-image: linear-gradient(90deg,#009919,#00bba4,#009919);
	}
	&.level3 {
		background-image: linear-gradient(90deg,#ff6905,#fdb210,#ffff75,#fdb210,#ff6905);
	}
	&.level4 {
		background-image: linear-gradient(90deg,#f7262c,#fa1ed2,#f093f9,#fa1ed2,#f7262c);
	}
	&.level5 {
		background-image: linear-gradient(90deg,#00c8af,#1e69ff,#9146ff,#fa1ed2,#9146ff,#1e69ff,#00c8af);
	}
	&.level6 {
		background-image: linear-gradient(90deg,#1e69ff,#9146ff,#fa1ed2,#ea7078,#fdb210,#fafa19,#fdb210,#ea7078,#fa1ed2,#9146ff,#1e69ff);
	}
	&.level7 {
		background-image: linear-gradient(90deg,#fa1ed2,#9146ff,#00fafa,#beff00,#ffb800,#beff00,#00fafa,#9146ff,#fa1ed2);
	}
}
</style>
