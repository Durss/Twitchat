<template>
	<div class="chatunban chatMessage highlight success"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="unban" alt="notice" class="icon"/>
		
		<i18n-t scope="global" tag="span" :keypath="messageData.moderator? 'global.moderation_action.unbanned_by' : 'global.moderation_action.unbanned'">
			<template #USER>
				<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
			</template>
			<template #MODERATOR>
				<a class="userlink" v-if="messageData.moderator" @click.stop="openUserCard(messageData.moderator!, messageData.channel_id)">{{messageData.moderator.displayName}}</a>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{},
	emits:["onRead"]
})
class ChatBan extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageUnbanData;
	
	public mounted():void {
		let aria = "";
		if(this.messageData.moderator) {
			aria = this.$t("global.moderation_action.unbanned_by", {MODERATOR:this.messageData.moderator.displayName, USER:this.messageData.user.displayName});
		}else{
			aria = this.$t("global.moderation_action.unbanned", {USER:this.messageData.user.displayName});
		}
		this.$store.accessibility.setAriaPolite(aria);
	}

}
export default toNative(ChatBan);
</script>

<style scoped lang="less">
.chatunban{
}
</style>