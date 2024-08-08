<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="unbanRequest" alt="notice" class="icon"/>

		<div class="content">
			<i18n-t scope="global" tag="span" :keypath="label">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
				</template>
				<template #MODERATOR>
					<a class="userlink" v-if="messageData.moderator" @click.stop="openUserCard(messageData.moderator!, messageData.channel_id)">{{messageData.moderator.displayName}}</a>
				</template>
			</i18n-t>
	
			<template v-if="messageData.message">
				<div class="quote" @click.stop="censor=false">{{ messageData.message }}</div>
				<div class="warning" v-if="messageData.isFlagByAutomod"><Icon name="alert" />{{ $t("chat.unban_request.automod") }}</div>
			</template>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{},
	emits:[],
})
class ChatUnbanRequest extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageUnbanRequestData;

	public label:string = "";
	public censor:boolean = false;

	public get classes():string[] {
		let res:string[] = ["chatunbanrequest", "chatMessage", "highlight"]
		if(this.messageData.accepted === true) res.push("success");
		else res.push("error");
		if(this.censor) res.push("censor");
		return res;
	}
	
	public mounted():void {
		if(this.messageData.isResolve) {
			this.label = this.messageData.accepted? "chat.unban_request.accepted" : "chat.unban_request.refused";
		}else{
			this.label = "chat.unban_request.request";
			this.censor = true;
		}
	}
}
export default toNative(ChatUnbanRequest);
</script>

<style scoped lang="less">
.chatunbanrequest{
	.quote {
		cursor: pointer;
		transition: filter .25s;
	}

	&.censor {
		.quote {
			filter: blur(6px);
			&:hover {
				filter: blur(3px);
			}
		}
	}

	.warning {
		color: var(--color-light);
		font-weight: normal;
		padding: .25em .5em;
		background-color: var(--color-alert-fade);
		border-radius: var(--border-radius);
		.icon {
			height: 1em;
			margin-right: .5em;
		}
	}
}
</style>