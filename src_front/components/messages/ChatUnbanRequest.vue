<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="unbanRequest" alt="notice" class="icon"/>

		<div>
			<i18n-t scope="global" tag="span" :keypath="label">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
				</template>
				<template #MODERATOR>
					<a class="userlink" v-if="messageData.moderator" @click.stop="openUserCard(messageData.moderator!, messageData.channel_id)">{{messageData.moderator.displayName}}</a>
				</template>
			</i18n-t>
	
			<div class="quote" v-if="messageData.message">{{ messageData.message }}</div>
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

	public get classes():string[] {
		let res:string[] = ["chatunbanrequest", "chatMessage", "highlight"]
		if(this.messageData.accepted === true) res.push("success");
		else res.push("error");
		return res;
	}
	
	public mounted():void {
		if(this.messageData.isResolve) {
			this.label = this.messageData.accepted? "chat.unban_request.accepted" : "chat.unban_request.refused";
		}else{
			this.label = "chat.unban_request.request";
		}
	}
}
export default toNative(ChatUnbanRequest);
</script>

<style scoped lang="less">
.chatunbanrequest{
	
}
</style>