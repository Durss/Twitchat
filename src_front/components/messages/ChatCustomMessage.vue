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
				small
				:loading="loading"
				:type="demo == false && action.actionType == 'url'? 'link' : 'button'"
				:href="action.url"
				:target="action.urlTarget || '_blank'"
				:icon="action.icon"
				:alert="action.theme == 'alert' || (action.theme == 'light' && messageData.style == 'error')"
				:light="action.theme == 'light'"
				:primary="action.theme == 'primary'"
				:secondary="action.theme == 'secondary'"
				@click.stop="onClickButton(action)"
				>{{ action.label }}</Button>
			</div>

			<div class="quote" v-if="messageData.quote">
				<span class="message" v-if="messageData.quote_chunks"><ChatMessageChunksParser :chunks="messageData.quote_chunks" /></span>
				<span class="message" v-else-if="messageData.quote">{{messageData.message}}</span>
			</div>
		</div>
		
		<ClearButton class="closeBt" @click.stop="deleteMessage()" small />
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import Icon from '../Icon.vue';
import type { StyleValue } from 'vue';
import ClearButton from '../ClearButton.vue';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';
import TTButton from '../TTButton.vue';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import Utils from '@/utils/Utils';
import MessengerProxy from '@/messaging/MessengerProxy';
import ApiHelper from '@/utils/ApiHelper';
import Database from '@/store/Database';
import gsap from 'gsap';

@Component({
	components:{
		Icon,
		Button: TTButton,
		ClearButton,
		ChatMessageChunksParser,
	},
	emits:["onRead"]
})
 class ChatCustomMessage extends AbstractChatMessage {

	public loading:boolean = false;

	@Prop
	declare messageData:TwitchatDataTypes.MessageCustomData;

	@Prop({default:false, type:Boolean})
	declare demo:boolean;

	public get classes():string[] {
		const res = ["chatcustommessage", "chatMessage"];
		if(this.messageData.icon) res.push("hasIcon");
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

	public async onClickButton(button:NonNullable<TwitchatDataTypes.MessageCustomData["actions"]>[number]):Promise<void> {
		if(this.demo !== false) return;

		switch(button.actionType) {
			case "trigger": {
				this.loading = true;
				const trigger = this.$store.triggers.triggerList.find(v=> v.id == button.triggerId);
				if(trigger) await TriggerActionHandler.instance.executeTrigger(trigger, this.messageData, false);
				this.loading = false;
				break
			}
			case "message": {
				const message = await Utils.parseGlobalPlaceholders(button.message || "");
				MessengerProxy.instance.sendMessage(message);
				break
			}
			case "discord": {
				this.loading = true;
				const message = await Utils.parseGlobalPlaceholders(button.message || "");
				try {
					const res = await ApiHelper.call("discord/answer", "POST", {message:message, data:button.data}, false);
					if(res.status == 200) {
						this.messageData.actions = [];
						Database.instance.updateMessage(this.messageData);
					}else{
						gsap.killTweensOf(this.$el);
						gsap.fromTo(this.$el, {x:-5}, {duration:0.01, x:5, clearProps:"x", repeat:30});
						gsap.fromTo(this.$el, {y:-5}, {duration:0.02, y:5, clearProps:"y", repeat:15});
					}
				}catch(error){}
				this.loading = false;
				break
			}
			case "url": break;//<a> tag already handled the action
		}
	}
}
export default toNative(ChatCustomMessage);
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
	.messageHolder {
		overflow: hidden;
		row-gap: .5em;
		column-gap: 1em;
		display: flex;
		flex-wrap: wrap;
		flex-direction: row;
		justify-content: flex-end;
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
		.ctas {
			gap: .5em;
			display: flex;
			flex-wrap: wrap;
			max-width: 100%;
		}

		.quote {
			flex-basis: 100%;
		}
	}

	&.hasIcon {
		.messageHolder {
			.quote {
				margin-left: 1.5em;
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