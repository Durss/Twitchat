<template>
	<div :class="classes" :style="styles">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<div class="messageHolder">
			<div class="content">
				<Icon v-if="messageData.icon" :name="messageData.icon" />
				<span class="username" :style="userStyles" v-if="messageData.user?.name">{{ messageData.user.name }}</span>
				<span class="message" v-if="messageData.message_chunks"><ChatMessageChunksParser :chunks="messageData.message_chunks" /></span>
			</div>
			
			<div class="ctas" v-if="messageData.actions">
				<Button v-for="action in messageData.actions"
				:type="demo == false && action.actionType == 'url'? 'link' : 'button'"
				:href="action.url"
				target="_blank"
				small
				:icon="action.icon"
				:alert="action.theme == 'alert'"
				:primary="action.theme == 'primary'"
				:secondary="action.theme == 'secondary'"
				@click.stop="onClickButton(action)"
				>{{ action.label.substring(0,40) }}</Button>
			</div>
		</div>
		
		<CloseButton class="closeBt" @click.stop="deleteMessage()" small />
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';
import Icon from '../Icon.vue';
import type { StyleValue } from 'vue';
import CloseButton from '../CloseButton.vue';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';
import Button from '../Button.vue';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';

@Component({
	components:{
		Icon,
		Button,
		CloseButton,
		ChatMessageChunksParser,
	},
	emits:["onRead"]
})
export default class ChatCustomMessage extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageCustomData;

	@Prop({default:false, type:Boolean})
	declare demo:boolean;

	public get classes():string[] {
		const res = ["chatcustommessage", "chatMessage"];
		switch(this.messageData.style) {
			case "error": res.push("highlight", "alert"); break;
			case "highlight": res.push("highlight"); break;
		}
		return res;
	}

	public get styles():StyleValue {
		const res:StyleValue = {};
		if(this.messageData.highlightColor
		&& this.messageData.highlightColor != "default"
		&& this.messageData.highlightColor != "#000000"
		&& this.messageData.highlightColor?.length > 0) {
			res.border = "1px solid "+this.messageData.highlightColor;
			res.backgroundColor = this.messageData.highlightColor+"10";
		}
		return res;
	}

	public get userStyles():StyleValue {
		const res:StyleValue = {};
		if(this.messageData.user?.color
		&& this.messageData.user.color != "default"
		&& this.messageData.user.color.length > 0) {
			res.color = this.messageData.user.color;
		}
		return res;
	}

	public onClickButton(data:NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number]):void {
		if(this.demo !== false) return;

		switch(data.actionType) {
			case "trigger": {
				const trigger = this.$store("triggers").triggerList.find(v=> v.id == data.triggerId);
				if(trigger) TriggerActionHandler.instance.executeTrigger(trigger, this.messageData, false);
				break
			}
			case "url": break;//<a> tag already handled the action
		}
	}
}
</script>

<style scoped lang="less">
.chatcustommessage{
	min-height: 1.75em;
	padding-right: 2em;
	.closeBt {
		z-index: 0;
	}
	.ctas {
		gap: .5em;
		display: flex;
	}
	.messageHolder {
		overflow: hidden;
		row-gap: .5em;
		column-gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		flex: 1;
		.content {
			flex-grow: 1;
			.icon {
				height: 1em;
				margin-right: .25em;
			}
			.username {
				color: var(--color-secondary);
				font-weight: bold;
				&::after{
					content: ":";
					margin-right: .25em;
					color: var(--color-text);
					font-weight: normal;
				}
			}
		}
	}
}
</style>