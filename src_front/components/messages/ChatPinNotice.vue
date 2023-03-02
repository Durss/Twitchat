<template>
	<div :class="classes">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>

		<img :src="$image(messageData.type=='pinned'? 'icons/pin.svg' : 'icons/unpin.svg')" alt="notice" class="icon">

		<div class="holder">
			<i18n-t scope="global" tag="div" :keypath="labelKey">
				<template #MODERATOR>
					<a class="userlink"
					v-if="messageData.moderator"
					@click.stop="openUserCard(messageData.moderator!)">{{messageData.moderator!.displayName}}</a>
				</template>
			</i18n-t>
	
			<ChatMessage class="message" :messageData="messageData.chatMessage" />
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ChatMessage from './ChatMessage.vue';

@Component({
	components:{
		ChatMessage,
	}
})
export default class ChatPinNotice extends Vue {
	
	@Prop
	public messageData!:TwitchatDataTypes.MessagePinData|TwitchatDataTypes.MessageUnpinData;

	public get classes():string[] {
		const res = ["chatpinnotice"];
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.UNPINNED) {
			res.push("unpinned");
		}
		return res;
	}

	public get labelKey():string {
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.PINNED) {
			return "chat.pin.pinned";
		}else{
			if(this.messageData.moderator) {
				return "chat.pin.unpinned_by"
			}
		}
		return "chat.pin.unpinned";
	}

	public get time():string {
		const d = new Date(this.messageData.date);
		return Utils.toDigits(d.getHours())+":"+Utils.toDigits(d.getMinutes());
	}

	public copyJSON():void {
		// @ts-ignore
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user);
	}
}
</script>

<style scoped lang="less">
.chatpinnotice{
	.chatMessageHighlight();

	.holder {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		.message {
			padding: .25em;
			width: 100%;
			flex-grow: 1;
			font-size: 1em;
			background-color: @mainColor_dark;
		}
	}

	&.unpinned {
		.holder {
			.message {
				text-decoration: line-through;
				opacity: .75;
				font-style: italic;
			}
		}
	}
}
</style>