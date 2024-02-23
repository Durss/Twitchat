<template>
	<div :class="classes" :style="styles">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<div class="messageHolder">
			<div class="content">
				<Icon v-if="messageData.icon" :name="messageData.icon" />
				<span class="username" :style="userStyles" v-if="messageData.user?.name">{{ messageData.user.name }}</span>
				<span class="message" v-if="messageData.message_chunks"><ChatMessageChunksParser :chunks="messageData.message_chunks" /></span>
				<span class="message" v-else-if="messageData.message">{{messageData.message}}</span>
			</div>
			
			<div class="ctas" v-if="messageData.actions">
				<Button v-for="action in messageData.actions"
				:type="demo == false && action.actionType == 'url'? 'link' : 'button'"
				:href="action.url"
				:target="action.urlTarget || '_blank'"
				small
				:icon="action.icon"
				:alert="action.theme == 'alert' || (action.theme == 'light' && messageData.style == 'error')"
				:light="action.theme == 'light'"
				:primary="action.theme == 'primary'"
				:secondary="action.theme == 'secondary'"
				@click.stop="onClickButton(action)"
				>{{ action.label }}</Button>
			</div>
		</div>
		
		<ClearButton class="closeBt" @click.stop="deleteMessage()" small />
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import Icon from '../Icon.vue';
import type { StyleValue } from 'vue';
import ClearButton from '../ClearButton.vue';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';
import TTButton from '../TTButton.vue';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import Utils from '@/utils/Utils';
import MessengerProxy from '@/messaging/MessengerProxy';

@Component({
	components:{
		Icon,
		Button: TTButton,
		ClearButton,
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
		&& this.messageData.style == "highlight"
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

	public async onClickButton(data:NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number]):Promise<void> {
		if(this.demo !== false) return;

		switch(data.actionType) {
			case "trigger": {
				const trigger = this.$store.triggers.triggerList.find(v=> v.id == data.triggerId);
				if(trigger) TriggerActionHandler.instance.executeTrigger(trigger, this.messageData, false);
				break
			}
			case "message": {
				const message = await Utils.parseGlobalPlaceholders(data.message || "")
				MessengerProxy.instance.sendMessage(message);
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
	max-width: 100%;
	.closeBt {
		z-index: 0;
		padding: .35em;
	}
	.ctas {
		gap: .5em;
		display: flex;
		flex-wrap: wrap;
		max-width: 100%;
		button {
			font-size: .8em;
		}
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
				vertical-align: middle;
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

			.message {
				word-break: break-word;
				white-space: pre-line;
			}
		}
	}

	&.alert {
		.messageHolder {
			.content {
				.username {
					color: var(--color-light) !important;
				}
			}
		}
	}
}
</style>