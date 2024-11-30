<template>
	<div :class="classes" :style="styles"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<div class="messageHolder">
			<div class="content">
				<Icon v-if="messageData.icon" :name="messageData.icon" />
				<span class="username" :style="userStyles" v-if="messageData.user?.name">{{ messageData.user.name }}</span>
				<span class="message" v-if="messageData.message_chunks"><ChatMessageChunksParser :chunks="messageData.message_chunks" /></span>
				<span class="message" v-else-if="messageData.message">{{messageData.message}}</span>
			</div>

			<template v-if="messageData.actions">
				<Button v-for="action in messageData.actions"
				class="cta"
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
			</template>

			<div class="quote" v-if="messageData.quote">
				<span class="message" v-if="messageData.quote_chunks"><ChatMessageChunksParser :chunks="messageData.quote_chunks" /></span>
				<span class="message" v-else-if="messageData.quote">{{messageData.message}}</span>
			</div>
		</div>

		<ClearButton class="closeBt" @click.stop="deleteMessage()" small v-if="messageData.canClose !== false" />
	</div>
</template>

<script lang="ts">
import MessengerProxy from '@/messaging/MessengerProxy';
import Database from '@/store/Database';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import TriggerUtils from '@/utils/TriggerUtils';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import { gsap } from 'gsap/gsap-core';
import type { CSSProperties } from 'vue';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import ClearButton from '../ClearButton.vue';
import Icon from '../Icon.vue';
import TTButton from '../TTButton.vue';
import AbstractChatMessage from './AbstractChatMessage';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';

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
			case "highlight": res.push("highlight"); break;
			case "error": res.push("highlight", "alert"); break;
			case "warn": res.push("highlight", "error"); break;
		}
		return res;
	}

	public get styles():CSSProperties {
		const res:CSSProperties = {};
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

	public get userStyles():CSSProperties {
		const res:CSSProperties = {};
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
				const message = await TriggerUtils.parseGlobalPlaceholders(button.message || "");
				MessengerProxy.instance.sendMessage(message);
				break
			}
			case "discord": {
				this.loading = true;
				const message = await TriggerUtils.parseGlobalPlaceholders(button.message || "");
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
	max-width: 100%;
	display: flex;
	flex-direction: row;
	align-items: center;
	.closeBt {
		padding: .35em;
		position: relative;
		flex-shrink: 0;
		align-self: flex-start;
	}
	.messageHolder {
		overflow: hidden;
		row-gap: .25em;
		column-gap: .5em;
		display: flex;
		flex-wrap: wrap;
		flex-direction: row;
		justify-content: flex-end;
		align-items: center;
		flex-grow: 1;
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
			.cta {
				align-self: right;
			}
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
